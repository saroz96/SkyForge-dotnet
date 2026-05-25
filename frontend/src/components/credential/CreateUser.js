// import React, { useState, useEffect } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';
// import { FaUserPlus, FaEye, FaEyeSlash, FaArrowLeft, FaBuilding, FaCalendarAlt } from 'react-icons/fa';
// import Header from '../retailer/Header';
// import NotificationToast from '../NotificationToast';
// import Skeleton from 'react-loading-skeleton';
// import 'react-loading-skeleton/dist/skeleton.css';

// const CreateUser = () => {
//     const navigate = useNavigate();
//     const [formData, setFormData] = useState({
//         name: '',
//         email: '',
//         password: '',
//         password2: '',
//         role: 'User'
//     });
//     const [companyInfo, setCompanyInfo] = useState(null);
//     const [currentFiscalYear, setCurrentFiscalYear] = useState(null);
//     const [currentCompanyName, setCurrentCompanyName] = useState('');
//     const [availableRoles, setAvailableRoles] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [passwordStrength, setPasswordStrength] = useState({
//         length: false,
//         uppercase: false,
//         lowercase: false,
//         number: false,
//         strength: 0
//     });
//     const [showPassword, setShowPassword] = useState({
//         password: false,
//         password2: false
//     });
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success',
//         duration: 3000
//     });
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [errors, setErrors] = useState({});

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // Add authorization header to all requests
//     api.interceptors.request.use(
//         (config) => {
//             const token = localStorage.getItem('token');
//             if (token) {
//                 config.headers.Authorization = `Bearer ${token}`;
//             }
//             return config;
//         },
//         (error) => {
//             return Promise.reject(error);
//         }
//     );

//     // Fetch form data on component mount
//     useEffect(() => {
//         const fetchFormData = async () => {
//             try {
//                 setLoading(true);
//                 const response = await api.get('/api/user/admin/create-user/new');
                
//                 if (response.data.success) {
//                     const data = response.data.data;
//                     setCompanyInfo(data.company);
//                     setCurrentFiscalYear(data.currentFiscalYear);
//                     setCurrentCompanyName(data.currentCompanyName);
//                     setAvailableRoles(data.availableRoles || []);
//                 } else {
//                     setNotification({
//                         show: true,
//                         message: response.data.error || 'Failed to load form data',
//                         type: 'error'
//                     });
//                     if (response.status === 403) {
//                         setTimeout(() => navigate('/dashboard'), 2000);
//                     }
//                 }
//             } catch (err) {
//                 console.error('Error fetching form data:', err);
//                 const errorMessage = err.response?.data?.error || 'Failed to load form data';
//                 setNotification({
//                     show: true,
//                     message: errorMessage,
//                     type: 'error'
//                 });
//                 if (err.response?.status === 403) {
//                     setTimeout(() => navigate('/dashboard'), 2000);
//                 } else if (err.response?.status === 401) {
//                     setTimeout(() => navigate('/login'), 2000);
//                 }
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchFormData();
//     }, [navigate]);

//     const handleInputChange = (e) => {
//         const { name, value } = e.target;
//         setFormData(prev => ({ ...prev, [name]: value }));

//         // Clear field-specific error when typing
//         if (errors[name]) {
//             setErrors(prev => ({ ...prev, [name]: '' }));
//         }

//         // Check password strength when password changes
//         if (name === 'password') {
//             checkPasswordStrength(value);
//         }
//     };

//     const checkPasswordStrength = (password) => {
//         const strength = {
//             length: password.length >= 8,
//             uppercase: /[A-Z]/.test(password),
//             lowercase: /[a-z]/.test(password),
//             number: /\d/.test(password)
//         };

//         const strengthScore = Object.values(strength).filter(Boolean).length;

//         setPasswordStrength({
//             ...strength,
//             strength: strengthScore
//         });
//     };

//     const togglePasswordVisibility = (field) => {
//         setShowPassword(prev => ({
//             ...prev,
//             [field]: !prev[field]
//         }));
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setIsSubmitting(true);
//         setErrors({});

