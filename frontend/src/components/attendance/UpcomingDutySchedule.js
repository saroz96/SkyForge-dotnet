// import React, { useState, useEffect } from 'react';
// import { Card, Spinner, Alert, Badge, Table } from 'react-bootstrap';
// import { FaCalendar, FaMapMarkerAlt, FaClock, FaCalendarDay, FaCalendarTimes, FaInfoCircle } from 'react-icons/fa';
// import axios from 'axios';

// // Create axios instance with auth interceptor (matching your existing pattern)
// const api = axios.create({
//     baseURL: process.env.REACT_APP_API_BASE_URL,
//     withCredentials: true,
// });

// api.interceptors.request.use(
//     (config) => {
//         const token = localStorage.getItem('token');
//         if (token) {
//             config.headers.Authorization = `Bearer ${token}`;
//         }
//         return config;
//     },
//     (error) => Promise.reject(error)
// );

// // Helper to get user ID (handles both _id and Id)
// const getUserId = (user) => {
//     return user?.id || user?.Id || user?._id;
// };

// // Helper to get company ID (handles both _id and Id)
// const getCompanyId = (company) => {
//     return company?.id || company?.Id || company?._id;
// };

// const UpcomingDutySchedule = ({ user, company }) => {
//     const [todaySchedule, setTodaySchedule] = useState(null);
//     const [allSchedules, setAllSchedules] = useState([]);
//     const [upcomingWeek, setUpcomingWeek] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [loadingAll, setLoadingAll] = useState(false);
//     const [error, setError] = useState(null);
//     const [activeView, setActiveView] = useState('today');

//     // Fetch today's schedule
//     const fetchTodaySchedule = async () => {
//         const userId = getUserId(user);
//         const companyId = getCompanyId(company);
        
//         if (!userId || !companyId) {
//             setLoading(false);
//             return;
//         }

//         setLoading(true);
//         setError(null);

//         try {
//             const response = await api.get('/api/duty-schedule/check-today', {
//                 params: {
//                     userId: userId,
//                     companyId: companyId
//                 }
//             });

//             if (response.data.success && response.data.hasDuty) {
//                 setTodaySchedule(response.data.schedule);
//             } else {
//                 setTodaySchedule(null);
//             }
//         } catch (error) {
//             console.error('Error fetching today schedule:', error);
//             setError('Failed to load today\'s schedule');
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Fetch all user schedules
//     const fetchAllSchedules = async () => {
//         const userId = getUserId(user);
//         const companyId = getCompanyId(company);
        
//         if (!userId || !companyId) {
//             setLoadingAll(false);
//             return;
//         }

//         setLoadingAll(true);
//         try {
//             const response = await api.get(`/api/duty-schedule/user/${userId}`, {
//                 params: {
//                     companyId: companyId,
//                     activeOnly: true
//                 }
//             });

//             if (response.data.success) {
//                 setAllSchedules(response.data.data || []);
//             } else {
//                 setAllSchedules([]);
//             }
//         } catch (error) {
//             console.error('Error fetching all schedules:', error);
//             setAllSchedules([]);
//         } finally {
//             setLoadingAll(false);
//         }
//     };

//     // Fetch upcoming week
//     const fetchUpcomingWeek = async () => {
//         const userId = getUserId(user);
//         const companyId = getCompanyId(company);
        
//         if (!userId || !companyId) {
//             return;
//         }

//         try {
//             const response = await api.get('/api/duty-schedule/upcoming-week', {
//                 params: {
//                     userId: userId,
//                     companyId: companyId
//                 }
//             });

//             if (response.data.success) {
//                 setUpcomingWeek(response.data.data || []);
//             } else {
//                 setUpcomingWeek([]);
//             }
//         } catch (error) {
//             console.error('Error fetching upcoming week:', error);
//             setUpcomingWeek([]);
//         }
//     };

//     useEffect(() => {
//         const initialize = async () => {
//             await Promise.all([
//                 fetchTodaySchedule(),
//                 fetchAllSchedules(),
//                 fetchUpcomingWeek()
//             ]);
//         };

//         initialize();

//         // Refresh every 5 minutes
//         const interval = setInterval(initialize, 300000);
//         return () => clearInterval(interval);
//     }, [user, company]);

