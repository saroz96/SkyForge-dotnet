// import React, { useState, useEffect } from 'react';
// import {
//     Card,
//     Button,
//     Alert,
//     Spinner,
//     Badge,
//     Table,
//     Row,
//     Col,
//     Tabs,
//     Tab,
//     ProgressBar
// } from 'react-bootstrap';
// import {
//     FaCalendar,
//     FaMapMarkerAlt,
//     FaClock,
//     FaCalendarDay,
//     FaList,
//     FaCalendarAlt,
//     FaCalendarCheck,
//     FaCalendarWeek,
//     FaCalendarTimes,
//     FaInfoCircle,
//     FaDownload,
//     FaPrint
// } from 'react-icons/fa';
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

// const UserDutySchedules = ({ user, company }) => {
//     const [allSchedules, setAllSchedules] = useState([]);
//     const [upcomingWeek, setUpcomingWeek] = useState([]);
//     const [todaySchedule, setTodaySchedule] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [loadingAll, setLoadingAll] = useState(false);
//     const [error, setError] = useState(null);
//     const [activeView, setActiveView] = useState('list');
//     const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
//     const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
//                 const schedules = response.data.data || [];

//                 // Log for debugging
//                 console.log('Fetched schedules:', schedules);

//                 // Double-check on client side (just in case)
//                 const today = new Date();
//                 today.setHours(0, 0, 0, 0);

//                 const filteredSchedules = schedules.filter(schedule => {
//                     // For specific schedules
//                     if (schedule.scheduleType === 'specific' && schedule.specificDates) {
//                         const hasFutureDate = schedule.specificDates.some(dateStr => {
//                             const date = new Date(dateStr);
//                             date.setHours(0, 0, 0, 0);
//                             return date >= today;
//                         });

//                         if (!hasFutureDate) {
//                             console.log('Filtering out specific schedule with no future dates:', schedule);
//                             return false;
//                         }
//                         return true;
//                     }

//                     // For recurring schedules
//                     if (schedule.scheduleType === 'recurring') {
//                         // Check end date
//                         if (schedule.endDate) {
//                             const endDate = new Date(schedule.endDate);
//                             endDate.setHours(23, 59, 59, 999);
//                             if (endDate < today) {
//                                 console.log('Filtering out recurring schedule that ended:', schedule);
//                                 return false;
//                             }
//                         }

//                         // Check start date is not too far in the future? (optional)
//                         const startDate = new Date(schedule.startDate);
//                         startDate.setHours(0, 0, 0, 0);

//                         // If hasn't started yet, it's fine
//                         if (startDate >= today) {
//                             return true;
//                         }

//                         // If already started, it should have future occurrences
//                         // (backend should have filtered this, but double-check)
//                         return true;
//                     }

//                     return true;
//                 });

//                 console.log('Filtered schedules:', filteredSchedules);
//                 setAllSchedules(filteredSchedules);
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

//     const fetchTodaySchedule = async () => {
//         const userId = getUserId(user);
//         const companyId = getCompanyId(company);
        
//         if (!userId || !companyId) {
//             return;
//         }

//         try {
//             console.log('🔄 Fetching today schedule...');
//             console.log('Today:', new Date().toISOString());

//             const response = await api.get('/api/duty-schedule/check-today', {
//                 params: {
//                     userId: userId,
//                     companyId: companyId,
//                     _t: new Date().getTime() // Prevent caching
//                 }
//             });

//             console.log('Today schedule response:', response.data);

//             if (response.data.success && response.data.hasDuty) {
//                 const schedule = response.data.schedule;

//                 // Additional validation on frontend
//                 const today = new Date();
//                 today.setHours(0, 0, 0, 0);

//                 const scheduleStartDate = schedule.startDate ? new Date(schedule.startDate) : null;
//                 if (scheduleStartDate) {
//                     scheduleStartDate.setHours(0, 0, 0, 0);
//                 }

//                 // Double-check if schedule should apply today
//                 let shouldShow = true;

//                 if (schedule.scheduleType === 'specific') {
//                     // Check if any specific date matches today
//                     const hasSpecificDate = schedule.specificDates?.some(date => {
//                         const d = new Date(date);
//                         d.setHours(0, 0, 0, 0);
//                         return d.getTime() === today.getTime();
//                     }) || false;

//                     shouldShow = hasSpecificDate;
//                 }

//                 if (schedule.scheduleType === 'recurring') {
//                     // Check if schedule has started
//                     if (scheduleStartDate && today < scheduleStartDate) {
//                         shouldShow = false;
//                     }

//                     // Check recurring pattern
//                     if (shouldShow && schedule.recurringPattern === 'weekly' && schedule.weekDays) {
//                         const dayOfWeek = today.getDay();
//                         shouldShow = schedule.weekDays.includes(dayOfWeek);
//                     }

//                     if (shouldShow && schedule.recurringPattern === 'monthly' && schedule.monthDays) {
//                         const dayOfMonth = today.getDate();
//                         shouldShow = schedule.monthDays.includes(dayOfMonth);
//                     }
//                 }

//                 if (shouldShow) {
//                     console.log('✅ Valid today schedule found');
//                     setTodaySchedule(schedule);
//                 } else {
//                     console.log('❌ Schedule does not apply to today (frontend validation failed)');
//                     setTodaySchedule(null);
//                 }
//             } else {
//                 console.log('❌ No duty schedule for today');
//                 setTodaySchedule(null);
//             }
//         } catch (error) {
//             console.error('❌ Error fetching today schedule:', error);
//             setTodaySchedule(null);
//         }
//     };

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
//             setLoading(true);
//             await Promise.all([
//                 fetchAllSchedules(),
//                 fetchTodaySchedule(),
//                 fetchUpcomingWeek()
//             ]);
//             setLoading(false);
//         };

//         initialize();
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
//             weekday: 'long',
//             month: 'long',
//             day: 'numeric',
//             year: 'numeric'
//         });
//     };

//     const formatShortDate = (dateString) => {
//         if (!dateString) return '';
//         const date = new Date(dateString);
//         return date.toLocaleDateString('en-US', {
//             month: 'short',
//             day: 'numeric',
//             year: 'numeric'
//         });
//     };

//     const getScheduleTypeText = (schedule) => {
//         if (schedule.scheduleType === 'specific') {
//             return `${schedule.specificDates?.length || 0} specific date(s)`;
//         } else if (schedule.scheduleType === 'recurring') {
//             if (schedule.recurringPattern === 'daily') {
//                 return 'Daily';
//             } else if (schedule.recurringPattern === 'weekly') {
//                 const days = schedule.weekDays?.map(day => {
//                     const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//                     return dayNames[day];
//                 }).join(', ');
//                 return `Weekly (${days})`;
//             } else if (schedule.recurringPattern === 'monthly') {
//                 return `Monthly (Days: ${schedule.monthDays?.join(', ')})`;
//             }
//         }
//         return schedule.scheduleType;
//     };

//     const getScheduleStatus = (schedule) => {
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);

//         // For specific date schedules
//         if (schedule.scheduleType === 'specific' && schedule.specificDates) {
//             // Find the next future specific date
//             const futureDates = schedule.specificDates
//                 .map(date => new Date(date))
//                 .filter(date => {
//                     date.setHours(0, 0, 0, 0);
//                     return date >= today;
//                 })
//                 .sort((a, b) => a - b);

//             if (futureDates.length === 0) {
//                 // This shouldn't happen if backend filtered correctly
//                 return { text: 'No Future Dates', variant: 'secondary' };
//             }

//             const nextDate = futureDates[0];
//             const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

//             if (daysDiff === 0) {
//                 return { text: 'Ongoing', variant: 'primary' };
//             } else if (daysDiff === 1) {
//                 return { text: 'Tomorrow', variant: 'info' };
//             } else {
//                 return { text: `In ${daysDiff} days`, variant: 'info' };
//             }
//         }

//         // For recurring schedules
//         const startDate = new Date(schedule.startDate);
//         startDate.setHours(0, 0, 0, 0);

//         // Check if schedule applies to today
//         const scheduleAppliesToday = checkScheduleAppliesToDate(schedule, today);

//         if (scheduleAppliesToday) {
//             return { text: 'Ongoing', variant: 'primary' };
//         }

//         // Check if starts in the future
//         if (startDate > today) {
//             const daysDiff = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
//             if (daysDiff === 1) {
//                 return { text: 'Starts Tomorrow', variant: 'info' };
//             }
//             return { text: `Starts in ${daysDiff} days`, variant: 'info' };
//         }

//         // Check if schedule ended
//         if (schedule.endDate) {
//             const endDate = new Date(schedule.endDate);
//             endDate.setHours(23, 59, 59, 999);
//             if (endDate < today) {
//                 // This shouldn't happen if backend filtered correctly
//                 return { text: 'Ended', variant: 'secondary' };
//             }
//         }

//         // For recurring schedules that started in the past and have future occurrences
//         return { text: 'Success', variant: 'success' };
//     };

//     const checkScheduleAppliesToDate = (schedule, checkDate) => {
//         const date = new Date(checkDate);
//         date.setHours(0, 0, 0, 0);

//         // For specific schedules
//         if (schedule.scheduleType === 'specific' && schedule.specificDates) {
//             return schedule.specificDates.some(specificDate => {
//                 const d = new Date(specificDate);
//                 d.setHours(0, 0, 0, 0);
//                 return d.getTime() === date.getTime();
//             });
//         }

