// // components/AccountCreationModal.js
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import '../../../stylesheet/retailer/sales/AccountCreationModal.css';

// const AccountCreationModal = ({ show, onClose, onAccountCreated, companyId, fiscalYear }) => {
//     const [isLoading, setIsLoading] = useState(false);
//     const [companyGroups, setCompanyGroups] = useState([]);
//     const [isClosing, setIsClosing] = useState(false);
//     const [formData, setFormData] = useState({
//         name: '',
//         address: '',
//         ward: '',
//         phone: '',
//         pan: '',
//         email: '',
//         companyGroups: '',
//     });

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // Handle modal close with animation
//     const handleClose = () => {
//         setIsClosing(true);
//         setTimeout(() => {
//             setIsClosing(false);
//             onClose();
//         }, 300);
//     };

//     // Fetch company groups when modal opens
//     useEffect(() => {
//         if (show) {
//             fetchCashInHandGroups();
//             document.body.style.overflow = 'hidden';
//         } else {
//             document.body.style.overflow = 'unset';
//         }

//         return () => {
//             document.body.style.overflow = 'unset';
//         };
//     }, [show]);

//     const fetchCashInHandGroups = async () => {
//         try {
//             const response = await api.get('/api/retailer/companies');

//             if (response.data.success) {
//                 const cashInHandGroups = (response.data.data.companyGroups || []).filter(group =>
//                     group.name.toLowerCase().includes('cash in hand')
//                 );

//                 setCompanyGroups(cashInHandGroups);

//                 if (cashInHandGroups.length === 1) {
//                     setFormData(prev => ({
//                         ...prev,
//                         companyGroups: cashInHandGroups[0]._id
//                     }));
//                 }
//             }
//         } catch (error) {
//             console.error('Error fetching company groups:', error);
//         }
//     };

//     const handleInputChange = (e) => {
//         const { name, value } = e.target;
//         setFormData(prev => ({
//             ...prev,
//             [name]: value
//         }));
//     };

//     const handleKeyDown = (e) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (e.target.type !== 'textarea') {
//                 handleCreateAccountClick();
//             }
//         } else if (e.key === 'Escape') {
//             handleClose();
//         }
//     };

//     const handleCreateAccountClick = async () => {
//         if (!formData.name.trim() || !formData.companyGroups) {
//             alert('Please fill in all required fields (Account Name and Account Group)');
//             return;
//         }

//         await submitForm();
//     };

//     const submitForm = async () => {
//         setIsLoading(true);

//         try {
//             const response = await api.post('/api/retailer/companies', formData);

//             if (response.data.success) {
//                 const createdAccount = {
//                     _id: response.data.data._id,
//                     name: formData.name,
//                     address: formData.address || '',
//                     phone: formData.phone || '',
//                     email: formData.email || '',
//                     pan: formData.pan || ''
//                 };

//                 if (onAccountCreated) {
//                     onAccountCreated(createdAccount);
//                 }

//                 setFormData({
//                     name: '',
//                     address: '',
//                     ward: '',
//                     phone: '',
//                     pan: '',
//                     email: '',
//                     companyGroups: companyGroups.length === 1 ? companyGroups[0]._id : '',
//                 });

//                 handleClose();
//             }
//         } catch (error) {
//             console.error('Error creating account:', error);
//             let errorMessage = 'Failed to create account. Please try again.';

//             if (error.response?.data?.error) {
//                 errorMessage = error.response.data.error;
//             }

//             alert(errorMessage);
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     if (!show && !isClosing) return null;

//     return (
//         <>
//             {/* Backdrop */}
//             <div
//                 className={`modal-backdrop fade ${show && !isClosing ? 'show' : ''} ${isClosing ? 'closing' : ''}`}
//                 onClick={handleClose}
//                 style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//                     zIndex: 1040,
//                     transition: 'opacity 0.3s ease'
//                 }}
//             />

