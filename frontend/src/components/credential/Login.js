// import React, { useState, useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap-icons/font/bootstrap-icons.css';
// import { useAuth } from '../../context/AuthContext';
// import '../../stylesheet/credential/Login.css';
// import { FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
// import NotificationToast from '../NotificationToast';

// const LoginForm = () => {
//     const { login } = useAuth();
//     const [showModal, setShowModal] = useState(false);
//     const [modalMessage, setModalMessage] = useState('');
//     const [modalType, setModalType] = useState('');
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
//     const [loading, setLoading] = useState(false);
//     const [loadingPercentage, setLoadingPercentage] = useState(0);
//     const [messages, setMessages] = useState('');
//     const [error, setError] = useState('');
//     const [isButtonClicked, setIsButtonClicked] = useState(false);
//     const [showPassword, setShowPassword] = useState(false);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const urlParams = new URLSearchParams(window.location.search);
//         const msg = urlParams.get('message');
//         const err = urlParams.get('error');

//         if (msg) {
//             setModalMessage(msg);
//             setModalType('success');
//             setShowModal(true);
//         }
//         if (err) {
//             setModalMessage(err);
//             setModalType('error');
//             setShowModal(true);
//         }
//     }, []);

//     useEffect(() => {
//         if (loading) {
//             const interval = setInterval(() => {
//                 setLoadingPercentage(prev => {
//                     if (prev >= 100) {
//                         clearInterval(interval);
//                         return 100;
//                     }
//                     return prev + 10;
//                 });
//             }, 100);

//             return () => clearInterval(interval);
//         }
//     }, [loading]);

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         if (!isButtonClicked) return;

//         setLoading(true);
//         setLoadingPercentage(0);

//         try {
//             const response = await login({ email, password });

//             setModalMessage('Login successful! Redirecting...');
//             setModalType('success');
//             setShowModal(true);

//             setTimeout(() => {
//                 setShowModal(false);
//                 navigate('/dashboard');
//             }, 3000);

//         } catch (error) {
//             setLoading(false);
//             setModalMessage(error === 'Invalid email or password'
//                 ? 'Invalid email or password. Please try again.'
//                 : error);
//             setModalType('error');
//             setShowModal(true);
//         }
//     };

//     const handleSocialLogin = (provider) => {
//         setLoading(true);
//         console.log(`Logging in with ${provider}`);
//     };

//     const moveToNextInput = (e, currentIndex) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             const form = e.target.form;
//             if (form.elements[currentIndex + 1]) {
//                 form.elements[currentIndex + 1].focus();
//             }
//         }
//     };

//     return (
//         <div className="login-container">
//             <NotificationToast
//                 message={modalMessage}
//                 type={modalType}
//                 show={showModal}
//                 onClose={() => setShowModal(false)}
//             />

//             <section className="login-section">
//                 <div className="container">
//                     <div className="row justify-content-center">
//                         <div className="col-xl-6 col-lg-8 col-md-10">
//                             <div className="login-card">
//                                 <div className="login-header text-center">
//                                     <img
//                                         src="/logo/logo.png"
//                                         alt="Company Logo"
//                                         className="login-logo"
//                                     />
//                                     <h1 className="login-title">Ams Login</h1>
//                                 </div>

//                                 <div className="login-body">
//                                     <form onSubmit={handleSubmit} id="login-form">
//                                         <div className="form-group sm-2">
//                                             <label htmlFor="email" className="form-label">Email</label>
//                                             <input
//                                                 type="email"
//                                                 id="email"
//                                                 name="email"
//                                                 className="form-control form-control-sm"
//                                                 placeholder="Enter your email address"
//                                                 autoComplete="email"
//                                                 autoFocus
//                                                 value={email}
//                                                 onChange={(e) => setEmail(e.target.value)}
//                                                 onKeyDown={(e) => moveToNextInput(e, 0)}
//                                             />
//                                         </div>

