// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import Header from '../Header';

// const DailyProfit = () => {
//     const [formData, setFormData] = useState({
//         fromDate: '',
//         toDate: ''
//     });
//     const [companyData, setCompanyData] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [submitting, setSubmitting] = useState(false);
//         const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 const response = await api.get('/api/retailer/daily-profit/sales-analysis');
//                 if (response.data.success) {
//                     const data = response.data.data;
//                     setCompanyData(data);

//                     // Set default dates
//                     setFormData({
//                         fromDate: data.fromDate || data.startDate,
//                         toDate: data.toDate || data.endDate || new Date().toISOString().split('T')[0]
//                     });
//                 } else {
//                     setError(response.data.error);
//                 }
//             } catch (err) {
//                 setError(err.response?.data?.message || 'Failed to fetch initial data');
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchInitialData();
//     }, []);

//     const handleChange = (e) => {
//         setFormData({
//             ...formData,
//             [e.target.name]: e.target.value
//         });
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setSubmitting(true);

//         try {
//             const response = await api.post('/api/retailer/daily-profit/sales-analysis', formData);
//             if (response.data.success) {
//                 // Handle the results - you might want to pass this to a parent component
//                 // or display it in a results component
//                 console.log('Analysis results:', response.data.data);
//                 // You can redirect to a results page or show results in a modal/separate section
//                 window.location.href = `/retailer/daily-profit/sales-analysis/results?fromDate=${formData.fromDate}&toDate=${formData.toDate}`;
//             } else {
//                 setError(response.data.error);
//             }
//         } catch (err) {
//             setError(err.response?.data?.error || 'Failed to generate profit analysis');
//         } finally {
//             setSubmitting(false);
//         }
//     };

//     if (loading) {
//         return (
//             <div className="content-wrapper">
//                 <div className="container">
//                     <div className="row justify-content-center">
//                         <div className="col-md-8 col-lg-6">
//                             <div className="text-center py-5">
//                                 <div className="spinner-border text-primary" role="status">
//                                     <span className="visually-hidden">Loading...</span>
//                                 </div>
//                                 <p className="mt-3">Loading profit analysis form...</p>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <div className="content-wrapper">
//                 <div className="container">
//                     <div className="row justify-content-center">
//                         <div className="col-md-8 col-lg-6">
//                             <div className="alert alert-danger mt-4" role="alert">
//                                 <i className="fas fa-exclamation-triangle me-2"></i>
//                                 {error}
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="content-wrapper">
//             <Header/>
//             <div className="container">
//                 <div className="row justify-content-center">
//                     <div className="col-md-8 col-lg-6">
//                         <div className="card shadow-lg mt-4 animate__animated animate__fadeInUp">
//                             <div className="card-header bg-primary text-white text-center">
//                                 <h3 className="mb-0">
//                                     <i className="fas fa-chart-line me-2"></i> Daily Profit/Sales Analysis
//                                 </h3>
//                             </div>
//                             <div className="card-body">
//                                 <section className="content-header text-center mb-4">
//                                     <h4>Select Date Range</h4>
//                                 </section>

//                                 <form onSubmit={handleSubmit}>
//                                     <div className="row justify-content-center">
//                                         <div className="col-md-5 mb-3">
//                                             <div className="form-group text-center">
//                                                 <label htmlFor="fromDate" className="form-label">From Date</label>
//                                                 <div className="input-group">
//                                                     <span className="input-group-text">
//                                                         <i className="fas fa-calendar-alt"></i>
//                                                     </span>
//                                                     <input
//                                                         type="date"
//                                                         name="fromDate"
//                                                         id="fromDate"
//                                                         className="form-control text-center"
//                                                         value={formData.fromDate}
//                                                         onChange={handleChange}
//                                                         autoFocus
//                                                         required
//                                                     />
//                                                 </div>
//                                             </div>
//                                         </div>
//                                         <div className="col-md-5 mb-3">
//                                             <div className="form-group text-center">
//                                                 <label htmlFor="toDate" className="form-label">To Date</label>
//                                                 <div className="input-group">
//                                                     <span className="input-group-text">
//                                                         <i className="fas fa-calendar-alt"></i>
//                                                     </span>
//                                                     <input
//                                                         type="date"
//                                                         name="toDate"
//                                                         id="toDate"
//                                                         className="form-control text-center"
//                                                         value={formData.toDate}
//                                                         onChange={handleChange}
//                                                         required
//                                                     />
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>

