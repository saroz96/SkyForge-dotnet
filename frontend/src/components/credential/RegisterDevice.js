import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import api from '../services/api';
import NotificationToast from '../NotificationToast';
import { getDeviceFingerprint, getDeviceMetadata } from '../../utils/deviceFingerprint';

const RegisterDevice = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';
    const password = location.state?.password || '';

    const [loading, setLoading] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [fingerprint, setFingerprint] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    // --------------------------------------------------------
    // Guard: user must arrive here from the login page with
    // email + password. Otherwise, redirect back to login.
    // --------------------------------------------------------
    useEffect(() => {
        if (!email || !password) {
            navigate('/auth/login', { replace: true });
        }
    }, [email, password, navigate]);

    // --------------------------------------------------------
    // Compute fingerprint + metadata on mount
    // --------------------------------------------------------
    useEffect(() => {
        (async () => {
            try {
                const fp = await getDeviceFingerprint();
                setFingerprint(fp);
                setDeviceInfo(getDeviceMetadata());
            } catch (err) {
                console.error('Fingerprint error:', err);
                setToast({
                    show: true,
                    message: 'Could not identify this device. Please refresh the page.',
                    type: 'error',
                });
            }
        })();
    }, []);

    // --------------------------------------------------------
    // Submit registration with email + password (pre-login flow)
    // --------------------------------------------------------
    const handleRegister = async () => {
        if (!fingerprint) {
            setToast({
                show: true,
                message: 'Device information not ready yet. Please wait a moment.',
                type: 'error',
            });
            return;
        }

        if (!email || !password) {
            setToast({
                show: true,
                message: 'Session expired. Please log in again.',
                type: 'error',
            });
            setTimeout(() => navigate('/auth/login', { replace: true }), 1500);
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/api/device/register', {
                // 🔑 Identity proof (backend re-authenticates)
                email: email,
                password: password,

                // 📱 Device info
                deviceFingerprint: fingerprint,
                deviceName: deviceInfo?.deviceName,
                operatingSystem: deviceInfo?.operatingSystem,
                browserName: deviceInfo?.browserName,
                browserVersion: deviceInfo?.browserVersion,
                screenResolution: deviceInfo?.screenResolution,
                timeZone: deviceInfo?.timeZone,
                language: deviceInfo?.language,
            });

            if (response.data.success) {
                navigate('/auth/pending-approval', {
                    state: {
                        email,
                        deviceId: response.data.deviceId,
                        message: response.data.message,
                    },
                });
            } else {
                throw new Error(response.data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Device registration error:', error);
            const msg =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Registration failed';
            setToast({ show: true, message: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(145deg, #1e3a5f 0%, #2a4d7a 100%)',
            padding: '20px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        card: {
            width: '100%',
            maxWidth: '520px',
            background: '#fff',
            borderRadius: '16px',
            padding: '40px 35px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        },
        icon: {
            fontSize: '3rem',
            color: '#2a4d7a',
            marginBottom: '1rem',
            display: 'block',
            textAlign: 'center',
        },
        title: {
            fontSize: '1.6rem',
            fontWeight: '700',
            color: '#1a202c',
            textAlign: 'center',
            marginBottom: '0.5rem',
        },
        subtitle: {
            color: '#718096',
            textAlign: 'center',
            marginBottom: '2rem',
            fontSize: '0.95rem',
            lineHeight: '1.5',
        },
        infoBox: {
            background: '#f7fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '1.5rem',
        },
        infoRow: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '6px 0',
            fontSize: '0.9rem',
            borderBottom: '1px dashed #e2e8f0',
        },
        infoLabel: { color: '#718096', fontWeight: '500' },
        infoValue: { color: '#2d3748', fontWeight: '600', textAlign: 'right', maxWidth: '60%' },
        button: {
            width: '100%',
            padding: '0.85rem',
            background: '#2a4d7a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '1rem',
        },
        cancelLink: {
            textAlign: 'center',
            fontSize: '0.9rem',
            color: '#718096',
            display: 'block',
        },
    };

    return (
        <div style={styles.container}>
            <NotificationToast
                message={toast.message}
                type={toast.type}
                show={toast.show}
                onClose={() => setToast({ ...toast, show: false })}
            />

            <div style={styles.card}>
                <i className="bi bi-shield-lock" style={styles.icon}></i>
                <h2 style={styles.title}>Register This Device</h2>
                <p style={styles.subtitle}>
                    This device isn't registered to your account yet. Send a request to your
                    administrator to approve it.
                </p>

                {deviceInfo && (
                    <div style={styles.infoBox}>
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Device</span>
                            <span style={styles.infoValue}>{deviceInfo.deviceName}</span>
                        </div>
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Operating System</span>
                            <span style={styles.infoValue}>{deviceInfo.operatingSystem}</span>
                        </div>
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Browser</span>
                            <span style={styles.infoValue}>
                                {deviceInfo.browserName} {deviceInfo.browserVersion}
                            </span>
                        </div>
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Screen</span>
                            <span style={styles.infoValue}>{deviceInfo.screenResolution}</span>
                        </div>
                        <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
                            <span style={styles.infoLabel}>Time Zone</span>
                            <span style={styles.infoValue}>{deviceInfo.timeZone}</span>
                        </div>
                    </div>
                )}

                <button
                    style={styles.button}
                    onClick={handleRegister}
                    disabled={loading || !fingerprint}
                >
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" />
                            Sending request...
                        </>
                    ) : (
                        <>
                            <i className="bi bi-send me-2"></i>
                            Send Registration Request
                        </>
                    )}
                </button>

                <Link to="/auth/login" style={styles.cancelLink}>
                    ← Back to login
                </Link>
            </div>
        </div>
    );
};

export default RegisterDevice;