//         // Validate passwords match
//         if (formData.password !== formData.password2) {
//             setErrors(prev => ({ ...prev, password2: 'Passwords do not match' }));
//             setNotification({
//                 show: true,
//                 message: 'Passwords do not match',
//                 type: 'error',
//                 duration: 3000
//             });
//             setIsSubmitting(false);
//             return;
//         }

//         // Validate password strength
//         if (passwordStrength.strength < 4) {
//             setErrors(prev => ({ ...prev, password: 'Password must meet all requirements' }));
//             setNotification({
//                 show: true,
//                 message: 'Password does not meet security requirements',
//                 type: 'error',
//                 duration: 3000
//             });
//             setIsSubmitting(false);
//             return;
//         }

//         try {
//             const response = await api.post('/api/user/admin/create-user', formData);
            
//             if (response.data.success) {
//                 setNotification({
//                     show: true,
//                     message: response.data.message || 'User created successfully',
//                     type: 'success',
//                     duration: 3000
//                 });
                
//                 // Reset form on success
//                 setFormData({
//                     name: '',
//                     email: '',
//                     password: '',
//                     password2: '',
//                     role: 'User'
//                 });
//                 setPasswordStrength({
//                     length: false,
//                     uppercase: false,
//                     lowercase: false,
//                     number: false,
//                     strength: 0
//                 });
                
//                 // Redirect to user list after 2 seconds
//                 setTimeout(() => {
//                     navigate('/auth/admin/users/list');
//                 }, 2000);
//             }
//         } catch (err) {
//             console.error('Error creating user:', err);
            
//             if (err.response?.data?.errors) {
//                 // Handle validation errors from backend
//                 const validationErrors = {};
//                 err.response.data.errors.forEach(error => {
//                     validationErrors[error.field] = error.msg;
//                 });
//                 setErrors(validationErrors);
                
