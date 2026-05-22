import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Header from '../Header';
import NepaliDate from 'nepali-datetime';
import '../../../stylesheet/noDateIcon.css';

// Helper functions for date conversion
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

        if (!year || month === undefined || !day) {
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

const DailyProfit = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        fromDate: '',
        toDate: ''
    });
    
    // SPLIT STATE: Separate date range from report data
    const [dateRange, setDateRange] = useState({
        fromDate: '',
        toDate: '',
        fromDateAd: '',
        toDateAd: ''
    });
    
    const [companyData, setCompanyData] = useState(null);
    const [company, setCompany] = useState({
        dateFormat: 'english',
        vatEnabled: true
    });
    const [dateErrors, setDateErrors] = useState({
        fromDate: '',
        toDate: ''
    });
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    
    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const fromDateAdRef = useRef(null);
    const toDateAdRef = useRef(null);

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

    // Validate and auto-correct Nepali date
    const validateAndCorrectNepaliDate = (dateStr) => {
        if (!dateStr) return null;
        if (isValidNepaliDate(dateStr)) return dateStr;

        const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (match) {
            let [_, year, month, day] = match;
            month = parseInt(month, 10);
            day = parseInt(day, 10);

            if (month < 1) month = 1;
            if (month > 12) month = 12;
            if (day < 1) day = 1;
            if (day > 32) day = 32;

            const correctedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (isValidNepaliDate(correctedDate)) {
                return correctedDate;
            }
        }
        return null;
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/retailer/daily-profit/sales-analysis');
                if (response.data.success) {
                    const data = response.data.data;
                    setCompanyData(data);
                    
                    // Set company date format
                    const dateFormat = data.companyDateFormat?.toLowerCase() || 'english';
                    setCompany({
                        dateFormat: dateFormat,
                        vatEnabled: data.company?.vatEnabled || true
                    });
                    
                    // Set default dates from fiscal year based on date format
                    let fromDateFormatted = '';
                    let toDateFormatted = '';
                    let fromDateAd = '';
                    let toDateAd = '';
                    
                    if (dateFormat === 'nepali') {
                        fromDateFormatted = data.currentFiscalYear?.startDateNepali || currentNepaliDate;
                        toDateFormatted = currentNepaliDate;
                        fromDateAd = convertBsToAd(fromDateFormatted);
                        toDateAd = convertBsToAd(toDateFormatted);
                    } else {
                        fromDateFormatted = data.currentFiscalYear?.startDate 
                            ? new Date(data.currentFiscalYear.startDate).toISOString().split('T')[0]
                            : currentEnglishDate;
                        toDateFormatted = currentEnglishDate;
                        fromDateAd = fromDateFormatted;
                        toDateAd = toDateFormatted;
                    }
                    
                    setFormData({
                        fromDate: fromDateFormatted,
                        toDate: toDateFormatted
                    });
                    
                    setDateRange({
                        fromDate: fromDateFormatted,
                        toDate: toDateFormatted,
                        fromDateAd: fromDateAd,
                        toDateAd: toDateAd
                    });
                } else {
                    setError(response.data.error || response.data.message);
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
                setError(err.response?.data?.error || err.response?.data?.message || 'Failed to fetch initial data');
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    const handleBsDateChange = (e) => {
        const { name, value } = e.target;
        const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
        const adDate = convertBsToAd(sanitizedValue);
        
        setDateRange(prev => ({
            ...prev,
            [name]: sanitizedValue,
            [`${name}Ad`]: adDate || prev[`${name}Ad`]
        }));
        setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
        setDateErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleAdDateChange = (e) => {
        const { name, value } = e.target;
        const bsDate = convertAdToBs(value);
        const fieldName = name.replace('Ad', '');
        
        setDateRange(prev => ({
            ...prev,
            [name]: value,
            [fieldName]: bsDate || prev[fieldName]
        }));
        setFormData(prev => ({ ...prev, [fieldName]: bsDate || prev[fieldName] }));
    };

    const handleKeyDown = (e, nextFieldId) => {
        const allowedKeys = [
            'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Home', 'End'
        ];

        if (!allowedKeys.includes(e.key) &&
            !/^\d$/.test(e.key) &&
            e.key !== '/' &&
            e.key !== '-' &&
            !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            const dateStr = e.target.value.trim();
            const fieldName = e.target.name;

            if (!dateStr) {
                const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                const correctedDate = company.dateFormat === 'nepali'
                    ? currentDate.format('YYYY-MM-DD')
                    : currentDate.toISOString().split('T')[0];
                const adDate = company.dateFormat === 'nepali' ? convertBsToAd(correctedDate) : correctedDate;
                
                setDateRange(prev => ({
                    ...prev,
                    [fieldName]: correctedDate,
                    [`${fieldName}Ad`]: adDate
                }));
                setFormData(prev => ({ ...prev, [fieldName]: correctedDate }));
                setDateErrors(prev => ({ ...prev, [fieldName]: '' }));
                
                if (nextFieldId) {
                    document.getElementById(nextFieldId)?.focus();
                }
            } else if (dateErrors[fieldName]) {
                e.target.focus();
            } else if (nextFieldId) {
                document.getElementById(nextFieldId)?.focus();
            }
        }
    };

    const handleBsDateBlur = (e) => {
        const fieldName = e.target.name;
        const dateStr = e.target.value.trim();
        
        if (!dateStr) {
            setDateErrors(prev => ({ ...prev, [fieldName]: '' }));
            return;
        }

        const correctedDate = validateAndCorrectNepaliDate(dateStr);
        if (!correctedDate) {
            const fallbackDate = currentNepaliDate;
            const adDate = convertBsToAd(fallbackDate);
            setDateRange(prev => ({
                ...prev,
                [fieldName]: fallbackDate,
                [`${fieldName}Ad`]: adDate
            }));
            setFormData(prev => ({ ...prev, [fieldName]: fallbackDate }));
            setNotification({
                show: true,
                message: 'Invalid Nepali date. Auto-corrected to current date.',
                type: 'warning',
                duration: 3000
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate both dates before submitting
        if (!dateRange.fromDate || !dateRange.toDate) {
            setError('Please select both from and to dates');
            return;
        }
        
        setSubmitting(true);
        setError(null);
        
        try {
            // Use AD dates for API call
            const response = await api.post('/api/retailer/daily-profit/sales-analysis', {
                fromDate: dateRange.fromDateAd,
                toDate: dateRange.toDateAd
            });
            
            if (response.data.success) {
                // Navigate to results page with BS dates for display
                const params = new URLSearchParams({
                    fromDate: dateRange.fromDate,
                    toDate: dateRange.toDate,
                    fromDateAd: dateRange.fromDateAd,
                    toDateAd: dateRange.toDateAd
                });
                window.location.href = `/retailer/daily-profit/sales-analysis/results?${params.toString()}`;
            } else {
                setError(response.data.error || response.data.message || 'Failed to generate profit analysis');
            }
        } catch (err) {
            console.error('Error submitting form:', err);
            setError(err.response?.data?.error || err.response?.data?.message || 'Failed to generate profit analysis');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid">
                <Header />
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-md-8 col-lg-6">
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="mt-3">Loading profit analysis form...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid">
                <Header />
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-md-8 col-lg-6">
                            <div className="alert alert-danger mt-4" role="alert">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                {error}
                            </div>
                            <button 
                                className="btn btn-secondary mt-2"
                                onClick={() => window.location.reload()}
                            >
                                <i className="fas fa-redo me-2"></i> Retry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isNepaliFormat = company.dateFormat === 'nepali';

    return (
        <div className="container-fluid">
            <Header />
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-10 col-lg-8">
                        <div className="card shadow-lg mt-4 animate__animated animate__fadeInUp">
                            <div className="card-header bg-primary text-white text-center">
                                <h3 className="mb-0">
                                    <i className="fas fa-chart-line me-2"></i> Daily Profit/Sales Analysis
                                </h3>
                            </div>
                            <div className="card-body">
                                <section className="content-header text-center mb-4">
                                    <h4>Select Date Range</h4>
                                </section>

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-2 mb-3">
                                        {/* From Date BS Field */}
                                        <div className="col-12" style={{ flex: '0 0 auto', width: '23%' }}>
                                            <div className="position-relative">
                                                <input
                                                    type="text"
                                                    name="fromDate"
                                                    id="fromDate"
                                                    ref={fromDateRef}
                                                    className={`form-control form-control-sm no-date-icon ${dateErrors.fromDate ? 'is-invalid' : ''}`}
                                                    value={dateRange.fromDate || ''}
                                                    onChange={handleBsDateChange}
                                                    onKeyDown={(e) => {
                                                        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                                                        if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key) && e.key !== '/' && e.key !== '-' && !e.ctrlKey && !e.metaKey) {
                                                            e.preventDefault();
                                                        }
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const dateStr = e.target.value.trim();
                                                            if (!dateStr) {
                                                                const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                                                const correctedDate = company.dateFormat === 'nepali' ? currentDate.format('YYYY-MM-DD') : currentDate.toISOString().split('T')[0];
                                                                const adDate = company.dateFormat === 'nepali' ? convertBsToAd(correctedDate) : correctedDate;
                                                                setDateRange(prev => ({
                                                                    ...prev,
                                                                    fromDate: correctedDate,
                                                                    fromDateAd: adDate
                                                                }));
                                                                setFormData(prev => ({ ...prev, fromDate: correctedDate }));
                                                                setDateErrors(prev => ({ ...prev, fromDate: '' }));
                                                                handleKeyDown(e, 'fromDateAd');
                                                            } else if (dateErrors.fromDate) {
                                                                e.target.focus();
                                                            } else {
                                                                handleKeyDown(e, 'fromDateAd');
                                                            }
                                                        }
                                                    }}
                                                    onBlur={handleBsDateBlur}
                                                    placeholder={isNepaliFormat ? "YYYY-MM-DD (BS)" : "YYYY-MM-DD"}
                                                    required
                                                    autoFocus
                                                    autoComplete="off"
                                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                                />
                                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    From (BS): <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* From Date AD Field */}
                                        <div className="col-12" style={{ flex: '0 0 auto', width: '23%' }}>
                                            <div className="position-relative">
                                                <input
                                                    type="date"
                                                    name="fromDateAd"
                                                    id="fromDateAd"
                                                    ref={fromDateAdRef}
                                                    className="form-control form-control-sm"
                                                    value={dateRange.fromDateAd || ''}
                                                    onChange={handleAdDateChange}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleKeyDown(e, 'toDate'); }}
                                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                                />
                                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    From (AD):
                                                </label>
                                            </div>
                                        </div>

                                        {/* To Date BS Field */}
                                        <div className="col-12" style={{ flex: '0 0 auto', width: '23%' }}>
                                            <div className="position-relative">
                                                <input
                                                    type="text"
                                                    name="toDate"
                                                    id="toDate"
                                                    ref={toDateRef}
                                                    className={`form-control form-control-sm no-date-icon ${dateErrors.toDate ? 'is-invalid' : ''}`}
                                                    value={dateRange.toDate || ''}
                                                    onChange={handleBsDateChange}
                                                    onKeyDown={(e) => {
                                                        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                                                        if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key) && e.key !== '/' && e.key !== '-' && !e.ctrlKey && !e.metaKey) {
                                                            e.preventDefault();
                                                        }
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const dateStr = e.target.value.trim();
                                                            if (!dateStr) {
                                                                const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                                                const correctedDate = company.dateFormat === 'nepali' ? currentDate.format('YYYY-MM-DD') : currentDate.toISOString().split('T')[0];
                                                                const adDate = company.dateFormat === 'nepali' ? convertBsToAd(correctedDate) : correctedDate;
                                                                setDateRange(prev => ({
                                                                    ...prev,
                                                                    toDate: correctedDate,
                                                                    toDateAd: adDate
                                                                }));
                                                                setFormData(prev => ({ ...prev, toDate: correctedDate }));
                                                                setDateErrors(prev => ({ ...prev, toDate: '' }));
                                                                handleKeyDown(e, 'toDateAd');
                                                            } else if (dateErrors.toDate) {
                                                                e.target.focus();
                                                            } else {
                                                                handleKeyDown(e, 'toDateAd');
                                                            }
                                                        }
                                                    }}
                                                    onBlur={handleBsDateBlur}
                                                    placeholder={isNepaliFormat ? "YYYY-MM-DD (BS)" : "YYYY-MM-DD"}
                                                    required
                                                    autoComplete="off"
                                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                                />
                                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    To (BS): <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* To Date AD Field */}
                                        <div className="col-12" style={{ flex: '0 0 auto', width: '23%' }}>
                                            <div className="position-relative">
                                                <input
                                                    type="date"
                                                    name="toDateAd"
                                                    id="toDateAd"
                                                    ref={toDateAdRef}
                                                    className="form-control form-control-sm"
                                                    value={dateRange.toDateAd || ''}
                                                    onChange={handleAdDateChange}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleKeyDown(e, 'submitBtn'); }}
                                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                                />
                                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    To (AD):
                                                </label>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <div className="col-12 col-md-auto d-flex align-items-end">
                                            <button 
                                                type="submit" 
                                                id="submitBtn"
                                                className="btn btn-primary btn-sm"
                                                disabled={submitting}
                                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 16px', fontWeight: '500', whiteSpace: 'nowrap' }}
                                            >
                                                {submitting ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-eye me-1"></i> View Report
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Toast (you can implement this component) */}
            {notification.show && (
                <div className={`toast-notification toast-${notification.type}`} style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
                    <div className="toast-header">
                        <strong className="me-auto">{notification.type === 'success' ? 'Success' : notification.type === 'error' ? 'Error' : 'Warning'}</strong>
                        <button type="button" className="btn-close btn-sm" onClick={() => setNotification(prev => ({ ...prev, show: false }))}></button>
                    </div>
                    <div className="toast-body">
                        {notification.message}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyProfit;