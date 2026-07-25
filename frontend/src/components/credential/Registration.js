// import React, { useState, useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap-icons/font/bootstrap-icons.css';
// import '../../stylesheet/credential/Registration.css';

// const RegisterForm = () => {
//   const [formData, setFormData] = useState({
//     name: '',
//     email: '',
//     password: '',
//     password2: '',
//     isAdmin: true
//   });
//   const [errors, setErrors] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [loadingPercentage, setLoadingPercentage] = useState(0);
//   const [showPassword, setShowPassword] = useState(false);
//   const [showPassword2, setShowPassword2] = useState(false);
//   const [passwordStrength, setPasswordStrength] = useState({
//     width: '0%',
//     color: '#e74c3c'
//   });
//   const [acceptedTerms, setAcceptedTerms] = useState(false);
//   const [message, setMessage] = useState('');
//   const [error, setError] = useState('');
//   const navigate = useNavigate();

//   const api = axios.create({
//     baseURL: process.env.REACT_APP_API_BASE_URL,
//     withCredentials: true,
//   });

//   useEffect(() => {
//     // Auto-focus name field on component mount
//     document.getElementById('name')?.focus();
//   }, []);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));

//     // Clear error when user types
//     if (errors[name]) {
//       setErrors(prev => ({ ...prev, [name]: '' }));
//     }

//     // Special handling for password strength
//     if (name === 'password') {
//       calculatePasswordStrength(value);
//     }
//   };

//   const calculatePasswordStrength = (password) => {
//     let strength = 0;

//     // Check password length
//     if (password.length >= 8) strength += 1;
//     if (password.length >= 12) strength += 1;

//     // Check for numbers
//     if (/\d/.test(password)) strength += 1;

//     // Check for special characters
//     if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;

//     // Check for uppercase and lowercase
//     if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;

//     // Update strength meter
//     let width = 0;
//     let color = '#e74c3c'; // Red

//     if (strength === 0) {
//       width = 0;
//     } else if (strength <= 2) {
//       width = 33;
//       color = '#e74c3c'; // Red
//     } else if (strength === 3) {
//       width = 66;
//       color = '#f39c12'; // Orange
//     } else {
//       width = 100;
//       color = '#2ecc71'; // Green
//     }

//     setPasswordStrength({ width, color });
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     let isValid = true;

//     // Name validation
//     if (!formData.name.trim()) {
//       newErrors.name = 'Please enter your full name';
//       isValid = false;
//     }

//     // Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(formData.email)) {
//       newErrors.email = 'Please enter a valid email address';
//       isValid = false;
//     }

//     // Password validation
//     if (formData.password.length < 8) {
//       newErrors.password = 'Password must be at least 8 characters';
//       isValid = false;
//     }

//     // Password match validation
//     if (formData.password !== formData.password2) {
//       newErrors.password2 = 'Passwords do not match';
//       isValid = false;
//     }

//     // Terms validation
//     if (!acceptedTerms) {
//       newErrors.terms = 'You must agree to the terms';
//       isValid = false;
//     }

//     setErrors(newErrors);
//     return isValid;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!validateForm()) return;

//     setLoading(true);
//     setError('');
//     setMessage('');

//     try {
//       // Simulate loading progress
//       const interval = setInterval(() => {
//         setLoadingPercentage(prev => {
//           if (prev >= 100) {
//             clearInterval(interval);
//             return 100;
//           }
//           return prev + 10;
//         });
//       }, 100);

//       const response = await api.post('/api/User/register', formData);

//       clearInterval(interval);
//       setLoading(false);
//       setLoadingPercentage(0);

//       if (response.data.success) {
//         setMessage('Registration successful! Please check your email to verify your account.');
//         setTimeout(() => {
//           navigate('/auth/login');
//         }, 3000);
//       } else {
//         setError(response.data.message || 'Registration failed');
//       }
//     } catch (err) {
//       setLoading(false);
//       setLoadingPercentage(0);
//       setError(err.response?.data?.message || err.message || 'Registration failed');
//     }
//   };