//                                         <div className="form-group sm-2">
//                                             <label htmlFor="password" className="form-label">Password</label>
//                                             <div className="position-relative">
//                                                 <input
//                                                     type={showPassword ? "text" : "password"}
//                                                     id="password"
//                                                     name="password"
//                                                     className="form-control form-control-sm"
//                                                     placeholder="Enter your password"
//                                                     autoComplete="current-password"
//                                                     value={password}
//                                                     onChange={(e) => setPassword(e.target.value)}
//                                                     onKeyDown={(e) => moveToNextInput(e, 1)}
//                                                 />
//                                                 <span
//                                                     className="position-absolute top-50 end-0 translate-middle-y me-3"
//                                                     style={{
//                                                         cursor: "pointer",
//                                                         zIndex: 5
//                                                     }}
//                                                     onClick={() => setShowPassword(!showPassword)}
//                                                 >
//                                                     <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-secondary`}></i>
//                                                 </span>
//                                             </div>
//                                         </div>

//                                         <div className="d-flex justify-content-between align-items-center mb-2">
//                                             <Link to="/auth/verify-email">Verify Email</Link>
//                                             <Link to="/auth/forgot-password" className="forgot-password">
//                                                 Forgot password?
//                                             </Link>
//                                         </div>

//                                         <button
//                                             type="submit"
//                                             className="btn btn-primary btn-lg w-100 mb-2"
//                                             id="login-btn"
//                                             onClick={() => setIsButtonClicked(true)}
//                                             disabled={loading}
//                                         >
//                                             {loading ? (
//                                                 <>
//                                                     <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
//                                                     Signing in...
//                                                 </>
//                                             ) : (
//                                                 'Sign In'
//                                             )}
//                                         </button>

//                                         <div className="text-center mt-2">
//                                             <p className="register-text">
//                                                 Don't have an account?{' '}
//                                                 <Link to="/auth/register" className="register-link">
//                                                     Register here
//                                                 </Link>
//                                             </p>
//                                         </div>
//                                     </form>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </section>
//         </div>
//     );
// };

// export default LoginForm;

//------------------------------------end1

// import React, { useState, useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap-icons/font/bootstrap-icons.css';
// import { useAuth } from '../../context/AuthContext';
// import NotificationToast from '../NotificationToast';

// const LoginForm = () => {
//     const { login } = useAuth();
//     const [showModal, setShowModal] = useState(false);
//     const [modalMessage, setModalMessage] = useState('');
//     const [modalType, setModalType] = useState('');
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
//     const [loading, setLoading] = useState(false);
//     const [loadingPercentage, setLoadingPercentage] = useState(0);
//     const [error, setError] = useState('');
//     const [isButtonClicked, setIsButtonClicked] = useState(false);
//     const [showPassword, setShowPassword] = useState(false);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const urlParams = new URLSearchParams(window.location.search);
//         const msg = urlParams.get('message');
//         const err = urlParams.get('error');

//         if (msg) {
//             setModalMessage(msg);
//             setModalType('success');
//             setShowModal(true);
//         }
//         if (err) {
//             setModalMessage(err);
//             setModalType('error');
//             setShowModal(true);
//         }
//     }, []);

//     useEffect(() => {
//         if (loading) {
//             const interval = setInterval(() => {
//                 setLoadingPercentage(prev => {
//                     if (prev >= 100) {
//                         clearInterval(interval);
//                         return 100;
//                     }
//                     return prev + 10;
//                 });
//             }, 100);
//             return () => clearInterval(interval);
//         }
//     }, [loading]);

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         if (!isButtonClicked) return;

//         setLoading(true);
//         setLoadingPercentage(0);

//         try {
//             const response = await login({ email, password });

//             setModalMessage('Login successful! Redirecting...');
//             setModalType('success');
//             setShowModal(true);

//             setTimeout(() => {
//                 setShowModal(false);
//                 navigate('/dashboard');
//             }, 3000);