//                                     <div className="form-group text-center mt-4">
//                                         <button 
//                                             type="submit" 
//                                             className="btn btn-primary btn-lg px-4"
//                                             disabled={submitting}
//                                         >
//                                             {submitting ? (
//                                                 <>
//                                                     <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
//                                                     Generating...
//                                                 </>
//                                             ) : (
//                                                 <>
//                                                     <i className="fas fa-eye me-2"></i> View Report
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
//         </div>
//     );
// };

// export default DailyProfit;

//------------------------------------------------end

// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import Header from '../Header';

// const DailyProfit = () => {
//     const [formData, setFormData] = useState({
//         fromDate: '',
//         toDate: ''
//     });
//     const [companyData, setCompanyData] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [submitting, setSubmitting] = useState(false);

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

//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 const response = await api.get('/api/retailer/daily-profit/sales-analysis');
//                 if (response.data.success) {
//                     const data = response.data.data;
//                     setCompanyData(data);

//                     // Set default dates from fiscal year
//                     setFormData({
//                         fromDate: data.startDate || '',
//                         toDate: data.endDate || ''
//                     });
//                 } else {
//                     setError(response.data.error || response.data.message);
//                 }
//             } catch (err) {
//                 console.error('Error fetching initial data:', err);
//                 setError(err.response?.data?.error || err.response?.data?.message || 'Failed to fetch initial data');
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchInitialData();
//     }, []);

//     const handleChange = (e) => {
//         setFormData({
//             ...formData,
//             [e.target.name]: e.target.value
//         });
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setSubmitting(true);
//         setError(null);

//         try {
//             const response = await api.post('/api/retailer/daily-profit/sales-analysis', formData);
//             if (response.data.success) {
//                 // Navigate to results page with date parameters
//                 const params = new URLSearchParams({
//                     fromDate: formData.fromDate,
//                     toDate: formData.toDate
//                 });
//                 window.location.href = `/retailer/daily-profit/sales-analysis/results?${params.toString()}`;
//             } else {
//                 setError(response.data.error || response.data.message || 'Failed to generate profit analysis');
//             }
//         } catch (err) {
//             console.error('Error submitting form:', err);
//             setError(err.response?.data?.error || err.response?.data?.message || 'Failed to generate profit analysis');
//         } finally {
//             setSubmitting(false);
//         }
//     };

//     if (loading) {
//         return (
//             <div className="container-fluid">
//                 <Header />
//                 <div className="container">
//                     <div className="row justify-content-center">
//                         <div className="col-md-8 col-lg-6">
//                             <div className="text-center py-5">
//                                 <div className="spinner-border text-primary" role="status">
//                                     <span className="visually-hidden">Loading...</span>
//                                 </div>
//                                 <p className="mt-3">Loading profit analysis form...</p>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <div className="container-fluid">
//                 <Header />
//                 <div className="container">
//                     <div className="row justify-content-center">
//                         <div className="col-md-8 col-lg-6">
//                             <div className="alert alert-danger mt-4" role="alert">
//                                 <i className="fas fa-exclamation-triangle me-2"></i>
//                                 {error}
//                             </div>
//                             <button
//                                 className="btn btn-secondary mt-2"
//                                 onClick={() => window.location.reload()}
//                             >
//                                 <i className="fas fa-redo me-2"></i> Retry
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="container">
//                 <div className="row justify-content-center">
//                     <div className="col-md-8 col-lg-6">
//                         <div className="card shadow-lg mt-4 animate__animated animate__fadeInUp">
//                             <div className="card-header bg-primary text-white text-center">
//                                 <h3 className="mb-0">
//                                     <i className="fas fa-chart-line me-2"></i> Daily Profit/Sales Analysis
//                                 </h3>
//                             </div>
//                             <div className="card-body">
//                                 <section className="content-header text-center mb-4">
//                                     <h4>Select Date Range</h4>
//                                     {companyData?.currentFiscalYear && (
//                                         <p className="text-muted small">
//                                             Fiscal Year: {companyData.currentFiscalYear.name}
//                                         </p>
//                                     )}
//                                 </section>

