import React, { useState, useEffect } from 'react';
import { 
    Card, 
    Button, 
    Alert, 
    Spinner,
    Badge,
    Table,
    Row,
    Col
} from 'react-bootstrap';
import { 
    FaCalendar, 
    FaMapMarkerAlt, 
    FaEye,
    FaClock,
    FaCalendarDay,
    FaList,
    FaChevronRight
} from 'react-icons/fa';
import axios from 'axios';

// Component to show user's upcoming schedule in the dashboard
const UpcomingDutySchedule = ({ user, company }) => {
    const [todaySchedule, setTodaySchedule] = useState(null);
    const [allSchedules, setAllSchedules] = useState([]);
    const [upcomingWeek, setUpcomingWeek] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingAll, setLoadingAll] = useState(false);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('today'); // 'today' or 'all'

    // Fetch today's schedule
    const fetchTodaySchedule = async () => {
        if (!user || !company) return;

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/duty-schedule/check-today', {
                params: {
                    userId: user._id,
                    companyId: company._id
                },
                headers: { Authorization: `Bearer ${token}` }
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
        if (!user || !company) return;

        setLoadingAll(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/duty-schedule/user/${user._id}`, {
                params: {
                    companyId: company._id,
                    activeOnly: true
                },
                headers: { Authorization: `Bearer ${token}` }
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
        if (!user || !company) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/duty-schedule/upcoming-week', {
                params: {
                    userId: user._id,
                    companyId: company._id
                },
                headers: { Authorization: `Bearer ${token}` }
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
            await fetchTodaySchedule();
            await fetchAllSchedules();
            await fetchUpcomingWeek();
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

    // const renderTodayView = () => {
    //     if (loading) {
    //         return (
    //             <div className="text-center py-4">
    //                 <Spinner animation="border" size="sm" variant="primary" />
    //                 <p className="mt-2 mb-0 small text-muted">Loading today's schedule...</p>
    //             </div>
    //         );
    //     }

    //     if (error) {
    //         return (
    //             <Alert variant="warning" className="mb-3">
    //                 <small>{error}</small>
    //             </Alert>
    //         );
    //     }

    //     if (!todaySchedule) {
    //         return (
    //             <div className="text-center py-4">
    //                 <FaCalendar className="text-muted mb-2" size={32} />
    //                 <h6>No Duty Today</h6>
    //                 <p className="text-muted small mb-0">
    //                     You don't have any duty schedule assigned for today
    //                 </p>
    //             </div>
    //         );
    //     }

    //     return (
    //         <div className="today-schedule-details">
    //             <div className="mb-3">
    //                 <small className="text-muted d-block">Schedule Type</small>
    //                 <div className="fw-semibold">
    //                     {getScheduleTypeText(todaySchedule)}
    //                 </div>
    //             </div>
                
    //             <div className="mb-3">
    //                 <small className="text-muted d-block">Duty Hours</small>
    //                 <div className="fw-semibold">
    //                     {formatTime(todaySchedule.dutyHours.startTime)} - {formatTime(todaySchedule.dutyHours.endTime)}
    //                 </div>
    //                 <small className="text-muted">
    //                     {todaySchedule.dutyHours.gracePeriod}m grace period
    //                 </small>
    //             </div>
                
    //             {todaySchedule.officeLocation && (
    //                 <div className="mb-3">
    //                     <small className="text-muted d-block">Office Location</small>
    //                     <div className="fw-semibold d-flex align-items-center">
    //                         <FaMapMarkerAlt className="me-2 text-info" size={12} />
    //                         {todaySchedule.officeLocation.name}
    //                     </div>
    //                     <small className="text-muted d-block">
    //                         {todaySchedule.officeLocation.address}
    //                     </small>
    //                 </div>
    //             )}
                
    //             <div className="mb-3">
    //                 <small className="text-muted d-block">Schedule Period</small>
    //                 <div className="fw-semibold">
    //                     {formatDate(todaySchedule.startDate)}
    //                     {todaySchedule.endDate ? (
    //                         <> to {formatDate(todaySchedule.endDate)}</>
    //                     ) : (
    //                         ' (No end date)'
    //                     )}
    //                 </div>
    //             </div>
                
    //             {todaySchedule.notes && (
    //                 <Alert variant="info" className="small py-2 mt-3">
    //                     <small>
    //                         <FaEye className="me-1" />
    //                         {todaySchedule.notes}
    //                     </small>
    //                 </Alert>
    //             )}
    //         </div>
    //     );
    // };

    // const renderAllSchedulesView = () => {
    //     if (loadingAll) {
    //         return (
    //             <div className="text-center py-4">
    //                 <Spinner animation="border" size="sm" variant="primary" />
    //                 <p className="mt-2 mb-0 small text-muted">Loading all schedules...</p>
    //             </div>
    //         );
    //     }

    //     if (allSchedules.length === 0) {
    //         return (
    //             <div className="text-center py-4">
    //                 <FaCalendar className="text-muted mb-2" size={32} />
    //                 <h6>No Duty Schedules</h6>
    //                 <p className="text-muted small mb-0">
    //                     You don't have any upcoming duty schedules
    //                 </p>
    //             </div>
    //         );
    //     }

    //     return (
    //         <div className="all-schedules-list">
    //             <div className="table-responsive">
    //                 <Table hover size="sm" className="mb-0">
    //                     <thead>
    //                         <tr>
    //                             <th>Schedule</th>
    //                             <th>Hours</th>
    //                             <th>Period</th>
    //                             <th>Location</th>
    //                         </tr>
    //                     </thead>
    //                     <tbody>
    //                         {allSchedules.map((schedule, index) => (
    //                             <tr key={schedule._id || index}>
    //                                 <td>
    //                                     <div className="fw-medium">
    //                                         {getScheduleTypeText(schedule)}
    //                                     </div>
    //                                     <small className="text-muted">
    //                                         {schedule.isActive ? 'Active' : 'Inactive'}
    //                                     </small>
    //                                 </td>
    //                                 <td>
    //                                     <div className="fw-medium">
    //                                         {formatTime(schedule.dutyHours.startTime)} - {formatTime(schedule.dutyHours.endTime)}
    //                                     </div>
    //                                     <small className="text-muted">
    //                                         {schedule.dutyHours.gracePeriod}m grace
    //                                     </small>
    //                                 </td>
    //                                 <td>
    //                                     <div className="small">
    //                                         <div className="fw-medium">
    //                                             {formatShortDate(schedule.startDate)}
    //                                         </div>
    //                                         {schedule.endDate ? (
    //                                             <small className="text-muted">
    //                                                 to {formatShortDate(schedule.endDate)}
    //                                             </small>
    //                                         ) : (
    //                                             <small className="text-muted">No end date</small>
    //                                         )}
    //                                     </div>
    //                                 </td>
    //                                 <td>
    //                                     {schedule.officeLocation ? (
    //                                         <div className="d-flex align-items-center">
    //                                             <FaMapMarkerAlt className="me-1 text-info" size={10} />
    //                                             <span className="text-truncate" style={{ maxWidth: '80px' }}>
    //                                                 {schedule.officeLocation.name}
    //                                             </span>
    //                                         </div>
    //                                     ) : (
    //                                         <span className="text-muted small">Any Office</span>
    //                                     )}
    //                                 </td>
    //                             </tr>
    //                         ))}
    //                     </tbody>
    //                 </Table>
    //             </div>
    //         </div>
    //     );
    // };

    // const renderUpcomingWeekView = () => {
    //     if (upcomingWeek.length === 0) {
    //         return (
    //             <div className="text-center py-3">
    //                 <FaCalendar className="text-muted mb-2" size={24} />
    //                 <p className="mb-0 text-muted small">No schedule for upcoming week</p>
    //             </div>
    //         );
    //     }

    //     return (
    //         <div className="upcoming-week-timeline">
    //             {upcomingWeek.map((day, index) => (
    //                 <div key={index} className="timeline-item d-flex mb-2">
    //                     <div className="timeline-marker me-3">
    //                         <div className={`bg-${day.hasSchedule ? 'primary' : 'light'} rounded-circle d-flex align-items-center justify-content-center`}
    //                             style={{ width: '32px', height: '32px' }}>
    //                             {day.hasSchedule ? (
    //                                 <FaCalendarDay className="text-white" size={12} />
    //                             ) : (
    //                                 <FaCalendar className="text-muted" size={12} />
    //                             )}
    //                         </div>
    //                     </div>
    //                     <div className="timeline-content flex-grow-1">
    //                         <div className="d-flex justify-content-between align-items-center">
    //                             <div>
    //                                 <h6 className="mb-0" style={{ fontSize: '0.9rem' }}>{day.dayName}</h6>
    //                                 <small className="text-muted">{formatShortDate(day.date)}</small>
    //                             </div>
    //                             <div>
    //                                 {day.hasSchedule ? (
    //                                     <Badge bg="success" className="px-2" style={{ fontSize: '0.7rem' }}>
    //                                         {formatTime(day.schedule?.dutyHours?.startTime || '09:00')}
    //                                     </Badge>
    //                                 ) : (
    //                                     <Badge bg="secondary" className="px-2" style={{ fontSize: '0.7rem' }}>Off</Badge>
    //                                 )}
    //                             </div>
    //                         </div>
    //                         {day.hasSchedule && day.schedule && (
    //                             <div className="mt-1">
    //                                 <div className="d-flex align-items-center">
    //                                     <small className="text-muted me-1">Hours:</small>
    //                                     <span className="fw-medium small">
    //                                         {formatTime(day.schedule.dutyHours.startTime)} - {formatTime(day.schedule.dutyHours.endTime)}
    //                                     </span>
    //                                 </div>
    //                             </div>
    //                         )}
    //                     </div>
    //                 </div>
    //             ))}
    //         </div>
    //     );
    // };

    if (loading && loadingAll) {
        return (
            <Card className="mt-4">
                <Card.Header className="bg-light">
                    <h6 className="mb-0 d-flex align-items-center">
                        <FaCalendar className="me-2" />
                        Upcoming Duty Schedules
                    </h6>
                </Card.Header>
                <Card.Body className="text-center py-4">
                    <Spinner animation="border" size="sm" />
                    <p className="mt-2 mb-0 small text-muted">Loading schedules...</p>
                </Card.Body>
            </Card>
        );
    }

    // return (
    //     <Card className="mt-4">
    //         <Card.Header className="bg-light">
    //             <div className="d-flex justify-content-between align-items-center">
    //                 <h6 className="mb-0 d-flex align-items-center">
    //                     <FaCalendar className="me-2" />
    //                     My Duty Schedules
    //                 </h6>
    //                 <div className="btn-group btn-group-sm" role="group">
    //                     <Button
    //                         variant={activeView === 'today' ? 'primary' : 'outline-secondary'}
    //                         size="sm"
    //                         onClick={() => setActiveView('today')}
    //                         className="px-2"
    //                     >
    //                         Today
    //                     </Button>
    //                     <Button
    //                         variant={activeView === 'all' ? 'primary' : 'outline-secondary'}
    //                         size="sm"
    //                         onClick={() => setActiveView('all')}
    //                         className="px-2"
    //                     >
    //                         All
    //                     </Button>
    //                 </div>
    //             </div>
    //         </Card.Header>
            
    //         <Card.Body className="p-3">
    //             {activeView === 'today' ? (
    //                 <>
    //                     {renderTodayView()}
    //                 </>
    //             ) : (
    //                 renderAllSchedulesView()
    //             )}
    //         </Card.Body>
            
    //         <Card.Footer className="bg-light py-2">
    //             <small className="text-muted d-flex justify-content-between align-items-center">
    //                 <span>
    //                     <FaCalendar className="me-1" size={12} />
    //                     {allSchedules.length} schedule{allSchedules.length !== 1 ? 's' : ''} found
    //                 </span>
    //                 <Button 
    //                     variant="link" 
    //                     size="sm" 
    //                     className="p-0"
    //                     onClick={() => window.location.hash = ''}
    //                 >
    //                     View Details <FaChevronRight size={12} />
    //                 </Button>
    //             </small>
    //         </Card.Footer>
    //     </Card>
    // );
};

export default UpcomingDutySchedule;