
// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import api from '../../components/services/api';
// import { Form, Button, Container, Card, Spinner, Row, Col, Alert } from 'react-bootstrap';
// import Select from 'react-select';
// import DashboardLayout from '../company/DashboardLayout';
// import NotificationToast from '../NotificationToast';
// import NepaliDate from 'nepali-datetime';

// // Date conversion utilities
// const convertBsToAd = (bsDate) => {
//     if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;

//     try {
//         const nepaliDate = new NepaliDate(bsDate);
//         if (!nepaliDate || typeof nepaliDate.getDateObject !== 'function') {
//             console.error('Invalid NepaliDate object or missing getDateObject method');
//             return null;
//         }

//         const jsDate = nepaliDate.getDateObject();
//         if (!jsDate || isNaN(jsDate.getTime())) {
//             console.error('Invalid AD date generated from BS date:', bsDate);
//             return null;
//         }

//         const year = jsDate.getFullYear();
//         const month = String(jsDate.getMonth() + 1).padStart(2, '0');
//         const day = String(jsDate.getDate()).padStart(2, '0');

//         return `${year}-${month}-${day}`;
//     } catch (error) {
//         console.error('Error converting BS to AD:', error.message, 'Date:', bsDate);
//         return null;
//     }
// };

// const convertAdToBs = (adDate) => {
//     if (!adDate) return null;

//     try {
//         let date;
//         if (typeof adDate === 'string') {
//             if (/^\d{4}-\d{2}-\d{2}$/.test(adDate)) {
//                 date = new Date(adDate + 'T00:00:00');
//             } else {
//                 date = new Date(adDate);
//             }
//         } else if (adDate instanceof Date) {
//             date = adDate;
//         } else {
//             return null;
//         }

//         if (isNaN(date.getTime())) {
//             console.error('Invalid AD date:', adDate);
//             return null;
//         }

//         const nepaliDate = new NepaliDate(date);
//         if (!nepaliDate || typeof nepaliDate.getYear !== 'function') {
//             console.error('Invalid NepaliDate object');
//             return null;
//         }

//         const year = nepaliDate.getYear();
//         const month = nepaliDate.getMonth();
//         const day = nepaliDate.getDate();

//         if (!year || !month === undefined || !day) {
//             console.error('Invalid BS components generated');
//             return null;
//         }

//         return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//     } catch (error) {
//         console.error('Error converting AD to BS:', error.message, 'Date:', adDate);
//         return null;
//     }
// };

// const isValidNepaliDate = (dateStr) => {
//     if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

//     try {
//         const [year, month, day] = dateStr.split('-').map(Number);
//         if (month < 1 || month > 12) return false;
//         if (day < 1 || day > 32) return false;

//         const nepaliDate = new NepaliDate(dateStr);
//         if (!nepaliDate || typeof nepaliDate.getYear !== 'function') {
//             return false;
//         }

//         const bsYear = nepaliDate.getYear();
//         const bsMonth = nepaliDate.getMonth() + 1;
//         const bsDay = nepaliDate.getDate();

//         return (bsYear === year && bsMonth === month && bsDay === day);
//     } catch (error) {
//         console.warn('Invalid Nepali date:', dateStr, error.message);
//         return false;
//     }
// };

// const getCurrentNepaliDate = () => {
//     try {
//         const now = new NepaliDate();
//         if (!now || typeof now.getYear !== 'function') {
//             return '2080-01-01';
//         }
//         const year = now.getYear();
//         const month = now.getMonth() + 1;
//         const day = now.getDate();

//         if (!year || !month || !day) {
//             return '2080-01-01';
//         }

//         return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//     } catch (error) {
//         console.error('Error getting current Nepali date:', error);
//         return '2080-01-01';
//     }
// };

// const CompanyForm = () => {
//     const navigate = useNavigate();
//     const [loading, setLoading] = useState(false);
//     const [user, setUser] = useState(null);
//     const [isAdminOrSupervisor, setIsAdminOrSupervisor] = useState(false);
//     const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
//     const [error, setError] = useState(null);
//     const [dateErrors, setDateErrors] = useState({
//         startDateNepali: '',
//         endDateNepali: ''
//     });

//     const currentUser = useSelector((state) => state.auth.userInfo);
//     const token = localStorage.getItem('token');

//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 setLoading(true);
//                 if (currentUser) {
//                     setUser(currentUser);
//                     setIsAdminOrSupervisor(currentUser.isAdmin || currentUser.role === 'Supervisor');
//                     setLoading(false);
//                     return;
//                 }
//                 if (!localStorage.getItem('token')) {
//                     setNotification({ show: true, message: 'Please login first', type: 'error' });
//                     setTimeout(() => navigate('/auth/login'), 2000);
//                     return;
//                 }
//                 const userRes = await api.get('/api/User/current');
//                 setUser(userRes.data.user);
//                 setIsAdminOrSupervisor(userRes.data.user.isAdmin || userRes.data.user.role === 'Supervisor');
//             } catch (err) {
//                 if (err.response?.status === 401) {
//                     setNotification({ show: true, message: 'Session expired', type: 'error' });
//                     setTimeout(() => navigate('/auth/login'), 2000);
//                 }
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchData();
//     }, [currentUser, navigate]);

//     const [formData, setFormData] = useState({
//         name: '', address: '', country: 'Nepal', state: '', city: '', pan: '',
//         phone: '', ward: '', email: '', tradeType: 'retailer', dateFormat: 'english',
//         startDateEnglish: new Date().toISOString().split('T')[0],
//         endDateEnglish: '', startDateNepali: '', endDateNepali: '', vatEnabled: false
//     });

//     const tradeTypeOptions = [{ value: 'retailer', label: 'Retailer' }];
//     const dateFormatOptions = [
//         { value: 'english', label: 'English' },
//         { value: 'nepali', label: 'Nepali' }
//     ];

//     const handleChange = (e) => {
//         const { name, value, type, checked } = e.target;
//         setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
//     };

//     const handleSelectChange = (name, selected) => {
//         setFormData(prev => ({ ...prev, [name]: selected.value }));
//     };

//     // Handle Nepali date changes and auto-convert to English
//     const handleNepaliDateChange = (field, value) => {
//         const sanitizedValue = value.replace(/[^0-9/-]/g, '');
        
//         if (sanitizedValue.length <= 10) {
//             setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
//             setDateErrors(prev => ({ ...prev, [field]: '' }));

//             // Auto-convert to English date when we have a complete valid date
//             if (sanitizedValue.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(sanitizedValue)) {
//                 const adDate = convertBsToAd(sanitizedValue);
//                 if (adDate) {
//                     if (field === 'startDateNepali') {
//                         setFormData(prev => ({ ...prev, startDateEnglish: adDate }));
//                     } else if (field === 'endDateNepali') {
//                         setFormData(prev => ({ ...prev, endDateEnglish: adDate }));
//                     }
//                 }
//             }
//         }
//     };

//     // Handle Nepali date blur for validation
//     const handleNepaliDateBlur = (field, value) => {
//         const dateStr = value.trim();
//         if (!dateStr) {
//             setDateErrors(prev => ({ ...prev, [field]: '' }));
//             return;
//         }

//         if (isValidNepaliDate(dateStr)) {
//             const adDate = convertBsToAd(dateStr);
//             if (adDate) {
//                 if (field === 'startDateNepali') {
//                     setFormData(prev => ({ ...prev, startDateNepali: dateStr, startDateEnglish: adDate }));
//                 } else if (field === 'endDateNepali') {
//                     setFormData(prev => ({ ...prev, endDateNepali: dateStr, endDateEnglish: adDate }));
//                 }
//             }
//             setDateErrors(prev => ({ ...prev, [field]: '' }));
//         } else {
//             // Auto-correct to current date
//             const currentDate = getCurrentNepaliDate();
//             const adDate = convertBsToAd(currentDate);
//             if (field === 'startDateNepali') {
//                 setFormData(prev => ({ ...prev, startDateNepali: currentDate, startDateEnglish: adDate || prev.startDateEnglish }));
//             } else if (field === 'endDateNepali') {
//                 setFormData(prev => ({ ...prev, endDateNepali: currentDate, endDateEnglish: adDate || prev.endDateEnglish }));
//             }
//             setNotification({
//                 show: true,
//                 message: `Invalid Nepali date for ${field === 'startDateNepali' ? 'Start Date' : 'End Date'}. Auto-corrected to current date.`,
//                 type: 'warning'
//             });
//         }
//     };

//     // Handle English date changes (for Nepali format, convert to Nepali)
//     const handleEnglishDateChange = (field, value) => {
//         setFormData(prev => ({ ...prev, [field]: value }));
        
//         // If date format is Nepali, convert English date to Nepali
//         if (formData.dateFormat === 'nepali' && value) {
//             const bsDate = convertAdToBs(value);
//             if (bsDate) {
//                 if (field === 'startDateEnglish') {
//                     setFormData(prev => ({ ...prev, startDateNepali: bsDate }));
//                 } else if (field === 'endDateEnglish') {
//                     setFormData(prev => ({ ...prev, endDateNepali: bsDate }));
//                 }
//             }
//         }
//     };

//     // Auto-calculate end date when start date changes (for English format)
//     useEffect(() => {
//         if (formData.dateFormat === 'english' && formData.startDateEnglish) {
//             const start = new Date(formData.startDateEnglish);
//             const end = new Date(start);
//             end.setFullYear(end.getFullYear() + 1);
//             end.setDate(end.getDate() - 1);
//             setFormData(prev => ({ ...prev, endDateEnglish: end.toISOString().split('T')[0] }));
//         }
//     }, [formData.startDateEnglish, formData.dateFormat]);

//     // Auto-calculate end date when start date changes (for Nepali format)
//     useEffect(() => {
//         if (formData.dateFormat === 'nepali' && formData.startDateNepali && isValidNepaliDate(formData.startDateNepali)) {
//             // Convert to AD, add 1 year, then convert back to BS
//             const startAd = convertBsToAd(formData.startDateNepali);
//             if (startAd) {
//                 const startDate = new Date(startAd);
//                 const endDate = new Date(startDate);
//                 endDate.setFullYear(endDate.getFullYear() + 1);
//                 endDate.setDate(endDate.getDate() - 1);
//                 const endAd = endDate.toISOString().split('T')[0];
//                 const endBs = convertAdToBs(endAd);
//                 if (endBs) {
//                     setFormData(prev => ({ ...prev, endDateNepali: endBs, endDateEnglish: endAd }));
//                 }
//             }
//         }
//     }, [formData.startDateNepali, formData.dateFormat]);

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setLoading(true);
//         setError(null);
        
//         try {
//             const storedToken = localStorage.getItem('token');
//             if (!storedToken) {
//                 setNotification({ show: true, message: 'Please login', type: 'error' });
//                 setTimeout(() => navigate('/auth/login'), 2000);
//                 return;
//             }

//             const requestData = {
//                 name: formData.name, address: formData.address, country: formData.country,
//                 state: formData.state, city: formData.city, pan: formData.pan,
//                 phone: formData.phone, ward: formData.ward ? parseInt(formData.ward) : null,
//                 email: formData.email, tradeType: formData.tradeType,
//                 dateFormat: formData.dateFormat, vatEnabled: formData.vatEnabled,
//                 startDateEnglish: formData.startDateEnglish || '',
//                 endDateEnglish: formData.endDateEnglish || '',
//                 startDateNepali: formData.startDateNepali || '',
//                 endDateNepali: formData.endDateNepali || ''
//             };

//             await api.post('/api/Companies', requestData, {
//                 headers: { 'Authorization': `Bearer ${storedToken}` }
//             });

//             setNotification({ show: true, message: 'Company created successfully!', type: 'success' });
//             setTimeout(() => navigate('/user-dashboard'), 1500);
//         } catch (err) {
//             const errorMessage = err.response?.data?.message || 'Error creating company';
//             setError(errorMessage);
//             setNotification({ show: true, message: errorMessage, type: 'error' });
            