//             {/* Modal - Centered */}
//             <div
//                 className={`modal fade ${show && !isClosing ? 'show' : ''} ${isClosing ? 'closing' : ''}`}
//                 tabIndex="-1"
//                 style={{
//                     display: show ? 'block' : 'none',
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     zIndex: 1050,
//                     opacity: show && !isClosing ? 1 : 0,
//                     transition: 'opacity 0.3s ease'
//                 }}
//             >
//                 <div 
//                     className="modal-dialog modal-dialog-centered"
//                     style={{
//                         maxWidth: '500px',
//                         margin: '0 auto',
//                         height: '100%',
//                         display: 'flex',
//                         alignItems: 'center'
//                     }}
//                 >
//                     <div 
//                         className="modal-content"
//                         style={{
//                             width: '100%',
//                             maxHeight: '90vh',
//                             overflow: 'hidden',
//                             border: 'none',
//                             borderRadius: '12px',
//                             boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
//                             transform: show && !isClosing ? 'scale(1)' : 'scale(0.9)',
//                             transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
//                         }}
//                     >
//                         {/* Header */}
//                         <div 
//                             className="modal-header"
//                             style={{
//                                 background: 'linear-gradient(135deg, #2c80ff 0%, #1a5fcc 100%)',
//                                 padding: '20px 25px',
//                                 borderBottom: '3px solid #1a5fcc',
//                                 borderTopLeftRadius: '12px',
//                                 borderTopRightRadius: '12px'
//                             }}
//                         >
//                             <h5 
//                                 className="modal-title"
//                                 style={{
//                                     color: 'white',
//                                     fontSize: '1.4rem',
//                                     fontWeight: '700',
//                                     display: 'flex',
//                                     alignItems: 'center',
//                                     margin: 0
//                                 }}
//                             >
//                                 <span style={{ fontSize: '1.6rem', marginRight: '10px' }}>👤</span>
//                                 CREATE ACCOUNT
//                             </h5>
//                             <button
//                                 type="button"
//                                 className="btn-close btn-close-white"
//                                 onClick={handleClose}
//                                 aria-label="Close"
//                                 style={{
//                                     background: 'rgba(255,255,255,0.2)',
//                                     borderRadius: '50%',
//                                     width: '35px',
//                                     height: '35px',
//                                     display: 'flex',
//                                     alignItems: 'center',
//                                     justifyContent: 'center',
//                                     fontSize: '1.2rem',
//                                     opacity: 1
//                                 }}
//                             >
//                                 ✕
//                             </button>
//                         </div>

//                         {/* Body */}
//                         <div 
//                             className="modal-body"
//                             style={{
//                                 padding: '25px',
//                                 overflowY: 'auto',
//                                 background: '#f8fafc',
//                                 maxHeight: 'calc(90vh - 150px)'
//                             }}
//                         >
//                             <div className="form-container">
//                                 <div className="row g-3">
//                                     {/* Account Name */}
//                                     <div className="col-12">
//                                         <label className="form-label" style={{
//                                             fontWeight: '700',
//                                             color: '#2c3e50',
//                                             marginBottom: '8px',
//                                             fontSize: '0.95rem'
//                                         }}>
//                                             <span style={{ color: '#e74c3c' }}>*</span> Customer Name
//                                         </label>
//                                         <div style={{ position: 'relative' }}>
//                                             <span style={{
//                                                 position: 'absolute',
//                                                 left: '15px',
//                                                 top: '50%',
//                                                 transform: 'translateY(-50%)',
//                                                 fontSize: '1.2rem',
//                                                 color: '#7f8c8d'
//                                             }}>👤</span>
//                                             <input
//                                                 type="text"
//                                                 className="form-control"
//                                                 name="name"
//                                                 value={formData.name}
//                                                 onChange={handleInputChange}
//                                                 onKeyDown={handleKeyDown}
//                                                 required
//                                                 placeholder="Enter customer full name"
//                                                 autoComplete="off"
//                                                 autoFocus
//                                                 style={{
//                                                     padding: '12px 12px 12px 45px',
//                                                     border: '2px solid #3498db',
//                                                     borderRadius: '8px',
//                                                     fontSize: '1rem',
//                                                     fontWeight: '500',
//                                                     height: '50px'
//                                                 }}
//                                             />
//                                         </div>
//                                     </div>