//                                 <form onSubmit={handleSubmit}>
//                                     <div className="row justify-content-center">
//                                         <div className="col-md-5 mb-3">
//                                             <div className="form-group">
//                                                 <label htmlFor="fromDate" className="form-label">From Date</label>
//                                                 <div className="input-group">
//                                                     <span className="input-group-text">
//                                                         <i className="fas fa-calendar-alt"></i>
//                                                     </span>
//                                                     <input
//                                                         type="date"
//                                                         name="fromDate"
//                                                         id="fromDate"
//                                                         className="form-control"
//                                                         value={formData.fromDate}
//                                                         onChange={handleChange}
//                                                         autoFocus
//                                                         required
//                                                     />
//                                                 </div>
//                                             </div>
//                                         </div>
//                                         <div className="col-md-5 mb-3">
//                                             <div className="form-group">
//                                                 <label htmlFor="toDate" className="form-label">To Date</label>
//                                                 <div className="input-group">
//                                                     <span className="input-group-text">
//                                                         <i className="fas fa-calendar-alt"></i>
//                                                     </span>
//                                                     <input
//                                                         type="date"
//                                                         name="toDate"
//                                                         id="toDate"
//                                                         className="form-control"
//                                                         value={formData.toDate}
//                                                         onChange={handleChange}
//                                                         required
//                                                     />
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>

//                                     <div className="form-group text-center mt-4">
//                                         <button
//                                             type="submit"
//                                             className="btn btn-primary btn-lg px-4"
//                                             disabled={submitting}
//                                         >
//                                             {submitting ? (
//                                                 <>
//                                                     <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
//                                                     Generating...
//                                                 </>
//                                             ) : (
//                                                 <>
//                                                     <i className="fas fa-eye me-2"></i> View Report
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
//         </div>
//     );
// };

// export default DailyProfit;

//----------------------------------------------------end

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Header from '../Header';
import NepaliDate from 'nepali-date-converter';
import '../../../stylesheet/noDateIcon.css';