//         // For recurring schedules
//         if (schedule.scheduleType === 'recurring') {
//             // Check date range
//             const startDate = new Date(schedule.startDate);
//             startDate.setHours(0, 0, 0, 0);

//             // If date is before start date
//             if (date < startDate) return false;

//             // Check if schedule has an end date
//             if (schedule.endDate) {
//                 const endDate = new Date(schedule.endDate);
//                 endDate.setHours(23, 59, 59, 999);
//                 if (date > endDate) return false;
//             }

//             // Check based on recurring pattern
//             if (schedule.recurringPattern === 'daily') {
//                 return true;
//             } else if (schedule.recurringPattern === 'weekly') {
//                 const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
//                 return schedule.weekDays?.includes(dayOfWeek) || false;
//             } else if (schedule.recurringPattern === 'monthly') {
//                 const dayOfMonth = date.getDate(); // 1-31
//                 return schedule.monthDays?.includes(dayOfMonth) || false;
//             }
//         }

//         return false;
//     };

//     const renderTodayScheduleCard = () => {
//         if (!todaySchedule) {
//             return (
//                 <Card className="mb-4 border-secondary">
//                     <Card.Header className="bg-light">
//                         <h6 className="mb-0 d-flex align-items-center">
//                             <FaCalendarDay className="me-2" />
//                             Today's Schedule
//                         </h6>
//                     </Card.Header>
//                     <Card.Body className="text-center py-4">
//                         <FaCalendarTimes className="text-muted mb-2" size={32} />
//                         <h6>No Duty Today</h6>
//                         <p className="text-muted small mb-0">
//                             You don't have any duty schedule assigned for today
//                         </p>
//                     </Card.Body>
//                 </Card>
//             );
//         }

//         return (
//             <Card className="mb-4 border-primary">
//                 <Card.Header className="bg-primary bg-opacity-10 text-primary border-primary">
//                     <h6 className="mb-0 d-flex align-items-center">
//                         <FaCalendarDay className="me-2" />
//                         Today's Duty Schedule
//                     </h6>
//                 </Card.Header>
//                 <Card.Body>
//                     <Row>
//                         <Col md={6}>
//                             <div className="mb-3">
//                                 <small className="text-muted d-block">Schedule Type</small>
//                                 <div className="fw-semibold">
//                                     {getScheduleTypeText(todaySchedule)}
//                                 </div>
//                             </div>
//                             <div className="mb-3">
//                                 <small className="text-muted d-block">Duty Hours</small>
//                                 <div className="fw-semibold">
//                                     {formatTime(todaySchedule.dutyHours.startTime)} - {formatTime(todaySchedule.dutyHours.endTime)}
//                                 </div>
//                                 <small className="text-muted">
//                                     {todaySchedule.dutyHours.gracePeriod}m grace period • {todaySchedule.dutyHours.breakDuration}m break
//                                 </small>
//                                 <div className="mb-3">
//                                     <small className="text-muted d-block">Schedule Period</small>
//                                     <div className="fw-semibold">
//                                         {formatDate(todaySchedule.startDate)}
//                                         {todaySchedule.endDate ? (
//                                             <> to {formatDate(todaySchedule.endDate)}</>
//                                         ) : (
//                                             ' (No end date)'
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>
//                         </Col>
//                         <Col md={6}>
//                             {todaySchedule.officeLocation && (
//                                 <div className="mb-3">
//                                     <small className="text-muted d-block">Office Location</small>
//                                     <div className="fw-semibold d-flex align-items-center">
//                                         <FaMapMarkerAlt className="me-2 text-info" size={12} />
//                                         {todaySchedule.officeLocation.name}
//                                     </div>
//                                     <small className="text-muted d-block">
//                                         {todaySchedule.officeLocation.address}
//                                     </small>
//                                 </div>
//                             )}
//                         </Col>
//                     </Row>

//                     {todaySchedule.notes && (
//                         <Alert variant="info" className="mt-3 mb-0">
//                             <FaInfoCircle className="me-2" />
//                             {todaySchedule.notes}
//                         </Alert>
//                     )}
//                 </Card.Body>
//             </Card>
//         );
//     };

//     const renderListView = () => {
//         if (loadingAll) {
//             return (
//                 <div className="text-center py-5">
//                     <Spinner animation="border" variant="primary" />
//                     <p className="mt-2 text-muted">Loading your schedules...</p>
//                 </div>
//             );
//         }

//         if (allSchedules.length === 0) {
//             return (
//                 <div className="text-center py-5">
//                     <FaCalendarAlt className="text-muted mb-3" size={48} />
//                     <h5>No Duty Schedules Found</h5>
//                     <p className="text-muted">You don't have any upcoming duty schedules.</p>
//                     <p className="text-muted small">Contact your supervisor for schedule information.</p>
//                 </div>
//             );
//         }

//         return (
//             <div className="table-responsive">
//                 <Table hover className="align-middle">
//                     <thead className="bg-light">
//                         <tr>
//                             <th>Schedule Type</th>
//                             <th>Duty Hours</th>
//                             <th>Office Location</th>
//                             <th>Period</th>
//                             <th>Status</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {allSchedules.map((schedule) => {
//                             const status = getScheduleStatus(schedule);
//                             const scheduleId = schedule._id || schedule.id;
                            
//                             return (
//                                 <tr key={scheduleId}>
//                                     <td>
//                                         <div className="d-flex align-items-center">
//                                             <FaCalendar className="me-2 text-primary" size={14} />
//                                             <div>
//                                                 <div className="fw-medium">
//                                                     {getScheduleTypeText(schedule)}
//                                                 </div>
//                                                 <small className="text-muted">
//                                                     {schedule.scheduleType === 'recurring' ? 'Recurring' : 'Specific'}
//                                                 </small>
//                                             </div>
//                                         </div>
//                                     </td>
//                                     <td>
//                                         <div className="d-flex align-items-center">
//                                             <FaClock className="me-2 text-muted" size={14} />
//                                             <div>
//                                                 <div className="fw-medium">
//                                                     {formatTime(schedule.dutyHours.startTime)} - {formatTime(schedule.dutyHours.endTime)}
//                                                 </div>
//                                                 <small className="text-muted d-block">
//                                                     {schedule.dutyHours.gracePeriod}m grace
//                                                 </small>
//                                             </div>
//                                         </div>
//                                     </td>
//                                     <td>
//                                         {schedule.officeLocation ? (
//                                             <div className="d-flex align-items-center">
//                                                 <FaMapMarkerAlt className="me-2 text-info" size={14} />
//                                                 <div>
//                                                     <div className="fw-medium">
//                                                         {schedule.officeLocation.name}
//                                                     </div>
//                                                     <small className="text-muted d-block text-truncate" style={{ maxWidth: '150px' }}>
//                                                         {schedule.officeLocation.address}
//                                                     </small>
//                                                 </div>
//                                             </div>
//                                         ) : (
//                                             <span className="text-muted">Any Office</span>
//                                         )}
//                                     </td>
//                                     <td>
//                                         <div>
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
//                                         <Badge
//                                             bg={status.variant}
//                                             className="px-3 py-2"
//                                         >
//                                             {status.text}
//                                         </Badge>
//                                     </td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                 </Table>
//             </div>
//         );
//     };

//     const renderWeekView = () => {
//         if (upcomingWeek.length === 0) {
//             return (
//                 <div className="text-center py-5">
//                     <FaCalendarWeek className="text-muted mb-3" size={48} />
//                     <h5>No Schedule for Upcoming Week</h5>
//                     <p className="text-muted">You don't have any duty schedules for the next 7 days.</p>
//                 </div>
//             );
//         }

//         return (
//             <div className="week-timeline">
//                 {upcomingWeek.map((day, index) => (
//                     <Card key={index} className={`mb-3 ${day.hasSchedule ? 'border-primary' : 'border-secondary'}`}>
//                         <Card.Header className={`bg-${day.hasSchedule ? 'primary' : 'light'} bg-opacity-10`}>
//                             <div className="d-flex justify-content-between align-items-center">
//                                 <div>
//                                     <h6 className="mb-0">{day.dayName}</h6>
//                                     <small className="text-muted">{formatShortDate(day.date)}</small>
//                                 </div>
//                                 <div>
//                                     {day.hasSchedule ? (
//                                         <Badge bg="success" className="px-3">
//                                             <FaClock className="me-1" />
//                                             Duty Day
//                                         </Badge>
//                                     ) : (
//                                         <Badge bg="secondary" className="px-3">
//                                             <FaCalendarTimes className="me-1" />
//                                             Off Day
//                                         </Badge>
//                                     )}
//                                 </div>
//                             </div>
//                         </Card.Header>
//                         {day.hasSchedule && day.schedule && (
//                             <Card.Body>
//                                 <Row>
//                                     <Col md={6}>
//                                         <div className="mb-2">
//                                             <small className="text-muted">Duty Hours:</small>
//                                             <div className="fw-semibold">
//                                                 {formatTime(day.schedule.dutyHours.startTime)} - {formatTime(day.schedule.dutyHours.endTime)}
//                                             </div>
//                                         </div>
//                                         <div className="mb-2">
//                                             <small className="text-muted">Grace Period:</small>
//                                             <div>{day.schedule.dutyHours.gracePeriod} minutes</div>
//                                         </div>
//                                     </Col>
//                                     <Col md={6}>
//                                         {day.schedule.officeLocation && (
//                                             <div>
//                                                 <small className="text-muted">Office Location:</small>
//                                                 <div className="d-flex align-items-center mt-1">
//                                                     <FaMapMarkerAlt className="me-2 text-info" size={12} />
//                                                     <div>
//                                                         <div className="fw-medium">
//                                                             {day.schedule.officeLocation.name}
//                                                         </div>
//                                                         <small className="text-muted">
//                                                             {day.schedule.officeLocation.address}
//                                                         </small>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         )}
//                                     </Col>
//                                 </Row>
//                             </Card.Body>
//                         )}
//                     </Card>
//                 ))}
//             </div>
//         );
//     };