//     const formatTime = (timeString) => {
//         if (!timeString) return '';
//         const [hours, minutes] = timeString.split(':');
//         const hour = parseInt(hours);
//         const ampm = hour >= 12 ? 'PM' : 'AM';
//         const hour12 = hour % 12 || 12;
//         return `${hour12}:${minutes} ${ampm}`;
//     };

//     const formatDate = (dateString) => {
//         if (!dateString) return '';
//         const date = new Date(dateString);
//         return date.toLocaleDateString('en-US', {
//             weekday: 'short',
//             month: 'short',
//             day: 'numeric',
//             year: 'numeric'
//         });
//     };

//     const formatShortDate = (dateString) => {
//         if (!dateString) return '';
//         const date = new Date(dateString);
//         return date.toLocaleDateString('en-US', {
//             month: 'short',
//             day: 'numeric'
//         });
//     };

//     const getScheduleTypeText = (schedule) => {
//         if (schedule.scheduleType === 'specific') {
//             return `${schedule.specificDates?.length || 0} specific date(s)`;
//         } else if (schedule.scheduleType === 'recurring') {
//             if (schedule.recurringPattern === 'daily') {
//                 return 'Daily';
//             } else if (schedule.recurringPattern === 'weekly') {
//                 return 'Weekly';
//             } else if (schedule.recurringPattern === 'monthly') {
//                 return 'Monthly';
//             }
//         }
//         return schedule.scheduleType;
//     };

//     const renderTodayView = () => {
//         if (loading) {
//             return (
//                 <div className="text-center py-4">
//                     <Spinner animation="border" size="sm" variant="primary" />
//                     <p className="mt-2 mb-0 small text-muted">Loading today's schedule...</p>
//                 </div>
//             );
//         }

//         if (error) {
//             return (
//                 <Alert variant="warning" className="mb-3">
//                     <small>{error}</small>
//                 </Alert>
//             );
//         }

//         if (!todaySchedule) {
//             return (
//                 <div className="text-center py-4">
//                     <FaCalendarDay className="text-muted mb-2" size={32} />
//                     <h6>No Duty Today</h6>
//                     <p className="text-muted small mb-0">
//                         You don't have any duty schedule assigned for today
//                     </p>
//                 </div>
//             );
//         }

//         return (
//             <div className="today-schedule-details">
//                 <div className="mb-3">
//                     <small className="text-muted d-block">Schedule Type</small>
//                     <div className="fw-semibold">
//                         {getScheduleTypeText(todaySchedule)}
//                     </div>
//                 </div>
                
//                 <div className="mb-3">
//                     <small className="text-muted d-block">Duty Hours</small>
//                     <div className="fw-semibold">
//                         {formatTime(todaySchedule.dutyHours.startTime)} - {formatTime(todaySchedule.dutyHours.endTime)}
//                     </div>
//                     <small className="text-muted">
//                         {todaySchedule.dutyHours.gracePeriod}m grace period
//                     </small>
//                 </div>
                
//                 {todaySchedule.officeLocation && (
//                     <div className="mb-3">
//                         <small className="text-muted d-block">Office Location</small>
//                         <div className="fw-semibold d-flex align-items-center">
//                             <FaMapMarkerAlt className="me-2 text-info" size={12} />
//                             {todaySchedule.officeLocation.name}
//                         </div>
//                         <small className="text-muted d-block">
//                             {todaySchedule.officeLocation.address}
//                         </small>
//                     </div>
//                 )}
                
//                 <div className="mb-3">
//                     <small className="text-muted d-block">Schedule Period</small>
//                     <div className="fw-semibold">
//                         {formatDate(todaySchedule.startDate)}
//                         {todaySchedule.endDate ? (
//                             <> to {formatDate(todaySchedule.endDate)}</>
//                         ) : (
//                             ' (No end date)'
//                         )}
//                     </div>
//                 </div>
                
//                 {todaySchedule.notes && (
//                     <Alert variant="info" className="small py-2 mt-3">
//                         <small>
//                             <FaInfoCircle className="me-1" />
//                             {todaySchedule.notes}
//                         </small>
//                     </Alert>
//                 )}
//             </div>
//         );
//     };

//     const renderAllSchedulesView = () => {
//         if (loadingAll) {
//             return (
//                 <div className="text-center py-4">
//                     <Spinner animation="border" size="sm" variant="primary" />
//                     <p className="mt-2 mb-0 small text-muted">Loading all schedules...</p>
//                 </div>
//             );
//         }

