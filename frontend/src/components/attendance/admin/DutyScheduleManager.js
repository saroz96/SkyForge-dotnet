import React, { useState, useEffect } from 'react';
import {
    Card, Button, Form, Row, Col, Table, Badge, Modal, Alert,
    Spinner, OverlayTrigger, Tooltip, Tabs, Tab
} from 'react-bootstrap';
import {
    FaCalendar, FaClock, FaUser, FaBuilding, FaPlus, FaEdit,
    FaTrash, FaMapMarkerAlt, FaInfoCircle, FaEye, FaCalendarCheck,
    FaCalendarDay, FaList, FaChevronRight, FaUsers, FaEnvelope, FaUserCheck, FaUserTimes, FaShieldAlt
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

const DutyScheduleManager = ({ company, user }) => {
    const [schedules, setSchedules] = useState([]);
    const [mySchedules, setMySchedules] = useState([]);
    const [upcomingSchedule, setUpcomingSchedule] = useState(null);
    const [upcomingWeek, setUpcomingWeek] = useState([]);
    const [loading, setLoading] = useState(false);
    const [mySchedulesLoading, setMySchedulesLoading] = useState(false);
    const [selectedUserForView, setSelectedUserForView] = useState(null);
    const [userSchedules, setUserSchedules] = useState([]);
    const [userSchedulesLoading, setUserSchedulesLoading] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [usersLoading, setUsersLoading] = useState(false);
    const [error, setError] = useState(null);
    const [users, setUsers] = useState([]);
    const [officeLocations, setOfficeLocations] = useState([]);
    const [activeTab, setActiveTab] = useState('my-schedule');
    const [formData, setFormData] = useState({
        scheduleType: 'recurring',
        recurringPattern: 'daily',
        weekDays: [],
        monthDays: [],
        specificDates: [],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        dutyHours: {
            startTime: '09:00',
            endTime: '17:00',
            gracePeriod: 15,
            breakDuration: 60
        },
        officeLocationId: '',
        notes: ''
    });

    // Helper to get company ID (handles both _id and Id)
    const getCompanyId = () => {
        return company?.id || company?.Id || company?._id;
    };

    // Helper to get user ID
    const getUserId = () => {
        return user?.id || user?.Id || user?._id;
    };

    // Check if user is admin
    const isAdmin = () => {
        return user?.role === 'Admin' ||
            user?.role === 'ADMINISTRATOR' ||
            user?.role === 'Supervisor' ||
            user?.isAdmin;
    };

    // Reset form function
    const resetForm = () => {
        setFormData({
            scheduleType: 'recurring',
            recurringPattern: 'daily',
            weekDays: [],
            monthDays: [],
            specificDates: [],
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            dutyHours: {
                startTime: '09:00',
                endTime: '17:00',
                gracePeriod: 15,
                breakDuration: 60
            },
            officeLocationId: '',
            notes: ''
        });
        setSelectedUser(null);
    };

    // Fetch schedules (admin view)
    const fetchSchedules = async () => {
        const companyId = getCompanyId();
        if (!companyId) return;

        try {
            setLoading(true);
            console.log('🔍 Fetching schedules for company:', companyId);

            const response = await api.get(`/api/duty-schedule/company/${companyId}`);

            console.log('📋 Schedules API Response:', response.data);

            if (response.data.success) {
                console.log(`✅ Found ${response.data.data?.length || 0} schedules`);
                setSchedules(response.data.data || []);
            } else {
                console.error('❌ API response not successful:', response.data);
                setSchedules([]);
            }
        } catch (error) {
            console.error('❌ Error fetching schedules:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            alert('Failed to fetch schedules: ' + (error.response?.data?.message || error.message));
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch user's own schedules
    const fetchMySchedules = async () => {
        const userId = getUserId();
        const companyId = getCompanyId();
        if (!userId || !companyId) return;

        setMySchedulesLoading(true);
        try {
            console.log('🔍 Fetching my schedules for user:', userId);

            const response = await api.get(`/api/duty-schedule/user/${userId}`, {
                params: {
                    companyId: companyId,
                    activeOnly: true
                }
            });

            console.log('📋 My Schedules API Response:', response.data);

            if (response.data.success) {
                const schedules = response.data.data || [];

                // Filter for active schedules
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const activeSchedules = schedules.filter(schedule => {
                    const endDate = schedule.endDate ? new Date(schedule.endDate) : null;
                    const startDate = new Date(schedule.startDate);

                    return schedule.isActive &&
                        (startDate <= today || !endDate || endDate >= today);
                });

                console.log(`✅ Found ${activeSchedules.length} active schedules`);
                setMySchedules(activeSchedules);

                // Get today's schedule
                await fetchTodaySchedule();
                // Get upcoming week
                await fetchUpcomingWeek();

            } else {
                console.warn('⚠️ No schedule data found');
                setMySchedules([]);
                setUpcomingSchedule(null);
                setUpcomingWeek([]);
            }
        } catch (error) {
            console.error('❌ Error fetching my schedules:', error);
            setMySchedules([]);
            setUpcomingSchedule(null);
            setUpcomingWeek([]);
        } finally {
            setMySchedulesLoading(false);
        }
    };

    // Fetch today's schedule
    const fetchTodaySchedule = async () => {
        const userId = getUserId();
        const companyId = getCompanyId();
        if (!userId || !companyId) return;

        try {
            const response = await api.get('/api/duty-schedule/check-today', {
                params: {
                    userId: userId,
                    companyId: companyId
                }
            });

            console.log('📅 Today schedule response:', response.data);

            if (response.data.success && response.data.hasDuty) {
                setUpcomingSchedule(response.data.schedule);
            } else {
                setUpcomingSchedule(null);
            }
        } catch (error) {
            console.error('Error fetching today schedule:', error);
            setUpcomingSchedule(null);
        }
    };

    // Fetch upcoming week schedule
    const fetchUpcomingWeek = async () => {
        const userId = getUserId();
        const companyId = getCompanyId();
        if (!userId || !companyId) return;

        try {
            const response = await api.get('/api/duty-schedule/upcoming-week', {
                params: {
                    userId: userId,
                    companyId: companyId
                }
            });

            console.log('📅 Upcoming week response:', response.data);

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

    const fetchUsers = async () => {
        const companyId = getCompanyId();
        if (!companyId) {
            console.error('No company ID available');
            setError('No company selected');
            return;
        }

        setUsersLoading(true);
        setError(null);

        try {
            console.log('🔍 Fetching users');

            // Use the correct endpoint - this should match your backend
            const response = await api.get('/api/duty-schedule/admin/users/list');

            console.log('📋 Users API Response:', response.data);

            if (response.data.success && response.data.data && response.data.data.users) {
                const userList = response.data.data.users;

                const mappedUsers = userList.map(u => {
                    const userId = u.id || u.Id || u._id;

                    return {
                        _id: userId,
                        id: userId,
                        name: u.name,
                        email: u.email,
                        role: u.role,
                        isAdmin: u.isAdmin,
                        isActive: u.isActive,
                        isOwner: u.isOwner !== undefined ? u.isOwner : false,
                        preferences: u.preferences || {}
                    };
                });

                console.log(`✅ Found ${mappedUsers.length} users`);
                setUsers(mappedUsers);

            } else {
                console.warn('⚠️ No users data in response or response not successful');
                setError('No users found or unauthorized access');
                setUsers([]);
            }

        } catch (error) {
            console.error('❌ Error fetching users:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            if (error.response?.status === 403) {
                setError('You do not have permission to view users. Only admins and supervisors can access this feature.');
            } else if (error.response?.status === 401) {
                setError('Session expired. Please login again.');
            } else {
                setError('Failed to load users. Please try again.');
            }
        } finally {
            setUsersLoading(false);
        }
    };

    // Fetch specific user's duty schedules
    const fetchUserSchedules = async (userId) => {
        const companyId = getCompanyId();
        if (!userId || !companyId) return;

        setUserSchedulesLoading(true);
        try {
            console.log('🔍 Fetching schedules for user:', userId);

            const response = await api.get(`/api/duty-schedule/user/${userId}`, {
                params: {
                    companyId: companyId,
                }
            });

            console.log('📋 User Schedules API Response:', response.data);

            if (response.data.success) {
                setUserSchedules(response.data.data || []);
                // Find the user details
                const userDetail = users.find(u => u._id === userId || u.id === userId);
                setSelectedUserForView(userDetail);
                setViewMode('user-view');
            } else {
                console.warn('⚠️ No schedule data found for user');
                setUserSchedules([]);
            }
        } catch (error) {
            console.error('❌ Error fetching user schedules:', error);
            alert('Failed to fetch user schedules: ' + (error.response?.data?.message || error.message));
            setUserSchedules([]);
        } finally {
            setUserSchedulesLoading(false);
        }
    };

    // Go back to users list view
    const goBackToUsersList = () => {
        setViewMode('list');
        setSelectedUserForView(null);
        setUserSchedules([]);
    };

    const fetchOfficeLocations = async () => {
        const companyId = getCompanyId();
        if (!companyId) return;

        try {
            const response = await api.get('/api/attendance/office-locations', {
                params: { companyId: companyId }
            });

            console.log('📍 Office locations response:', response.data);

            if (response.data.success) {
                const locations = response.data.data?.officeLocations ||
                    response.data.officeLocations ||
                    response.data.data || [];
                setOfficeLocations(locations);
                console.log(`📍 Found ${locations.length} office locations`);
            }
        } catch (error) {
            console.error('Error fetching office locations:', error);
            setOfficeLocations([]);
        }
    };

    useEffect(() => {
        if (company) {
            fetchUsers();
            fetchOfficeLocations();

            if (isAdmin()) {
                fetchSchedules();
            }

            fetchMySchedules();
        }
    }, [company]);

    useEffect(() => {
        if (company && user && activeTab === 'my-schedule') {
            fetchMySchedules();
        }
    }, [company, user, activeTab]);

    const handleCreateSchedule = async () => {
        const companyId = getCompanyId();
        if (!companyId) {
            alert('Company ID not found');
            return;
        }

        if (!selectedUser) {
            alert('Please select a user');
            return;
        }

        if (!formData.dutyHours.startTime || !formData.dutyHours.endTime) {
            alert('Please enter start and end time');
            return;
        }

        if (formData.scheduleType === 'recurring' && !formData.startDate) {
            alert('Please select a start date for recurring schedule');
            return;
        }

        if (formData.scheduleType === 'specific' && formData.specificDates.length === 0) {
            alert('Please select at least one specific date');
            return;
        }

        try {
            const payload = {
                userId: selectedUser,
                companyId: companyId,
                ...formData
            };

            console.log('📤 Creating schedule with payload:', payload);

            const response = await api.post('/api/duty-schedule/create', payload);

            if (response.data.success) {
                // Refresh schedules based on current view
                if (viewMode === 'user-view' && selectedUserForView) {
                    fetchUserSchedules(selectedUserForView._id || selectedUserForView.id);
                } else {
                    fetchSchedules();
                }

                setShowModal(false);
                resetForm();
                alert('Duty schedule created successfully!');
            }
        } catch (error) {
            console.error('Error creating schedule:', error);
            alert(error.response?.data?.message || 'Failed to create schedule');
        }
    };

    const handleDeleteSchedule = async (scheduleId) => {
        if (!window.confirm('Are you sure you want to delete this schedule?')) {
            return;
        }

        try {
            const response = await api.delete(`/api/duty-schedule/${scheduleId}`);

            if (response.data.success) {
                // Refresh based on current view
                if (viewMode === 'user-view' && selectedUserForView) {
                    fetchUserSchedules(selectedUserForView._id || selectedUserForView.id);
                } else {
                    fetchSchedules();
                }
                alert('Duty schedule deleted successfully!');
            }
        } catch (error) {
            console.error('Error deleting schedule:', error);
            alert(error.response?.data?.message || 'Failed to delete schedule');
        }
    };

    const handleWeekDayToggle = (day) => {
        setFormData(prev => {
            const newWeekDays = prev.weekDays.includes(day)
                ? prev.weekDays.filter(d => d !== day)
                : [...prev.weekDays, day];
            return { ...prev, weekDays: newWeekDays.sort((a, b) => a - b) };
        });
    };

    const handleMonthDayToggle = (day) => {
        setFormData(prev => {
            const newMonthDays = prev.monthDays.includes(day)
                ? prev.monthDays.filter(d => d !== day)
                : [...prev.monthDays, day];
            return { ...prev, monthDays: newMonthDays.sort((a, b) => a - b) };
        });
    };

    const handleSpecificDateAdd = () => {
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({
            ...prev,
            specificDates: [...prev.specificDates, today]
        }));
    };

    const handleSpecificDateRemove = (index) => {
        setFormData(prev => ({
            ...prev,
            specificDates: prev.specificDates.filter((_, i) => i !== index)
        }));
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No date';
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

    const formatScheduleType = (schedule) => {
        if (schedule.scheduleType === 'specific') {
            return `${schedule.specificDates?.length || 0} specific date(s)`;
        } else if (schedule.scheduleType === 'recurring') {
            if (schedule.recurringPattern === 'daily') {
                return 'Daily';
            } else if (schedule.recurringPattern === 'weekly') {
                const days = schedule.weekDays?.map(day => {
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    return dayNames[day];
                }).join(', ');
                return `Weekly (${days})`;
            } else if (schedule.recurringPattern === 'monthly') {
                return `Monthly (Days: ${schedule.monthDays?.join(', ')})`;
            }
        }
        return schedule.scheduleType;
    };

    const formatShortScheduleType = (schedule) => {
        if (schedule.scheduleType === 'specific') {
            return `${schedule.specificDates?.length || 0} date(s)`;
        } else if (schedule.scheduleType === 'recurring') {
            if (schedule.recurringPattern === 'daily') {
                return 'Daily';
            } else if (schedule.recurringPattern === 'weekly') {
                return `Weekly`;
            } else if (schedule.recurringPattern === 'monthly') {
                return `Monthly`;
            }
        }
        return 'Custom';
    };

    const weekDays = [
        { value: 0, label: 'Sunday' },
        { value: 1, label: 'Monday' },
        { value: 2, label: 'Tuesday' },
        { value: 3, label: 'Wednesday' },
        { value: 4, label: 'Thursday' },
        { value: 5, label: 'Friday' },
        { value: 6, label: 'Saturday' }
    ];

    const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);

    // Helper functions for rendering
    const renderUserCell = (schedule) => (
        <div className="d-flex align-items-center">
            <div className="bg-light rounded-circle d-flex align-items-center justify-content-center me-2"
                style={{ width: '32px', height: '32px', minWidth: '32px' }}>
                <FaUser className="text-secondary" size={14} />
            </div>
            <div className="text-nowrap" style={{ minWidth: '140px' }}>
                <div className="fw-semibold text-truncate" style={{ maxWidth: '140px', fontSize: '0.8rem' }}>
                    {schedule.user?.name || 'Unknown'}
                </div>
                <small className="text-muted d-block text-truncate" style={{ maxWidth: '140px', fontSize: '0.7rem' }}>
                    {schedule.user?.email || ''}
                </small>
            </div>
        </div>
    );

    const renderScheduleTypeCell = (schedule) => (
        <OverlayTrigger
            placement="top"
            overlay={
                <Tooltip>
                    {formatScheduleType(schedule)}
                </Tooltip>
            }
        >
            <div className="d-flex align-items-center">
                <FaCalendar className="me-2 text-primary" size={14} />
                <div>
                    <div className="fw-medium" style={{ fontSize: '0.75rem' }}>
                        {formatShortScheduleType(schedule)}
                    </div>
                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                        {schedule.scheduleType === 'recurring' ? 'Recurring' : 'Specific'}
                    </small>
                </div>
            </div>
        </OverlayTrigger>
    );

    const renderDutyHoursCell = (schedule) => (
        <div className="d-flex align-items-center">
            <FaClock className="me-2 text-muted" size={14} />
            <div>
                <div className="fw-medium" style={{ fontSize: '0.75rem' }}>
                    {formatTime(schedule.dutyHours.startTime)} - {formatTime(schedule.dutyHours.endTime)}
                </div>
                <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>
                    {schedule.dutyHours.gracePeriod}m grace • {schedule.dutyHours.breakDuration}m break
                </small>
            </div>
        </div>
    );

    const renderOfficeLocationCell = (schedule) => (
        schedule.officeLocation ? (
            <OverlayTrigger
                placement="top"
                overlay={
                    <Tooltip>
                        {schedule.officeLocation.address || 'No address'}
                    </Tooltip>
                }
            >
                <div className="d-flex align-items-center">
                    <FaMapMarkerAlt className="me-2 text-info" size={14} />
                    <div className="text-truncate" style={{ maxWidth: '120px' }}>
                        <div className="fw-medium" style={{ fontSize: '0.75rem' }}>
                            {schedule.officeLocation.name}
                        </div>
                    </div>
                </div>
            </OverlayTrigger>
        ) : (
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>Any Office</span>
        )
    );

    const renderPeriodCell = (schedule) => (
        <div style={{ fontSize: '0.7rem' }}>
            <div className="fw-medium">
                {new Date(schedule.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            {schedule.endDate ? (
                <>
                    <div className="text-muted" style={{ fontSize: '0.6rem' }}>to</div>
                    <div>
                        {new Date(schedule.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                </>
            ) : (
                <div className="text-muted" style={{ fontSize: '0.6rem' }}>No end date</div>
            )}
        </div>
    );

    // Render Users Tab Content
    const renderUsersTab = () => {
        if (viewMode === 'user-view' && selectedUserForView) {
            return renderUserScheduleView();
        }
        return renderUsersListView();
    };

    // Render Users List View
    const renderUsersListView = () => {
        if (usersLoading) {
            return (
                <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="mt-2 text-muted" style={{ fontSize: '0.8rem' }}>Loading users...</p>
                </div>
            );
        }

        if (error) {
            return (
                <Alert variant="danger" className="mt-2 py-1" style={{ fontSize: '0.8rem' }}>
                    <FaInfoCircle className="me-1" size={12} />
                    {error}
                </Alert>
            );
        }

        if (users.length === 0) {
            return (
                <div className="text-center py-4">
                    <FaUsers size={32} className="text-muted mb-2" />
                    <h6 className="mb-1" style={{ fontSize: '0.9rem' }}>No Users Found</h6>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>No users are registered in this company yet.</p>
                </div>
            );
        }

        const formatRole = (role) => {
            const roleMap = {
                'Admin': { label: 'Admin', variant: 'danger' },
                'ADMINISTRATOR': { label: 'Administrator', variant: 'danger' },
                'Supervisor': { label: 'Supervisor', variant: 'warning' },
                'Account': { label: 'Account', variant: 'info' },
                'Sales': { label: 'Sales', variant: 'success' },
                'Purchase': { label: 'Purchase', variant: 'primary' },
                'User': { label: 'User', variant: 'secondary' }
            };

            const roleInfo = roleMap[role] || { label: role, variant: 'light' };
            return (
                <Badge bg={roleInfo.variant} style={{ fontSize: '0.65rem', padding: '3px 10px' }}>
                    {roleInfo.label}
                </Badge>
            );
        };

        const formatStatus = (isActive) => (
            <Badge bg={isActive ? 'success' : 'secondary'} style={{ fontSize: '0.65rem', padding: '3px 10px' }}>
                {isActive ? 'Active' : 'Inactive'}
            </Badge>
        );

        return (
            <Card className="border-0 shadow-none">
                <Card.Header className="bg-light py-1 px-3 d-flex justify-content-between align-items-center" style={{ minHeight: '36px' }}>
                    <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.8rem' }}>
                        <FaUsers className="me-2" size={14} />
                        Company Users
                    </h6>
                    <div>
                        <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                            Total: {users.length} user{users.length !== 1 ? 's' : ''}
                        </small>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
                        <Table hover className="mb-0 align-middle" style={{ fontSize: '0.75rem' }}>
                            <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={{ padding: '6px 8px' }}>User</th>
                                    <th style={{ padding: '6px 8px' }}>Role</th>
                                    <th style={{ padding: '6px 8px' }}>Email</th>
                                    <th style={{ padding: '6px 8px' }}>Status</th>
                                    <th style={{ padding: '6px 8px' }}>Admin</th>
                                    <th style={{ padding: '6px 8px' }}>Owner</th>
                                    <th style={{ padding: '6px 8px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u._id || u.id}>
                                        <td style={{ padding: '6px 8px' }}>
                                            <div className="d-flex align-items-center">
                                                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center me-2"
                                                    style={{ width: '32px', height: '32px' }}>
                                                    <FaUser className="text-secondary" size={14} />
                                                </div>
                                                <div>
                                                    <div className="fw-semibold" style={{ fontSize: '0.75rem' }}>
                                                        {u.name}
                                                        {u.isOwner && (
                                                            <FaShieldAlt className="ms-1 text-warning" size={12} />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '6px 8px' }}>
                                            {formatRole(u.role)}
                                        </td>
                                        <td style={{ padding: '6px 8px' }}>
                                            <div className="d-flex align-items-center">
                                                <FaEnvelope className="me-2 text-muted" size={12} />
                                                <span className="text-truncate" style={{ maxWidth: '180px', fontSize: '0.7rem' }}>
                                                    {u.email}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '6px 8px' }}>
                                            {formatStatus(u.isActive)}
                                        </td>
                                        <td style={{ padding: '6px 8px' }}>
                                            {u.isAdmin ? (
                                                <Badge bg="success" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
                                                    <FaUserCheck size={10} className="me-1" />
                                                    Yes
                                                </Badge>
                                            ) : (
                                                <Badge bg="secondary" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
                                                    <FaUserTimes size={10} className="me-1" />
                                                    No
                                                </Badge>
                                            )}
                                        </td>
                                        <td style={{ padding: '6px 8px' }}>
                                            {u.isOwner ? (
                                                <Badge bg="warning" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
                                                    Yes
                                                </Badge>
                                            ) : (
                                                <span className="text-muted" style={{ fontSize: '0.65rem' }}>No</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '6px 8px' }}>
                                            <div className="d-flex gap-1">
                                                <OverlayTrigger
                                                    placement="top"
                                                    overlay={<Tooltip style={{ fontSize: '0.65rem' }}>View Schedule</Tooltip>}
                                                >
                                                    <Button
                                                        size="sm"
                                                        variant="outline-info"
                                                        className="d-flex align-items-center justify-content-center"
                                                        style={{ width: '28px', height: '28px', padding: '0' }}
                                                        onClick={() => fetchUserSchedules(u._id || u.id)}
                                                    >
                                                        <FaEye size={12} />
                                                    </Button>
                                                </OverlayTrigger>
                                                <OverlayTrigger
                                                    placement="top"
                                                    overlay={<Tooltip style={{ fontSize: '0.65rem' }}>Assign Schedule</Tooltip>}
                                                >
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        className="d-flex align-items-center justify-content-center"
                                                        style={{ width: '28px', height: '28px', padding: '0' }}
                                                        onClick={() => {
                                                            setSelectedUser(u._id || u.id);
                                                            setShowModal(true);
                                                        }}
                                                    >
                                                        <FaCalendar size={12} />
                                                    </Button>
                                                </OverlayTrigger>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>
        );
    };

    // Render User Schedule View
    const renderUserScheduleView = () => {
        if (userSchedulesLoading) {
            return (
                <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="mt-2 text-muted" style={{ fontSize: '0.8rem' }}>Loading user's schedules...</p>
                </div>
            );
        }

        return (
            <Card className="border-0 shadow-none">
                <Card.Header className="bg-light py-1 px-3 d-flex justify-content-between align-items-center" style={{ minHeight: '38px' }}>
                    <div className="d-flex align-items-center">
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={goBackToUsersList}
                            className="me-2 d-flex align-items-center"
                            style={{ fontSize: '0.7rem', padding: '2px 10px', height: '28px' }}
                        >
                            <FaChevronRight className="rotate-180" size={12} /> Back
                        </Button>
                        <div>
                            <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.8rem' }}>
                                <FaUser className="me-2" size={14} />
                                {selectedUserForView?.name}'s Duty Schedules
                            </h6>
                            <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                                {selectedUserForView?.email} • {selectedUserForView?.role}
                            </small>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                                setSelectedUser(selectedUserForView._id || selectedUserForView.id);
                                setShowModal(true);
                            }}
                            className="d-flex align-items-center"
                            style={{ fontSize: '0.7rem', padding: '2px 12px', height: '28px' }}
                        >
                            <FaPlus size={12} className="me-1" /> Assign New
                        </Button>
                        <Badge bg="info" style={{ fontSize: '0.65rem', padding: '3px 10px' }}>
                            {userSchedules.length} schedule{userSchedules.length !== 1 ? 's' : ''}
                        </Badge>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    {userSchedules.length === 0 ? (
                        <div className="text-center py-4">
                            <FaCalendar size={32} className="text-muted mb-2" />
                            <h6 className="mb-1" style={{ fontSize: '0.9rem' }}>No Duty Schedules Found</h6>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>This user doesn't have any duty schedules assigned yet.</p>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                    setSelectedUser(selectedUserForView._id || selectedUserForView.id);
                                    setShowModal(true);
                                }}
                                className="mt-2 d-flex align-items-center mx-auto"
                                style={{ fontSize: '0.75rem', padding: '4px 14px', height: '30px' }}
                            >
                                <FaPlus size={12} className="me-1" /> Assign First Schedule
                            </Button>
                        </div>
                    ) : (
                        <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
                            <Table hover className="mb-0 align-middle" style={{ fontSize: '0.75rem' }}>
                                <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                    <tr>
                                        <th style={{ padding: '6px 8px', width: '120px' }}>Schedule Type</th>
                                        <th style={{ padding: '6px 8px', width: '160px' }}>Duty Hours</th>
                                        <th style={{ padding: '6px 8px', width: '120px' }}>Office Location</th>
                                        <th style={{ padding: '6px 8px', width: '110px' }}>Period</th>
                                        <th style={{ padding: '6px 8px', width: '90px' }}>Status</th>
                                        <th style={{ padding: '6px 8px', width: '80px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userSchedules.map(schedule => (
                                        <tr key={schedule._id || schedule.id}>
                                            <td style={{ padding: '6px 8px' }}>
                                                <div className="d-flex align-items-center">
                                                    <FaCalendar className="me-2 text-primary" size={12} />
                                                    <div>
                                                        <div className="fw-medium" style={{ fontSize: '0.7rem' }}>
                                                            {formatShortScheduleType(schedule)}
                                                        </div>
                                                        <small className="text-muted" style={{ fontSize: '0.6rem' }}>
                                                            {schedule.scheduleType === 'recurring' ? 'Recurring' : 'Specific'}
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 8px' }}>
                                                <div className="d-flex align-items-center">
                                                    <FaClock className="me-2 text-muted" size={12} />
                                                    <div>
                                                        <div className="fw-medium" style={{ fontSize: '0.7rem' }}>
                                                            {formatTime(schedule.dutyHours.startTime)} - {formatTime(schedule.dutyHours.endTime)}
                                                        </div>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.6rem' }}>
                                                            {schedule.dutyHours.gracePeriod}m grace • {schedule.dutyHours.breakDuration}m break
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 8px' }}>
                                                {schedule.officeLocation ? (
                                                    <div className="d-flex align-items-center">
                                                        <FaMapMarkerAlt className="me-2 text-info" size={12} />
                                                        <div className="text-truncate" style={{ maxWidth: '100px' }}>
                                                            <div className="fw-medium" style={{ fontSize: '0.7rem' }}>
                                                                {schedule.officeLocation.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted" style={{ fontSize: '0.65rem' }}>Any Office</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '6px 8px' }}>
                                                <div style={{ fontSize: '0.65rem' }}>
                                                    <div className="fw-medium">
                                                        {new Date(schedule.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </div>
                                                    {schedule.endDate ? (
                                                        <>
                                                            <div className="text-muted" style={{ fontSize: '0.55rem' }}>to</div>
                                                            <div>
                                                                {new Date(schedule.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-muted" style={{ fontSize: '0.55rem' }}>No end date</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 8px' }}>
                                                <Badge
                                                    bg={schedule.isActive ? 'success' : 'secondary'}
                                                    style={{ fontSize: '0.6rem', padding: '3px 8px' }}
                                                >
                                                    {schedule.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td style={{ padding: '6px 8px' }}>
                                                <div className="d-flex gap-1">
                                                    <OverlayTrigger
                                                        placement="top"
                                                        overlay={<Tooltip style={{ fontSize: '0.65rem' }}>Edit Schedule</Tooltip>}
                                                    >
                                                        <Button
                                                            size="sm"
                                                            variant="outline-primary"
                                                            className="d-flex align-items-center justify-content-center"
                                                            style={{ width: '28px', height: '28px', padding: '0' }}
                                                        >
                                                            <FaEdit size={11} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                    <OverlayTrigger
                                                        placement="top"
                                                        overlay={<Tooltip style={{ fontSize: '0.65rem' }}>Delete Schedule</Tooltip>}
                                                    >
                                                        <Button
                                                            size="sm"
                                                            variant="outline-danger"
                                                            className="d-flex align-items-center justify-content-center"
                                                            style={{ width: '28px', height: '28px', padding: '0' }}
                                                            onClick={() => handleDeleteSchedule(schedule._id || schedule.id)}
                                                        >
                                                            <FaTrash size={11} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>
        );
    };

    return (
        <Card className="border-0 shadow-none">
            <Card.Header className="d-flex justify-content-between align-items-center bg-white border-bottom py-1 px-3" style={{ minHeight: '38px' }}>
                <div>
                    <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
                        <FaCalendar className="me-2 text-primary" size={16} />
                        Duty Schedule Management
                    </h6>
                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                        {activeTab === 'my-schedule' ? 'View your duty schedules' :
                            activeTab === 'admin' ? 'Manage all employee schedules' :
                                'View all company users'}
                    </small>
                </div>
                {isAdmin() && activeTab === 'admin' && (
                    <Button size="sm" variant="primary" onClick={() => setShowModal(true)} className="d-flex align-items-center" style={{ fontSize: '0.7rem', padding: '2px 12px', height: '28px' }}>
                        <FaPlus size={12} className="me-1" /> Create Schedule
                    </Button>
                )}
            </Card.Header>

            <Card.Body className="p-3">
                <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k)}
                    className="mb-3"
                    style={{ fontSize: '0.8rem' }}
                >
                    {isAdmin() && (
                        <Tab eventKey="users" title={
                            <span className="d-flex align-items-center" style={{ fontSize: '0.75rem' }}>
                                <FaUsers size={14} className="me-1" /> Users
                                {users.length > 0 && (
                                    <Badge bg="light" text="dark" className="ms-1" style={{ fontSize: '0.6rem', padding: '1px 8px' }}>
                                        {users.length}
                                    </Badge>
                                )}
                            </span>
                        }>
                            {renderUsersTab()}
                        </Tab>
                    )}
                </Tabs>
            </Card.Body>

            {/* Create Schedule Modal (Admin only) */}
            {isAdmin() && (
                <Modal show={showModal} onHide={() => { setShowModal(false); resetForm(); }} size="lg" centered>
                    <Modal.Header closeButton className="bg-light py-2">
                        <Modal.Title className="d-flex align-items-center" style={{ fontSize: '1rem' }}>
                            <FaCalendar className="me-2 text-primary" size={18} />
                            Create Duty Schedule
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold" style={{ fontSize: '0.85rem' }}>Select Employee</Form.Label>
                                <Form.Select
                                    value={selectedUser || ''}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    required
                                    size="sm"
                                    style={{ fontSize: '0.8rem' }}
                                >
                                    <option value="">Select an employee</option>
                                    {users.map(u => (
                                        <option key={u._id || u.id} value={u._id || u.id}>
                                            {u.name} - {u.role || 'Employee'} ({u.email})
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    Select the employee for whom you want to create a duty schedule
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold" style={{ fontSize: '0.85rem' }}>Schedule Type</Form.Label>
                                <div className="d-flex gap-3">
                                    <Form.Check
                                        type="radio"
                                        id="recurring"
                                        label="Recurring Schedule"
                                        name="scheduleType"
                                        checked={formData.scheduleType === 'recurring'}
                                        onChange={() => setFormData({ ...formData, scheduleType: 'recurring' })}
                                        style={{ fontSize: '0.8rem' }}
                                    />
                                    <Form.Check
                                        type="radio"
                                        id="specific"
                                        label="Specific Dates"
                                        name="scheduleType"
                                        checked={formData.scheduleType === 'specific'}
                                        onChange={() => setFormData({ ...formData, scheduleType: 'specific' })}
                                        style={{ fontSize: '0.8rem' }}
                                    />
                                </div>
                            </Form.Group>

                            {formData.scheduleType === 'recurring' && (
                                <>
                                    <Form.Group className="mb-3">
                                        <Form.Label style={{ fontSize: '0.85rem' }}>Recurring Pattern</Form.Label>
                                        <div className="d-flex flex-wrap gap-2">
                                            <Form.Check
                                                type="radio"
                                                id="daily"
                                                label="Daily"
                                                name="recurringPattern"
                                                checked={formData.recurringPattern === 'daily'}
                                                onChange={() => setFormData({ ...formData, recurringPattern: 'daily' })}
                                                className="me-2"
                                                style={{ fontSize: '0.8rem' }}
                                            />
                                            <Form.Check
                                                type="radio"
                                                id="weekly"
                                                label="Weekly"
                                                name="recurringPattern"
                                                checked={formData.recurringPattern === 'weekly'}
                                                onChange={() => setFormData({ ...formData, recurringPattern: 'weekly' })}
                                                className="me-2"
                                                style={{ fontSize: '0.8rem' }}
                                            />
                                            <Form.Check
                                                type="radio"
                                                id="monthly"
                                                label="Monthly"
                                                name="recurringPattern"
                                                checked={formData.recurringPattern === 'monthly'}
                                                onChange={() => setFormData({ ...formData, recurringPattern: 'monthly' })}
                                                style={{ fontSize: '0.8rem' }}
                                            />
                                        </div>
                                    </Form.Group>

                                    {formData.recurringPattern === 'weekly' && (
                                        <Form.Group className="mb-3">
                                            <Form.Label style={{ fontSize: '0.85rem' }}>Select Days of Week</Form.Label>
                                            <div className="d-flex flex-wrap gap-1">
                                                {weekDays.map(day => (
                                                    <Button
                                                        key={day.value}
                                                        variant={formData.weekDays.includes(day.value) ? 'primary' : 'outline-secondary'}
                                                        size="sm"
                                                        onClick={() => handleWeekDayToggle(day.value)}
                                                        type="button"
                                                        style={{ fontSize: '0.7rem', padding: '2px 8px', height: '28px' }}
                                                    >
                                                        {day.label.slice(0, 3)}
                                                    </Button>
                                                ))}
                                            </div>
                                        </Form.Group>
                                    )}

                                    {formData.recurringPattern === 'monthly' && (
                                        <Form.Group className="mb-3">
                                            <Form.Label style={{ fontSize: '0.85rem' }}>Select Days of Month</Form.Label>
                                            <div className="d-flex flex-wrap gap-1" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                                {monthDays.map(day => (
                                                    <Button
                                                        key={day}
                                                        variant={formData.monthDays.includes(day) ? 'primary' : 'outline-secondary'}
                                                        size="sm"
                                                        onClick={() => handleMonthDayToggle(day)}
                                                        type="button"
                                                        style={{ width: '32px', height: '28px', fontSize: '0.65rem', padding: '0' }}
                                                    >
                                                        {day}
                                                    </Button>
                                                ))}
                                            </div>
                                        </Form.Group>
                                    )}

                                    <Row className="g-2">
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label style={{ fontSize: '0.85rem' }}>Start Date</Form.Label>
                                                <Form.Control
                                                    type="date"
                                                    value={formData.startDate}
                                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                    required
                                                    size="sm"
                                                    style={{ fontSize: '0.8rem', height: '32px' }}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label style={{ fontSize: '0.85rem' }}>End Date</Form.Label>
                                                <Form.Control
                                                    type="date"
                                                    value={formData.endDate}
                                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                    required
                                                    size="sm"
                                                    style={{ fontSize: '0.8rem', height: '32px' }}
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </>
                            )}

                            {formData.scheduleType === 'specific' && (
                                <Form.Group className="mb-3">
                                    <Form.Label style={{ fontSize: '0.85rem' }}>Select Specific Dates</Form.Label>
                                    <div className="d-flex align-items-center mb-2">
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={handleSpecificDateAdd}
                                            type="button"
                                            className="d-flex align-items-center"
                                            style={{ fontSize: '0.7rem', padding: '2px 10px', height: '28px' }}
                                        >
                                            <FaPlus size={12} className="me-1" /> Add Date
                                        </Button>
                                    </div>
                                    <div className="border rounded p-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                        {formData.specificDates.length === 0 ? (
                                            <div className="text-muted text-center py-2" style={{ fontSize: '0.75rem' }}>
                                                No dates selected. Click "Add Date" to add dates.
                                            </div>
                                        ) : (
                                            formData.specificDates.map((date, index) => (
                                                <div key={index} className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.75rem' }}>
                                                    <div>
                                                        <FaCalendar className="me-2 text-muted" size={12} />
                                                        {new Date(date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </div>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleSpecificDateRemove(index)}
                                                        type="button"
                                                        style={{ fontSize: '0.6rem', padding: '1px 6px', height: '22px' }}
                                                    >
                                                        <FaTrash size={10} />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Form.Group>
                            )}

                            <div className="border-top pt-3 mt-3">
                                <h6 className="mb-3 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
                                    <FaClock className="me-2 text-primary" size={14} />
                                    Duty Hours
                                </h6>
                                <Row className="g-2">
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label style={{ fontSize: '0.8rem' }}>Start Time</Form.Label>
                                            <Form.Control
                                                type="time"
                                                value={formData.dutyHours.startTime}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    dutyHours: { ...formData.dutyHours, startTime: e.target.value }
                                                })}
                                                required
                                                size="sm"
                                                style={{ fontSize: '0.8rem', height: '32px' }}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label style={{ fontSize: '0.8rem' }}>End Time</Form.Label>
                                            <Form.Control
                                                type="time"
                                                value={formData.dutyHours.endTime}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    dutyHours: { ...formData.dutyHours, endTime: e.target.value }
                                                })}
                                                required
                                                size="sm"
                                                style={{ fontSize: '0.8rem', height: '32px' }}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label style={{ fontSize: '0.8rem' }}>Grace Period (minutes)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={formData.dutyHours.gracePeriod}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    dutyHours: { ...formData.dutyHours, gracePeriod: parseInt(e.target.value) || 15 }
                                                })}
                                                size="sm"
                                                style={{ fontSize: '0.8rem', height: '32px' }}
                                            />
                                            <Form.Text className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                Allowed late minutes before marking as late
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label style={{ fontSize: '0.8rem' }}>Break Duration (minutes)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                min="0"
                                                value={formData.dutyHours.breakDuration}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    dutyHours: { ...formData.dutyHours, breakDuration: parseInt(e.target.value) || 60 }
                                                })}
                                                size="sm"
                                                style={{ fontSize: '0.8rem', height: '32px' }}
                                            />
                                            <Form.Text className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                Break time included in total hours calculation
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </div>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold" style={{ fontSize: '0.85rem' }}>Office Location (Optional)</Form.Label>
                                <Form.Select
                                    value={formData.officeLocationId || ''}
                                    onChange={(e) => {
                                        const locationId = e.target.value;
                                        const selectedLocation = officeLocations.find(loc =>
                                            loc._id === locationId || loc.id === locationId
                                        );

                                        setFormData({
                                            ...formData,
                                            officeLocationId: locationId,
                                            selectedLocation: selectedLocation || null
                                        });
                                    }}
                                    size="sm"
                                    style={{ fontSize: '0.8rem', height: '32px' }}
                                >
                                    <option value="">Any Office Location</option>
                                    {officeLocations.map(location => (
                                        <option key={location._id || location.id} value={location._id || location.id}>
                                            {location.name} - {location.address || 'No address'}
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted" style={{ fontSize: '0.7rem' }}>
                                    Select specific office location. Leave empty for any office.
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold" style={{ fontSize: '0.85rem' }}>Notes (Optional)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Add any notes about this schedule..."
                                    size="sm"
                                    style={{ fontSize: '0.8rem' }}
                                />
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer className="bg-light py-2">
                        <Button variant="outline-secondary" onClick={() => { setShowModal(false); resetForm(); }} size="sm" style={{ fontSize: '0.8rem' }}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleCreateSchedule} size="sm" className="px-4" style={{ fontSize: '0.8rem' }}>
                            Create Schedule
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}
        </Card>
    );
};

export default DutyScheduleManager;