//                                     {/* Account Group */}
//                                     <div className="col-12">
//                                         <label className="form-label" style={{
//                                             fontWeight: '700',
//                                             color: '#2c3e50',
//                                             marginBottom: '8px',
//                                             fontSize: '0.95rem'
//                                         }}>
//                                             <span style={{ color: '#e74c3c' }}>*</span> Account Group
//                                         </label>
//                                         <div style={{ position: 'relative' }}>
//                                             <span style={{
//                                                 position: 'absolute',
//                                                 left: '15px',
//                                                 top: '50%',
//                                                 transform: 'translateY(-50%)',
//                                                 fontSize: '1.2rem',
//                                                 color: '#7f8c8d',
//                                                 zIndex: 5
//                                             }}>🏢</span>
//                                             <select
//                                                 className="form-select"
//                                                 name="companyGroups"
//                                                 value={formData.companyGroups}
//                                                 onChange={handleInputChange}
//                                                 onKeyDown={handleKeyDown}
//                                                 required
//                                                 style={{
//                                                     padding: '12px 12px 12px 45px',
//                                                     border: '2px solid #3498db',
//                                                     borderRadius: '8px',
//                                                     fontSize: '1rem',
//                                                     fontWeight: '500',
//                                                     height: '50px',
//                                                     appearance: 'none',
//                                                     backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
//                                                     backgroundPosition: 'right 12px center',
//                                                     backgroundRepeat: 'no-repeat',
//                                                     backgroundSize: '16px'
//                                                 }}
//                                             >
//                                                 <option value="">Select Account Group</option>
//                                                 {companyGroups.map(group => (
//                                                     <option key={group._id} value={group._id}>
//                                                         {group.name}
//                                                     </option>
//                                                 ))}
//                                             </select>
//                                         </div>
//                                     </div>

//                                     {/* Contact Information Section */}
//                                     <div style={{
//                                         width: '100%',
//                                         borderBottom: '2px solid #3498db',
//                                         paddingBottom: '8px',
//                                         marginTop: '20px',
//                                         marginBottom: '15px'
//                                     }}>
//                                         <span style={{
//                                             fontWeight: '700',
//                                             color: '#2c3e50',
//                                             fontSize: '1.1rem'
//                                         }}>📞 Contact Information</span>
//                                     </div>

//                                     {/* Phone */}
//                                     <div className="col-12">
//                                         <label className="form-label" style={{
//                                             fontWeight: '600',
//                                             color: '#2c3e50',
//                                             marginBottom: '8px',
//                                             fontSize: '0.9rem'
//                                         }}>Phone Number</label>
//                                         <div style={{ position: 'relative' }}>
//                                             <span style={{
//                                                 position: 'absolute',
//                                                 left: '15px',
//                                                 top: '50%',
//                                                 transform: 'translateY(-50%)',
//                                                 fontSize: '1.2rem',
//                                                 color: '#7f8c8d'
//                                             }}>📱</span>
//                                             <input
//                                                 type="tel"
//                                                 className="form-control"
//                                                 name="phone"
//                                                 value={formData.phone}
//                                                 onChange={handleInputChange}
//                                                 onKeyDown={handleKeyDown}
//                                                 placeholder="98XXXXXXXX"
//                                                 autoComplete="off"
//                                                 style={{
//                                                     padding: '12px 12px 12px 45px',
//                                                     border: '2px solid #95a5a6',
//                                                     borderRadius: '8px',
//                                                     fontSize: '1rem',
//                                                     fontWeight: '500',
//                                                     height: '50px'
//                                                 }}
//                                             />
//                                         </div>
//                                     </div>

//                                     {/* Email */}
//                                     <div className="col-12">
//                                         <label className="form-label" style={{
//                                             fontWeight: '600',
//                                             color: '#2c3e50',
//                                             marginBottom: '8px',
//                                             fontSize: '0.9rem'
//                                         }}>Email Address</label>
//                                         <div style={{ position: 'relative' }}>
//                                             <span style={{
//                                                 position: 'absolute',
//                                                 left: '15px',
//                                                 top: '50%',
//                                                 transform: 'translateY(-50%)',
//                                                 fontSize: '1.2rem',
//                                                 color: '#7f8c8d'
//                                             }}>📧</span>
//                                             <input
//                                                 type="email"
//                                                 className="form-control"
//                                                 name="email"
//                                                 value={formData.email}
//                                                 onChange={handleInputChange}
//                                                 onKeyDown={handleKeyDown}
//                                                 placeholder="customer@email.com"
//                                                 autoComplete="off"
//                                                 style={{
//                                                     padding: '12px 12px 12px 45px',
//                                                     border: '2px solid #95a5a6',
//                                                     borderRadius: '8px',
//                                                     fontSize: '1rem',
//                                                     fontWeight: '500',
//                                                     height: '50px',
//                                                     textTransform: 'lowercase'
//                                                 }}
//                                             />
//                                         </div>
//                                     </div>