//     const renderSummary = () => {
//         if (allSchedules.length === 0) return null;

//         const today = new Date();
//         const upcomingSchedules = allSchedules.filter(schedule => {
//             const endDate = schedule.endDate ? new Date(schedule.endDate) : null;
//             return !endDate || endDate >= today;
//         });

//         const activeSchedules = allSchedules.filter(schedule => {
//             const startDate = new Date(schedule.startDate);
//             const endDate = schedule.endDate ? new Date(schedule.endDate) : null;
//             return startDate <= today && (!endDate || endDate >= today);
//         });

//         return (
//             <Card className="mb-4">
//                 <Card.Header className="bg-light">
//                     <h6 className="mb-0 d-flex align-items-center">
//                         <FaInfoCircle className="me-2" />
//                         Schedule Summary
//                     </h6>
//                 </Card.Header>
//                 <Card.Body>
//                     <Row>
//                         <Col md={4} className="text-center">
//                             <div className="display-4 fw-bold text-primary">
//                                 {allSchedules.length}
//                             </div>
//                             <div className="text-muted">Total Schedules</div>
//                         </Col>
//                         <Col md={4} className="text-center">
//                             <div className="display-4 fw-bold text-success">
//                                 {activeSchedules.length}
//                             </div>
//                             <div className="text-muted">Active Schedules</div>
//                         </Col>
//                         <Col md={4} className="text-center">
//                             <div className="display-4 fw-bold text-info">
//                                 {upcomingSchedules.length}
//                             </div>
//                             <div className="text-muted">Upcoming Schedules</div>
//                         </Col>
//                     </Row>
//                 </Card.Body>
//             </Card>
//         );
//     };

//     if (loading) {
//         return (
//             <div className="text-center py-5">
//                 <Spinner animation="border" variant="primary" />
//                 <p className="mt-2 text-muted">Loading your duty schedules...</p>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <Alert variant="danger">
//                 <FaInfoCircle className="me-2" />
//                 {error}
//             </Alert>
//         );
//     }

//     return (
//         <div className="user-duty-schedules">
//             {/* Today's Schedule */}
//             {renderTodayScheduleCard()}

//             {/* Summary */}
//             {renderSummary()}

//             {/* View Tabs */}
//             <Card className="mb-4">
//                 <Card.Header className="bg-light">
//                     <div className="d-flex justify-content-between align-items-center">
//                         <h6 className="mb-0 d-flex align-items-center">
//                             <FaCalendarCheck className="me-2" />
//                             All Upcoming Schedules
//                         </h6>
//                         <div className="btn-group btn-group-sm" role="group">
//                             <Button
//                                 variant={activeView === 'list' ? 'primary' : 'outline-secondary'}
//                                 size="sm"
//                                 onClick={() => setActiveView('list')}
//                                 className="d-flex align-items-center"
//                             >
//                                 <FaList className="me-1" /> List
//                             </Button>
//                             <Button
//                                 variant={activeView === 'week' ? 'primary' : 'outline-secondary'}
//                                 size="sm"
//                                 onClick={() => setActiveView('week')}
//                                 className="d-flex align-items-center"
//                             >
//                                 <FaCalendarWeek className="me-1" /> Week View
//                             </Button>
//                         </div>
//                     </div>
//                 </Card.Header>
//                 <Card.Body>
//                     {activeView === 'list' ? renderListView() : renderWeekView()}
//                 </Card.Body>
//                 <Card.Footer className="bg-light">
//                     <div className="d-flex justify-content-between align-items-center">
//                         <small className="text-muted">
//                             Showing {allSchedules.length} schedule{allSchedules.length !== 1 ? 's' : ''}
//                         </small>
//                         <div>
//                             <Button variant="outline-primary" size="sm" className="me-2">
//                                 <FaDownload className="me-1" /> Export
//                             </Button>
//                             <Button variant="outline-secondary" size="sm">
//                                 <FaPrint className="me-1" /> Print
//                             </Button>
//                         </div>
//                     </div>
//                 </Card.Footer>
//             </Card>

//             {/* Help/Info Section */}
//             <Alert variant="info" className="mt-4">
//                 <div className="d-flex">
//                     <FaInfoCircle className="me-3 mt-1" size={20} />
//                     <div>
//                         <h6>About Your Duty Schedules</h6>
//                         <ul className="mb-0">
//                             <li>All schedules shown here are assigned by your supervisor</li>
//                             <li>You must be at the assigned office location during duty hours</li>
//                             <li>Check today's tab for attendance marking</li>
//                             <li>Contact your supervisor for schedule changes</li>
//                         </ul>
//                     </div>
//                 </div>
//             </Alert>
//         </div>
//     );
// };

// export default UserDutySchedules;

//----------------------------------------------------------------end

// import React, { useState, useEffect } from 'react';
// import {
//     Card,
//     Button,
//     Alert,
//     Spinner,
//     Badge,
//     Table,
//     Row,
//     Col,
//     Tabs,
//     Tab,
//     ProgressBar
// } from 'react-bootstrap';
// import {
//     FaCalendar,
//     FaMapMarkerAlt,
//     FaClock,
//     FaCalendarDay,
//     FaList,
//     FaCalendarAlt,
//     FaCalendarCheck,
//     FaCalendarWeek,
//     FaCalendarTimes,
//     FaInfoCircle,
//     FaDownload,
//     FaPrint
// } from 'react-icons/fa';
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

// const UserDutySchedules = ({ user, company }) => {
//     const [allSchedules, setAllSchedules] = useState([]);
//     const [upcomingWeek, setUpcomingWeek] = useState([]);
//     const [todaySchedule, setTodaySchedule] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [loadingAll, setLoadingAll] = useState(false);
//     const [error, setError] = useState(null);
//     const [activeView, setActiveView] = useState('list');
//     const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
//     const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
//                 const schedules = response.data.data || [];

//                 console.log('Fetched schedules:', schedules);

//                 const today = new Date();
//                 today.setHours(0, 0, 0, 0);

//                 const filteredSchedules = schedules.filter(schedule => {
//                     if (schedule.scheduleType === 'specific' && schedule.specificDates) {
//                         const hasFutureDate = schedule.specificDates.some(dateStr => {
//                             const date = new Date(dateStr);
//                             date.setHours(0, 0, 0, 0);
//                             return date >= today;
//                         });

//                         if (!hasFutureDate) {
//                             console.log('Filtering out specific schedule with no future dates:', schedule);
//                             return false;
//                         }
//                         return true;
//                     }

//                     if (schedule.scheduleType === 'recurring') {
//                         if (schedule.endDate) {
//                             const endDate = new Date(schedule.endDate);
//                             endDate.setHours(23, 59, 59, 999);
//                             if (endDate < today) {
//                                 console.log('Filtering out recurring schedule that ended:', schedule);
//                                 return false;
//                             }
//                         }

//                         const startDate = new Date(schedule.startDate);
//                         startDate.setHours(0, 0, 0, 0);

//                         if (startDate >= today) {
//                             return true;
//                         }

//                         return true;
//                     }

//                     return true;
//                 });

//                 console.log('Filtered schedules:', filteredSchedules);
//                 setAllSchedules(filteredSchedules);
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

//     const fetchTodaySchedule = async () => {
//         const userId = getUserId(user);
//         const companyId = getCompanyId(company);
        
//         if (!userId || !companyId) {
//             return;
//         }

//         try {
//             console.log('🔄 Fetching today schedule...');
//             console.log('Today:', new Date().toISOString());

//             const response = await api.get('/api/duty-schedule/check-today', {
//                 params: {
//                     userId: userId,
//                     companyId: companyId,
//                     _t: new Date().getTime()
//                 }
//             });

//             console.log('Today schedule response:', response.data);

//             if (response.data.success && response.data.hasDuty) {
//                 const schedule = response.data.schedule;

//                 const today = new Date();
//                 today.setHours(0, 0, 0, 0);

//                 const scheduleStartDate = schedule.startDate ? new Date(schedule.startDate) : null;
//                 if (scheduleStartDate) {
//                     scheduleStartDate.setHours(0, 0, 0, 0);
//                 }

//                 let shouldShow = true;

//                 if (schedule.scheduleType === 'specific') {
//                     const hasSpecificDate = schedule.specificDates?.some(date => {
//                         const d = new Date(date);
//                         d.setHours(0, 0, 0, 0);
//                         return d.getTime() === today.getTime();
//                     }) || false;