//             if (err.response?.status === 401) {
//                 localStorage.removeItem('token');
//                 setTimeout(() => navigate('/auth/login'), 2000);
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     const inputStyle = { 
//         padding: '6px 10px', 
//         fontSize: '14px',
//         border: '1px solid #dee2e6',
//         borderRadius: '4px'
//     };
    
//     const labelStyle = { 
//         fontSize: '12px', 
//         fontWeight: 600, 
//         marginBottom: '2px',
//         color: '#495057'
//     };
    
//     const rowStyle = { marginBottom: '12px' };

//     return (
//         <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
//             <NotificationToast 
//                 show={notification.show} 
//                 message={notification.message} 
//                 type={notification.type} 
//                 onClose={() => setNotification({ ...notification, show: false })} 
//             />
            
//             <Container fluid style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 15px' }}>
//                 <Card style={{ 
//                     borderRadius: '8px', 
//                     boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
//                     border: '1px solid #dee2e6'
//                 }}>
//                     <Card.Header style={{ 
//                         background: '#f8f9fa',
//                         padding: '12px 20px',
//                         borderBottom: '2px solid #dee2e6'
//                     }}>
//                         <h3 style={{ 
//                             margin: 0, 
//                             fontSize: '1.1rem', 
//                             color: '#212529',
//                             fontWeight: 600
//                         }}>
//                             Create New Company
//                         </h3>
//                     </Card.Header>
                    
//                     <Card.Body style={{ padding: '20px' }}>
//                         {loading && (
//                             <div className="text-center py-3">
//                                 <Spinner animation="border" size="sm" style={{ color: '#0d6efd' }} />
//                             </div>
//                         )}
                        
//                         {error && (
//                             <Alert 
//                                 variant="danger" 
//                                 dismissible 
//                                 onClose={() => setError(null)}
//                                 style={{ fontSize: '0.85rem', padding: '8px 12px' }}
//                             >
//                                 {error}
//                             </Alert>
//                         )}
                        
//                         {!token ? (
//                             <div className="text-center py-3">
//                                 <p style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '10px' }}>
//                                     Please login to create company.
//                                 </p>
//                                 <Button 
//                                     variant="primary" 
//                                     size="sm"
//                                     onClick={() => navigate('/auth/login')}
//                                     style={{ 
//                                         padding: '4px 12px', 
//                                         fontSize: '0.85rem'
//                                     }}
//                                 >
//                                     Login
//                                 </Button>
//                             </div>
//                         ) : (
//                             <Form onSubmit={handleSubmit}>
//                                 <Row style={rowStyle}>
//                                     <Col md={6}>
//                                         <Form.Label style={labelStyle}>Company Name *</Form.Label>
//                                         <Form.Control 
//                                             type="text" 
//                                             name="name" 
//                                             value={formData.name} 
//                                             onChange={handleChange} 
//                                             style={inputStyle} 
//                                             size="sm" 
//                                             required 
//                                         />
//                                     </Col>
//                                     <Col md={6}>
//                                         <Form.Label style={labelStyle}>Country</Form.Label>
//                                         <Form.Control 
//                                             type="text" 
//                                             name="country" 
//                                             value={formData.country} 
//                                             onChange={handleChange} 
//                                             style={inputStyle} 
//                                             size="sm" 
//                                             readOnly 
//                                         />
//                                     </Col>
//                                 </Row>

//                                 <Row style={rowStyle}>
//                                     <Col md={6}>
//                                         <Form.Label style={labelStyle}>State *</Form.Label>
//                                         <Form.Control 
//                                             type="text" 
//                                             name="state" 
//                                             value={formData.state} 
//                                             onChange={handleChange} 
//                                             style={inputStyle} 
//                                             size="sm" 
//                                             required 
//                                         />
//                                     </Col>
//                                     <Col md={6}>
//                                         <Form.Label style={labelStyle}>City *</Form.Label>
//                                         <Form.Control 
//                                             type="text" 
//                                             name="city" 
//                                             value={formData.city} 
//                                             onChange={handleChange} 
//                                             style={inputStyle} 
//                                             size="sm" 
//                                             required 
//                                         />
//                                     </Col>
//                                 </Row>

//                                 <Row style={rowStyle}>
//                                     <Col md={6}>
//                                         <Form.Label style={labelStyle}>Address *</Form.Label>
//                                         <Form.Control 
//                                             type="text" 
//                                             name="address" 
//                                             value={formData.address} 
//                                             onChange={handleChange} 
//                                             style={inputStyle} 
//                                             size="sm" 
//                                             required 
//                                         />
//                                     </Col>
//                                     <Col md={6}>
//                                         <Form.Label style={labelStyle}>PAN Number *</Form.Label>
//                                         <Form.Control 
//                                             type="text" 
//                                             name="pan" 
//                                             value={formData.pan} 
//                                             onChange={handleChange} 
//                                             style={inputStyle} 
//                                             size="sm" 
//                                             maxLength="9" 
//                                             required 
//                                         />
//                                     </Col>
//                                 </Row>

//                                 <Row style={rowStyle}>
//                                     <Col md={6}>
//                                         <Form.Label style={labelStyle}>Phone Number *</Form.Label>
//                                         <Form.Control 
//                                             type="tel" 
//                                             name="phone" 
//                                             value={formData.phone} 
//                                             onChange={handleChange} 
//                                             style={inputStyle} 
//                                             size="sm" 
//                                             required 
//                                         />
//                                     </Col>
//                                     <Col md={6}>
//                                         <Form.Label style={labelStyle}>Ward Number *</Form.Label>
//                                         <Form.Control 
//                                             type="number" 
//                                             name="ward" 
//                                             value={formData.ward} 
//                                             onChange={handleChange} 
//                                             style={inputStyle} 
//                                             size="sm" 
//                                             required 
//                                         />
//                                     </Col>
//                                 </Row>

//                                 <Row style={rowStyle}>
//                                     <Col md={6}>
//                                         <Form.Label style={labelStyle}>Email Address *</Form.Label>
//                                         <Form.Control 
//                                             type="email" 
//                                             name="email" 
//                                             value={formData.email} 
//                                             onChange={handleChange} 
//                                             style={inputStyle} 
//                                             size="sm" 
//                                             required 
//                                         />
//                                     </Col>
//                                     <Col md={6}>
//                                         <Form.Label style={labelStyle}>Trade Type *</Form.Label>
//                                         <Select 
//                                             options={tradeTypeOptions} 
//                                             defaultValue={tradeTypeOptions[0]} 
//                                             onChange={(selected) => handleSelectChange('tradeType', selected)} 
//                                             styles={{ 
//                                                 control: (base) => ({ 
//                                                     ...base, 
//                                                     minHeight: '31px', 
//                                                     fontSize: '14px',
//                                                     borderColor: '#dee2e6'
//                                                 }) 
//                                             }} 
//                                         />
//                                     </Col>
//                                 </Row>

//                                 <Row style={rowStyle}>
//                                     <Col md={6}>
//                                         <Form.Label style={labelStyle}>Date Format *</Form.Label>
//                                         <Select 
//                                             options={dateFormatOptions} 
//                                             defaultValue={dateFormatOptions[0]} 
//                                             onChange={(selected) => {
//                                                 handleSelectChange('dateFormat', selected);
//                                                 // Reset dates when format changes
//                                                 if (selected.value === 'english') {
//                                                     const today = new Date().toISOString().split('T')[0];
//                                                     setFormData(prev => ({
//                                                         ...prev,
//                                                         startDateEnglish: today,
//                                                         endDateEnglish: '',
//                                                         startDateNepali: '',
//                                                         endDateNepali: ''
//                                                     }));
//                                                 } else {
//                                                     const currentNepaliDate = getCurrentNepaliDate();
//                                                     setFormData(prev => ({
//                                                         ...prev,
//                                                         startDateNepali: currentNepaliDate,
//                                                         endDateNepali: '',
//                                                         startDateEnglish: convertBsToAd(currentNepaliDate) || '',
//                                                         endDateEnglish: ''
//                                                     }));
//                                                 }
//                                             }} 
//                                             styles={{ 
//                                                 control: (base) => ({ 
//                                                     ...base, 
//                                                     minHeight: '31px', 
//                                                     fontSize: '14px',
//                                                     borderColor: '#dee2e6'
//                                                 }) 
//                                             }} 
//                                         />
//                                     </Col>
//                                     <Col md={6}>
//                                         <Form.Label style={labelStyle}>Start Date *</Form.Label>
//                                         {formData.dateFormat === 'english' ? (
//                                             <Form.Control 
//                                                 type="date" 
//                                                 name="startDateEnglish" 
//                                                 value={formData.startDateEnglish} 
//                                                 onChange={(e) => handleEnglishDateChange('startDateEnglish', e.target.value)}
//                                                 style={inputStyle} 
//                                                 size="sm" 
//                                                 required 
//                                             />
//                                         ) : (
//                                             <Form.Control 
//                                                 type="text" 
//                                                 name="startDateNepali" 
//                                                 value={formData.startDateNepali} 
//                                                 onChange={(e) => handleNepaliDateChange('startDateNepali', e.target.value)}
//                                                 onBlur={(e) => handleNepaliDateBlur('startDateNepali', e.target.value)}
//                                                 placeholder="YYYY-MM-DD" 
//                                                 style={inputStyle} 
//                                                 size="sm" 
//                                                 required 
//                                                 isInvalid={!!dateErrors.startDateNepali}
//                                             />
//                                         )}
//                                         {dateErrors.startDateNepali && (
//                                             <Form.Control.Feedback type="invalid" style={{ fontSize: '0.7rem' }}>
//                                                 {dateErrors.startDateNepali}
//                                             </Form.Control.Feedback>
//                                         )}
//                                     </Col>
//                                 </Row>

//                                 <Row style={rowStyle}>
//                                     <Col md={12}>
//                                         <Form.Check 
//                                             type="switch" 
//                                             label="Enable VAT" 
//                                             name="vatEnabled" 
//                                             checked={formData.vatEnabled} 
//                                             onChange={handleChange} 
//                                             style={{ fontSize: '13px' }}
//                                             id="vat-switch"
//                                         />
//                                     </Col>
//                                 </Row>

//                                 <Button 
//                                     type="submit" 
//                                     variant="primary" 
//                                     size="sm" 
//                                     disabled={loading || !token} 
//                                     style={{ 
//                                         width: '100%', 
//                                         marginTop: '15px', 
//                                         padding: '8px',
//                                         fontSize: '0.85rem',
//                                         fontWeight: 500
//                                     }}
//                                 >
//                                     {loading ? 'Creating...' : 'Create Company'}
//                                 </Button>
//                             </Form>
//                         )}
//                     </Card.Body>
//                 </Card>
//             </Container>
//         </DashboardLayout>
//     );
// };

// export default CompanyForm;
//---------------------------------------------end1

// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import api from '../../components/services/api';
// import { Form, Button, Container, Card, Spinner, Row, Col, Alert } from 'react-bootstrap';
// import Select from 'react-select';
// import DashboardLayout from '../company/DashboardLayout';
// import NotificationToast from '../NotificationToast';
// import NepaliDate from 'nepali-datetime';
// import { FaBuilding, FaArrowLeft, FaSave, FaSpinner } from 'react-icons/fa';
// import { Link } from 'react-router-dom';

// // Date conversion utilities (same as before)
// const convertBsToAd = (bsDate) => {
//     if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
//     try {
//         const nepaliDate = new NepaliDate(bsDate);
//         if (!nepaliDate || typeof nepaliDate.getDateObject !== 'function') {
//             console.error('Invalid NepaliDate object or missing getDateObject method');
//             return null;
//         }
//         const jsDate = nepaliDate.getDateObject();
//         if (!jsDate || isNaN(jsDate.getTime())) {
//             console.error('Invalid AD date generated from BS date:', bsDate);
//             return null;
//         }
//         const year = jsDate.getFullYear();
//         const month = String(jsDate.getMonth() + 1).padStart(2, '0');
//         const day = String(jsDate.getDate()).padStart(2, '0');
//         return `${year}-${month}-${day}`;
//     } catch (error) {
//         console.error('Error converting BS to AD:', error.message, 'Date:', bsDate);
//         return null;
//     }
// };

// const convertAdToBs = (adDate) => {
//     if (!adDate) return null;
//     try {
//         let date;
//         if (typeof adDate === 'string') {
//             if (/^\d{4}-\d{2}-\d{2}$/.test(adDate)) {
//                 date = new Date(adDate + 'T00:00:00');
//             } else {
//                 date = new Date(adDate);
//             }
//         } else if (adDate instanceof Date) {
//             date = adDate;
//         } else {
//             return null;
//         }
//         if (isNaN(date.getTime())) {
//             console.error('Invalid AD date:', adDate);
//             return null;
//         }
//         const nepaliDate = new NepaliDate(date);
//         if (!nepaliDate || typeof nepaliDate.getYear !== 'function') {
//             console.error('Invalid NepaliDate object');
//             return null;
//         }
//         const year = nepaliDate.getYear();
//         const month = nepaliDate.getMonth();
//         const day = nepaliDate.getDate();
//         if (!year || !month === undefined || !day) {
//             console.error('Invalid BS components generated');
//             return null;
//         }
//         return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//     } catch (error) {
//         console.error('Error converting AD to BS:', error.message, 'Date:', adDate);
//         return null;
//     }
// };

// const isValidNepaliDate = (dateStr) => {
//     if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
//     try {
//         const [year, month, day] = dateStr.split('-').map(Number);
//         if (month < 1 || month > 12) return false;
//         if (day < 1 || day > 32) return false;
//         const nepaliDate = new NepaliDate(dateStr);
//         if (!nepaliDate || typeof nepaliDate.getYear !== 'function') {
//             return false;
//         }
//         const bsYear = nepaliDate.getYear();
//         const bsMonth = nepaliDate.getMonth() + 1;
//         const bsDay = nepaliDate.getDate();
//         return (bsYear === year && bsMonth === month && bsDay === day);
//     } catch (error) {
//         console.warn('Invalid Nepali date:', dateStr, error.message);
//         return false;
//     }
// };

// const getCurrentNepaliDate = () => {
//     try {
//         const now = new NepaliDate();
//         if (!now || typeof now.getYear !== 'function') {
//             return '2080-01-01';
//         }
//         const year = now.getYear();
//         const month = now.getMonth() + 1;
//         const day = now.getDate();
//         if (!year || !month || !day) {
//             return '2080-01-01';
//         }
//         return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//     } catch (error) {
//         console.error('Error getting current Nepali date:', error);
//         return '2080-01-01';
//     }
// };

// const CompanyForm = () => {
//     const navigate = useNavigate();
//     const [loading, setLoading] = useState(false);
//     const [user, setUser] = useState(null);
//     const [isAdminOrSupervisor, setIsAdminOrSupervisor] = useState(false);
//     const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
//     const [error, setError] = useState(null);
//     const [dateErrors, setDateErrors] = useState({
//         startDateNepali: '',
//         endDateNepali: ''
//     });

//     const currentUser = useSelector((state) => state.auth.userInfo);
//     const token = localStorage.getItem('token');

//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 setLoading(true);
//                 if (currentUser) {
//                     setUser(currentUser);
//                     setIsAdminOrSupervisor(currentUser.isAdmin || currentUser.role === 'Supervisor');
//                     setLoading(false);
//                     return;
//                 }
//                 if (!localStorage.getItem('token')) {
//                     setNotification({ show: true, message: 'Please login first', type: 'error' });
//                     setTimeout(() => navigate('/auth/login'), 2000);
//                     return;
//                 }
//                 const userRes = await api.get('/api/User/current');
//                 setUser(userRes.data.user);
//                 setIsAdminOrSupervisor(userRes.data.user.isAdmin || userRes.data.user.role === 'Supervisor');
//             } catch (err) {
//                 if (err.response?.status === 401) {
//                     setNotification({ show: true, message: 'Session expired', type: 'error' });
//                     setTimeout(() => navigate('/auth/login'), 2000);
//                 }
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchData();
//     }, [currentUser, navigate]);

//     const [formData, setFormData] = useState({
//         name: '', address: '', country: 'Nepal', state: '', city: '', pan: '',
//         phone: '', ward: '', email: '', tradeType: 'retailer', dateFormat: 'english',
//         startDateEnglish: new Date().toISOString().split('T')[0],
//         endDateEnglish: '', startDateNepali: '', endDateNepali: '', vatEnabled: false
//     });

//     const tradeTypeOptions = [{ value: 'retailer', label: 'Retailer' }];
//     const dateFormatOptions = [
//         { value: 'english', label: 'English' },
//         { value: 'nepali', label: 'Nepali' }
//     ];

//     const handleChange = (e) => {
//         const { name, value, type, checked } = e.target;
//         setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
//     };

//     const handleSelectChange = (name, selected) => {
//         setFormData(prev => ({ ...prev, [name]: selected.value }));
//     };

//     const handleNepaliDateChange = (field, value) => {
//         const sanitizedValue = value.replace(/[^0-9/-]/g, '');
        
//         if (sanitizedValue.length <= 10) {
//             setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
//             setDateErrors(prev => ({ ...prev, [field]: '' }));

//             if (sanitizedValue.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(sanitizedValue)) {
//                 const adDate = convertBsToAd(sanitizedValue);
//                 if (adDate) {
//                     if (field === 'startDateNepali') {
//                         setFormData(prev => ({ ...prev, startDateEnglish: adDate }));
//                     } else if (field === 'endDateNepali') {
//                         setFormData(prev => ({ ...prev, endDateEnglish: adDate }));
//                     }
//                 }
//             }
//         }
//     };

//     const handleNepaliDateBlur = (field, value) => {
//         const dateStr = value.trim();
//         if (!dateStr) {
//             setDateErrors(prev => ({ ...prev, [field]: '' }));
//             return;
//         }

//         if (isValidNepaliDate(dateStr)) {
//             const adDate = convertBsToAd(dateStr);
//             if (adDate) {
//                 if (field === 'startDateNepali') {
//                     setFormData(prev => ({ ...prev, startDateNepali: dateStr, startDateEnglish: adDate }));
//                 } else if (field === 'endDateNepali') {
//                     setFormData(prev => ({ ...prev, endDateNepali: dateStr, endDateEnglish: adDate }));
//                 }
//             }
//             setDateErrors(prev => ({ ...prev, [field]: '' }));
//         } else {
//             const currentDate = getCurrentNepaliDate();
//             const adDate = convertBsToAd(currentDate);
//             if (field === 'startDateNepali') {
//                 setFormData(prev => ({ ...prev, startDateNepali: currentDate, startDateEnglish: adDate || prev.startDateEnglish }));
//             } else if (field === 'endDateNepali') {
//                 setFormData(prev => ({ ...prev, endDateNepali: currentDate, endDateEnglish: adDate || prev.endDateEnglish }));
//             }
//             setNotification({
//                 show: true,
//                 message: `Invalid Nepali date for ${field === 'startDateNepali' ? 'Start Date' : 'End Date'}. Auto-corrected to current date.`,
//                 type: 'warning'
//             });
//         }
//     };

//     const handleEnglishDateChange = (field, value) => {
//         setFormData(prev => ({ ...prev, [field]: value }));
        
//         if (formData.dateFormat === 'nepali' && value) {
//             const bsDate = convertAdToBs(value);
//             if (bsDate) {
//                 if (field === 'startDateEnglish') {
//                     setFormData(prev => ({ ...prev, startDateNepali: bsDate }));
//                 } else if (field === 'endDateEnglish') {
//                     setFormData(prev => ({ ...prev, endDateNepali: bsDate }));
//                 }
//             }
//         }
//     };

//     useEffect(() => {
//         if (formData.dateFormat === 'english' && formData.startDateEnglish) {
//             const start = new Date(formData.startDateEnglish);
//             const end = new Date(start);
//             end.setFullYear(end.getFullYear() + 1);
//             end.setDate(end.getDate() - 1);
//             setFormData(prev => ({ ...prev, endDateEnglish: end.toISOString().split('T')[0] }));
//         }
//     }, [formData.startDateEnglish, formData.dateFormat]);

//     useEffect(() => {
//         if (formData.dateFormat === 'nepali' && formData.startDateNepali && isValidNepaliDate(formData.startDateNepali)) {
//             const startAd = convertBsToAd(formData.startDateNepali);
//             if (startAd) {
//                 const startDate = new Date(startAd);
//                 const endDate = new Date(startDate);
//                 endDate.setFullYear(endDate.getFullYear() + 1);
//                 endDate.setDate(endDate.getDate() - 1);
//                 const endAd = endDate.toISOString().split('T')[0];
//                 const endBs = convertAdToBs(endAd);
//                 if (endBs) {
//                     setFormData(prev => ({ ...prev, endDateNepali: endBs, endDateEnglish: endAd }));
//                 }
//             }
//         }
//     }, [formData.startDateNepali, formData.dateFormat]);

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setLoading(true);
//         setError(null);
        
//         try {
//             const storedToken = localStorage.getItem('token');
//             if (!storedToken) {
//                 setNotification({ show: true, message: 'Please login', type: 'error' });
//                 setTimeout(() => navigate('/auth/login'), 2000);
//                 return;
//             }

//             const requestData = {
//                 name: formData.name, address: formData.address, country: formData.country,
//                 state: formData.state, city: formData.city, pan: formData.pan,
//                 phone: formData.phone, ward: formData.ward ? parseInt(formData.ward) : null,
//                 email: formData.email, tradeType: formData.tradeType,
//                 dateFormat: formData.dateFormat, vatEnabled: formData.vatEnabled,
//                 startDateEnglish: formData.startDateEnglish || '',
//                 endDateEnglish: formData.endDateEnglish || '',
//                 startDateNepali: formData.startDateNepali || '',
//                 endDateNepali: formData.endDateNepali || ''
//             };

//             await api.post('/api/Companies', requestData, {
//                 headers: { 'Authorization': `Bearer ${storedToken}` }
//             });

//             setNotification({ show: true, message: 'Company created successfully!', type: 'success' });
//             setTimeout(() => navigate('/user-dashboard'), 1500);
//         } catch (err) {
//             const errorMessage = err.response?.data?.message || 'Error creating company';
//             setError(errorMessage);
//             setNotification({ show: true, message: errorMessage, type: 'error' });
            
//             if (err.response?.status === 401) {
//                 localStorage.removeItem('token');
//                 setTimeout(() => navigate('/auth/login'), 2000);
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Compact styles - 3 columns
//     const styles = {
//         container: {
//             minHeight: 'calc(100vh - 60px)',
//             backgroundColor: '#f8f9fa',
//             fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
//             padding: '12px 20px',
//             display: 'flex',
//             flexDirection: 'column',
//         },
//         header: {
//             display: 'flex',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             marginBottom: '12px',
//             paddingBottom: '10px',
//             borderBottom: '1px solid #e2e8f0',
//             flexShrink: 0,
//         },
//         headerTitle: {
//             fontSize: '1.2rem',
//             fontWeight: '600',
//             color: '#1a202c',
//             display: 'flex',
//             alignItems: 'center',
//             gap: '10px',
//             margin: 0,
//         },
//         headerIcon: {
//             color: '#2a4d7a',
//         },
//         card: {
//             backgroundColor: '#ffffff',
//             borderRadius: '10px',
//             boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
//             border: '1px solid #e2e8f0',
//             overflow: 'hidden',
//             flex: 1,
//             display: 'flex',
//             flexDirection: 'column',
//         },
//         cardHeader: {
//             backgroundColor: '#f7fafc',
//             padding: '10px 20px',
//             borderBottom: '1px solid #e2e8f0',
//             flexShrink: 0,
//         },
//         cardTitle: {
//             fontSize: '0.9rem',
//             fontWeight: '600',
//             color: '#2d3748',
//             margin: 0,
//             display: 'flex',
//             alignItems: 'center',
//             gap: '8px',
//         },
//         cardBody: {
//             padding: '14px 20px',
//             flex: 1,
//             overflow: 'hidden',
//         },
//         formRow: {
//             display: 'grid',
//             gridTemplateColumns: '1fr 1fr 1fr',
//             gap: '10px',
//             marginBottom: '8px',
//         },
//         formGroup: {
//             marginBottom: '0',
//         },
//         label: {
//             display: 'block',
//             fontWeight: '500',
//             color: '#2d3748',
//             fontSize: '0.75rem',
//             marginBottom: '2px',
//         },
//         required: {
//             color: '#e53e3e',
//             marginLeft: '2px',
//         },
//         input: {
//             width: '100%',
//             padding: '5px 10px',
//             border: '1px solid #e2e8f0',
//             borderRadius: '4px',
//             fontSize: '0.8rem',
//             outline: 'none',
//             transition: 'all 0.2s',
//             backgroundColor: '#ffffff',
//             color: '#2d3748',
//             height: '30px',
//         },
//         inputFocus: {
//             borderColor: '#2a4d7a',
//             boxShadow: '0 0 0 2px rgba(42, 77, 122, 0.1)',
//         },
//         inputError: {
//             borderColor: '#fc8181',
//         },
//         select: {
//             width: '100%',
//             minHeight: '30px',
//             border: '1px solid #e2e8f0',
//             borderRadius: '4px',
//             fontSize: '0.8rem',
//         },
//         switchGroup: {
//             display: 'flex',
//             alignItems: 'center',
//             gap: '8px',
//             padding: '4px 0',
//         },
//         switch: {
//             width: '34px',
//             height: '18px',
//             backgroundColor: '#e2e8f0',
//             borderRadius: '9px',
//             position: 'relative',
//             cursor: 'pointer',
//             transition: 'all 0.2s',
//             flexShrink: 0,
//         },
//         switchActive: {
//             backgroundColor: '#2a4d7a',
//         },
//         switchKnob: {
//             width: '14px',
//             height: '14px',
//             backgroundColor: '#ffffff',
//             borderRadius: '50%',
//             position: 'absolute',
//             top: '2px',
//             left: '2px',
//             transition: 'all 0.2s',
//             boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
//         },
//         switchKnobActive: {
//             left: '18px',
//         },
//         switchLabel: {
//             fontSize: '0.8rem',
//             color: '#718096',
//         },
//         buttonGroup: {
//             display: 'flex',
//             gap: '10px',
//             marginTop: '10px',
//             paddingTop: '10px',
//             borderTop: '1px solid #e2e8f0',
//             flexShrink: 0,
//         },
//         buttonPrimary: {
//             padding: '6px 20px',
//             background: '#2a4d7a',
//             color: '#fff',
//             border: 'none',
//             borderRadius: '4px',
//             fontSize: '0.85rem',
//             fontWeight: '500',
//             cursor: 'pointer',
//             transition: 'all 0.2s',
//             display: 'inline-flex',
//             alignItems: 'center',
//             gap: '6px',
//             height: '32px',
//         },
//         buttonPrimaryHover: {
//             background: '#1e3a5f',
//         },
//         buttonOutline: {
//             padding: '6px 20px',
//             background: 'transparent',
//             color: '#4a5568',
//             border: '1px solid #e2e8f0',
//             borderRadius: '4px',
//             fontSize: '0.85rem',
//             fontWeight: '500',
//             cursor: 'pointer',
//             transition: 'all 0.2s',
//             display: 'inline-flex',
//             alignItems: 'center',
//             gap: '6px',
//             textDecoration: 'none',
//             height: '32px',
//         },
//         buttonOutlineHover: {
//             backgroundColor: '#f7fafc',
//             borderColor: '#2a4d7a',
//             color: '#2a4d7a',
//         },
//         errorText: {
//             color: '#e53e3e',
//             fontSize: '0.65rem',
//             marginTop: '2px',
//         },
//         alert: {
//             fontSize: '0.75rem',
//             padding: '4px 10px',
//             marginBottom: '8px',
//         },
//         // Responsive
//         '@media (max-width: 992px)': {
//             formRow: {
//                 gridTemplateColumns: '1fr 1fr',
//             },
//         },
//         '@media (max-width: 576px)': {
//             formRow: {
//                 gridTemplateColumns: '1fr',
//             },
//             header: {
//                 flexDirection: 'column',
//                 alignItems: 'flex-start',
//                 gap: '8px',
//             },
//             buttonGroup: {
//                 flexDirection: 'column',
//             },
//             cardBody: {
//                 padding: '12px 16px',
//             },
//         },
//     };

//     return (
//         <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
//             <NotificationToast 
//                 show={notification.show} 
//                 message={notification.message} 
//                 type={notification.type} 
//                 onClose={() => setNotification({ ...notification, show: false })} 
//             />
            
//             <div style={styles.container}>
//                 {/* Header */}
//                 <div style={styles.header}>
//                     <h4 style={styles.headerTitle}>
//                         <FaBuilding style={styles.headerIcon} />
//                         Create New Company
//                     </h4>
//                     <Link 
//                         to="/user-dashboard" 
//                         style={styles.buttonOutline}
//                         onMouseEnter={(e) => {
//                             e.target.style.backgroundColor = styles.buttonOutlineHover.backgroundColor;
//                             e.target.style.borderColor = styles.buttonOutlineHover.borderColor;
//                             e.target.style.color = styles.buttonOutlineHover.color;
//                         }}
//                         onMouseLeave={(e) => {
//                             e.target.style.backgroundColor = 'transparent';
//                             e.target.style.borderColor = '#e2e8f0';
//                             e.target.style.color = '#4a5568';
//                         }}
//                     >
//                         <FaArrowLeft size={12} />
//                         Back
//                     </Link>
//                 </div>

//                 {/* Card */}
//                 <div style={styles.card}>
                 
                    
//                     <div style={styles.cardBody}>
//                         {loading && (
//                             <div className="text-center py-2">
//                                 <Spinner animation="border" size="sm" style={{ color: '#2a4d7a' }} />
//                             </div>
//                         )}
                        
//                         {error && (
//                             <Alert 
//                                 variant="danger" 
//                                 dismissible 
//                                 onClose={() => setError(null)}
//                                 style={styles.alert}
//                             >
//                                 {error}
//                             </Alert>
//                         )}
                        
//                         {!token ? (
//                             <div className="text-center py-2">
//                                 <p style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '8px' }}>
//                                     Please login to create company.
//                                 </p>
//                                 <Button 
//                                     variant="primary" 
//                                     size="sm"
//                                     onClick={() => navigate('/auth/login')}
//                                     style={{ 
//                                         padding: '3px 12px', 
//                                         fontSize: '0.8rem',
//                                         backgroundColor: '#2a4d7a',
//                                         border: 'none'
//                                     }}
//                                 >
//                                     Login
//                                 </Button>
//                             </div>
//                         ) : (
//                             <Form onSubmit={handleSubmit}>
//                                 {/* Row 1: Company Name, Country, State */}
//                                 <div style={styles.formRow}>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Company Name <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="text"
//                                             name="name"
//                                             value={formData.name}
//                                             onChange={handleChange}
//                                             placeholder="Enter company name"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>Country</label>
//                                         <input
//                                             type="text"
//                                             name="country"
//                                             value={formData.country}
//                                             onChange={handleChange}
//                                             style={{ ...styles.input, backgroundColor: '#f7fafc' }}
//                                             readOnly
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             State <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="text"
//                                             name="state"
//                                             value={formData.state}
//                                             onChange={handleChange}
//                                             placeholder="Enter state"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                 </div>

//                                 {/* Row 2: City, Address, PAN */}
//                                 <div style={styles.formRow}>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             City <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="text"
//                                             name="city"
//                                             value={formData.city}
//                                             onChange={handleChange}
//                                             placeholder="Enter city"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Address <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="text"
//                                             name="address"
//                                             value={formData.address}
//                                             onChange={handleChange}
//                                             placeholder="Enter address"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             PAN Number <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="text"
//                                             name="pan"
//                                             value={formData.pan}
//                                             onChange={handleChange}
//                                             placeholder="Enter PAN number"
//                                             maxLength="9"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                 </div>

//                                 {/* Row 3: Phone, Ward, Email */}
//                                 <div style={styles.formRow}>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Phone Number <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="tel"
//                                             name="phone"
//                                             value={formData.phone}
//                                             onChange={handleChange}
//                                             placeholder="Enter phone number"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Ward Number <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="number"
//                                             name="ward"
//                                             value={formData.ward}
//                                             onChange={handleChange}
//                                             placeholder="Enter ward number"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Email Address <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="email"
//                                             name="email"
//                                             value={formData.email}
//                                             onChange={handleChange}
//                                             placeholder="Enter email address"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                 </div>

//                                 {/* Row 4: Trade Type, Date Format, Start Date */}
//                                 <div style={styles.formRow}>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Trade Type <span style={styles.required}>*</span>
//                                         </label>
//                                         <Select 
//                                             options={tradeTypeOptions} 
//                                             defaultValue={tradeTypeOptions[0]} 
//                                             onChange={(selected) => handleSelectChange('tradeType', selected)} 
//                                             styles={{ 
//                                                 control: (base) => ({ 
//                                                     ...base, 
//                                                     minHeight: '30px', 
//                                                     fontSize: '0.8rem',
//                                                     borderColor: '#e2e8f0',
//                                                     borderRadius: '4px',
//                                                 }),
//                                                 option: (base) => ({
//                                                     ...base,
//                                                     fontSize: '0.8rem',
//                                                 }),
//                                                 singleValue: (base) => ({
//                                                     ...base,
//                                                     fontSize: '0.8rem',
//                                                 }),
//                                                 input: (base) => ({
//                                                     ...base,
//                                                     fontSize: '0.8rem',
//                                                 })
//                                             }} 
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Date Format <span style={styles.required}>*</span>
//                                         </label>
//                                         <Select 
//                                             options={dateFormatOptions} 
//                                             defaultValue={dateFormatOptions[0]} 
//                                             onChange={(selected) => {
//                                                 handleSelectChange('dateFormat', selected);
//                                                 if (selected.value === 'english') {
//                                                     const today = new Date().toISOString().split('T')[0];
//                                                     setFormData(prev => ({
//                                                         ...prev,
//                                                         startDateEnglish: today,
//                                                         endDateEnglish: '',
//                                                         startDateNepali: '',
//                                                         endDateNepali: ''
//                                                     }));
//                                                 } else {
//                                                     const currentNepaliDate = getCurrentNepaliDate();
//                                                     setFormData(prev => ({
//                                                         ...prev,
//                                                         startDateNepali: currentNepaliDate,
//                                                         endDateNepali: '',
//                                                         startDateEnglish: convertBsToAd(currentNepaliDate) || '',
//                                                         endDateEnglish: ''
//                                                     }));
//                                                 }
//                                             }} 
//                                             styles={{ 
//                                                 control: (base) => ({ 
//                                                     ...base, 
//                                                     minHeight: '30px', 
//                                                     fontSize: '0.8rem',
//                                                     borderColor: '#e2e8f0',
//                                                     borderRadius: '4px',
//                                                 }),
//                                                 option: (base) => ({
//                                                     ...base,
//                                                     fontSize: '0.8rem',
//                                                 }),
//                                                 singleValue: (base) => ({
//                                                     ...base,
//                                                     fontSize: '0.8rem',
//                                                 }),
//                                                 input: (base) => ({
//                                                     ...base,
//                                                     fontSize: '0.8rem',
//                                                 })
//                                             }} 
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Start Date <span style={styles.required}>*</span>
//                                         </label>
//                                         {formData.dateFormat === 'english' ? (
//                                             <input
//                                                 type="date"
//                                                 name="startDateEnglish"
//                                                 value={formData.startDateEnglish}
//                                                 onChange={(e) => handleEnglishDateChange('startDateEnglish', e.target.value)}
//                                                 style={styles.input}
//                                                 onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                                 onBlur={(e) => {
//                                                     e.target.style.borderColor = '#e2e8f0';
//                                                     e.target.style.boxShadow = 'none';
//                                                 }}
//                                                 required
//                                             />
//                                         ) : (
//                                             <input
//                                                 type="text"
//                                                 name="startDateNepali"
//                                                 value={formData.startDateNepali}
//                                                 onChange={(e) => handleNepaliDateChange('startDateNepali', e.target.value)}
//                                                 onBlur={(e) => handleNepaliDateBlur('startDateNepali', e.target.value)}
//                                                 placeholder="YYYY-MM-DD"
//                                                 style={{
//                                                     ...styles.input,
//                                                     ...(dateErrors.startDateNepali ? styles.inputError : {})
//                                                 }}
//                                                 onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                                 required
//                                             />
//                                         )}
//                                         {dateErrors.startDateNepali && (
//                                             <div style={styles.errorText}>{dateErrors.startDateNepali}</div>
//                                         )}
//                                     </div>
//                                 </div>

//                                 {/* Row 5: VAT Switch (Full Width) */}
//                                 <div style={{ ...styles.formRow, marginBottom: '0' }}>
//                                     <div style={styles.formGroup}>
//                                         <div style={styles.switchGroup}>
//                                             <label style={{ ...styles.label, marginBottom: '0', cursor: 'pointer' }}>
//                                                 Enable VAT
//                                             </label>
//                                             <div 
//                                                 style={{
//                                                     ...styles.switch,
//                                                     ...(formData.vatEnabled ? styles.switchActive : {})
//                                                 }}
//                                                 onClick={() => setFormData(prev => ({ ...prev, vatEnabled: !prev.vatEnabled }))}
//                                             >
//                                                 <div style={{
//                                                     ...styles.switchKnob,
//                                                     ...(formData.vatEnabled ? styles.switchKnobActive : {})
//                                                 }} />
//                                             </div>
//                                             <span style={styles.switchLabel}>
//                                                 {formData.vatEnabled ? 'Enabled' : 'Disabled'}
//                                             </span>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 {/* Buttons */}
//                                 <div style={styles.buttonGroup}>
//                                     <Link
//                                         to="/user-dashboard"
//                                         style={styles.buttonOutline}
//                                         onMouseEnter={(e) => {
//                                             e.target.style.backgroundColor = styles.buttonOutlineHover.backgroundColor;
//                                             e.target.style.borderColor = styles.buttonOutlineHover.borderColor;
//                                             e.target.style.color = styles.buttonOutlineHover.color;
//                                         }}
//                                         onMouseLeave={(e) => {
//                                             e.target.style.backgroundColor = 'transparent';
//                                             e.target.style.borderColor = '#e2e8f0';
//                                             e.target.style.color = '#4a5568';
//                                         }}
//                                     >
//                                         <FaArrowLeft size={12} />
//                                         Cancel
//                                     </Link>
//                                     <button
//                                         type="submit"
//                                         style={styles.buttonPrimary}
//                                         disabled={loading || !token}
//                                         onMouseEnter={(e) => {
//                                             if (!loading && token) {
//                                                 e.target.style.background = styles.buttonPrimaryHover.background;
//                                             }
//                                         }}
//                                         onMouseLeave={(e) => {
//                                             e.target.style.background = styles.buttonPrimary.background;
//                                         }}
//                                     >
//                                         {loading ? (
//                                             <>
//                                                 <FaSpinner className="fa-spin" size={12} />
//                                                 Creating...
//                                             </>
//                                         ) : (
//                                             <>
//                                                 <FaSave size={12} />
//                                                 Create Company
//                                             </>
//                                         )}
//                                     </button>
//                                 </div>
//                             </Form>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             <style>{`
//                 .fa-spin {
//                     animation: spin 0.8s linear infinite;
//                 }
//                 @keyframes spin {
//                     0% { transform: rotate(0deg); }
//                     100% { transform: rotate(360deg); }
//                 }
//                 a:hover {
//                     text-decoration: none !important;
//                 }
//             `}</style>
//         </DashboardLayout>
//     );
// };

// export default CompanyForm;

//-----------------------------------------------end2

// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import api from '../../components/services/api';
// import { Form, Button, Container, Card, Spinner, Row, Col, Alert } from 'react-bootstrap';
// import Select from 'react-select';
// import DashboardLayout from '../company/DashboardLayout';
// import NotificationToast from '../NotificationToast';
// import NepaliDate from 'nepali-datetime';
// import { FaBuilding, FaArrowLeft, FaSave, FaSpinner, FaCalendarAlt } from 'react-icons/fa';
// import { Link } from 'react-router-dom';

// // Date conversion utilities
// const convertBsToAd = (bsDate) => {
//     if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
//     try {
//         const nepaliDate = new NepaliDate(bsDate);
//         if (!nepaliDate || typeof nepaliDate.getDateObject !== 'function') {
//             console.error('Invalid NepaliDate object or missing getDateObject method');
//             return null;
//         }
//         const jsDate = nepaliDate.getDateObject();
//         if (!jsDate || isNaN(jsDate.getTime())) {
//             console.error('Invalid AD date generated from BS date:', bsDate);
//             return null;
//         }
//         const year = jsDate.getFullYear();
//         const month = String(jsDate.getMonth() + 1).padStart(2, '0');
//         const day = String(jsDate.getDate()).padStart(2, '0');
//         return `${year}-${month}-${day}`;
//     } catch (error) {
//         console.error('Error converting BS to AD:', error.message, 'Date:', bsDate);
//         return null;
//     }
// };

// const convertAdToBs = (adDate) => {
//     if (!adDate) return null;
//     try {
//         let date;
//         if (typeof adDate === 'string') {
//             if (/^\d{4}-\d{2}-\d{2}$/.test(adDate)) {
//                 date = new Date(adDate + 'T00:00:00');
//             } else {
//                 date = new Date(adDate);
//             }
//         } else if (adDate instanceof Date) {
//             date = adDate;
//         } else {
//             return null;
//         }
//         if (isNaN(date.getTime())) {
//             console.error('Invalid AD date:', adDate);
//             return null;
//         }
//         const nepaliDate = new NepaliDate(date);
//         if (!nepaliDate || typeof nepaliDate.getYear !== 'function') {
//             console.error('Invalid NepaliDate object');
//             return null;
//         }
//         const year = nepaliDate.getYear();
//         const month = nepaliDate.getMonth();
//         const day = nepaliDate.getDate();
//         if (!year || !month === undefined || !day) {
//             console.error('Invalid BS components generated');
//             return null;
//         }
//         return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//     } catch (error) {
//         console.error('Error converting AD to BS:', error.message, 'Date:', adDate);
//         return null;
//     }
// };

// const isValidNepaliDate = (dateStr) => {
//     if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
//     try {
//         const [year, month, day] = dateStr.split('-').map(Number);
//         if (month < 1 || month > 12) return false;
//         if (day < 1 || day > 32) return false;
//         const nepaliDate = new NepaliDate(dateStr);
//         if (!nepaliDate || typeof nepaliDate.getYear !== 'function') {
//             return false;
//         }
//         const bsYear = nepaliDate.getYear();
//         const bsMonth = nepaliDate.getMonth() + 1;
//         const bsDay = nepaliDate.getDate();
//         return (bsYear === year && bsMonth === month && bsDay === day);
//     } catch (error) {
//         console.warn('Invalid Nepali date:', dateStr, error.message);
//         return false;
//     }
// };

// const getCurrentNepaliDate = () => {
//     try {
//         const now = new NepaliDate();
//         if (!now || typeof now.getYear !== 'function') {
//             return '2080-01-01';
//         }
//         const year = now.getYear();
//         const month = now.getMonth() + 1;
//         const day = now.getDate();
//         if (!year || !month || !day) {
//             return '2080-01-01';
//         }
//         return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//     } catch (error) {
//         console.error('Error getting current Nepali date:', error);
//         return '2080-01-01';
//     }
// };

// // Nepali Calendar Component
// const NepaliCalendar = ({ value, onChange, onClose }) => {
//     const [currentYear, setCurrentYear] = useState(2080);
//     const [currentMonth, setCurrentMonth] = useState(0);
//     const [selectedDate, setSelectedDate] = useState(null);
//     const [days, setDays] = useState([]);

//     const monthNames = ['Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];

//     useEffect(() => {
//         if (value) {
//             const parts = value.split('-');
//             if (parts.length === 3) {
//                 setCurrentYear(parseInt(parts[0]));
//                 setCurrentMonth(parseInt(parts[1]) - 1);
//                 setSelectedDate(parseInt(parts[2]));
//             }
//         }
//         generateCalendar(currentYear, currentMonth);
//     }, []);

//     const generateCalendar = (year, month) => {
//         try {
//             const firstDay = new NepaliDate(year, month, 1);
//             const lastDay = new NepaliDate(year, month, getDaysInMonth(year, month));
            
//             const firstDayOfWeek = firstDay.getDay();
//             const daysInMonth = getDaysInMonth(year, month);
            
//             const calendarDays = [];
            
//             // Empty cells for days before the first day of month
//             for (let i = 0; i < firstDayOfWeek; i++) {
//                 calendarDays.push(null);
//             }
            
//             // Days of the month
//             for (let i = 1; i <= daysInMonth; i++) {
//                 calendarDays.push(i);
//             }
            
//             setDays(calendarDays);
//         } catch (error) {
//             console.error('Error generating calendar:', error);
//         }
//     };

//     const getDaysInMonth = (year, month) => {
//         try {
//             const nextMonth = new NepaliDate(year, month + 1, 1);
//             const currentMonth = new NepaliDate(year, month, 1);
//             const diff = nextMonth.getTime() - currentMonth.getTime();
//             return Math.ceil(diff / (24 * 60 * 60 * 1000));
//         } catch (error) {
//             return 32;
//         }
//     };

//     const handleDateSelect = (day) => {
//         if (day === null) return;
//         const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//         setSelectedDate(day);
//         onChange(dateStr);
//         onClose();
//     };

//     const changeMonth = (delta) => {
//         let newMonth = currentMonth + delta;
//         let newYear = currentYear;
//         if (newMonth < 0) {
//             newMonth = 11;
//             newYear--;
//         } else if (newMonth > 11) {
//             newMonth = 0;
//             newYear++;
//         }
//         setCurrentYear(newYear);
//         setCurrentMonth(newMonth);
//         generateCalendar(newYear, newMonth);
//     };

//     return (
//         <div style={{
//             position: 'absolute',
//             top: '100%',
//             left: 0,
//             zIndex: 1000,
//             backgroundColor: '#ffffff',
//             border: '1px solid #e2e8f0',
//             borderRadius: '8px',
//             boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
//             padding: '12px',
//             width: '280px',
//             marginTop: '4px',
//         }}>
//             {/* Calendar Header */}
//             <div style={{
//                 display: 'flex',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 marginBottom: '10px',
//             }}>
//                 <button
//                     onClick={() => changeMonth(-1)}
//                     style={{
//                         background: 'none',
//                         border: 'none',
//                         cursor: 'pointer',
//                         fontSize: '16px',
//                         color: '#2a4d7a',
//                         padding: '4px 8px',
//                     }}
//                 >
//                     ◀
//                 </button>
//                 <span style={{
//                     fontSize: '14px',
//                     fontWeight: '600',
//                     color: '#1a202c',
//                 }}>
//                     {monthNames[currentMonth]} {currentYear}
//                 </span>
//                 <button
//                     onClick={() => changeMonth(1)}
//                     style={{
//                         background: 'none',
//                         border: 'none',
//                         cursor: 'pointer',
//                         fontSize: '16px',
//                         color: '#2a4d7a',
//                         padding: '4px 8px',
//                     }}
//                 >
//                     ▶
//                 </button>
//             </div>

//             {/* Day Names */}
//             <div style={{
//                 display: 'grid',
//                 gridTemplateColumns: 'repeat(7, 1fr)',
//                 gap: '4px',
//                 marginBottom: '8px',
//             }}>
//                 {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
//                     <div key={day} style={{
//                         textAlign: 'center',
//                         fontSize: '11px',
//                         fontWeight: '600',
//                         color: '#718096',
//                         padding: '4px 0',
//                     }}>
//                         {day}
//                     </div>
//                 ))}
//             </div>

//             {/* Days */}
//             <div style={{
//                 display: 'grid',
//                 gridTemplateColumns: 'repeat(7, 1fr)',
//                 gap: '4px',
//             }}>
//                 {days.map((day, index) => (
//                     <button
//                         key={index}
//                         onClick={() => handleDateSelect(day)}
//                         disabled={day === null}
//                         style={{
//                             padding: '6px 0',
//                             textAlign: 'center',
//                             fontSize: '13px',
//                             borderRadius: '4px',
//                             border: 'none',
//                             cursor: day === null ? 'default' : 'pointer',
//                             backgroundColor: day === selectedDate ? '#2a4d7a' : 'transparent',
//                             color: day === selectedDate ? '#ffffff' : (day === null ? '#e2e8f0' : '#2d3748'),
//                             transition: 'all 0.2s',
//                             fontWeight: day === selectedDate ? '600' : '400',
//                         }}
//                         onMouseEnter={(e) => {
//                             if (day !== null && day !== selectedDate) {
//                                 e.target.style.backgroundColor = '#f7fafc';
//                             }
//                         }}
//                         onMouseLeave={(e) => {
//                             if (day !== null && day !== selectedDate) {
//                                 e.target.style.backgroundColor = 'transparent';
//                             }
//                         }}
//                     >
//                         {day}
//                     </button>
//                 ))}
//             </div>

//             {/* Today Button */}
//             <div style={{
//                 marginTop: '10px',
//                 paddingTop: '10px',
//                 borderTop: '1px solid #e2e8f0',
//                 textAlign: 'center',
//             }}>
//                 <button
//                     onClick={() => {
//                         const today = getCurrentNepaliDate();
//                         onChange(today);
//                         onClose();
//                     }}
//                     style={{
//                         background: 'none',
//                         border: 'none',
//                         color: '#2a4d7a',
//                         fontSize: '12px',
//                         cursor: 'pointer',
//                         fontWeight: '500',
//                         padding: '4px 12px',
//                     }}
//                 >
//                     Today
//                 </button>
//             </div>
//         </div>
//     );
// };

// const CompanyForm = () => {
//     const navigate = useNavigate();
//     const [loading, setLoading] = useState(false);
//     const [user, setUser] = useState(null);
//     const [isAdminOrSupervisor, setIsAdminOrSupervisor] = useState(false);
//     const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
//     const [error, setError] = useState(null);
//     const [dateErrors, setDateErrors] = useState({
//         startDateNepali: '',
//         endDateNepali: ''
//     });
//     const [showCalendar, setShowCalendar] = useState(false);
//     const [calendarField, setCalendarField] = useState('startDateNepali');
//     const calendarRef = useRef(null);

//     const currentUser = useSelector((state) => state.auth.userInfo);
//     const token = localStorage.getItem('token');

//     // Close calendar when clicking outside
//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (calendarRef.current && !calendarRef.current.contains(event.target)) {
//                 setShowCalendar(false);
//             }
//         };
//         document.addEventListener('mousedown', handleClickOutside);
//         return () => document.removeEventListener('mousedown', handleClickOutside);
//     }, []);

//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 setLoading(true);
//                 if (currentUser) {
//                     setUser(currentUser);
//                     setIsAdminOrSupervisor(currentUser.isAdmin || currentUser.role === 'Supervisor');
//                     setLoading(false);
//                     return;
//                 }
//                 if (!localStorage.getItem('token')) {
//                     setNotification({ show: true, message: 'Please login first', type: 'error' });
//                     setTimeout(() => navigate('/auth/login'), 2000);
//                     return;
//                 }
//                 const userRes = await api.get('/api/User/current');
//                 setUser(userRes.data.user);
//                 setIsAdminOrSupervisor(userRes.data.user.isAdmin || userRes.data.user.role === 'Supervisor');
//             } catch (err) {
//                 if (err.response?.status === 401) {
//                     setNotification({ show: true, message: 'Session expired', type: 'error' });
//                     setTimeout(() => navigate('/auth/login'), 2000);
//                 }
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchData();
//     }, [currentUser, navigate]);

//     const [formData, setFormData] = useState({
//         name: '', address: '', country: 'Nepal', state: '', city: '', pan: '',
//         phone: '', ward: '', email: '', tradeType: 'retailer', dateFormat: 'english',
//         startDateEnglish: new Date().toISOString().split('T')[0],
//         endDateEnglish: '', startDateNepali: '', endDateNepali: '', vatEnabled: false
//     });

//     const tradeTypeOptions = [{ value: 'retailer', label: 'Retailer' }];
//     const dateFormatOptions = [
//         { value: 'english', label: 'English' },
//         { value: 'nepali', label: 'Nepali' }
//     ];

//     const handleChange = (e) => {
//         const { name, value, type, checked } = e.target;
//         setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
//     };

//     const handleSelectChange = (name, selected) => {
//         setFormData(prev => ({ ...prev, [name]: selected.value }));
//     };

//     const handleNepaliDateChange = (field, value) => {
//         const sanitizedValue = value.replace(/[^0-9/-]/g, '');
        
//         if (sanitizedValue.length <= 10) {
//             setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
//             setDateErrors(prev => ({ ...prev, [field]: '' }));

//             // Validate and convert when we have a complete date
//             if (sanitizedValue.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(sanitizedValue)) {
//                 if (isValidNepaliDate(sanitizedValue)) {
//                     const adDate = convertBsToAd(sanitizedValue);
//                     if (adDate) {
//                         if (field === 'startDateNepali') {
//                             setFormData(prev => ({ ...prev, startDateEnglish: adDate }));
//                         } else if (field === 'endDateNepali') {
//                             setFormData(prev => ({ ...prev, endDateEnglish: adDate }));
//                         }
//                     }
//                 } else {
//                     setDateErrors(prev => ({ ...prev, [field]: 'Invalid Nepali date format' }));
//                 }
//             }
//         }
//     };

//     const handleNepaliDateBlur = (field, value) => {
//         const dateStr = value.trim();
//         if (!dateStr) {
//             setDateErrors(prev => ({ ...prev, [field]: '' }));
//             return;
//         }

//         if (isValidNepaliDate(dateStr)) {
//             const adDate = convertBsToAd(dateStr);
//             if (adDate) {
//                 if (field === 'startDateNepali') {
//                     setFormData(prev => ({ ...prev, startDateNepali: dateStr, startDateEnglish: adDate }));
//                 } else if (field === 'endDateNepali') {
//                     setFormData(prev => ({ ...prev, endDateNepali: dateStr, endDateEnglish: adDate }));
//                 }
//             }
//             setDateErrors(prev => ({ ...prev, [field]: '' }));
//         } else {
//             setDateErrors(prev => ({ ...prev, [field]: 'Please enter a valid Nepali date (YYYY-MM-DD)' }));
//         }
//     };

//     const handleCalendarSelect = (dateStr) => {
//         if (calendarField === 'startDateNepali') {
//             const adDate = convertBsToAd(dateStr);
//             setFormData(prev => ({
//                 ...prev,
//                 startDateNepali: dateStr,
//                 startDateEnglish: adDate || prev.startDateEnglish
//             }));
//             setDateErrors(prev => ({ ...prev, startDateNepali: '' }));
//         } else if (calendarField === 'endDateNepali') {
//             const adDate = convertBsToAd(dateStr);
//             setFormData(prev => ({
//                 ...prev,
//                 endDateNepali: dateStr,
//                 endDateEnglish: adDate || prev.endDateEnglish
//             }));
//             setDateErrors(prev => ({ ...prev, endDateNepali: '' }));
//         }
//         setShowCalendar(false);
//     };

//     const handleEnglishDateChange = (field, value) => {
//         setFormData(prev => ({ ...prev, [field]: value }));
        
//         if (formData.dateFormat === 'nepali' && value) {
//             const bsDate = convertAdToBs(value);
//             if (bsDate) {
//                 if (field === 'startDateEnglish') {
//                     setFormData(prev => ({ ...prev, startDateNepali: bsDate }));
//                 } else if (field === 'endDateEnglish') {
//                     setFormData(prev => ({ ...prev, endDateNepali: bsDate }));
//                 }
//             }
//         }
//     };

//     useEffect(() => {
//         if (formData.dateFormat === 'english' && formData.startDateEnglish) {
//             const start = new Date(formData.startDateEnglish);
//             const end = new Date(start);
//             end.setFullYear(end.getFullYear() + 1);
//             end.setDate(end.getDate() - 1);
//             setFormData(prev => ({ ...prev, endDateEnglish: end.toISOString().split('T')[0] }));
//         }
//     }, [formData.startDateEnglish, formData.dateFormat]);

//     useEffect(() => {
//         if (formData.dateFormat === 'nepali' && formData.startDateNepali && isValidNepaliDate(formData.startDateNepali)) {
//             const startAd = convertBsToAd(formData.startDateNepali);
//             if (startAd) {
//                 const startDate = new Date(startAd);
//                 const endDate = new Date(startDate);
//                 endDate.setFullYear(endDate.getFullYear() + 1);
//                 endDate.setDate(endDate.getDate() - 1);
//                 const endAd = endDate.toISOString().split('T')[0];
//                 const endBs = convertAdToBs(endAd);
//                 if (endBs) {
//                     setFormData(prev => ({ ...prev, endDateNepali: endBs, endDateEnglish: endAd }));
//                 }
//             }
//         }
//     }, [formData.startDateNepali, formData.dateFormat]);

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setLoading(true);
//         setError(null);
        
//         try {
//             const storedToken = localStorage.getItem('token');
//             if (!storedToken) {
//                 setNotification({ show: true, message: 'Please login', type: 'error' });
//                 setTimeout(() => navigate('/auth/login'), 2000);
//                 return;
//             }

//             const requestData = {
//                 name: formData.name, address: formData.address, country: formData.country,
//                 state: formData.state, city: formData.city, pan: formData.pan,
//                 phone: formData.phone, ward: formData.ward ? parseInt(formData.ward) : null,
//                 email: formData.email, tradeType: formData.tradeType,
//                 dateFormat: formData.dateFormat, vatEnabled: formData.vatEnabled,
//                 startDateEnglish: formData.startDateEnglish || '',
//                 endDateEnglish: formData.endDateEnglish || '',
//                 startDateNepali: formData.startDateNepali || '',
//                 endDateNepali: formData.endDateNepali || ''
//             };

//             await api.post('/api/Companies', requestData, {
//                 headers: { 'Authorization': `Bearer ${storedToken}` }
//             });

//             setNotification({ show: true, message: 'Company created successfully!', type: 'success' });
//             setTimeout(() => navigate('/user-dashboard'), 1500);
//         } catch (err) {
//             const errorMessage = err.response?.data?.message || 'Error creating company';
//             setError(errorMessage);
//             setNotification({ show: true, message: errorMessage, type: 'error' });
            
//             if (err.response?.status === 401) {
//                 localStorage.removeItem('token');
//                 setTimeout(() => navigate('/auth/login'), 2000);
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Compact styles - 3 columns
//     const styles = {
//         container: {
//             minHeight: 'calc(100vh - 60px)',
//             backgroundColor: '#f8f9fa',
//             fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
//             padding: '12px 20px',
//             display: 'flex',
//             flexDirection: 'column',
//         },
//         header: {
//             display: 'flex',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             marginBottom: '12px',
//             paddingBottom: '10px',
//             borderBottom: '1px solid #e2e8f0',
//             flexShrink: 0,
//         },
//         headerTitle: {
//             fontSize: '1.2rem',
//             fontWeight: '600',
//             color: '#1a202c',
//             display: 'flex',
//             alignItems: 'center',
//             gap: '10px',
//             margin: 0,
//         },
//         headerIcon: {
//             color: '#2a4d7a',
//         },
//         card: {
//             backgroundColor: '#ffffff',
//             borderRadius: '10px',
//             boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
//             border: '1px solid #e2e8f0',
//             overflow: 'hidden',
//             flex: 1,
//             display: 'flex',
//             flexDirection: 'column',
//         },
//         cardHeader: {
//             backgroundColor: '#f7fafc',
//             padding: '10px 20px',
//             borderBottom: '1px solid #e2e8f0',
//             flexShrink: 0,
//         },
//         cardTitle: {
//             fontSize: '0.9rem',
//             fontWeight: '600',
//             color: '#2d3748',
//             margin: 0,
//             display: 'flex',
//             alignItems: 'center',
//             gap: '8px',
//         },
//         cardBody: {
//             padding: '14px 20px 4px 20px',
//             flex: 1,
//         },
//         formRow: {
//             display: 'grid',
//             gridTemplateColumns: '1fr 1fr 1fr',
//             gap: '10px',
//             marginBottom: '8px',
//         },
//         formGroup: {
//             marginBottom: '0',
//             position: 'relative',
//         },
//         label: {
//             display: 'block',
//             fontWeight: '500',
//             color: '#2d3748',
//             fontSize: '0.75rem',
//             marginBottom: '2px',
//         },
//         required: {
//             color: '#e53e3e',
//             marginLeft: '2px',
//         },
//         input: {
//             width: '100%',
//             padding: '5px 30px 5px 10px',
//             border: '1px solid #e2e8f0',
//             borderRadius: '4px',
//             fontSize: '0.8rem',
//             outline: 'none',
//             transition: 'all 0.2s',
//             backgroundColor: '#ffffff',
//             color: '#2d3748',
//             height: '30px',
//         },
//         inputFocus: {
//             borderColor: '#2a4d7a',
//             boxShadow: '0 0 0 2px rgba(42, 77, 122, 0.1)',
//         },
//         inputError: {
//             borderColor: '#fc8181',
//         },
//         calendarIcon: {
//             position: 'absolute',
//             right: '8px',
//             top: '50%',
//             transform: 'translateY(-50%)',
//             color: '#a0aec0',
//             cursor: 'pointer',
//             fontSize: '14px',
//             zIndex: 2,
//         },
//         calendarIconHover: {
//             color: '#2a4d7a',
//         },
//         select: {
//             width: '100%',
//             minHeight: '30px',
//             border: '1px solid #e2e8f0',
//             borderRadius: '4px',
//             fontSize: '0.8rem',
//         },
//         switchGroup: {
//             display: 'flex',
//             alignItems: 'center',
//             gap: '8px',
//             padding: '4px 0',
//         },
//         switch: {
//             width: '34px',
//             height: '18px',
//             backgroundColor: '#e2e8f0',
//             borderRadius: '9px',
//             position: 'relative',
//             cursor: 'pointer',
//             transition: 'all 0.2s',
//             flexShrink: 0,
//         },
//         switchActive: {
//             backgroundColor: '#2a4d7a',
//         },
//         switchKnob: {
//             width: '14px',
//             height: '14px',
//             backgroundColor: '#ffffff',
//             borderRadius: '50%',
//             position: 'absolute',
//             top: '2px',
//             left: '2px',
//             transition: 'all 0.2s',
//             boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
//         },
//         switchKnobActive: {
//             left: '18px',
//         },
//         switchLabel: {
//             fontSize: '0.8rem',
//             color: '#718096',
//         },
//         buttonGroup: {
//             display: 'flex',
//             gap: '10px',
//             marginTop: '6px',
//             paddingTop: '6px',
//             borderTop: '1px solid #e2e8f0',
//             flexShrink: 0,
//         },
//         buttonPrimary: {
//             padding: '6px 20px',
//             background: '#2a4d7a',
//             color: '#fff',
//             border: 'none',
//             borderRadius: '4px',
//             fontSize: '0.85rem',
//             fontWeight: '500',
//             cursor: 'pointer',
//             transition: 'all 0.2s',
//             display: 'inline-flex',
//             alignItems: 'center',
//             gap: '6px',
//             height: '32px',
//         },
//         buttonPrimaryHover: {
//             background: '#1e3a5f',
//         },
//         buttonOutline: {
//             padding: '6px 20px',
//             background: 'transparent',
//             color: '#4a5568',
//             border: '1px solid #e2e8f0',
//             borderRadius: '4px',
//             fontSize: '0.85rem',
//             fontWeight: '500',
//             cursor: 'pointer',
//             transition: 'all 0.2s',
//             display: 'inline-flex',
//             alignItems: 'center',
//             gap: '6px',
//             textDecoration: 'none',
//             height: '32px',
//         },
//         buttonOutlineHover: {
//             backgroundColor: '#f7fafc',
//             borderColor: '#2a4d7a',
//             color: '#2a4d7a',
//         },
//         errorText: {
//             color: '#e53e3e',
//             fontSize: '0.65rem',
//             marginTop: '2px',
//         },
//         alert: {
//             fontSize: '0.75rem',
//             padding: '4px 10px',
//             marginBottom: '8px',
//         },
//         // Responsive
//         '@media (max-width: 992px)': {
//             formRow: {
//                 gridTemplateColumns: '1fr 1fr',
//             },
//         },
//         '@media (max-width: 576px)': {
//             formRow: {
//                 gridTemplateColumns: '1fr',
//             },
//             header: {
//                 flexDirection: 'column',
//                 alignItems: 'flex-start',
//                 gap: '8px',
//             },
//             buttonGroup: {
//                 flexDirection: 'column',
//             },
//             cardBody: {
//                 padding: '12px 16px 4px 16px',
//             },
//         },
//     };

//     return (
//         <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
//             <NotificationToast 
//                 show={notification.show} 
//                 message={notification.message} 
//                 type={notification.type} 
//                 onClose={() => setNotification({ ...notification, show: false })} 
//             />
            
//             <div style={styles.container}>
//                 {/* Header */}
//                 <div style={styles.header}>
//                     <h4 style={styles.headerTitle}>
//                         <FaBuilding style={styles.headerIcon} />
//                         Create New Company
//                     </h4>
//                     <Link 
//                         to="/user-dashboard" 
//                         style={styles.buttonOutline}
//                         onMouseEnter={(e) => {
//                             e.target.style.backgroundColor = styles.buttonOutlineHover.backgroundColor;
//                             e.target.style.borderColor = styles.buttonOutlineHover.borderColor;
//                             e.target.style.color = styles.buttonOutlineHover.color;
//                         }}
//                         onMouseLeave={(e) => {
//                             e.target.style.backgroundColor = 'transparent';
//                             e.target.style.borderColor = '#e2e8f0';
//                             e.target.style.color = '#4a5568';
//                         }}
//                     >
//                         <FaArrowLeft size={12} />
//                         Back
//                     </Link>
//                 </div>

//                 {/* Card */}
//                 <div style={styles.card}>
//                     <div style={styles.cardHeader}>
//                         <h6 style={styles.cardTitle}>
//                             <FaBuilding size={14} style={{ color: '#2a4d7a' }} />
//                             Company Information
//                         </h6>
//                     </div>
                    
//                     <div style={styles.cardBody}>
//                         {loading && (
//                             <div className="text-center py-2">
//                                 <Spinner animation="border" size="sm" style={{ color: '#2a4d7a' }} />
//                             </div>
//                         )}
                        
//                         {error && (
//                             <Alert 
//                                 variant="danger" 
//                                 dismissible 
//                                 onClose={() => setError(null)}
//                                 style={styles.alert}
//                             >
//                                 {error}
//                             </Alert>
//                         )}
                        
//                         {!token ? (
//                             <div className="text-center py-2">
//                                 <p style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '8px' }}>
//                                     Please login to create company.
//                                 </p>
//                                 <Button 
//                                     variant="primary" 
//                                     size="sm"
//                                     onClick={() => navigate('/auth/login')}
//                                     style={{ 
//                                         padding: '3px 12px', 
//                                         fontSize: '0.8rem',
//                                         backgroundColor: '#2a4d7a',
//                                         border: 'none'
//                                     }}
//                                 >
//                                     Login
//                                 </Button>
//                             </div>
//                         ) : (
//                             <Form onSubmit={handleSubmit}>
//                                 {/* Row 1: Company Name, Country, State */}
//                                 <div style={styles.formRow}>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Company Name <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="text"
//                                             name="name"
//                                             value={formData.name}
//                                             onChange={handleChange}
//                                             placeholder="Enter company name"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>Country</label>
//                                         <input
//                                             type="text"
//                                             name="country"
//                                             value={formData.country}
//                                             onChange={handleChange}
//                                             style={{ ...styles.input, backgroundColor: '#f7fafc' }}
//                                             readOnly
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             State <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="text"
//                                             name="state"
//                                             value={formData.state}
//                                             onChange={handleChange}
//                                             placeholder="Enter state"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                 </div>

//                                 {/* Row 2: City, Address, PAN */}
//                                 <div style={styles.formRow}>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             City <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="text"
//                                             name="city"
//                                             value={formData.city}
//                                             onChange={handleChange}
//                                             placeholder="Enter city"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Address <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="text"
//                                             name="address"
//                                             value={formData.address}
//                                             onChange={handleChange}
//                                             placeholder="Enter address"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             PAN Number <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="text"
//                                             name="pan"
//                                             value={formData.pan}
//                                             onChange={handleChange}
//                                             placeholder="Enter PAN number"
//                                             maxLength="9"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                 </div>

//                                 {/* Row 3: Phone, Ward, Email */}
//                                 <div style={styles.formRow}>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Phone Number <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="tel"
//                                             name="phone"
//                                             value={formData.phone}
//                                             onChange={handleChange}
//                                             placeholder="Enter phone number"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Ward Number <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="number"
//                                             name="ward"
//                                             value={formData.ward}
//                                             onChange={handleChange}
//                                             placeholder="Enter ward number"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Email Address <span style={styles.required}>*</span>
//                                         </label>
//                                         <input
//                                             type="email"
//                                             name="email"
//                                             value={formData.email}
//                                             onChange={handleChange}
//                                             placeholder="Enter email address"
//                                             style={styles.input}
//                                             onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                             onBlur={(e) => {
//                                                 e.target.style.borderColor = '#e2e8f0';
//                                                 e.target.style.boxShadow = 'none';
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                 </div>

//                                 {/* Row 4: Trade Type, Date Format, Start Date */}
//                                 <div style={styles.formRow}>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Trade Type <span style={styles.required}>*</span>
//                                         </label>
//                                         <Select 
//                                             options={tradeTypeOptions} 
//                                             defaultValue={tradeTypeOptions[0]} 
//                                             onChange={(selected) => handleSelectChange('tradeType', selected)} 
//                                             styles={{ 
//                                                 control: (base) => ({ 
//                                                     ...base, 
//                                                     minHeight: '30px', 
//                                                     fontSize: '0.8rem',
//                                                     borderColor: '#e2e8f0',
//                                                     borderRadius: '4px',
//                                                 }),
//                                                 option: (base) => ({
//                                                     ...base,
//                                                     fontSize: '0.8rem',
//                                                 }),
//                                                 singleValue: (base) => ({
//                                                     ...base,
//                                                     fontSize: '0.8rem',
//                                                 }),
//                                                 input: (base) => ({
//                                                     ...base,
//                                                     fontSize: '0.8rem',
//                                                 })
//                                             }} 
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Date Format <span style={styles.required}>*</span>
//                                         </label>
//                                         <Select 
//                                             options={dateFormatOptions} 
//                                             defaultValue={dateFormatOptions[0]} 
//                                             onChange={(selected) => {
//                                                 handleSelectChange('dateFormat', selected);
//                                                 if (selected.value === 'english') {
//                                                     const today = new Date().toISOString().split('T')[0];
//                                                     setFormData(prev => ({
//                                                         ...prev,
//                                                         startDateEnglish: today,
//                                                         endDateEnglish: '',
//                                                         startDateNepali: '',
//                                                         endDateNepali: ''
//                                                     }));
//                                                 } else {
//                                                     const currentNepaliDate = getCurrentNepaliDate();
//                                                     setFormData(prev => ({
//                                                         ...prev,
//                                                         startDateNepali: currentNepaliDate,
//                                                         endDateNepali: '',
//                                                         startDateEnglish: convertBsToAd(currentNepaliDate) || '',
//                                                         endDateEnglish: ''
//                                                     }));
//                                                 }
//                                             }} 
//                                             styles={{ 
//                                                 control: (base) => ({ 
//                                                     ...base, 
//                                                     minHeight: '30px', 
//                                                     fontSize: '0.8rem',
//                                                     borderColor: '#e2e8f0',
//                                                     borderRadius: '4px',
//                                                 }),
//                                                 option: (base) => ({
//                                                     ...base,
//                                                     fontSize: '0.8rem',
//                                                 }),
//                                                 singleValue: (base) => ({
//                                                     ...base,
//                                                     fontSize: '0.8rem',
//                                                 }),
//                                                 input: (base) => ({
//                                                     ...base,
//                                                     fontSize: '0.8rem',
//                                                 })
//                                             }} 
//                                         />
//                                     </div>
//                                     <div style={styles.formGroup}>
//                                         <label style={styles.label}>
//                                             Start Date <span style={styles.required}>*</span>
//                                         </label>
//                                         {formData.dateFormat === 'english' ? (
//                                             <input
//                                                 type="date"
//                                                 name="startDateEnglish"
//                                                 value={formData.startDateEnglish}
//                                                 onChange={(e) => handleEnglishDateChange('startDateEnglish', e.target.value)}
//                                                 style={styles.input}
//                                                 onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                                 onBlur={(e) => {
//                                                     e.target.style.borderColor = '#e2e8f0';
//                                                     e.target.style.boxShadow = 'none';
//                                                 }}
//                                                 required
//                                             />
//                                         ) : (
//                                             <div style={{ position: 'relative' }}>
//                                                 <input
//                                                     type="text"
//                                                     name="startDateNepali"
//                                                     value={formData.startDateNepali}
//                                                     onChange={(e) => handleNepaliDateChange('startDateNepali', e.target.value)}
//                                                     onBlur={(e) => handleNepaliDateBlur('startDateNepali', e.target.value)}
//                                                     placeholder="YYYY-MM-DD"
//                                                     style={{
//                                                         ...styles.input,
//                                                         ...(dateErrors.startDateNepali ? styles.inputError : {})
//                                                     }}
//                                                     onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                                                     required
//                                                 />
//                                                 <FaCalendarAlt
//                                                     style={styles.calendarIcon}
//                                                     onClick={() => {
//                                                         setCalendarField('startDateNepali');
//                                                         setShowCalendar(!showCalendar);
//                                                     }}
//                                                     onMouseEnter={(e) => {
//                                                         e.target.style.color = styles.calendarIconHover.color;
//                                                     }}
//                                                     onMouseLeave={(e) => {
//                                                         e.target.style.color = '#a0aec0';
//                                                     }}
//                                                 />
//                                                 {showCalendar && calendarField === 'startDateNepali' && (
//                                                     <div ref={calendarRef}>
//                                                         <NepaliCalendar
//                                                             value={formData.startDateNepali}
//                                                             onChange={handleCalendarSelect}
//                                                             onClose={() => setShowCalendar(false)}
//                                                         />
//                                                     </div>
//                                                 )}
//                                             </div>
//                                         )}
//                                         {dateErrors.startDateNepali && (
//                                             <div style={styles.errorText}>{dateErrors.startDateNepali}</div>
//                                         )}
//                                     </div>
//                                 </div>

//                                 {/* Row 5: VAT Switch (Full Width) */}
//                                 <div style={{ ...styles.formRow, marginBottom: '0' }}>
//                                     <div style={styles.formGroup}>
//                                         <div style={styles.switchGroup}>
//                                             <label style={{ ...styles.label, marginBottom: '0', cursor: 'pointer' }}>
//                                                 Enable VAT
//                                             </label>
//                                             <div 
//                                                 style={{
//                                                     ...styles.switch,
//                                                     ...(formData.vatEnabled ? styles.switchActive : {})
//                                                 }}
//                                                 onClick={() => setFormData(prev => ({ ...prev, vatEnabled: !prev.vatEnabled }))}
//                                             >
//                                                 <div style={{
//                                                     ...styles.switchKnob,
//                                                     ...(formData.vatEnabled ? styles.switchKnobActive : {})
//                                                 }} />
//                                             </div>
//                                             <span style={styles.switchLabel}>
//                                                 {formData.vatEnabled ? 'Enabled' : 'Disabled'}
//                                             </span>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 {/* Buttons */}
//                                 <div style={styles.buttonGroup}>
//                                     <Link
//                                         to="/user-dashboard"
//                                         style={styles.buttonOutline}
//                                         onMouseEnter={(e) => {
//                                             e.target.style.backgroundColor = styles.buttonOutlineHover.backgroundColor;
//                                             e.target.style.borderColor = styles.buttonOutlineHover.borderColor;
//                                             e.target.style.color = styles.buttonOutlineHover.color;
//                                         }}
//                                         onMouseLeave={(e) => {
//                                             e.target.style.backgroundColor = 'transparent';
//                                             e.target.style.borderColor = '#e2e8f0';
//                                             e.target.style.color = '#4a5568';
//                                         }}
//                                     >
//                                         <FaArrowLeft size={12} />
//                                         Cancel
//                                     </Link>
//                                     <button
//                                         type="submit"
//                                         style={styles.buttonPrimary}
//                                         disabled={loading || !token}
//                                         onMouseEnter={(e) => {
//                                             if (!loading && token) {
//                                                 e.target.style.background = styles.buttonPrimaryHover.background;
//                                             }
//                                         }}
//                                         onMouseLeave={(e) => {
//                                             e.target.style.background = styles.buttonPrimary.background;
//                                         }}
//                                     >
//                                         {loading ? (
//                                             <>
//                                                 <FaSpinner className="fa-spin" size={12} />
//                                                 Creating...
//                                             </>
//                                         ) : (
//                                             <>
//                                                 <FaSave size={12} />
//                                                 Create Company
//                                             </>
//                                         )}
//                                     </button>
//                                 </div>
//                             </Form>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             <style>{`
//                 .fa-spin {
//                     animation: spin 0.8s linear infinite;
//                 }
//                 @keyframes spin {
//                     0% { transform: rotate(0deg); }
//                     100% { transform: rotate(360deg); }
//                 }
//                 a:hover {
//                     text-decoration: none !important;
//                 }
//             `}</style>
//         </DashboardLayout>
//     );
// };

// export default CompanyForm;

//------------------------------------------------------------end3

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../components/services/api';
import { Form, Button, Container, Card, Spinner, Row, Col, Alert } from 'react-bootstrap';
import Select from 'react-select';
import DashboardLayout from '../company/DashboardLayout';
import NotificationToast from '../NotificationToast';
import NepaliDate from 'nepali-datetime';
import { FaBuilding, FaArrowLeft, FaSave, FaSpinner, FaCalendarAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';

// Date conversion utilities
const convertBsToAd = (bsDate) => {
    if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
    try {
        const nepaliDate = new NepaliDate(bsDate);
        if (!nepaliDate || typeof nepaliDate.getDateObject !== 'function') {
            console.error('Invalid NepaliDate object or missing getDateObject method');
            return null;
        }
        const jsDate = nepaliDate.getDateObject();
        if (!jsDate || isNaN(jsDate.getTime())) {
            console.error('Invalid AD date generated from BS date:', bsDate);
            return null;
        }
        const year = jsDate.getFullYear();
        const month = String(jsDate.getMonth() + 1).padStart(2, '0');
        const day = String(jsDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error converting BS to AD:', error.message, 'Date:', bsDate);
        return null;
    }
};

const convertAdToBs = (adDate) => {
    if (!adDate) return null;
    try {
        let date;
        if (typeof adDate === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(adDate)) {
                date = new Date(adDate + 'T00:00:00');
            } else {
                date = new Date(adDate);
            }
        } else if (adDate instanceof Date) {
            date = adDate;
        } else {
            return null;
        }
        if (isNaN(date.getTime())) {
            console.error('Invalid AD date:', adDate);
            return null;
        }
        const nepaliDate = new NepaliDate(date);
        if (!nepaliDate || typeof nepaliDate.getYear !== 'function') {
            console.error('Invalid NepaliDate object');
            return null;
        }
        const year = nepaliDate.getYear();
        const month = nepaliDate.getMonth();
        const day = nepaliDate.getDate();
        if (!year || !month === undefined || !day) {
            console.error('Invalid BS components generated');
            return null;
        }
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } catch (error) {
        console.error('Error converting AD to BS:', error.message, 'Date:', adDate);
        return null;
    }
};

const isValidNepaliDate = (dateStr) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > 32) return false;
        const nepaliDate = new NepaliDate(dateStr);
        if (!nepaliDate || typeof nepaliDate.getYear !== 'function') {
            return false;
        }
        const bsYear = nepaliDate.getYear();
        const bsMonth = nepaliDate.getMonth() + 1;
        const bsDay = nepaliDate.getDate();
        return (bsYear === year && bsMonth === month && bsDay === day);
    } catch (error) {
        console.warn('Invalid Nepali date:', dateStr, error.message);
        return false;
    }
};

