import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import api from '../services/api';
import { getDeviceFingerprint } from '../../utils/deviceFingerprint';

const PendingApproval = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';
    const initialMessage = location.state?.message || '';

    const [status, setStatus] = useState('Pending');
    const [checking, setChecking] = useState(false);
    const [lastChecked, setLastChecked] = useState(null);

    const checkStatus = async () => {
        setChecking(true);
        try {
            const fingerprint = await getDeviceFingerprint();

            const response = await api.post('/api/device/verify', {
                deviceFingerprint: fingerprint,
            });

            const data = response.data;
            setStatus(data.status);
            setLastChecked(new Date());

            if (data.success && data.isTrusted) {
                // Approved! Send user back to login
                setTimeout(() => {
                    navigate('/auth/login');
                }, 1500);
            }
        } catch (err) {
            console.error('Status check failed:', err);
        } finally {
            setChecking(false);
        }
    };

    const isApproved = status === 'Approved';
    const isRejected = status === 'Rejected' || status === 'Revoked' || status === 'Blocked';

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(145deg, #1e3a5f 0%, #2a4d7a 100%)',
                padding: '20px',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '520px',
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '40px 35px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    textAlign: 'center',
                }}
            >
                {isApproved ? (
                    <>
                        <i
                            className="bi bi-check-circle-fill"
                            style={{ fontSize: '3.5rem', color: '#38a169', marginBottom: '1rem' }}
                        ></i>
                        <h2 style={{ fontWeight: 700, color: '#1a202c' }}>
                            Device Approved!
                        </h2>
                        <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
                            Redirecting you to login...
                        </p>
                    </>
                ) : isRejected ? (
                    <>
                        <i
                            className="bi bi-x-circle-fill"
                            style={{ fontSize: '3.5rem', color: '#e53e3e', marginBottom: '1rem' }}
                        ></i>
                        <h2 style={{ fontWeight: 700, color: '#1a202c' }}>
                            Device Not Approved
                        </h2>
                        <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
                            Your device request was {status.toLowerCase()}. Please contact your
                            administrator.
                        </p>
                    </>
                ) : (
                    <>
                        <i
                            className="bi bi-hourglass-split"
                            style={{
                                fontSize: '3.5rem',
                                color: '#d69e2e',
                                marginBottom: '1rem',
                                display: 'inline-block',
                                animation: 'pulse 2s ease-in-out infinite',
                            }}
                        ></i>
                        <h2 style={{ fontWeight: 700, color: '#1a202c' }}>
                            Waiting for Approval
                        </h2>
                        <p style={{ color: '#718096', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                            {initialMessage ||
                                'Your device registration request has been sent to your administrator. You\'ll be able to log in once it\'s approved.'}
                        </p>

                        <div
                            style={{
                                background: '#fffaf0',
                                border: '1px solid #f6e05e',
                                borderRadius: '10px',
                                padding: '14px 18px',
                                marginBottom: '1.5rem',
                                textAlign: 'left',
                                fontSize: '0.9rem',
                                color: '#744210',
                            }}
                        >
                            <i className="bi bi-info-circle me-2"></i>
                            <strong>What happens next?</strong>
                            <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                                <li>Your admin reviews the request</li>
                                <li>Once approved, log in again from this device</li>
                            </ul>
                        </div>

                        <button
                            onClick={checkStatus}
                            disabled={checking}
                            style={{
                                width: '100%',
                                padding: '0.85rem',
                                background: '#2a4d7a',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: checking ? 'not-allowed' : 'pointer',
                                opacity: checking ? 0.7 : 1,
                                marginBottom: '1rem',
                            }}
                        >
                            {checking ? (
                                <>
                                    <span
                                        className="spinner-border spinner-border-sm me-2"
                                        role="status"
                                    />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-arrow-clockwise me-2"></i>
                                    Check Status Now
                                </>
                            )}
                        </button>

                        {lastChecked && (
                            <p
                                style={{
                                    fontSize: '0.8rem',
                                    color: '#a0aec0',
                                    marginBottom: '1rem',
                                }}
                            >
                                Last checked: {lastChecked.toLocaleTimeString()}
                            </p>
                        )}
                    </>
                )}

                <Link
                    to="/auth/login"
                    style={{
                        display: 'block',
                        textAlign: 'center',
                        fontSize: '0.9rem',
                        color: '#718095',
                        textDecoration: 'none',
                    }}
                >
                    ← Back to login
                </Link>

                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.6; transform: scale(1.05); }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default PendingApproval;