//                     shouldShow = hasSpecificDate;
//                 }

//                 if (schedule.scheduleType === 'recurring') {
//                     if (scheduleStartDate && today < scheduleStartDate) {
//                         shouldShow = false;
//                     }

//                     if (shouldShow && schedule.recurringPattern === 'weekly' && schedule.weekDays) {
//                         const dayOfWeek = today.getDay();
//                         shouldShow = schedule.weekDays.includes(dayOfWeek);
//                     }

//                     if (shouldShow && schedule.recurringPattern === 'monthly' && schedule.monthDays) {
//                         const dayOfMonth = today.getDate();
//                         shouldShow = schedule.monthDays.includes(dayOfMonth);
//                     }
//                 }

//                 if (shouldShow) {
//                     console.log('✅ Valid today schedule found');
//                     setTodaySchedule(schedule);
//                 } else {
//                     console.log('❌ Schedule does not apply to today (frontend validation failed)');
//                     setTodaySchedule(null);
//                 }
//             } else {
//                 console.log('❌ No duty schedule for today');
//                 setTodaySchedule(null);
//             }
//         } catch (error) {
//             console.error('❌ Error fetching today schedule:', error);
//             setTodaySchedule(null);
//         }
//     };

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
//             setLoading(true);
//             await Promise.all([
//                 fetchAllSchedules(),
//                 fetchTodaySchedule(),
//                 fetchUpcomingWeek()
//             ]);
//             setLoading(false);
//         };

//         initialize();
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
//             weekday: 'long',
//             month: 'long',
//             day: 'numeric',
//             year: 'numeric'
//         });
//     };

//     const formatShortDate = (dateString) => {
//         if (!dateString) return '';
//         const date = new Date(dateString);
//         return date.toLocaleDateString('en-US', {
//             month: 'short',
//             day: 'numeric',
//             year: 'numeric'
//         });
//     };

//     const getScheduleTypeText = (schedule) => {
//         if (schedule.scheduleType === 'specific') {
//             return `${schedule.specificDates?.length || 0} specific date(s)`;
//         } else if (schedule.scheduleType === 'recurring') {
//             if (schedule.recurringPattern === 'daily') {
//                 return 'Daily';
//             } else if (schedule.recurringPattern === 'weekly') {
//                 const days = schedule.weekDays?.map(day => {
//                     const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//                     return dayNames[day];
//                 }).join(', ');
//                 return `Weekly (${days})`;
//             } else if (schedule.recurringPattern === 'monthly') {
//                 return `Monthly (Days: ${schedule.monthDays?.join(', ')})`;
//             }
//         }
//         return schedule.scheduleType;
//     };

//     const getScheduleStatus = (schedule) => {
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);

//         if (schedule.scheduleType === 'specific' && schedule.specificDates) {
//             const futureDates = schedule.specificDates
//                 .map(date => new Date(date))
//                 .filter(date => {
//                     date.setHours(0, 0, 0, 0);
//                     return date >= today;
//                 })
//                 .sort((a, b) => a - b);

//             if (futureDates.length === 0) {
//                 return { text: 'No Future Dates', variant: 'secondary' };
//             }

//             const nextDate = futureDates[0];
//             const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

//             if (daysDiff === 0) {
//                 return { text: 'Ongoing', variant: 'primary' };
//             } else if (daysDiff === 1) {
//                 return { text: 'Tomorrow', variant: 'info' };
//             } else {
//                 return { text: `In ${daysDiff} days`, variant: 'info' };
//             }
//         }

//         const startDate = new Date(schedule.startDate);
//         startDate.setHours(0, 0, 0, 0);

//         const scheduleAppliesToday = checkScheduleAppliesToDate(schedule, today);

//         if (scheduleAppliesToday) {
//             return { text: 'Ongoing', variant: 'primary' };
//         }

//         if (startDate > today) {
//             const daysDiff = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
//             if (daysDiff === 1) {
//                 return { text: 'Starts Tomorrow', variant: 'info' };
//             }
//             return { text: `Starts in ${daysDiff} days`, variant: 'info' };
//         }

//         if (schedule.endDate) {
//             const endDate = new Date(schedule.endDate);
//             endDate.setHours(23, 59, 59, 999);
//             if (endDate < today) {
//                 return { text: 'Ended', variant: 'secondary' };
//             }
//         }

//         return { text: 'Success', variant: 'success' };
//     };

//     const checkScheduleAppliesToDate = (schedule, checkDate) => {
//         const date = new Date(checkDate);
//         date.setHours(0, 0, 0, 0);

//         if (schedule.scheduleType === 'specific' && schedule.specificDates) {
//             return schedule.specificDates.some(specificDate => {
//                 const d = new Date(specificDate);
//                 d.setHours(0, 0, 0, 0);
//                 return d.getTime() === date.getTime();
//             });
//         }

//         if (schedule.scheduleType === 'recurring') {
//             const startDate = new Date(schedule.startDate);
//             startDate.setHours(0, 0, 0, 0);

//             if (date < startDate) return false;

//             if (schedule.endDate) {
//                 const endDate = new Date(schedule.endDate);
//                 endDate.setHours(23, 59, 59, 999);
//                 if (date > endDate) return false;
//             }

//             if (schedule.recurringPattern === 'daily') {
//                 return true;
//             } else if (schedule.recurringPattern === 'weekly') {
//                 const dayOfWeek = date.getDay();
//                 return schedule.weekDays?.includes(dayOfWeek) || false;
//             } else if (schedule.recurringPattern === 'monthly') {
//                 const dayOfMonth = date.getDate();
//                 return schedule.monthDays?.includes(dayOfMonth) || false;
//             }
//         }

//         return false;
//     };

//     const renderTodayScheduleCard = () => {
//         if (!todaySchedule) {
//             return (
//                 <Card className="mb-3 border-0 shadow-sm">
//                     <Card.Header className="bg-light py-1 px-2 d-flex align-items-center" style={{ minHeight: '34px' }}>
//                         <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.8rem' }}>
//                             <FaCalendarDay className="me-1" size={14} />
//                             Today's Schedule
//                         </h6>
//                     </Card.Header>
//                     <Card.Body className="text-center py-3">
//                         <FaCalendarTimes className="text-muted mb-1" size={24} />
//                         <h6 className="mb-0" style={{ fontSize: '0.8rem' }}>No Duty Today</h6>
//                         <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>
//                             You don't have any duty schedule assigned for today
//                         </p>
//                     </Card.Body>
//                 </Card>
//             );
//         }

//         return (
//             <Card className="mb-3 border-primary shadow-sm">
//                 <Card.Header className="bg-primary bg-opacity-10 text-primary border-primary py-1 px-2 d-flex align-items-center" style={{ minHeight: '34px' }}>
//                     <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.8rem' }}>
//                         <FaCalendarDay className="me-1" size={14} />
//                         Today's Duty Schedule
//                     </h6>
//                 </Card.Header>
//                 <Card.Body className="p-2">
//                     <Row className="g-1">
//                         <Col md={6}>
//                             <div className="d-flex justify-content-between mb-1">
//                                 <small className="text-muted" style={{ fontSize: '0.65rem' }}>Schedule Type</small>
//                                 <span className="fw-semibold" style={{ fontSize: '0.7rem' }}>
//                                     {getScheduleTypeText(todaySchedule)}
//                                 </span>
//                             </div>
//                             <div className="d-flex justify-content-between mb-1">
//                                 <small className="text-muted" style={{ fontSize: '0.65rem' }}>Duty Hours</small>
//                                 <span className="fw-semibold" style={{ fontSize: '0.7rem' }}>
//                                     {formatTime(todaySchedule.dutyHours.startTime)} - {formatTime(todaySchedule.dutyHours.endTime)}
//                                 </span>
//                             </div>
//                             <div className="d-flex justify-content-between mb-1">
//                                 <small className="text-muted" style={{ fontSize: '0.65rem' }}>Grace Period</small>
//                                 <span style={{ fontSize: '0.7rem' }}>{todaySchedule.dutyHours.gracePeriod}m</span>
//                             </div>
//                             <div className="d-flex justify-content-between">
//                                 <small className="text-muted" style={{ fontSize: '0.65rem' }}>Break</small>
//                                 <span style={{ fontSize: '0.7rem' }}>{todaySchedule.dutyHours.breakDuration}m</span>
//                             </div>
//                         </Col>
//                         <Col md={6}>
//                             {todaySchedule.officeLocation && (
//                                 <div>
//                                     <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Office Location</small>
//                                     <div className="fw-semibold d-flex align-items-center" style={{ fontSize: '0.7rem' }}>
//                                         <FaMapMarkerAlt className="me-1 text-info" size={10} />
//                                         {todaySchedule.officeLocation.name}
//                                     </div>
//                                     {todaySchedule.officeLocation.address && (
//                                         <small className="text-muted d-block" style={{ fontSize: '0.6rem' }}>
//                                             {todaySchedule.officeLocation.address}
//                                         </small>
//                                     )}
//                                 </div>
//                             )}
//                             <div className="mt-1">
//                                 <small className="text-muted" style={{ fontSize: '0.65rem' }}>Period</small>
//                                 <div style={{ fontSize: '0.7rem' }}>
//                                     {formatShortDate(todaySchedule.startDate)}
//                                     {todaySchedule.endDate ? (
//                                         <> - {formatShortDate(todaySchedule.endDate)}</>
//                                     ) : (
//                                         ' (No end date)'
//                                     )}
//                                 </div>
//                             </div>
//                         </Col>
//                     </Row>

