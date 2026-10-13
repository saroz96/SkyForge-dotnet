import React from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const WelcomePage = () => {
  // Styles matching the Akaunting-style layout
  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'stretch',
      backgroundColor: '#f8f9fa',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    heroPanel: {
      flex: '0 0 55%',
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
    formPanel: {
      flex: '1',
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
      marginBottom: '0.75rem',
      textAlign: 'center',
    },
    cardSubtitle: {
      color: '#718096',
      marginBottom: '2rem',
      fontSize: '0.95rem',
      textAlign: 'center',
    },
    logo: {
      width: '100px',
      height: '100px',
      margin: '0 auto 1rem',
      display: 'block',
      objectFit: 'contain',
    },
    buttonPrimary: {
      width: '100%',
      padding: '0.75rem',
      background: '#2a4d7a',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      textDecoration: 'none',
    },
    buttonPrimaryHover: {
      background: '#1e3a5f',
    },
    buttonOutline: {
      width: '100%',
      padding: '0.75rem',
      background: 'transparent',
      color: '#2a4d7a',
      border: '2px solid #2a4d7a',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      textDecoration: 'none',
    },
    buttonOutlineHover: {
      background: '#2a4d7a',
      color: '#fff',
    },
    footerText: {
      textAlign: 'center',
      marginTop: '2rem',
      paddingTop: '1.5rem',
      borderTop: '1px solid #e2e8f0',
      color: '#718096',
      fontSize: '0.85rem',
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
    '@media (max-width: 576px)': {
      heroTitle: {
        fontSize: '2rem',
      },
      featureGrid: {
        gridTemplateColumns: '1fr',
        gap: '12px',
      },
      cardTitle: {
        fontSize: '1.5rem',
      },
    },
  };

  return (
    <div style={styles.container}>
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
          <img
            src="/logo/logo.png"
            alt="Ams Logo"
            style={styles.logo}
          />
          <h2 style={styles.cardTitle}>Ams Software</h2>
          <p style={styles.cardSubtitle}>
            Get started by creating an account or logging in
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              to="/auth/register"
              style={styles.buttonPrimary}
              onMouseEnter={(e) => {
                e.target.style.background = styles.buttonPrimaryHover.background;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = styles.buttonPrimary.background;
              }}
            >
              <i className="bi bi-person-plus"></i>
              Create Account
            </Link>

            <Link
              to="/auth/login"
              style={styles.buttonOutline}
              onMouseEnter={(e) => {
                e.target.style.background = styles.buttonOutlineHover.background;
                e.target.style.color = styles.buttonOutlineHover.color;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#2a4d7a';
              }}
            >
              <i className="bi bi-box-arrow-in-right"></i>
              Sign In
            </Link>
          </div>

          <div style={styles.footerText}>
            <i className="bi bi-shield-check me-1"></i>
            Secure &nbsp;·&nbsp; 
            <i className="bi bi-clock-history me-1 ms-1"></i>
            24/7 Access &nbsp;·&nbsp;
            <i className="bi bi-graph-up-arrow me-1 ms-1"></i>
            Real-time Analytics
          </div>
        </div>
      </div>

      <style>{`
        a:hover {
          text-decoration: none !important;
        }
        @media (max-width: 992px) {
          .bi { font-size: 1.2rem; }
        }
      `}</style>
    </div>
  );
};

export default WelcomePage;

//---------------------------------------------------------------end1

// import React, { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap-icons/font/bootstrap-icons.css';

// const WelcomePage = () => {
//   // ---------- COLORS (kept identical to original) ----------
//   const colors = {
//     darkBlue: '#1e3a5f',
//     midBlue: '#2a4d7a',
//     lightBg: '#f8f9fa',
//     white: '#ffffff',
//     textDark: '#1a202c',
//     textMuted: '#718096',
//     borderLight: '#e2e8f0',
//     green: '#16a34a',
//     amber: '#f59e0b',
//     red: '#dc2626',
//     softBlue: '#eef4fb',
//   };

//   // ---------- STATE ----------
//   const [scrolled, setScrolled] = useState(false);
//   const [activeTestimonial, setActiveTestimonial] = useState(0);
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
//   const [openFaq, setOpenFaq] = useState(0);
//   const [hoveredCard, setHoveredCard] = useState(null);

//   // ---------- SCROLL EFFECT ----------
//   useEffect(() => {
//     const onScroll = () => setScrolled(window.scrollY > 20);
//     window.addEventListener('scroll', onScroll);
//     return () => window.removeEventListener('scroll', onScroll);
//   }, []);

//   // ---------- AUTO-ROTATE TESTIMONIALS ----------
//   useEffect(() => {
//     const t = setInterval(
//       () => setActiveTestimonial((p) => (p + 1) % testimonials.length),
//       6000
//     );
//     return () => clearInterval(t);
//   }, []);

//   // ---------- DATA ----------
//   const navItems = [
//     { label: 'Features', href: '#features' },
//     { label: 'Solutions', href: '#solutions' },
//     { label: 'Pricing', href: '#pricing' },
//     { label: 'Resources', href: '#resources' },
//   ];

//   const heroFeatures = [
//     { icon: 'bi-diagram-3', label: 'Double-Entry' },
//     { icon: 'bi-box-seam', label: 'Inventory' },
//     { icon: 'bi-kanban', label: 'Projects' },
//     { icon: 'bi-people', label: 'CRM' },
//     { icon: 'bi-wallet2', label: 'Payroll' },
//     { icon: 'bi-receipt', label: 'Expense Claims' },
//   ];

//   const trustedBy = ['Acme Corp', 'Northwind', 'Globex', 'Initech', 'Umbrella'];

//   const coreFeatures = [
//     {
//       icon: 'bi-receipt-cutoff',
//       title: 'Smart Invoicing',
//       desc: 'Create, send, and track professional invoices with automatic reminders and multi-currency support.',
//     },
//     {
//       icon: 'bi-graph-up-arrow',
//       title: 'Real-time Reports',
//       desc: 'Profit & loss, balance sheet, cash flow, and tax reports — updated the moment you record a transaction.',
//     },
//     {
//       icon: 'bi-diagram-3',
//       title: 'Double-Entry Ledger',
//       desc: 'GAAP-compliant chart of accounts with journals, ledgers, and trial balance. Automatic reconciliation.',
//     },
//     {
//       icon: 'bi-box-seam',
//       title: 'Inventory Tracking',
//       desc: 'Track stock levels, cost of goods sold, and reorder points across multiple warehouses.',
//     },
//     {
//       icon: 'bi-people',
//       title: 'CRM & Contacts',
//       desc: 'Manage customers, vendors, and leads. Link every transaction to a contact for full traceability.',
//     },
//     {
//       icon: 'bi-shield-lock',
//       title: 'Bank-Grade Security',
//       desc: 'AES-256 encryption, 2FA, granular roles, and audit trails. SOC 2 & GDPR compliant.',
//     },
//     {
//       icon: 'bi-phone',
//       title: 'Mobile App',
//       desc: 'Manage your books on iOS and Android. Scan receipts, approve expenses, and send invoices on the go.',
//     },
//     {
//       icon: 'bi-plug',
//       title: 'Integrations',
//       desc: 'Connect with Stripe, PayPal, Shopify, WooCommerce, Slack, and 40+ other business tools.',
//     },
//   ];

//   const workflow = [
//     { icon: 'bi-person-plus', title: 'Create Account', desc: 'Sign up in 30 seconds — no credit card required.' },
//     { icon: 'bi-sliders', title: 'Set Up Company', desc: 'Choose your chart of accounts and tax settings.' },
//     { icon: 'bi-arrow-left-right', title: 'Record Transactions', desc: 'Invoices, bills, payments — all in one place.' },
//     { icon: 'bi-bar-chart-line', title: 'Grow with Insights', desc: 'Get real-time reports and make smarter decisions.' },
//   ];

//   const pricingPlans = [
//     {
//       name: 'Starter',
//       price: '$0',
//       period: '/month',
//       desc: 'For freelancers and sole traders',
//       features: ['1 user', '50 invoices/month', 'Basic reports', 'Email support'],
//       cta: 'Start Free',
//       popular: false,
//     },
//     {
//       name: 'Professional',
//       price: '$29',
//       period: '/month',
//       desc: 'For growing small businesses',
//       features: ['5 users', 'Unlimited invoices', 'Full reports', 'Payroll add-on', 'Priority support'],
//       cta: 'Start Free Trial',
//       popular: true,
//     },
//     {
//       name: 'Enterprise',
//       price: '$89',
//       period: '/month',
//       desc: 'For established teams & firms',
//       features: ['Unlimited users', 'Multi-company', 'Custom roles', 'API access', 'Dedicated manager'],
//       cta: 'Contact Sales',
//       popular: false,
//     },
//   ];

//   const testimonials = [
//     {
//       quote: 'AMS replaced three separate tools for us. Invoicing, payroll, and inventory finally live in one place. Our month-end close went from 5 days to half a day.',
//       name: 'Sarah Chen',
//       role: 'CFO, Northwind Traders',
//       initials: 'SC',
//     },
//     {
//       quote: 'The double-entry ledger is rock solid. As a CPA I have very high standards — AMS is the first cloud app I trust with client books.',
//       name: 'Michael Okafor',
//       role: 'Managing Partner, Okafor & Co.',
//       initials: 'MO',
//     },
//     {
//       quote: 'We scaled from 2 to 40 employees without changing our accounting stack. The multi-currency and payroll features are lifesavers.',
//       name: 'Priya Sharma',
//       role: 'Founder, Globex Retail',
//       initials: 'PS',
//     },
//   ];

//   const faqs = [
//     {
//       q: 'Is AMS suitable for my small business?',
//       a: 'Absolutely. The Starter plan is free forever and covers invoicing, basic reports, and up to 50 invoices per month. As you grow, upgrade seamlessly — your data stays intact.',
//     },
//     {
//       q: 'Can I migrate from QuickBooks or Xero?',
//       a: 'Yes. We provide a one-click import tool for QuickBooks, Xero, Wave, and CSV files. Our support team will help you migrate your chart of accounts, contacts, and historical transactions for free.',
//     },
//     {
//       q: 'Is my financial data secure?',
//       a: 'We use bank-grade AES-256 encryption at rest, TLS 1.3 in transit, SOC 2 Type II certification, GDPR compliance, and optional two-factor authentication. You can also export everything at any time.',
//     },
//     {
//       q: 'Do you offer multi-currency accounting?',
//       a: 'Yes. AMS supports 160+ currencies with automatic exchange rate updates. You can invoice in one currency, receive payment in another, and track realized/unrealized gains.',
//     },
//     {
//       q: 'Can my accountant access my books?',
//       a: 'Of course. Invite your accountant as an "Accountant" user — they get read/write access to the ledger but cannot change billing or delete the company.',
//     },
//   ];

//   const footerCols = [
//     { heading: 'Product', links: ['Features', 'Pricing', 'Integrations', 'Mobile App', 'Changelog'] },
//     { heading: 'Solutions', links: ['For Freelancers', 'For Retail', 'For Agencies', 'For Nonprofits', 'For Accountants'] },
//     { heading: 'Company', links: ['About Us', 'Careers', 'Blog', 'Press Kit', 'Partners'] },
//     { heading: 'Support', links: ['Help Center', 'Documentation', 'API Reference', 'Community', 'Status'] },
//   ];

//   // ---------- STYLES ----------
//   const styles = {
//     page: {
//       minHeight: '100vh',
//       backgroundColor: colors.white,
//       fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
//       color: colors.textDark,
//       overflowX: 'hidden',
//     },

//     // ---------- NAVBAR ----------
//     navbar: {
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       padding: scrolled ? '12px 50px' : '18px 50px',
//       backgroundColor: 'rgba(255,255,255,0.95)',
//       backdropFilter: 'blur(12px)',
//       borderBottom: scrolled ? `1px solid ${colors.borderLight}` : '1px solid transparent',
//       position: 'fixed',
//       top: 0,
//       left: 0,
//       right: 0,
//       zIndex: 1000,
//       transition: 'all 0.25s ease',
//       boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.05)' : 'none',
//     },
//     navBrand: {
//       display: 'flex',
//       alignItems: 'center',
//       gap: '10px',
//       textDecoration: 'none',
//       color: colors.textDark,
//     },
//     navBrandIcon: {
//       width: '38px',
//       height: '38px',
//       borderRadius: '9px',
//       background: `linear-gradient(145deg, ${colors.darkBlue} 0%, ${colors.midBlue} 100%)`,
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       color: '#fff',
//       fontSize: '1.15rem',
//     },
//     navBrandText: {
//       fontSize: '1.15rem',
//       fontWeight: '700',
//       color: colors.textDark,
//       lineHeight: 1.1,
//     },
//     navBrandSub: {
//       fontSize: '0.68rem',
//       color: colors.textMuted,
//       fontWeight: '500',
//       letterSpacing: '0.6px',
//       textTransform: 'uppercase',
//     },
//     navLinks: {
//       display: 'flex',
//       alignItems: 'center',
//       gap: '32px',
//     },
//     navLink: {
//       color: colors.textDark,
//       fontSize: '0.92rem',
//       fontWeight: '500',
//       textDecoration: 'none',
//       cursor: 'pointer',
//       transition: 'color 0.2s',
//     },
//     navActions: {
//       display: 'flex',
//       alignItems: 'center',
//       gap: '10px',
//     },
//     navLogin: {
//       color: colors.midBlue,
//       fontSize: '0.92rem',
//       fontWeight: '600',
//       textDecoration: 'none',
//       padding: '9px 16px',
//       borderRadius: '8px',
//       transition: 'background 0.2s',
//     },
//     navSignup: {
//       background: colors.midBlue,
//       color: '#fff',
//       fontSize: '0.92rem',
//       fontWeight: '600',
//       textDecoration: 'none',
//       padding: '10px 20px',
//       borderRadius: '8px',
//       transition: 'background 0.2s',
//       display: 'inline-flex',
//       alignItems: 'center',
//       gap: '7px',
//       boxShadow: '0 4px 12px rgba(42,77,122,0.25)',
//     },
//     mobileMenuBtn: {
//       display: 'none',
//       background: 'none',
//       border: 'none',
//       fontSize: '1.5rem',
//       color: colors.textDark,
//       cursor: 'pointer',
//     },
//     mobileMenu: {
//       position: 'fixed',
//       top: '68px',
//       left: 0,
//       right: 0,
//       background: '#fff',
//       borderBottom: `1px solid ${colors.borderLight}`,
//       padding: '20px 24px',
//       display: mobileMenuOpen ? 'flex' : 'none',
//       flexDirection: 'column',
//       gap: '16px',
//       zIndex: 999,
//       boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
//     },

//     // ---------- HERO ----------
//     hero: {
//       paddingTop: '140px',
//       paddingBottom: '80px',
//       paddingLeft: '50px',
//       paddingRight: '50px',
//       background: `linear-gradient(180deg, ${colors.softBlue} 0%, ${colors.white} 100%)`,
//       position: 'relative',
//       overflow: 'hidden',
//     },
//     heroInner: {
//       maxWidth: '1200px',
//       margin: '0 auto',
//       display: 'grid',
//       gridTemplateColumns: '1.1fr 0.9fr',
//       gap: '60px',
//       alignItems: 'center',
//     },
//     heroBadge: {
//       display: 'inline-flex',
//       alignItems: 'center',
//       gap: '8px',
//       background: 'rgba(42,77,122,0.08)',
//       color: colors.midBlue,
//       padding: '7px 16px',
//       borderRadius: '50px',
//       fontSize: '0.8rem',
//       fontWeight: '600',
//       marginBottom: '1.5rem',
//       width: 'fit-content',
//     },
//     heroTitle: {
//       fontSize: '3.4rem',
//       fontWeight: '800',
//       marginBottom: '1.25rem',
//       lineHeight: '1.1',
//       color: colors.textDark,
//       letterSpacing: '-0.02em',
//     },
//     heroHighlight: {
//       background: `linear-gradient(145deg, ${colors.darkBlue} 0%, ${colors.midBlue} 100%)`,
//       WebkitBackgroundClip: 'text',
//       WebkitTextFillColor: 'transparent',
//       backgroundClip: 'text',
//     },
//     heroSubtitle: {
//       fontSize: '1.15rem',
//       color: colors.textMuted,
//       marginBottom: '2.25rem',
//       lineHeight: '1.6',
//       maxWidth: '540px',
//     },
//     heroButtons: {
//       display: 'flex',
//       gap: '14px',
//       marginBottom: '2rem',
//       flexWrap: 'wrap',
//     },
//     btnPrimary: {
//       background: colors.midBlue,
//       color: '#fff',
//       padding: '14px 28px',
//       borderRadius: '10px',
//       fontSize: '0.98rem',
//       fontWeight: '600',
//       textDecoration: 'none',
//       display: 'inline-flex',
//       alignItems: 'center',
//       gap: '9px',
//       transition: 'all 0.2s',
//       boxShadow: '0 6px 18px rgba(42,77,122,0.28)',
//       border: 'none',
//       cursor: 'pointer',
//     },
//     btnSecondary: {
//       background: '#fff',
//       color: colors.textDark,
//       padding: '14px 28px',
//       borderRadius: '10px',
//       fontSize: '0.98rem',
//       fontWeight: '600',
//       textDecoration: 'none',
//       display: 'inline-flex',
//       alignItems: 'center',
//       gap: '9px',
//       transition: 'all 0.2s',
//       border: `1px solid ${colors.borderLight}`,
//       cursor: 'pointer',
//     },
//     heroTrust: {
//       display: 'flex',
//       alignItems: 'center',
//       gap: '20px',
//       fontSize: '0.85rem',
//       color: colors.textMuted,
//       flexWrap: 'wrap',
//     },
//     heroTrustItem: {
//       display: 'inline-flex',
//       alignItems: 'center',
//       gap: '6px',
//     },
//     heroTrustDot: {
//       color: colors.green,
//       fontSize: '0.9rem',
//     },

//     // Hero mockup (invoice card)
//     heroMockupWrapper: {
//       position: 'relative',
//       display: 'flex',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     heroMockup: {
//       background: '#fff',
//       borderRadius: '16px',
//       boxShadow: '0 25px 60px rgba(30,58,95,0.18), 0 8px 20px rgba(30,58,95,0.08)',
//       padding: '26px',
//       width: '100%',
//       maxWidth: '440px',
//       border: `1px solid ${colors.borderLight}`,
//       position: 'relative',
//       zIndex: 2,
//     },
//     mockupHeader: {
//       display: 'flex',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: '22px',
//       paddingBottom: '18px',
//       borderBottom: `1px solid ${colors.borderLight}`,
//     },
//     mockupTitle: {
//       fontSize: '1rem',
//       fontWeight: '700',
//       color: colors.textDark,
//     },
//     mockupStatus: {
//       fontSize: '0.72rem',
//       fontWeight: '600',
//       color: colors.green,
//       background: 'rgba(22,163,74,0.1)',
//       padding: '5px 10px',
//       borderRadius: '50px',
//     },
//     mockupRow: {
//       display: 'flex',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       padding: '12px 0',
//       borderBottom: `1px dashed ${colors.borderLight}`,
//     },
//     mockupRowLabel: {
//       fontSize: '0.85rem',
//       color: colors.textMuted,
//       fontWeight: '500',
//     },
//     mockupRowValue: {
//       fontSize: '0.9rem',
//       fontWeight: '600',
//       color: colors.textDark,
//     },
//     mockupTotal: {
//       display: 'flex',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       padding: '16px 0 0',
//       marginTop: '8px',
//     },
//     mockupTotalLabel: {
//       fontSize: '0.95rem',
//       fontWeight: '700',
//       color: colors.textDark,
//     },
//     mockupTotalValue: {
//       fontSize: '1.3rem',
//       fontWeight: '800',
//       color: colors.midBlue,
//     },
//     mockupBadge: {
//       position: 'absolute',
//       background: '#fff',
//       borderRadius: '12px',
//       padding: '12px 16px',
//       boxShadow: '0 12px 30px rgba(30,58,95,0.15)',
//       display: 'flex',
//       alignItems: 'center',
//       gap: '10px',
//       zIndex: 3,
//       border: `1px solid ${colors.borderLight}`,
//     },
//     mockupBadgeIcon: {
//       width: '36px',
//       height: '36px',
//       borderRadius: '9px',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       color: '#fff',
//       fontSize: '1rem',
//     },
//     mockupBadgeLabel: {
//       fontSize: '0.7rem',
//       color: colors.textMuted,
//       fontWeight: '500',
//       lineHeight: 1.2,
//     },
//     mockupBadgeValue: {
//       fontSize: '0.95rem',
//       fontWeight: '700',
//       color: colors.textDark,
//       lineHeight: 1.2,
//     },

//     // ---------- TRUSTED BY ----------
//     trustedBy: {
//       padding: '45px 50px',
//       background: '#fff',
//       borderTop: `1px solid ${colors.borderLight}`,
//       borderBottom: `1px solid ${colors.borderLight}`,
//     },
//     trustedByInner: {
//       maxWidth: '1200px',
//       margin: '0 auto',
//       display: 'flex',
//       flexDirection: 'column',
//       alignItems: 'center',
//       gap: '25px',
//     },
//     trustedByLabel: {
//       fontSize: '0.78rem',
//       color: colors.textMuted,
//       fontWeight: '600',
//       letterSpacing: '1.5px',
//       textTransform: 'uppercase',
//     },
//     trustedByLogos: {
//       display: 'flex',
//       flexWrap: 'wrap',
//       justifyContent: 'center',
//       alignItems: 'center',
//       gap: '50px',
//     },
//     trustedByLogo: {
//       fontSize: '1.3rem',
//       fontWeight: '700',
//       color: '#cbd5e0',
//       letterSpacing: '-0.02em',
//       transition: 'color 0.25s',
//       cursor: 'default',
//     },

//     // ---------- SECTION SHARED ----------
//     section: {
//       padding: '90px 50px',
//     },
//     sectionAlt: {
//       padding: '90px 50px',
//       background: colors.lightBg,
//     },
//     sectionInner: {
//       maxWidth: '1200px',
//       margin: '0 auto',
//     },
//     sectionTag: {
//       display: 'inline-block',
//       color: colors.midBlue,
//       fontSize: '0.8rem',
//       fontWeight: '700',
//       letterSpacing: '1.5px',
//       textTransform: 'uppercase',
//       marginBottom: '12px',
//     },
//     sectionTitle: {
//       fontSize: '2.4rem',
//       fontWeight: '800',
//       color: colors.textDark,
//       marginBottom: '1rem',
//       lineHeight: '1.2',
//       letterSpacing: '-0.02em',
//       maxWidth: '720px',
//     },
//     sectionSub: {
//       fontSize: '1.05rem',
//       color: colors.textMuted,
//       marginBottom: '3.5rem',
//       lineHeight: 1.6,
//       maxWidth: '620px',
//     },
//     sectionHeaderCenter: {
//       textAlign: 'center',
//       display: 'flex',
//       flexDirection: 'column',
//       alignItems: 'center',
//     },

//     // ---------- FEATURES GRID ----------
//     featuresGrid: {
//       display: 'grid',
//       gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
//       gap: '22px',
//     },
//     featureCard: {
//       padding: '30px 26px',
//       borderRadius: '14px',
//       background: '#fff',
//       border: `1px solid ${colors.borderLight}`,
//       transition: 'all 0.25s ease',
//       cursor: 'default',
//     },
//     featureCardHover: {
//       transform: 'translateY(-4px)',
//       boxShadow: '0 12px 32px rgba(30,58,95,0.1)',
//       borderColor: 'rgba(42,77,122,0.25)',
//     },
//     featureCardIcon: {
//       width: '48px',
//       height: '48px',
//       borderRadius: '11px',
//       background: `linear-gradient(145deg, ${colors.darkBlue} 0%, ${colors.midBlue} 100%)`,
//       color: '#fff',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       fontSize: '1.3rem',
//       marginBottom: '18px',
//     },
//     featureCardTitle: {
//       fontSize: '1.05rem',
//       fontWeight: '700',
//       color: colors.textDark,
//       marginBottom: '8px',
//     },
//     featureCardDesc: {
//       fontSize: '0.9rem',
//       color: colors.textMuted,
//       lineHeight: 1.6,
//     },

//     // ---------- WORKFLOW ----------
//     workflowGrid: {
//       display: 'grid',
//       gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
//       gap: '24px',
//       position: 'relative',
//     },
//     workflowStep: {
//       textAlign: 'center',
//       padding: '20px',
//       position: 'relative',
//     },
//     workflowNumber: {
//       position: 'absolute',
//       top: 0,
//       left: '50%',
//       transform: 'translateX(-50%)',
//       width: '32px',
//       height: '32px',
//       borderRadius: '50%',
//       background: colors.midBlue,
//       color: '#fff',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       fontSize: '0.85rem',
//       fontWeight: '700',
//       zIndex: 2,
//     },
//     workflowIcon: {
//       width: '76px',
//       height: '76px',
//       borderRadius: '20px',
//       background: '#fff',
//       border: `2px solid ${colors.borderLight}`,
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       fontSize: '1.8rem',
//       color: colors.midBlue,
//       margin: '24px auto 18px',
//     },
//     workflowTitle: {
//       fontSize: '1.05rem',
//       fontWeight: '700',
//       color: colors.textDark,
//       marginBottom: '8px',
//     },
//     workflowDesc: {
//       fontSize: '0.88rem',
//       color: colors.textMuted,
//       lineHeight: 1.55,
//       maxWidth: '240px',
//       margin: '0 auto',
//     },

//     // ---------- PRICING ----------
//     pricingGrid: {
//       display: 'grid',
//       gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
//       gap: '24px',
//       alignItems: 'stretch',
//     },
//     pricingCard: {
//       background: '#fff',
//       borderRadius: '16px',
//       padding: '32px 28px',
//       border: `1px solid ${colors.borderLight}`,
//       display: 'flex',
//       flexDirection: 'column',
//       position: 'relative',
//       transition: 'all 0.25s',
//     },
//     pricingCardPopular: {
//       border: `2px solid ${colors.midBlue}`,
//       boxShadow: '0 20px 50px rgba(42,77,122,0.15)',
//       transform: 'scale(1.03)',
//     },
//     pricingPopularBadge: {
//       position: 'absolute',
//       top: '-13px',
//       left: '50%',
//       transform: 'translateX(-50%)',
//       background: colors.midBlue,
//       color: '#fff',
//       fontSize: '0.72rem',
//       fontWeight: '700',
//       padding: '5px 14px',
//       borderRadius: '50px',
//       letterSpacing: '0.5px',
//       textTransform: 'uppercase',
//     },
//     pricingName: {
//       fontSize: '1.05rem',
//       fontWeight: '700',
//       color: colors.textDark,
//       marginBottom: '6px',
//     },
//     pricingDesc: {
//       fontSize: '0.85rem',
//       color: colors.textMuted,
//       marginBottom: '20px',
//     },
//     pricingPrice: {
//       display: 'flex',
//       alignItems: 'baseline',
//       gap: '4px',
//       marginBottom: '24px',
//     },
//     pricingAmount: {
//       fontSize: '2.6rem',
//       fontWeight: '800',
//       color: colors.textDark,
//       lineHeight: 1,
//     },
//     pricingPeriod: {
//       fontSize: '0.9rem',
//       color: colors.textMuted,
//       fontWeight: '500',
//     },
//     pricingFeatures: {
//       listStyle: 'none',
//       padding: 0,
//       margin: '0 0 28px',
//       display: 'flex',
//       flexDirection: 'column',
//       gap: '12px',
//       flex: 1,
//     },
//     pricingFeatureItem: {
//       fontSize: '0.88rem',
//       color: colors.textDark,
//       display: 'flex',
//       alignItems: 'center',
//       gap: '10px',
//     },
//     pricingCheck: {
//       color: colors.green,
//       fontSize: '1rem',
//       flexShrink: 0,
//     },
//     pricingCta: {
//       width: '100%',
//       padding: '13px',
//       borderRadius: '9px',
//       fontSize: '0.95rem',
//       fontWeight: '600',
//       textAlign: 'center',
//       textDecoration: 'none',
//       transition: 'all 0.2s',
//       display: 'block',
//       cursor: 'pointer',
//       border: 'none',
//     },

//     // ---------- TESTIMONIALS ----------
//     testimonialCard: {
//       background: '#fff',
//       borderRadius: '20px',
//       padding: '50px 45px',
//       maxWidth: '820px',
//       margin: '0 auto',
//       border: `1px solid ${colors.borderLight}`,
//       boxShadow: '0 20px 50px rgba(30,58,95,0.08)',
//       position: 'relative',
//     },
//     testimonialQuote: {
//       fontSize: '1.15rem',
//       color: colors.textDark,
//       lineHeight: 1.7,
//       marginBottom: '30px',
//       fontStyle: 'italic',
//       fontWeight: '500',
//     },
//     testimonialAuthor: {
//       display: 'flex',
//       alignItems: 'center',
//       gap: '16px',
//     },
//     testimonialAvatar: {
//       width: '52px',
//       height: '52px',
//       borderRadius: '50%',
//       background: `linear-gradient(145deg, ${colors.darkBlue} 0%, ${colors.midBlue} 100%)`,
//       color: '#fff',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       fontSize: '1.1rem',
//       fontWeight: '700',
//     },
//     testimonialName: {
//       fontSize: '0.98rem',
//       fontWeight: '700',
//       color: colors.textDark,
//       marginBottom: '3px',
//     },
//     testimonialRole: {
//       fontSize: '0.85rem',
//       color: colors.textMuted,
//     },
//     testimonialDots: {
//       display: 'flex',
//       justifyContent: 'center',
//       gap: '8px',
//       marginTop: '30px',
//     },
//     testimonialDot: {
//       width: '8px',
//       height: '8px',
//       borderRadius: '50%',
//       background: colors.borderLight,
//       border: 'none',
//       cursor: 'pointer',
//       transition: 'all 0.2s',
//       padding: 0,
//     },
//     testimonialDotActive: {
//       background: colors.midBlue,
//       width: '24px',
//       borderRadius: '4px',
//     },

//     // ---------- FAQ ----------
//     faqList: {
//       maxWidth: '780px',
//       margin: '0 auto',
//       display: 'flex',
//       flexDirection: 'column',
//       gap: '12px',
//     },
//     faqItem: {
//       background: '#fff',
//       border: `1px solid ${colors.borderLight}`,
//       borderRadius: '12px',
//       overflow: 'hidden',
//       transition: 'all 0.2s',
//       cursor: 'pointer',
//     },
//     faqItemOpen: {
//       borderColor: 'rgba(42,77,122,0.35)',
//       boxShadow: '0 6px 20px rgba(42,77,122,0.08)',
//     },
//     faqQuestion: {
//       display: 'flex',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       padding: '20px 24px',
//       fontSize: '0.98rem',
//       fontWeight: '600',
//       color: colors.textDark,
//       gap: '16px',
//     },
//     faqIcon: {
//       fontSize: '1.1rem',
//       color: colors.midBlue,
//       flexShrink: 0,
//       transition: 'transform 0.25s',
//     },
//     faqAnswer: {
//       padding: '0 24px 22px',
//       fontSize: '0.92rem',
//       color: colors.textMuted,
//       lineHeight: 1.65,
//     },

//     // ---------- CTA ----------
//     ctaSection: {
//       padding: '80px 50px',
//       background: `linear-gradient(145deg, ${colors.darkBlue} 0%, ${colors.midBlue} 100%)`,
//       textAlign: 'center',
//     },
//     ctaTitle: {
//       fontSize: '2.4rem',
//       fontWeight: '800',
//       color: '#fff',
//       marginBottom: '1rem',
//       letterSpacing: '-0.02em',
//     },
//     ctaSub: {
//       fontSize: '1.05rem',
//       color: 'rgba(255,255,255,0.8)',
//       marginBottom: '2.5rem',
//       maxWidth: '540px',
//       marginLeft: 'auto',
//       marginRight: 'auto',
//       lineHeight: 1.6,
//     },
//     ctaButtons: {
//       display: 'flex',
//       gap: '14px',
//       justifyContent: 'center',
//       flexWrap: 'wrap',
//     },
//     ctaBtnWhite: {
//       background: '#fff',
//       color: colors.midBlue,
//       padding: '15px 32px',
//       borderRadius: '10px',
//       fontSize: '1rem',
//       fontWeight: '700',
//       textDecoration: 'none',
//       display: 'inline-flex',
//       alignItems: 'center',
//       gap: '9px',
//       boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
//       border: 'none',
//       cursor: 'pointer',
//     },
//     ctaBtnOutline: {
//       background: 'transparent',
//       color: '#fff',
//       padding: '15px 32px',
//       borderRadius: '10px',
//       fontSize: '1rem',
//       fontWeight: '600',
//       textDecoration: 'none',
//       display: 'inline-flex',
//       alignItems: 'center',
//       gap: '9px',
//       border: '1.5px solid rgba(255,255,255,0.4)',
//       cursor: 'pointer',
//     },

//     // ---------- FOOTER ----------
//     footer: {
//       background: '#0f1e30',
//       color: '#fff',
//       padding: '60px 50px 25px',
//     },
//     footerGrid: {
//       display: 'grid',
//       gridTemplateColumns: '1.5fr repeat(4, 1fr)',
//       gap: '40px',
//       maxWidth: '1200px',
//       margin: '0 auto 40px',
//     },
//     footerBrand: {
//       fontSize: '1.2rem',
//       fontWeight: '700',
//       marginBottom: '14px',
//       display: 'flex',
//       alignItems: 'center',
//       gap: '9px',
//     },
//     footerBrandIcon: {
//       width: '34px',
//       height: '34px',
//       borderRadius: '8px',
//       background: `linear-gradient(145deg, ${colors.darkBlue} 0%, ${colors.midBlue} 100%)`,
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       fontSize: '0.95rem',
//     },
//     footerDesc: {
//       fontSize: '0.87rem',
//       opacity: 0.6,
//       lineHeight: 1.7,
//       maxWidth: '300px',
//       marginBottom: '20px',
//     },
//     footerSocial: {
//       display: 'flex',
//       gap: '12px',
//       fontSize: '1rem',
//     },
//     footerSocialLink: {
//       width: '36px',
//       height: '36px',
//       borderRadius: '9px',
//       background: 'rgba(255,255,255,0.06)',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       color: 'rgba(255,255,255,0.7)',
//       textDecoration: 'none',
//       transition: 'all 0.2s',
//     },
//     footerHeading: {
//       fontSize: '0.85rem',
//       fontWeight: '700',
//       marginBottom: '16px',
//       letterSpacing: '0.8px',
//       textTransform: 'uppercase',
//       color: 'rgba(255,255,255,0.95)',
//     },
//     footerList: {
//       listStyle: 'none',
//       padding: 0,
//       margin: 0,
//       display: 'flex',
//       flexDirection: 'column',
//       gap: '11px',
//     },
//     footerLink: {
//       color: 'rgba(255,255,255,0.6)',
//       fontSize: '0.87rem',
//       textDecoration: 'none',
//       transition: 'color 0.2s',
//       cursor: 'pointer',
//     },
//     footerBottom: {
//       borderTop: '1px solid rgba(255,255,255,0.08)',
//       paddingTop: '24px',
//       display: 'flex',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       gap: '12px',
//       maxWidth: '1200px',
//       margin: '0 auto',
//       fontSize: '0.82rem',
//       color: 'rgba(255,255,255,0.5)',
//     },
//     footerBottomLinks: {
//       display: 'flex',
//       gap: '20px',
//       flexWrap: 'wrap',
//     },
//   };

//   // ---------- RENDER ----------
//   return (
//     <div style={styles.page}>
//       {/* ==================== NAVBAR ==================== */}
//       <nav style={styles.navbar}>
//         <Link to="/" style={styles.navBrand}>
//           <span style={styles.navBrandIcon}>
//             <i className="bi bi-calculator"></i>
//           </span>
//           <span>
//             <span style={styles.navBrandText}>AMS Software</span>
//             <br />
//             <span style={styles.navBrandSub}>Accounting Suite</span>
//           </span>
//         </Link>

//         <div style={styles.navLinks} className="ams-nav-links">
//           {navItems.map((item) => (
//             <a
//               key={item.label}
//               href={item.href}
//               style={styles.navLink}
//               onMouseEnter={(e) => (e.target.style.color = colors.midBlue)}
//               onMouseLeave={(e) => (e.target.style.color = colors.textDark)}
//             >
//               {item.label}
//             </a>
//           ))}
//         </div>

//         <div style={styles.navActions} className="ams-nav-actions">
//           <Link
//             to="/auth/login"
//             style={styles.navLogin}
//             onMouseEnter={(e) => (e.target.style.background = colors.softBlue)}
//             onMouseLeave={(e) => (e.target.style.background = 'transparent')}
//           >
//             Log in
//           </Link>
//           <Link
//             to="/auth/register"
//             style={styles.navSignup}
//             onMouseEnter={(e) => (e.target.style.background = colors.darkBlue)}
//             onMouseLeave={(e) => (e.target.style.background = colors.midBlue)}
//           >
//             <i className="bi bi-person-plus"></i>
//             Get Started Free
//           </Link>
//         </div>

//         <button
//           style={styles.mobileMenuBtn}
//           className="ams-mobile-btn"
//           onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
//           aria-label="Toggle menu"
//         >
//           <i className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
//         </button>
//       </nav>

//       {/* Mobile menu */}
//       <div style={styles.mobileMenu}>
//         {navItems.map((item) => (
//           <a
//             key={item.label}
//             href={item.href}
//             style={styles.navLink}
//             onClick={() => setMobileMenuOpen(false)}
//           >
//             {item.label}
//           </a>
//         ))}
//         <Link to="/auth/login" style={styles.navLogin}>
//           Log in
//         </Link>
//         <Link to="/auth/register" style={styles.navSignup}>
//           <i className="bi bi-person-plus"></i>
//           Get Started Free
//         </Link>
//       </div>

//       {/* ==================== HERO ==================== */}
//       <section style={styles.hero}>
//         <div style={styles.heroInner}>
//           {/* Left: copy */}
//           <div>
//             <span style={styles.heroBadge}>
//               <i className="bi bi-stars"></i>
//               Trusted by 10,000+ businesses worldwide
//             </span>

//             <h1 style={styles.heroTitle}>
//               Billing & accounting,
//               <br />
//               <span style={styles.heroHighlight}>simplified for teams.</span>
//             </h1>

//             <p style={styles.heroSubtitle}>
//               Send invoices, track expenses, run payroll, and close your books
//               in record time. AMS is the all-in-one accounting platform built
//               for modern businesses.
//             </p>

//             <div style={styles.heroButtons}>
//               <Link
//                 to="/auth/register"
//                 style={styles.btnPrimary}
//                 onMouseEnter={(e) => (e.target.style.background = colors.darkBlue)}
//                 onMouseLeave={(e) => (e.target.style.background = colors.midBlue)}
//               >
//                 Start Free Trial
//                 <i className="bi bi-arrow-right"></i>
//               </Link>
//               <a
//                 href="#demo"
//                 style={styles.btnSecondary}
//                 onMouseEnter={(e) => {
//                   e.target.style.borderColor = colors.midBlue;
//                   e.target.style.color = colors.midBlue;
//                 }}
//                 onMouseLeave={(e) => {
//                   e.target.style.borderColor = colors.borderLight;
//                   e.target.style.color = colors.textDark;
//                 }}
//               >
//                 <i className="bi bi-play-circle"></i>
//                 Watch Demo
//               </a>
//             </div>

//             <div style={styles.heroTrust}>
//               <span style={styles.heroTrustItem}>
//                 <i className="bi bi-check-circle-fill" style={styles.heroTrustDot}></i>
//                 No credit card required
//               </span>
//               <span style={styles.heroTrustItem}>
//                 <i className="bi bi-check-circle-fill" style={styles.heroTrustDot}></i>
//                 Free 14-day trial
//               </span>
//               <span style={styles.heroTrustItem}>
//                 <i className="bi bi-check-circle-fill" style={styles.heroTrustDot}></i>
//                 Cancel anytime
//               </span>
//             </div>
//           </div>

//           {/* Right: invoice mockup */}
//           <div style={styles.heroMockupWrapper}>
//             {/* Floating badge — top left */}
//             <div
//               style={{
//                 ...styles.mockupBadge,
//                 top: '10px',
//                 left: '-30px',
//               }}
//               className="ams-float-badge"
//             >
//               <div
//                 style={{
//                   ...styles.mockupBadgeIcon,
//                   background: 'rgba(22,163,74,0.15)',
//                   color: colors.green,
//                 }}
//               >
//                 <i className="bi bi-arrow-down-left"></i>
//               </div>
//               <div>
//                 <div style={styles.mockupBadgeLabel}>Payment received</div>
//                 <div style={styles.mockupBadgeValue}>+$4,250.00</div>
//               </div>
//             </div>

//             {/* Main invoice card */}
//             <div style={styles.heroMockup}>
//               <div style={styles.mockupHeader}>
//                 <div>
//                   <div style={styles.mockupTitle}>Invoice #INV-2048</div>
//                   <div
//                     style={{
//                       fontSize: '0.75rem',
//                       color: colors.textMuted,
//                       marginTop: '4px',
//                     }}
//                   >
//                     Northwind Traders · Due Nov 30
//                   </div>
//                 </div>
//                 <span style={styles.mockupStatus}>
//                   <i className="bi bi-check-circle-fill me-1"></i>
//                   Paid
//                 </span>
//               </div>

//               <div style={styles.mockupRow}>
//                 <span style={styles.mockupRowLabel}>Consulting Services</span>
//                 <span style={styles.mockupRowValue}>$3,500.00</span>
//               </div>
//               <div style={styles.mockupRow}>
//                 <span style={styles.mockupRowLabel}>Software License</span>
//                 <span style={styles.mockupRowValue}>$750.00</span>
//               </div>
//               <div style={styles.mockupRow}>
//                 <span style={styles.mockupRowLabel}>Tax (10%)</span>
//                 <span style={styles.mockupRowValue}>$425.00</span>
//               </div>

//               <div style={styles.mockupTotal}>
//                 <span style={styles.mockupTotalLabel}>Total</span>
//                 <span style={styles.mockupTotalValue}>$4,675.00</span>
//               </div>
//             </div>

//             {/* Floating badge — bottom right */}
//             <div
//               style={{
//                 ...styles.mockupBadge,
//                 bottom: '20px',
//                 right: '-20px',
//               }}
//               className="ams-float-badge-2"
//             >
//               <div
//                 style={{
//                   ...styles.mockupBadgeIcon,
//                   background: `linear-gradient(145deg, ${colors.darkBlue} 0%, ${colors.midBlue} 100%)`,
//                 }}
//               >
//                 <i className="bi bi-graph-up-arrow"></i>
//               </div>
//               <div>
//                 <div style={styles.mockupBadgeLabel}>Monthly revenue</div>
//                 <div style={styles.mockupBadgeValue}>+24.8%</div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* ==================== TRUSTED BY ==================== */}
//       <section style={styles.trustedBy}>
//         <div style={styles.trustedByInner}>
//           <span style={styles.trustedByLabel}>
//             Trusted by teams at
//           </span>
//           <div style={styles.trustedByLogos}>
//             {trustedBy.map((name) => (
//               <span
//                 key={name}
//                 style={styles.trustedByLogo}
//                 onMouseEnter={(e) => (e.target.style.color = colors.midBlue)}
//                 onMouseLeave={(e) => (e.target.style.color = '#cbd5e0')}
//               >
//                 {name}
//               </span>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* ==================== FEATURES ==================== */}
//       <section id="features" style={styles.section}>
//         <div style={styles.sectionInner}>
//           <div style={styles.sectionHeaderCenter}>
//             <span style={styles.sectionTag}>Features</span>
//             <h2 style={{ ...styles.sectionTitle, textAlign: 'center' }}>
//               Everything you need to run your books
//             </h2>
//             <p style={{ ...styles.sectionSub, textAlign: 'center' }}>
//               From invoicing to inventory, payroll to reports — AMS replaces
//               the patchwork of tools with one powerful platform.
//             </p>
//           </div>

//           <div style={styles.featuresGrid}>
//             {coreFeatures.map((f, i) => (
//               <div
//                 key={f.title}
//                 style={{
//                   ...styles.featureCard,
//                   ...(hoveredCard === i ? styles.featureCardHover : {}),
//                 }}
//                 onMouseEnter={() => setHoveredCard(i)}
//                 onMouseLeave={() => setHoveredCard(null)}
//               >
//                 <div style={styles.featureCardIcon}>
//                   <i className={`bi ${f.icon}`}></i>
//                 </div>
//                 <h3 style={styles.featureCardTitle}>{f.title}</h3>
//                 <p style={styles.featureCardDesc}>{f.desc}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* ==================== WORKFLOW ==================== */}
//       <section id="solutions" style={styles.sectionAlt}>
//         <div style={styles.sectionInner}>
//           <div style={styles.sectionHeaderCenter}>
//             <span style={styles.sectionTag}>How it works</span>
//             <h2 style={{ ...styles.sectionTitle, textAlign: 'center' }}>
//               Up and running in minutes
//             </h2>
//             <p style={{ ...styles.sectionSub, textAlign: 'center' }}>
//               No training required. Set up your company and start invoicing
//               the same day.
//             </p>
//           </div>

//           <div style={styles.workflowGrid}>
//             {workflow.map((step, i) => (
//               <div key={step.title} style={styles.workflowStep}>
//                 <div style={styles.workflowNumber}>{i + 1}</div>
//                 <div style={styles.workflowIcon}>
//                   <i className={`bi ${step.icon}`}></i>
//                 </div>
//                 <h3 style={styles.workflowTitle}>{step.title}</h3>
//                 <p style={styles.workflowDesc}>{step.desc}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* ==================== PRICING ==================== */}
//       <section id="pricing" style={styles.section}>
//         <div style={styles.sectionInner}>
//           <div style={styles.sectionHeaderCenter}>
//             <span style={styles.sectionTag}>Pricing</span>
//             <h2 style={{ ...styles.sectionTitle, textAlign: 'center' }}>
//               Simple, transparent pricing
//             </h2>
//             <p style={{ ...styles.sectionSub, textAlign: 'center' }}>
//               Start free. Upgrade when you're ready. No hidden fees, ever.
//             </p>
//           </div>

//           <div style={styles.pricingGrid}>
//             {pricingPlans.map((plan) => (
//               <div
//                 key={plan.name}
//                 style={{
//                   ...styles.pricingCard,
//                   ...(plan.popular ? styles.pricingCardPopular : {}),
//                 }}
//               >
//                 {plan.popular && (
//                   <span style={styles.pricingPopularBadge}>Most Popular</span>
//                 )}
//                 <div style={styles.pricingName}>{plan.name}</div>
//                 <div style={styles.pricingDesc}>{plan.desc}</div>
//                 <div style={styles.pricingPrice}>
//                   <span style={styles.pricingAmount}>{plan.price}</span>
//                   <span style={styles.pricingPeriod}>{plan.period}</span>
//                 </div>
//                 <ul style={styles.pricingFeatures}>
//                   {plan.features.map((feat) => (
//                     <li key={feat} style={styles.pricingFeatureItem}>
//                       <i
//                         className="bi bi-check-circle-fill"
//                         style={styles.pricingCheck}
//                       ></i>
//                       {feat}
//                     </li>
//                   ))}
//                 </ul>
//                 <Link
//                   to="/auth/register"
//                   style={{
//                     ...styles.pricingCta,
//                     background: plan.popular ? colors.midBlue : 'transparent',
//                     color: plan.popular ? '#fff' : colors.midBlue,
//                     border: plan.popular
//                       ? 'none'
//                       : `2px solid ${colors.midBlue}`,
//                   }}
//                   onMouseEnter={(e) => {
//                     if (plan.popular) {
//                       e.target.style.background = colors.darkBlue;
//                     } else {
//                       e.target.style.background = colors.midBlue;
//                       e.target.style.color = '#fff';
//                     }
//                   }}
//                   onMouseLeave={(e) => {
//                     if (plan.popular) {
//                       e.target.style.background = colors.midBlue;
//                     } else {
//                       e.target.style.background = 'transparent';
//                       e.target.style.color = colors.midBlue;
//                     }
//                   }}
//                 >
//                   {plan.cta}
//                 </Link>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* ==================== TESTIMONIALS ==================== */}
//       <section style={styles.sectionAlt}>
//         <div style={styles.sectionInner}>
//           <div style={styles.sectionHeaderCenter}>
//             <span style={styles.sectionTag}>Testimonials</span>
//             <h2 style={{ ...styles.sectionTitle, textAlign: 'center' }}>
//               Loved by finance teams
//             </h2>
//             <p style={{ ...styles.sectionSub, textAlign: 'center' }}>
//               Don't take our word for it — here's what our customers say.
//             </p>
//           </div>

//           <div style={styles.testimonialCard}>
//             <i
//               className="bi bi-quote"
//               style={{
//                 position: 'absolute',
//                 top: '24px',
//                 right: '32px',
//                 fontSize: '3rem',
//                 color: colors.softBlue,
//                 lineHeight: 1,
//               }}
//             ></i>
//             <p style={styles.testimonialQuote}>
//               "{testimonials[activeTestimonial].quote}"
//             </p>
//             <div style={styles.testimonialAuthor}>
//               <div style={styles.testimonialAvatar}>
//                 {testimonials[activeTestimonial].initials}
//               </div>
//               <div>
//                 <div style={styles.testimonialName}>
//                   {testimonials[activeTestimonial].name}
//                 </div>
//                 <div style={styles.testimonialRole}>
//                   {testimonials[activeTestimonial].role}
//                 </div>
//               </div>
//             </div>

//             <div style={styles.testimonialDots}>
//               {testimonials.map((_, i) => (
//                 <button
//                   key={i}
//                   style={{
//                     ...styles.testimonialDot,
//                     ...(i === activeTestimonial
//                       ? styles.testimonialDotActive
//                       : {}),
//                   }}
//                   onClick={() => setActiveTestimonial(i)}
//                   aria-label={`Testimonial ${i + 1}`}
//                 />
//               ))}
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* ==================== FAQ ==================== */}
//       <section id="resources" style={styles.section}>
//         <div style={styles.sectionInner}>
//           <div style={styles.sectionHeaderCenter}>
//             <span style={styles.sectionTag}>FAQ</span>
//             <h2 style={{ ...styles.sectionTitle, textAlign: 'center' }}>
//               Frequently asked questions
//             </h2>
//             <p style={{ ...styles.sectionSub, textAlign: 'center' }}>
//               Everything you need to know about AMS. Can't find an answer?{' '}
//               <a
//                 href="#contact"
//                 style={{ color: colors.midBlue, fontWeight: '600' }}
//               >
//                 Contact our team
//               </a>
//               .
//             </p>
//           </div>

