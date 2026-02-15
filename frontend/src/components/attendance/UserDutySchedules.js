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

const UserDutySchedules = ({ user, company }) => {
    const [allSchedules, setAllSchedules] = useState([]);
    const [upcomingWeek, setUpcomingWeek] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingAll, setLoadingAll] = useState(false);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('list'); // 'list', 'calendar', 'week'
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
                const schedules = response.data.data || [];

                // Log for debugging
                console.log('Fetched schedules:', schedules);

                // Double-check on client side (just in case)
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const filteredSchedules = schedules.filter(schedule => {
                    // For specific schedules
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

                    // For recurring schedules
                    if (schedule.scheduleType === 'recurring') {
                        // Check end date
                        if (schedule.endDate) {
                            const endDate = new Date(schedule.endDate);
                            endDate.setHours(23, 59, 59, 999);
                            if (endDate < today) {
                                console.log('Filtering out recurring schedule that ended:', schedule);
                                return false;
                            }
                        }

                        // Check start date is not too far in the future? (optional)
                        const startDate = new Date(schedule.startDate);
                        startDate.setHours(0, 0, 0, 0);

                        // If hasn't started yet, it's fine
                        if (startDate >= today) {
                            return true;
                        }

                        // If already started, it should have future occurrences
                        // (backend should have filtered this, but double-check)
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

    // const fetchTodaySchedule = async () => {
    //     if (!user || !company) return;

    //     try {
    //         const token = localStorage.getItem('token');
    //         const response = await axios.get('/api/duty-schedule/check-today', {
    //             params: {
    //                 userId: user._id,
    //                 companyId: company._id
    //             },
    //             headers: { Authorization: `Bearer ${token}` }
    //         });

    //         if (response.data.success && response.data.hasDuty) {
    //             setTodaySchedule(response.data.schedule);
    //         } else {
    //             setTodaySchedule(null);
    //         }
    //     } catch (error) {
    //         console.error('Error fetching today schedule:', error);
    //         setTodaySchedule(null);
    //     }
    // };

    // Fetch upcoming week

    // const fetchTodaySchedule = async () => {
    //     if (!user || !company) return;

    //     try {
    //         console.log('🔄 Fetching today schedule for:', {
    //             user: user._id,
    //             company: company._id
    //         });

    //         const token = localStorage.getItem('token');
    //         const response = await axios.get('/api/duty-schedule/check-today', {
    //             params: {
    //                 userId: user._id,
    //                 companyId: company._id
    //             },
    //             headers: { Authorization: `Bearer ${token}` }
    //         });

    //         console.log('📊 Today schedule response:', response.data);

    //         if (response.data.success && response.data.hasDuty) {
    //             console.log('✅ Today has duty schedule:', response.data.schedule);
    //             setTodaySchedule(response.data.schedule);
    //         } else {
    //             console.log('❌ No duty schedule for today');
    //             setTodaySchedule(null);
    //         }
    //     } catch (error) {
    //         console.error('❌ Error fetching today schedule:', error);
    //         setTodaySchedule(null);
    //     }
    // };

    const fetchTodaySchedule = async () => {
        if (!user || !company) return;

        try {
            console.log('🔄 Fetching today schedule...');
            console.log('Today:', new Date().toISOString());

            const token = localStorage.getItem('token');
            const response = await axios.get('/api/duty-schedule/check-today', {
                params: {
                    userId: user._id,
                    companyId: company._id,
                    _t: new Date().getTime() // Prevent caching
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Today schedule response:', response.data);

            if (response.data.success && response.data.hasDuty) {
                const schedule = response.data.schedule;

                // Additional validation on frontend
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const scheduleStartDate = schedule.startDate ? new Date(schedule.startDate) : null;
                if (scheduleStartDate) {
                    scheduleStartDate.setHours(0, 0, 0, 0);
                }

                // Double-check if schedule should apply today
                let shouldShow = true;

                if (schedule.scheduleType === 'specific') {
                    // Check if any specific date matches today
                    const hasSpecificDate = schedule.specificDates?.some(date => {
                        const d = new Date(date);
                        d.setHours(0, 0, 0, 0);
                        return d.getTime() === today.getTime();
                    }) || false;

                    shouldShow = hasSpecificDate;
                }

                if (schedule.scheduleType === 'recurring') {
                    // Check if schedule has started
                    if (scheduleStartDate && today < scheduleStartDate) {
                        shouldShow = false;
                    }

                    // Check recurring pattern
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

        // For specific date schedules
        if (schedule.scheduleType === 'specific' && schedule.specificDates) {
            // Find the next future specific date
            const futureDates = schedule.specificDates
                .map(date => new Date(date))
                .filter(date => {
                    date.setHours(0, 0, 0, 0);
                    return date >= today;
                })
                .sort((a, b) => a - b);

            if (futureDates.length === 0) {
                // This shouldn't happen if backend filtered correctly
                return { text: 'No Future Dates', variant: 'secondary' };
            }

            const nextDate = futureDates[0];
            const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

            if (daysDiff === 0) {
                return { text: 'Ongoing', variant: 'primary' }; // Changed from 'Today' to 'Ongoing'
            } else if (daysDiff === 1) {
                return { text: 'Tomorrow', variant: 'info' };
            } else {
                return { text: `In ${daysDiff} days`, variant: 'info' };
            }
        }

        // For recurring schedules
        const startDate = new Date(schedule.startDate);
        startDate.setHours(0, 0, 0, 0);

        // Check if schedule applies to today
        const scheduleAppliesToday = checkScheduleAppliesToDate(schedule, today);

        if (scheduleAppliesToday) {
            return { text: 'Ongoing', variant: 'primary' }; // Show 'Ongoing' for today
        }

        // Check if starts in the future
        if (startDate > today) {
            const daysDiff = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
            if (daysDiff === 1) {
                return { text: 'Starts Tomorrow', variant: 'info' };
            }
            return { text: `Starts in ${daysDiff} days`, variant: 'info' };
        }

        // Check if schedule ended
        if (schedule.endDate) {
            const endDate = new Date(schedule.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (endDate < today) {
                // This shouldn't happen if backend filtered correctly
                return { text: 'Ended', variant: 'secondary' };
            }
        }

        // For recurring schedules that started in the past and have future occurrences
        return { text: 'Success', variant: 'success' }; // Changed from 'Ongoing' to 'Success'
    };

    const checkScheduleAppliesToDate = (schedule, checkDate) => {
        const date = new Date(checkDate);
        date.setHours(0, 0, 0, 0);

        // For specific schedules
        if (schedule.scheduleType === 'specific' && schedule.specificDates) {
            return schedule.specificDates.some(specificDate => {
                const d = new Date(specificDate);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === date.getTime();
            });
        }

        // For recurring schedules
        if (schedule.scheduleType === 'recurring') {
            // Check date range
            const startDate = new Date(schedule.startDate);
            startDate.setHours(0, 0, 0, 0);

            // If date is before start date
            if (date < startDate) return false;

            // Check if schedule has an end date
            if (schedule.endDate) {
                const endDate = new Date(schedule.endDate);
                endDate.setHours(23, 59, 59, 999);
                if (date > endDate) return false;
            }

            // Check based on recurring pattern
            if (schedule.recurringPattern === 'daily') {
                return true;
            } else if (schedule.recurringPattern === 'weekly') {
                const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
                return schedule.weekDays?.includes(dayOfWeek) || false;
            } else if (schedule.recurringPattern === 'monthly') {
                const dayOfMonth = date.getDate(); // 1-31
                return schedule.monthDays?.includes(dayOfMonth) || false;
            }
        }

        return false;
    };

    const renderTodayScheduleCard = () => {
        if (!todaySchedule) {
            return (
                <Card className="mb-4 border-secondary">
                    <Card.Header className="bg-light">
                        <h6 className="mb-0 d-flex align-items-center">
                            <FaCalendarDay className="me-2" />
                            Today's Schedule
                        </h6>
                    </Card.Header>
                    <Card.Body className="text-center py-4">
                        <FaCalendarTimes className="text-muted mb-2" size={32} />
                        <h6>No Duty Today</h6>
                        <p className="text-muted small mb-0">
                            You don't have any duty schedule assigned for today
                        </p>
                    </Card.Body>
                </Card>
            );
        }

        return (
            <Card className="mb-4 border-primary">
                <Card.Header className="bg-primary bg-opacity-10 text-primary border-primary">
                    <h6 className="mb-0 d-flex align-items-center">
                        <FaCalendarDay className="me-2" />
                        Today's Duty Schedule
                    </h6>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={6}>
                            <div className="mb-3">
                                <small className="text-muted d-block">Schedule Type</small>
                                <div className="fw-semibold">
                                    {getScheduleTypeText(todaySchedule)}
                                </div>
                            </div>
                            <div className="mb-3">
                                <small className="text-muted d-block">Duty Hours</small>
                                <div className="fw-semibold">
                                    {formatTime(todaySchedule.dutyHours.startTime)} - {formatTime(todaySchedule.dutyHours.endTime)}
                                </div>
                                <small className="text-muted">
                                    {todaySchedule.dutyHours.gracePeriod}m grace period • {todaySchedule.dutyHours.breakDuration}m break
                                </small>
                                <div className="mb-3">
                                    <small className="text-muted d-block">Schedule Period</small>
                                    <div className="fw-semibold">
                                        {formatDate(todaySchedule.startDate)}
                                        {todaySchedule.endDate ? (
                                            <> to {formatDate(todaySchedule.endDate)}</>
                                        ) : (
                                            ' (No end date)'
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Col>
                        <Col md={6}>
                            {todaySchedule.officeLocation && (
                                <div className="mb-3">
                                    <small className="text-muted d-block">Office Location</small>
                                    <div className="fw-semibold d-flex align-items-center">
                                        <FaMapMarkerAlt className="me-2 text-info" size={12} />
                                        {todaySchedule.officeLocation.name}
                                    </div>
                                    <small className="text-muted d-block">
                                        {todaySchedule.officeLocation.address}
                                    </small>
                                </div>
                            )}
                        </Col>
                    </Row>

                    {todaySchedule.notes && (
                        <Alert variant="info" className="mt-3 mb-0">
                            <FaInfoCircle className="me-2" />
                            {todaySchedule.notes}
                        </Alert>
                    )}
                </Card.Body>
            </Card>
        );
    };

    const renderListView = () => {
        if (loadingAll) {
            return (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted">Loading your schedules...</p>
                </div>
            );
        }

        if (allSchedules.length === 0) {
            return (
                <div className="text-center py-5">
                    <FaCalendarAlt className="text-muted mb-3" size={48} />
                    <h5>No Duty Schedules Found</h5>
                    <p className="text-muted">You don't have any upcoming duty schedules.</p>
                    <p className="text-muted small">Contact your supervisor for schedule information.</p>
                </div>
            );
        }

        return (
            <div className="table-responsive">
                <Table hover className="align-middle">
                    <thead className="bg-light">
                        <tr>
                            <th>Schedule Type</th>
                            <th>Duty Hours</th>
                            <th>Office Location</th>
                            <th>Period</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allSchedules.map((schedule) => {
                            const status = getScheduleStatus(schedule);
                            return (
                                <tr key={schedule._id}>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <FaCalendar className="me-2 text-primary" size={14} />
                                            <div>
                                                <div className="fw-medium">
                                                    {getScheduleTypeText(schedule)}
                                                </div>
                                                <small className="text-muted">
                                                    {schedule.scheduleType === 'recurring' ? 'Recurring' : 'Specific'}
                                                </small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <FaClock className="me-2 text-muted" size={14} />
                                            <div>
                                                <div className="fw-medium">
                                                    {formatTime(schedule.dutyHours.startTime)} - {formatTime(schedule.dutyHours.endTime)}
                                                </div>
                                                <small className="text-muted d-block">
                                                    {schedule.dutyHours.gracePeriod}m grace
                                                </small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {schedule.officeLocation ? (
                                            <div className="d-flex align-items-center">
                                                <FaMapMarkerAlt className="me-2 text-info" size={14} />
                                                <div>
                                                    <div className="fw-medium">
                                                        {schedule.officeLocation.name}
                                                    </div>
                                                    <small className="text-muted d-block text-truncate" style={{ maxWidth: '150px' }}>
                                                        {schedule.officeLocation.address}
                                                    </small>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-muted">Any Office</span>
                                        )}
                                    </td>
                                    <td>
                                        <div>
                                            <div className="fw-medium">
                                                {formatShortDate(schedule.startDate)}
                                            </div>
                                            {schedule.endDate ? (
                                                <small className="text-muted">
                                                    to {formatShortDate(schedule.endDate)}
                                                </small>
                                            ) : (
                                                <small className="text-muted">No end date</small>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <Badge
                                            bg={status.variant}
                                            className="px-3 py-2"
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
                <div className="text-center py-5">
                    <FaCalendarWeek className="text-muted mb-3" size={48} />
                    <h5>No Schedule for Upcoming Week</h5>
                    <p className="text-muted">You don't have any duty schedules for the next 7 days.</p>
                </div>
            );
        }

        return (
            <div className="week-timeline">
                {upcomingWeek.map((day, index) => (
                    <Card key={index} className={`mb-3 ${day.hasSchedule ? 'border-primary' : 'border-secondary'}`}>
                        <Card.Header className={`bg-${day.hasSchedule ? 'primary' : 'light'} bg-opacity-10`}>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="mb-0">{day.dayName}</h6>
                                    <small className="text-muted">{formatShortDate(day.date)}</small>
                                </div>
                                <div>
                                    {day.hasSchedule ? (
                                        <Badge bg="success" className="px-3">
                                            <FaClock className="me-1" />
                                            Duty Day
                                        </Badge>
                                    ) : (
                                        <Badge bg="secondary" className="px-3">
                                            <FaCalendarTimes className="me-1" />
                                            Off Day
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </Card.Header>
                        {day.hasSchedule && day.schedule && (
                            <Card.Body>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-2">
                                            <small className="text-muted">Duty Hours:</small>
                                            <div className="fw-semibold">
                                                {formatTime(day.schedule.dutyHours.startTime)} - {formatTime(day.schedule.dutyHours.endTime)}
                                            </div>
                                        </div>
                                        <div className="mb-2">
                                            <small className="text-muted">Grace Period:</small>
                                            <div>{day.schedule.dutyHours.gracePeriod} minutes</div>
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        {day.schedule.officeLocation && (
                                            <div>
                                                <small className="text-muted">Office Location:</small>
                                                <div className="d-flex align-items-center mt-1">
                                                    <FaMapMarkerAlt className="me-2 text-info" size={12} />
                                                    <div>
                                                        <div className="fw-medium">
                                                            {day.schedule.officeLocation.name}
                                                        </div>
                                                        <small className="text-muted">
                                                            {day.schedule.officeLocation.address}
                                                        </small>
                                                    </div>
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
            <Card className="mb-4">
                <Card.Header className="bg-light">
                    <h6 className="mb-0 d-flex align-items-center">
                        <FaInfoCircle className="me-2" />
                        Schedule Summary
                    </h6>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={4} className="text-center">
                            <div className="display-4 fw-bold text-primary">
                                {allSchedules.length}
                            </div>
                            <div className="text-muted">Total Schedules</div>
                        </Col>
                        <Col md={4} className="text-center">
                            <div className="display-4 fw-bold text-success">
                                {activeSchedules.length}
                            </div>
                            <div className="text-muted">Active Schedules</div>
                        </Col>
                        <Col md={4} className="text-center">
                            <div className="display-4 fw-bold text-info">
                                {upcomingSchedules.length}
                            </div>
                            <div className="text-muted">Upcoming Schedules</div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        );
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Loading your duty schedules...</p>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="danger">
                <FaInfoCircle className="me-2" />
                {error}
            </Alert>
        );
    }

    return (
        <div className="user-duty-schedules">
            {/* Today's Schedule */}
            {renderTodayScheduleCard()}

            {/* Summary */}
            {renderSummary()}

            {/* View Tabs */}
            <Card className="mb-4">
                <Card.Header className="bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 d-flex align-items-center">
                            <FaCalendarCheck className="me-2" />
                            All Upcoming Schedules
                        </h6>
                        <div className="btn-group btn-group-sm" role="group">
                            <Button
                                variant={activeView === 'list' ? 'primary' : 'outline-secondary'}
                                size="sm"
                                onClick={() => setActiveView('list')}
                                className="d-flex align-items-center"
                            >
                                <FaList className="me-1" /> List
                            </Button>
                            <Button
                                variant={activeView === 'week' ? 'primary' : 'outline-secondary'}
                                size="sm"
                                onClick={() => setActiveView('week')}
                                className="d-flex align-items-center"
                            >
                                <FaCalendarWeek className="me-1" /> Week View
                            </Button>
                        </div>
                    </div>
                </Card.Header>
                <Card.Body>
                    {activeView === 'list' ? renderListView() : renderWeekView()}
                </Card.Body>
                <Card.Footer className="bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                            Showing {allSchedules.length} schedule{allSchedules.length !== 1 ? 's' : ''}
                        </small>
                        <div>
                            <Button variant="outline-primary" size="sm" className="me-2">
                                <FaDownload className="me-1" /> Export
                            </Button>
                            <Button variant="outline-secondary" size="sm">
                                <FaPrint className="me-1" /> Print
                            </Button>
                        </div>
                    </div>
                </Card.Footer>
            </Card>

            {/* Help/Info Section */}
            <Alert variant="info" className="mt-4">
                <div className="d-flex">
                    <FaInfoCircle className="me-3 mt-1" size={20} />
                    <div>
                        <h6>About Your Duty Schedules</h6>
                        <ul className="mb-0">
                            <li>All schedules shown here are assigned by your supervisor</li>
                            <li>You must be at the assigned office location during duty hours</li>
                            <li>Check today's tab for attendance marking</li>
                            <li>Contact your supervisor for schedule changes</li>
                        </ul>
                    </div>
                </div>
            </Alert>
        </div>
    );
};

export default UserDutySchedules;