//   return (
//     <div className="register-container d-flex justify-content-center align-items-center">
//       <div className="container">
//         <div className="row justify-content-center">
//           <div className="col-12 col-lg-10 col-xl-8"> {/* Increased column width */}
//             <div className="card gradient-custom-3" style={{ maxWidth: '800px', margin: '0 auto' }}>
//               <div className="card-body p-4 p-md-5">
//                 <h2 className="text-center mb-4">Create Your Account</h2>

//                 {loading && (
//                   <div className="loader">
//                     <div className="spinner"></div>
//                     <p className="loader-percentage-text">
//                       Creating account... <span className="loader-percentage">{loadingPercentage}%</span>
//                     </p>
//                   </div>
//                 )}

//                 {message && (
//                   <div className="alert alert-success alert-dismissible fade show animate__animated animate__fadeIn" role="alert">
//                     {message}
//                     <button type="button" className="btn-close" onClick={() => setMessage('')} aria-label="Close"></button>
//                   </div>
//                 )}

//                 {error && (
//                   <div className="alert alert-danger alert-dismissible fade show animate__animated animate__fadeIn" role="alert">
//                     {error}
//                     <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Close"></button>
//                   </div>
//                 )}

//                 <form onSubmit={handleSubmit} id="registerForm" noValidate>
//                   <div className="form-outline">
//                     <input
//                       type="text"
//                       id="name"
//                       name="name"
//                       className={`form-control ${errors.name ? 'is-invalid' : formData.name ? 'is-valid' : ''}`}
//                       value={formData.name}
//                       onChange={handleChange}
//                       required
//                     />
//                     <label className="form-label" htmlFor="name">Full Name</label>
//                     {errors.name && <div className="invalid-feedback">{errors.name}</div>}
//                   </div>

//                   <div className="form-outline">
//                     <input
//                       type="email"
//                       id="email"
//                       name="email"
//                       className={`form-control ${errors.email ? 'is-invalid' : formData.email ? 'is-valid' : ''}`}
//                       value={formData.email}
//                       onChange={handleChange}
//                       required
//                     />
//                     <label className="form-label" htmlFor="email">Email Address</label>
//                     {errors.email && <div className="invalid-feedback">{errors.email}</div>}
//                   </div>

//                   <div className="form-outline">
//                     <input
//                       type={showPassword ? 'text' : 'password'}
//                       id="password"
//                       name="password"
//                       className={`form-control ${errors.password ? 'is-invalid' : formData.password ? 'is-valid' : ''}`}
//                       value={formData.password}
//                       onChange={handleChange}
//                       required
//                     />
//                     <label className="form-label" htmlFor="password">Password</label>
//                     <i
//                       className={`bi ${showPassword ? 'bi-eye' : 'bi-eye-slash'} password-toggle`}
//                       onClick={() => setShowPassword(!showPassword)}
//                     />
//                     {errors.password && <div className="invalid-feedback">{errors.password}</div>}
//                     <div className="password-strength">
//                       <div className="strength-meter" style={{ width: passwordStrength.width, backgroundColor: passwordStrength.color }}></div>
//                     </div>
//                     <small className="form-text text-muted">At least 8 characters with numbers and symbols</small>
//                   </div>

//                   <div className="form-outline">
//                     <input
//                       type={showPassword2 ? 'text' : 'password'}
//                       id="password2"
//                       name="password2"
//                       className={`form-control ${errors.password2 ? 'is-invalid' : formData.password2 ? 'is-valid' : ''}`}
//                       value={formData.password2}
//                       onChange={handleChange}
//                       required
//                     />
//                     <label className="form-label" htmlFor="password2">Confirm Password</label>
//                     <i
//                       className={`bi ${showPassword2 ? 'bi-eye' : 'bi-eye-slash'} password-toggle`}
//                       onClick={() => setShowPassword2(!showPassword2)}
//                     />
//                     {errors.password2 && <div className="invalid-feedback">{errors.password2}</div>}
//                   </div>