//                     {todaySchedule.notes && (
//                         <Alert variant="info" className="mt-2 mb-0 py-1 px-2" style={{ fontSize: '0.65rem' }}>
//                             <FaInfoCircle size={10} className="me-1" />
//                             {todaySchedule.notes}
//                         </Alert>
//                     )}
//                 </Card.Body>
//             </Card>
//         );
//     };

//     const renderListView = () => {
//         if (loadingAll) {
//             return (
//                 <div className="text-center py-3">
//                     <Spinner animation="border" variant="primary" size="sm" style={{ width: '18px', height: '18px' }} />
//                     <p className="mt-1 text-muted" style={{ fontSize: '0.7rem' }}>Loading your schedules...</p>
//                 </div>
//             );
//         }

//         if (allSchedules.length === 0) {
//             return (
//                 <div className="text-center py-4">
//                     <FaCalendarAlt className="text-muted mb-2" size={32} />
//                     <h6 className="mb-1" style={{ fontSize: '0.8rem' }}>No Duty Schedules Found</h6>
//                     <p className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>You don't have any upcoming duty schedules.</p>
//                     <p className="text-muted" style={{ fontSize: '0.7rem' }}>Contact your supervisor for schedule information.</p>
//                 </div>
//             );
//         }

//         return (
//             <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
//                 <Table hover className="align-middle mb-0" style={{ fontSize: '0.7rem' }}>
//                     <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
//                         <tr>
//                             <th style={{ padding: '4px 6px' }}>Schedule Type</th>
//                             <th style={{ padding: '4px 6px' }}>Duty Hours</th>
//                             <th style={{ padding: '4px 6px' }}>Office Location</th>
//                             <th style={{ padding: '4px 6px' }}>Period</th>
//                             <th style={{ padding: '4px 6px' }}>Status</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {allSchedules.map((schedule) => {
//                             const status = getScheduleStatus(schedule);
//                             const scheduleId = schedule._id || schedule.id;
                            
//                             return (
//                                 <tr key={scheduleId}>
//                                     <td style={{ padding: '4px 6px' }}>
//                                         <div className="d-flex align-items-center">
//                                             <FaCalendar className="me-1 text-primary" size={10} />
//                                             <div>
//                                                 <div className="fw-medium" style={{ fontSize: '0.65rem' }}>
//                                                     {getScheduleTypeText(schedule)}
//                                                 </div>
//                                                 <small className="text-muted" style={{ fontSize: '0.55rem' }}>
//                                                     {schedule.scheduleType === 'recurring' ? 'Recurring' : 'Specific'}
//                                                 </small>
//                                             </div>
//                                         </div>
//                                     </td>
//                                     <td style={{ padding: '4px 6px' }}>
//                                         <div className="d-flex align-items-center">
//                                             <FaClock className="me-1 text-muted" size={10} />
//                                             <div>
//                                                 <div className="fw-medium" style={{ fontSize: '0.65rem' }}>
//                                                     {formatTime(schedule.dutyHours.startTime)} - {formatTime(schedule.dutyHours.endTime)}
//                                                 </div>
//                                                 <small className="text-muted d-block" style={{ fontSize: '0.55rem' }}>
//                                                     {schedule.dutyHours.gracePeriod}m grace
//                                                 </small>
//                                             </div>
//                                         </div>
//                                     </td>
//                                     <td style={{ padding: '4px 6px' }}>
//                                         {schedule.officeLocation ? (
//                                             <div className="d-flex align-items-center">
//                                                 <FaMapMarkerAlt className="me-1 text-info" size={10} />
//                                                 <div>
//                                                     <div className="fw-medium" style={{ fontSize: '0.65rem' }}>
//                                                         {schedule.officeLocation.name}
//                                                     </div>
//                                                     <small className="text-muted d-block text-truncate" style={{ maxWidth: '120px', fontSize: '0.55rem' }}>
//                                                         {schedule.officeLocation.address}
//                                                     </small>
//                                                 </div>
//                                             </div>
//                                         ) : (
//                                             <span className="text-muted" style={{ fontSize: '0.6rem' }}>Any Office</span>
//                                         )}
//                                     </td>
//                                     <td style={{ padding: '4px 6px' }}>
//                                         <div style={{ fontSize: '0.6rem' }}>
//                                             <div className="fw-medium">
//                                                 {formatShortDate(schedule.startDate)}
//                                             </div>
//                                             {schedule.endDate ? (
//                                                 <small className="text-muted" style={{ fontSize: '0.55rem' }}>
//                                                     to {formatShortDate(schedule.endDate)}
//                                                 </small>
//                                             ) : (
//                                                 <small className="text-muted" style={{ fontSize: '0.55rem' }}>No end date</small>
//                                             )}
//                                         </div>
//                                     </td>
//                                     <td style={{ padding: '4px 6px' }}>
//                                         <Badge
//                                             bg={status.variant}
//                                             style={{ fontSize: '0.6rem', padding: '2px 8px' }}
//                                         >
//                                             {status.text}
//                                         </Badge>
//                                     </td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                 </Table>
//             </div>
//         );
//     };

//     const renderWeekView = () => {
//         if (upcomingWeek.length === 0) {
//             return (
//                 <div className="text-center py-4">
//                     <FaCalendarWeek className="text-muted mb-2" size={32} />
//                     <h6 className="mb-1" style={{ fontSize: '0.8rem' }}>No Schedule for Upcoming Week</h6>
//                     <p className="text-muted" style={{ fontSize: '0.7rem' }}>You don't have any duty schedules for the next 7 days.</p>
//                 </div>
//             );
//         }

//         return (
//             <div className="week-timeline">
//                 {upcomingWeek.map((day, index) => (
//                     <Card key={index} className={`mb-2 ${day.hasSchedule ? 'border-primary' : 'border-secondary'} border-0 shadow-sm`}>
//                         <Card.Header className={`bg-${day.hasSchedule ? 'primary' : 'light'} bg-opacity-10 py-1 px-2 d-flex justify-content-between align-items-center`} style={{ minHeight: '32px' }}>
//                             <div>
//                                 <span className="fw-semibold" style={{ fontSize: '0.75rem' }}>{day.dayName}</span>
//                                 <small className="text-muted ms-1" style={{ fontSize: '0.65rem' }}>{formatShortDate(day.date)}</small>
//                             </div>
//                             <div>
//                                 {day.hasSchedule ? (
//                                     <Badge bg="success" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
//                                         <FaClock size={9} className="me-1" />
//                                         Duty Day
//                                     </Badge>
//                                 ) : (
//                                     <Badge bg="secondary" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
//                                         <FaCalendarTimes size={9} className="me-1" />
//                                         Off Day
//                                     </Badge>
//                                 )}
//                             </div>
//                         </Card.Header>
//                         {day.hasSchedule && day.schedule && (
//                             <Card.Body className="p-2">
//                                 <Row className="g-1">
//                                     <Col md={6}>
//                                         <div className="d-flex justify-content-between">
//                                             <small className="text-muted" style={{ fontSize: '0.6rem' }}>Duty Hours:</small>
//                                             <span className="fw-semibold" style={{ fontSize: '0.65rem' }}>
//                                                 {formatTime(day.schedule.dutyHours.startTime)} - {formatTime(day.schedule.dutyHours.endTime)}
//                                             </span>
//                                         </div>
//                                         <div className="d-flex justify-content-between">
//                                             <small className="text-muted" style={{ fontSize: '0.6rem' }}>Grace Period:</small>
//                                             <span style={{ fontSize: '0.65rem' }}>{day.schedule.dutyHours.gracePeriod}m</span>
//                                         </div>
//                                     </Col>
//                                     <Col md={6}>
//                                         {day.schedule.officeLocation && (
//                                             <div>
//                                                 <small className="text-muted" style={{ fontSize: '0.6rem' }}>Office:</small>
//                                                 <div className="d-flex align-items-center mt-0">
//                                                     <FaMapMarkerAlt className="me-1 text-info" size={9} />
//                                                     <span className="fw-medium" style={{ fontSize: '0.65rem' }}>
//                                                         {day.schedule.officeLocation.name}
//                                                     </span>
//                                                 </div>
//                                             </div>
//                                         )}
//                                     </Col>
//                                 </Row>
//                             </Card.Body>
//                         )}
//                     </Card>
//                 ))}
//             </div>
//         );
//     };

//     const renderSummary = () => {
//         if (allSchedules.length === 0) return null;

//         const today = new Date();
//         const upcomingSchedules = allSchedules.filter(schedule => {
//             const endDate = schedule.endDate ? new Date(schedule.endDate) : null;
//             return !endDate || endDate >= today;
//         });

//         const activeSchedules = allSchedules.filter(schedule => {
//             const startDate = new Date(schedule.startDate);
//             const endDate = schedule.endDate ? new Date(schedule.endDate) : null;
//             return startDate <= today && (!endDate || endDate >= today);
//         });

