import React, { useState, useEffect } from 'react';
import { Button, Card, Alert, Spinner, Badge } from 'react-bootstrap';
import { Clock, MapPin, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';
import axios from 'axios';
import '../../stylesheet/attendance/AttendanceButton.css';
import locationService from '../services/locationService';

// Create axios instance with auth interceptor
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
    const [dataFetched, setDataFetched] = useState(false);

    // Helper to get company ID
    const getCompanyId = () => {
        return company?.id || company?.Id || company?._id;
    };

    // Helper to get user ID
    const getUserId = () => {
        return user?.id || user?.Id || user?._id;
    };

    const checkLocationStatus = () => {
        const effectiveLocation = currentLocation;
        console.log('🔍 Checking location status with:', effectiveLocation);

        // Check if location is valid
        if (!effectiveLocation ||
            effectiveLocation.lat === undefined ||
            effectiveLocation.lng === undefined ||
            effectiveLocation.lat === 0 ||
            effectiveLocation.lng === 0) {
            console.log('❌ Invalid location data');
            setIsAtOffice(false);
            setNearestOffice(null);
            return;
        }

        if (!company?.attendanceSettings?.officeLocations) {
            console.log('❌ Missing office locations');
            setIsAtOffice(false);
            setNearestOffice(null);
            return;
        }

        const offices = company.attendanceSettings.officeLocations;
        let foundOffice = null;
        let minDist = Infinity;

        offices.forEach(office => {
            if (!office.isActive) return;

            let officeLat, officeLng;

            if (office.coordinates && office.coordinates.lat !== undefined && office.coordinates.lng !== undefined) {
                officeLat = office.coordinates.lat;
                officeLng = office.coordinates.lng;
                console.log('📍 Using nested coordinates for:', office.name);
            } else if (office.lat !== undefined && office.lng !== undefined) {
                officeLat = office.lat;
                officeLng = office.lng;
                console.log('📍 Using direct coordinates for:', office.name);
            } else {
                console.warn('⚠️ Office missing coordinates:', office);
                return;
            }

            if (officeLat === undefined || officeLat === null ||
                officeLng === undefined || officeLng === null ||
                officeLat === 0 || officeLng === 0) {
                console.warn('⚠️ Office has invalid coordinates:', office);
                return;
            }

            const dist = locationService.calculateDistance(
                effectiveLocation.lat,
                effectiveLocation.lng,
                officeLat,
                officeLng
            );

            console.log(`📏 Distance to ${office.name}: ${Math.round(dist)}m (radius: ${office.radius}m)`);

            if (dist < minDist) {
                minDist = dist;
                foundOffice = {
                    ...office,
                    distance: dist,
                    coordinates: { lat: officeLat, lng: officeLng }
                };
            }
        });

        setNearestOffice(foundOffice);
        setDistance(minDist);

        const atOffice = offices.some(office => {
            if (!office.isActive) return false;

            let officeLat, officeLng;
            if (office.coordinates && office.coordinates.lat !== undefined && office.coordinates.lng !== undefined) {
                officeLat = office.coordinates.lat;
                officeLng = office.coordinates.lng;
            } else if (office.lat !== undefined && office.lng !== undefined) {
                officeLat = office.lat;
                officeLng = office.lng;
            } else {
                return false;
            }

            if (officeLat === undefined || officeLat === null ||
                officeLng === undefined || officeLng === null) {
                return false;
            }

            return locationService.isWithinOfficeRadius(
                effectiveLocation,
                { lat: officeLat, lng: officeLng },
                office.radius || 100
            );
        });

        console.log(`📍 Is at office: ${atOffice}, nearest office: ${foundOffice?.name || 'none'}`);
        setIsAtOffice(atOffice);
    };

    const fetchTodayStatus = async () => {
        try {
            const response = await api.get('/api/attendance/today-status');

            if (response.data.success && response.data.data) {
                const companyStatus = response.data.data.find(item => {
                    if (!item.company) return false;
                    const itemCompanyId = typeof item.company === 'object'
                        ? (item.company.id || item.company._id)
                        : item.company;
                    const currentCompanyId = getCompanyId();
                    return itemCompanyId === currentCompanyId;
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

    const checkDutySchedule = async () => {
        const userId = getUserId();
        const companyId = getCompanyId();

        if (!companyId || !userId) {
            console.log('❌ Missing company or user ID for duty schedule check');
            setHasDutyForToday(false);
            setDutySchedule(null);
            return false;
        }

        setCheckingDuty(true);
        try {
            console.log('📅 Checking duty schedule for today:', {
                userId: userId,
                companyId: companyId,
                currentDate: new Date().toISOString()
            });

            const response = await api.get('/api/duty-schedule/check-today', {
                params: {
                    userId: userId,
                    companyId: companyId
                }
            });

            console.log('📊 Duty schedule API response:', response.data);

            if (response.data.success) {
                const hasDuty = response.data.hasDuty || false;
                console.log('✅ Has duty for today:', hasDuty);
                setHasDutyForToday(hasDuty);

                if (hasDuty && response.data.schedule) {
                    console.log('✅ Found duty schedule:', response.data.schedule);
                    const schedule = response.data.schedule;
                    setDutySchedule(schedule);
                    setDutyStartTime(schedule.dutyHours?.startTime || '09:00');
                    setDutyEndTime(schedule.dutyHours?.endTime || '17:00');
                } else {
                    console.log('ℹ️ No duty schedule found for today');
                    setDutySchedule(null);
                    setDutyStartTime(null);
                    setDutyEndTime(null);
                }

                return hasDuty;
            } else {
                console.log('❌ Duty schedule check failed:', response.data.message);
                setHasDutyForToday(false);
                setDutySchedule(null);
                return false;
            }
        } catch (error) {
            console.error('❌ Error checking duty schedule:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            setHasDutyForToday(false);
            setDutySchedule(null);
            return false;
        } finally {
            setCheckingDuty(false);
        }
    };

    const checkIfCanClockIn = () => {
        if (checkingDuty) {
            return {
                canClock: false,
                message: 'Checking duty schedule...',
                type: 'info'
            };
        }

        if (!hasDutyForToday) {
            return {
                canClock: false,
                message: 'No duty schedule assigned for today. Please contact your supervisor.',
                type: 'warning'
            };
        }

        if (!isAtOffice) {
            return {
                canClock: false,
                message: 'You must be at an office location to clock in',
                type: 'warning'
            };
        }

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

        const companyId = getCompanyId();
        if (!companyId) {
            setError('Company ID not found');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/api/attendance/clock-in', {
                location: currentLocation,
                companyId: companyId
            });

            if (response.data.success) {
                await fetchTodayStatus();
                if (onAttendanceUpdate) {
                    onAttendanceUpdate(response.data.data);
                }
            }
        } catch (error) {
            console.error('❌ Clock-in error:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.details || 'Clock in failed';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        const companyId = getCompanyId();
        if (!companyId) {
            setError('Company ID not found');
            return;
        }

        if (!isAtOffice) {
            setError('You must be at the office location to clock out');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/api/attendance/clock-out', {
                location: currentLocation,
                companyId: companyId
            });

            if (response.data.success) {
                await fetchTodayStatus();
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

    const getStatusBadge = () => {
        if (!attendanceStatus) return null;

        if (attendanceStatus.hasClockedIn && attendanceStatus.hasClockedOut) {
            return (
                <Badge bg="success" className="ms-1" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                    <CheckCircle size={14} className="me-1" />
                    Completed
                </Badge>
            );
        } else if (attendanceStatus.hasClockedIn) {
            return (
                <Badge bg="warning" className="ms-1" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                    <Clock size={14} className="me-1" />
                    Clocked In
                </Badge>
            );
        } else {
            return (
                <Badge bg="secondary" className="ms-1" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                    <Clock size={14} className="me-1" />
                    Not Clocked In
                </Badge>
            );
        }
    };

    const renderDutyScheduleInfo = () => {
        if (checkingDuty) {
            return (
                <div className="text-center py-1">
                    <Spinner animation="border" size="sm" variant="info" style={{ width: '18px', height: '18px' }} />
                    <small className="d-block mt-1 text-muted" style={{ fontSize: '0.75rem' }}>Checking duty schedule...</small>
                </div>
            );
        }

        if (!hasDutyForToday) {
            return (
                <Alert variant="warning" className="py-1 px-3 mb-2" style={{ fontSize: '0.75rem' }}>
                    <XCircle size={16} className="me-1" />
                    <strong>No Duty Scheduled Today</strong>
                    {/* <div className="mt-1" style={{ fontSize: '0.7rem' }}>
                        You don't have any duty schedule assigned for today.
                        <br />
                        <strong>Attendance will be disabled.</strong>
                    </div> */}
                </Alert>
            );
        }

        if (dutySchedule) {
            return (
                <Alert variant="success" className="py-1 px-3 mb-2" style={{ fontSize: '0.75rem' }}>
                    <div className="d-flex align-items-center mb-1">
                        <CheckCircle size={16} className="me-1" />
                        <strong>Duty Assigned Today</strong>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(40, 167, 69, 0.2)', paddingTop: '6px' }}>
                        <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
                            <span>Schedule:</span>
                            <strong>{dutyStartTime} - {dutyEndTime}</strong>
                        </div>
                        {dutySchedule.officeLocationId && (
                            <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
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
                <Alert variant="warning" className="py-1 px-3 mb-2" style={{ fontSize: '0.75rem' }}>
                    <AlertCircle size={16} className="me-1" />
                    Location not available
                    <div className="mt-1" style={{ fontSize: '0.7rem' }}>
                        <code>Lat: N/A, Lng: N/A</code>
                    </div>
                </Alert>
            );
        }

        if (!isAtOffice && nearestOffice) {
            return (
                <Alert variant="info" className="py-1 px-3 mb-2" style={{ fontSize: '0.75rem' }}>
                    <div className="d-flex justify-content-between align-items-center">
                        <span>
                            <MapPin size={16} className="me-1" />
                            {nearestOffice.name}: {Math.round(distance)}m away
                        </span>
                        <Badge bg="light" text="dark" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                            {Math.round(nearestOffice.radius)}m radius
                        </Badge>
                    </div>
                    <small className="text-muted d-block mt-1" style={{ fontSize: '0.65rem' }}>
                        You need to be within {Math.round(nearestOffice.radius)} meters to mark attendance
                    </small>
                </Alert>
            );
        }

        if (isAtOffice && nearestOffice) {
            return (
                <Alert variant="success" className="py-1 px-3 mb-2" style={{ fontSize: '0.75rem' }}>
                    <div className="d-flex justify-content-between align-items-center">
                        <span>
                            <CheckCircle size={16} className="me-1" />
                            At {nearestOffice.name}
                        </span>
                        <Badge bg="light" text="success" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                            {Math.round(distance)}m from center
                        </Badge>
                    </div>
                    <small className="text-muted d-block mt-1" style={{ fontSize: '0.65rem' }}>
                        GPS accuracy: {Math.round(currentLocation.accuracy)} meters
                    </small>
                </Alert>
            );
        }

        if (company && (!company.attendanceSettings?.officeLocations || company.attendanceSettings.officeLocations.length === 0)) {
            return (
                <Alert variant="warning" className="py-1 px-3 mb-2" style={{ fontSize: '0.75rem' }}>
                    <AlertCircle size={16} className="me-1" />
                    No office locations configured
                    <div className="mt-1" style={{ fontSize: '0.7rem' }}>
                        Contact your administrator to add office locations
                    </div>
                </Alert>
            );
        }

        return (
            <Alert variant="secondary" className="py-1 px-3 mb-2" style={{ fontSize: '0.75rem' }}>
                <AlertCircle size={16} className="me-1" />
                Location status unknown
            </Alert>
        );
    };

    const renderAttendanceInfo = () => {
        if (!attendanceStatus) {
            return (
                <div className="text-center py-2">
                    <Spinner animation="border" size="sm" style={{ width: '18px', height: '18px' }} />
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
            <div className="attendance-info mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                    <h6 className="mb-0" style={{ fontSize: '0.8rem' }}>
                        <Calendar size={16} className="me-1" />
                        {today}
                    </h6>
                    {getStatusBadge()}
                </div>

                {attendanceStatus.clockIn && (
                    <div className="time-info" style={{ fontSize: '0.75rem' }}>
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
                            <div className="text-warning" style={{ fontSize: '0.7rem' }}>
                                Late by {attendanceStatus.lateMinutes} minutes
                            </div>
                        )}
                    </div>
                )}

                {attendanceStatus.clockOut && (
                    <div className="time-info mt-1" style={{ fontSize: '0.75rem' }}>
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
                    <div className="time-info mt-1" style={{ fontSize: '0.75rem' }}>
                        <div className="d-flex justify-content-between">
                            <span className="text-muted">Total Hours:</span>
                            <strong>{attendanceStatus.totalHours.toFixed(2)} hrs</strong>
                        </div>
                        {attendanceStatus.overtime > 0 && (
                            <div className="text-success" style={{ fontSize: '0.7rem' }}>
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

        if (checkingDuty || initializing) {
            return (
                <Button variant="secondary" disabled className="w-100" style={{ fontSize: '0.8rem', height: '38px' }}>
                    <Spinner animation="border" size="sm" className="me-2" style={{ width: '16px', height: '16px' }} />
                    Checking Availability...
                </Button>
            );
        }

        if (!hasDutyForToday) {
            return (
                <Button
                    variant="outline-secondary"
                    disabled
                    className="w-100"
                    style={{ fontSize: '0.8rem', height: '38px' }}
                >
                    <XCircle size={18} className="me-2" />
                    No Duty Today
                </Button>
            );
        }

        if (hasDutyForToday && !isAtOffice) {
            return (
                <Button
                    variant="outline-warning"
                    disabled
                    className="w-100"
                    style={{ fontSize: '0.8rem', height: '38px' }}
                >
                    <MapPin size={18} className="me-2" />
                    Go to Office Location
                </Button>
            );
        }

        if (hasDutyForToday && isAtOffice && attendanceStatus?.hasClockedIn && !attendanceStatus?.hasClockedOut) {
            return (
                <Button
                    variant="warning"
                    onClick={handleClockOut}
                    disabled={loading}
                    className="w-100"
                    style={{ fontSize: '0.8rem', height: '38px' }}
                >
                    {loading ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" style={{ width: '16px', height: '16px' }} />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Clock size={18} className="me-2" />
                            Clock Out
                        </>
                    )}
                </Button>
            );
        }

        if (hasDutyForToday && isAtOffice && !attendanceStatus?.hasClockedIn) {
            return (
                <Button
                    variant="primary"
                    onClick={handleClockIn}
                    disabled={loading}
                    className="w-100"
                    style={{ fontSize: '0.8rem', height: '38px' }}
                >
                    {loading ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" style={{ width: '16px', height: '16px' }} />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Clock size={18} className="me-2" />
                            Clock In
                        </>
                    )}
                </Button>
            );
        }

        if (attendanceStatus?.hasClockedIn && attendanceStatus?.hasClockedOut) {
            return (
                <Button
                    variant="success"
                    disabled
                    className="w-100"
                    style={{ fontSize: '0.8rem', height: '38px' }}
                >
                    <CheckCircle size={18} className="me-2" />
                    Attendance Complete
                </Button>
            );
        }

        return (
            <Button
                variant="outline-secondary"
                disabled
                className="w-100"
                style={{ fontSize: '0.8rem', height: '38px' }}
            >
                <Clock size={18} className="me-2" />
                Check Duty Schedule
            </Button>
        );
    };

    // Initialize on component mount only - NO interval refresh
    useEffect(() => {
        const initialize = async () => {
            setInitializing(true);
            const hasDuty = await checkDutySchedule();
            console.log('📋 Initial duty check result:', hasDuty);
            checkLocationStatus();
            await fetchTodayStatus();
            setInitializing(false);
            setDataFetched(true);
        };

        // Only fetch if data hasn't been fetched yet
        if (!dataFetched) {
            initialize();
        }
    }, [company, user]); // Only re-run if company or user changes

    // Re-check location when currentLocation changes (but only after initial load)
    useEffect(() => {
        if (currentLocation && dataFetched) {
            checkLocationStatus();
        }
    }, [currentLocation]);

    // If initializing, show loading
    if (initializing) {
        return (
            <Card className="attendance-card shadow-sm border-0">
                <Card.Body className="text-center py-3">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <div className="mt-2 text-muted" style={{ fontSize: '0.8rem' }}>Loading attendance information...</div>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="attendance-card shadow-sm border-0">
            <Card.Header className="bg-light py-1 px-3 d-flex justify-content-between align-items-center" style={{ minHeight: '40px' }}>
                <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
                    <Clock size={18} className="me-2" />
                    Daily Attendance
                </h6>
            </Card.Header>

            <Card.Body className="p-3">
                {renderDutyScheduleInfo()}
                {renderLocationInfo()}
                {renderAttendanceInfo()}

                {error && (
                    <Alert variant="danger" className="py-1 px-3 mb-2" style={{ fontSize: '0.75rem' }}>
                        <XCircle size={16} className="me-1" />
                        {error}
                    </Alert>
                )}

                {renderButton()}

                {isAtOffice && hasDutyForToday && !attendanceStatus?.hasClockedIn && (
                    <div className="location-status mt-2">
                        <small className="text-success d-flex align-items-center" style={{ fontSize: '0.7rem' }}>
                            <MapPin size={14} className="me-1" />
                            You are at the office location
                        </small>
                    </div>
                )}
            </Card.Body>

            <Card.Footer className="bg-light py-1 px-3" style={{ minHeight: '32px' }}>
                <small className="text-muted d-flex align-items-center" style={{ fontSize: '0.7rem' }}>
                    <Clock size={14} className="me-1" />
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