//           <div style={styles.faqList}>
//             {faqs.map((faq, i) => (
//               <div
//                 key={i}
//                 style={{
//                   ...styles.faqItem,
//                   ...(openFaq === i ? styles.faqItemOpen : {}),
//                 }}
//                 onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
//               >
//                 <div style={styles.faqQuestion}>
//                   {faq.q}
//                   <i
//                     className={`bi ${
//                       openFaq === i ? 'bi-dash-lg' : 'bi-plus-lg'
//                     }`}
//                     style={styles.faqIcon}
//                   ></i>
//                 </div>
//                 {openFaq === i && (
//                   <div style={styles.faqAnswer}>{faq.a}</div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* ==================== CTA ==================== */}
//       <section id="demo" style={styles.ctaSection}>
//         <div style={{ maxWidth: '720px', margin: '0 auto' }}>
//           <h2 style={styles.ctaTitle}>
//             Ready to simplify your accounting?
//           </h2>
//           <p style={styles.ctaSub}>
//             Join 10,000+ businesses using AMS to invoice, track expenses, and
//             grow. Start your free trial today — no credit card required.
//           </p>
//           <div style={styles.ctaButtons}>
//             <Link
//               to="/auth/register"
//               style={styles.ctaBtnWhite}
//               onMouseEnter={(e) => {
//                 e.target.style.transform = 'translateY(-2px)';
//                 e.target.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)';
//               }}
//               onMouseLeave={(e) => {
//                 e.target.style.transform = 'translateY(0)';
//                 e.target.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
//               }}
//             >
//               <i className="bi bi-rocket-takeoff"></i>
//               Start Free Trial
//             </Link>
//             <a
//               href="#contact"
//               style={styles.ctaBtnOutline}
//               onMouseEnter={(e) => {
//                 e.target.style.background = 'rgba(255,255,255,0.1)';
//                 e.target.style.borderColor = '#fff';
//               }}
//               onMouseLeave={(e) => {
//                 e.target.style.background = 'transparent';
//                 e.target.style.borderColor = 'rgba(255,255,255,0.4)';
//               }}
//             >
//               <i className="bi bi-chat-dots"></i>
//               Talk to Sales
//             </a>
//           </div>
//         </div>
//       </section>