//         } catch (error) {
//             setLoading(false);
//             setModalMessage(error === 'Invalid email or password'
//                 ? 'Invalid email or password. Please try again.'
//                 : error);
//             setModalType('error');
//             setShowModal(true);
//         }
//     };

//     const moveToNextInput = (e, currentIndex) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             const form = e.target.form;
//             if (form.elements[currentIndex + 1]) {
//                 form.elements[currentIndex + 1].focus();
//             }
//         }
//     };

//     // ---------- Inline styles (COMPACT - matching RegisterForm) ----------
//     const styles = {
//         container: {
//             minHeight: '100vh',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//             padding: '15px',
//             fontFamily: "'Inter', -apple-system, sans-serif",
//         },
//         card: {
//             background: '#ffffff',
//             borderRadius: '24px',
//             padding: '28px 35px 25px',
//             boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
//             maxWidth: '480px',
//             width: '100%',
//         },
//         header: {
//             textAlign: 'center',
//             marginBottom: '14px',
//         },
//         logo: {
//             width: '90px',
//             height: '90px',
//             margin: '0 auto 6px',
//             display: 'block',
//             objectFit: 'contain',
//         },
//         title: {
//             fontSize: '20px',
//             fontWeight: '700',
//             color: '#1a202c',
//             margin: '0 0 1px',
//             letterSpacing: '-0.5px',
//         },
//         subtitle: {
//             fontSize: '12px',
//             color: '#718096',
//             margin: 0,
//         },
//         tabs: {
//             display: 'flex',
//             background: '#f0f2f5',
//             borderRadius: '10px',
//             padding: '3px',
//             marginBottom: '18px',
//         },
//         tab: {
//             flex: 1,
//             textAlign: 'center',
//             padding: '7px 0',
//             borderRadius: '8px',
//             fontWeight: '600',
//             fontSize: '13px',
//             textDecoration: 'none',
//             transition: 'all 0.2s',
//             color: '#4a5568',
//         },
//         activeTab: {
//             background: '#667eea',
//             color: '#ffffff',
//         },
//         welcome: {
//             fontSize: '18px',
//             fontWeight: '600',
//             color: '#1a202c',
//             margin: '0 0 2px',
//         },
//         welcomeSub: {
//             fontSize: '12px',
//             color: '#718096',
//             margin: '0 0 16px',
//         },
//         field: {
//             marginBottom: '12px',
//         },
//         label: {
//             display: 'block',
//             fontWeight: '500',
//             color: '#2d3748',
//             fontSize: '12px',
//             marginBottom: '4px',
//         },
//         input: {
//             width: '100%',
//             padding: '8px 12px',
//             border: '2px solid #e2e8f0',
//             borderRadius: '10px',
//             fontSize: '13px',
//             outline: 'none',
//             transition: 'all 0.2s',
//             backgroundColor: '#f7fafc',
//             boxSizing: 'border-box',
//             color: '#2d3748',
//             height: '38px',
//         },
//         inputFocus: {
//             borderColor: '#667eea',
//             backgroundColor: '#fff',
//             boxShadow: '0 0 0 3px rgba(102,126,234,0.1)',
//         },
//         passwordWrapper: {
//             position: 'relative',
//         },
//         eyeButton: {
//             position: 'absolute',
//             right: '10px',
//             top: '50%',
//             transform: 'translateY(-50%)',
//             background: 'none',
//             border: 'none',
//             cursor: 'pointer',
//             color: '#a0aec0',
//             fontSize: '16px',
//             padding: '4px',
//         },
//         forgotRow: {
//             display: 'flex',
//             justifyContent: 'flex-end',
//             marginTop: '2px',
//         },
//         forgotLink: {
//             color: '#667eea',
//             textDecoration: 'none',
//             fontSize: '12px',
//             fontWeight: '500',
//         },
//         loginButton: {
//             width: '100%',
//             padding: '10px',
//             background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//             color: '#fff',
//             border: 'none',
//             borderRadius: '10px',
//             fontSize: '14px',
//             fontWeight: '600',
//             cursor: 'pointer',
//             transition: 'all 0.3s',
//             marginTop: '2px',
//             height: '42px',
//         },
//         registerText: {
//             textAlign: 'center',
//             marginTop: '14px',
//             fontSize: '13px',
//             color: '#718096',
//         },
//         registerLink: {
//             color: '#667eea',
//             fontWeight: '600',
//             textDecoration: 'none',
//         },
//     };

