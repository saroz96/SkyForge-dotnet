import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { FaLock, FaLockOpen, FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle, FaArrowLeft } from 'react-icons/fa';
import NotificationToast from '../NotificationToast';
import 'react-loading-skeleton/dist/skeleton.css';

const ResetPassword = () => {
  const { token: pathToken } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Get token from either path parameter or query parameter
  const queryParams = new URLSearchParams(location.search);
  const queryToken = queryParams.get('token');
  const token = pathToken || queryToken;

  const [formData, setFormData] = useState({
    password: '',
    password2: ''
  });
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    strength: 0
  });
  const [showPassword, setShowPassword] = useState({
    password: false,
    password2: false
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success',
    duration: 3000
  });
  const [tokenValid, setTokenValid] = useState(true);
  const [checkingToken, setCheckingToken] = useState(true);

  // Create axios instance WITHOUT auth header for reset password
  const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: false, // Don't send credentials for reset password
  });

  useEffect(() => {
    console.log('=== COMPONENT MOUNTED ===');
    console.log('Token from URL:', token);

    // Clear any stored reset state
    sessionStorage.removeItem('resetToken');

    // Store current token for this session
    if (token) {
      sessionStorage.setItem('currentResetToken', token);
    }

    return () => {
      // Cleanup
      sessionStorage.removeItem('currentResetToken');
    };
  }, [token]);

  // Verify token exists on load
  useEffect(() => {
    if (token) {
      setCheckingToken(false);
    } else {
      setTokenValid(false);
      setCheckingToken(false);
      setNotification({
        show: true,
        message: 'Invalid reset link. Please request a new password reset.',
        type: 'error',
        duration: 3000
      });
    }
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    const strength = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password)
    };

    const strengthScore = Object.values(strength).filter(Boolean).length;

    setPasswordStrength({
      ...strength,
      strength: strengthScore
    });
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Change the API endpoint in your ResetPassword.js
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.password2) {
      setNotification({
        show: true,
        message: 'Passwords do not match',
        type: 'error',
        duration: 3000
      });
      return;
    }

    if (passwordStrength.strength < 4) {
      setNotification({
        show: true,
        message: 'Password must meet all security requirements',
        type: 'error',
        duration: 3000
      });
      return;
    }

    setLoading(true);

    try {
      // Use the new PUBLIC endpoint instead of the old one
      const response = await api.post(`/api/public/reset-password/${encodeURIComponent(token)}`, {
        password: formData.password,
        password2: formData.password2
      });

      if (response.data.success) {
        setSubmitted(true);
        setNotification({
          show: true,
          message: response.data.message || 'Password updated successfully!',
          type: 'success',
          duration: 5000
        });

        setTimeout(() => {
          navigate('/auth/login');
        }, 3000);
      } else {
        setNotification({
          show: true,
          message: response.data.message || 'Failed to reset password',
          type: 'error',
          duration: 3000
        });
      }
    } catch (err) {
      console.error('Reset password error:', err);

      let errorMessage = 'Error resetting your password. Please try again.';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      setNotification({
        show: true,
        message: errorMessage,
        type: 'error',
        duration: 3000
      });

      if (errorMessage.includes('invalid') || errorMessage.includes('expired')) {
        setTokenValid(false);
      }
    } finally {
      setLoading(false);
    }
  };
  const getStrengthColor = () => {
    switch (passwordStrength.strength) {
      case 0: return 'bg-danger';
      case 1: return 'bg-danger';
      case 2: return 'bg-warning';
      case 3: return 'bg-info';
      case 4: return 'bg-success';
      default: return 'bg-danger';
    }
  };

  const getStrengthText = () => {
    switch (passwordStrength.strength) {
      case 0: return 'Very Weak';
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      default: return 'Very Weak';
    }
  };

  if (checkingToken) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8 col-sm-10">
            <div className="card shadow-sm border-0 mt-4">
              <div className="card-body p-4 text-center">
                <div className="mb-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
                <p>Verifying reset link...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8 col-sm-10">
            <div className="card shadow-sm border-0 mt-4">
              <div className="card-header bg-danger text-white text-center py-3">
                <h4 className="mb-0">Invalid Reset Link</h4>
              </div>
              <div className="card-body p-4 text-center">
                <div className="mb-4">
                  <FaTimesCircle size={48} className="text-danger" />
                </div>
                <p className="mb-3">
                  The password reset link is invalid or has expired.
                </p>
                <p className="text-muted small mb-4">
                  Please request a new password reset link.
                </p>
                <div className="d-flex justify-content-center">
                  <Link to="/auth/forgot-password" className="btn btn-primary">
                    Request New Reset Link
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8 col-sm-10">
            <div className="card shadow-sm border-0 mt-4">
              <div className="card-header bg-success text-white text-center py-3">
                <h4 className="mb-0">Password Reset Successful!</h4>
              </div>
              <div className="card-body p-4 text-center">
                <div className="mb-4">
                  <FaCheckCircle size={48} className="text-success" />
                </div>
                <p className="mb-3">
                  Your password has been successfully reset.
                </p>
                <p className="text-muted small mb-4">
                  You will be redirected to the login page in a few seconds.
                </p>
                <div className="d-flex justify-content-center">
                  <Link to="/auth/login" className="btn btn-primary">
                    Go to Login Now
                  </Link>
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
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-lg-6 col-md-8 col-sm-10">
          <div className="card shadow-sm border-0 mt-4">
            <div className="card-header bg-primary text-white text-center py-3">
              <h4 className="mb-0">Reset Password</h4>
              <p className="mb-0 mt-1 small text-white-50">
                Create a new password for your account
              </p>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                {/* New Password */}
                <div className="mb-3">
                  <label htmlFor="password" className="form-label" style={{ fontSize: '0.85rem' }}>
                    New Password <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showPassword.password ? "text" : "password"}
                      className="form-control"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      autoFocus
                      style={{ height: '38px', fontSize: '0.85rem' }}
                    />
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => togglePasswordVisibility('password')}
                      style={{ height: '38px' }}
                    >
                      {showPassword.password ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>

                  {formData.password && (
                    <>
                      <div className="mt-2">
                        <div className="progress" style={{ height: '4px' }}>
                          <div
                            className={`progress-bar ${getStrengthColor()}`}
                            role="progressbar"
                            style={{ width: `${passwordStrength.strength * 25}%` }}
                          ></div>
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                          Password strength: {getStrengthText()}
                        </small>
                      </div>

                      <div className="mt-2">
                        <div className={`requirement ${passwordStrength.length ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                          <i className={`fas ${passwordStrength.length ? 'fa-check-circle' : 'fa-circle'} me-1`}></i>
                          At least 8 characters
                        </div>
                        <div className={`requirement ${passwordStrength.uppercase ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                          <i className={`fas ${passwordStrength.uppercase ? 'fa-check-circle' : 'fa-circle'} me-1`}></i>
                          At least 1 uppercase letter
                        </div>
                        <div className={`requirement ${passwordStrength.lowercase ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                          <i className={`fas ${passwordStrength.lowercase ? 'fa-check-circle' : 'fa-circle'} me-1`}></i>
                          At least 1 lowercase letter
                        </div>
                        <div className={`requirement ${passwordStrength.number ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                          <i className={`fas ${passwordStrength.number ? 'fa-check-circle' : 'fa-circle'} me-1`}></i>
                          At least 1 number
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="mb-4">
                  <label htmlFor="password2" className="form-label" style={{ fontSize: '0.85rem' }}>
                    Confirm New Password <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showPassword.password2 ? "text" : "password"}
                      className={`form-control ${formData.password && formData.password2 && formData.password !== formData.password2 ? 'is-invalid' : ''}`}
                      id="password2"
                      name="password2"
                      value={formData.password2}
                      onChange={handleInputChange}
                      required
                      style={{ height: '38px', fontSize: '0.85rem' }}
                    />
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => togglePasswordVisibility('password2')}
                      style={{ height: '38px' }}
                    >
                      {showPassword.password2 ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>
                  {formData.password && formData.password2 && formData.password !== formData.password2 && (
                    <div className="invalid-feedback d-block" style={{ fontSize: '0.75rem' }}>
                      Passwords do not match
                    </div>
                  )}
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
                    disabled={loading || (formData.password && passwordStrength.strength < 4) || (formData.password && formData.password2 && formData.password !== formData.password2)}
                    style={{ height: '34px', fontSize: '0.8rem', padding: '0 20px' }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{ width: '12px', height: '12px' }}></span>
                        Resetting...
                      </>
                    ) : (
                      <>
                        <FaLockOpen className="me-1" size={12} />
                        Reset Password
                      </>
                    )}
                  </button>
                </div>
              </form>

              <hr className="my-4" />

              <div className="text-center">
                <p className="small text-muted mb-0">
                  <FaLock className="me-1" size={10} />
                  This link will expire in 10 minutes for security reasons.
                </p>
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

export default ResetPassword;