const DailyProfit = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        fromDate: '',
        toDate: ''
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    
    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);

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
                    
                    if (dateFormat === 'nepali') {
                        fromDateFormatted = data.currentFiscalYear?.startDateNepali || currentNepaliDate;
                        toDateFormatted = currentNepaliDate;
                    } else {
                        fromDateFormatted = data.currentFiscalYear?.startDate 
                            ? new Date(data.currentFiscalYear.startDate).toISOString().split('T')[0]
                            : currentEnglishDate;
                        toDateFormatted = currentEnglishDate;
                    }
                    
                    setFormData({
                        fromDate: fromDateFormatted,
                        toDate: toDateFormatted
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

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        const sanitizedValue = value.replace(/[^0-9/-]/g, '');
        if (sanitizedValue.length <= 10) {
            setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
            setDateErrors(prev => ({ ...prev, [name]: '' }));
        }
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

    const validateNepaliDate = (dateStr) => {
        const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
        if (!nepaliDateFormat.test(dateStr)) {
            throw new Error("Invalid date format. Use YYYY-MM-DD");
        }

        const normalizedDateStr = dateStr.replace(/-/g, '/');
        const [year, month, day] = normalizedDateStr.split('/').map(Number);

        if (month < 1 || month > 12) {
            throw new Error("Month must be between 1-12");
        }
        if (day < 1 || day > 32) {
            throw new Error("Day must be between 1-32");
        }

        const nepaliDate = new NepaliDate(year, month - 1, day);

        if (nepaliDate.getYear() !== year || 
            nepaliDate.getMonth() + 1 !== month || 
            nepaliDate.getDate() !== day) {
            throw new Error("Invalid Nepali date");
        }

        return nepaliDate.format('YYYY-MM-DD');
    };

    const validateEnglishDate = (dateStr) => {
        const englishDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
        if (!englishDateFormat.test(dateStr)) {
            throw new Error("Invalid date format. Use YYYY-MM-DD");
        }

        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) {
            throw new Error("Invalid English date");
        }

        return dateObj.toISOString().split('T')[0];
    };

    const handleDateBlur = (e) => {
        const fieldName = e.target.name;
        const dateStr = e.target.value.trim();
        
        if (!dateStr) {
            setDateErrors(prev => ({ ...prev, [fieldName]: '' }));
            return;
        }

        try {
            let correctedDate;
            if (company.dateFormat === 'nepali') {
                correctedDate = validateNepaliDate(dateStr);
            } else {
                correctedDate = validateEnglishDate(dateStr);
            }
            
            setFormData(prev => ({ ...prev, [fieldName]: correctedDate }));
            setDateErrors(prev => ({ ...prev, [fieldName]: '' }));
        } catch (error) {
            const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
            const correctedDate = company.dateFormat === 'nepali'
                ? currentDate.format('YYYY-MM-DD')
                : currentDate.toISOString().split('T')[0];
            
            setFormData(prev => ({ ...prev, [fieldName]: correctedDate }));
            setDateErrors(prev => ({ ...prev, [fieldName]: error.message }));
            
            // Show notification (you can implement this later)
            console.warn(error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate both dates before submitting
        if (!formData.fromDate || !formData.toDate) {
            setError('Please select both from and to dates');
            return;
        }
        
        setSubmitting(true);
        setError(null);
        
        try {
            // Convert dates to proper format for API if needed
            let fromDateToSend = formData.fromDate;
            let toDateToSend = formData.toDate;
            
            // If using Nepali format, you might need to convert to English for API
            // or send as is - depends on your backend
            const response = await api.post('/api/retailer/daily-profit/sales-analysis', {
                fromDate: fromDateToSend,
                toDate: toDateToSend
            });
            
            if (response.data.success) {
                // Navigate to results page with date parameters
                const params = new URLSearchParams({
                    fromDate: formData.fromDate,
                    toDate: formData.toDate
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
                    <div className="col-md-8 col-lg-6">
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
                                    <div className="row justify-content-center">
                                        {/* From Date Field */}
                                        <div className="col-md-5 mb-3">
                                            <div className="position-relative">
                                                <input
                                                    type="text"
                                                    name="fromDate"
                                                    id="fromDate"
                                                    ref={fromDateRef}
                                                    className={`form-control no-date-icon ${dateErrors.fromDate ? 'is-invalid' : ''}`}
                                                    value={formData.fromDate}
                                                    onChange={handleDateChange}
                                                    onKeyDown={(e) => handleKeyDown(e, 'toDate')}
                                                    onBlur={handleDateBlur}
                                                    placeholder={isNepaliFormat ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                                                    required
                                                    autoComplete="off"
                                                    style={{
                                                        height: '38px',
                                                        fontSize: '0.9rem',
                                                        paddingTop: '0.75rem'
                                                    }}
                                                />
                                                <label
                                                    className="position-absolute"
                                                    style={{
                                                        top: '-0.5rem',
                                                        left: '0.75rem',
                                                        fontSize: '0.75rem',
                                                        backgroundColor: 'white',
                                                        padding: '0 0.25rem',
                                                        color: '#6c757d',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    From Date: <span className="text-danger">*</span>
                                                </label>
                                                {dateErrors.fromDate && (
                                                    <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                                        {dateErrors.fromDate}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* To Date Field */}
                                        <div className="col-md-5 mb-3">
                                            <div className="position-relative">
                                                <input
                                                    type="text"
                                                    name="toDate"
                                                    id="toDate"
                                                    ref={toDateRef}
                                                    className={`form-control no-date-icon ${dateErrors.toDate ? 'is-invalid' : ''}`}
                                                    value={formData.toDate}
                                                    onChange={handleDateChange}
                                                    onKeyDown={(e) => handleKeyDown(e, 'submitBtn')}
                                                    onBlur={handleDateBlur}
                                                    placeholder={isNepaliFormat ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                                                    required
                                                    autoComplete="off"
                                                    style={{
                                                        height: '38px',
                                                        fontSize: '0.9rem',
                                                        paddingTop: '0.75rem'
                                                    }}
                                                />
                                                <label
                                                    className="position-absolute"
                                                    style={{
                                                        top: '-0.5rem',
                                                        left: '0.75rem',
                                                        fontSize: '0.75rem',
                                                        backgroundColor: 'white',
                                                        padding: '0 0.25rem',
                                                        color: '#6c757d',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    To Date: <span className="text-danger">*</span>
                                                </label>
                                                {dateErrors.toDate && (
                                                    <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                                        {dateErrors.toDate}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group text-center mt-4">
                                        <button 
                                            type="submit" 
                                            id="submitBtn"
                                            className="btn btn-primary btn-lg px-4"
                                            disabled={submitting}
                                        >
                                            {submitting ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-eye me-2"></i> View Report
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
        </div>
    );
};

export default DailyProfit;