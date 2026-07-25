// src/components/PrivacyPolicy.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const PrivacyPolicy = () => {
    const styles = {
        container: {
            minHeight: '100vh',
            backgroundColor: '#f8f9fa',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        heroSection: {
            background: 'linear-gradient(145deg, #1e3a5f 0%, #2a4d7a 100%)',
            color: 'white',
            padding: '60px 0',
            textAlign: 'center',
        },
        heroTitle: {
            fontSize: '2.8rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
        },
        heroSubtitle: {
            fontSize: '1.1rem',
            opacity: '0.85',
            maxWidth: '600px',
            margin: '0 auto',
        },
        contentSection: {
            padding: '50px 0',
        },
        contentCard: {
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '40px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            maxWidth: '1000px',
            margin: '0 auto',
        },
        sectionTitle: {
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1a202c',
            marginTop: '2rem',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '2px solid #e2e8f0',
        },
        sectionTitleFirst: {
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1a202c',
            marginTop: '0',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '2px solid #e2e8f0',
        },
        paragraph: {
            fontSize: '0.95rem',
            lineHeight: '1.8',
            color: '#4a5568',
            marginBottom: '1rem',
        },
        list: {
            paddingLeft: '1.5rem',
            marginBottom: '1rem',
        },
        listItem: {
            fontSize: '0.95rem',
            lineHeight: '1.8',
            color: '#4a5568',
            marginBottom: '0.5rem',
        },
        highlightBox: {
            backgroundColor: '#f7fafc',
            padding: '20px',
            borderRadius: '8px',
            borderLeft: '4px solid #2a4d7a',
            margin: '1.5rem 0',
        },
        trustBadge: {
            backgroundColor: '#e8f5e9',
            padding: '15px 20px',
            borderRadius: '8px',
            borderLeft: '4px solid #43a047',
            margin: '1.5rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        },
        contactInfo: {
            backgroundColor: '#f7fafc',
            padding: '20px',
            borderRadius: '8px',
            margin: '1.5rem 0',
        },
        effectiveDate: {
            fontSize: '0.9rem',
            color: '#718096',
            fontStyle: 'italic',
            marginTop: '2rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0',
        },
        backButton: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#2a4d7a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: '500',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'all 0.2s',
            marginTop: '1rem',
        },
        '@media (max-width: 768px)': {
            heroTitle: {
                fontSize: '2rem',
            },
            contentCard: {
                padding: '20px',
                margin: '0 15px',
            },
            sectionTitle: {
                fontSize: '1.2rem',
            },
        },
    };

    return (
        <div style={styles.container}>
            {/* Hero Section */}
            <div style={styles.heroSection}>
                <div className="container">
                    <h1 style={styles.heroTitle}>
                        <i className="bi bi-shield-check me-3"></i>
                        Your Privacy Matters
                    </h1>
                    <p style={styles.heroSubtitle}>
                        We collect only what's necessary and protect what you trust us with
                    </p>
                </div>
            </div>

            {/* Content Section */}
            <div style={styles.contentSection}>
                <div className="container">
                    <div style={styles.contentCard}>
                        {/* Trust Badge */}
                        <div style={styles.trustBadge}>
                            <i className="bi bi-shield-lock" style={{ fontSize: '1.5rem', color: '#43a047' }}></i>
                            <div>
                                <strong style={{ color: '#2e7d32' }}>We respect your privacy</strong>
                                <p style={{ margin: '0', fontSize: '0.9rem', color: '#4a5568' }}>
                                    We collect minimal information and never share your personal data
                                </p>
                            </div>
                        </div>

                        {/* Introduction */}
                        <h2 style={styles.sectionTitleFirst}>Our Promise to You</h2>
                        <p style={styles.paragraph}>
                            We believe in transparency and simplicity. This privacy policy explains exactly what information we collect 
                            and why. We don't use complicated legal language - just clear, honest explanations.
                        </p>
                        <p style={styles.paragraph}>
                            <strong>Here's what we DON'T do:</strong>
                        </p>
                        <ul style={styles.list}>
                            <li style={styles.listItem}>❌ We don't sell your personal information</li>
                            <li style={styles.listItem}>❌ We don't share your data with advertisers</li>
                            <li style={styles.listItem}>❌ We don't track you across other websites</li>
                            <li style={styles.listItem}>❌ We don't collect more information than we need</li>
                        </ul>

                        {/* What We Collect */}
                        <h2 style={styles.sectionTitle}>What We Collect</h2>
                        <p style={styles.paragraph}>
                            We only collect information that helps us provide you with the best possible service. Here's everything:
                        </p>

                        <div style={styles.highlightBox}>
                            <h4 style={{ color: '#2a4d7a', fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                <i className="bi bi-person me-2"></i>
                                Account Information
                            </h4>
                            <p style={styles.paragraph}>
                                <strong>What:</strong> Your name, email address, phone number, and company name
                            </p>
                            <p style={styles.paragraph}>
                                <strong>Why:</strong> To create your account, send you important updates, and personalize your experience
                            </p>
                        </div>

                        <div style={styles.highlightBox}>
                            <h4 style={{ color: '#2a4d7a', fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                <i className="bi bi-key me-2"></i>
                                Login Credentials
                            </h4>
                            <p style={styles.paragraph}>
                                <strong>What:</strong> Your password (encrypted) and authentication data
                            </p>
                            <p style={styles.paragraph}>
                                <strong>Why:</strong> To keep your account secure and verify your identity
                            </p>
                        </div>

                        <div style={styles.highlightBox}>
                            <h4 style={{ color: '#2a4d7a', fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                <i className="bi bi-globe me-2"></i>
                                Technical Information
                            </h4>
                            <p style={styles.paragraph}>
                                <strong>What:</strong> IP address, browser type, and device information
                            </p>
                            <p style={styles.paragraph}>
                                <strong>Why:</strong> To ensure our software works properly on your device and to improve performance
                            </p>
                        </div>

                        <div style={styles.highlightBox}>
                            <h4 style={{ color: '#2a4d7a', fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                <i className="bi bi-cookie me-2"></i>
                                Cookies
                            </h4>
                            <p style={styles.paragraph}>
                                <strong>What:</strong> Small files that remember your preferences
                            </p>
                            <p style={styles.paragraph}>
                                <strong>Why:</strong> To keep you logged in and remember your settings for a better experience
                            </p>
                        </div>

                        <p style={{ ...styles.paragraph, backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px' }}>
                            <i className="bi bi-info-circle me-2" style={{ color: '#856404' }}></i>
                            <strong>Important:</strong> We do NOT collect your financial transactions, billing data, or any sensitive 
                            financial information. Our software helps you manage your data, but we don't store it on our servers.
                        </p>

                        {/* How We Use */}
                        <h2 style={styles.sectionTitle}>How We Use Your Information</h2>
                        <p style={styles.paragraph}>
                            We use your information for simple, straightforward purposes:
                        </p>

                        <ul style={styles.list}>
                            <li style={styles.listItem}>
                                <i className="bi bi-check-circle" style={{ color: '#43a047', marginRight: '8px' }}></i>
                                To create and manage your account
                            </li>
                            <li style={styles.listItem}>
                                <i className="bi bi-check-circle" style={{ color: '#43a047', marginRight: '8px' }}></i>
                                To send you important notifications about your account
                            </li>
                            <li style={styles.listItem}>
                                <i className="bi bi-check-circle" style={{ color: '#43a047', marginRight: '8px' }}></i>
                                To provide customer support when you need help
                            </li>
                            <li style={styles.listItem}>
                                <i className="bi bi-check-circle" style={{ color: '#43a047', marginRight: '8px' }}></i>
                                To improve our software based on how people use it
                            </li>
                            <li style={styles.listItem}>
                                <i className="bi bi-check-circle" style={{ color: '#43a047', marginRight: '8px' }}></i>
                                To keep your account secure and prevent unauthorized access
                            </li>
                        </ul>

                        {/* Data Sharing */}
                        <h2 style={styles.sectionTitle}>When We Share Your Information</h2>
                        <p style={styles.paragraph}>
                            We believe in keeping your data private. We only share your information in these limited cases:
                        </p>

                        <ul style={styles.list}>
                            <li style={styles.listItem}>
                                <strong>With Your Permission:</strong> We'll always ask before sharing your information for any reason 
                                not covered in this policy
                            </li>
                            <li style={styles.listItem}>
                                <strong>Service Providers:</strong> We work with trusted companies that help us operate our service 
                                (like hosting providers). They only access data needed for their specific tasks
                            </li>
                            <li style={styles.listItem}>
                                <strong>Legal Requirements:</strong> If legally required, we may share information to comply with the law
                            </li>
                        </ul>

                        <div style={styles.trustBadge} style={{ ...styles.trustBadge, backgroundColor: '#e3f2fd', borderLeftColor: '#1976d2' }}>
                            <i className="bi bi-check-circle-fill" style={{ fontSize: '1.5rem', color: '#1976d2' }}></i>
                            <div>
                                <strong style={{ color: '#0d47a1' }}>Your data stays yours</strong>
                                <p style={{ margin: '0', fontSize: '0.9rem', color: '#4a5568' }}>
                                    We never sell, rent, or trade your personal information with third parties
                                </p>
                            </div>
                        </div>

                        {/* Security */}
                        <h2 style={styles.sectionTitle}>How We Protect You</h2>
                        <p style={styles.paragraph}>
                            Your security is our priority. Here's how we keep your information safe:
                        </p>

                        <ul style={styles.list}>
                            <li style={styles.listItem}>
                                <i className="bi bi-lock" style={{ color: '#2a4d7a', marginRight: '8px' }}></i>
                                <strong>Encryption:</strong> All data is encrypted during transmission
                            </li>
                            <li style={styles.listItem}>
                                <i className="bi bi-shield" style={{ color: '#2a4d7a', marginRight: '8px' }}></i>
                                <strong>Secure Storage:</strong> Your data is stored in protected databases
                            </li>
                            <li style={styles.listItem}>
                                <i className="bi bi-key" style={{ color: '#2a4d7a', marginRight: '8px' }}></i>
                                <strong>Access Control:</strong> Only authorized personnel can access user data
                            </li>
                            <li style={styles.listItem}>
                                <i className="bi bi-check-circle" style={{ color: '#2a4d7a', marginRight: '8px' }}></i>
                                <strong>Regular Reviews:</strong> We constantly monitor and improve our security practices
                            </li>
                        </ul>

                        <p style={styles.paragraph}>
                            We recommend using a strong, unique password and enabling two-factor authentication for extra security.
                        </p>

                        {/* Your Rights */}
                        <h2 style={styles.sectionTitle}>Your Rights</h2>
                        <p style={styles.paragraph}>
                            You have complete control over your information:
                        </p>

                        <ul style={styles.list}>
                            <li style={styles.listItem}>
                                <i className="bi bi-eye" style={{ color: '#2a4d7a', marginRight: '8px' }}></i>
                                <strong>View:</strong> See what information we have about you
                            </li>
                            <li style={styles.listItem}>
                                <i className="bi bi-pencil" style={{ color: '#2a4d7a', marginRight: '8px' }}></i>
                                <strong>Update:</strong> Correct or change your information anytime
                            </li>
                            <li style={styles.listItem}>
                                <i className="bi bi-trash" style={{ color: '#2a4d7a', marginRight: '8px' }}></i>
                                <strong>Delete:</strong> Request permanent deletion of your account
                            </li>
                            <li style={styles.listItem}>
                                <i className="bi bi-envelope" style={{ color: '#2a4d7a', marginRight: '8px' }}></i>
                                <strong>Opt-out:</strong> Unsubscribe from any promotional emails
                            </li>
                        </ul>

                        <p style={styles.paragraph}>
                            To exercise any of these rights, simply contact us at the email below. We'll respond promptly.
                        </p>

                        {/* Data Retention */}
                        <h2 style={styles.sectionTitle}>How Long We Keep Your Data</h2>
                        <p style={styles.paragraph}>
                            We keep your information for as long as you have an active account. If you delete your account, 
                            we'll remove your personal information within 30 days.
                        </p>
                        <p style={styles.paragraph}>
                            We may retain some information if required by law, but we'll always let you know if that's the case.
                        </p>

                        {/* Children's Privacy */}
                        <h2 style={styles.sectionTitle}>Children's Privacy</h2>
                        <p style={styles.paragraph}>
                            Our software is for businesses and professionals. We do not knowingly collect information from children 
                            under 13. If you believe we have collected information from a child, please contact us immediately.
                        </p>

                        {/* Updates */}
                        <h2 style={styles.sectionTitle}>Changes to This Policy</h2>
                        <p style={styles.paragraph}>
                            We may update this policy occasionally. If we make significant changes, we'll notify you via email or 
                            through a notification in the software. We'll always keep the effective date at the bottom of this page updated.
                        </p>

                        {/* Contact */}
                        <h2 style={styles.sectionTitle}>Contact Us</h2>
                        <div style={styles.contactInfo}>
                            <p style={{ ...styles.paragraph, marginBottom: '0.5rem' }}>
                                <strong>Have questions or concerns?</strong> We're here to help!
                            </p>
                            <p style={{ ...styles.paragraph, marginBottom: '0.5rem' }}>
                                <i className="bi bi-envelope me-2"></i>
                                <strong>Email:</strong> <a href="mailto:privacy@yourbillingsoftware.com" style={{ color: '#2a4d7a' }}>privacy@yourbillingsoftware.com</a>
                            </p>
                            <p style={{ ...styles.paragraph, marginBottom: '0.5rem' }}>
                                <i className="bi bi-clock me-2"></i>
                                <strong>Response Time:</strong> We typically respond within 24-48 hours
                            </p>
                            <p style={{ ...styles.paragraph, marginBottom: '0' }}>
                                <i className="bi bi-shield-check me-2"></i>
                                <strong>Our Commitment:</strong> Your privacy is important to us, and we'll address any concerns you have
                            </p>
                        </div>

                        {/* Effective Date */}
                        <div style={styles.effectiveDate}>
                            <i className="bi bi-calendar3 me-2"></i>
                            Effective Date: <strong>1 January 2026</strong>
                        </div>

                        {/* Back Button */}
                        <div className="text-center mt-4">
                            <Link to="/auth/register" style={styles.backButton}>
                                <i className="bi bi-arrow-left me-2"></i>
                                Return to Register
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .bi { font-size: 1.1rem; }
                    .container { padding: 0 15px; }
                }
            `}</style>
        </div>
    );
};

export default PrivacyPolicy;