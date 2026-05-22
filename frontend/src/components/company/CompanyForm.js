
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../components/services/api';
import { Form, Button, Container, Card, Spinner, Row, Col, Alert } from 'react-bootstrap';
import Select from 'react-select';
import DashboardLayout from '../company/DashboardLayout';
import NotificationToast from '../NotificationToast';
import NepaliDate from 'nepali-datetime';

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

    const currentUser = useSelector((state) => state.auth.userInfo);
    const token = localStorage.getItem('token');

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

    // Handle Nepali date changes and auto-convert to English
    const handleNepaliDateChange = (field, value) => {
        const sanitizedValue = value.replace(/[^0-9/-]/g, '');
        
        if (sanitizedValue.length <= 10) {
            setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
            setDateErrors(prev => ({ ...prev, [field]: '' }));

            // Auto-convert to English date when we have a complete valid date
            if (sanitizedValue.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(sanitizedValue)) {
                const adDate = convertBsToAd(sanitizedValue);
                if (adDate) {
                    if (field === 'startDateNepali') {
                        setFormData(prev => ({ ...prev, startDateEnglish: adDate }));
                    } else if (field === 'endDateNepali') {
                        setFormData(prev => ({ ...prev, endDateEnglish: adDate }));
                    }
                }
            }
        }
    };

    // Handle Nepali date blur for validation
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
            // Auto-correct to current date
            const currentDate = getCurrentNepaliDate();
            const adDate = convertBsToAd(currentDate);
            if (field === 'startDateNepali') {
                setFormData(prev => ({ ...prev, startDateNepali: currentDate, startDateEnglish: adDate || prev.startDateEnglish }));
            } else if (field === 'endDateNepali') {
                setFormData(prev => ({ ...prev, endDateNepali: currentDate, endDateEnglish: adDate || prev.endDateEnglish }));
            }
            setNotification({
                show: true,
                message: `Invalid Nepali date for ${field === 'startDateNepali' ? 'Start Date' : 'End Date'}. Auto-corrected to current date.`,
                type: 'warning'
            });
        }
    };

    // Handle English date changes (for Nepali format, convert to Nepali)
    const handleEnglishDateChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // If date format is Nepali, convert English date to Nepali
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

    // Auto-calculate end date when start date changes (for English format)
    useEffect(() => {
        if (formData.dateFormat === 'english' && formData.startDateEnglish) {
            const start = new Date(formData.startDateEnglish);
            const end = new Date(start);
            end.setFullYear(end.getFullYear() + 1);
            end.setDate(end.getDate() - 1);
            setFormData(prev => ({ ...prev, endDateEnglish: end.toISOString().split('T')[0] }));
        }
    }, [formData.startDateEnglish, formData.dateFormat]);

    // Auto-calculate end date when start date changes (for Nepali format)
    useEffect(() => {
        if (formData.dateFormat === 'nepali' && formData.startDateNepali && isValidNepaliDate(formData.startDateNepali)) {
            // Convert to AD, add 1 year, then convert back to BS
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

    const inputStyle = { 
        padding: '6px 10px', 
        fontSize: '14px',
        border: '1px solid #dee2e6',
        borderRadius: '4px'
    };
    
    const labelStyle = { 
        fontSize: '12px', 
        fontWeight: 600, 
        marginBottom: '2px',
        color: '#495057'
    };
    
    const rowStyle = { marginBottom: '12px' };

    return (
        <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
            <NotificationToast 
                show={notification.show} 
                message={notification.message} 
                type={notification.type} 
                onClose={() => setNotification({ ...notification, show: false })} 
            />
            
            <Container fluid style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 15px' }}>
                <Card style={{ 
                    borderRadius: '8px', 
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #dee2e6'
                }}>
                    <Card.Header style={{ 
                        background: '#f8f9fa',
                        padding: '12px 20px',
                        borderBottom: '2px solid #dee2e6'
                    }}>
                        <h3 style={{ 
                            margin: 0, 
                            fontSize: '1.1rem', 
                            color: '#212529',
                            fontWeight: 600
                        }}>
                            Create New Company
                        </h3>
                    </Card.Header>
                    
                    <Card.Body style={{ padding: '20px' }}>
                        {loading && (
                            <div className="text-center py-3">
                                <Spinner animation="border" size="sm" style={{ color: '#0d6efd' }} />
                            </div>
                        )}
                        
                        {error && (
                            <Alert 
                                variant="danger" 
                                dismissible 
                                onClose={() => setError(null)}
                                style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                            >
                                {error}
                            </Alert>
                        )}
                        
                        {!token ? (
                            <div className="text-center py-3">
                                <p style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '10px' }}>
                                    Please login to create company.
                                </p>
                                <Button 
                                    variant="primary" 
                                    size="sm"
                                    onClick={() => navigate('/auth/login')}
                                    style={{ 
                                        padding: '4px 12px', 
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Login
                                </Button>
                            </div>
                        ) : (
                            <Form onSubmit={handleSubmit}>
                                <Row style={rowStyle}>
                                    <Col md={6}>
                                        <Form.Label style={labelStyle}>Company Name *</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            name="name" 
                                            value={formData.name} 
                                            onChange={handleChange} 
                                            style={inputStyle} 
                                            size="sm" 
                                            required 
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <Form.Label style={labelStyle}>Country</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            name="country" 
                                            value={formData.country} 
                                            onChange={handleChange} 
                                            style={inputStyle} 
                                            size="sm" 
                                            readOnly 
                                        />
                                    </Col>
                                </Row>

                                <Row style={rowStyle}>
                                    <Col md={6}>
                                        <Form.Label style={labelStyle}>State *</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            name="state" 
                                            value={formData.state} 
                                            onChange={handleChange} 
                                            style={inputStyle} 
                                            size="sm" 
                                            required 
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <Form.Label style={labelStyle}>City *</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            name="city" 
                                            value={formData.city} 
                                            onChange={handleChange} 
                                            style={inputStyle} 
                                            size="sm" 
                                            required 
                                        />
                                    </Col>
                                </Row>

                                <Row style={rowStyle}>
                                    <Col md={6}>
                                        <Form.Label style={labelStyle}>Address *</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            name="address" 
                                            value={formData.address} 
                                            onChange={handleChange} 
                                            style={inputStyle} 
                                            size="sm" 
                                            required 
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <Form.Label style={labelStyle}>PAN Number *</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            name="pan" 
                                            value={formData.pan} 
                                            onChange={handleChange} 
                                            style={inputStyle} 
                                            size="sm" 
                                            maxLength="9" 
                                            required 
                                        />
                                    </Col>
                                </Row>

                                <Row style={rowStyle}>
                                    <Col md={6}>
                                        <Form.Label style={labelStyle}>Phone Number *</Form.Label>
                                        <Form.Control 
                                            type="tel" 
                                            name="phone" 
                                            value={formData.phone} 
                                            onChange={handleChange} 
                                            style={inputStyle} 
                                            size="sm" 
                                            required 
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <Form.Label style={labelStyle}>Ward Number *</Form.Label>
                                        <Form.Control 
                                            type="number" 
                                            name="ward" 
                                            value={formData.ward} 
                                            onChange={handleChange} 
                                            style={inputStyle} 
                                            size="sm" 
                                            required 
                                        />
                                    </Col>
                                </Row>

                                <Row style={rowStyle}>
                                    <Col md={6}>
                                        <Form.Label style={labelStyle}>Email Address *</Form.Label>
                                        <Form.Control 
                                            type="email" 
                                            name="email" 
                                            value={formData.email} 
                                            onChange={handleChange} 
                                            style={inputStyle} 
                                            size="sm" 
                                            required 
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <Form.Label style={labelStyle}>Trade Type *</Form.Label>
                                        <Select 
                                            options={tradeTypeOptions} 
                                            defaultValue={tradeTypeOptions[0]} 
                                            onChange={(selected) => handleSelectChange('tradeType', selected)} 
                                            styles={{ 
                                                control: (base) => ({ 
                                                    ...base, 
                                                    minHeight: '31px', 
                                                    fontSize: '14px',
                                                    borderColor: '#dee2e6'
                                                }) 
                                            }} 
                                        />
                                    </Col>
                                </Row>

                                <Row style={rowStyle}>
                                    <Col md={6}>
                                        <Form.Label style={labelStyle}>Date Format *</Form.Label>
                                        <Select 
                                            options={dateFormatOptions} 
                                            defaultValue={dateFormatOptions[0]} 
                                            onChange={(selected) => {
                                                handleSelectChange('dateFormat', selected);
                                                // Reset dates when format changes
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
                                                    minHeight: '31px', 
                                                    fontSize: '14px',
                                                    borderColor: '#dee2e6'
                                                }) 
                                            }} 
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <Form.Label style={labelStyle}>Start Date *</Form.Label>
                                        {formData.dateFormat === 'english' ? (
                                            <Form.Control 
                                                type="date" 
                                                name="startDateEnglish" 
                                                value={formData.startDateEnglish} 
                                                onChange={(e) => handleEnglishDateChange('startDateEnglish', e.target.value)}
                                                style={inputStyle} 
                                                size="sm" 
                                                required 
                                            />
                                        ) : (
                                            <Form.Control 
                                                type="text" 
                                                name="startDateNepali" 
                                                value={formData.startDateNepali} 
                                                onChange={(e) => handleNepaliDateChange('startDateNepali', e.target.value)}
                                                onBlur={(e) => handleNepaliDateBlur('startDateNepali', e.target.value)}
                                                placeholder="YYYY-MM-DD" 
                                                style={inputStyle} 
                                                size="sm" 
                                                required 
                                                isInvalid={!!dateErrors.startDateNepali}
                                            />
                                        )}
                                        {dateErrors.startDateNepali && (
                                            <Form.Control.Feedback type="invalid" style={{ fontSize: '0.7rem' }}>
                                                {dateErrors.startDateNepali}
                                            </Form.Control.Feedback>
                                        )}
                                    </Col>
                                </Row>

                                <Row style={rowStyle}>
                                    <Col md={12}>
                                        <Form.Check 
                                            type="switch" 
                                            label="Enable VAT" 
                                            name="vatEnabled" 
                                            checked={formData.vatEnabled} 
                                            onChange={handleChange} 
                                            style={{ fontSize: '13px' }}
                                            id="vat-switch"
                                        />
                                    </Col>
                                </Row>

                                <Button 
                                    type="submit" 
                                    variant="primary" 
                                    size="sm" 
                                    disabled={loading || !token} 
                                    style={{ 
                                        width: '100%', 
                                        marginTop: '15px', 
                                        padding: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 500
                                    }}
                                >
                                    {loading ? 'Creating...' : 'Create Company'}
                                </Button>
                            </Form>
                        )}
                    </Card.Body>
                </Card>
            </Container>
        </DashboardLayout>
    );
};

export default CompanyForm;