//                   <div className="form-check d-flex justify-content-start mb-4">
//                     <input
//                       className="form-check-input me-2"
//                       type="checkbox"
//                       id="termsCheck"
//                       checked={acceptedTerms}
//                       onChange={(e) => setAcceptedTerms(e.target.checked)}
//                       required
//                     />
//                     <label className="form-check-label" htmlFor="termsCheck">
//                       I agree to the <a href="#!" className="terms-link">Terms of Service</a> and <a href="#!" className="terms-link">Privacy Policy</a>
//                     </label>
//                   </div>
//                   {errors.terms && <div className="invalid-feedback mb-3">{errors.terms}</div>}

//                   <div className="d-flex justify-content-center">
//                     <button type="submit" className="btn btn-success btn-block btn-lg gradient-custom-4 text-white" disabled={loading}>
//                       {loading ? (
//                         <>
//                           <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
//                           Creating account...
//                         </>
//                       ) : (
//                         'Register Now'
//                       )}
//                     </button>
//                   </div>

//                   <p className="text-center mt-4 mb-0">
//                     Already have an account? <Link to="/auth/login" className="login-link">Sign in here</Link>
//                   </p>
//                 </form>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default RegisterForm;

//-------------------------------------------------------end1

// import React, { useState, useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap-icons/font/bootstrap-icons.css';

// const RegisterForm = () => {
//   const [formData, setFormData] = useState({
//     name: '',
//     email: '',
//     password: '',
//     password2: '',
//     isAdmin: true
//   });
//   const [errors, setErrors] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [showPassword2, setShowPassword2] = useState(false);
//   const [passwordStrength, setPasswordStrength] = useState({
//     width: '0%',
//     color: '#e74c3c'
//   });
//   const [acceptedTerms, setAcceptedTerms] = useState(false);
//   const [message, setMessage] = useState('');
//   const [error, setError] = useState('');
//   const navigate = useNavigate();

//   const api = axios.create({
//     baseURL: process.env.REACT_APP_API_BASE_URL,
//     withCredentials: true,
//   });

//   useEffect(() => {
//     document.getElementById('name')?.focus();
//   }, []);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));

//     if (errors[name]) {
//       setErrors(prev => ({ ...prev, [name]: '' }));
//     }

//     if (name === 'password') {
//       calculatePasswordStrength(value);
//     }
//   };

//   const calculatePasswordStrength = (password) => {
//     let strength = 0;
//     if (password.length >= 8) strength += 1;
//     if (password.length >= 12) strength += 1;
//     if (/\d/.test(password)) strength += 1;
//     if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
//     if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;

//     let width = 0;
//     let color = '#e74c3c';

//     if (strength === 0) {
//       width = 0;
//     } else if (strength <= 2) {
//       width = 33;
//       color = '#e74c3c';
//     } else if (strength === 3) {
//       width = 66;
//       color = '#f39c12';
//     } else {
//       width = 100;
//       color = '#2ecc71';
//     }

//     setPasswordStrength({ width, color });
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     let isValid = true;

