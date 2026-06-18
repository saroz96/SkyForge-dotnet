
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import DashboardLayout from '../company/DashboardLayout';
import NotificationToast from '../NotificationToast';

const GoogleDriveBackup = () => {
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
    const [backupSchedule, setBackupSchedule] = useState('daily');
    const [backupFormat, setBackupFormat] = useState('compressed');
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [lastBackupCount, setLastBackupCount] = useState(0);
    const [user, setUser] = useState(null);
    const [isAdminOrSupervisor, setIsAdminOrSupervisor] = useState(false);

    const connectBtnRef = useRef(null);
    const backupBtnRef = useRef(null);

    const currentUser = useSelector((state) => state.auth.userInfo);

    const api = useMemo(() => {
        const instance = axios.create({
            baseURL: process.env.REACT_APP_API_BASE_URL,
            withCredentials: true,
        });
        instance.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) config.headers.Authorization = `Bearer ${token}`;
                return config;
            },
            (error) => Promise.reject(error)
        );
        return instance;
    }, []);

    useEffect(() => {
        const initializeComponent = async () => {
            try {
                if (currentUser) {
                    setUser(currentUser);
                    setIsAdminOrSupervisor(currentUser.isAdmin || currentUser.role === 'Supervisor');
                } else {
                    const userRes = await api.get('/api/User/current');
                    setUser(userRes.data.user);
                    setIsAdminOrSupervisor(userRes.data.user.isAdmin || userRes.data.user.role === 'Supervisor');
                }

                await checkConnectionStatus();
                await loadBackupSettings();
                await fetchBackupCount();
            } catch (error) {
                console.error('Error initializing component:', error);
                if (error.response?.status === 401) {
                    setNotification({
                        show: true,
                        message: 'Session expired. Please login again.',
                        type: 'error',
                        duration: 3000
                    });
                    setTimeout(() => navigate('/auth/login'), 2000);
                }
            } finally {
                setInitialLoading(false);
            }
        };

        initializeComponent();
    }, [currentUser, navigate]);

    const checkConnectionStatus = async () => {
        try {
            const response = await api.get('/api/drivebackup/status');
            setIsConnected(response.data.isConnected === true);
        } catch (error) {
            console.error('Error checking connection:', error);
            setIsConnected(false);
        }
    };

    const fetchBackupCount = async () => {
        try {
            const response = await api.get('/api/drivebackup/history');
            if (response.data.success) {
                setLastBackupCount(response.data.backups.length);
            }
        } catch (error) {
            console.error('Error fetching backup count:', error);
        }
    };

    const loadBackupSettings = async () => {
        try {
            const response = await api.get('/api/drivebackup/settings');
            if (response.data.success) {
                setAutoBackupEnabled(response.data.settings.autoBackupEnabled);
                setBackupSchedule(response.data.settings.backupSchedule);
                setBackupFormat(response.data.settings.backupFormat || 'compressed');
            }
        } catch (error) {
            console.error('Error loading backup settings:', error);
        }
    };

    const saveBackupSettings = async () => {
        setLoading(true);
        try {
            const response = await api.post('/api/drivebackup/settings', {
                autoBackupEnabled,
                backupSchedule,
                backupFormat
            });

            if (response.data.success) {
                setNotification({
                    show: true,
                    message: 'Backup settings saved successfully!',
                    type: 'success',
                    duration: 3000
                });
            }
        } catch (error) {
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Failed to save settings',
                type: 'error',
                duration: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/drivebackup/auth-url');
            if (response.data.success) {
                const width = 500;
                const height = 600;
                const left = window.screenX + (window.outerWidth - width) / 2;
                const top = window.screenY + (window.outerHeight - height) / 2;

                const authWindow = window.open(
                    response.data.authUrl,
                    'GoogleAuth',
                    `width=${width},height=${height},left=${left},top=${top}`
                );

                const handleMessage = (event) => {
                    if (event.data.type === 'google-auth-success') {
                        window.removeEventListener('message', handleMessage);
                        clearInterval(checkClosed);
                        setIsConnected(true);
                        setNotification({
                            show: true,
                            message: 'Successfully connected to Google Drive!',
                            type: 'success',
                            duration: 3000
                        });
                        fetchBackupCount();
                        checkConnectionStatus();
                        setIsLoading(false);
                    } else if (event.data.type === 'google-auth-error') {
                        window.removeEventListener('message', handleMessage);
                        clearInterval(checkClosed);
                        setNotification({
                            show: true,
                            message: `Connection failed: ${event.data.error}`,
                            type: 'error',
                            duration: 3000
                        });
                        setIsLoading(false);
                    }
                };

                window.addEventListener('message', handleMessage);

                const checkClosed = setInterval(() => {
                    try {
                        if (authWindow && authWindow.closed) {
                            clearInterval(checkClosed);
                            window.removeEventListener('message', handleMessage);
                            setIsLoading(false);
                            setNotification({
                                show: true,
                                message: 'Connection cancelled - window was closed',
                                type: 'info',
                                duration: 3000
                            });
                        }
                    } catch (e) {
                        clearInterval(checkClosed);
                        setIsLoading(false);
                    }
                }, 1000);
            }
        } catch (error) {
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Failed to connect to Google Drive',
                type: 'error',
                duration: 3000
            });
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect Google Drive? Your backups will remain but automatic backups will stop.')) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post('/api/drivebackup/disconnect');
            if (response.data.success) {
                setIsConnected(false);
                setNotification({
                    show: true,
                    message: 'Disconnected from Google Drive',
                    type: 'success',
                    duration: 3000
                });
            }
        } catch (error) {
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Failed to disconnect',
                type: 'error',
                duration: 3000
            });
        } finally {
            setIsLoading(false);
        }
    };

    const performBackup = async () => {
        setLoading(true);
        try {
            const response = await api.post(`/api/drivebackup/backup-all-with-format?format=${backupFormat}`);

            if (response.data.success) {
                let formatMessage = '';
                switch (backupFormat) {
                    case 'compressed':
                        formatMessage = 'Compressed format (smallest file size)';
                        break;
                    case 'sql':
                        formatMessage = 'SQL format (complete database restore)';
                        break;
                    case 'csv':
                        formatMessage = 'CSV format (Excel compatible)';
                        break;
                    default:
                        formatMessage = backupFormat;
                }

                setNotification({
                    show: true,
                    message: `Backup completed successfully in ${formatMessage}!`,
                    type: 'success',
                    duration: 3000
                });
                await fetchBackupCount();
            } else {
                setNotification({
                    show: true,
                    message: response.data.error || 'Backup failed',
                    type: 'error',
                    duration: 3000
                });
            }
        } catch (error) {
            console.error('Backup error:', error);
            setNotification({
                show: true,
                message: error.response?.data?.error || error.message || 'Backup failed',
                type: 'error',
                duration: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
                <div className="container-fluid">
                    <div className="container mt-4 text-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
            <div className="container-fluid">
                <div className="container mt-4 wow-form">
                    <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp">
                        <div className="card-header py-2">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="card-title mb-0">
                                    <i className="bi bi-google me-2"></i>
                                    Google Drive Backup
                                </h5>
                                {isConnected && (
                                    <span className="badge bg-success" style={{ fontSize: '0.7rem' }}>
                                        <i className="bi bi-check-circle me-1"></i>
                                        Connected
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="card-body p-2 p-md-3">
                            {/* Connection Section */}
                            <div className="row g-2 mb-3">
                                <div className="col-12">
                                    <div className="alert alert-info" style={{ fontSize: '0.8rem', padding: '8px 12px' }}>
                                        <i className="bi bi-info-circle me-2"></i>
                                        The system automatically secures your data as part of our disaster recovery protocol. However, for enhanced data sovereignty and compliance, we recommend maintaining an additional local backup of your critical business data.
                                    </div>
                                </div>

                                <div className="col-12">
                                    {!isConnected ? (
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={handleConnect}
                                            disabled={isLoading}
                                            style={{ fontSize: '0.8rem' }}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Connecting...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-google me-2"></i>
                                                    Connect to Google Drive
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div className="d-flex gap-2">
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={handleDisconnect}
                                                disabled={isLoading}
                                                style={{ fontSize: '0.8rem' }}
                                            >
                                                <i className="bi bi-trash me-2"></i>
                                                Disconnect
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Backup Settings Section */}
                            {isConnected && (
                                <>
                                    <div className="row g-2 mb-3">
                                        <div className="col-12">
                                            <h6 className="mb-2" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                                <i className="bi bi-gear me-2"></i>
                                                Backup Settings
                                            </h6>
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <div className="position-relative">
                                                <select
                                                    className="form-control form-control-sm"
                                                    value={backupSchedule}
                                                    onChange={(e) => setBackupSchedule(e.target.value)}
                                                    style={{
                                                        height: '24px',
                                                        fontSize: '0.75rem',
                                                        paddingTop: '0.2rem',
                                                        width: '100%'
                                                    }}
                                                >
                                                    <option value="daily">Daily (2 AM)</option>
                                                    <option value="weekly">Weekly (Sunday 2 AM)</option>
                                                    <option value="manual">Manual Only</option>
                                                </select>
                                                <label
                                                    className="position-absolute"
                                                    style={{
                                                        top: '-0.5rem',
                                                        left: '0.75rem',
                                                        fontSize: '0.7rem',
                                                        backgroundColor: 'white',
                                                        padding: '0 0.25rem',
                                                        color: '#6c757d',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    Schedule:
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <div className="position-relative">
                                                <select
                                                    className="form-control form-control-sm"
                                                    value={backupFormat}
                                                    onChange={(e) => setBackupFormat(e.target.value)}
                                                    style={{
                                                        height: '24px',
                                                        fontSize: '0.75rem',
                                                        paddingTop: '0.2rem',
                                                        width: '100%'
                                                    }}
                                                >
                                                    <option value="compressed">Compressed (Smallest size)</option>
                                                    <option value="sql">SQL (Database restore)</option>
                                                    <option value="csv">CSV (Excel compatible)</option>
                                                </select>
                                                <label
                                                    className="position-absolute"
                                                    style={{
                                                        top: '-0.5rem',
                                                        left: '0.75rem',
                                                        fontSize: '0.7rem',
                                                        backgroundColor: 'white',
                                                        padding: '0 0.25rem',
                                                        color: '#6c757d',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    Backup Format:
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-12 col-md-4 d-flex align-items-end">
                                            <div className="form-check" style={{ fontSize: '0.75rem' }}>
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    id="autoBackup"
                                                    checked={autoBackupEnabled}
                                                    onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                                                    style={{ transform: 'scale(0.9)' }}
                                                />
                                                <label className="form-check-label" htmlFor="autoBackup" style={{ fontSize: '0.75rem' }}>
                                                    Enable Automatic Backup
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="d-flex gap-2 mt-2">
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    onClick={saveBackupSettings}
                                                    disabled={loading}
                                                    style={{ fontSize: '0.75rem' }}
                                                >
                                                    <i className="bi bi-save me-1"></i>
                                                    Save Settings
                                                </button>

                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={performBackup}
                                                    disabled={loading}
                                                    style={{ fontSize: '0.75rem' }}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-1"></span>
                                                            Backing up...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-cloud-upload me-1"></i>
                                                            Backup Now
                                                        </>
                                                    )}
                                                </button>

                                                <button
                                                    className="btn btn-info btn-sm"
                                                    onClick={() => navigate('/backup-history')}
                                                    style={{ fontSize: '0.75rem' }}
                                                >
                                                    <i className="bi bi-clock-history me-1"></i>
                                                    View Backup History
                                                    {lastBackupCount > 0 && (
                                                        <span className="badge bg-light text-dark ms-1" style={{ fontSize: '0.65rem' }}>{lastBackupCount}</span>
                                                    )}
                                                </button>
                                                <button
                                                    className="btn btn-warning btn-sm"
                                                    onClick={() => navigate('/disaster-recovery')}
                                                    style={{ fontSize: '0.75rem' }}
                                                >
                                                    <i className="bi bi-shield-check me-1"></i>
                                                    Disaster Recovery Protocol
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row g-2 mt-2">
                                        <div className="col-12 col-md-6">
                                            <div className="alert alert-light border h-100" style={{ fontSize: '0.7rem', padding: '8px 12px', marginBottom: 0 }}>
                                                <small>
                                                    <strong>📁 Format Information:</strong><br />
                                                    • <strong>Compressed</strong> - Smallest file size, best for storage<br />
                                                    • <strong>SQL</strong> - Complete database restore (recommended)<br />
                                                    • <strong>CSV</strong> - Excel/Spreadsheet compatible
                                                </small>
                                            </div>
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <div className="alert alert-secondary h-100" style={{ fontSize: '0.7rem', padding: '8px 12px', marginBottom: 0 }}>
                                                <i className="bi bi-folder me-1"></i>
                                                <strong className="me-1">Backup Location:</strong>
                                                <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem' }}> Google Drive → Ams_Backups</a>
                                            </div>
                                        </div>
                                    </div>
                                </>
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
        </DashboardLayout>
    );
};

export default GoogleDriveBackup;