//     return (
//         <div style={styles.container}>
//             <NotificationToast
//                 message={modalMessage}
//                 type={modalType}
//                 show={showModal}
//                 onClose={() => setShowModal(false)}
//             />

//             <div style={styles.card}>
//                 {/* Header with logo and title */}
//                 <div style={styles.header}>
//                     <img
//                         src="/logo/logo.png"
//                         alt="Company Logo"
//                         style={styles.logo}
//                     />
//                     <h1 style={styles.title}>Ams Login</h1>
//                 </div>

//                 {/* Tabs */}
//                 {/* <div style={styles.tabs}>
//                     <Link to="/auth/login" style={{ ...styles.tab, ...styles.activeTab }}>
//                         Login
//                     </Link>
//                     <Link to="/auth/register" style={styles.tab}>
//                         Register
//                     </Link>
//                 </div> */}

//                 {/* Form */}
//                 <form onSubmit={handleSubmit} id="login-form">
//                     <div style={styles.field}>
//                         <label htmlFor="email" style={styles.label}>Email address</label>
//                         <input
//                             type="email"
//                             id="email"
//                             name="email"
//                             placeholder="Enter your email"
//                             autoComplete="email"
//                             autoFocus
//                             value={email}
//                             onChange={(e) => setEmail(e.target.value)}
//                             onKeyDown={(e) => moveToNextInput(e, 0)}
//                             style={styles.input}
//                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                             onBlur={(e) => {
//                                 e.target.style.borderColor = '#e2e8f0';
//                                 e.target.style.backgroundColor = '#f7fafc';
//                                 e.target.style.boxShadow = 'none';
//                             }}
//                             required
//                         />
//                     </div>

//                     <div style={styles.field}>
//                         <label htmlFor="password" style={styles.label}>Password</label>
//                         <div style={styles.passwordWrapper}>
//                             <input
//                                 type={showPassword ? "text" : "password"}
//                                 id="password"
//                                 name="password"
//                                 placeholder="Enter your password"
//                                 autoComplete="current-password"
//                                 value={password}
//                                 onChange={(e) => setPassword(e.target.value)}
//                                 onKeyDown={(e) => moveToNextInput(e, 1)}
//                                 style={styles.input}
//                                 onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                 onBlur={(e) => {
//                                     e.target.style.borderColor = '#e2e8f0';
//                                     e.target.style.backgroundColor = '#f7fafc';
//                                     e.target.style.boxShadow = 'none';
//                                 }}
//                                 required
//                             />
//                             {/* <button
//                                 type="button"
//                                 style={styles.eyeButton}
//                                 onClick={() => setShowPassword(!showPassword)}
//                             >
//                                 <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
//                             </button> */}

//                             <span
//                                 className="position-absolute top-50 end-0 translate-middle-y me-3"
//                                 style={{
//                                     cursor: "pointer",
//                                     zIndex: 5
//                                 }}
//                                 onClick={() => setShowPassword(!showPassword)}
//                             >
//                                 <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-secondary`}></i>
//                             </span>
//                         </div>
//                         <div style={styles.forgotRow}>
//                             <Link to="/auth/forgot-password" style={styles.forgotLink}>
//                                 Forgot Password?
//                             </Link>
//                         </div>
//                     </div>