//         return (
//             <Card className="mb-3 border-0 shadow-sm">
//                 <Card.Header className="bg-light py-1 px-2 d-flex align-items-center" style={{ minHeight: '32px' }}>
//                     <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.75rem' }}>
//                         <FaInfoCircle className="me-1" size={12} />
//                         Schedule Summary
//                     </h6>
//                 </Card.Header>
//                 <Card.Body className="p-2">
//                     <Row className="text-center g-0">
//                         <Col md={4}>
//                             <div className="fw-bold text-primary" style={{ fontSize: '1.2rem' }}>
//                                 {allSchedules.length}
//                             </div>
//                             <div className="text-muted" style={{ fontSize: '0.6rem' }}>Total Schedules</div>
//                         </Col>
//                         <Col md={4}>
//                             <div className="fw-bold text-success" style={{ fontSize: '1.2rem' }}>
//                                 {activeSchedules.length}
//                             </div>
//                             <div className="text-muted" style={{ fontSize: '0.6rem' }}>Active Schedules</div>
//                         </Col>
//                         <Col md={4}>
//                             <div className="fw-bold text-info" style={{ fontSize: '1.2rem' }}>
//                                 {upcomingSchedules.length}
//                             </div>
//                             <div className="text-muted" style={{ fontSize: '0.6rem' }}>Upcoming Schedules</div>
//                         </Col>
//                     </Row>
//                 </Card.Body>
//             </Card>
//         );
//     };

//     if (loading) {
//         return (
//             <div className="text-center py-4">
//                 <Spinner animation="border" variant="primary" size="sm" style={{ width: '20px', height: '20px' }} />
//                 <p className="mt-1 text-muted" style={{ fontSize: '0.75rem' }}>Loading your duty schedules...</p>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <Alert variant="danger" className="py-1 px-2" style={{ fontSize: '0.75rem' }}>
//                 <FaInfoCircle className="me-1" size={12} />
//                 {error}
//             </Alert>
//         );
//     }

//     return (
//         <div className="user-duty-schedules">
//             {renderTodayScheduleCard()}
//             {renderSummary()}

//             <Card className="mb-3 border-0 shadow-sm">
//                 <Card.Header className="bg-light py-1 px-2 d-flex justify-content-between align-items-center" style={{ minHeight: '34px' }}>
//                     <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.75rem' }}>
//                         <FaCalendarCheck className="me-1" size={12} />
//                         All Upcoming Schedules
//                     </h6>
//                     <div className="btn-group btn-group-sm" role="group">
//                         <Button
//                             variant={activeView === 'list' ? 'primary' : 'outline-secondary'}
//                             size="sm"
//                             onClick={() => setActiveView('list')}
//                             className="d-flex align-items-center"
//                             style={{ fontSize: '0.6rem', padding: '1px 8px', height: '22px' }}
//                         >
//                             <FaList size={10} className="me-1" /> List
//                         </Button>
//                         <Button
//                             variant={activeView === 'week' ? 'primary' : 'outline-secondary'}
//                             size="sm"
//                             onClick={() => setActiveView('week')}
//                             className="d-flex align-items-center"
//                             style={{ fontSize: '0.6rem', padding: '1px 8px', height: '22px' }}
//                         >
//                             <FaCalendarWeek size={10} className="me-1" /> Week
//                         </Button>
//                     </div>
//                 </Card.Header>
//                 <Card.Body className="p-2">
//                     {activeView === 'list' ? renderListView() : renderWeekView()}
//                 </Card.Body>
//                 <Card.Footer className="bg-light py-1 px-2 d-flex justify-content-between align-items-center" style={{ minHeight: '28px' }}>
//                     <small className="text-muted" style={{ fontSize: '0.6rem' }}>
//                         Showing {allSchedules.length} schedule{allSchedules.length !== 1 ? 's' : ''}
//                     </small>
//                     <div>
//                         <Button variant="outline-primary" size="sm" className="me-1" style={{ fontSize: '0.55rem', padding: '1px 6px', height: '22px' }}>
//                             <FaDownload size={8} className="me-1" /> Export
//                         </Button>
//                         <Button variant="outline-secondary" size="sm" style={{ fontSize: '0.55rem', padding: '1px 6px', height: '22px' }}>
//                             <FaPrint size={8} className="me-1" /> Print
//                         </Button>
//                     </div>
//                 </Card.Footer>
//             </Card>

//             <Alert variant="info" className="mt-2 py-1 px-2" style={{ fontSize: '0.65rem' }}>
//                 <div className="d-flex">
//                     <FaInfoCircle className="me-2 mt-0" size={14} />
//                     <div>
//                         <span className="fw-semibold" style={{ fontSize: '0.7rem' }}>About Your Duty Schedules</span>
//                         <ul className="mb-0" style={{ fontSize: '0.6rem', paddingLeft: '16px' }}>
//                             <li>All schedules shown here are assigned by your supervisor</li>
//                             <li>You must be at the assigned office location during duty hours</li>
//                             <li>Check today's tab for attendance marking</li>
//                             <li>Contact your supervisor for schedule changes</li>
//                         </ul>
//                     </div>
//                 </div>
//             </Alert>
//         </div>
//     );
// };

// export default UserDutySchedules;

//---------------------------------------------------end

import React, { useState, useEffect } from 'react';
import {
    Card,
    Button,
    Alert,
    Spinner,
    Badge,
    Table,
    Row,
    Col,
    Tabs,
    Tab,
    ProgressBar
} from 'react-bootstrap';
import {
    FaCalendar,
    FaMapMarkerAlt,
    FaClock,
    FaCalendarDay,
    FaList,
    FaCalendarAlt,
    FaCalendarCheck,
    FaCalendarWeek,
    FaCalendarTimes,
    FaInfoCircle,
    FaDownload,
    FaPrint
} from 'react-icons/fa';
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