//         if (allSchedules.length === 0) {
//             return (
//                 <div className="text-center py-4">
//                     <FaCalendar className="text-muted mb-2" size={32} />
//                     <h6>No Duty Schedules</h6>
//                     <p className="text-muted small mb-0">
//                         You don't have any upcoming duty schedules
//                     </p>
//                 </div>
//             );
//         }

//         return (
//             <div className="all-schedules-list">
//                 <div className="table-responsive">
//                     <Table hover size="sm" className="mb-0">
//                         <thead>
//                             <tr>
//                                 <th>Schedule</th>
//                                 <th>Hours</th>
//                                 <th>Period</th>
//                                 <th>Location</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {allSchedules.map((schedule, index) => (
//                                 <tr key={schedule._id || schedule.id || index}>
//                                     <td>
//                                         <div className="fw-medium">
//                                             {getScheduleTypeText(schedule)}
//                                         </div>
//                                         <small className="text-muted">
//                                             {schedule.isActive ? 'Active' : 'Inactive'}
//                                         </small>
//                                     </td>
//                                     <td>
//                                         <div className="fw-medium">
//                                             {formatTime(schedule.dutyHours.startTime)} - {formatTime(schedule.dutyHours.endTime)}
//                                         </div>
//                                         <small className="text-muted">
//                                             {schedule.dutyHours.gracePeriod}m grace
//                                         </small>
//                                     </td>
//                                     <td>
//                                         <div className="small">
//                                             <div className="fw-medium">
//                                                 {formatShortDate(schedule.startDate)}
//                                             </div>
//                                             {schedule.endDate ? (
//                                                 <small className="text-muted">
//                                                     to {formatShortDate(schedule.endDate)}
//                                                 </small>
//                                             ) : (
//                                                 <small className="text-muted">No end date</small>
//                                             )}
//                                         </div>
//                                     </td>
//                                     <td>
//                                         {schedule.officeLocation ? (
//                                             <div className="d-flex align-items-center">
//                                                 <FaMapMarkerAlt className="me-1 text-info" size={10} />
//                                                 <span className="text-truncate" style={{ maxWidth: '80px' }}>
//                                                     {schedule.officeLocation.name}
//                                                 </span>
//                                             </div>
//                                         ) : (
//                                             <span className="text-muted small">Any Office</span>
//                                         )}
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </Table>
//                 </div>
//             </div>
//         );
//     };

//     const renderUpcomingWeekView = () => {
//         if (upcomingWeek.length === 0) {
//             return (
//                 <div className="text-center py-3">
//                     <FaCalendar className="text-muted mb-2" size={24} />
//                     <p className="mb-0 text-muted small">No schedule for upcoming week</p>
//                 </div>
//             );
//         }

//         return (
//             <div className="upcoming-week-timeline">
//                 {upcomingWeek.map((day, index) => (
//                     <div key={index} className="timeline-item d-flex mb-2">
//                         <div className="timeline-marker me-3">
//                             <div className={`bg-${day.hasSchedule ? 'primary' : 'light'} rounded-circle d-flex align-items-center justify-content-center`}
//                                 style={{ width: '32px', height: '32px' }}>
//                                 {day.hasSchedule ? (
//                                     <FaCalendarDay className="text-white" size={12} />
//                                 ) : (
//                                     <FaCalendarTimes className="text-muted" size={12} />
//                                 )}
//                             </div>
//                         </div>
//                         <div className="timeline-content flex-grow-1">
//                             <div className="d-flex justify-content-between align-items-center">
//                                 <div>
//                                     <h6 className="mb-0" style={{ fontSize: '0.9rem' }}>{day.dayName}</h6>
//                                     <small className="text-muted">{formatShortDate(day.date)}</small>
//                                 </div>
//                                 <div>
//                                     {day.hasSchedule ? (
//                                         <Badge bg="success" className="px-2" style={{ fontSize: '0.7rem' }}>
//                                             {formatTime(day.schedule?.dutyHours?.startTime || '09:00')}
//                                         </Badge>
//                                     ) : (
//                                         <Badge bg="secondary" className="px-2" style={{ fontSize: '0.7rem' }}>Off</Badge>
//                                     )}
//                                 </div>
//                             </div>
//                             {day.hasSchedule && day.schedule && (
//                                 <div className="mt-1">
//                                     <div className="d-flex align-items-center">
//                                         <small className="text-muted me-1">Hours:</small>
//                                         <span className="fw-medium small">
//                                             {formatTime(day.schedule.dutyHours.startTime)} - {formatTime(day.schedule.dutyHours.endTime)}
//                                         </span>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         );
//     };