//       {/* ==================== FOOTER ==================== */}
//       <footer style={styles.footer}>
//         <div style={styles.footerGrid}>
//           <div>
//             <div style={styles.footerBrand}>
//               <span style={styles.footerBrandIcon}>
//                 <i className="bi bi-calculator"></i>
//               </span>
//               AMS Software
//             </div>
//             <p style={styles.footerDesc}>
//               The complete accounting management platform for modern
//               businesses. Invoicing, payroll, inventory, and reporting — all
//               in one place.
//             </p>
//             <div style={styles.footerSocial}>
//               {[
//                 { icon: 'bi-twitter-x', label: 'Twitter' },
//                 { icon: 'bi-linkedin', label: 'LinkedIn' },
//                 { icon: 'bi-github', label: 'GitHub' },
//                 { icon: 'bi-youtube', label: 'YouTube' },
//               ].map((s) => (
//                 <a
//                   key={s.label}
//                   href="#"
//                   aria-label={s.label}
//                   style={styles.footerSocialLink}
//                   onMouseEnter={(e) => {
//                     e.currentTarget.style.background = colors.midBlue;
//                     e.currentTarget.style.color = '#fff';
//                   }}
//                   onMouseLeave={(e) => {
//                     e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
//                     e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
//                   }}
//                 >
//                   <i className={`bi ${s.icon}`}></i>
//                 </a>
//               ))}
//             </div>
//           </div>