const getCurrentNepaliDate = () => {
    try {
        const now = new NepaliDate();
        if (!now || typeof now.getYear !== 'function') {
            return '2080-01-01';
        }
        const year = now.getYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        if (!year || !month || !day) {
            return '2080-01-01';
        }
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } catch (error) {
        console.error('Error getting current Nepali date:', error);
        return '2080-01-01';
    }
};

// Nepali Calendar Component with Month/Year Selection
const NepaliCalendar = ({ value, onChange, onClose }) => {
    const [currentYear, setCurrentYear] = useState(2080);
    const [currentMonth, setCurrentMonth] = useState(0);
    const [selectedDate, setSelectedDate] = useState(null);
    const [days, setDays] = useState([]);

    const monthNames = ['Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
    
    // Generate year options (2070 to 2090)
    const yearOptions = [];
    for (let i = 2070; i <= 2090; i++) {
        yearOptions.push(i);
    }

    useEffect(() => {
        if (value) {
            const parts = value.split('-');
            if (parts.length === 3) {
                setCurrentYear(parseInt(parts[0]));
                setCurrentMonth(parseInt(parts[1]) - 1);
                setSelectedDate(parseInt(parts[2]));
            }
        }
        generateCalendar(currentYear, currentMonth);
    }, []);

    const getDaysInMonth = (year, month) => {
        try {
            // Get first day of next month
            const nextMonth = new NepaliDate(year, month + 1, 1);
            const currentMonthDate = new NepaliDate(year, month, 1);
            // Calculate difference in days
            const diff = nextMonth.getTime() - currentMonthDate.getTime();
            return Math.ceil(diff / (24 * 60 * 60 * 1000));
        } catch (error) {
            return 32;
        }
    };

    const generateCalendar = (year, month) => {
        try {
            const firstDay = new NepaliDate(year, month, 1);
            const firstDayOfWeek = firstDay.getDay();
            const daysInMonth = getDaysInMonth(year, month);
            
            const calendarDays = [];
            
            // Empty cells for days before the first day of month
            for (let i = 0; i < firstDayOfWeek; i++) {
                calendarDays.push(null);
            }
            
            // Days of the month
            for (let i = 1; i <= daysInMonth; i++) {
                calendarDays.push(i);
            }
            
            setDays(calendarDays);
        } catch (error) {
            console.error('Error generating calendar:', error);
        }
    };

    const handleDateSelect = (day) => {
        if (day === null) return;
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(day);
        onChange(dateStr);
        onClose();
    };

    const handleYearChange = (e) => {
        const year = parseInt(e.target.value);
        setCurrentYear(year);
        generateCalendar(year, currentMonth);
    };

    const handleMonthChange = (e) => {
        const month = parseInt(e.target.value);
        setCurrentMonth(month);
        generateCalendar(currentYear, month);
    };

    const changeMonth = (delta) => {
        let newMonth = currentMonth + delta;
        let newYear = currentYear;
        if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        } else if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        }
        setCurrentYear(newYear);
        setCurrentMonth(newMonth);
        generateCalendar(newYear, newMonth);
    };

    const goToToday = () => {
        const today = getCurrentNepaliDate();
        const parts = today.split('-');
        if (parts.length === 3) {
            setCurrentYear(parseInt(parts[0]));
            setCurrentMonth(parseInt(parts[1]) - 1);
            setSelectedDate(parseInt(parts[2]));
            generateCalendar(parseInt(parts[0]), parseInt(parts[1]) - 1);
            onChange(today);
            onClose();
        }
    };

    return (
        <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 1000,
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: '12px',
            width: '300px',
            marginTop: '4px',
        }}>
            {/* Month/Year Selector */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '10px',
            }}>
                <select
                    value={currentMonth}
                    onChange={handleMonthChange}
                    style={{
                        flex: 1,
                        padding: '4px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '12px',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        color: '#2d3748',
                        height: '28px',
                    }}
                >
                    {monthNames.map((month, index) => (
                        <option key={index} value={index}>
                            {month}
                        </option>
                    ))}
                </select>
                <select
                    value={currentYear}
                    onChange={handleYearChange}
                    style={{
                        flex: 0.6,
                        padding: '4px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '12px',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        color: '#2d3748',
                        height: '28px',
                    }}
                >
                    {yearOptions.map((year) => (
                        <option key={year} value={year}>
                            {year}
                        </option>
                    ))}
                </select>
            </div>

            {/* Navigation Arrows */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
            }}>
                <button
                    onClick={() => changeMonth(-1)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#2a4d7a',
                        padding: '2px 8px',
                    }}
                >
                    ◀
                </button>
                <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1a202c',
                }}>
                    {monthNames[currentMonth]} {currentYear}
                </span>
                <button
                    onClick={() => changeMonth(1)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#2a4d7a',
                        padding: '2px 8px',
                    }}
                >
                    ▶
                </button>
            </div>

            {/* Day Names */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '2px',
                marginBottom: '6px',
            }}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <div key={day} style={{
                        textAlign: 'center',
                        fontSize: '10px',
                        fontWeight: '600',
                        color: '#718096',
                        padding: '4px 0',
                    }}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Days */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '2px',
            }}>
                {days.map((day, index) => (
                    <button
                        key={index}
                        onClick={() => handleDateSelect(day)}
                        disabled={day === null}
                        style={{
                            padding: '5px 0',
                            textAlign: 'center',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: day === null ? 'default' : 'pointer',
                            backgroundColor: day === selectedDate ? '#2a4d7a' : 'transparent',
                            color: day === selectedDate ? '#ffffff' : (day === null ? '#e2e8f0' : '#2d3748'),
                            transition: 'all 0.2s',
                            fontWeight: day === selectedDate ? '600' : '400',
                        }}
                        onMouseEnter={(e) => {
                            if (day !== null && day !== selectedDate) {
                                e.target.style.backgroundColor = '#f7fafc';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (day !== null && day !== selectedDate) {
                                e.target.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        {day}
                    </button>
                ))}
            </div>

            {/* Today Button */}
            <div style={{
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid #e2e8f0',
                textAlign: 'center',
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
            }}>
                <button
                    onClick={goToToday}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#2a4d7a',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        padding: '4px 12px',
                    }}
                >
                    Today
                </button>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#a0aec0',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: '4px 12px',
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
};

const CompanyForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [isAdminOrSupervisor, setIsAdminOrSupervisor] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [error, setError] = useState(null);
    const [dateErrors, setDateErrors] = useState({
        startDateNepali: '',
        endDateNepali: ''
    });
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarField, setCalendarField] = useState('startDateNepali');
    const calendarRef = useRef(null);

    const currentUser = useSelector((state) => state.auth.userInfo);
    const token = localStorage.getItem('token');

    // Close calendar when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setShowCalendar(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                if (currentUser) {
                    setUser(currentUser);
                    setIsAdminOrSupervisor(currentUser.isAdmin || currentUser.role === 'Supervisor');
                    setLoading(false);
                    return;
                }
                if (!localStorage.getItem('token')) {
                    setNotification({ show: true, message: 'Please login first', type: 'error' });
                    setTimeout(() => navigate('/auth/login'), 2000);
                    return;
                }
                const userRes = await api.get('/api/User/current');
                setUser(userRes.data.user);
                setIsAdminOrSupervisor(userRes.data.user.isAdmin || userRes.data.user.role === 'Supervisor');
            } catch (err) {
                if (err.response?.status === 401) {
                    setNotification({ show: true, message: 'Session expired', type: 'error' });
                    setTimeout(() => navigate('/auth/login'), 2000);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentUser, navigate]);

    const [formData, setFormData] = useState({
        name: '', address: '', country: 'Nepal', state: '', city: '', pan: '',
        phone: '', ward: '', email: '', tradeType: 'retailer', dateFormat: 'english',
        startDateEnglish: new Date().toISOString().split('T')[0],
        endDateEnglish: '', startDateNepali: '', endDateNepali: '', vatEnabled: false
    });

    const tradeTypeOptions = [{ value: 'retailer', label: 'Retailer' }];
    const dateFormatOptions = [
        { value: 'english', label: 'English' },
        { value: 'nepali', label: 'Nepali' }
    ];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSelectChange = (name, selected) => {
        setFormData(prev => ({ ...prev, [name]: selected.value }));
    };

    const handleNepaliDateChange = (field, value) => {
        const sanitizedValue = value.replace(/[^0-9/-]/g, '');
        
        if (sanitizedValue.length <= 10) {
            setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
            setDateErrors(prev => ({ ...prev, [field]: '' }));

            // Validate and convert when we have a complete date
            if (sanitizedValue.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(sanitizedValue)) {
                if (isValidNepaliDate(sanitizedValue)) {
                    const adDate = convertBsToAd(sanitizedValue);
                    if (adDate) {
                        if (field === 'startDateNepali') {
                            setFormData(prev => ({ ...prev, startDateEnglish: adDate }));
                        } else if (field === 'endDateNepali') {
                            setFormData(prev => ({ ...prev, endDateEnglish: adDate }));
                        }
                    }
                } else {
                    setDateErrors(prev => ({ ...prev, [field]: 'Invalid Nepali date format' }));
                }
            }
        }
    };

    const handleNepaliDateBlur = (field, value) => {
        const dateStr = value.trim();
        if (!dateStr) {
            setDateErrors(prev => ({ ...prev, [field]: '' }));
            return;
        }

        if (isValidNepaliDate(dateStr)) {
            const adDate = convertBsToAd(dateStr);
            if (adDate) {
                if (field === 'startDateNepali') {
                    setFormData(prev => ({ ...prev, startDateNepali: dateStr, startDateEnglish: adDate }));
                } else if (field === 'endDateNepali') {
                    setFormData(prev => ({ ...prev, endDateNepali: dateStr, endDateEnglish: adDate }));
                }
            }
            setDateErrors(prev => ({ ...prev, [field]: '' }));
        } else {
            setDateErrors(prev => ({ ...prev, [field]: 'Please enter a valid Nepali date (YYYY-MM-DD)' }));
        }
    };

    const handleCalendarSelect = (dateStr) => {
        if (calendarField === 'startDateNepali') {
            const adDate = convertBsToAd(dateStr);
            setFormData(prev => ({
                ...prev,
                startDateNepali: dateStr,
                startDateEnglish: adDate || prev.startDateEnglish
            }));
            setDateErrors(prev => ({ ...prev, startDateNepali: '' }));
        } else if (calendarField === 'endDateNepali') {
            const adDate = convertBsToAd(dateStr);
            setFormData(prev => ({
                ...prev,
                endDateNepali: dateStr,
                endDateEnglish: adDate || prev.endDateEnglish
            }));
            setDateErrors(prev => ({ ...prev, endDateNepali: '' }));
        }
        setShowCalendar(false);
    };

    const handleEnglishDateChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        if (formData.dateFormat === 'nepali' && value) {
            const bsDate = convertAdToBs(value);
            if (bsDate) {
                if (field === 'startDateEnglish') {
                    setFormData(prev => ({ ...prev, startDateNepali: bsDate }));
                } else if (field === 'endDateEnglish') {
                    setFormData(prev => ({ ...prev, endDateNepali: bsDate }));
                }
            }
        }
    };

    useEffect(() => {
        if (formData.dateFormat === 'english' && formData.startDateEnglish) {
            const start = new Date(formData.startDateEnglish);
            const end = new Date(start);
            end.setFullYear(end.getFullYear() + 1);
            end.setDate(end.getDate() - 1);
            setFormData(prev => ({ ...prev, endDateEnglish: end.toISOString().split('T')[0] }));
        }
    }, [formData.startDateEnglish, formData.dateFormat]);

    useEffect(() => {
        if (formData.dateFormat === 'nepali' && formData.startDateNepali && isValidNepaliDate(formData.startDateNepali)) {
            const startAd = convertBsToAd(formData.startDateNepali);
            if (startAd) {
                const startDate = new Date(startAd);
                const endDate = new Date(startDate);
                endDate.setFullYear(endDate.getFullYear() + 1);
                endDate.setDate(endDate.getDate() - 1);
                const endAd = endDate.toISOString().split('T')[0];
                const endBs = convertAdToBs(endAd);
                if (endBs) {
                    setFormData(prev => ({ ...prev, endDateNepali: endBs, endDateEnglish: endAd }));
                }
            }
        }
    }, [formData.startDateNepali, formData.dateFormat]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const storedToken = localStorage.getItem('token');
            if (!storedToken) {
                setNotification({ show: true, message: 'Please login', type: 'error' });
                setTimeout(() => navigate('/auth/login'), 2000);
                return;
            }

            const requestData = {
                name: formData.name, address: formData.address, country: formData.country,
                state: formData.state, city: formData.city, pan: formData.pan,
                phone: formData.phone, ward: formData.ward ? parseInt(formData.ward) : null,
                email: formData.email, tradeType: formData.tradeType,
                dateFormat: formData.dateFormat, vatEnabled: formData.vatEnabled,
                startDateEnglish: formData.startDateEnglish || '',
                endDateEnglish: formData.endDateEnglish || '',
                startDateNepali: formData.startDateNepali || '',
                endDateNepali: formData.endDateNepali || ''
            };

            await api.post('/api/Companies', requestData, {
                headers: { 'Authorization': `Bearer ${storedToken}` }
            });

            setNotification({ show: true, message: 'Company created successfully!', type: 'success' });
            setTimeout(() => navigate('/user-dashboard'), 1500);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error creating company';
            setError(errorMessage);
            setNotification({ show: true, message: errorMessage, type: 'error' });
            
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                setTimeout(() => navigate('/auth/login'), 2000);
            }
        } finally {
            setLoading(false);
        }
    };

    // Compact styles - 3 columns
    const styles = {
        container: {
            minHeight: 'calc(100vh - 60px)',
            backgroundColor: '#f8f9fa',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            padding: '12px 20px',
            display: 'flex',
            flexDirection: 'column',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            paddingBottom: '10px',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
        },
        headerTitle: {
            fontSize: '1.2rem',
            fontWeight: '600',
            color: '#1a202c',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: 0,
        },
        headerIcon: {
            color: '#2a4d7a',
        },
        card: {
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
        },
        cardHeader: {
            backgroundColor: '#f7fafc',
            padding: '10px 20px',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
        },
        cardTitle: {
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#2d3748',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        },
        cardBody: {
            padding: '14px 20px 4px 20px',
            flex: 1,
        },
        formRow: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '10px',
            marginBottom: '8px',
        },
        formGroup: {
            marginBottom: '0',
            position: 'relative',
        },
        label: {
            display: 'block',
            fontWeight: '500',
            color: '#2d3748',
            fontSize: '0.75rem',
            marginBottom: '2px',
        },
        required: {
            color: '#e53e3e',
            marginLeft: '2px',
        },
        input: {
            width: '100%',
            padding: '5px 30px 5px 10px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: '0.8rem',
            outline: 'none',
            transition: 'all 0.2s',
            backgroundColor: '#ffffff',
            color: '#2d3748',
            height: '30px',
        },
        inputFocus: {
            borderColor: '#2a4d7a',
            boxShadow: '0 0 0 2px rgba(42, 77, 122, 0.1)',
        },
        inputError: {
            borderColor: '#fc8181',
        },
        calendarIcon: {
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#a0aec0',
            cursor: 'pointer',
            fontSize: '14px',
            zIndex: 2,
        },
        calendarIconHover: {
            color: '#2a4d7a',
        },
        select: {
            width: '100%',
            minHeight: '30px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: '0.8rem',
        },
        switchGroup: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 0',
        },
        switch: {
            width: '34px',
            height: '18px',
            backgroundColor: '#e2e8f0',
            borderRadius: '9px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s',
            flexShrink: 0,
        },
        switchActive: {
            backgroundColor: '#2a4d7a',
        },
        switchKnob: {
            width: '14px',
            height: '14px',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            position: 'absolute',
            top: '2px',
            left: '2px',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        },
        switchKnobActive: {
            left: '18px',
        },
        switchLabel: {
            fontSize: '0.8rem',
            color: '#718096',
        },
        buttonGroup: {
            display: 'flex',
            gap: '10px',
            marginTop: '6px',
            paddingTop: '6px',
            borderTop: '1px solid #e2e8f0',
            flexShrink: 0,
        },
        buttonPrimary: {
            padding: '6px 20px',
            background: '#2a4d7a',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.85rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '32px',
        },
        buttonPrimaryHover: {
            background: '#1e3a5f',
        },
        buttonOutline: {
            padding: '6px 20px',
            background: 'transparent',
            color: '#4a5568',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: '0.85rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            height: '32px',
        },
        buttonOutlineHover: {
            backgroundColor: '#f7fafc',
            borderColor: '#2a4d7a',
            color: '#2a4d7a',
        },
        errorText: {
            color: '#e53e3e',
            fontSize: '0.65rem',
            marginTop: '2px',
        },
        alert: {
            fontSize: '0.75rem',
            padding: '4px 10px',
            marginBottom: '8px',
        },
        // Responsive
        '@media (max-width: 992px)': {
            formRow: {
                gridTemplateColumns: '1fr 1fr',
            },
        },
        '@media (max-width: 576px)': {
            formRow: {
                gridTemplateColumns: '1fr',
            },
            header: {
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px',
            },
            buttonGroup: {
                flexDirection: 'column',
            },
            cardBody: {
                padding: '12px 16px 4px 16px',
            },
        },
    };

    return (
        <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
            <NotificationToast 
                show={notification.show} 
                message={notification.message} 
                type={notification.type} 
                onClose={() => setNotification({ ...notification, show: false })} 
            />
            
            <div style={styles.container}>
                {/* Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h6 style={styles.cardTitle}>
                            <FaBuilding size={14} style={{ color: '#2a4d7a' }} />
                            Create New Company
                        </h6>
                    </div>
                    
                    <div style={styles.cardBody}>
                        {loading && (
                            <div className="text-center py-2">
                                <Spinner animation="border" size="sm" style={{ color: '#2a4d7a' }} />
                            </div>
                        )}
                        
                        {error && (
                            <Alert 
                                variant="danger" 
                                dismissible 
                                onClose={() => setError(null)}
                                style={styles.alert}
                            >
                                {error}
                            </Alert>
                        )}
                        
                        {!token ? (
                            <div className="text-center py-2">
                                <p style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '8px' }}>
                                    Please login to create company.
                                </p>
                                <Button 
                                    variant="primary" 
                                    size="sm"
                                    onClick={() => navigate('/auth/login')}
                                    style={{ 
                                        padding: '3px 12px', 
                                        fontSize: '0.8rem',
                                        backgroundColor: '#2a4d7a',
                                        border: 'none'
                                    }}
                                >
                                    Login
                                </Button>
                            </div>
                        ) : (
                            <Form onSubmit={handleSubmit}>
                                {/* Row 1: Company Name, Country, State */}
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            Company Name <span style={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Enter company name"
                                            style={styles.input}
                                            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e2e8f0';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                            required
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Country</label>
                                        <input
                                            type="text"
                                            name="country"
                                            value={formData.country}
                                            onChange={handleChange}
                                            style={{ ...styles.input, backgroundColor: '#f7fafc' }}
                                            readOnly
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            State <span style={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            placeholder="Enter state"
                                            style={styles.input}
                                            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e2e8f0';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Row 2: City, Address, PAN */}
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            City <span style={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            placeholder="Enter city"
                                            style={styles.input}
                                            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e2e8f0';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                            required
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            Address <span style={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            placeholder="Enter address"
                                            style={styles.input}
                                            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e2e8f0';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                            required
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            PAN Number <span style={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="pan"
                                            value={formData.pan}
                                            onChange={handleChange}
                                            placeholder="Enter PAN number"
                                            maxLength="9"
                                            style={styles.input}
                                            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e2e8f0';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Phone, Ward, Email */}
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            Phone Number <span style={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="Enter phone number"
                                            style={styles.input}
                                            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e2e8f0';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                            required
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            Ward Number <span style={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="ward"
                                            value={formData.ward}
                                            onChange={handleChange}
                                            placeholder="Enter ward number"
                                            style={styles.input}
                                            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e2e8f0';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                            required
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            Email Address <span style={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Enter email address"
                                            style={styles.input}
                                            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e2e8f0';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Row 4: Trade Type, Date Format, Start Date */}
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            Trade Type <span style={styles.required}>*</span>
                                        </label>
                                        <Select 
                                            options={tradeTypeOptions} 
                                            defaultValue={tradeTypeOptions[0]} 
                                            onChange={(selected) => handleSelectChange('tradeType', selected)} 
                                            styles={{ 
                                                control: (base) => ({ 
                                                    ...base, 
                                                    minHeight: '30px', 
                                                    fontSize: '0.8rem',
                                                    borderColor: '#e2e8f0',
                                                    borderRadius: '4px',
                                                }),
                                                option: (base) => ({
                                                    ...base,
                                                    fontSize: '0.8rem',
                                                }),
                                                singleValue: (base) => ({
                                                    ...base,
                                                    fontSize: '0.8rem',
                                                }),
                                                input: (base) => ({
                                                    ...base,
                                                    fontSize: '0.8rem',
                                                })
                                            }} 
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            Date Format <span style={styles.required}>*</span>
                                        </label>
                                        <Select 
                                            options={dateFormatOptions} 
                                            defaultValue={dateFormatOptions[0]} 
                                            onChange={(selected) => {
                                                handleSelectChange('dateFormat', selected);
                                                if (selected.value === 'english') {
                                                    const today = new Date().toISOString().split('T')[0];
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        startDateEnglish: today,
                                                        endDateEnglish: '',
                                                        startDateNepali: '',
                                                        endDateNepali: ''
                                                    }));
                                                } else {
                                                    const currentNepaliDate = getCurrentNepaliDate();
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        startDateNepali: currentNepaliDate,
                                                        endDateNepali: '',
                                                        startDateEnglish: convertBsToAd(currentNepaliDate) || '',
                                                        endDateEnglish: ''
                                                    }));
                                                }
                                            }} 
                                            styles={{ 
                                                control: (base) => ({ 
                                                    ...base, 
                                                    minHeight: '30px', 
                                                    fontSize: '0.8rem',
                                                    borderColor: '#e2e8f0',
                                                    borderRadius: '4px',
                                                }),
                                                option: (base) => ({
                                                    ...base,
                                                    fontSize: '0.8rem',
                                                }),
                                                singleValue: (base) => ({
                                                    ...base,
                                                    fontSize: '0.8rem',
                                                }),
                                                input: (base) => ({
                                                    ...base,
                                                    fontSize: '0.8rem',
                                                })
                                            }} 
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            Start Date <span style={styles.required}>*</span>
                                        </label>
                                        {formData.dateFormat === 'english' ? (
                                            <input
                                                type="date"
                                                name="startDateEnglish"
                                                value={formData.startDateEnglish}
                                                onChange={(e) => handleEnglishDateChange('startDateEnglish', e.target.value)}
                                                style={styles.input}
                                                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = '#e2e8f0';
                                                    e.target.style.boxShadow = 'none';
                                                }}
                                                required
                                            />
                                        ) : (
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    name="startDateNepali"
                                                    value={formData.startDateNepali}
                                                    onChange={(e) => handleNepaliDateChange('startDateNepali', e.target.value)}
                                                    onBlur={(e) => handleNepaliDateBlur('startDateNepali', e.target.value)}
                                                    placeholder="YYYY-MM-DD"
                                                    style={{
                                                        ...styles.input,
                                                        ...(dateErrors.startDateNepali ? styles.inputError : {})
                                                    }}
                                                    onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                                    required
                                                />
                                                <FaCalendarAlt
                                                    style={styles.calendarIcon}
                                                    onClick={() => {
                                                        setCalendarField('startDateNepali');
                                                        setShowCalendar(!showCalendar);
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.color = styles.calendarIconHover.color;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.color = '#a0aec0';
                                                    }}
                                                />
                                                {showCalendar && calendarField === 'startDateNepali' && (
                                                    <div ref={calendarRef}>
                                                        <NepaliCalendar
                                                            value={formData.startDateNepali}
                                                            onChange={handleCalendarSelect}
                                                            onClose={() => setShowCalendar(false)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {dateErrors.startDateNepali && (
                                            <div style={styles.errorText}>{dateErrors.startDateNepali}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Row 5: VAT Switch (Full Width) */}
                                <div style={{ ...styles.formRow, marginBottom: '0' }}>
                                    <div style={styles.formGroup}>
                                        <div style={styles.switchGroup}>
                                            <label style={{ ...styles.label, marginBottom: '0', cursor: 'pointer' }}>
                                                Enable VAT
                                            </label>
                                            <div 
                                                style={{
                                                    ...styles.switch,
                                                    ...(formData.vatEnabled ? styles.switchActive : {})
                                                }}
                                                onClick={() => setFormData(prev => ({ ...prev, vatEnabled: !prev.vatEnabled }))}
                                            >
                                                <div style={{
                                                    ...styles.switchKnob,
                                                    ...(formData.vatEnabled ? styles.switchKnobActive : {})
                                                }} />
                                            </div>
                                            <span style={styles.switchLabel}>
                                                {formData.vatEnabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div style={styles.buttonGroup}>
                                    <Link
                                        to="/user-dashboard"
                                        style={styles.buttonOutline}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = styles.buttonOutlineHover.backgroundColor;
                                            e.target.style.borderColor = styles.buttonOutlineHover.borderColor;
                                            e.target.style.color = styles.buttonOutlineHover.color;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = 'transparent';
                                            e.target.style.borderColor = '#e2e8f0';
                                            e.target.style.color = '#4a5568';
                                        }}
                                    >
                                        <FaArrowLeft size={12} />
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        style={styles.buttonPrimary}
                                        disabled={loading || !token}
                                        onMouseEnter={(e) => {
                                            if (!loading && token) {
                                                e.target.style.background = styles.buttonPrimaryHover.background;
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = styles.buttonPrimary.background;
                                        }}
                                    >
                                        {loading ? (
                                            <>
                                                <FaSpinner className="fa-spin" size={12} />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <FaSave size={12} />
                                                Create Company
                                            </>
                                        )}
                                    </button>
                                </div>
                            </Form>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .fa-spin {
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                a:hover {
                    text-decoration: none !important;
                }
            `}</style>
        </DashboardLayout>
    );
};

export default CompanyForm;