//     if (loading && loadingAll) {
//         return (
//             <Card className="mt-4">
//                 <Card.Header className="bg-light">
//                     <h6 className="mb-0 d-flex align-items-center">
//                         <FaCalendar className="me-2" />
//                         Upcoming Duty Schedules
//                     </h6>
//                 </Card.Header>
//                 <Card.Body className="text-center py-4">
//                     <Spinner animation="border" size="sm" />
//                     <p className="mt-2 mb-0 small text-muted">Loading schedules...</p>
//                 </Card.Body>
//             </Card>
//         );
//     }

//     return (
//         <Card className="mt-4">
//             <Card.Header className="bg-light">
//                 <div className="d-flex justify-content-between align-items-center">
//                     <h6 className="mb-0 d-flex align-items-center">
//                         <FaCalendar className="me-2" />
//                         My Duty Schedules
//                     </h6>
//                     <div className="btn-group btn-group-sm" role="group">
//                         <button
//                             className={`btn ${activeView === 'today' ? 'btn-primary' : 'btn-outline-secondary'}`}
//                             onClick={() => setActiveView('today')}
//                             style={{ fontSize: '0.75rem', padding: '2px 8px' }}
//                         >
//                             Today
//                         </button>
//                         <button
//                             className={`btn ${activeView === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
//                             onClick={() => setActiveView('all')}
//                             style={{ fontSize: '0.75rem', padding: '2px 8px' }}
//                         >
//                             All
//                         </button>
//                     </div>
//                 </div>
//             </Card.Header>
            
//             <Card.Body className="p-3">
//                 {activeView === 'today' ? (
//                     renderTodayView()
//                 ) : (
//                     renderAllSchedulesView()
//                 )}
//             </Card.Body>
            
//             <Card.Footer className="bg-light py-2">
//                 <small className="text-muted d-flex justify-content-between align-items-center">
//                     <span>
//                         <FaCalendar className="me-1" size={12} />
//                         {allSchedules.length} schedule{allSchedules.length !== 1 ? 's' : ''} found
//                     </span>
//                 </small>
//             </Card.Footer>
//         </Card>
//     );
// };

// export default UpcomingDutySchedule;

//-----------------------------------------------------------------------end

import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Badge, Table } from 'react-bootstrap';
import { FaCalendar, FaMapMarkerAlt, FaClock, FaCalendarDay, FaCalendarTimes, FaInfoCircle } from 'react-icons/fa';
import axios from 'axios';

// Create axios instance with auth interceptor (matching your existing pattern)
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

// Helper to get user ID (handles both _id and Id)
const getUserId = (user) => {
    return user?.id || user?.Id || user?._id;
};

// Helper to get company ID (handles both _id and Id)
const getCompanyId = (company) => {
    return company?.id || company?.Id || company?._id;
};