//           {footerCols.map((col) => (
//             <div key={col.heading}>
//               <h4 style={styles.footerHeading}>{col.heading}</h4>
//               <ul style={styles.footerList}>
//                 {col.links.map((link) => (
//                   <li key={link}>
//                     <a
//                       href="#"
//                       style={styles.footerLink}
//                       onMouseEnter={(e) => (e.target.style.color = '#fff')}
//                       onMouseLeave={(e) =>
//                         (e.target.style.color = 'rgba(255,255,255,0.6)')
//                       }
//                     >
//                       {link}
//                     </a>
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           ))}
//         </div>

//         <div style={styles.footerBottom}>
//           <span>
//             © {new Date().getFullYear()} AMS Software, Inc. All rights
//             reserved.
//           </span>
//           <div style={styles.footerBottomLinks}>
//             <a href="#" style={{ color: 'inherit' }}>
//               Privacy
//             </a>
//             <a href="#" style={{ color: 'inherit' }}>
//               Terms
//             </a>
//             <a href="#" style={{ color: 'inherit' }}>
//               Security
//             </a>
//             <a href="#" style={{ color: 'inherit' }}>
//               Status
//             </a>
//           </div>
//         </div>
//       </footer>

//       {/* ==================== RESPONSIVE STYLES ==================== */}
//       <style>{`
//         a { text-decoration: none !important; }
//         a:hover { text-decoration: none !important; }

