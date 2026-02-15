import React, { useState, useEffect } from 'react';
import { Button, Card, Alert, Spinner, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Clock, MapPin, CheckCircle, XCircle, AlertCircle, Calendar, Info } from 'lucide-react';
import axios from 'axios';
import '../../stylesheet/attendance/AttendanceButton.css';
import locationService from '../services/locationService';

const AttendanceButton = ({ user, company, currentLocation, onAttendanceUpdate }) => {
    const [attendanceStatus, setAttendanceStatus] = useState(null);
    const [dutySchedule, setDutySchedule] = useState(null);
    const [isAtOffice, setIsAtOffice] = useState(false);
    const [nearestOffice, setNearestOffice] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [distance, setDistance] = useState(null);
    const [hasDutyForToday, setHasDutyForToday] = useState(false);
    const [checkingDuty, setCheckingDuty] = useState(false);
    const [dutyStartTime, setDutyStartTime] = useState(null);
    const [dutyEndTime, setDutyEndTime] = useState(null);
    const [initializing, setInitializing] = useState(true);

    // Define all functions BEFORE useEffect
    const checkLocationStatus = () => {
        console.log('🔍 Checking location status:', {
            hasCurrentLocation: !!currentLocation,
            hasCompany: !!company,
            officeLocationsCount: company?.attendanceSettings?.officeLocations?.length || 0,
        });

        if (!currentLocation || !company?.attendanceSettings?.officeLocations) {
            console.log('❌ Missing data for location check');
            setIsAtOffice(false);
            setNearestOffice(null);
            return;
        }

        const offices = company.attendanceSettings.officeLocations;
        let foundOffice = null;
        let minDist = Infinity;

        offices.forEach(office => {
            if (!office.isActive) return;

            const dist = locationService.calculateDistance(
                currentLocation.lat,
                currentLocation.lng,
                office.coordinates.lat,
                office.coordinates.lng
            );

            if (dist < minDist) {
                minDist = dist;
                foundOffice = { ...office, distance: dist };
            }
        });

        setNearestOffice(foundOffice);
        setDistance(minDist);

        // Check if within any office radius
        const atOffice = offices.some(office => {
            if (!office.isActive) return false;
            return locationService.isWithinOfficeRadius(
                currentLocation,
                office.coordinates,
                office.radius
            );
        });

        setIsAtOffice(atOffice);
    };

    const fetchTodayStatus = async () => {
        try {
            const response = await axios.get('/api/attendance/today-status', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.data.success && response.data.data) {
                const companyStatus = response.data.data.find(item => {
                    if (!item.company) return false;
                    const itemCompanyId = typeof item.company === 'object'
                        ? item.company._id
                        : item.company;
                    return itemCompanyId === company?._id;
                });

                if (companyStatus) {
                    setAttendanceStatus({
                        hasClockedIn: companyStatus.hasClockedIn || false,
                        hasClockedOut: companyStatus.hasClockedOut || false,
                        clockIn: companyStatus.clockIn || null,
                        clockOut: companyStatus.clockOut || null,
                        totalHours: companyStatus.totalHours || 0,
                        overtime: companyStatus.overtime || 0,
                        lateMinutes: companyStatus.lateMinutes || 0,
                        status: companyStatus.status || 'absent',
                        dutyScheduleId: companyStatus.dutyScheduleId || null
                    });
                } else {
                    setAttendanceStatus({
                        hasClockedIn: false,
                        hasClockedOut: false,
                        clockIn: null,
                        clockOut: null,
                        totalHours: 0,
                        overtime: 0,
                        lateMinutes: 0,
                        status: 'absent',
                        dutyScheduleId: null
                    });
                }
            } else {
                setAttendanceStatus({
                    hasClockedIn: false,
                    hasClockedOut: false,
                    clockIn: null,
                    clockOut: null,
                    totalHours: 0,
                    overtime: 0,
                    lateMinutes: 0,
                    status: 'absent',
                    dutyScheduleId: null
                });
            }
        } catch (error) {
            console.error('❌ Error fetching attendance status:', error);
            setAttendanceStatus({
                hasClockedIn: false,
                hasClockedOut: false,
                clockIn: null,
                clockOut: null,
                totalHours: 0,
                overtime: 0,
                lateMinutes: 0,
                status: 'absent',
                dutyScheduleId: null
            });
        }
    };

    // const checkDutySchedule = async () => {
    //     if (!company?._id || !user?._id) {
    //         console.log('❌ Missing company or user ID for duty schedule check');
    //         setHasDutyForToday(false);
    //         return false;
    //     }

    //     setCheckingDuty(true);
    //     try {
    //         const response = await axios.get('/api/duty-schedule/check-today', {
    //             params: {
    //                 userId: user._id,
    //                 companyId: company._id
    //             },
    //             headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    //         });

    //         if (response.data.success) {
    //             const hasDuty = response.data.hasDuty || false;
    //             setHasDutyForToday(hasDuty);

    //             if (response.data.schedule) {
    //                 setDutySchedule(response.data.schedule);
    //                 setDutyStartTime(response.data.schedule.dutyHours?.startTime || '09:00');
    //                 setDutyEndTime(response.data.schedule.dutyHours?.endTime || '17:00');
    //             } else {
    //                 setDutySchedule(null);
    //             }

    //             return hasDuty;
    //         } else {
    //             console.log('❌ Duty schedule check failed:', response.data.message);
    //             setHasDutyForToday(false);
    //             return false;
    //         }
    //     } catch (error) {
    //         console.error('❌ Error checking duty schedule:', error);
    //         setHasDutyForToday(false);
    //         return false;
    //     } finally {
    //         setCheckingDuty(false);
    //     }
    // };

    const checkDutySchedule = async () => {
        if (!company?._id || !user?._id) {
            console.log('❌ Missing company or user ID for duty schedule check');
            setHasDutyForToday(false);
            return false;
        }

        setCheckingDuty(true);
        try {
            console.log('📅 Checking duty schedule for today:', {
                userId: user._id,
                companyId: company._id,
                currentDate: new Date().toISOString()
            });

            const response = await axios.get('/api/duty-schedule/check-today', {
                params: {
                    userId: user._id,
                    companyId: company._id
                },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            console.log('📊 Duty schedule API response:', response.data);

            if (response.data.success) {
                const hasDuty = response.data.hasDuty || false;
                console.log('✅ Has duty for today:', hasDuty);
                setHasDutyForToday(hasDuty);

                if (response.data.schedule) {
                    console.log('✅ Found duty schedule:', response.data.schedule);
                    setDutySchedule(response.data.schedule);
                    setDutyStartTime(response.data.schedule.dutyHours?.startTime || '09:00');
                    setDutyEndTime(response.data.schedule.dutyHours?.endTime || '17:00');

                    // Also store the office location info if available
                    if (response.data.schedule.officeLocation) {
                        console.log('📍 Office location:', response.data.schedule.officeLocation);
                    }
                } else {
                    console.log('ℹ️ No duty schedule found for today');
                    setDutySchedule(null);
                }

                return hasDuty;
            } else {
                console.log('❌ Duty schedule check failed:', response.data.message);
                setHasDutyForToday(false);
                return false;
            }
        } catch (error) {
            console.error('❌ Error checking duty schedule:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            setHasDutyForToday(false);
            return false;
        } finally {
            setCheckingDuty(false);
        }
    };

    const checkIfCanClockIn = () => {
        // First check if checking duty
        if (checkingDuty) {
            return {
                canClock: false,
                message: 'Checking duty schedule...',
                type: 'info'
            };
        }

        // Check if duty exists
        if (!hasDutyForToday) {
            return {
                canClock: false,
                message: 'No duty schedule assigned for today. Please contact your supervisor.',
                type: 'warning'
            };
        }

        // Check location
        if (!isAtOffice) {
            return {
                canClock: false,
                message: 'You must be at an office location to clock in',
                type: 'warning'
            };
        }

        // Check attendance status
        if (attendanceStatus?.hasClockedIn && !attendanceStatus?.hasClockedOut) {
            return {
                canClock: true,
                canClockOut: true,
                message: 'Ready to clock out',
                type: 'info'
            };
        }

        if (attendanceStatus?.hasClockedIn && attendanceStatus?.hasClockedOut) {
            return {
                canClock: false,
                message: 'Attendance already completed for today',
                type: 'success'
            };
        }

        return {
            canClock: true,
            canClockIn: true,
            message: 'Ready to clock in',
            type: 'info'
        };
    };

    const handleClockIn = async () => {
        const canClock = checkIfCanClockIn();
        if (!canClock.canClock || !canClock.canClockIn) {
            setError(canClock.message);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('/api/attendance/clock-in', {
                location: currentLocation,
                companyId: company._id
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.data.success) {
                fetchTodayStatus();
                if (onAttendanceUpdate) {
                    onAttendanceUpdate(response.data.data);
                }
            }
        } catch (error) {
            console.error('❌ Clock-in error:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.details || 'Clock in failed';
            setError(errorMsg);

            if (error.response?.data?.code === 'NO_DUTY_SCHEDULE') {
                checkDutySchedule();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        if (!isAtOffice) {
            setError('You must be at the office location to clock out');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('/api/attendance/clock-out', {
                location: currentLocation,
                companyId: company._id
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.data.success) {
                fetchTodayStatus();
                if (onAttendanceUpdate) {
                    onAttendanceUpdate(response.data.data);
                }
            }
        } catch (error) {
            console.error('❌ Clock-out error:', error);
            const errorMsg = error.response?.data?.message || 'Clock out failed';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (message, type = 'info') => {
        console.log(`${type}: ${message}`);
    };

    const getStatusBadge = () => {
        if (!attendanceStatus) return null;

        if (attendanceStatus.hasClockedIn && attendanceStatus.hasClockedOut) {
            return (
                <Badge bg="success" className="ms-2">
                    <CheckCircle size={14} className="me-1" />
                    Completed
                </Badge>
            );
        } else if (attendanceStatus.hasClockedIn) {
            return (
                <Badge bg="warning" className="ms-2">
                    <Clock size={14} className="me-1" />
                    Clocked In
                </Badge>
            );
        } else {
            return (
                <Badge bg="secondary" className="ms-2">
                    <Clock size={14} className="me-1" />
                    Not Clocked In
                </Badge>
            );
        }
    };

    const renderDutyScheduleInfo = () => {
        if (checkingDuty) {
            return (
                <div className="text-center py-2">
                    <Spinner animation="border" size="sm" variant="info" />
                    <small className="d-block mt-1 text-muted">Checking duty schedule...</small>
                </div>
            );
        }

        if (!hasDutyForToday) {
            return (
                <Alert variant="warning" className="small py-2 mb-3">
                    <XCircle size={16} className="me-2" />
                    <strong>No Duty Scheduled Today</strong>
                    <div className="mt-1 small">
                        You don't have any duty schedule assigned for today.
                        <br />
                        <strong>Attendance will be disabled.</strong>
                    </div>
                </Alert>
            );
        }

        if (dutySchedule) {
            return (
                <Alert variant="success" className="small py-2 mb-3">
                    <CheckCircle size={16} className="me-2" />
                    <strong>✅ Duty Assigned Today</strong>
                    <div className="mt-1">
                        <div className="d-flex justify-content-between">
                            <span>Schedule:</span>
                            <strong>{dutyStartTime} - {dutyEndTime}</strong>
                        </div>
                        {dutySchedule.officeLocationId && (
                            <div className="d-flex justify-content-between">
                                <span>Office:</span>
                                <strong>{dutySchedule.officeLocation?.name || 'Assigned Office'}</strong>
                            </div>
                        )}
                    </div>
                </Alert>
            );
        }

        return null;
    };

    const renderLocationInfo = () => {
        if (!currentLocation) {
            return (
                <Alert variant="warning" className="small mb-3">
                    <AlertCircle size={16} className="me-2" />
                    Location not available
                    <div className="mt-2 small">
                        <code>Lat: N/A, Lng: N/A</code>
                    </div>
                </Alert>
            );
        }

        if (!isAtOffice && nearestOffice) {
            return (
                <Alert variant="info" className="small mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <span>
                            <MapPin size={14} className="me-2" />
                            {nearestOffice.name}: {Math.round(distance)}m away
                        </span>
                        <Badge bg="light" text="dark">
                            {Math.round(nearestOffice.radius)}m radius
                        </Badge>
                    </div>
                    <small className="text-muted d-block mt-1">
                        You need to be within {Math.round(nearestOffice.radius)} meters to mark attendance
                    </small>
                </Alert>
            );
        }

        if (isAtOffice && nearestOffice) {
            return (
                <Alert variant="success" className="small mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <span>
                            <CheckCircle size={14} className="me-2" />
                            At {nearestOffice.name}
                        </span>
                        <Badge bg="light" text="success">
                            {Math.round(distance)}m from center
                        </Badge>
                    </div>
                    <small className="text-muted d-block mt-1">
                        GPS accuracy: {Math.round(currentLocation.accuracy)} meters
                    </small>
                </Alert>
            );
        }

        if (company && (!company.attendanceSettings?.officeLocations || company.attendanceSettings.officeLocations.length === 0)) {
            return (
                <Alert variant="warning" className="small mb-3">
                    <AlertCircle size={16} className="me-2" />
                    No office locations configured
                    <div className="mt-2 small">
                        Contact your administrator to add office locations
                    </div>
                </Alert>
            );
        }

        return (
            <Alert variant="secondary" className="small mb-3">
                <AlertCircle size={16} className="me-2" />
                Location status unknown
            </Alert>
        );
    };

    const renderAttendanceInfo = () => {
        if (!attendanceStatus) {
            return (
                <div className="text-center py-3">
                    <Spinner animation="border" size="sm" />
                </div>
            );
        }

        const today = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return (
            <div className="attendance-info mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">
                        <Calendar size={16} className="me-2" />
                        {today}
                    </h6>
                    {getStatusBadge()}
                </div>

                {attendanceStatus.clockIn && (
                    <div className="time-info">
                        <div className="d-flex justify-content-between">
                            <span className="text-muted">Clock In:</span>
                            <strong>
                                {new Date(attendanceStatus.clockIn).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                })}
                            </strong>
                        </div>
                        {attendanceStatus.lateMinutes > 0 && (
                            <div className="text-warning small">
                                Late by {attendanceStatus.lateMinutes} minutes
                            </div>
                        )}
                    </div>
                )}

                {attendanceStatus.clockOut && (
                    <div className="time-info mt-2">
                        <div className="d-flex justify-content-between">
                            <span className="text-muted">Clock Out:</span>
                            <strong>
                                {new Date(attendanceStatus.clockOut).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                })}
                            </strong>
                        </div>
                    </div>
                )}

                {attendanceStatus.totalHours > 0 && (
                    <div className="time-info mt-2">
                        <div className="d-flex justify-content-between">
                            <span className="text-muted">Total Hours:</span>
                            <strong>{attendanceStatus.totalHours.toFixed(2)} hrs</strong>
                        </div>
                        {attendanceStatus.overtime > 0 && (
                            <div className="text-success small">
                                +{attendanceStatus.overtime.toFixed(2)} hrs overtime
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderButton = () => {
        const canClock = checkIfCanClockIn();

        // Show loading if checking duty
        if (checkingDuty || initializing) {
            return (
                <Button variant="secondary" disabled className="w-100">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Checking Availability...
                </Button>
            );
        }

        // If no duty, show disabled button
        if (!hasDutyForToday) {
            return (
                <Button
                    variant="outline-secondary"
                    disabled
                    className="w-100"
                >
                    <XCircle className="me-2" />
                    No Duty Today
                </Button>
            );
        }

        // If duty exists but not at office
        if (hasDutyForToday && !isAtOffice) {
            return (
                <Button
                    variant="outline-warning"
                    disabled
                    className="w-100"
                >
                    <MapPin className="me-2" />
                    Go to Office Location
                </Button>
            );
        }

        // If at office with duty but already clocked in
        if (hasDutyForToday && isAtOffice && attendanceStatus?.hasClockedIn && !attendanceStatus?.hasClockedOut) {
            return (
                <Button
                    variant="warning"
                    onClick={handleClockOut}
                    disabled={loading}
                    className="w-100"
                >
                    {loading ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Clock className="me-2" />
                            Clock Out
                        </>
                    )}
                </Button>
            );
        }

        // If at office with duty and not clocked in
        if (hasDutyForToday && isAtOffice && !attendanceStatus?.hasClockedIn) {
            return (
                <Button
                    variant="primary"
                    onClick={handleClockIn}
                    disabled={loading}
                    className="w-100"
                >
                    {loading ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Clock className="me-2" />
                            Clock In
                        </>
                    )}
                </Button>
            );
        }

        // If attendance completed
        if (attendanceStatus?.hasClockedIn && attendanceStatus?.hasClockedOut) {
            return (
                <Button
                    variant="success"
                    disabled
                    className="w-100"
                >
                    <CheckCircle className="me-2" />
                    Attendance Complete
                </Button>
            );
        }

        // Default fallback
        return (
            <Button
                variant="outline-secondary"
                disabled
                className="w-100"
            >
                <Clock className="me-2" />
                Check Duty Schedule
            </Button>
        );
    };

    // Now define useEffect AFTER all function declarations
    useEffect(() => {
        const initialize = async () => {
            setInitializing(true);
            await checkDutySchedule();
            checkLocationStatus();
            await fetchTodayStatus();
            setInitializing(false);
        };

        initialize();

        const interval = setInterval(() => {
            checkDutySchedule();
            checkLocationStatus();
        }, 30000);

        return () => clearInterval(interval);
    }, [currentLocation, company]);

    // Add early return for initial loading
    if (initializing) {
        return (
            <Card className="attendance-card shadow-sm">
                <Card.Body className="text-center py-4">
                    <Spinner animation="border" variant="primary" />
                    <div className="mt-2">Loading attendance information...</div>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="attendance-card shadow-sm">
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                    <Clock className="me-2" />
                    Daily Attendance
                </h5>
                {company?.name && (
                    <Badge bg="info" className="company-badge">
                        {company.name}
                    </Badge>
                )}
            </Card.Header>

            <Card.Body>
                {renderDutyScheduleInfo()}
                {renderLocationInfo()}
                {renderAttendanceInfo()}

                {error && (
                    <Alert variant="danger" className="small py-2">
                        <XCircle size={14} className="me-2" />
                        {error}
                    </Alert>
                )}

                {renderButton()}

                {isAtOffice && hasDutyForToday && !attendanceStatus?.hasClockedIn && (
                    <div className="location-status mt-3">
                        <small className="text-success">
                            <MapPin size={12} className="me-1" />
                            You are at the office location and have duty for today
                        </small>
                    </div>
                )}
            </Card.Body>

            <Card.Footer className="bg-light py-2">
                <small className="text-muted">
                    <Clock size={12} className="me-1" />
                    {checkingDuty ? (
                        <>Checking duty schedule...</>
                    ) : hasDutyForToday && dutyStartTime && dutyEndTime ? (
                        <>Today's Duty: {dutyStartTime} - {dutyEndTime}</>
                    ) : (
                        <>❌ No duty scheduled for today</>
                    )}
                </small>
            </Card.Footer>
        </Card>
    );
};

export default AttendanceButton;