const UpcomingDutySchedule = ({ user, company }) => {
    const [todaySchedule, setTodaySchedule] = useState(null);
    const [allSchedules, setAllSchedules] = useState([]);
    const [upcomingWeek, setUpcomingWeek] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingAll, setLoadingAll] = useState(false);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('today');

    // Fetch today's schedule
    const fetchTodaySchedule = async () => {
        const userId = getUserId(user);
        const companyId = getCompanyId(company);
        
        if (!userId || !companyId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.get('/api/duty-schedule/check-today', {
                params: {
                    userId: userId,
                    companyId: companyId
                }
            });

            if (response.data.success && response.data.hasDuty) {
                setTodaySchedule(response.data.schedule);
            } else {
                setTodaySchedule(null);
            }
        } catch (error) {
            console.error('Error fetching today schedule:', error);
            setError('Failed to load today\'s schedule');
        } finally {
            setLoading(false);
        }
    };

    // Fetch all user schedules
    const fetchAllSchedules = async () => {
        const userId = getUserId(user);
        const companyId = getCompanyId(company);
        
        if (!userId || !companyId) {
            setLoadingAll(false);
            return;
        }

        setLoadingAll(true);
        try {
            const response = await api.get(`/api/duty-schedule/user/${userId}`, {
                params: {
                    companyId: companyId,
                    activeOnly: true
                }
            });

            if (response.data.success) {
                setAllSchedules(response.data.data || []);
            } else {
                setAllSchedules([]);
            }
        } catch (error) {
            console.error('Error fetching all schedules:', error);
            setAllSchedules([]);
        } finally {
            setLoadingAll(false);
        }
    };

    // Fetch upcoming week
    const fetchUpcomingWeek = async () => {
        const userId = getUserId(user);
        const companyId = getCompanyId(company);
        
        if (!userId || !companyId) {
            return;
        }

        try {
            const response = await api.get('/api/duty-schedule/upcoming-week', {
                params: {
                    userId: userId,
                    companyId: companyId
                }
            });

            if (response.data.success) {
                setUpcomingWeek(response.data.data || []);
            } else {
                setUpcomingWeek([]);
            }
        } catch (error) {
            console.error('Error fetching upcoming week:', error);
            setUpcomingWeek([]);
        }
    };

    useEffect(() => {
        const initialize = async () => {
            await Promise.all([
                fetchTodaySchedule(),
                fetchAllSchedules(),
                fetchUpcomingWeek()
            ]);
        };

        initialize();

        // Refresh every 5 minutes
        const interval = setInterval(initialize, 300000);
        return () => clearInterval(interval);
    }, [user, company]);

    const formatTime = (timeString) => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatShortDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const getScheduleTypeText = (schedule) => {
        if (schedule.scheduleType === 'specific') {
            return `${schedule.specificDates?.length || 0} specific date(s)`;
        } else if (schedule.scheduleType === 'recurring') {
            if (schedule.recurringPattern === 'daily') {
                return 'Daily';
            } else if (schedule.recurringPattern === 'weekly') {
                return 'Weekly';
            } else if (schedule.recurringPattern === 'monthly') {
                return 'Monthly';
            }
        }
        return schedule.scheduleType;
    };

    const renderTodayView = () => {
        if (loading) {
            return (
                <div className="text-center py-3">
                    <Spinner animation="border" size="sm" variant="primary" style={{ width: '18px', height: '18px' }} />
                    <p className="mt-1 mb-0 text-muted" style={{ fontSize: '0.7rem' }}>Loading today's schedule...</p>
                </div>
            );
        }

        if (error) {
            return (
                <Alert variant="warning" className="py-1 px-2 mb-2" style={{ fontSize: '0.7rem' }}>
                    {error}
                </Alert>
            );
        }

        if (!todaySchedule) {
            return (
                <div className="text-center py-3">
                    <FaCalendarDay className="text-muted mb-1" size={24} />
                    <h6 className="mb-0" style={{ fontSize: '0.8rem' }}>No Duty Today</h6>
                    <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>
                        You don't have any duty schedule assigned for today
                    </p>
                </div>
            );
        }

        return (
            <div className="today-schedule-details">
                <div className="d-flex justify-content-between mb-1">
                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>Schedule Type</small>
                    <span className="fw-semibold" style={{ fontSize: '0.7rem' }}>
                        {getScheduleTypeText(todaySchedule)}
                    </span>
                </div>
                
                <div className="d-flex justify-content-between mb-1">
                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>Duty Hours</small>
                    <span className="fw-semibold" style={{ fontSize: '0.7rem' }}>
                        {formatTime(todaySchedule.dutyHours.startTime)} - {formatTime(todaySchedule.dutyHours.endTime)}
                    </span>
                </div>
                <div className="text-end mb-1">
                    <small className="text-muted" style={{ fontSize: '0.6rem' }}>
                        {todaySchedule.dutyHours.gracePeriod}m grace period
                    </small>
                </div>
                
                {todaySchedule.officeLocation && (
                    <>
                        <div className="d-flex justify-content-between mb-1">
                            <small className="text-muted" style={{ fontSize: '0.65rem' }}>Office Location</small>
                            <span className="fw-semibold d-flex align-items-center" style={{ fontSize: '0.7rem' }}>
                                <FaMapMarkerAlt className="me-1 text-info" size={10} />
                                {todaySchedule.officeLocation.name}
                            </span>
                        </div>
                        {todaySchedule.officeLocation.address && (
                            <div className="text-end mb-1">
                                <small className="text-muted" style={{ fontSize: '0.6rem' }}>
                                    {todaySchedule.officeLocation.address}
                                </small>
                            </div>
                        )}
                    </>
                )}
                
                <div className="d-flex justify-content-between mb-1">
                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>Schedule Period</small>
                    <span className="fw-semibold" style={{ fontSize: '0.7rem' }}>
                        {formatShortDate(todaySchedule.startDate)}
                        {todaySchedule.endDate ? (
                            <> - {formatShortDate(todaySchedule.endDate)}</>
                        ) : (
                            ' (No end date)'
                        )}
                    </span>
                </div>
                
                {todaySchedule.notes && (
                    <Alert variant="info" className="py-1 px-2 mt-2 mb-0" style={{ fontSize: '0.65rem' }}>
                        <FaInfoCircle size={10} className="me-1" />
                        {todaySchedule.notes}
                    </Alert>
                )}
            </div>
        );
    };

    const renderAllSchedulesView = () => {
        if (loadingAll) {
            return (
                <div className="text-center py-3">
                    <Spinner animation="border" size="sm" variant="primary" style={{ width: '18px', height: '18px' }} />
                    <p className="mt-1 mb-0 text-muted" style={{ fontSize: '0.7rem' }}>Loading all schedules...</p>
                </div>
            );
        }

        if (allSchedules.length === 0) {
            return (
                <div className="text-center py-3">
                    <FaCalendar className="text-muted mb-1" size={24} />
                    <h6 className="mb-0" style={{ fontSize: '0.8rem' }}>No Duty Schedules</h6>
                    <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>
                        You don't have any upcoming duty schedules
                    </p>
                </div>
            );
        }

        return (
            <div className="all-schedules-list">
                <div className="table-responsive" style={{ maxHeight: '300px', overflow: 'auto' }}>
                    <Table hover size="sm" className="mb-0" style={{ fontSize: '0.7rem' }}>
                        <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                            <tr>
                                <th style={{ padding: '4px 6px' }}>Schedule</th>
                                <th style={{ padding: '4px 6px' }}>Hours</th>
                                <th style={{ padding: '4px 6px' }}>Period</th>
                                <th style={{ padding: '4px 6px' }}>Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allSchedules.map((schedule, index) => (
                                <tr key={schedule._id || schedule.id || index}>
                                    <td style={{ padding: '4px 6px' }}>
                                        <div className="fw-medium" style={{ fontSize: '0.65rem' }}>
                                            {getScheduleTypeText(schedule)}
                                        </div>
                                        <Badge bg={schedule.isActive ? 'success' : 'secondary'} style={{ fontSize: '0.5rem', padding: '1px 5px' }}>
                                            {schedule.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </td>
                                    <td style={{ padding: '4px 6px' }}>
                                        <div className="fw-medium" style={{ fontSize: '0.65rem' }}>
                                            {formatTime(schedule.dutyHours.startTime)} - {formatTime(schedule.dutyHours.endTime)}
                                        </div>
                                        <small className="text-muted" style={{ fontSize: '0.55rem' }}>
                                            {schedule.dutyHours.gracePeriod}m grace
                                        </small>
                                    </td>
                                    <td style={{ padding: '4px 6px' }}>
                                        <div style={{ fontSize: '0.6rem' }}>
                                            <div className="fw-medium">
                                                {formatShortDate(schedule.startDate)}
                                            </div>
                                            {schedule.endDate ? (
                                                <small className="text-muted" style={{ fontSize: '0.55rem' }}>
                                                    to {formatShortDate(schedule.endDate)}
                                                </small>
                                            ) : (
                                                <small className="text-muted" style={{ fontSize: '0.55rem' }}>No end date</small>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '4px 6px' }}>
                                        {schedule.officeLocation ? (
                                            <div className="d-flex align-items-center">
                                                <FaMapMarkerAlt className="me-1 text-info" size={9} />
                                                <span className="text-truncate" style={{ maxWidth: '70px', fontSize: '0.6rem' }}>
                                                    {schedule.officeLocation.name}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted" style={{ fontSize: '0.6rem' }}>Any Office</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            </div>
        );
    };

    const renderUpcomingWeekView = () => {
        if (upcomingWeek.length === 0) {
            return (
                <div className="text-center py-2">
                    <FaCalendar className="text-muted mb-1" size={20} />
                    <p className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>No schedule for upcoming week</p>
                </div>
            );
        }

        return (
            <div className="upcoming-week-timeline">
                {upcomingWeek.map((day, index) => (
                    <div key={index} className="d-flex align-items-center mb-1 pb-1" style={{ borderBottom: index < upcomingWeek.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                        <div className="me-2">
                            <div className={`bg-${day.hasSchedule ? 'primary' : 'light'} rounded-circle d-flex align-items-center justify-content-center`}
                                style={{ width: '24px', height: '24px' }}>
                                {day.hasSchedule ? (
                                    <FaCalendarDay className="text-white" size={10} />
                                ) : (
                                    <FaCalendarTimes className="text-muted" size={10} />
                                )}
                            </div>
                        </div>
                        <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <span className="fw-medium" style={{ fontSize: '0.7rem' }}>{day.dayName}</span>
                                    <small className="text-muted ms-1" style={{ fontSize: '0.6rem' }}>
                                        {formatShortDate(day.date)}
                                    </small>
                                </div>
                                <div>
                                    {day.hasSchedule ? (
                                        <Badge bg="success" style={{ fontSize: '0.55rem', padding: '1px 6px' }}>
                                            {formatTime(day.schedule?.dutyHours?.startTime || '09:00')}
                                        </Badge>
                                    ) : (
                                        <Badge bg="secondary" style={{ fontSize: '0.55rem', padding: '1px 6px' }}>Off</Badge>
                                    )}
                                </div>
                            </div>
                            {day.hasSchedule && day.schedule && (
                                <div className="mt-0">
                                    <small className="text-muted" style={{ fontSize: '0.55rem' }}>
                                        {formatTime(day.schedule.dutyHours.startTime)} - {formatTime(day.schedule.dutyHours.endTime)}
                                    </small>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    if (loading && loadingAll) {
        return (
            <Card className="mt-3 border-0 shadow-sm">
                <Card.Header className="bg-light py-1 px-2 d-flex align-items-center" style={{ minHeight: '34px' }}>
                    <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.8rem' }}>
                        <FaCalendar className="me-1" size={14} />
                        My Duty Schedules
                    </h6>
                </Card.Header>
                <Card.Body className="text-center py-3">
                    <Spinner animation="border" size="sm" style={{ width: '18px', height: '18px' }} />
                    <p className="mt-1 mb-0 text-muted" style={{ fontSize: '0.7rem' }}>Loading schedules...</p>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="mt-3 border-0 shadow-sm">
            <Card.Header className="bg-light py-1 px-2 d-flex justify-content-between align-items-center" style={{ minHeight: '34px' }}>
                <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.8rem' }}>
                    <FaCalendar className="me-1" size={14} />
                    My Duty Schedules
                </h6>
                <div className="btn-group btn-group-sm" role="group">
                    <button
                        className={`btn ${activeView === 'today' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setActiveView('today')}
                        style={{ fontSize: '0.6rem', padding: '1px 8px', height: '22px' }}
                    >
                        Today
                    </button>
                    <button
                        className={`btn ${activeView === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setActiveView('all')}
                        style={{ fontSize: '0.6rem', padding: '1px 8px', height: '22px' }}
                    >
                        All
                    </button>
                </div>
            </Card.Header>
            
            <Card.Body className="p-2">
                {activeView === 'today' ? (
                    renderTodayView()
                ) : (
                    renderAllSchedulesView()
                )}
            </Card.Body>
            
            <Card.Footer className="bg-light py-1 px-2 d-flex justify-content-between align-items-center" style={{ minHeight: '28px' }}>
                <small className="text-muted d-flex align-items-center" style={{ fontSize: '0.6rem' }}>
                    <FaCalendar className="me-1" size={10} />
                    {allSchedules.length} schedule{allSchedules.length !== 1 ? 's' : ''} found
                </small>
                {activeView === 'today' && upcomingWeek.length > 0 && (
                    <button
                        className="btn btn-link btn-sm p-0"
                        onClick={() => setActiveView('all')}
                        style={{ fontSize: '0.6rem', textDecoration: 'none' }}
                    >
                        View all →
                    </button>
                )}
            </Card.Footer>
        </Card>
    );
};

export default UpcomingDutySchedule;