//                     <button
//                         type="submit"
//                         style={styles.loginButton}
//                         onClick={() => setIsButtonClicked(true)}
//                         disabled={loading}
//                         onMouseEnter={(e) => {
//                             if (!loading) {
//                                 e.target.style.transform = 'translateY(-1px)';
//                                 e.target.style.boxShadow = '0 6px 20px rgba(102,126,234,0.3)';
//                             }
//                         }}
//                         onMouseLeave={(e) => {
//                             e.target.style.transform = 'translateY(0)';
//                             e.target.style.boxShadow = 'none';
//                         }}
//                     >
//                         {loading ? (
//                             <>
//                                 <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
//                                 Signing in...
//                             </>
//                         ) : (
//                             'Login'
//                         )}
//                     </button>

//                     <p style={styles.registerText}>
//                         Don't have an account?{' '}
//                         <Link to="/auth/register" style={styles.registerLink}>
//                             Register here
//                         </Link>
//                     </p>
//                 </form>
//             </div>

//             <style>{`
//                 a:hover {
//                     color: #5a67d8 !important;
//                 }
//             `}</style>
//         </div>
//     );
// };

// export default LoginForm;

//----------------------------------------end2

// import React, { useState, useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap-icons/font/bootstrap-icons.css';
// import { useAuth } from '../../context/AuthContext';
// import NotificationToast from '../NotificationToast';

// const LoginForm = () => {
//     const { login } = useAuth();
//     const [showModal, setShowModal] = useState(false);
//     const [modalMessage, setModalMessage] = useState('');
//     const [modalType, setModalType] = useState('');
//     const [username, setUsername] = useState('');
//     const [password, setPassword] = useState('');
//     const [loading, setLoading] = useState(false);
//     const [loadingPercentage, setLoadingPercentage] = useState(0);
//     const [error, setError] = useState('');
//     const [isButtonClicked, setIsButtonClicked] = useState(false);
//     const [showPassword, setShowPassword] = useState(false);
//     const navigate = useNavigate();
//     const loginButtonRef = React.useRef(null);

//     useEffect(() => {
//         const urlParams = new URLSearchParams(window.location.search);
//         const msg = urlParams.get('message');
//         const err = urlParams.get('error');

//         if (msg) {
//             setModalMessage(msg);
//             setModalType('success');
//             setShowModal(true);
//         }
//         if (err) {
//             setModalMessage(err);
//             setModalType('error');
//             setShowModal(true);
//         }
//     }, []);

//     useEffect(() => {
//         if (loading) {
//             const interval = setInterval(() => {
//                 setLoadingPercentage(prev => {
//                     if (prev >= 100) {
//                         clearInterval(interval);
//                         return 100;
//                     }
//                     return prev + 10;
//                 });
//             }, 100);
//             return () => clearInterval(interval);
//         }
//     }, [loading]);

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         if (!isButtonClicked) return;

//         setLoading(true);
//         setLoadingPercentage(0);

//         try {
//             const response = await login({ email: username, password });

//             setModalMessage('Login successful! Redirecting...');
//             setModalType('success');
//             setShowModal(true);

//             setTimeout(() => {
//                 setShowModal(false);
//                 navigate('/dashboard');
//             }, 3000);

//         } catch (error) {
//             setLoading(false);
//             setModalMessage(error === 'Invalid email or password'
//                 ? 'Invalid username or password. Please try again.'
//                 : error);
//             setModalType('error');
//             setShowModal(true);
//         }
//     };

//     const handleCancel = () => {
//         setUsername('');
//         setPassword('');
//     };

//     const moveToNextInput = (e, currentIndex) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             const form = e.target.form;

//             if (form && form.elements[currentIndex + 1]) {
//                 if (currentIndex + 1 === form.elements.length - 1) {
//                     loginButtonRef.current?.focus();
//                 } else {
//                     form.elements[currentIndex + 1].focus();
//                 }
//             } else {
//                 loginButtonRef.current?.focus();
//             }
//         }
//     };