//     if (!formData.name.trim()) {
//       newErrors.name = 'Please enter your full name';
//       isValid = false;
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(formData.email)) {
//       newErrors.email = 'Please enter a valid email address';
//       isValid = false;
//     }

//     if (formData.password.length < 8) {
//       newErrors.password = 'Password must be at least 8 characters';
//       isValid = false;
//     }

//     if (formData.password !== formData.password2) {
//       newErrors.password2 = 'Passwords do not match';
//       isValid = false;
//     }

//     if (!acceptedTerms) {
//       newErrors.terms = 'You must agree to the terms';
//       isValid = false;
//     }

//     setErrors(newErrors);
//     return isValid;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!validateForm()) return;

//     setLoading(true);
//     setError('');
//     setMessage('');

//     try {
//       const response = await api.post('/api/User/register', formData);

//       setLoading(false);

//       if (response.data.success) {
//         setMessage('Registration successful! Please check your email to verify your account.');
//         setTimeout(() => {
//           navigate('/auth/login');
//         }, 3000);
//       } else {
//         setError(response.data.message || 'Registration failed');
//       }
//     } catch (err) {
//       setLoading(false);
//       setError(err.response?.data?.message || err.message || 'Registration failed');
//     }
//   };

//   // ---------- Styles matching the Login page (NO SCROLL) ----------
//   const styles = {
//     container: {
//       minHeight: '100vh',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//       padding: '15px',
//       fontFamily: "'Inter', -apple-system, sans-serif",
//     },
//     card: {
//       background: '#ffffff',
//       borderRadius: '24px',
//       padding: '28px 35px 25px',
//       boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
//       maxWidth: '560px',
//       width: '100%',
//     },
//     header: {
//       textAlign: 'center',
//       marginBottom: '14px',
//     },
//     logo: {
//       width: '90px',
//       height: '90px',
//       margin: '0 auto 6px',
//       display: 'block',
//       objectFit: 'contain',
//     },
//     title: {
//       fontSize: '20px',
//       fontWeight: '700',
//       color: '#1a202c',
//       margin: '0 0 1px',
//       letterSpacing: '-0.5px',
//     },
//     subtitle: {
//       fontSize: '12px',
//       color: '#718096',
//       margin: 0,
//     },
//     tabs: {
//       display: 'flex',
//       background: '#f0f2f5',
//       borderRadius: '10px',
//       padding: '3px',
//       marginBottom: '18px',
//     },
//     tab: {
//       flex: 1,
//       textAlign: 'center',
//       padding: '7px 0',
//       borderRadius: '8px',
//       fontWeight: '600',
//       fontSize: '13px',
//       textDecoration: 'none',
//       transition: 'all 0.2s',
//       color: '#4a5568',
//     },
//     activeTab: {
//       background: '#667eea',
//       color: '#ffffff',
//     },
//     welcome: {
//       fontSize: '18px',
//       fontWeight: '600',
//       color: '#1a202c',
//       margin: '0 0 2px',
//     },
//     welcomeSub: {
//       fontSize: '12px',
//       color: '#718096',
//       margin: '0 0 16px',
//     },
//     formRow: {
//       display: 'grid',
//       gridTemplateColumns: '1fr 1fr',
//       gap: '12px',
//       marginBottom: '2px',
//     },
//     field: {
//       marginBottom: '10px',
//     },
//     fieldFull: {
//       marginBottom: '10px',
//       gridColumn: '1 / -1',
//     },
//     label: {
//       display: 'block',
//       fontWeight: '500',
//       color: '#2d3748',
//       fontSize: '12px',
//       marginBottom: '4px',
//     },
//     input: {
//       width: '100%',
//       padding: '8px 12px',
//       border: '2px solid #e2e8f0',
//       borderRadius: '10px',
//       fontSize: '13px',
//       outline: 'none',
//       transition: 'all 0.2s',
//       backgroundColor: '#f7fafc',
//       boxSizing: 'border-box',
//       color: '#2d3748',
//       height: '38px',
//     },
//     inputFocus: {
//       borderColor: '#667eea',
//       backgroundColor: '#fff',
//       boxShadow: '0 0 0 3px rgba(102,126,234,0.1)',
//     },
//     passwordWrapper: {
//       position: 'relative',
//     },
//     eyeButton: {
//       position: 'absolute',
//       right: '10px',
//       top: '50%',
//       transform: 'translateY(-50%)',
//       background: 'none',
//       border: 'none',
//       cursor: 'pointer',
//       color: '#a0aec0',
//       fontSize: '16px',
//       padding: '4px',
//     },
//     strengthMeter: {
//       marginTop: '4px',
//       height: '3px',
//       backgroundColor: '#e2e8f0',
//       borderRadius: '2px',
//       overflow: 'hidden',
//     },
//     strengthBar: {
//       height: '100%',
//       transition: 'width 0.3s ease, background-color 0.3s ease',
//     },
//     terms: {
//       display: 'flex',
//       alignItems: 'flex-start',
//       gap: '8px',
//       fontSize: '12px',
//       color: '#4a5568',
//       marginBottom: '12px',
//       cursor: 'pointer',
//     },
//     termsCheck: {
//       marginTop: '1px',
//       width: '14px',
//       height: '14px',
//       accentColor: '#667eea',
//       cursor: 'pointer',
//       flexShrink: 0,
//     },
//     registerButton: {
//       width: '100%',
//       padding: '10px',
//       background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//       color: '#fff',
//       border: 'none',
//       borderRadius: '10px',
//       fontSize: '14px',
//       fontWeight: '600',
//       cursor: 'pointer',
//       transition: 'all 0.3s',
//       marginTop: '2px',
//       height: '42px',
//     },
//     loginText: {
//       textAlign: 'center',
//       marginTop: '14px',
//       fontSize: '13px',
//       color: '#718096',
//     },
//     loginLink: {
//       color: '#667eea',
//       fontWeight: '600',
//       textDecoration: 'none',
//     },
//     message: {
//       backgroundColor: '#d4edda',
//       color: '#155724',
//       padding: '8px 12px',
//       borderRadius: '8px',
//       marginBottom: '12px',
//       fontSize: '12px',
//       border: '1px solid #c3e6cb',
//     },
//     errorMsg: {
//       backgroundColor: '#fed7d7',
//       color: '#9b2c2c',
//       padding: '8px 12px',
//       borderRadius: '8px',
//       marginBottom: '12px',
//       fontSize: '12px',
//       border: '1px solid #feb2b2',
//     },
//     fieldError: {
//       color: '#e53e3e',
//       fontSize: '11px',
//       marginTop: '3px',
//     },
//     strengthHint: {
//       display: 'block',
//       marginTop: '3px',
//       color: '#718096',
//       fontSize: '10px',
//     },
//   };

//   return (
//     <div style={styles.container}>
//       <div style={styles.card}>
//         {/* Header with logo and title */}
//         <div style={styles.header}>
//           <img
//             src="/logo/logo.png"
//             alt="Company Logo"
//             style={styles.logo}
//           />
//           <h1 style={styles.title}>Registration</h1>
//         </div>

//         {/* Tabs */}
//         {/* <div style={styles.tabs}>
//           <Link to="/auth/login" style={styles.tab}>
//             Login
//           </Link>
//           <Link to="/auth/register" style={{ ...styles.tab, ...styles.activeTab }}>
//             Register
//           </Link>
//         </div> */}

//         {/* Messages */}
//         {message && <div style={styles.message}>{message}</div>}
//         {error && <div style={styles.errorMsg}>{error}</div>}

//         {/* Form */}
//         <form onSubmit={handleSubmit}>
//           {/* 2-Column Grid for Name and Email */}
//           <div style={styles.formRow}>
//             {/* Full Name */}
//             <div style={styles.field}>
//               <label style={styles.label}>Full Name</label>
//               <input
//                 id="name"
//                 name="name"
//                 type="text"
//                 value={formData.name}
//                 onChange={handleChange}
//                 placeholder="Enter full name"
//                 style={{
//                   ...styles.input,
//                   borderColor: errors.name ? '#fc8181' : '#e2e8f0'
//                 }}
//                 onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                 onBlur={(e) => {
//                   e.target.style.borderColor = errors.name ? '#fc8181' : '#e2e8f0';
//                   e.target.style.backgroundColor = '#f7fafc';
//                   e.target.style.boxShadow = 'none';
//                 }}
//                 required
//               />
//               {errors.name && <div style={styles.fieldError}>{errors.name}</div>}
//             </div>

//             {/* Email */}
//             <div style={styles.field}>
//               <label style={styles.label}>Email Address</label>
//               <input
//                 name="email"
//                 type="email"
//                 value={formData.email}
//                 onChange={handleChange}
//                 placeholder="Enter email"
//                 style={{
//                   ...styles.input,
//                   borderColor: errors.email ? '#fc8181' : '#e2e8f0'
//                 }}
//                 onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                 onBlur={(e) => {
//                   e.target.style.borderColor = errors.email ? '#fc8181' : '#e2e8f0';
//                   e.target.style.backgroundColor = '#f7fafc';
//                   e.target.style.boxShadow = 'none';
//                 }}
//                 required
//               />
//               {errors.email && <div style={styles.fieldError}>{errors.email}</div>}
//             </div>
//           </div>

//           {/* 2-Column Grid for Password and Confirm Password */}
//           <div style={styles.formRow}>
//             {/* Password */}
//             <div style={styles.field}>
//               <label style={styles.label}>Password</label>
//               <div style={styles.passwordWrapper}>
//                 <input
//                   name="password"
//                   type={showPassword ? 'text' : 'password'}
//                   value={formData.password}
//                   onChange={handleChange}
//                   placeholder="Create password"
//                   style={{
//                     ...styles.input,
//                     borderColor: errors.password ? '#fc8181' : '#e2e8f0'
//                   }}
//                   onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                   onBlur={(e) => {
//                     e.target.style.borderColor = errors.password ? '#fc8181' : '#e2e8f0';
//                     e.target.style.backgroundColor = '#f7fafc';
//                     e.target.style.boxShadow = 'none';
//                   }}
//                   required
//                 />
//                 <button
//                   type="button"
//                   style={styles.eyeButton}
//                   onClick={() => setShowPassword(!showPassword)}
//                 >
//                   <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
//                 </button>
//               </div>

//               {/* Password Strength Meter */}
//               {formData.password && (
//                 <div style={styles.strengthMeter}>
//                   <div style={{
//                     ...styles.strengthBar,
//                     width: passwordStrength.width,
//                     backgroundColor: passwordStrength.color
//                   }} />
//                 </div>
//               )}
//               <small style={styles.strengthHint}>
//                 8+ chars with numbers & symbols
//               </small>
//               {errors.password && <div style={styles.fieldError}>{errors.password}</div>}
//             </div>

//             {/* Confirm Password */}
//             <div style={styles.field}>
//               <label style={styles.label}>Confirm Password</label>
//               <div style={styles.passwordWrapper}>
//                 <input
//                   name="password2"
//                   type={showPassword2 ? 'text' : 'password'}
//                   value={formData.password2}
//                   onChange={handleChange}
//                   placeholder="Confirm password"
//                   style={{
//                     ...styles.input,
//                     borderColor: errors.password2 ? '#fc8181' : '#e2e8f0'
//                   }}
//                   onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                   onBlur={(e) => {
//                     e.target.style.borderColor = errors.password2 ? '#fc8181' : '#e2e8f0';
//                     e.target.style.backgroundColor = '#f7fafc';
//                     e.target.style.boxShadow = 'none';
//                   }}
//                   required
//                 />
//                 <button
//                   type="button"
//                   style={styles.eyeButton}
//                   onClick={() => setShowPassword2(!showPassword2)}
//                 >
//                   <i className={`bi ${showPassword2 ? 'bi-eye-slash' : 'bi-eye'}`}></i>
//                 </button>
//               </div>
//               {errors.password2 && <div style={styles.fieldError}>{errors.password2}</div>}
//             </div>
//           </div>

//           {/* Terms - Full Width */}
//           <div style={styles.fieldFull}>
//             <label style={styles.terms}>
//               <input
//                 type="checkbox"
//                 checked={acceptedTerms}
//                 onChange={(e) => setAcceptedTerms(e.target.checked)}
//                 style={styles.termsCheck}
//               />
//               <span>
//                 I agree to the <a href="#!" style={{ color: '#667eea', textDecoration: 'none' }}>Terms</a> & <a href="#!" style={{ color: '#667eea', textDecoration: 'none' }}>Privacy Policy</a>
//               </span>
//             </label>
//             {errors.terms && <div style={styles.fieldError}>{errors.terms}</div>}
//           </div>

//           {/* Register Button - Full Width */}
//           <button
//             type="submit"
//             style={styles.registerButton}
//             disabled={loading}
//             onMouseEnter={(e) => {
//               if (!loading) {
//                 e.target.style.transform = 'translateY(-1px)';
//                 e.target.style.boxShadow = '0 6px 20px rgba(102,126,234,0.3)';
//               }
//             }}
//             onMouseLeave={(e) => {
//               e.target.style.transform = 'translateY(0)';
//               e.target.style.boxShadow = 'none';
//             }}
//           >
//             {loading ? (
//               <>
//                 <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
//                 Creating account...
//               </>
//             ) : (
//               'Register Now'
//             )}
//           </button>

//           {/* Login Link - Full Width */}
//           <p style={styles.loginText}>
//             Already have an account?{' '}
//             <Link to="/auth/login" style={styles.loginLink}>
//               Sign in here
//             </Link>
//           </p>
//         </form>
//       </div>

//       <style>{`
//         a:hover {
//           color: #5a67d8 !important;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default RegisterForm;

//------------------------------------------------------end2

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password2: '',
    isAdmin: true
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    width: '0%',
    color: '#e74c3c'
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
  });

  useEffect(() => {
    document.getElementById('name')?.focus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (name === 'password') {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;

    let width = 0;
    let color = '#e74c3c';

    if (strength === 0) {
      width = 0;
    } else if (strength <= 2) {
      width = 33;
      color = '#e74c3c';
    } else if (strength === 3) {
      width = 66;
      color = '#f39c12';
    } else {
      width = 100;
      color = '#2ecc71';
    }

    setPasswordStrength({ width, color });
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = 'Please enter your full name';
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    if (formData.password !== formData.password2) {
      newErrors.password2 = 'Passwords do not match';
      isValid = false;
    }

    if (!acceptedTerms) {
      newErrors.terms = 'You must agree to the terms';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/api/User/register', formData);

      setLoading(false);

      if (response.data.success) {
        setMessage('Registration successful! Please check your email to verify your account.');
        setTimeout(() => {
          navigate('/auth/login');
        }, 3000);
      } else {
        setError(response.data.message || 'Registration failed');
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || err.message || 'Registration failed');
    }
  };

  // ---------- Styles matching the Akaunting-style Login page ----------
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
      maxWidth: '450px',
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
    formRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
    },
    field: {
      marginBottom: '1.25rem',
    },
    fieldFull: {
      marginBottom: '1.25rem',
      gridColumn: '1 / -1',
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
    strengthMeter: {
      marginTop: '6px',
      height: '4px',
      backgroundColor: '#e2e8f0',
      borderRadius: '2px',
      overflow: 'hidden',
    },
    strengthBar: {
      height: '100%',
      transition: 'width 0.3s ease, background-color 0.3s ease',
    },
    strengthHint: {
      display: 'block',
      marginTop: '4px',
      color: '#718096',
      fontSize: '0.75rem',
    },
    terms: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      fontSize: '0.85rem',
      color: '#4a5568',
      cursor: 'pointer',
    },
    termsCheck: {
      marginTop: '2px',
      width: '16px',
      height: '16px',
      accentColor: '#2a4d7a',
      cursor: 'pointer',
      flexShrink: 0,
    },
    registerButton: {
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
      height: '46px',
      marginTop: '4px',
    },
    registerButtonHover: {
      background: '#1e3a5f',
    },
    loginText: {
      textAlign: 'center',
      marginTop: '1.5rem',
      fontSize: '0.9rem',
      color: '#718096',
    },
    loginLink: {
      color: '#2a4d7a',
      fontWeight: '600',
      textDecoration: 'none',
    },
    message: {
      backgroundColor: '#d4edda',
      color: '#155724',
      padding: '10px 14px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '0.85rem',
      border: '1px solid #c3e6cb',
    },
    errorMsg: {
      backgroundColor: '#fed7d7',
      color: '#9b2c2c',
      padding: '10px 14px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '0.85rem',
      border: '1px solid #feb2b2',
    },
    fieldError: {
      color: '#e53e3e',
      fontSize: '0.8rem',
      marginTop: '4px',
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
      formRow: {
        gridTemplateColumns: '1fr',
        gap: '0',
      },
      heroTitle: {
        fontSize: '2rem',
      },
      featureGrid: {
        gridTemplateColumns: '1fr',
        gap: '12px',
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
          <h2 style={styles.cardTitle}>Create Account</h2>
          <p style={styles.cardSubtitle}>Sign up to get started</p>

          {/* Messages */}
          {message && <div style={styles.message}>{message}</div>}
          {error && <div style={styles.errorMsg}>{error}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* 2-Column Grid for Name and Email */}
            <div style={styles.formRow}>
              {/* Full Name */}
              <div style={styles.field}>
                <label style={styles.label}>Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  style={{
                    ...styles.input,
                    borderColor: errors.name ? '#fc8181' : '#e2e8f0'
                  }}
                  onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.name ? '#fc8181' : '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
                {errors.name && <div style={styles.fieldError}>{errors.name}</div>}
              </div>

              {/* Email */}
              <div style={styles.field}>
                <label style={styles.label}>Email Address</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                  style={{
                    ...styles.input,
                    borderColor: errors.email ? '#fc8181' : '#e2e8f0'
                  }}
                  onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.email ? '#fc8181' : '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
                {errors.email && <div style={styles.fieldError}>{errors.email}</div>}
              </div>
            </div>

            {/* 2-Column Grid for Password and Confirm Password */}
            <div style={styles.formRow}>
              {/* Password */}
              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create password"
                    style={{
                      ...styles.input,
                      borderColor: errors.password ? '#fc8181' : '#e2e8f0'
                    }}
                    onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.password ? '#fc8181' : '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                    required
                  />
                  <button
                    type="button"
                    style={styles.eyeButton}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
                </div>

                {/* Password Strength Meter */}
                {formData.password && (
                  <div style={styles.strengthMeter}>
                    <div style={{
                      ...styles.strengthBar,
                      width: passwordStrength.width,
                      backgroundColor: passwordStrength.color
                    }} />
                  </div>
                )}
                <small style={styles.strengthHint}>
                  8+ characters with numbers & symbols
                </small>
                {errors.password && <div style={styles.fieldError}>{errors.password}</div>}
              </div>

              {/* Confirm Password */}
              <div style={styles.field}>
                <label style={styles.label}>Confirm Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    name="password2"
                    type={showPassword2 ? 'text' : 'password'}
                    value={formData.password2}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    style={{
                      ...styles.input,
                      borderColor: errors.password2 ? '#fc8181' : '#e2e8f0'
                    }}
                    onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.password2 ? '#fc8181' : '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                    required
                  />
                  <button
                    type="button"
                    style={styles.eyeButton}
                    onClick={() => setShowPassword2(!showPassword2)}
                  >
                    <i className={`bi ${showPassword2 ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
                </div>
                {errors.password2 && <div style={styles.fieldError}>{errors.password2}</div>}
              </div>
            </div>

            {/* Terms - Full Width */}
            <div style={styles.fieldFull}>
              <label style={styles.terms}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  style={styles.termsCheck}
                />
                <span>
                  I agree to the <a href="#!" style={{ color: '#2a4d7a', textDecoration: 'none' }}>Terms</a> & <a href="/privacy-policy" style={{ color: '#2a4d7a', textDecoration: 'none' }}>Privacy Policy</a>
                </span>
              </label>
              {errors.terms && <div style={styles.fieldError}>{errors.terms}</div>}
            </div>

            {/* Register Button - Full Width */}
            <button
              type="submit"
              style={styles.registerButton}
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = styles.registerButtonHover.background;
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = styles.registerButton.background;
              }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating account...
                </>
              ) : (
                'Register Now'
              )}
            </button>

            {/* Login Link - Full Width */}
            <p style={styles.loginText}>
              Already have an account?{' '}
              <Link to="/auth/login" style={styles.loginLink}>
                Sign in here
              </Link>
            </p>
          </form>
        </div>
      </div>

      <style>{`
        a:hover {
          color: #1e3a5f !important;
        }
        @media (max-width: 992px) {
          .bi { font-size: 1.2rem; }
        }
      `}</style>
    </div>
  );
};

export default RegisterForm;