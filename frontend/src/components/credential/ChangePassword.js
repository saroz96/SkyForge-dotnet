import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import NotificationToast from '../NotificationToast';
import Header from '../retailer/Header';
import { FaArrowLeft, FaEye, FaEyeSlash, FaSave, FaBuilding, FaCalendarAlt } from 'react-icons/fa';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const ChangePassword = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [companyInfo, setCompanyInfo] = useState(null);
    const [currentFiscalYear, setCurrentFiscalYear] = useState(null);
    const [currentCompanyName, setCurrentCompanyName] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [passwordStrength, setPasswordStrength] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        strength: 0
    });
    const [showPassword, setShowPassword] = useState({
        currentPassword: false,
        newPassword: false,
        confirmNewPassword: false
    });
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    // Add authorization header to all requests
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

    useEffect(() => {
        const fetchFormData = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/user/user/change-password');
                
                if (response.data.success) {
                    const data = response.data.data;
                    setCompanyInfo(data.company);
                    setCurrentFiscalYear(data.currentFiscalYear);
                    setCurrentCompanyName(data.currentCompanyName);
                    setUserInfo(data.user);
                } else {
                    setError(response.data.error || 'Failed to load form data');
                    if (response.status === 403) {
                        setTimeout(() => navigate('/dashboard'), 2000);
                    }
                }
            } catch (err) {
                console.error('Error fetching form data:', err);
                const errorMessage = err.response?.data?.error || 'Failed to load form data';
                setError(errorMessage);
                if (err.response?.status === 403) {
                    setTimeout(() => navigate('/dashboard'), 2000);
                } else if (err.response?.status === 401) {
                    setTimeout(() => navigate('/login'), 2000);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchFormData();
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Check password strength when new password changes
        if (name === 'newPassword') {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Validate passwords match
        if (formData.newPassword !== formData.confirmNewPassword) {
            setNotification({
                show: true,
                message: 'New passwords do not match',
                type: 'error',
                duration: 3000
            });
            setIsSubmitting(false);
            return;
        }

        // Validate password strength
        if (passwordStrength.strength < 4) {
            setNotification({
                show: true,
                message: 'Password must meet all security requirements',
                type: 'error',
                duration: 3000
            });
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await api.post('/api/user/user/change-password', formData);
            
            if (response.data.success) {
                setNotification({
                    show: true,
                    message: response.data.message || 'Password updated successfully',
                    type: 'success',
                    duration: 3000
                });
                
                // Reset form on success
                setFormData({
                    currentPassword: '',
                    newPassword: '',
                    confirmNewPassword: ''
                });
                setPasswordStrength({
                    length: false,
                    uppercase: false,
                    lowercase: false,
                    number: false,
                    strength: 0
                });
            }
        } catch (err) {
            console.error('Error changing password:', err);
            
            // Handle validation errors
            if (err.response?.data?.errors) {
                const errorMessages = err.response.data.errors.map(e => e.msg).join(', ');
                setNotification({
                    show: true,
                    message: errorMessages,
                    type: 'error',
                    duration: 3000
                });
            } else {
                setNotification({
                    show: true,
                    message: err.response?.data?.error || 'An error occurred while changing the password',
                    type: 'error',
                    duration: 3000
                });
            }
        } finally {
            setIsSubmitting(false);
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

    if (loading) {
        return (
            <div className='container-fluid'>
                <Header />
                <div className="container mt-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-6 col-md-8 col-sm-10">
                            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                                <div className="card-header bg-white py-0">
                                    <Skeleton height={30} width={200} />
                                </div>
                                <div className="card-body p-2 p-md-3">
                                    <Skeleton count={4} height={50} className="mb-3" />
                                    <Skeleton height={40} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='container-fluid'>
                <Header />
                <div className="container mt-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-6 col-md-8 col-sm-10">
                            <div className="alert alert-danger shadow-sm">
                                <div className="d-flex align-items-center mb-3">
                                    <i className="fas fa-exclamation-circle me-2"></i>
                                    <h5 className="mb-0">Error</h5>
                                </div>
                                <p className="mb-2">{error}</p>
                                <div className="d-flex gap-2">
                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => window.location.reload()}
                                    >
                                        Try Again
                                    </button>
                                    <Link to="/dashboard" className="btn btn-sm btn-secondary">
                                        Go to Dashboard
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='container-fluid'>
            <Header />
            <div className="container mt-4">
                <div className="row justify-content-center">
                    <div className="col-lg-6 col-md-8 col-sm-10">
                        {/* Change Password Form */}
                        <div className="card shadow-sm border-0">
                            <div className="card-header bg-white py-2">
                                <h5 className="mb-0">Change Your Password</h5>
                            </div>
                            <div className="card-body p-3">
                                <form onSubmit={handleSubmit}>
                                    {/* Current Password */}
                                    <div className="mb-3">
                                        <label htmlFor="currentPassword" className="form-label" style={{ fontSize: '0.85rem' }}>
                                            Current Password <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword.currentPassword ? "text" : "password"}
                                                className="form-control form-control-sm"
                                                id="currentPassword"
                                                name="currentPassword"
                                                value={formData.currentPassword}
                                                onChange={handleInputChange}
                                                required
                                                autoFocus
                                                style={{ height: '32px', fontSize: '0.85rem' }}
                                            />
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                type="button"
                                                onClick={() => togglePasswordVisibility('currentPassword')}
                                                style={{ height: '32px' }}
                                            >
                                                {showPassword.currentPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* New Password */}
                                    <div className="mb-3">
                                        <label htmlFor="newPassword" className="form-label" style={{ fontSize: '0.85rem' }}>
                                            New Password <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword.newPassword ? "text" : "password"}
                                                className="form-control form-control-sm"
                                                id="newPassword"
                                                name="newPassword"
                                                value={formData.newPassword}
                                                onChange={handleInputChange}
                                                required
                                                style={{ height: '32px', fontSize: '0.85rem' }}
                                            />
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                type="button"
                                                onClick={() => togglePasswordVisibility('newPassword')}
                                                style={{ height: '32px' }}
                                            >
                                                {showPassword.newPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                            </button>
                                        </div>
                                        
                                        {/* Password Strength Meter */}
                                        {formData.newPassword && (
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
                                                
                                                {/* Password Requirements */}
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
                                    
                                    {/* Confirm New Password */}
                                    <div className="mb-4">
                                        <label htmlFor="confirmNewPassword" className="form-label" style={{ fontSize: '0.85rem' }}>
                                            Confirm New Password <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword.confirmNewPassword ? "text" : "password"}
                                                className={`form-control form-control-sm ${formData.newPassword && formData.confirmNewPassword && formData.newPassword !== formData.confirmNewPassword ? 'is-invalid' : ''}`}
                                                id="confirmNewPassword"
                                                name="confirmNewPassword"
                                                value={formData.confirmNewPassword}
                                                onChange={handleInputChange}
                                                required
                                                style={{ height: '32px', fontSize: '0.85rem' }}
                                            />
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                type="button"
                                                onClick={() => togglePasswordVisibility('confirmNewPassword')}
                                                style={{ height: '32px' }}
                                            >
                                                {showPassword.confirmNewPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                            </button>
                                        </div>
                                        {formData.newPassword && formData.confirmNewPassword && formData.newPassword !== formData.confirmNewPassword && (
                                            <div className="invalid-feedback d-block" style={{ fontSize: '0.75rem' }}>
                                                Passwords do not match
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="d-grid">
                                        <button
                                            type="submit"
                                            className="btn btn-primary btn-sm"
                                            disabled={isSubmitting || (formData.newPassword && passwordStrength.strength < 4) || formData.newPassword !== formData.confirmNewPassword}
                                            style={{ height: '34px', fontSize: '0.85rem' }}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{ width: '12px', height: '12px' }}></span>
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <FaSave className="me-1" size={12} /> Update Password
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
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

export default ChangePassword;