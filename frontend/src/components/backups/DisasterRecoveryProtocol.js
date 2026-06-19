import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import DashboardLayout from '../company/DashboardLayout';
import NotificationToast from '../NotificationToast';
import { format } from 'date-fns';

const DisasterRecoveryProtocol = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isAdminOrSupervisor, setIsAdminOrSupervisor] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeAccordion, setActiveAccordion] = useState('collapseOne');
    const [backupStatus, setBackupStatus] = useState({
        lastBackupDate: null,
        lastBackupSize: null,
        totalBackups: 0,
        isConnected: false
    });
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

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
                await fetchBackupStatus();
            } catch (error) {
                console.error('Error initializing component:', error);
            } finally {
                setLoading(false);
            }
        };
        initializeComponent();
    }, [currentUser, navigate]);

    const fetchBackupStatus = async () => {
        try {
            const [statusRes, historyRes] = await Promise.all([
                api.get('/api/drivebackup/status'),
                api.get('/api/drivebackup/history')
            ]);

            if (statusRes.data) {
                setBackupStatus(prev => ({
                    ...prev,
                    isConnected: statusRes.data.isConnected || false
                }));
            }

            if (historyRes.data.success && historyRes.data.backups.length > 0) {
                const lastBackup = historyRes.data.backups[0];
                setBackupStatus(prev => ({
                    ...prev,
                    lastBackupDate: lastBackup.backupDate,
                    lastBackupSize: lastBackup.fileSize,
                    totalBackups: historyRes.data.backups.length
                }));
            }
        } catch (error) {
            console.error('Error fetching backup status:', error);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not Available';
        return format(new Date(dateString), 'PPP pp');
    };

    const getStatusColor = () => {
        if (!backupStatus.isConnected) return 'bg-danger';
        if (backupStatus.lastBackupDate) {
            const daysSinceLastBackup = Math.floor((Date.now() - new Date(backupStatus.lastBackupDate)) / (1000 * 60 * 60 * 24));
            if (daysSinceLastBackup <= 1) return 'bg-success';
            if (daysSinceLastBackup <= 3) return 'bg-warning';
            return 'bg-danger';
        }
        return 'bg-danger';
    };

    const getStatusText = () => {
        if (!backupStatus.isConnected) return 'Not Connected';
        if (backupStatus.lastBackupDate) {
            const daysSinceLastBackup = Math.floor((Date.now() - new Date(backupStatus.lastBackupDate)) / (1000 * 60 * 60 * 24));
            if (daysSinceLastBackup <= 1) return 'Healthy';
            if (daysSinceLastBackup <= 3) return 'Warning';
            return 'Critical';
        }
        return 'No Backups';
    };

    const toggleAccordion = (id) => {
        setActiveAccordion(activeAccordion === id ? '' : id);
    };

    if (loading) {
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
                    <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp">
                        <div className="card-header bg-white py-2">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="card-title mb-0">
                                    <i className="bi bi-shield-check me-2"></i>
                                    Disaster Recovery Protocol
                                </h5>
                                <span className={`badge ${getStatusColor()} d-flex align-items-center`} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                                    <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>
                                    {getStatusText()}
                                </span>
                            </div>
                        </div>

                        <div className="card-body p-3">
                            {/* Overview Section */}
                            <div className="row g-3 mb-4">
                                <div className="col-12">
                                    <div className="alert alert-info py-2" style={{ fontSize: '0.8rem' }}>
                                        <i className="bi bi-info-circle me-2"></i>
                                        We are dedicated to protecting your financial data with enterprise-grade disaster recovery protocols. Your data is backed up, encrypted, and recoverable.
                                    </div>
                                </div>

                                {/* Quick Status Cards */}
                                <div className="col-12 col-md-3">
                                    <div className="card bg-light border">
                                        <div className="card-body text-center py-2">
                                            <h6 className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>Backup Status</h6>
                                            <p className={`mb-0 fw-bold ${getStatusColor() === 'bg-success' ? 'text-success' : getStatusColor() === 'bg-warning' ? 'text-warning' : 'text-danger'}`} style={{ fontSize: '0.9rem' }}>
                                                {getStatusText()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 col-md-3">
                                    <div className="card bg-light border">
                                        <div className="card-body text-center py-2">
                                            <h6 className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>Last Backup</h6>
                                            <p className="mb-0 fw-bold" style={{ fontSize: '0.8rem' }}>
                                                {backupStatus.lastBackupDate ? formatDate(backupStatus.lastBackupDate) : 'Never'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 col-md-3">
                                    <div className="card bg-light border">
                                        <div className="card-body text-center py-2">
                                            <h6 className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>Backup Size</h6>
                                            <p className="mb-0 fw-bold" style={{ fontSize: '0.8rem' }}>
                                                {backupStatus.lastBackupSize ? formatFileSize(backupStatus.lastBackupSize) : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 col-md-3">
                                    <div className="card bg-light border">
                                        <div className="card-body text-center py-2">
                                            <h6 className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>Total Backups</h6>
                                            <p className="mb-0 fw-bold" style={{ fontSize: '0.8rem' }}>
                                                {backupStatus.totalBackups}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main DRP Content - Using React State */}
                            <div className="accordion" id="drpAccordion">
                                {/* 1. Overview */}
                                <div className="accordion-item">
                                    <h2 className="accordion-header">
                                        <button
                                            className={`accordion-button ${activeAccordion === 'collapseOne' ? '' : 'collapsed'}`}
                                            type="button"
                                            onClick={() => toggleAccordion('collapseOne')}
                                        >
                                            <i className="bi bi-info-circle me-2"></i> Overview
                                        </button>
                                    </h2>
                                    <div className={`accordion-collapse collapse ${activeAccordion === 'collapseOne' ? 'show' : ''}`}>
                                        <div className="accordion-body" style={{ fontSize: '0.85rem' }}>
                                            <p><strong>What is Disaster Recovery Protocol?</strong></p>
                                            <p>Our Disaster Recovery Protocol (DRP) is a comprehensive plan designed to protect your financial data and ensure business continuity in the event of unexpected disruptions such as server failures, cyberattacks, or natural disasters.</p>
                                            <div className="alert alert-success py-1" style={{ fontSize: '0.8rem' }}>
                                                <i className="bi bi-check-circle me-2"></i>
                                                <strong>Your Data is Safe:</strong> We use automated backups, encryption, and secure storage to protect your critical business data.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Backup Schedule */}
                                <div className="accordion-item">
                                    <h2 className="accordion-header">
                                        <button
                                            className={`accordion-button ${activeAccordion === 'collapseTwo' ? '' : 'collapsed'}`}
                                            type="button"
                                            onClick={() => toggleAccordion('collapseTwo')}
                                        >
                                            <i className="bi bi-clock-history me-2"></i> Backup Schedule
                                        </button>
                                    </h2>
                                    <div className={`accordion-collapse collapse ${activeAccordion === 'collapseTwo' ? 'show' : ''}`}>
                                        <div className="accordion-body" style={{ fontSize: '0.85rem' }}>
                                            <div className="row g-2">
                                                <div className="col-12 col-md-6">
                                                    <div className="card bg-light">
                                                        <div className="card-body py-2">
                                                            <h6 className="mb-1">Frequency</h6>
                                                            <p className="mb-0">Daily at 2 AM (Full Database Backup)</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12 col-md-6">
                                                    <div className="card bg-light">
                                                        <div className="card-body py-2">
                                                            <h6 className="mb-1">Retention</h6>
                                                            <p className="mb-0">Last 2 backup copies</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="card bg-light">
                                                        <div className="card-body py-2">
                                                            <h6 className="mb-1">Storage Locations</h6>
                                                            <ul className="mb-0 ps-3" style={{ fontSize: '0.8rem' }}>
                                                                <li>🔒 Server (Primary)</li>
                                                                <li>☁️ Google Drive (Secure Cloud)</li>
                                                                <li>💾 Physical Locations (Offline)</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Recovery Metrics */}
                                <div className="accordion-item">
                                    <h2 className="accordion-header">
                                        <button
                                            className={`accordion-button ${activeAccordion === 'collapseThree' ? '' : 'collapsed'}`}
                                            type="button"
                                            onClick={() => toggleAccordion('collapseThree')}
                                        >
                                            <i className="bi bi-speedometer2 me-2"></i> Recovery Metrics (RPO & RTO)
                                        </button>
                                    </h2>
                                    <div className={`accordion-collapse collapse ${activeAccordion === 'collapseThree' ? 'show' : ''}`}>
                                        <div className="accordion-body" style={{ fontSize: '0.85rem' }}>
                                            <div className="row g-2">
                                                <div className="col-12 col-md-6">
                                                    <div className="card border-primary">
                                                        <div className="card-body py-2">
                                                            <h6 className="mb-1 text-primary">RPO - Recovery Point Objective</h6>
                                                            <p className="mb-1 fw-bold" style={{ fontSize: '0.9rem' }}>Maximum 24 Hours</p>
                                                            <small className="text-muted">Amount of data loss acceptable. Backups are taken daily.</small>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12 col-md-6">
                                                    <div className="card border-success">
                                                        <div className="card-body py-2">
                                                            <h6 className="mb-1 text-success">RTO - Recovery Time Objective</h6>
                                                            <p className="mb-1 fw-bold" style={{ fontSize: '0.9rem' }}>Within 4 Hours</p>
                                                            <small className="text-muted">Time to restore systems and resume operations.</small>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="alert alert-secondary py-1" style={{ fontSize: '0.75rem' }}>
                                                        <i className="bi bi-info-circle me-1"></i>
                                                        <strong>What this means:</strong> In case of a disaster, your data may have up to 24 hours of data loss, and we will restore your systems within 4 hours.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Security Measures */}
                                <div className="accordion-item">
                                    <h2 className="accordion-header">
                                        <button
                                            className={`accordion-button ${activeAccordion === 'collapseFour' ? '' : 'collapsed'}`}
                                            type="button"
                                            onClick={() => toggleAccordion('collapseFour')}
                                        >
                                            <i className="bi bi-lock me-2"></i> Security Measures
                                        </button>
                                    </h2>
                                    <div className={`accordion-collapse collapse ${activeAccordion === 'collapseFour' ? 'show' : ''}`}>
                                        <div className="accordion-body" style={{ fontSize: '0.85rem' }}>
                                            <div className="row g-2">
                                                <div className="col-12 col-md-4">
                                                    <div className="text-center p-2 border rounded">
                                                        <h6>🔐 Encryption</h6>
                                                        <small className="text-muted">Backup data is encrypted for security</small>
                                                    </div>
                                                </div>
                                                <div className="col-12 col-md-4">
                                                    <div className="text-center p-2 border rounded">
                                                        <h6>🔒 Transmission</h6>
                                                        <small className="text-muted">Data encrypted during transmission (TLS/SSL)</small>
                                                    </div>
                                                </div>
                                                <div className="col-12 col-md-4">
                                                    <div className="text-center p-2 border rounded">
                                                        <h6>👤 Access Control</h6>
                                                        <small className="text-muted">Only authorized admins have access</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 5. Disaster Scenarios */}
                                <div className="accordion-item">
                                    <h2 className="accordion-header">
                                        <button
                                            className={`accordion-button ${activeAccordion === 'collapseFive' ? '' : 'collapsed'}`}
                                            type="button"
                                            onClick={() => toggleAccordion('collapseFive')}
                                        >
                                            <i className="bi bi-exclamation-triangle me-2"></i> Disaster Scenarios & Preparedness
                                        </button>
                                    </h2>
                                    <div className={`accordion-collapse collapse ${activeAccordion === 'collapseFive' ? 'show' : ''}`}>
                                        <div className="accordion-body" style={{ fontSize: '0.85rem' }}>
                                            <p><strong>We are prepared for:</strong></p>
                                            <div className="d-flex flex-wrap gap-2 mb-3">
                                                <span className="badge bg-danger">⚠️ Server Failure</span>
                                                <span className="badge bg-warning text-dark">💾 Database Corruption</span>
                                                <span className="badge bg-info text-dark">🗑️ Accidental Deletion</span>
                                                <span className="badge bg-dark">💻 Cyber Attack</span>
                                                <span className="badge bg-secondary">🌍 Natural Disaster</span>
                                            </div>
                                            <div className="alert alert-warning py-1" style={{ fontSize: '0.8rem' }}>
                                                <i className="bi bi-shield me-1"></i>
                                                <strong>Off-site Backups:</strong> We do not currently have off-site backups. All backups are stored within our secured infrastructure.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 6. Recovery Process */}
                                <div className="accordion-item">
                                    <h2 className="accordion-header">
                                        <button
                                            className={`accordion-button ${activeAccordion === 'collapseSix' ? '' : 'collapsed'}`}
                                            type="button"
                                            onClick={() => toggleAccordion('collapseSix')}
                                        >
                                            <i className="bi bi-arrow-repeat me-2"></i> Recovery Process
                                        </button>
                                    </h2>
                                    <div className={`accordion-collapse collapse ${activeAccordion === 'collapseSix' ? 'show' : ''}`}>
                                        <div className="accordion-body" style={{ fontSize: '0.85rem' }}>
                                            <h6>How Recovery Works:</h6>
                                            <ol className="ps-3" style={{ fontSize: '0.8rem' }}>
                                                <li><strong>User Data Restoration:</strong> If you accidentally delete data, we can restore it from your Google Drive backup using our secure restoration process.</li>
                                                <li><strong>Full System Recovery:</strong> In case of complete system failure, we have multiple backup copies stored in:</li>
                                                <ul className="ps-3">
                                                    <li>🔒 Google Drive (Cloud Storage)</li>
                                                    <li>💾 Server</li>
                                                    <li>📦 Physical Locations</li>
                                                </ul>
                                                <li className="mt-2"><strong>Restoration Command Example:</strong></li>
                                                <div className="bg-dark text-light p-2 rounded" style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                                                    pg_restore --host=localhost --port=5432 --username=postgres --dbname=SkyForge --clean --if-exists --verbose "backup_file.dump"
                                                </div>
                                            </ol>
                                            <div className="mt-2 alert alert-info py-1" style={{ fontSize: '0.75rem' }}>
                                                <i className="bi bi-info-circle me-1"></i>
                                                <strong>Note:</strong> Full system recovery requires administrator intervention and may take up to 4 hours.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 7. Testing */}
                                <div className="accordion-item">
                                    <h2 className="accordion-header">
                                        <button
                                            className={`accordion-button ${activeAccordion === 'collapseSeven' ? '' : 'collapsed'}`}
                                            type="button"
                                            onClick={() => toggleAccordion('collapseSeven')}
                                        >
                                            <i className="bi bi-check2-all me-2"></i> Testing & Verification
                                        </button>
                                    </h2>
                                    <div className={`accordion-collapse collapse ${activeAccordion === 'collapseSeven' ? 'show' : ''}`}>
                                        <div className="accordion-body" style={{ fontSize: '0.85rem' }}>
                                            <div className="row g-2">
                                                <div className="col-12 col-md-6">
                                                    <div className="card bg-light">
                                                        <div className="card-body py-2">
                                                            <h6 className="mb-1">Test Frequency</h6>
                                                            <p className="mb-0">Monthly</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12 col-md-6">
                                                    <div className="card bg-light">
                                                        <div className="card-body py-2">
                                                            <h6 className="mb-1">Audit Logs</h6>
                                                            <p className="mb-0">✅ All backup/restore operations are logged</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-2 alert alert-secondary py-1" style={{ fontSize: '0.75rem' }}>
                                                <i className="bi bi-clock me-1"></i>
                                                We regularly test our backup restoration process to ensure reliability.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 8. User Responsibilities */}
                                <div className="accordion-item">
                                    <h2 className="accordion-header">
                                        <button
                                            className={`accordion-button ${activeAccordion === 'collapseEight' ? '' : 'collapsed'}`}
                                            type="button"
                                            onClick={() => toggleAccordion('collapseEight')}
                                        >
                                            <i className="bi bi-person me-2"></i> User Responsibilities
                                        </button>
                                    </h2>
                                    <div className={`accordion-collapse collapse ${activeAccordion === 'collapseEight' ? 'show' : ''}`}>
                                        <div className="accordion-body" style={{ fontSize: '0.85rem' }}>
                                            <p><strong>As a user, you are responsible for:</strong></p>
                                            <ul className="ps-3" style={{ fontSize: '0.8rem' }}>
                                                <li>✅ Verifying your backups are complete and up-to-date</li>
                                                <li>✅ Contacting support immediately if you notice any issues</li>
                                                <li>✅ Keeping your company data organized for easy restoration</li>
                                            </ul>
                                            <div className="mt-2 alert alert-warning py-1" style={{ fontSize: '0.75rem' }}>
                                                <i className="bi bi-exclamation-triangle me-1"></i>
                                                <strong>Self-Service Restore:</strong> We do not currently offer self-service restore options. Please contact support for any restoration requests.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 9. Contact & Support */}
                                <div className="accordion-item">
                                    <h2 className="accordion-header">
                                        <button
                                            className={`accordion-button ${activeAccordion === 'collapseNine' ? '' : 'collapsed'}`}
                                            type="button"
                                            onClick={() => toggleAccordion('collapseNine')}
                                        >
                                            <i className="bi bi-headset me-2"></i> Contact & Support
                                        </button>
                                    </h2>
                                    <div className={`accordion-collapse collapse ${activeAccordion === 'collapseNine' ? 'show' : ''}`}>
                                        <div className="accordion-body" style={{ fontSize: '0.85rem' }}>
                                            <div className="row g-2">
                                                <div className="col-12 col-md-6">
                                                    <div className="card bg-light">
                                                        <div className="card-body py-2 text-center">
                                                            <h6>📧 Email</h6>
                                                            <a href="mailto:support@amsacc.com" className="text-decoration-none">support@amsacc.com</a>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12 col-md-6">
                                                    <div className="card bg-light">
                                                        <div className="card-body py-2 text-center">
                                                            <h6>📞 Phone</h6>
                                                            <a href="tel:9818626484" className="text-decoration-none">9818626484</a>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="alert alert-info py-1" style={{ fontSize: '0.75rem' }}>
                                                        <i className="bi bi-info-circle me-1"></i>
                                                        <strong>Communication:</strong> In case of a disaster, we will notify you via phone calls and emails.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Summary */}
                            <div className="mt-4 p-2 bg-light border rounded" style={{ fontSize: '0.7rem' }}>
                                <div className="row">
                                    <div className="col-12 col-md-6">
                                        <strong>Last Updated:</strong> {format(new Date(), 'PPP')}
                                    </div>
                                    <div className="col-12 col-md-6 text-md-end">
                                        <span className="badge bg-success">✅ DRP Active</span>
                                    </div>
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
        </DashboardLayout>
    );
};

export default DisasterRecoveryProtocol;