//                                     {/* Address Information Section */}
//                                     <div style={{
//                                         width: '100%',
//                                         borderBottom: '2px solid #3498db',
//                                         paddingBottom: '8px',
//                                         marginTop: '20px',
//                                         marginBottom: '15px'
//                                     }}>
//                                         <span style={{
//                                             fontWeight: '700',
//                                             color: '#2c3e50',
//                                             fontSize: '1.1rem'
//                                         }}>📍 Address Information</span>
//                                     </div>

//                                     {/* Address */}
//                                     <div className="col-12">
//                                         <label className="form-label" style={{
//                                             fontWeight: '600',
//                                             color: '#2c3e50',
//                                             marginBottom: '8px',
//                                             fontSize: '0.9rem'
//                                         }}>Full Address</label>
//                                         <div style={{ position: 'relative' }}>
//                                             <span style={{
//                                                 position: 'absolute',
//                                                 left: '15px',
//                                                 top: '15px',
//                                                 fontSize: '1.2rem',
//                                                 color: '#7f8c8d'
//                                             }}>🏠</span>
//                                             <textarea
//                                                 className="form-control"
//                                                 name="address"
//                                                 value={formData.address}
//                                                 onChange={handleInputChange}
//                                                 onKeyDown={handleKeyDown}
//                                                 placeholder="Enter complete address..."
//                                                 rows="3"
//                                                 autoComplete="off"
//                                                 style={{
//                                                     padding: '12px 12px 12px 45px',
//                                                     border: '2px solid #95a5a6',
//                                                     borderRadius: '8px',
//                                                     fontSize: '1rem',
//                                                     fontWeight: '500',
//                                                     resize: 'vertical',
//                                                     minHeight: '80px'
//                                                 }}
//                                             />
//                                         </div>
//                                     </div>

//                                     {/* Ward and PAN */}
//                                     <div className="col-6">
//                                         <label className="form-label" style={{
//                                             fontWeight: '600',
//                                             color: '#2c3e50',
//                                             marginBottom: '8px',
//                                             fontSize: '0.9rem'
//                                         }}>Ward Number</label>
//                                         <input
//                                             type="number"
//                                             className="form-control"
//                                             name="ward"
//                                             value={formData.ward}
//                                             onChange={handleInputChange}
//                                             onKeyDown={handleKeyDown}
//                                             placeholder="Ward no."
//                                             autoComplete="off"
//                                             style={{
//                                                 padding: '12px',
//                                                 border: '2px solid #95a5a6',
//                                                 borderRadius: '8px',
//                                                 fontSize: '1rem',
//                                                 fontWeight: '500',
//                                                 height: '50px'
//                                             }}
//                                         />
//                                     </div>

//                                     <div className="col-6">
//                                         <label className="form-label" style={{
//                                             fontWeight: '600',
//                                             color: '#2c3e50',
//                                             marginBottom: '8px',
//                                             fontSize: '0.9rem'
//                                         }}>PAN Number</label>
//                                         <input
//                                             type="text"
//                                             className="form-control"
//                                             name="pan"
//                                             value={formData.pan}
//                                             onChange={handleInputChange}
//                                             onKeyDown={handleKeyDown}
//                                             placeholder="PAN number"
//                                             minLength="9"
//                                             maxLength="9"
//                                             autoComplete="off"
//                                             style={{
//                                                 padding: '12px',
//                                                 border: '2px solid #95a5a6',
//                                                 borderRadius: '8px',
//                                                 fontSize: '1rem',
//                                                 fontWeight: '500',
//                                                 height: '50px',
//                                                 textTransform: 'uppercase'
//                                             }}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Footer */}
//                         <div 
//                             className="modal-footer"
//                             style={{
//                                 padding: '20px 25px',
//                                 borderTop: '2px solid #e0e0e0',
//                                 background: '#f8f9fa',
//                                 borderBottomLeftRadius: '12px',
//                                 borderBottomRightRadius: '12px'
//                             }}
//                         >
//                             <div style={{ display: 'flex', gap: '15px', justifyContent: 'space-between', width: '100%' }}>
//                                 <button
//                                     type="button"
//                                     className="btn btn-secondary"
//                                     onClick={handleClose}
//                                     disabled={isLoading}
//                                     style={{
//                                         flex: 1,
//                                         padding: '12px 20px',
//                                         background: 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)',
//                                         border: 'none',
//                                         borderRadius: '8px',
//                                         color: 'white',
//                                         fontWeight: '700',
//                                         fontSize: '1rem',
//                                         cursor: 'pointer',
//                                         height: '50px'
//                                     }}
//                                 >
//                                     ❌ Cancel
//                                 </button>
//                                 <button
//                                     type="button"
//                                     className="btn btn-primary"
//                                     onClick={handleCreateAccountClick}
//                                     disabled={isLoading || companyGroups.length === 0}
//                                     style={{
//                                         flex: 1,
//                                         padding: '12px 20px',
//                                         background: isLoading ? '#95a5a6' : 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
//                                         border: 'none',
//                                         borderRadius: '8px',
//                                         color: 'white',
//                                         fontWeight: '700',
//                                         fontSize: '1rem',
//                                         cursor: companyGroups.length === 0 ? 'not-allowed' : 'pointer',
//                                         height: '50px',
//                                         display: 'flex',
//                                         alignItems: 'center',
//                                         justifyContent: 'center',
//                                         gap: '8px'
//                                     }}
//                                 >
//                                     {isLoading ? (
//                                         <>
//                                             <span className="spinner-border spinner-border-sm" style={{ width: '1rem', height: '1rem' }}></span>
//                                             Creating...
//                                         </>
//                                     ) : (
//                                         <>
//                                             <span>✅</span>
//                                             Create Customer
//                                         </>
//                                     )}
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </>
//     );
// };