const UserDutySchedules = ({ user, company }) => {
    const [allSchedules, setAllSchedules] = useState([]);
    const [upcomingWeek, setUpcomingWeek] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingAll, setLoadingAll] = useState(false);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('list');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
                const schedules = response.data.data || [];

                console.log('Fetched schedules:', schedules);

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const filteredSchedules = schedules.filter(schedule => {
                    if (schedule.scheduleType === 'specific' && schedule.specificDates) {
                        const hasFutureDate = schedule.specificDates.some(dateStr => {
                            const date = new Date(dateStr);
                            date.setHours(0, 0, 0, 0);
                            return date >= today;
                        });

                        if (!hasFutureDate) {
                            console.log('Filtering out specific schedule with no future dates:', schedule);
                            return false;
                        }
                        return true;
                    }

                    if (schedule.scheduleType === 'recurring') {
                        if (schedule.endDate) {
                            const endDate = new Date(schedule.endDate);
                            endDate.setHours(23, 59, 59, 999);
                            if (endDate < today) {
                                console.log('Filtering out recurring schedule that ended:', schedule);
                                return false;
                            }
                        }

                        const startDate = new Date(schedule.startDate);
                        startDate.setHours(0, 0, 0, 0);

                        if (startDate >= today) {
                            return true;
                        }

                        return true;
                    }

                    return true;
                });

                console.log('Filtered schedules:', filteredSchedules);
                setAllSchedules(filteredSchedules);
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

    const fetchTodaySchedule = async () => {
        const userId = getUserId(user);
        const companyId = getCompanyId(company);
        
        if (!userId || !companyId) {
            return;
        }

        try {
            console.log('🔄 Fetching today schedule...');
            console.log('Today:', new Date().toISOString());

            const response = await api.get('/api/duty-schedule/check-today', {
                params: {
                    userId: userId,
                    companyId: companyId,
                    _t: new Date().getTime()
                }
            });

            console.log('Today schedule response:', response.data);

            if (response.data.success && response.data.hasDuty) {
                const schedule = response.data.schedule;

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const scheduleStartDate = schedule.startDate ? new Date(schedule.startDate) : null;
                if (scheduleStartDate) {
                    scheduleStartDate.setHours(0, 0, 0, 0);
                }

                let shouldShow = true;

                if (schedule.scheduleType === 'specific') {
                    const hasSpecificDate = schedule.specificDates?.some(date => {
                        const d = new Date(date);
                        d.setHours(0, 0, 0, 0);
                        return d.getTime() === today.getTime();
                    }) || false;

                    shouldShow = hasSpecificDate;
                }

                if (schedule.scheduleType === 'recurring') {
                    if (scheduleStartDate && today < scheduleStartDate) {
                        shouldShow = false;
                    }

                    if (shouldShow && schedule.recurringPattern === 'weekly' && schedule.weekDays) {
                        const dayOfWeek = today.getDay();
                        shouldShow = schedule.weekDays.includes(dayOfWeek);
                    }

                    if (shouldShow && schedule.recurringPattern === 'monthly' && schedule.monthDays) {
                        const dayOfMonth = today.getDate();
                        shouldShow = schedule.monthDays.includes(dayOfMonth);
                    }
                }

                if (shouldShow) {
                    console.log('✅ Valid today schedule found');
                    setTodaySchedule(schedule);
                } else {
                    console.log('❌ Schedule does not apply to today (frontend validation failed)');
                    setTodaySchedule(null);
                }
            } else {
                console.log('❌ No duty schedule for today');
                setTodaySchedule(null);
            }
        } catch (error) {
            console.error('❌ Error fetching today schedule:', error);
            setTodaySchedule(null);
        }
    };

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
            setLoading(true);
            await Promise.all([
                fetchAllSchedules(),
                fetchTodaySchedule(),
                fetchUpcomingWeek()
            ]);
            setLoading(false);
        };

        initialize();
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
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatShortDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getScheduleTypeText = (schedule) => {
        if (schedule.scheduleType === 'specific') {
            return `${schedule.specificDates?.length || 0} specific date(s)`;
        } else if (schedule.scheduleType === 'recurring') {
            if (schedule.recurringPattern === 'daily') {
                return 'Daily';
            } else if (schedule.recurringPattern === 'weekly') {
                const days = schedule.weekDays?.map(day => {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    return dayNames[day];
                }).join(', ');
                return `Weekly (${days})`;
            } else if (schedule.recurringPattern === 'monthly') {
                return `Monthly (Days: ${schedule.monthDays?.join(', ')})`;
            }
        }
        return schedule.scheduleType;
    };

    const getScheduleStatus = (schedule) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (schedule.scheduleType === 'specific' && schedule.specificDates) {
            const futureDates = schedule.specificDates
                .map(date => new Date(date))
                .filter(date => {
                    date.setHours(0, 0, 0, 0);
                    return date >= today;
                })
                .sort((a, b) => a - b);

            if (futureDates.length === 0) {
                return { text: 'No Future Dates', variant: 'secondary' };
            }

            const nextDate = futureDates[0];
            const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

            if (daysDiff === 0) {
                return { text: 'Ongoing', variant: 'primary' };
            } else if (daysDiff === 1) {
                return { text: 'Tomorrow', variant: 'info' };
            } else {
                return { text: `In ${daysDiff} days`, variant: 'info' };
            }
        }

        const startDate = new Date(schedule.startDate);
        startDate.setHours(0, 0, 0, 0);

        const scheduleAppliesToday = checkScheduleAppliesToDate(schedule, today);

        if (scheduleAppliesToday) {
            return { text: 'Ongoing', variant: 'primary' };
        }

        if (startDate > today) {
            const daysDiff = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
            if (daysDiff === 1) {
                return { text: 'Starts Tomorrow', variant: 'info' };
            }
            return { text: `Starts in ${daysDiff} days`, variant: 'info' };
        }

        if (schedule.endDate) {
            const endDate = new Date(schedule.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (endDate < today) {
                return { text: 'Ended', variant: 'secondary' };
            }
        }

        return { text: 'Success', variant: 'success' };
    };

    const checkScheduleAppliesToDate = (schedule, checkDate) => {
        const date = new Date(checkDate);
        date.setHours(0, 0, 0, 0);

        if (schedule.scheduleType === 'specific' && schedule.specificDates) {
            return schedule.specificDates.some(specificDate => {
                const d = new Date(specificDate);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === date.getTime();
            });
        }

        if (schedule.scheduleType === 'recurring') {
            const startDate = new Date(schedule.startDate);
            startDate.setHours(0, 0, 0, 0);

            if (date < startDate) return false;

            if (schedule.endDate) {
                const endDate = new Date(schedule.endDate);
                endDate.setHours(23, 59, 59, 999);
                if (date > endDate) return false;
            }

            if (schedule.recurringPattern === 'daily') {
                return true;
            } else if (schedule.recurringPattern === 'weekly') {
                const dayOfWeek = date.getDay();
                return schedule.weekDays?.includes(dayOfWeek) || false;
            } else if (schedule.recurringPattern === 'monthly') {
                const dayOfMonth = date.getDate();
                return schedule.monthDays?.includes(dayOfMonth) || false;
            }
        }

        return false;
    };

    const renderTodayScheduleCard = () => {
        if (!todaySchedule) {
            return (
                <Card className="mb-3 border-0 shadow-sm">
                    <Card.Header className="bg-light py-1 px-3 d-flex align-items-center" style={{ minHeight: '36px' }}>
                        <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
                            <FaCalendarDay className="me-2" size={16} />
                            Today's Schedule
                        </h6>
                    </Card.Header>
                    <Card.Body className="text-center py-4">
                        <FaCalendarTimes className="text-muted mb-2" size={28} />
                        <h6 className="mb-1" style={{ fontSize: '0.9rem' }}>No Duty Today</h6>
                        <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>
                            You don't have any duty schedule assigned for today
                        </p>
                    </Card.Body>
                </Card>
            );
        }

        // return (
        //     <Card className="mb-3 border-primary shadow-sm">
        //         <Card.Header className="bg-primary bg-opacity-10 text-primary border-primary py-1 px-3 d-flex align-items-center" style={{ minHeight: '36px' }}>
        //             <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
        //                 <FaCalendarDay className="me-2" size={16} />
        //                 Today's Duty Schedule
        //             </h6>
        //         </Card.Header>
        //         <Card.Body className="p-3">
        //             <Row className="g-2">
        //                 <Col md={6}>
        //                     <div className="d-flex justify-content-between mb-2">
        //                         <small className="text-muted" style={{ fontSize: '0.75rem' }}>Schedule Type</small>
        //                         <span className="fw-semibold" style={{ fontSize: '0.8rem' }}>
        //                             {getScheduleTypeText(todaySchedule)}
        //                         </span>
        //                     </div>
        //                     <div className="d-flex justify-content-between mb-2">
        //                         <small className="text-muted" style={{ fontSize: '0.75rem' }}>Duty Hours</small>
        //                         <span className="fw-semibold" style={{ fontSize: '0.8rem' }}>
        //                             {formatTime(todaySchedule.dutyHours.startTime)} - {formatTime(todaySchedule.dutyHours.endTime)}
        //                         </span>
        //                     </div>
        //                     <div className="d-flex justify-content-between mb-2">
        //                         <small className="text-muted" style={{ fontSize: '0.75rem' }}>Grace Period</small>
        //                         <span style={{ fontSize: '0.8rem' }}>{todaySchedule.dutyHours.gracePeriod}m</span>
        //                     </div>
        //                     <div className="d-flex justify-content-between">
        //                         <small className="text-muted" style={{ fontSize: '0.75rem' }}>Break</small>
        //                         <span style={{ fontSize: '0.8rem' }}>{todaySchedule.dutyHours.breakDuration}m</span>
        //                     </div>
        //                 </Col>
        //                 <Col md={6}>
        //                     {todaySchedule.officeLocation && (
        //                         <div className="mb-2">
        //                             <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Office Location</small>
        //                             <div className="fw-semibold d-flex align-items-center" style={{ fontSize: '0.8rem' }}>
        //                                 <FaMapMarkerAlt className="me-2 text-info" size={14} />
        //                                 {todaySchedule.officeLocation.name}
        //                             </div>
        //                             {todaySchedule.officeLocation.address && (
        //                                 <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
        //                                     {todaySchedule.officeLocation.address}
        //                                 </small>
        //                             )}
        //                         </div>
        //                     )}
        //                     <div>
        //                         <small className="text-muted" style={{ fontSize: '0.75rem' }}>Period</small>
        //                         <div style={{ fontSize: '0.8rem' }}>
        //                             {formatShortDate(todaySchedule.startDate)}
        //                             {todaySchedule.endDate ? (
        //                                 <> - {formatShortDate(todaySchedule.endDate)}</>
        //                             ) : (
        //                                 ' (No end date)'
        //                             )}
        //                         </div>
        //                     </div>
        //                 </Col>
        //             </Row>

        //             {todaySchedule.notes && (
        //                 <Alert variant="info" className="mt-3 mb-0 py-1 px-2" style={{ fontSize: '0.75rem' }}>
        //                     <FaInfoCircle size={12} className="me-1" />
        //                     {todaySchedule.notes}
        //                 </Alert>
        //             )}
        //         </Card.Body>
        //     </Card>
        // );
    };

    const renderListView = () => {
        if (loadingAll) {
            return (
                <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="mt-2 text-muted" style={{ fontSize: '0.8rem' }}>Loading your schedules...</p>
                </div>
            );
        }

        if (allSchedules.length === 0) {
            return (
                <div className="text-center py-4">
                    <FaCalendarAlt className="text-muted mb-2" size={36} />
                    <h6 className="mb-1" style={{ fontSize: '0.9rem' }}>No Duty Schedules Found</h6>
                    <p className="text-muted mb-1" style={{ fontSize: '0.85rem' }}>You don't have any upcoming duty schedules.</p>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>Contact your supervisor for schedule information.</p>
                </div>
            );
        }

        return (
            <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
                <Table hover className="align-middle mb-0" style={{ fontSize: '0.8rem' }}>
                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                            <th style={{ padding: '8px 10px' }}>Schedule Type</th>
                            <th style={{ padding: '8px 10px' }}>Duty Hours</th>
                            <th style={{ padding: '8px 10px' }}>Office Location</th>
                            <th style={{ padding: '8px 10px' }}>Period</th>
                            <th style={{ padding: '8px 10px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allSchedules.map((schedule) => {
                            const status = getScheduleStatus(schedule);
                            const scheduleId = schedule._id || schedule.id;
                            
                            return (
                                <tr key={scheduleId}>
                                    <td style={{ padding: '6px 10px' }}>
                                        <div className="d-flex align-items-center">
                                            <FaCalendar className="me-2 text-primary" size={14} />
                                            <div>
                                                <div className="fw-medium" style={{ fontSize: '0.75rem' }}>
                                                    {getScheduleTypeText(schedule)}
                                                </div>
                                                <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                                                    {schedule.scheduleType === 'recurring' ? 'Recurring' : 'Specific'}
                                                </small>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '6px 10px' }}>
                                        <div className="d-flex align-items-center">
                                            <FaClock className="me-2 text-muted" size={14} />
                                            <div>
                                                <div className="fw-medium" style={{ fontSize: '0.75rem' }}>
                                                    {formatTime(schedule.dutyHours.startTime)} - {formatTime(schedule.dutyHours.endTime)}
                                                </div>
                                                <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>
                                                    {schedule.dutyHours.gracePeriod}m grace
                                                </small>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '6px 10px' }}>
                                        {schedule.officeLocation ? (
                                            <div className="d-flex align-items-center">
                                                <FaMapMarkerAlt className="me-2 text-info" size={14} />
                                                <div>
                                                    <div className="fw-medium" style={{ fontSize: '0.75rem' }}>
                                                        {schedule.officeLocation.name}
                                                    </div>
                                                    <small className="text-muted d-block text-truncate" style={{ maxWidth: '140px', fontSize: '0.65rem' }}>
                                                        {schedule.officeLocation.address}
                                                    </small>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-muted" style={{ fontSize: '0.7rem' }}>Any Office</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '6px 10px' }}>
                                        <div style={{ fontSize: '0.7rem' }}>
                                            <div className="fw-medium">
                                                {formatShortDate(schedule.startDate)}
                                            </div>
                                            {schedule.endDate ? (
                                                <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                                                    to {formatShortDate(schedule.endDate)}
                                                </small>
                                            ) : (
                                                <small className="text-muted" style={{ fontSize: '0.65rem' }}>No end date</small>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '6px 10px' }}>
                                        <Badge
                                            bg={status.variant}
                                            style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                                        >
                                            {status.text}
                                        </Badge>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </div>
        );
    };

    const renderWeekView = () => {
        if (upcomingWeek.length === 0) {
            return (
                <div className="text-center py-4">
                    <FaCalendarWeek className="text-muted mb-2" size={36} />
                    <h6 className="mb-1" style={{ fontSize: '0.9rem' }}>No Schedule for Upcoming Week</h6>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>You don't have any duty schedules for the next 7 days.</p>
                </div>
            );
        }

        return (
            <div className="week-timeline">
                {upcomingWeek.map((day, index) => (
                    <Card key={index} className={`mb-2 ${day.hasSchedule ? 'border-primary' : 'border-secondary'} border-0 shadow-sm`}>
                        <Card.Header className={`bg-${day.hasSchedule ? 'primary' : 'light'} bg-opacity-10 py-1 px-3 d-flex justify-content-between align-items-center`} style={{ minHeight: '36px' }}>
                            <div>
                                <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>{day.dayName}</span>
                                <small className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>{formatShortDate(day.date)}</small>
                            </div>
                            <div>
                                {day.hasSchedule ? (
                                    <Badge bg="success" style={{ fontSize: '0.7rem', padding: '4px 12px' }}>
                                        <FaClock size={12} className="me-1" />
                                        Duty Day
                                    </Badge>
                                ) : (
                                    <Badge bg="secondary" style={{ fontSize: '0.7rem', padding: '4px 12px' }}>
                                        <FaCalendarTimes size={12} className="me-1" />
                                        Off Day
                                    </Badge>
                                )}
                            </div>
                        </Card.Header>
                        {day.hasSchedule && day.schedule && (
                            <Card.Body className="p-3">
                                <Row className="g-2">
                                    <Col md={6}>
                                        <div className="d-flex justify-content-between mb-1">
                                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>Duty Hours:</small>
                                            <span className="fw-semibold" style={{ fontSize: '0.75rem' }}>
                                                {formatTime(day.schedule.dutyHours.startTime)} - {formatTime(day.schedule.dutyHours.endTime)}
                                            </span>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>Grace Period:</small>
                                            <span style={{ fontSize: '0.75rem' }}>{day.schedule.dutyHours.gracePeriod}m</span>
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        {day.schedule.officeLocation && (
                                            <div>
                                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>Office:</small>
                                                <div className="d-flex align-items-center mt-1">
                                                    <FaMapMarkerAlt className="me-2 text-info" size={12} />
                                                    <span className="fw-medium" style={{ fontSize: '0.75rem' }}>
                                                        {day.schedule.officeLocation.name}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </Col>
                                </Row>
                            </Card.Body>
                        )}
                    </Card>
                ))}
            </div>
        );
    };

    const renderSummary = () => {
        if (allSchedules.length === 0) return null;

        const today = new Date();
        const upcomingSchedules = allSchedules.filter(schedule => {
            const endDate = schedule.endDate ? new Date(schedule.endDate) : null;
            return !endDate || endDate >= today;
        });

        const activeSchedules = allSchedules.filter(schedule => {
            const startDate = new Date(schedule.startDate);
            const endDate = schedule.endDate ? new Date(schedule.endDate) : null;
            return startDate <= today && (!endDate || endDate >= today);
        });

        return (
            <Card className="mb-3 border-0 shadow-sm">
                <Card.Header className="bg-light py-1 px-3 d-flex align-items-center" style={{ minHeight: '36px' }}>
                    <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
                        <FaInfoCircle className="me-2" size={14} />
                        Schedule Summary
                    </h6>
                </Card.Header>
                <Card.Body className="p-3">
                    <Row className="text-center g-0">
                        <Col md={4}>
                            <div className="fw-bold text-primary" style={{ fontSize: '1.4rem' }}>
                                {allSchedules.length}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>Total Schedules</div>
                        </Col>
                        <Col md={4}>
                            <div className="fw-bold text-success" style={{ fontSize: '1.4rem' }}>
                                {activeSchedules.length}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>Active Schedules</div>
                        </Col>
                        <Col md={4}>
                            <div className="fw-bold text-info" style={{ fontSize: '1.4rem' }}>
                                {upcomingSchedules.length}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>Upcoming Schedules</div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        );
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                <Spinner animation="border" variant="primary" size="sm" />
                <p className="mt-2 text-muted" style={{ fontSize: '0.85rem' }}>Loading your duty schedules...</p>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className="py-1 px-3" style={{ fontSize: '0.85rem' }}>
                <FaInfoCircle className="me-2" size={14} />
                {error}
            </Alert>
        );
    }

    return (
        <div className="user-duty-schedules">
            {renderTodayScheduleCard()}
            {renderSummary()}

            <Card className="mb-3 border-0 shadow-sm">
                <Card.Header className="bg-light py-1 px-3 d-flex justify-content-between align-items-center" style={{ minHeight: '36px' }}>
                    <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
                        <FaCalendarCheck className="me-2" size={14} />
                        All Upcoming Schedules
                    </h6>
                    <div className="btn-group btn-group-sm" role="group">
                        <Button
                            variant={activeView === 'list' ? 'primary' : 'outline-secondary'}
                            size="sm"
                            onClick={() => setActiveView('list')}
                            className="d-flex align-items-center"
                            style={{ fontSize: '0.7rem', padding: '2px 12px', height: '28px' }}
                        >
                            <FaList size={12} className="me-1" /> List
                        </Button>
                        <Button
                            variant={activeView === 'week' ? 'primary' : 'outline-secondary'}
                            size="sm"
                            onClick={() => setActiveView('week')}
                            className="d-flex align-items-center"
                            style={{ fontSize: '0.7rem', padding: '2px 12px', height: '28px' }}
                        >
                            <FaCalendarWeek size={12} className="me-1" /> Week
                        </Button>
                    </div>
                </Card.Header>
                <Card.Body className="p-3">
                    {activeView === 'list' ? renderListView() : renderWeekView()}
                </Card.Body>
                <Card.Footer className="bg-light py-1 px-3 d-flex justify-content-between align-items-center" style={{ minHeight: '32px' }}>
                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                        Showing {allSchedules.length} schedule{allSchedules.length !== 1 ? 's' : ''}
                    </small>
                    <div className="d-flex gap-1">
                        <Button variant="outline-primary" size="sm" style={{ fontSize: '0.65rem', padding: '2px 10px', height: '26px' }}>
                            <FaDownload size={10} className="me-1" /> Export
                        </Button>
                        <Button variant="outline-secondary" size="sm" style={{ fontSize: '0.65rem', padding: '2px 10px', height: '26px' }}>
                            <FaPrint size={10} className="me-1" /> Print
                        </Button>
                    </div>
                </Card.Footer>
            </Card>

            {/* <Alert variant="info" className="mt-2 py-1 px-3" style={{ fontSize: '0.75rem' }}>
                <div className="d-flex">
                    <FaInfoCircle className="me-2 mt-0" size={16} />
                    <div>
                        <span className="fw-semibold" style={{ fontSize: '0.8rem' }}>About Your Duty Schedules</span>
                        <ul className="mb-0" style={{ fontSize: '0.7rem', paddingLeft: '16px' }}>
                            <li>All schedules shown here are assigned by your supervisor</li>
                            <li>You must be at the assigned office location during duty hours</li>
                            <li>Check today's tab for attendance marking</li>
                            <li>Contact your supervisor for schedule changes</li>
                        </ul>
                    </div>
                </div>
            </Alert> */}
        </div>
    );
};

export default UserDutySchedules;