import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useAuth } from '../../context/AuthContext';
import NotificationToast from '../NotificationToast';

const LoginForm = () => {
    const { login } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    // ... (keep your existing handleSubmit, useEffect, etc.) ...
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login({ email, password });
            setModalMessage('Login successful! Redirecting...');
            setModalType('success');
            setShowModal(true);
            setTimeout(() => {
                setShowModal(false);
                navigate('/dashboard');
            }, 3000);
        } catch (error) {
            setLoading(false);
            setModalMessage(error.message || 'Invalid email or password.');
            setModalType('error');
            setShowModal(true);
        }
    };

    const styles = {
        // Main container: full viewport, flex layout
        container: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'stretch', // Stretch children to full height
            backgroundColor: '#f8f9fa',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        // Left panel: hero section with feature highlights
        heroPanel: {
            flex: '0 0 55%', // Takes 55% width
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
        // Right panel: login form card
        formPanel: {
            flex: '1', // Takes remaining 45% width
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
            marginBottom: '0.5rem',
        },
        cardSubtitle: {
            color: '#718096',
            marginBottom: '2rem',
            fontSize: '0.95rem',
        },
        field: {
            marginBottom: '1.25rem',
        },
        label: {
            display: 'block',
            fontWeight: '500',
            color: '#2d3748',
            fontSize: '0.85rem',
            marginBottom: '0.3rem',
        },
        input: {
            width: '100%',
            padding: '0.65rem 1rem',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '0.95rem',
            outline: 'none',
            transition: 'all 0.2s',
            backgroundColor: '#fff',
            color: '#2d3748',
        },
        inputFocus: {
            borderColor: '#2a4d7a',
            boxShadow: '0 0 0 3px rgba(42, 77, 122, 0.15)',
        },
        passwordWrapper: {
            position: 'relative',
        },
        eyeButton: {
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#a0aec0',
            padding: '4px',
        },
        optionsRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
        },
        verifyEmailLabel: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            color: '#4a5568',
            cursor: 'pointer',
        },
        forgotLink: {
            color: '#2a4d7a',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: '500',
        },
        loginButton: {
            width: '100%',
            padding: '0.7rem',
            background: '#2a4d7a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '1.5rem',
            height: '46px',
        },
        loginButtonHover: {
            background: '#1e3a5f',
        },
        registerText: {
            textAlign: 'center',
            fontSize: '0.9rem',
            color: '#718096',
        },
        registerLink: {
            color: '#2a4d7a',
            fontWeight: '600',
            textDecoration: 'none',
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
    };

    return (
        <div style={styles.container}>
            <NotificationToast
                message={modalMessage}
                type={modalType}
                show={showModal}
                onClose={() => setShowModal(false)}
            />

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
                    <h2 style={styles.cardTitle}>Welcome Back</h2>
                    <p style={styles.cardSubtitle}>Log in to your account</p>

                    <form onSubmit={handleSubmit}>
                        <div style={styles.field}>
                            <label htmlFor="email" style={styles.label}>Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={styles.input}
                                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = 'none';
                                }}
                                required
                            />
                        </div>

                        <div style={styles.field}>
                            <label htmlFor="password" style={styles.label}>Password</label>
                            <div style={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={styles.input}
                                    onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e2e8f0';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                    required
                                />
                                <button
                                    type="button"
                                    style={styles.eyeButton}
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex="-1"
                                >
                                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                </button>
                            </div>
                        </div>
                        <div style={styles.optionsRow}>
                            <label style={styles.verifyEmailLabel}>
                                <Link to="/auth/verify-email" style={{ textDecoration: 'none', color: 'inherit' }}>
                                    Verify Email
                                </Link>
                            </label>
                            <Link to="/auth/forgot-password" style={styles.forgotLink}>
                                Forgot Password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            style={styles.loginButton}
                            disabled={loading}
                            onMouseEnter={(e) => e.target.style.background = styles.loginButtonHover.background}
                            onMouseLeave={(e) => e.target.style.background = styles.loginButton.background}
                        >
                            {loading ? (
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                            ) : (
                                'Login'
                            )}
                        </button>

                        <p style={styles.registerText}>
                            Don't have an account?{' '}
                            <Link to="/auth/register" style={styles.registerLink}>
                                Register
                            </Link>
                        </p>
                    </form>
                </div>
            </div>

            <style>{`
                @media (max-width: 992px) {
                    .bi { font-size: 1.2rem; }
                }
            `}</style>
        </div>
    );
};

export default LoginForm;