//     // ---------- Styles matching the PROBILZ design EXACTLY ----------
//     const styles = {
//         container: {
//             minHeight: '100vh',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             background: '#f0f2f5',
//             padding: '20px',
//             fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
//         },
//         card: {
//             background: '#ffffff',
//             borderRadius: '12px',
//             padding: '45px 50px 40px',
//             boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
//             maxWidth: '400px',
//             width: '100%',
//         },
//         header: {
//             textAlign: 'center',
//             marginBottom: '30px',
//         },
//         logo: {
//             width: '60px',
//             height: '60px',
//             margin: '0 auto 12px',
//             display: 'block',
//             objectFit: 'contain',
//         },
//         title: {
//             fontSize: '28px',
//             fontWeight: '700',
//             color: '#1a1a2e',
//             margin: '0 0 2px',
//             letterSpacing: '1px',
//         },
//         subtitle: {
//             fontSize: '13px',
//             color: '#8c8c8c',
//             margin: 0,
//             fontWeight: '400',
//             letterSpacing: '0.5px',
//         },
//         formTitle: {
//             fontSize: '22px',
//             fontWeight: '600',
//             color: '#1a1a2e',
//             margin: '0 0 28px',
//             textAlign: 'center',
//         },
//         field: {
//             marginBottom: '18px',
//         },
//         label: {
//             display: 'block',
//             fontWeight: '500',
//             color: '#4a4a4a',
//             fontSize: '14px',
//             marginBottom: '6px',
//         },
//         input: {
//             width: '100%',
//             padding: '10px 14px',
//             border: '1px solid #d9d9d9',
//             borderRadius: '4px',
//             fontSize: '14px',
//             outline: 'none',
//             transition: 'all 0.2s',
//             backgroundColor: '#ffffff',
//             boxSizing: 'border-box',
//             color: '#333333',
//             height: '40px',
//         },
//         inputFocus: {
//             borderColor: '#1890ff',
//             boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.2)',
//         },
//         passwordWrapper: {
//             position: 'relative',
//         },
//         eyeButton: {
//             position: 'absolute',
//             right: '12px',
//             top: '50%',
//             transform: 'translateY(-50%)',
//             background: 'none',
//             border: 'none',
//             cursor: 'pointer',
//             color: '#bfbfbf',
//             fontSize: '16px',
//             padding: '4px',
//             zIndex: 1,
//         },
//         forgotRow: {
//             display: 'flex',
//             justifyContent: 'flex-end',
//             marginTop: '2px',
//             marginBottom: '24px',
//         },
//         forgotLink: {
//             color: '#1890ff',
//             textDecoration: 'none',
//             fontSize: '13px',
//             fontWeight: '400',
//         },
//         buttonGroup: {
//             display: 'flex',
//             gap: '10px',
//         },
//         loginButton: {
//             flex: 1,
//             padding: '10px',
//             background: '#1890ff',
//             color: '#fff',
//             border: 'none',
//             borderRadius: '4px',
//             fontSize: '14px',
//             fontWeight: '500',
//             cursor: 'pointer',
//             transition: 'all 0.2s',
//             height: '40px',
//         },
//         loginButtonHover: {
//             background: '#40a9ff',
//         },
//         cancelButton: {
//             flex: 1,
//             padding: '10px',
//             background: '#ffffff',
//             color: '#595959',
//             border: '1px solid #d9d9d9',
//             borderRadius: '4px',
//             fontSize: '14px',
//             fontWeight: '500',
//             cursor: 'pointer',
//             transition: 'all 0.2s',
//             height: '40px',
//         },
//         cancelButtonHover: {
//             borderColor: '#1890ff',
//             color: '#1890ff',
//         },
//         registerText: {
//             textAlign: 'center',
//             marginTop: '20px',
//             fontSize: '13px',
//             color: '#8c8c8c',
//         },
//         registerLink: {
//             color: '#1890ff',
//             fontWeight: '500',
//             textDecoration: 'none',
//         },
//     };

//     return (
//         <div style={styles.container}>
//             <NotificationToast
//                 message={modalMessage}
//                 type={modalType}
//                 show={showModal}
//                 onClose={() => setShowModal(false)}
//             />

