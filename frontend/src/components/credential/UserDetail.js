import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
    FaUser,
    FaEnvelope,
    FaUserTag,
    FaToggleOn,
    FaUserShield,
    FaArrowLeft,
    FaBuilding,
    FaCalendarAlt,
    FaCheckCircle,
    FaTimesCircle
} from 'react-icons/fa';
import NotificationToast from '../NotificationToast';
import Header from '../retailer/Header';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const UserDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [company, setCompany] = useState(null);
    const [fiscalYear, setFiscalYear] = useState(null);
    const [currentCompanyName, setCurrentCompanyName] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

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
        const fetchUserDetails = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/api/user/users/view/${id}`);
                
                if (response.data.success) {
                    setUser(response.data.data.user);
                    setCompany(response.data.data.company);
                    setFiscalYear(response.data.data.currentFiscalYear);
                    setCurrentCompanyName(response.data.data.currentCompanyName);
                    setCurrentUser(response.data.data.currentUser);
                } else {
                    setError(response.data.error);
                    if (response.status === 403) {
                        setTimeout(() => navigate('/dashboard'), 2000);
                    }
                }
            } catch (err) {
                console.error('Error fetching user details:', err);
                const errorMessage = err.response?.data?.error || 'Failed to load user details';
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

        if (id) {
            fetchUserDetails();
        }
    }, [id, navigate]);

    const formatDate = (dateString, format = 'full') => {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            
            if (format === 'full') {
                return date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else if (format === 'date') {
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
            return date.toLocaleString();
        } catch (error) {
            return 'Invalid Date';
        }
    };

    const getRoleBadgeClass = (role) => {
        switch (role?.toLowerCase()) {
            case 'admin':
            case 'administrator':
                return 'bg-danger';
            case 'supervisor':
                return 'bg-warning text-dark';
            case 'account':
                return 'bg-info text-dark';
            case 'sales':
                return 'bg-success';
            case 'purchase':
                return 'bg-primary';
            default:
                return 'bg-secondary';
        }
    };

    const LoadingSkeleton = () => (
        <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
            <div className="card-header bg-white py-0">
                <Skeleton height={30} width={200} />
            </div>
            <div className="card-body p-2 p-md-3">
                <div className="mb-3">
                    <Skeleton height={20} width={150} />
                    <Skeleton height={15} width={250} className="mt-2" />
                </div>
                <div className="row mb-3">
                    <div className="col-md-6">
                        <Skeleton height={20} width={100} />
                        <Skeleton height={25} width={80} className="mt-2" />
                    </div>
                    <div className="col-md-6">
                        <Skeleton height={20} width={100} />
                        <Skeleton height={25} width={80} className="mt-2" />
                    </div>
                </div>
                <div className="mb-3">
                    <Skeleton height={20} width={150} />
                    <Skeleton height={15} width={200} className="mt-2" />
                    <Skeleton height={15} width={200} className="mt-2" />
                </div>
            </div>
            <div className="card-footer bg-white text-end py-2">
                <Skeleton height={30} width={150} />
            </div>
        </div>
    );

    const ErrorDisplay = () => (
        <div className="alert alert-danger text-center py-1 mb-2 small" style={{ fontSize: '0.75rem' }}>
            <FaTimesCircle className="me-2" size={16} />
            {error}
            <button 
                className="btn btn-sm btn-outline-danger ms-2"
                onClick={() => window.location.reload()}
                style={{ padding: '2px 6px', fontSize: '0.7rem' }}
            >
                Try Again
            </button>
        </div>
    );

    if (loading) {
        return (
            <div className='container-fluid'>
                <Header />
                <div className="container mt-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <LoadingSkeleton />
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
                        <div className="col-lg-8">
                            <div className="card mt-2 shadow-lg p-0 expanded-card ledger-card compact">
                                <div className="card-body p-3">
                                    <ErrorDisplay />
                                    <button
                                        className="btn btn-secondary btn-sm mt-2"
                                        onClick={() => navigate('/dashboard')}
                                        style={{ height: '30px', fontSize: '0.75rem' }}
                                    >
                                        Go to Dashboard
                                    </button>
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
                    <div className="col-lg-8">
                        <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                            <div className="card-header bg-white py-0">
                                <h1 className="h4 mb-0 text-center text-primary">
                                    <FaUser className="me-2" />
                                    User Details
                                </h1>
                            </div>

                            <div className="card-body p-2 p-md-3">
                                {/* User Details */}
                                {user && (
                                    <>
                                        {/* Name */}
                                        <div className="mb-3 pb-2 border-bottom">
                                            <div className="d-flex align-items-center">
                                                <FaUser className="text-secondary me-2" size={14} />
                                                <h6 className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>Name</h6>
                                            </div>
                                            <p className="mt-1 mb-0" style={{ fontSize: '0.875rem', fontWeight: '500' }}>{user.name}</p>
                                        </div>

                                        {/* Email */}
                                        <div className="mb-3 pb-2 border-bottom">
                                            <div className="d-flex align-items-center">
                                                <FaEnvelope className="text-secondary me-2" size={14} />
                                                <h6 className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>Email Address</h6>
                                            </div>
                                            <p className="mt-1 mb-0" style={{ fontSize: '0.875rem' }}>{user.email}</p>
                                        </div>

                                        {/* Role and Status - In same row */}
                                        <div className="row mb-3 pb-2 border-bottom">
                                            {/* Role Column */}
                                            <div className="col-md-6">
                                                <div className="d-flex align-items-center">
                                                    <FaUserTag className="text-secondary me-2" size={14} />
                                                    <h6 className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>Role</h6>
                                                </div>
                                                <div className="mt-1">
                                                    <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                                                        <FaUserShield className="me-1" size={10} />
                                                        {user.role || 'User'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status Column */}
                                            <div className="col-md-6">
                                                <div className="d-flex align-items-center">
                                                    <FaToggleOn className="text-secondary me-2" size={14} />
                                                    <h6 className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>Account Status</h6>
                                                </div>
                                                <div className="mt-1">
                                                    {user.isActive ? (
                                                        <span className="badge bg-success" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                                                            <FaCheckCircle className="me-1" size={10} />
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-danger" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                                                            <FaTimesCircle className="me-1" size={10} />
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Admin Privileges */}
                                        <div className="mb-3 pb-2 border-bottom">
                                            <div className="d-flex align-items-center">
                                                <FaUserShield className="text-secondary me-2" size={14} />
                                                <h6 className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>Admin Privileges</h6>
                                            </div>
                                            <div className="mt-1">
                                                {user.isAdmin ? (
                                                    <span className="badge bg-danger" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                                                        <FaCheckCircle className="me-1" size={10} />
                                                        Yes
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-secondary" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                                                        <FaTimesCircle className="me-1" size={10} />
                                                        No
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Associated Company */}
                                        {user.company && (
                                            <div className="mb-3 pb-2 border-bottom">
                                                <div className="d-flex align-items-center">
                                                    <FaBuilding className="text-secondary me-2" size={14} />
                                                    <h6 className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>Associated Company</h6>
                                                </div>
                                                <div className="mt-1">
                                                    <span className="badge bg-info" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                                                        {user.company.name}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Timestamps */}
                                        <div className="mb-2">
                                            <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>
                                                <FaCalendarAlt className="me-1" size={10} />
                                                Created: {formatDate(user.createdAt)}
                                            </small>
                                            {user.lastLogin && (
                                                <small className="text-muted d-block mt-1" style={{ fontSize: '0.65rem' }}>
                                                    <FaCalendarAlt className="me-1" size={10} />
                                                    Last Login: {formatDate(user.lastLogin)}
                                                </small>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer with Back Button */}
                            {currentUser?.isAdminOrSupervisor && (
                                <div className="card-footer bg-white text-end py-2">
                                    <Link 
                                        to="/auth/admin/users/list" 
                                        className="btn btn-outline-primary btn-sm"
                                        style={{ height: '30px', padding: '0 16px', fontSize: '0.75rem' }}
                                    >
                                        <FaArrowLeft className="me-1" size={12} />
                                        Back to List
                                    </Link>
                                </div>
                            )}
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

export default UserDetail;