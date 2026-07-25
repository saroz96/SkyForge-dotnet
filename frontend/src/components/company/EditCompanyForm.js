// components/company/EditCompanyForm.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Form, Button, Alert, Container, Card, Spinner } from 'react-bootstrap';
import Select from 'react-select';
import NepaliDate from 'nepali-datetime';
import DashboardLayout from '../company/DashboardLayout';
import NotificationToast from '../NotificationToast';
import { FaBuilding, FaArrowLeft, FaSave, FaSpinner, FaCalendarAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';

// Date conversion utilities (same as before)
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

// Nepali Calendar Component (same as before)
const NepaliCalendar = ({ value, onChange, onClose }) => {
    const [currentYear, setCurrentYear] = useState(2080);
    const [currentMonth, setCurrentMonth] = useState(0);
    const [selectedDate, setSelectedDate] = useState(null);
    const [days, setDays] = useState([]);

    const monthNames = ['Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];

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
            const nextMonth = new NepaliDate(year, month + 1, 1);
            const currentMonthDate = new NepaliDate(year, month, 1);
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

            for (let i = 0; i < firstDayOfWeek; i++) {
                calendarDays.push(null);
            }

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

const EditCompanyForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [user, setUser] = useState(null);
    const [isAdminOrSupervisor, setIsAdminOrSupervisor] = useState(false);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [dateErrors, setDateErrors] = useState({
        fiscalYearStartDateNepali: '',
    });
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarField, setCalendarField] = useState('fiscalYearStartDateNepali');
    const calendarRef = useRef(null);

    // Form state - with correct field names matching the DTO
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        country: 'Nepal',
        state: '',
        city: '',
        pan: '',
        phone: '',
        ward: 0,
        email: '',
        tradeType: 'Retailer',
        dateFormat: 'English',
        fiscalYearStartDateNepali: '',
        fiscalYearStartDateEnglish: '',
        vatEnabled: false,
        storeManagement: false,
        renewalDate: null,
        notificationEmails: [],
        attendanceSettings: null // Add this field
    });

    // Trade type options with proper enum values
    const tradeTypeOptions = [
        { value: 'Retailer', label: 'Retailer' },
        { value: 'Pharmacy', label: 'Pharmacy' },
        { value: 'Wholesale', label: 'Wholesale' },
        { value: 'Distributor', label: 'Distributor' }
    ];

    // Date format options with proper enum values
    const dateFormatOptions = [
        { value: 'English', label: 'English' },
        { value: 'Nepali', label: 'Nepali' }
    ];

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

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/auth/login');
                    return;
                }

                // Create axios instance with auth header
                const api = axios.create({
                    baseURL: process.env.REACT_APP_API_BASE_URL,
                    withCredentials: true,
                });

                api.interceptors.request.use(
                    (config) => {
                        const token = localStorage.getItem('token');
                        if (token) {
                            config.headers.Authorization = `Bearer ${token}`;
                        }
                        return config;
                    },
                    (error) => Promise.reject(error)
                );

                // Fetch user data
                try {
                    const userRes = await api.get('/api/User/current');
                    if (userRes.data && userRes.data.success) {
                        const userData = userRes.data.user;
                        setUser(userData);
                        setIsAdminOrSupervisor(userData.isAdmin || userData.role === 'Supervisor');
                    }
                } catch (userErr) {
                    console.warn('User fetch error, continuing:', userErr);
                }

                // Fetch company data
                const companyRes = await api.get(`/api/Companies/${id}`);
                const company = companyRes.data;

                // Format the data for the form - ensure all fields match the DTO
                const formattedCompany = {
                    name: company.name || '',
                    address: company.address || '',
                    country: company.country || 'Nepal',
                    state: company.state || '',
                    city: company.city || '',
                    pan: company.pan || '',
                    phone: company.phone || '',
                    ward: company.ward || 0,
                    email: company.email || '',
                    tradeType: company.tradeType || 'Retailer',
                    dateFormat: company.dateFormat || 'English',
                    fiscalYearStartDateNepali: company.fiscalYearStartDateNepali || '',
                    fiscalYearStartDateEnglish: company.fiscalYearStartDateEnglish || '',
                    vatEnabled: company.vatEnabled || false,
                    storeManagement: company.storeManagement || false,
                    renewalDate: company.renewalDate || null,
                    notificationEmails: company.notificationEmails || [],
                    attendanceSettings: null
                };

                setFormData(formattedCompany);
                setError('');
            } catch (err) {
                console.error('Fetch error:', err);
                console.error('Error response:', err.response?.data);
                setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to fetch data');
                if (err.response?.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/auth/login');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, navigate]);

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

    // Handle Nepali date change with auto-formatting
    const handleNepaliDateChange = (field, value) => {
        let cleaned = value.replace(/[^0-9-]/g, '');

        if (cleaned.startsWith('0') && cleaned.length > 1) {
            cleaned = cleaned.substring(1);
        }

        const currentLength = cleaned.length;
        const previousLength = formData[field] ? formData[field].length : 0;
        const isDeleting = currentLength < previousLength;

        let formatted = cleaned;

        if (!isDeleting) {
            if (cleaned.length >= 4 && cleaned[4] !== '-') {
                if (cleaned.length === 4) {
                    formatted = cleaned + '-';
                } else if (cleaned.length > 4) {
                    formatted = cleaned.substring(0, 4) + '-' + cleaned.substring(4);
                }
            }

            if (cleaned.length >= 7 && formatted[7] !== '-') {
                if (cleaned.length === 7) {
                    formatted = formatted.substring(0, 7) + '-';
                } else if (cleaned.length > 7) {
                    const parts = formatted.split('-');
                    if (parts.length >= 2) {
                        const year = parts[0];
                        const monthDay = parts[1] || '';
                        if (monthDay.length > 2) {
                            formatted = year + '-' + monthDay.substring(0, 2) + '-' + monthDay.substring(2);
                        }
                    }
                }
            }
        }

        if (formatted.length > 10) {
            formatted = formatted.substring(0, 10);
        }

        setFormData(prev => ({ ...prev, [field]: formatted }));
        setDateErrors(prev => ({ ...prev, [field]: '' }));

        if (formatted.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
            if (isValidNepaliDate(formatted)) {
                const adDate = convertBsToAd(formatted);
                if (adDate && field === 'fiscalYearStartDateNepali') {
                    setFormData(prev => ({ ...prev, fiscalYearStartDateEnglish: adDate }));
                }
                setDateErrors(prev => ({ ...prev, [field]: '' }));
            } else {
                setDateErrors(prev => ({ ...prev, [field]: 'Invalid Nepali date' }));
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
            if (adDate && field === 'fiscalYearStartDateNepali') {
                setFormData(prev => ({ ...prev, fiscalYearStartDateNepali: dateStr, fiscalYearStartDateEnglish: adDate }));
            }
            setDateErrors(prev => ({ ...prev, [field]: '' }));
        } else {
            setDateErrors(prev => ({ ...prev, [field]: 'Please enter a valid Nepali date (YYYY-MM-DD)' }));
        }
    };

    const handleCalendarSelect = (dateStr) => {
        if (calendarField === 'fiscalYearStartDateNepali') {
            const adDate = convertBsToAd(dateStr);
            setFormData(prev => ({
                ...prev,
                fiscalYearStartDateNepali: dateStr,
                fiscalYearStartDateEnglish: adDate || prev.fiscalYearStartDateEnglish
            }));
            setDateErrors(prev => ({ ...prev, fiscalYearStartDateNepali: '' }));
        }
        setShowCalendar(false);
    };

    const handleEnglishDateChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        if (formData.dateFormat === 'Nepali' && value) {
            const bsDate = convertAdToBs(value);
            if (bsDate && field === 'fiscalYearStartDateEnglish') {
                setFormData(prev => ({ ...prev, fiscalYearStartDateNepali: bsDate }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');

            const api = axios.create({
                baseURL: process.env.REACT_APP_API_BASE_URL,
                withCredentials: true,
            });

            api.interceptors.request.use(
                (config) => {
                    const token = localStorage.getItem('token');
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                    return config;
                },
                (error) => Promise.reject(error)
            );

            // Calculate renewal date (1 year from now if not provided)
            const renewalDate = formData.renewalDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const requestData = {
                name: formData.name,
                address: formData.address,
                country: formData.country,
                state: formData.state,
                city: formData.city,
                pan: formData.pan,
                phone: formData.phone,
                ward: parseInt(formData.ward) || 0,
                email: formData.email,
                tradeType: formData.tradeType.toLowerCase(),
                dateFormat: formData.dateFormat.toLowerCase(),
                vatEnabled: formData.vatEnabled,
                storeManagement: formData.storeManagement || false,
                renewalDate: renewalDate, // Send a value, not null
                fiscalYearStartDateNepali: formData.fiscalYearStartDateNepali || null,
                fiscalYearStartDateEnglish: formData.fiscalYearStartDateEnglish || null,
                notificationEmails: formData.notificationEmails || [],
                attendanceSettings: null
            };

            console.log('Sending update request with data:', JSON.stringify(requestData, null, 2));

            const response = await api.put(`/api/Companies/${id}`, requestData);

            if (response.data) {
                setNotification({
                    show: true,
                    message: 'Company details updated successfully!',
                    type: 'success'
                });

                setTimeout(() => navigate(`/company/${id}`), 2000);
            }
        } catch (err) {
            console.error('Update error:', err);
            console.error('Error response:', err.response?.data);

            let errorMessage = 'Error updating company. Please try again.';
            if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                const errorMessages = Object.values(errors).flat();
                errorMessage = errorMessages.join(', ');
            } else if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }

            setNotification({
                show: true,
                message: errorMessage,
                type: 'error'
            });
        } finally {
            setSaving(false);
        }
    };

    // Styles (same as before)
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

    if (loading) {
        return (
            <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
                <div style={styles.container}>
                    <div className="text-center py-4">
                        <Spinner animation="border" style={{ color: '#2a4d7a' }} />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />

            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <h4 style={styles.headerTitle}>
                        <FaBuilding style={styles.headerIcon} />
                        Edit Company
                    </h4>
                    <Link
                        to={`/company/${id}`}
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
                        Back
                    </Link>
                </div>

                {/* Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h6 style={styles.cardTitle}>
                            <FaBuilding size={14} style={{ color: '#2a4d7a' }} />
                            Edit Company Information
                        </h6>
                    </div>

                    <div style={styles.cardBody}>
                        {error && (
                            <Alert
                                variant="danger"
                                dismissible
                                onClose={() => setError('')}
                                style={styles.alert}
                            >
                                {error}
                            </Alert>
                        )}

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
                                        value={tradeTypeOptions.find(opt => opt.value === formData.tradeType)}
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
                                        value={dateFormatOptions.find(opt => opt.value === formData.dateFormat)}
                                        onChange={(selected) => {
                                            handleSelectChange('dateFormat', selected);
                                            if (selected.value === 'English') {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    fiscalYearStartDateEnglish: '',
                                                    fiscalYearStartDateNepali: ''
                                                }));
                                            } else {
                                                const currentNepaliDate = getCurrentNepaliDate();
                                                setFormData(prev => ({
                                                    ...prev,
                                                    fiscalYearStartDateNepali: currentNepaliDate,
                                                    fiscalYearStartDateEnglish: convertBsToAd(currentNepaliDate) || ''
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
                                        Fiscal Year Start Date <span style={styles.required}>*</span>
                                    </label>
                                    {formData.dateFormat === 'English' ? (
                                        <input
                                            type="date"
                                            name="fiscalYearStartDateEnglish"
                                            value={formData.fiscalYearStartDateEnglish}
                                            onChange={(e) => handleEnglishDateChange('fiscalYearStartDateEnglish', e.target.value)}
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
                                                name="fiscalYearStartDateNepali"
                                                value={formData.fiscalYearStartDateNepali}
                                                onChange={(e) => handleNepaliDateChange('fiscalYearStartDateNepali', e.target.value)}
                                                onBlur={(e) => handleNepaliDateBlur('fiscalYearStartDateNepali', e.target.value)}
                                                placeholder="YYYY-MM-DD"
                                                style={{
                                                    ...styles.input,
                                                    ...(dateErrors.fiscalYearStartDateNepali ? styles.inputError : {})
                                                }}
                                                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                                required
                                            />
                                            <FaCalendarAlt
                                                style={styles.calendarIcon}
                                                onClick={() => {
                                                    setCalendarField('fiscalYearStartDateNepali');
                                                    setShowCalendar(!showCalendar);
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.color = styles.calendarIconHover.color;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.color = '#a0aec0';
                                                }}
                                            />
                                            {showCalendar && calendarField === 'fiscalYearStartDateNepali' && (
                                                <div ref={calendarRef}>
                                                    <NepaliCalendar
                                                        value={formData.fiscalYearStartDateNepali}
                                                        onChange={handleCalendarSelect}
                                                        onClose={() => setShowCalendar(false)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {dateErrors.fiscalYearStartDateNepali && (
                                        <div style={styles.errorText}>{dateErrors.fiscalYearStartDateNepali}</div>
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
                                    to={`/company/${id}`}
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
                                    disabled={saving}
                                    onMouseEnter={(e) => {
                                        if (!saving) {
                                            e.target.style.background = styles.buttonPrimaryHover.background;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = styles.buttonPrimary.background;
                                    }}
                                >
                                    {saving ? (
                                        <>
                                            <FaSpinner className="fa-spin" size={12} />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <FaSave size={12} />
                                            Update Company
                                        </>
                                    )}
                                </button>
                            </div>
                        </Form>
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

export default EditCompanyForm;