// export default AccountCreationModal;

// components/AccountCreationModal.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../../stylesheet/retailer/sales/AccountCreationModal.css';

const AccountCreationModal = ({ show, onClose, onAccountCreated, companyId, fiscalYear }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [companyGroups, setCompanyGroups] = useState([]);
    const [isClosing, setIsClosing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        ward: '',
        phone: '',
        pan: '',
        email: '',
        companyGroups: '',
    });

    // Create refs for all input fields and button
    const nameInputRef = useRef(null);
    const companyGroupsRef = useRef(null);
    const phoneRef = useRef(null);
    const emailRef = useRef(null);
    const addressRef = useRef(null);
    const wardRef = useRef(null);
    const panRef = useRef(null);
    const createButtonRef = useRef(null);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    // Handle modal close with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 300);
    };

    // Focus first input when modal opens
    useEffect(() => {
        if (show) {
            fetchCashInHandGroups();
            document.body.style.overflow = 'hidden';

            // Focus first input after a short delay to ensure modal is rendered
            setTimeout(() => {
                if (nameInputRef.current) {
                    nameInputRef.current.focus();
                }
            }, 100);
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [show]);

    // Function to move focus to next input
    const focusNextInput = (currentRef, nextRef) => {
        if (currentRef && nextRef) {
            currentRef.blur();
            setTimeout(() => {
                nextRef.focus();
            }, 10);
        }
    };

    // Handle Enter key press for navigation
    const handleKeyDown = (e, currentField, nextFieldRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            // If we're on the create button and Enter is pressed, create account
            if (currentField === 'createButton') {
                handleCreateAccountClick();
                return;
            }

            // Move to next field based on current field
            switch (currentField) {
                case 'name':
                    if (companyGroupsRef.current) {
                        focusNextInput(nameInputRef.current, companyGroupsRef.current);
                    }
                    break;
                case 'companyGroups':
                    if (phoneRef.current) {
                        focusNextInput(companyGroupsRef.current, phoneRef.current);
                    }
                    break;
                case 'phone':
                    if (emailRef.current) {
                        focusNextInput(phoneRef.current, emailRef.current);
                    }
                    break;
                case 'email':
                    if (addressRef.current) {
                        focusNextInput(emailRef.current, addressRef.current);
                    }
                    break;
                case 'address':
                    if (wardRef.current) {
                        focusNextInput(addressRef.current, wardRef.current);
                    }
                    break;
                case 'ward':
                    if (panRef.current) {
                        focusNextInput(wardRef.current, panRef.current);
                    }
                    break;
                case 'pan':
                    if (createButtonRef.current) {
                        focusNextInput(panRef.current, createButtonRef.current);
                    }
                    break;
                default:
                    break;
            }
        } else if (e.key === 'Escape') {
            handleClose();
        }
    };

    // Handle Enter key for select element (special handling)
    const handleSelectKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (phoneRef.current) {
                focusNextInput(companyGroupsRef.current, phoneRef.current);
            }
        } else if (e.key === 'Escape') {
            handleClose();
        }
    };

    const fetchCashInHandGroups = async () => {
        try {
            const response = await api.get('/api/retailer/companies');

            if (response.data.success) {
                const cashInHandGroups = (response.data.data.companyGroups || []).filter(group =>
                    group.name.toLowerCase().includes('cash in hand')
                );

                setCompanyGroups(cashInHandGroups);

                if (cashInHandGroups.length === 1) {
                    setFormData(prev => ({
                        ...prev,
                        companyGroups: cashInHandGroups[0]._id
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching company groups:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreateAccountClick = async () => {
        if (!formData.name.trim() || !formData.companyGroups) {
            alert('Please fill in all required fields (Account Name and Account Group)');
            // Focus back to first missing field
            if (!formData.name.trim()) {
                nameInputRef.current?.focus();
            } else if (!formData.companyGroups) {
                companyGroupsRef.current?.focus();
            }
            return;
        }

        await submitForm();
    };

    const submitForm = async () => {
        setIsLoading(true);

        try {
            const response = await api.post('/api/retailer/companies', formData);

            if (response.data.success) {
                const createdAccount = {
                    _id: response.data.data._id,
                    name: formData.name,
                    address: formData.address || '',
                    phone: formData.phone || '',
                    email: formData.email || '',
                    pan: formData.pan || ''
                };

                if (onAccountCreated) {
                    onAccountCreated(createdAccount);
                }

                setFormData({
                    name: '',
                    address: '',
                    ward: '',
                    phone: '',
                    pan: '',
                    email: '',
                    companyGroups: companyGroups.length === 1 ? companyGroups[0]._id : '',
                });

                handleClose();
            }
        } catch (error) {
            console.error('Error creating account:', error);
            let errorMessage = 'Failed to create account. Please try again.';

            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }

            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (!show && !isClosing) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`modal-backdrop fade ${show && !isClosing ? 'show' : ''} ${isClosing ? 'closing' : ''}`}
                onClick={handleClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    zIndex: 1040,
                    transition: 'opacity 0.3s ease'
                }}
            />

            {/* Modal - Centered */}
            <div
                className={`modal fade ${show && !isClosing ? 'show' : ''} ${isClosing ? 'closing' : ''}`}
                tabIndex="-1"
                style={{
                    display: show ? 'block' : 'none',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 1050,
                    opacity: show && !isClosing ? 1 : 0,
                    transition: 'opacity 0.3s ease'
                }}
            >
                <div
                    className="modal-dialog modal-dialog-centered"
                    style={{
                        maxWidth: '500px',
                        margin: '0 auto',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <div
                        className="modal-content"
                        style={{
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'hidden',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                            transform: show && !isClosing ? 'scale(1)' : 'scale(0.9)',
                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        {/* Header */}
                        <div
                            className="modal-header"
                            style={{
                                background: 'linear-gradient(135deg, #2c80ff 0%, #1a5fcc 100%)',
                                padding: '20px 25px',
                                borderBottom: '3px solid #1a5fcc',
                                borderTopLeftRadius: '12px',
                                borderTopRightRadius: '12px'
                            }}
                        >
                            <h5
                                className="modal-title"
                                style={{
                                    color: 'white',
                                    fontSize: '1.4rem',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    margin: 0
                                }}
                            >
                                <span style={{ fontSize: '1.6rem', marginRight: '10px' }}>👤</span>
                                CREATE ACCOUNT
                            </h5>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={handleClose}
                                aria-label="Close"
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '50%',
                                    width: '35px',
                                    height: '35px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.2rem',
                                    opacity: 1
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div
                            className="modal-body"
                            style={{
                                padding: '25px',
                                overflowY: 'auto',
                                background: '#f8fafc',
                                maxHeight: 'calc(90vh - 150px)'
                            }}
                        >
                            <div className="form-container">
                                <div className="row g-3">
                                    {/* Account Name */}
                                    <div className="col-12">
                                        <label className="form-label" style={{
                                            fontWeight: '700',
                                            color: '#2c3e50',
                                            marginBottom: '8px',
                                            fontSize: '0.95rem'
                                        }}>
                                            <span style={{ color: '#e74c3c' }}>*</span> Customer Name
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{
                                                position: 'absolute',
                                                left: '15px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                fontSize: '1.2rem',
                                                color: '#7f8c8d'
                                            }}>👤</span>
                                            <input
                                                ref={nameInputRef}
                                                type="text"
                                                className="form-control"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                onKeyDown={(e) => handleKeyDown(e, 'name')}
                                                required
                                                placeholder="Enter customer full name"
                                                autoComplete="off"
                                                autoFocus
                                                style={{
                                                    padding: '12px 12px 12px 45px',
                                                    border: '2px solid #3498db',
                                                    borderRadius: '8px',
                                                    fontSize: '1rem',
                                                    fontWeight: '500',
                                                    height: '50px'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Account Group */}
                                    <div className="col-12">
                                        <label className="form-label" style={{
                                            fontWeight: '700',
                                            color: '#2c3e50',
                                            marginBottom: '8px',
                                            fontSize: '0.95rem'
                                        }}>
                                            <span style={{ color: '#e74c3c' }}>*</span> Account Group
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{
                                                position: 'absolute',
                                                left: '15px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                fontSize: '1.2rem',
                                                color: '#7f8c8d',
                                                zIndex: 5
                                            }}>🏢</span>
                                            <select
                                                ref={companyGroupsRef}
                                                className="form-select"
                                                name="companyGroups"
                                                value={formData.companyGroups}
                                                onChange={handleInputChange}
                                                onKeyDown={handleSelectKeyDown}
                                                required
                                                style={{
                                                    padding: '12px 12px 12px 45px',
                                                    border: '2px solid #3498db',
                                                    borderRadius: '8px',
                                                    fontSize: '1rem',
                                                    fontWeight: '500',
                                                    height: '50px',
                                                    appearance: 'none',
                                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                                                    backgroundPosition: 'right 12px center',
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundSize: '16px'
                                                }}
                                            >
                                                <option value="">Select Account Group</option>
                                                {companyGroups.map(group => (
                                                    <option key={group._id} value={group._id}>
                                                        {group.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Contact Information Section */}
                                    <div style={{
                                        width: '100%',
                                        borderBottom: '2px solid #3498db',
                                        paddingBottom: '8px',
                                        marginTop: '20px',
                                        marginBottom: '15px'
                                    }}>
                                        <span style={{
                                            fontWeight: '700',
                                            color: '#2c3e50',
                                            fontSize: '1.1rem'
                                        }}>📞 Contact Information</span>
                                    </div>

                                    {/* Phone */}
                                    <div className="col-12">
                                        <label className="form-label" style={{
                                            fontWeight: '600',
                                            color: '#2c3e50',
                                            marginBottom: '8px',
                                            fontSize: '0.9rem'
                                        }}>Phone Number</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{
                                                position: 'absolute',
                                                left: '15px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                fontSize: '1.2rem',
                                                color: '#7f8c8d'
                                            }}>📱</span>
                                            <input
                                                ref={phoneRef}
                                                type="tel"
                                                className="form-control"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                onKeyDown={(e) => handleKeyDown(e, 'phone')}
                                                placeholder="98XXXXXXXX"
                                                autoComplete="off"
                                                style={{
                                                    padding: '12px 12px 12px 45px',
                                                    border: '2px solid #95a5a6',
                                                    borderRadius: '8px',
                                                    fontSize: '1rem',
                                                    fontWeight: '500',
                                                    height: '50px'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="col-12">
                                        <label className="form-label" style={{
                                            fontWeight: '600',
                                            color: '#2c3e50',
                                            marginBottom: '8px',
                                            fontSize: '0.9rem'
                                        }}>Email Address</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{
                                                position: 'absolute',
                                                left: '15px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                fontSize: '1.2rem',
                                                color: '#7f8c8d'
                                            }}>📧</span>
                                            <input
                                                ref={emailRef}
                                                type="email"
                                                className="form-control"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                onKeyDown={(e) => handleKeyDown(e, 'email')}
                                                placeholder="customer@email.com"
                                                autoComplete="off"
                                                style={{
                                                    padding: '12px 12px 12px 45px',
                                                    border: '2px solid #95a5a6',
                                                    borderRadius: '8px',
                                                    fontSize: '1rem',
                                                    fontWeight: '500',
                                                    height: '50px',
                                                    textTransform: 'lowercase'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Address Information Section */}
                                    <div style={{
                                        width: '100%',
                                        borderBottom: '2px solid #3498db',
                                        paddingBottom: '8px',
                                        marginTop: '20px',
                                        marginBottom: '15px'
                                    }}>
                                        <span style={{
                                            fontWeight: '700',
                                            color: '#2c3e50',
                                            fontSize: '1.1rem'
                                        }}>📍 Address Information</span>
                                    </div>

                                    {/* Address */}
                                    <div className="col-12">
                                        <label className="form-label" style={{
                                            fontWeight: '600',
                                            color: '#2c3e50',
                                            marginBottom: '8px',
                                            fontSize: '0.9rem'
                                        }}>Full Address</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{
                                                position: 'absolute',
                                                left: '15px',
                                                top: '15px',
                                                fontSize: '1.2rem',
                                                color: '#7f8c8d'
                                            }}>🏠</span>
                                            <textarea
                                                ref={addressRef}
                                                className="form-control"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                                onKeyDown={(e) => handleKeyDown(e, 'address')}
                                                placeholder="Enter complete address..."
                                                rows="3"
                                                autoComplete="off"
                                                style={{
                                                    padding: '12px 12px 12px 45px',
                                                    border: '2px solid #95a5a6',
                                                    borderRadius: '8px',
                                                    fontSize: '1rem',
                                                    fontWeight: '500',
                                                    resize: 'vertical',
                                                    minHeight: '80px'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Ward and PAN */}
                                    <div className="col-6">
                                        <label className="form-label" style={{
                                            fontWeight: '600',
                                            color: '#2c3e50',
                                            marginBottom: '8px',
                                            fontSize: '0.9rem'
                                        }}>Ward Number</label>
                                        <input
                                            ref={wardRef}
                                            type="number"
                                            className="form-control"
                                            name="ward"
                                            value={formData.ward}
                                            onChange={handleInputChange}
                                            onKeyDown={(e) => handleKeyDown(e, 'ward')}
                                            placeholder="Ward no."
                                            autoComplete="off"
                                            style={{
                                                padding: '12px',
                                                border: '2px solid #95a5a6',
                                                borderRadius: '8px',
                                                fontSize: '1rem',
                                                fontWeight: '500',
                                                height: '50px'
                                            }}
                                        />
                                    </div>

                                    <div className="col-6">
                                        <label className="form-label" style={{
                                            fontWeight: '600',
                                            color: '#2c3e50',
                                            marginBottom: '8px',
                                            fontSize: '0.9rem'
                                        }}>PAN Number</label>
                                        <input
                                            ref={panRef}
                                            type="text"
                                            className="form-control"
                                            name="pan"
                                            value={formData.pan}
                                            onChange={handleInputChange}
                                            onKeyDown={(e) => handleKeyDown(e, 'pan')}
                                            placeholder="PAN number"
                                            minLength="9"
                                            maxLength="9"
                                            autoComplete="off"
                                            style={{
                                                padding: '12px',
                                                border: '2px solid #95a5a6',
                                                borderRadius: '8px',
                                                fontSize: '1rem',
                                                fontWeight: '500',
                                                height: '50px',
                                                textTransform: 'uppercase'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div
                            className="modal-footer"
                            style={{
                                padding: '20px 25px',
                                borderTop: '2px solid #e0e0e0',
                                background: '#f8f9fa',
                                borderBottomLeftRadius: '12px',
                                borderBottomRightRadius: '12px'
                            }}
                        >
                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'space-between', width: '100%' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleClose}
                                    disabled={isLoading}
                                    style={{
                                        flex: 1,
                                        padding: '12px 20px',
                                        background: 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontWeight: '700',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        height: '50px'
                                    }}
                                >
                                    ❌ Cancel
                                </button>
                                <button
                                    ref={createButtonRef}
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleCreateAccountClick}
                                    onKeyDown={(e) => handleKeyDown(e, 'createButton')}
                                    disabled={isLoading || companyGroups.length === 0}
                                    style={{
                                        flex: 1,
                                        padding: '12px 20px',
                                        background: isLoading ? '#95a5a6' : 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontWeight: '700',
                                        fontSize: '1rem',
                                        cursor: companyGroups.length === 0 ? 'not-allowed' : 'pointer',
                                        height: '50px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" style={{ width: '1rem', height: '1rem' }}></span>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <span>✅</span>
                                            Create Customer
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AccountCreationModal;