//             <div style={styles.card}>
//                 {/* Header with logo and title */}
//                 <div style={styles.header}>
//                     <img
//                         src="/logo/logo.png"
//                         alt="Company Logo"
//                         style={styles.logo}
//                     />
//                     <h1 style={styles.title}>PROBILZ</h1>
//                     <p style={styles.subtitle}>Retail Management System</p>
//                 </div>

//                 {/* Form Title */}
//                 <h2 style={styles.formTitle}>Login</h2>

//                 {/* Form */}
//                 <form onSubmit={handleSubmit} id="login-form">
//                     <div style={styles.field}>
//                         <label htmlFor="username" style={styles.label}>Username</label>
//                         <input
//                             type="text"
//                             id="username"
//                             name="username"
//                             placeholder=""
//                             autoComplete="username"
//                             autoFocus
//                             value={username}
//                             onChange={(e) => setUsername(e.target.value)}
//                             onKeyDown={(e) => moveToNextInput(e, 0)}
//                             style={styles.input}
//                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                             onBlur={(e) => {
//                                 e.target.style.borderColor = '#d9d9d9';
//                                 e.target.style.boxShadow = 'none';
//                             }}
//                             required
//                         />
//                     </div>

//                     <div style={styles.field}>
//                         <label htmlFor="password" style={styles.label}>Password</label>
//                         <div style={styles.passwordWrapper}>
//                             <input
//                                 type={showPassword ? "text" : "password"}
//                                 id="password"
//                                 name="password"
//                                 placeholder=""
//                                 autoComplete="current-password"
//                                 value={password}
//                                 onChange={(e) => setPassword(e.target.value)}
//                                 onKeyDown={(e) => moveToNextInput(e, 1)}
//                                 style={styles.input}
//                                 onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                 onBlur={(e) => {
//                                     e.target.style.borderColor = '#d9d9d9';
//                                     e.target.style.boxShadow = 'none';
//                                 }}
//                                 required
//                             />
//                             <button
//                                 type="button"
//                                 style={styles.eyeButton}
//                                 onClick={() => setShowPassword(!showPassword)}
//                                 tabIndex="-1"
//                             >
//                                 <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
//                             </button>
//                         </div>
//                         <div style={styles.forgotRow}>
//                             <Link to="/auth/forgot-password" style={styles.forgotLink}>
//                                 Forgot Password?
//                             </Link>
//                         </div>
//                     </div>

//                     <div style={styles.buttonGroup}>
//                         <button
//                             type="submit"
//                             ref={loginButtonRef}
//                             style={styles.loginButton}
//                             onClick={() => setIsButtonClicked(true)}
//                             disabled={loading}
//                             onMouseEnter={(e) => {
//                                 if (!loading) {
//                                     e.target.style.background = styles.loginButtonHover.background;
//                                 }
//                             }}
//                             onMouseLeave={(e) => {
//                                 e.target.style.background = styles.loginButton.background;
//                             }}
//                         >
//                             {loading ? (
//                                 <>
//                                     <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
//                                     Signing in...
//                                 </>
//                             ) : (
//                                 'Login'
//                             )}
//                         </button>
//                         <button
//                             type="button"
//                             style={styles.cancelButton}
//                             onClick={handleCancel}
//                             onMouseEnter={(e) => {
//                                 e.target.style.borderColor = styles.cancelButtonHover.borderColor;
//                                 e.target.style.color = styles.cancelButtonHover.color;
//                             }}
//                             onMouseLeave={(e) => {
//                                 e.target.style.borderColor = '#d9d9d9';
//                                 e.target.style.color = '#595959';
//                             }}
//                         >
//                             Cancel
//                         </button>
//                     </div>

//                     <p style={styles.registerText}>
//                         Don't have an account?{' '}
//                         <Link to="/auth/register" style={styles.registerLink}>
//                             Register
//                         </Link>
//                     </p>
//                 </form>
//             </div>

//             <style>{`
//                 a:hover {
//                     color: #40a9ff !important;
//                 }
//             `}</style>
//         </div>
//     );
// };

// export default LoginForm;

//---------------------------------------end3

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