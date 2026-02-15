import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../components/services/api'; // Use your configured api instance
import { Form, Button, Container, Card, Spinner } from 'react-bootstrap';
import Select from 'react-select';
import DashboardLayout from '../company/DashboardLayout';
import NepaliDate from 'nepali-date-converter';
import NotificationToast from '../NotificationToast';
import '../../stylesheet/company/CompanyForm.css';

const CompanyForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const [isAdminOrSupervisor, setIsAdminOrSupervisor] = useState(false);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [dateErrors, setDateErrors] = useState({
        startDateNepali: '',
    });

    // Get user from Redux store
    const currentUser = useSelector((state) => state.auth.userInfo);
    const token = localStorage.getItem('token'); // Get token from localStorage directly

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Use Redux user data if available
                if (currentUser) {
                    setUser(currentUser);
                    setIsAdminOrSupervisor(currentUser.isAdmin || currentUser.role === 'Supervisor');
                    setLoading(false);
                    return;
                }

                // Check if we have a token first
                const storedToken = localStorage.getItem('token');
                if (!storedToken) {
                    setNotification({
                        show: true,
                        message: 'Please login first',
                        type: 'error'
                    });
                    setTimeout(() => navigate('/auth/login'), 2000);
                    return;
                }

                // Fetch current user
                const userRes = await api.get('/api/User/current');
                const userData = userRes.data.user;
                setUser(userData);
                setIsAdminOrSupervisor(userData.isAdmin || userData.role === 'Supervisor');
                setLoading(false);
            } catch (err) {
                console.error('Error fetching user:', err);

                // If 401, redirect to login
                if (err.response?.status === 401) {
                    setNotification({
                        show: true,
                        message: 'Session expired. Please login again.',
                        type: 'error'
                    });
                    setTimeout(() => navigate('/auth/login'), 2000);
                }
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser, navigate]);

    // Debug: Check auth status on component mount
    useEffect(() => {
        console.log('Auth Status:', {
            hasToken: !!localStorage.getItem('token'),
            token: localStorage.getItem('token'),
            hasReduxUser: !!currentUser,
            reduxUser: currentUser
        });
    }, [currentUser]);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        country: 'Nepal',
        state: '',
        city: '',
        pan: '',
        phone: '',
        ward: '',
        email: '',
        tradeType: '',
        dateFormat: '',
        startDateEnglish: new Date().toISOString().split('T')[0],
        endDateEnglish: '',
        startDateNepali: currentNepaliDate,
        endDateNepali: '',
        vatEnabled: false
    });

    // Trade type options
    const tradeTypeOptions = [
        { value: 'retailer', label: 'Retailer' },
    ];

    // Date format options
    const dateFormatOptions = [
        { value: 'nepali', label: 'Nepali Date' },
        { value: 'english', label: 'English Date' }
    ];

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Handle select changes
    const handleSelectChange = (name, selectedOption) => {
        setFormData(prev => ({
            ...prev,
            [name]: selectedOption.value
        }));
    };

    // Calculate end date when start date changes
    useEffect(() => {
        if (formData.dateFormat === 'english' && formData.startDateEnglish) {
            const startDate = new Date(formData.startDateEnglish);
            const endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + 1);
            endDate.setDate(endDate.getDate() - 1);

            setFormData(prev => ({
                ...prev,
                endDateEnglish: endDate.toISOString().split('T')[0]
            }));
        }
    }, [formData.startDateEnglish, formData.dateFormat]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Check if user is authenticated - check localStorage directly
            const storedToken = localStorage.getItem('token');
            if (!storedToken) {
                setNotification({
                    show: true,
                    message: 'You must be logged in to create a company. Redirecting to login...',
                    type: 'error'
                });
                setTimeout(() => navigate('/auth/login'), 2000);
                return;
            }

            console.log('Token found in localStorage:', storedToken.substring(0, 20) + '...');

            let startDateNepali = '';

            if (formData.dateFormat === 'nepali' && formData.startDateNepali) {
                try {
                    // FIX: Check if date is in correct format before splitting
                    if (typeof formData.startDateNepali === 'string') {
                        // Handle different possible formats
                        if (formData.startDateNepali.includes('/')) {
                            // Format: MM/DD/YYYY
                            const [month, day, year] = formData.startDateNepali.split('/');

                            // FIX: Check if all parts exist
                            if (month && day && year) {
                                startDateNepali = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            } else {
                                console.warn('Invalid Nepali date format:', formData.startDateNepali);
                                // Use as-is if format is wrong
                                startDateNepali = formData.startDateNepali;
                            }
                        } else if (formData.startDateNepali.includes('-')) {
                            // Already in YYYY-MM-DD format
                            startDateNepali = formData.startDateNepali;
                        } else {
                            // Unknown format, use as-is
                            startDateNepali = formData.startDateNepali;
                        }
                    }
                } catch (error) {
                    console.error('Error formatting Nepali date:', error);
                    startDateNepali = formData.startDateNepali || '';
                }
            }

            // Prepare the request data to match your DTO
            const requestData = {
                name: formData.name,
                address: formData.address,
                country: formData.country,
                state: formData.state,
                city: formData.city,
                pan: formData.pan,
                phone: formData.phone,
                ward: formData.ward ? parseInt(formData.ward) : null,
                email: formData.email,
                tradeType: formData.tradeType || 'retailer',
                dateFormat: formData.dateFormat || 'english',
                vatEnabled: Boolean(formData.vatEnabled),
                startDateEnglish: formData.startDateEnglish || '',
                endDateEnglish: formData.endDateEnglish || '',
                // startDateNepali: formData.startDateNepali || '',
                startDateNepali: startDateNepali,
                endDateNepali: formData.endDateNepali || ''
            };

            console.log('Sending to API:', requestData);

            // Add Authorization header manually for debugging
            const config = {
                headers: {
                    'Authorization': `Bearer ${storedToken}`,
                    'Content-Type': 'application/json'
                }
            };

            console.log('Request headers:', config.headers);

            // Make the API call with your configured api instance
            const response = await api.post('/api/Companies', requestData, config);

            console.log('API Response:', response.data);

            if (response.data.success) {
                setNotification({
                    show: true,
                    message: response.data.message || 'Company created successfully!',
                    type: 'success'
                });
                setShowModal(true);

                const redirectUrl = response.data.data?.redirectUrl ||
                    response.data.data?.dashboardPath ||
                    '/user-dashboard';


                window.dispatchEvent(new CustomEvent('companyCreated'));

                // Navigate based on response
                setTimeout(() => {
                    navigate(redirectUrl);
                }, 2000);
            } else {
                setNotification({
                    show: true,
                    message: response.data.message || 'Failed to create company',
                    type: 'error'
                });
                setShowModal(true);
            }
        } catch (err) {
            console.error('Full error:', err);
            console.error('Error response:', err.response);

            let errorMessage = 'Error creating company. Please try again.';

            if (err.response?.status === 401) {
                errorMessage = 'Session expired. Please login again.';
                localStorage.removeItem('token'); // Clear invalid token
                setTimeout(() => navigate('/auth/login'), 2000);
            } else if (err.response?.status === 400) {
                errorMessage = err.response.data?.message || 'Invalid data. Please check all fields.';
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }

            setNotification({
                show: true,
                message: errorMessage,
                type: 'error'
            });
            setShowModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />
            <Container className="company-form-container">
                <Card className="company-form-card">
                    <Card.Header className="company-form-header">
                        <h2 className="company-form-title">
                            <i className="fas fa-building me-2"></i>
                            Create New Company
                        </h2>
                        <div className="auth-status">
                            {token ? (
                                <span className="text-success">✓ Logged in as {user?.email}</span>
                            ) : (
                                <span className="text-danger">✗ Not logged in</span>
                            )}
                        </div>
                    </Card.Header>
                    <Card.Body>
                        {/* Loading Overlay */}
                        {loading && (
                            <div className="text-center py-4">
                                <Spinner animation="border" role="status" variant="primary" />
                                <p className="mt-2">Creating company...</p>
                            </div>
                        )}

                        {!token ? (
                            <div className="alert alert-warning text-center">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                You must be logged in to create a company.
                                <Button
                                    variant="link"
                                    onClick={() => navigate('/auth/login')}
                                    className="ms-2"
                                >
                                    Click here to login
                                </Button>
                            </div>
                        ) : (
                            <Form onSubmit={handleSubmit}>
                                <div className="row g-3 mb-4">
                                    {/* Company Name */}
                                    <div className="col-md-6">
                                        <Form.Label>Company Name *</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                        />
                                    </div>

                                    {/* Country */}
                                    <div className="col-md-6">
                                        <Form.Label>Country *</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="country"
                                            value={formData.country}
                                            onChange={handleChange}
                                            required
                                            readOnly
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div className="row g-3 mb-4">
                                    {/* State */}
                                    <div className="col-md-6">
                                        <Form.Label>State/Province *</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                        />
                                    </div>

                                    {/* City */}
                                    <div className="col-md-6">
                                        <Form.Label>City *</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div className="row g-3 mb-4">
                                    {/* Address */}
                                    <div className="col-md-6">
                                        <Form.Label>Address *</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                        />
                                    </div>

                                    {/* PAN */}
                                    <div className="col-md-6">
                                        <Form.Label>PAN Number *</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="pan"
                                            value={formData.pan}
                                            onChange={handleChange}
                                            minLength="9"
                                            maxLength="9"
                                            placeholder="Enter 9-digit PAN number"
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div className="row g-3 mb-4">
                                    {/* Phone */}
                                    <div className="col-md-6">
                                        <Form.Label>Phone Number *</Form.Label>
                                        <Form.Control
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="+977-9801234567 or 9801234567"
                                            required
                                            disabled={loading}
                                        />
                                    </div>

                                    {/* Ward */}
                                    <div className="col-md-6">
                                        <Form.Label>Ward Number *</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="ward"
                                            value={formData.ward}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div className="row g-3 mb-4">
                                    {/* Email */}
                                    <div className="col-md-6">
                                        <Form.Label>Company Email *</Form.Label>
                                        <Form.Control
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                        />
                                    </div>

                                    {/* Trade Type */}
                                    <div className="col-md-6">
                                        <Form.Label>Business Type *</Form.Label>
                                        <Select
                                            options={tradeTypeOptions}
                                            onChange={(selected) => handleSelectChange('tradeType', selected)}
                                            value={tradeTypeOptions.find(option => option.value === formData.tradeType)}
                                            placeholder="Select business type"
                                            isDisabled={loading}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="row g-3 mb-4">
                                    {/* Date Format */}
                                    <div className="col-md-6">
                                        <Form.Label>Date Format *</Form.Label>
                                        <Select
                                            options={dateFormatOptions}
                                            onChange={(selected) => handleSelectChange('dateFormat', selected)}
                                            value={dateFormatOptions.find(option => option.value === formData.dateFormat)}
                                            placeholder="Select date format"
                                            isDisabled={loading}
                                            required
                                        />
                                    </div>

                                    {/* Fiscal Year Start Date (dynamic based on date format) */}
                                    <div className="col-md-6">
                                        {formData.dateFormat === 'english' && (
                                            <>
                                                <Form.Label>Fiscal Year Start Date (English) *</Form.Label>
                                                <Form.Control
                                                    type="date"
                                                    name="startDateEnglish"
                                                    value={formData.startDateEnglish}
                                                    onChange={handleChange}
                                                    required
                                                    disabled={loading}
                                                />
                                            </>
                                        )}

                                        {formData.dateFormat === 'nepali' && (
                                            <>
                                                <Form.Label>Fiscal Year Start Date (Nepali) *</Form.Label>
                                                <div className="mb-3">
                                                    <input
                                                        type="date"
                                                        autoComplete='off'
                                                        className={`form-control ${dateErrors.startDateNepali ? 'is-invalid' : ''}`}
                                                        value={formData.startDateNepali ?
                                                            new Date(formData.startDateNepali).toISOString().split('T')[0] :
                                                            ''}
                                                        onChange={(e) => {
                                                            setFormData({ ...formData, startDateNepali: e.target.value });
                                                            setDateErrors(prev => ({ ...prev, startDateNepali: '' }));
                                                        }}
                                                        onBlur={(e) => {
                                                            try {
                                                                const dateStr = e.target.value;
                                                                if (!dateStr) {
                                                                    setDateErrors(prev => ({ ...prev, startDateNepali: 'Date is required' }));
                                                                    return;
                                                                }
                                                                if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
                                                                    return;
                                                                }
                                                                const [year, month, day] = dateStr.split('/').map(Number);
                                                                if (month < 1 || month > 12) throw new Error("Month must be between 1-12");
                                                                if (day < 1 || day > 33) throw new Error("Day must be between 1-32");
                                                                const nepaliDate = new NepaliDate(year, month - 1, day);

                                                                setFormData({
                                                                    ...formData,
                                                                    startDateNepali: nepaliDate.format('MM/DD/YYYY')
                                                                });
                                                                setDateErrors(prev => ({ ...prev, startDateNepali: '' }));
                                                            } catch (error) {
                                                                setDateErrors(prev => ({
                                                                    ...prev,
                                                                    startDateNepali: error.message || 'Invalid Nepali date'
                                                                }));
                                                            }
                                                        }}
                                                        required
                                                        disabled={loading}
                                                    />
                                                    {formData.startDateNepali && (
                                                        <Form.Text className="text-muted">
                                                            Selected: {formData.startDateNepali}
                                                        </Form.Text>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* VAT Enabled Toggle */}
                                <div className="row g-3 mb-4">
                                    <div className="col-md-6">
                                        <Form.Check
                                            type="switch"
                                            id="vatEnabled"
                                            label="Enable VAT"
                                            name="vatEnabled"
                                            checked={formData.vatEnabled}
                                            onChange={handleChange}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="d-grid gap-2 mt-4">
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        size="lg"
                                        disabled={loading || !token}
                                    >
                                        <i className="fas fa-save me-2"></i>
                                        {loading ? 'Creating...' : 'Create Company'}
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Card.Body>
                </Card>
            </Container>
        </DashboardLayout>
    );
};

export default CompanyForm;