//                 setNotification({
//                     show: true,
//                     message: 'Please fix the validation errors',
//                     type: 'error',
//                     duration: 3000
//                 });
//             } else if (err.response?.data?.error) {
//                 setErrors({ general: err.response.data.error });
//                 setNotification({
//                     show: true,
//                     message: err.response.data.error,
//                     type: 'error',
//                     duration: 3000
//                 });
//             } else if (err.response?.data?.message) {
//                 setErrors({ general: err.response.data.message });
//                 setNotification({
//                     show: true,
//                     message: err.response.data.message,
//                     type: 'error',
//                     duration: 3000
//                 });
//             } else {
//                 setErrors({ general: 'An error occurred while creating the user' });
//                 setNotification({
//                     show: true,
//                     message: 'An error occurred while creating the user',
//                     type: 'error',
//                     duration: 3000
//                 });
//             }
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const getStrengthColor = () => {
//         switch (passwordStrength.strength) {
//             case 0: return 'bg-danger';
//             case 1: return 'bg-danger';
//             case 2: return 'bg-warning';
//             case 3: return 'bg-info';
//             case 4: return 'bg-success';
//             default: return 'bg-danger';
//         }
//     };

//     const getStrengthText = () => {
//         switch (passwordStrength.strength) {
//             case 0: return 'Very Weak';
//             case 1: return 'Weak';
//             case 2: return 'Fair';
//             case 3: return 'Good';
//             case 4: return 'Strong';
//             default: return 'Very Weak';
//         }
//     };

//     const LoadingSkeleton = () => (
//         <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//             <div className="card-header bg-white py-0">
//                 <Skeleton height={30} width={200} />
//             </div>
//             <div className="card-body p-2 p-md-3">
//                 <Skeleton count={6} height={40} className="mb-3" />
//                 <div className="d-flex justify-content-between">
//                     <Skeleton height={30} width={100} />
//                     <Skeleton height={30} width={100} />
//                 </div>
//             </div>
//         </div>
//     );

//     if (loading) {
//         return (
//             <div className='container-fluid'>
//                 <Header />
//                 <div className="container mt-4">
//                     <div className="row justify-content-center">
//                         <div className="col-lg-8">
//                             <LoadingSkeleton />
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className='container-fluid'>
//             <Header />
//             <div className="container mt-4">
//                 <div className="row justify-content-center">
//                     <div className="col-lg-8">
//                         <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                             <div className="card-header bg-white py-0">
//                                 <h1 className="h4 mb-0 text-center text-primary">
//                                     <FaUserPlus className="me-2" />
//                                     Create a New User
//                                 </h1>
//                             </div>
//                             <div className="card-body p-2 p-md-3">
//                                 <form onSubmit={handleSubmit}>
//                                     {/* Name */}
//                                     <div className="mb-3">
//                                         <label htmlFor="name" className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Full Name <span className="text-danger">*</span></label>
//                                         <input
//                                             type="text"
//                                             className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
//                                             id="name"
//                                             name="name"
//                                             value={formData.name}
//                                             onChange={handleInputChange}
//                                             required
//                                             autoFocus
//                                             style={{ height: '32px', fontSize: '0.875rem' }}
//                                         />
//                                         {errors.name && <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>{errors.name}</div>}
//                                     </div>

//                                     {/* Email */}
//                                     <div className="mb-3">
//                                         <label htmlFor="email" className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Email Address <span className="text-danger">*</span></label>
//                                         <input
//                                             type="email"
//                                             className={`form-control form-control-sm ${errors.email ? 'is-invalid' : ''}`}
//                                             id="email"
//                                             name="email"
//                                             value={formData.email}
//                                             onChange={handleInputChange}
//                                             required
//                                             autoComplete="off"
//                                             style={{ height: '32px', fontSize: '0.875rem' }}
//                                         />
//                                         {errors.email && <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>{errors.email}</div>}
//                                     </div>

//                                     {/* Password */}
//                                     <div className="mb-3">
//                                         <label htmlFor="password" className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Password <span className="text-danger">*</span></label>
//                                         <div className="input-group">
//                                             <input
//                                                 type={showPassword.password ? "text" : "password"}
//                                                 className={`form-control form-control-sm ${errors.password ? 'is-invalid' : ''}`}
//                                                 id="password"
//                                                 name="password"
//                                                 value={formData.password}
//                                                 onChange={handleInputChange}
//                                                 required
//                                                 autoComplete="off"
//                                                 style={{ height: '32px', fontSize: '0.875rem' }}
//                                             />
//                                             <button
//                                                 className="btn btn-outline-secondary btn-sm"
//                                                 type="button"
//                                                 onClick={() => togglePasswordVisibility('password')}
//                                                 style={{ height: '32px' }}
//                                             >
//                                                 {showPassword.password ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
//                                             </button>
//                                         </div>
                                        
//                                         {formData.password && (
//                                             <>
//                                                 <div className="mt-2">
//                                                     <div className="progress" style={{ height: '4px' }}>
//                                                         <div
//                                                             className={`progress-bar ${getStrengthColor()}`}
//                                                             role="progressbar"
//                                                             style={{ width: `${passwordStrength.strength * 25}%` }}
//                                                         ></div>
//                                                     </div>
//                                                     <small className="text-muted" style={{ fontSize: '0.7rem' }}>
//                                                         Password strength: {getStrengthText()}
//                                                     </small>
//                                                 </div>
//                                                 <div className="password-requirements mt-2">
//                                                     <div className={`requirement ${passwordStrength.length ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
//                                                         <i className={`fas ${passwordStrength.length ? 'fa-check-circle' : 'fa-circle'} me-1`}></i>
//                                                         At least 8 characters
//                                                     </div>
//                                                     <div className={`requirement ${passwordStrength.uppercase ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
//                                                         <i className={`fas ${passwordStrength.uppercase ? 'fa-check-circle' : 'fa-circle'} me-1`}></i>
//                                                         At least 1 uppercase letter
//                                                     </div>
//                                                     <div className={`requirement ${passwordStrength.lowercase ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
//                                                         <i className={`fas ${passwordStrength.lowercase ? 'fa-check-circle' : 'fa-circle'} me-1`}></i>
//                                                         At least 1 lowercase letter
//                                                     </div>
//                                                     <div className={`requirement ${passwordStrength.number ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
//                                                         <i className={`fas ${passwordStrength.number ? 'fa-check-circle' : 'fa-circle'} me-1`}></i>
//                                                         At least 1 number
//                                                     </div>
//                                                 </div>
//                                             </>
//                                         )}
//                                         {errors.password && <div className="invalid-feedback d-block" style={{ fontSize: '0.75rem' }}>{errors.password}</div>}
//                                     </div>

//                                     {/* Confirm Password */}
//                                     <div className="mb-3">
//                                         <label htmlFor="password2" className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Confirm Password <span className="text-danger">*</span></label>
//                                         <div className="input-group">
//                                             <input
//                                                 type={showPassword.password2 ? "text" : "password"}
//                                                 className={`form-control form-control-sm ${errors.password2 ? 'is-invalid' : ''}`}
//                                                 id="password2"
//                                                 name="password2"
//                                                 value={formData.password2}
//                                                 onChange={handleInputChange}
//                                                 required
//                                                 style={{ height: '32px', fontSize: '0.875rem' }}
//                                             />
//                                             <button
//                                                 className="btn btn-outline-secondary btn-sm"
//                                                 type="button"
//                                                 onClick={() => togglePasswordVisibility('password2')}
//                                                 style={{ height: '32px' }}
//                                             >
//                                                 {showPassword.password2 ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
//                                             </button>
//                                         </div>
//                                         {errors.password2 && <div className="invalid-feedback d-block" style={{ fontSize: '0.75rem' }}>{errors.password2}</div>}
//                                     </div>

//                                     {/* Role */}
//                                     <div className="mb-4">
//                                         <label htmlFor="role" className="form-label text-muted" style={{ fontSize: '0.75rem' }}>User Role <span className="text-danger">*</span></label>
//                                         <select
//                                             className={`form-select form-select-sm ${errors.role ? 'is-invalid' : ''}`}
//                                             id="role"
//                                             name="role"
//                                             value={formData.role}
//                                             onChange={handleInputChange}
//                                             required
//                                             style={{ height: '36px', fontSize: '0.875rem' }}
//                                         >
//                                             {availableRoles.length > 0 ? (
//                                                 availableRoles.map(role => (
//                                                     <option key={role.id} value={role.name}>{role.name}</option>
//                                                 ))
//                                             ) : (
//                                                 <>
//                                                     <option value="User">User</option>
//                                                     <option value="Sales">Sales Department</option>
//                                                     <option value="Purchase">Purchase Department</option>
//                                                     <option value="Account">Account Department</option>
//                                                     <option value="Supervisor">Supervisor</option>
//                                                     <option value="Admin">Admin</option>
//                                                 </>
//                                             )}
//                                         </select>
//                                         {errors.role && <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>{errors.role}</div>}
//                                     </div>

//                                     {errors.general && (
//                                         <div className="alert alert-danger alert-sm py-2 mb-3" style={{ fontSize: '0.75rem' }}>
//                                             {errors.general}
//                                         </div>
//                                     )}

//                                     <div className="d-flex justify-content-between">
//                                         <Link to="/auth/admin/users/list" className="btn btn-outline-primary btn-sm" style={{ height: '30px', padding: '0 16px', fontSize: '0.75rem' }}>
//                                             <FaArrowLeft className="me-1" size={12} />
//                                             Back to List
//                                         </Link>
//                                         <button
//                                             type="submit"
//                                             className="btn btn-primary btn-sm"
//                                             disabled={isSubmitting || (formData.password && passwordStrength.strength < 4)}
//                                             style={{ height: '30px', padding: '0 16px', fontSize: '0.75rem' }}
//                                         >
//                                             {isSubmitting ? (
//                                                 <>
//                                                     <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{ width: '12px', height: '12px' }}></span>
//                                                     Creating...
//                                                 </>
//                                             ) : (
//                                                 <>
//                                                     <FaUserPlus className="me-1" size={12} />
//                                                     Create User
//                                                 </>
//                                             )}
//                                         </button>
//                                     </div>
//                                 </form>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             <NotificationToast
//                 show={notification.show}
//                 message={notification.message}
//                 type={notification.type}
//                 duration={notification.duration}
//                 onClose={() => setNotification({ ...notification, show: false })}
//             />
//         </div>
//     );
// };

// export default CreateUser;

//------------------------------------------------------------end

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaUserPlus, FaEye, FaEyeSlash, FaArrowLeft, FaBuilding, FaCalendarAlt } from 'react-icons/fa';
import Header from '../retailer/Header';
import NotificationToast from '../NotificationToast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const CreateUser = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password2: '',
        role: 'User'
    });
    const [companyInfo, setCompanyInfo] = useState(null);
    const [currentFiscalYear, setCurrentFiscalYear] = useState(null);
    const [currentCompanyName, setCurrentCompanyName] = useState('');
    const [availableRoles, setAvailableRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [passwordStrength, setPasswordStrength] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        strength: 0
    });
    const [showPassword, setShowPassword] = useState({
        password: false,
        password2: false
    });
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

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

    // Fetch form data on component mount
    useEffect(() => {
        const fetchFormData = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/user/admin/create-user/new');
                
                if (response.data.success) {
                    const data = response.data.data;
                    setCompanyInfo(data.company);
                    setCurrentFiscalYear(data.currentFiscalYear);
                    setCurrentCompanyName(data.currentCompanyName);
                    setAvailableRoles(data.availableRoles || []);
                } else {
                    setNotification({
                        show: true,
                        message: response.data.error || 'Failed to load form data',
                        type: 'error',
                        duration: 3000
                    });
                    if (response.status === 403) {
                        setTimeout(() => navigate('/dashboard'), 2000);
                    }
                }
            } catch (err) {
                console.error('Error fetching form data:', err);
                const errorMessage = err.response?.data?.error || 'Failed to load form data';
                setNotification({
                    show: true,
                    message: errorMessage,
                    type: 'error',
                    duration: 3000
                });
                if (err.response?.status === 403) {
                    setTimeout(() => navigate('/dashboard'), 2000);
                } else if (err.response?.status === 401) {
                    setTimeout(() => navigate('/login'), 2000);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchFormData();
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear field-specific error when typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }

        // Check password strength when password changes
        if (name === 'password') {
            checkPasswordStrength(value);
        }
    };

    const checkPasswordStrength = (password) => {
        const strength = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password)
        };

        const strengthScore = Object.values(strength).filter(Boolean).length;

        setPasswordStrength({
            ...strength,
            strength: strengthScore
        });
    };

    const togglePasswordVisibility = (field) => {
        setShowPassword(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        // Validate passwords match
        if (formData.password !== formData.password2) {
            setErrors(prev => ({ ...prev, password2: 'Passwords do not match' }));
            setNotification({
                show: true,
                message: 'Passwords do not match',
                type: 'error',
                duration: 3000
            });
            setIsSubmitting(false);
            return;
        }

        // Validate password strength
        if (passwordStrength.strength < 4) {
            setErrors(prev => ({ ...prev, password: 'Password must meet all requirements' }));
            setNotification({
                show: true,
                message: 'Password does not meet security requirements',
                type: 'error',
                duration: 3000
            });
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await api.post('/api/user/admin/create-user', formData);
            
            if (response.data.success) {
                setNotification({
                    show: true,
                    message: response.data.message || 'User created successfully',
                    type: 'success',
                    duration: 3000
                });
                
                // Reset form on success
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    password2: '',
                    role: 'User'
                });
                setPasswordStrength({
                    length: false,
                    uppercase: false,
                    lowercase: false,
                    number: false,
                    strength: 0
                });
                
                // Redirect to user list after 2 seconds
                setTimeout(() => {
                    navigate('/auth/admin/users/list');
                }, 2000);
            }
        } catch (err) {
            console.error('Error creating user:', err);
            
            if (err.response?.data?.errors) {
                // Handle validation errors from backend
                const validationErrors = {};
                err.response.data.errors.forEach(error => {
                    validationErrors[error.field] = error.msg;
                });
                setErrors(validationErrors);
                
                setNotification({
                    show: true,
                    message: 'Please fix the validation errors',
                    type: 'error',
                    duration: 3000
                });
            } else if (err.response?.data?.error) {
                setErrors({ general: err.response.data.error });
                setNotification({
                    show: true,
                    message: err.response.data.error,
                    type: 'error',
                    duration: 3000
                });
            } else if (err.response?.data?.message) {
                setErrors({ general: err.response.data.message });
                setNotification({
                    show: true,
                    message: err.response.data.message,
                    type: 'error',
                    duration: 3000
                });
            } else {
                setErrors({ general: 'An error occurred while creating the user' });
                setNotification({
                    show: true,
                    message: 'An error occurred while creating the user',
                    type: 'error',
                    duration: 3000
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStrengthColor = () => {
        switch (passwordStrength.strength) {
            case 0: return 'bg-danger';
            case 1: return 'bg-danger';
            case 2: return 'bg-warning';
            case 3: return 'bg-info';
            case 4: return 'bg-success';
            default: return 'bg-danger';
        }
    };

    const getStrengthText = () => {
        switch (passwordStrength.strength) {
            case 0: return 'Very Weak';
            case 1: return 'Weak';
            case 2: return 'Fair';
            case 3: return 'Good';
            case 4: return 'Strong';
            default: return 'Very Weak';
        }
    };

    if (loading) {
        return (
            <div className='container-fluid'>
                <Header />
                <div className="container mt-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-6 col-md-8 col-sm-10">
                            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                                <div className="card-header bg-white py-0">
                                    <Skeleton height={30} width={200} />
                                </div>
                                <div className="card-body p-2 p-md-3">
                                    <Skeleton count={5} height={50} className="mb-3" />
                                    <div className="d-flex justify-content-between">
                                        <Skeleton height={30} width={100} />
                                        <Skeleton height={30} width={100} />
                                    </div>
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
                    <div className="col-lg-6 col-md-8 col-sm-10">
                        {/* Create User Form */}
                        <div className="card shadow-sm border-0">
                            <div className="card-header bg-white py-2">
                                <h5 className="mb-0">Create a New User</h5>
                            </div>
                            <div className="card-body p-3">
                                <form onSubmit={handleSubmit}>
                                    {/* Name */}
                                    <div className="mb-3">
                                        <label htmlFor="name" className="form-label" style={{ fontSize: '0.85rem' }}>
                                            Full Name <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            autoFocus
                                            style={{ height: '32px', fontSize: '0.85rem' }}
                                        />
                                        {errors.name && <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>{errors.name}</div>}
                                    </div>

                                    {/* Email */}
                                    <div className="mb-3">
                                        <label htmlFor="email" className="form-label" style={{ fontSize: '0.85rem' }}>
                                            Email Address <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            className={`form-control form-control-sm ${errors.email ? 'is-invalid' : ''}`}
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                            autoComplete="off"
                                            style={{ height: '32px', fontSize: '0.85rem' }}
                                        />
                                        {errors.email && <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>{errors.email}</div>}
                                    </div>

                                    {/* Password */}
                                    <div className="mb-3">
                                        <label htmlFor="password" className="form-label" style={{ fontSize: '0.85rem' }}>
                                            Password <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword.password ? "text" : "password"}
                                                className={`form-control form-control-sm ${errors.password ? 'is-invalid' : ''}`}
                                                id="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                required
                                                autoComplete="off"
                                                style={{ height: '32px', fontSize: '0.85rem' }}
                                            />
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                type="button"
                                                onClick={() => togglePasswordVisibility('password')}
                                                style={{ height: '32px' }}
                                            >
                                                {showPassword.password ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                            </button>
                                        </div>
                                        
                                        {formData.password && (
                                            <>
                                                <div className="mt-2">
                                                    <div className="progress" style={{ height: '4px' }}>
                                                        <div
                                                            className={`progress-bar ${getStrengthColor()}`}
                                                            role="progressbar"
                                                            style={{ width: `${passwordStrength.strength * 25}%` }}
                                                        ></div>
                                                    </div>
                                                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                        Password strength: {getStrengthText()}
                                                    </small>
                                                </div>
                                                
                                                {/* Password Requirements */}
                                                <div className="mt-2">
                                                    <div className={`requirement ${passwordStrength.length ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                                                        <i className={`fas ${passwordStrength.length ? 'fa-check-circle' : 'fa-circle'} me-1`}></i>
                                                        At least 8 characters
                                                    </div>
                                                    <div className={`requirement ${passwordStrength.uppercase ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                                                        <i className={`fas ${passwordStrength.uppercase ? 'fa-check-circle' : 'fa-circle'} me-1`}></i>
                                                        At least 1 uppercase letter
                                                    </div>
                                                    <div className={`requirement ${passwordStrength.lowercase ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                                                        <i className={`fas ${passwordStrength.lowercase ? 'fa-check-circle' : 'fa-circle'} me-1`}></i>
                                                        At least 1 lowercase letter
                                                    </div>
                                                    <div className={`requirement ${passwordStrength.number ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                                                        <i className={`fas ${passwordStrength.number ? 'fa-check-circle' : 'fa-circle'} me-1`}></i>
                                                        At least 1 number
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        {errors.password && <div className="invalid-feedback d-block" style={{ fontSize: '0.75rem' }}>{errors.password}</div>}
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="mb-3">
                                        <label htmlFor="password2" className="form-label" style={{ fontSize: '0.85rem' }}>
                                            Confirm Password <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword.password2 ? "text" : "password"}
                                                className={`form-control form-control-sm ${errors.password2 ? 'is-invalid' : ''}`}
                                                id="password2"
                                                name="password2"
                                                value={formData.password2}
                                                onChange={handleInputChange}
                                                required
                                                style={{ height: '32px', fontSize: '0.85rem' }}
                                            />
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                type="button"
                                                onClick={() => togglePasswordVisibility('password2')}
                                                style={{ height: '32px' }}
                                            >
                                                {showPassword.password2 ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                            </button>
                                        </div>
                                        {errors.password2 && <div className="invalid-feedback d-block" style={{ fontSize: '0.75rem' }}>{errors.password2}</div>}
                                    </div>

                                    {/* Role */}
                                    <div className="mb-4">
                                        <label htmlFor="role" className="form-label" style={{ fontSize: '0.85rem' }}>
                                            User Role <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className={`form-select form-select-sm ${errors.role ? 'is-invalid' : ''}`}
                                            id="role"
                                            name="role"
                                            value={formData.role}
                                            onChange={handleInputChange}
                                            required
                                            style={{ height: '32px', fontSize: '0.85rem' }}
                                        >
                                            {availableRoles.length > 0 ? (
                                                availableRoles.map(role => (
                                                    <option key={role.id} value={role.name}>{role.name}</option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="User">User</option>
                                                    <option value="Sales">Sales Department</option>
                                                    <option value="Purchase">Purchase Department</option>
                                                    <option value="Account">Account Department</option>
                                                    <option value="Supervisor">Supervisor</option>
                                                    <option value="Admin">Admin</option>
                                                </>
                                            )}
                                        </select>
                                        {errors.role && <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>{errors.role}</div>}
                                    </div>

                                    {errors.general && (
                                        <div className="alert alert-danger alert-sm py-2 mb-3" style={{ fontSize: '0.75rem' }}>
                                            {errors.general}
                                        </div>
                                    )}

                                    <div className="d-flex justify-content-between">
                                        <Link to="/auth/admin/users/list" className="btn btn-outline-primary btn-sm" style={{ height: '30px', padding: '0 16px', fontSize: '0.75rem' }}>
                                            <FaArrowLeft className="me-1" size={12} />
                                            Back to List
                                        </Link>
                                        <button
                                            type="submit"
                                            className="btn btn-primary btn-sm"
                                            disabled={isSubmitting || (formData.password && passwordStrength.strength < 4)}
                                            style={{ height: '30px', padding: '0 16px', fontSize: '0.75rem' }}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{ width: '12px', height: '12px' }}></span>
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <FaUserPlus className="me-1" size={12} />
                                                    Create User
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
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
        </div>
    );
};

export default CreateUser;