//         /* Floating badges animation */
//         @keyframes floatY {
//           0%, 100% { transform: translateY(0); }
//           50% { transform: translateY(-10px); }
//         }
//         .ams-float-badge {
//           animation: floatY 5s ease-in-out infinite;
//         }
//         .ams-float-badge-2 {
//           animation: floatY 6s ease-in-out infinite reverse;
//         }

//         /* Responsive */
//         @media (max-width: 1100px) {
//           .ams-nav-links { display: none !important; }
//           .ams-nav-actions { display: none !important; }
//           .ams-mobile-btn { display: block !important; }
//         }

//         @media (max-width: 992px) {
//           /* Hero stacks */
//           section > div {
//             grid-template-columns: 1fr !important;
//           }
//           /* Footer grid */
//           footer > div:first-child {
//             grid-template-columns: 1fr 1fr !important;
//           }
//         }

//         @media (max-width: 768px) {
//           h1 { font-size: 2.2rem !important; }
//           h2 { font-size: 1.8rem !important; }
//           section { padding-left: 24px !important; padding-right: 24px !important; }
//           nav { padding-left: 20px !important; padding-right: 20px !important; }
//         }

//         @media (max-width: 576px) {
//           h1 { font-size: 1.9rem !important; }
//           h2 { font-size: 1.5rem !important; }
//           footer > div:first-child {
//             grid-template-columns: 1fr !important;
//           }
//           .ams-float-badge,
//           .ams-float-badge-2 {
//             display: none !important;
//           }
//         }
//       `}</style>
//     </div>
//   );
// };

// export default WelcomePage;