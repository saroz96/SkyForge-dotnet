import React, { useState, useEffect } from 'react';
import { 
    Card, Button, Form, Row, Col, Table, Badge, Modal, Alert, 
    Spinner, OverlayTrigger, Tooltip, Tabs, Tab 
} from 'react-bootstrap';
import { 
    FaCalendar, FaClock, FaUser, FaBuilding, FaPlus, FaEdit, 
    FaTrash, FaMapMarkerAlt, FaInfoCircle, FaEye, FaCalendarCheck,
    FaCalendarDay, FaList, FaChevronRight,  FaUsers, FaEnvelope, FaUserCheck, FaUserTimes, FaShieldAlt
} from 'react-icons/fa';
import axios from 'axios';

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
const [viewMode, setViewMode] = useState('list'); // 'list' or 'user-view'
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [usersLoading, setUsersLoading] = useState(false);
    const [error, setError] = useState(null);
    const [users, setUsers] = useState([]);
    const [officeLocations, setOfficeLocations] = useState([]);
    const [activeTab, setActiveTab] = useState('my-schedule'); // 'my-schedule' or 'admin'
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
        try {
            setLoading(true);
            console.log('🔍 Fetching schedules for company:', company._id);

            const response = await axios.get(`/api/duty-schedule/company/${company._id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

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
        if (!user || !company) return;

        setMySchedulesLoading(true);
        try {
            console.log('🔍 Fetching my schedules for user:', user._id);

            const response = await axios.get(`/api/duty-schedule/user/${user._id}`, {
                params: { 
                    companyId: company._id,
                    activeOnly: true 
                },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
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
        if (!user || !company) return;

        try {
            const response = await axios.get('/api/duty-schedule/check-today', {
                params: {
                    userId: user._id,
                    companyId: company._id
                },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
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
        if (!user || !company) return;

        try {
            const response = await axios.get('/api/duty-schedule/upcoming-week', {
                params: {
                    userId: user._id,
                    companyId: company._id
                },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
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
        if (!company || !company._id) {
            console.error('No company ID available');
            setError('No company selected');
            return;
        }

        setUsersLoading(true);
        setError(null);

        try {
            console.log('🔍 Fetching users from /api/duty-schedule/admin/users/list');

            const response = await axios.get('/api/duty-schedule/admin/users/list', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            console.log('📋 Users API Response:', response.data);

            if (response.data.success && response.data.data && response.data.data.users) {
                const userList = response.data.data.users;

                const mappedUsers = userList.map(user => {
                    const userId = user._id || user.id;

                    return {
                        _id: userId,
                        id: userId,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        isAdmin: user.isAdmin,
                        isActive: user.isActive,
                        isOwner: user.isOwner !== undefined ? user.isOwner : false,
                        preferences: user.preferences || {}
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
    if (!userId || !company) return;

    setUserSchedulesLoading(true);
    try {
        console.log('🔍 Fetching schedules for user:', userId);

        const response = await axios.get(`/api/duty-schedule/user/${userId}`, {
            params: { 
                companyId: company._id,
            },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        console.log('📋 User Schedules API Response:', response.data);

        if (response.data.success) {
            setUserSchedules(response.data.data || []);
            // Find the user details
            const userDetail = users.find(u => u._id === userId);
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
        try {
            const response = await axios.get('/api/attendance/office-locations', {
                params: { companyId: company._id },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
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

    // const handleCreateSchedule = async () => {
    //     if (!selectedUser) {
    //         alert('Please select a user');
    //         return;
    //     }

    //     if (!formData.dutyHours.startTime || !formData.dutyHours.endTime) {
    //         alert('Please enter start and end time');
    //         return;
    //     }

    //     if (formData.scheduleType === 'recurring' && !formData.startDate) {
    //         alert('Please select a start date for recurring schedule');
    //         return;
    //     }

    //     if (formData.scheduleType === 'specific' && formData.specificDates.length === 0) {
    //         alert('Please select at least one specific date');
    //         return;
    //     }

    //     try {
    //         const response = await axios.post('/api/duty-schedule/create', {
    //             userId: selectedUser,
    //             companyId: company._id,
    //             ...formData
    //         }, {
    //             headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    //         });

    //         if (response.data.success) {
    //             fetchSchedules();
    //             setShowModal(false);
    //             resetForm();
    //             alert('Duty schedule created successfully!');
    //         }
    //     } catch (error) {
    //         console.error('Error creating schedule:', error);
    //         alert(error.response?.data?.message || 'Failed to create schedule');
    //     }
    // };

    const handleCreateSchedule = async () => {
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
        const response = await axios.post('/api/duty-schedule/create', {
            userId: selectedUser,
            companyId: company._id,
            ...formData
        }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.data.success) {
            // Refresh schedules based on current view
            if (viewMode === 'user-view' && selectedUserForView) {
                // If we're in user view, refresh that user's schedules
                fetchUserSchedules(selectedUser);
            } else {
                // Otherwise refresh admin view schedules
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


    // const handleDeleteSchedule = async (scheduleId) => {
    //     if (!window.confirm('Are you sure you want to delete this schedule?')) {
    //         return;
    //     }

    //     try {
    //         const response = await axios.delete(`/api/duty-schedule/${scheduleId}`, {
    //             headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    //         });

    //         if (response.data.success) {
    //             fetchSchedules();
    //             alert('Duty schedule deleted successfully!');
    //         }
    //     } catch (error) {
    //         console.error('Error deleting schedule:', error);
    //         alert(error.response?.data?.message || 'Failed to delete schedule');
    //     }
    // };

    const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
        return;
    }

    try {
        const response = await axios.delete(`/api/duty-schedule/${scheduleId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.data.success) {
            // Refresh based on current view
            if (viewMode === 'user-view' && selectedUserForView) {
                fetchUserSchedules(selectedUserForView._id);
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
            <div className="text-nowrap" style={{ minWidth: '150px' }}>
                <div className="fw-semibold text-truncate" style={{ maxWidth: '140px' }}>
                    {schedule.user?.name || 'Unknown'}
                </div>
                <small className="text-muted d-block text-truncate" style={{ maxWidth: '140px' }}>
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
                    <div className="fw-medium small">
                        {formatShortScheduleType(schedule)}
                    </div>
                    <small className="text-muted">
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
                <div className="fw-medium small">
                    {formatTime(schedule.dutyHours.startTime)} - {formatTime(schedule.dutyHours.endTime)}
                </div>
                <small className="text-muted d-block">
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
                        <div className="fw-medium small">
                            {schedule.officeLocation.name}
                        </div>
                    </div>
                </div>
            </OverlayTrigger>
        ) : (
            <span className="text-muted small">Any Office</span>
        )
    );

    const renderPeriodCell = (schedule) => (
        <div className="small">
            <div className="fw-medium">
                {new Date(schedule.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            {schedule.endDate ? (
                <>
                    <div className="text-muted">to</div>
                    <div>
                        {new Date(schedule.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                </>
            ) : (
                <div className="text-muted">No end date</div>
            )}
        </div>
    );

    // Render Users Tab Content
// const renderUsersTab = () => {
//     if (usersLoading) {
//         return (
//             <div className="text-center py-5">
//                 <Spinner animation="border" variant="primary" />
//                 <p className="mt-2 text-muted">Loading users...</p>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <Alert variant="danger" className="mt-3">
//                 <FaInfoCircle className="me-2" />
//                 {error}
//             </Alert>
//         );
//     }

//     if (users.length === 0) {
//         return (
//             <div className="text-center py-5">
//                 <FaUsers size={48} className="text-muted mb-3" />
//                 <h5>No Users Found</h5>
//                 <p className="text-muted">No users are registered in this company yet.</p>
//             </div>
//         );
//     }

//     const formatRole = (role) => {
//         const roleMap = {
//             'Admin': { label: 'Admin', variant: 'danger' },
//             'ADMINISTRATOR': { label: 'Administrator', variant: 'danger' },
//             'Supervisor': { label: 'Supervisor', variant: 'warning' },
//             'Account': { label: 'Account', variant: 'info' },
//             'Sales': { label: 'Sales', variant: 'success' },
//             'Purchase': { label: 'Purchase', variant: 'primary' },
//             'User': { label: 'User', variant: 'secondary' }
//         };
        
//         const roleInfo = roleMap[role] || { label: role, variant: 'light' };
//         return (
//             <Badge bg={roleInfo.variant} className="px-3 py-2">
//                 {roleInfo.label}
//             </Badge>
//         );
//     };

//     const formatStatus = (isActive) => (
//         <Badge bg={isActive ? 'success' : 'secondary'} className="px-3 py-2">
//             {isActive ? 'Active' : 'Inactive'}
//         </Badge>
//     );

//     return (
//         <Card>
//             <Card.Header className="bg-light d-flex justify-content-between align-items-center">
//                 <h6 className="mb-0 d-flex align-items-center">
//                     <FaUsers className="me-2" />
//                     Company Users
//                 </h6>
//                 <div>
//                     <small className="text-muted">
//                         Total: {users.length} user{users.length !== 1 ? 's' : ''}
//                     </small>
//                 </div>
//             </Card.Header>
//             <Card.Body>
//                 <div className="table-responsive">
//                     <Table hover className="mb-0 align-middle">
//                         <thead className="bg-light">
//                             <tr>
//                                 <th>User</th>
//                                 <th>Role</th>
//                                 <th>Email</th>
//                                 <th>Status</th>
//                                 <th>Admin</th>
//                                 <th>Owner</th>
//                                 <th>Actions</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {users.map(user => (
//                                 <tr key={user._id}>
//                                     <td>
//                                         <div className="d-flex align-items-center">
//                                             <div className="bg-light rounded-circle d-flex align-items-center justify-content-center me-3"
//                                                 style={{ width: '36px', height: '36px' }}>
//                                                 <FaUser className="text-secondary" />
//                                             </div>
//                                             <div>
//                                                 <div className="fw-semibold">
//                                                     {user.name}
//                                                     {user.isOwner && (
//                                                         <FaShieldAlt className="ms-2 text-warning" size={12} />
//                                                     )}
//                                                 </div>
//                                                 <small className="text-muted">
//                                                     ID: {user._id?.substring(0, 8) || user.id?.substring(0, 8)}
//                                                 </small>
//                                             </div>
//                                         </div>
//                                     </td>
//                                     <td>
//                                         {formatRole(user.role)}
//                                     </td>
//                                     <td>
//                                         <div className="d-flex align-items-center">
//                                             <FaEnvelope className="me-2 text-muted" size={14} />
//                                             <span className="text-truncate" style={{ maxWidth: '200px' }}>
//                                                 {user.email}
//                                             </span>
//                                         </div>
//                                     </td>
//                                     <td>
//                                         {formatStatus(user.isActive)}
//                                     </td>
//                                     <td>
//                                         {user.isAdmin ? (
//                                             <Badge bg="success" className="px-3 py-2">
//                                                 <FaUserCheck className="me-1" />
//                                                 Yes
//                                             </Badge>
//                                         ) : (
//                                             <Badge bg="secondary" className="px-3 py-2">
//                                                 <FaUserTimes className="me-1" />
//                                                 No
//                                             </Badge>
//                                         )}
//                                     </td>
//                                     <td>
//                                         {user.isOwner ? (
//                                             <Badge bg="warning" className="px-3 py-2">
//                                                 Yes
//                                             </Badge>
//                                         ) : (
//                                             <span className="text-muted">No</span>
//                                         )}
//                                     </td>
//                                     <td>
//                                         <div className="d-flex gap-2">
//                                             <OverlayTrigger
//                                                 placement="top"
//                                                 overlay={<Tooltip>View Profile</Tooltip>}
//                                             >
//                                                 <Button
//                                                     size="sm"
//                                                     variant="outline-info"
//                                                     className="d-flex align-items-center justify-content-center"
//                                                     style={{ width: '32px', height: '32px' }}
//                                                 >
//                                                     <FaEye size={12} />
//                                                 </Button>
//                                             </OverlayTrigger>
//                                             <OverlayTrigger
//                                                 placement="top"
//                                                 overlay={<Tooltip>Assign Schedule</Tooltip>}
//                                             >
//                                                 <Button
//                                                     size="sm"
//                                                     variant="outline-primary"
//                                                     className="d-flex align-items-center justify-content-center"
//                                                     style={{ width: '32px', height: '32px' }}
//                                                     onClick={() => {
//                                                         setSelectedUser(user._id);
//                                                         setShowModal(true);
//                                                     }}
//                                                 >
//                                                     <FaCalendar size={12} />
//                                                 </Button>
//                                             </OverlayTrigger>
//                                         </div>
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </Table>
//                 </div>
//             </Card.Body>
//         </Card>
//     );
// };

// Render Users Tab Content
const renderUsersTab = () => {
    // If in user-view mode, show that user's schedules
    if (viewMode === 'user-view' && selectedUserForView) {
        return renderUserScheduleView();
    }

    // Otherwise show the users list
    return renderUsersListView();
};

// Render Users List View
const renderUsersListView = () => {
    if (usersLoading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Loading users...</p>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className="mt-3">
                <FaInfoCircle className="me-2" />
                {error}
            </Alert>
        );
    }

    if (users.length === 0) {
        return (
            <div className="text-center py-5">
                <FaUsers size={48} className="text-muted mb-3" />
                <h5>No Users Found</h5>
                <p className="text-muted">No users are registered in this company yet.</p>
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
            <Badge bg={roleInfo.variant} className="px-3 py-2">
                {roleInfo.label}
            </Badge>
        );
    };

    const formatStatus = (isActive) => (
        <Badge bg={isActive ? 'success' : 'secondary'} className="px-3 py-2">
            {isActive ? 'Active' : 'Inactive'}
        </Badge>
    );

    return (
        <Card>
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                <h6 className="mb-0 d-flex align-items-center">
                    <FaUsers className="me-2" />
                    Company Users
                </h6>
                <div>
                    <small className="text-muted">
                        Total: {users.length} user{users.length !== 1 ? 's' : ''}
                    </small>
                </div>
            </Card.Header>
            <Card.Body>
                <div className="table-responsive">
                    <Table hover className="mb-0 align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Admin</th>
                                <th>Owner</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user._id}>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <div className="bg-light rounded-circle d-flex align-items-center justify-content-center me-3"
                                                style={{ width: '36px', height: '36px' }}>
                                                <FaUser className="text-secondary" />
                                            </div>
                                            <div>
                                                <div className="fw-semibold">
                                                    {user.name}
                                                    {user.isOwner && (
                                                        <FaShieldAlt className="ms-2 text-warning" size={12} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {formatRole(user.role)}
                                    </td>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <FaEnvelope className="me-2 text-muted" size={14} />
                                            <span className="text-truncate" style={{ maxWidth: '200px' }}>
                                                {user.email}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        {formatStatus(user.isActive)}
                                    </td>
                                    <td>
                                        {user.isAdmin ? (
                                            <Badge bg="success" className="px-3 py-2">
                                                <FaUserCheck className="me-1" />
                                                Yes
                                            </Badge>
                                        ) : (
                                            <Badge bg="secondary" className="px-3 py-2">
                                                <FaUserTimes className="me-1" />
                                                No
                                            </Badge>
                                        )}
                                    </td>
                                    <td>
                                        {user.isOwner ? (
                                            <Badge bg="warning" className="px-3 py-2">
                                                Yes
                                            </Badge>
                                        ) : (
                                            <span className="text-muted">No</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="d-flex gap-2">
                                            <OverlayTrigger
                                                placement="top"
                                                overlay={<Tooltip>View Schedule</Tooltip>}
                                            >
                                                <Button
                                                    size="sm"
                                                    variant="outline-info"
                                                    className="d-flex align-items-center justify-content-center"
                                                    style={{ width: '32px', height: '32px' }}
                                                    onClick={() => fetchUserSchedules(user._id)}
                                                >
                                                    <FaEye size={12} />
                                                </Button>
                                            </OverlayTrigger>
                                            <OverlayTrigger
                                                placement="top"
                                                overlay={<Tooltip>Assign Schedule</Tooltip>}
                                            >
                                                <Button
                                                    size="sm"
                                                    variant="outline-primary"
                                                    className="d-flex align-items-center justify-content-center"
                                                    style={{ width: '32px', height: '32px' }}
                                                    onClick={() => {
                                                        setSelectedUser(user._id);
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
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Loading user's schedules...</p>
            </div>
        );
    }

    return (
        <Card>
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={goBackToUsersList}
                        className="me-3 d-flex align-items-center"
                    >
                        <FaChevronRight className="rotate-180" /> Back
                    </Button>
                    <div>
                        <h6 className="mb-0 d-flex align-items-center">
                            <FaUser className="me-2" />
                            {selectedUserForView?.name}'s Duty Schedules
                        </h6>
                        <small className="text-muted">
                            {selectedUserForView?.email} • {selectedUserForView?.role}
                        </small>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                            setSelectedUser(selectedUserForView._id);
                            setShowModal(true);
                        }}
                        className="d-flex align-items-center"
                    >
                        <FaPlus className="me-1" /> Assign New Schedule
                    </Button>
                    <Badge bg="info" className="px-3 py-2">
                        {userSchedules.length} schedule{userSchedules.length !== 1 ? 's' : ''}
                    </Badge>
                </div>
            </Card.Header>
            <Card.Body>
                {userSchedules.length === 0 ? (
                    <div className="text-center py-5">
                        <FaCalendar size={48} className="text-muted mb-3" />
                        <h5>No Duty Schedules Found</h5>
                        <p className="text-muted">This user doesn't have any duty schedules assigned yet.</p>
                        <Button 
                            variant="primary" 
                            onClick={() => {
                                setSelectedUser(selectedUserForView._id);
                                setShowModal(true);
                            }}
                            className="mt-3 d-flex align-items-center mx-auto"
                        >
                            <FaPlus className="me-1" /> Assign First Schedule
                        </Button>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <Table hover className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th style={{ width: '140px' }}>Schedule Type</th>
                                    <th style={{ width: '160px' }}>Duty Hours</th>
                                    <th style={{ width: '140px' }}>Office Location</th>
                                    <th style={{ width: '120px' }}>Period</th>
                                    <th style={{ width: '100px' }}>Status</th>
                                    <th style={{ width: '90px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userSchedules.map(schedule => (
                                    <tr key={schedule._id}>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <FaCalendar className="me-2 text-primary" size={14} />
                                                <div>
                                                    <div className="fw-medium small">
                                                        {formatShortScheduleType(schedule)}
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
                                                        {schedule.dutyHours.gracePeriod}m grace • {schedule.dutyHours.breakDuration}m break
                                                    </small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {schedule.officeLocation ? (
                                                <div className="d-flex align-items-center">
                                                    <FaMapMarkerAlt className="me-2 text-info" size={14} />
                                                    <div className="text-truncate" style={{ maxWidth: '120px' }}>
                                                        <div className="fw-medium small">
                                                            {schedule.officeLocation.name}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted small">Any Office</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="small">
                                                <div className="fw-medium">
                                                    {new Date(schedule.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </div>
                                                {schedule.endDate ? (
                                                    <>
                                                        <div className="text-muted">to</div>
                                                        <div>
                                                            {new Date(schedule.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-muted">No end date</div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <Badge 
                                                bg={schedule.isActive ? 'success' : 'secondary'} 
                                                className="px-3 py-2"
                                                style={{ fontSize: '0.75rem' }}
                                            >
                                                {schedule.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                <OverlayTrigger
                                                    placement="top"
                                                    overlay={<Tooltip>Edit Schedule</Tooltip>}
                                                >
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        className="d-flex align-items-center justify-content-center"
                                                        style={{ width: '32px', height: '32px' }}
                                                    >
                                                        <FaEdit size={12} />
                                                    </Button>
                                                </OverlayTrigger>
                                                <OverlayTrigger
                                                    placement="top"
                                                    overlay={<Tooltip>Delete Schedule</Tooltip>}
                                                >
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        className="d-flex align-items-center justify-content-center"
                                                        style={{ width: '32px', height: '32px' }}
                                                        onClick={() => handleDeleteSchedule(schedule._id)}
                                                    >
                                                        <FaTrash size={12} />
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

    // const renderAdminView = () => {
    //     if (loading) {
    //         return (
    //             <div className="text-center py-5">
    //                 <Spinner animation="border" variant="primary" />
    //                 <p className="mt-2 text-muted">Loading schedules...</p>
    //             </div>
    //         );
    //     }

    //     if (schedules.length === 0) {
    //         return (
    //             <div className="text-center py-5">
    //                 <FaCalendar size={48} className="text-muted mb-3" />
    //                 <h5>No Duty Schedules Found</h5>
    //                 <p className="text-muted mb-4">Create schedules to assign duty hours to users</p>
    //                 <Button variant="primary" onClick={() => setShowModal(true)} className="d-flex align-items-center mx-auto">
    //                     <FaPlus className="me-1" /> Create First Schedule
    //                 </Button>
    //             </div>
    //         );
    //     }

    //     return (
    //         <div className="table-responsive">
    //             <Table hover className="mb-0 align-middle">
    //                 <thead className="bg-light">
    //                     <tr>
    //                         <th className="py-3 px-3" style={{ width: '180px' }}>Employee</th>
    //                         <th className="py-3 px-3" style={{ width: '140px' }}>Schedule Type</th>
    //                         <th className="py-3 px-3" style={{ width: '160px' }}>Duty Hours</th>
    //                         <th className="py-3 px-3" style={{ width: '140px' }}>Office Location</th>
    //                         <th className="py-3 px-3" style={{ width: '120px' }}>Period</th>
    //                         <th className="py-3 px-3" style={{ width: '100px' }}>Status</th>
    //                         <th className="py-3 px-3" style={{ width: '90px' }}>Actions</th>
    //                     </tr>
    //                 </thead>
    //                 <tbody>
    //                     {schedules.map(schedule => (
    //                         <tr key={schedule._id} className="border-top">
    //                             <td className="py-3 px-3">{renderUserCell(schedule)}</td>
    //                             <td className="py-3 px-3">{renderScheduleTypeCell(schedule)}</td>
    //                             <td className="py-3 px-3">{renderDutyHoursCell(schedule)}</td>
    //                             <td className="py-3 px-3">{renderOfficeLocationCell(schedule)}</td>
    //                             <td className="py-3 px-3">{renderPeriodCell(schedule)}</td>
    //                             <td className="py-3 px-3">
    //                                 <Badge 
    //                                     bg={schedule.isActive ? 'success' : 'secondary'} 
    //                                     className="px-3 py-2"
    //                                     style={{ fontSize: '0.75rem' }}
    //                                 >
    //                                     {schedule.isActive ? 'Active' : 'Inactive'}
    //                                 </Badge>
    //                             </td>
    //                             <td className="py-3 px-3">
    //                                 <div className="d-flex gap-1">
    //                                     <OverlayTrigger
    //                                         placement="top"
    //                                         overlay={<Tooltip>Edit Schedule</Tooltip>}
    //                                     >
    //                                         <Button
    //                                             size="sm"
    //                                             variant="outline-primary"
    //                                             className="d-flex align-items-center justify-content-center"
    //                                             style={{ width: '32px', height: '32px' }}
    //                                         >
    //                                             <FaEdit size={12} />
    //                                         </Button>
    //                                     </OverlayTrigger>
    //                                     <OverlayTrigger
    //                                         placement="top"
    //                                         overlay={<Tooltip>Delete Schedule</Tooltip>}
    //                                     >
    //                                         <Button
    //                                             size="sm"
    //                                             variant="outline-danger"
    //                                             className="d-flex align-items-center justify-content-center"
    //                                             style={{ width: '32px', height: '32px' }}
    //                                             onClick={() => handleDeleteSchedule(schedule._id)}
    //                                         >
    //                                             <FaTrash size={12} />
    //                                         </Button>
    //                                     </OverlayTrigger>
    //                                 </div>
    //                             </td>
    //                         </tr>
    //                     ))}
    //                 </tbody>
    //             </Table>
    //         </div>
    //     );
    // };

    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center bg-white border-bottom py-3">
                <div>
                    <h5 className="mb-0 d-flex align-items-center">
                        <FaCalendar className="me-2 text-primary" />
                        Duty Schedule Management
                    </h5>
                   <small className="text-muted">
    {activeTab === 'my-schedule' ? 'View your duty schedules' : 
     activeTab === 'admin' ? 'Manage all employee schedules' : 
     'View all company users'}
</small>
                </div>
                {isAdmin() && activeTab === 'admin' && (
                    <Button size="sm" variant="primary" onClick={() => setShowModal(true)} className="d-flex align-items-center">
                        <FaPlus className="me-1" /> Create Schedule
                    </Button>
                )}
            </Card.Header>
            
            <Card.Body className="p-3">
                <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k)}
                    className="mb-4"
                >
                    
                    {/* {isAdmin() && (
                        <Tab eventKey="admin" title={
                            <span className="d-flex align-items-center">
                                <FaUser className="me-1" /> All Schedules
                            </span>
                        }>
                            {renderAdminView()}
                        </Tab>
                    )} */}

                    {isAdmin() && (
    <Tab eventKey="users" title={
        <span className="d-flex align-items-center">
            <FaUsers className="me-1" /> Users
            {users.length > 0 && (
                <Badge bg="light" text="dark" className="ms-2">
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
                    <Modal.Header closeButton className="bg-light">
                        <Modal.Title className="d-flex align-items-center">
                            <FaCalendar className="me-2 text-primary" />
                            Create Duty Schedule
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Select Employee</Form.Label>
                                <Form.Select
                                    value={selectedUser || ''}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    required
                                    size="sm"
                                >
                                    <option value="">Select an employee</option>
                                    {users.map(user => (
                                        <option key={user._id} value={user._id}>
                                            {user.name} - {user.role || 'Employee'} ({user.email})
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted">
                                    Select the employee for whom you want to create a duty schedule
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Schedule Type</Form.Label>
                                <div className="d-flex gap-3">
                                    <Form.Check
                                        type="radio"
                                        id="recurring"
                                        label="Recurring Schedule"
                                        name="scheduleType"
                                        checked={formData.scheduleType === 'recurring'}
                                        onChange={() => setFormData({ ...formData, scheduleType: 'recurring' })}
                                    />
                                    <Form.Check
                                        type="radio"
                                        id="specific"
                                        label="Specific Dates"
                                        name="scheduleType"
                                        checked={formData.scheduleType === 'specific'}
                                        onChange={() => setFormData({ ...formData, scheduleType: 'specific' })}
                                    />
                                </div>
                            </Form.Group>

                            {formData.scheduleType === 'recurring' && (
                                <>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Recurring Pattern</Form.Label>
                                        <div className="d-flex flex-wrap gap-2">
                                            <Form.Check
                                                type="radio"
                                                id="daily"
                                                label="Daily"
                                                name="recurringPattern"
                                                checked={formData.recurringPattern === 'daily'}
                                                onChange={() => setFormData({ ...formData, recurringPattern: 'daily' })}
                                                className="me-2"
                                            />
                                            <Form.Check
                                                type="radio"
                                                id="weekly"
                                                label="Weekly"
                                                name="recurringPattern"
                                                checked={formData.recurringPattern === 'weekly'}
                                                onChange={() => setFormData({ ...formData, recurringPattern: 'weekly' })}
                                                className="me-2"
                                            />
                                            <Form.Check
                                                type="radio"
                                                id="monthly"
                                                label="Monthly"
                                                name="recurringPattern"
                                                checked={formData.recurringPattern === 'monthly'}
                                                onChange={() => setFormData({ ...formData, recurringPattern: 'monthly' })}
                                            />
                                        </div>
                                    </Form.Group>

                                    {formData.recurringPattern === 'weekly' && (
                                        <Form.Group className="mb-3">
                                            <Form.Label>Select Days of Week</Form.Label>
                                            <div className="d-flex flex-wrap gap-1">
                                                {weekDays.map(day => (
                                                    <Button
                                                        key={day.value}
                                                        variant={formData.weekDays.includes(day.value) ? 'primary' : 'outline-secondary'}
                                                        size="sm"
                                                        onClick={() => handleWeekDayToggle(day.value)}
                                                        type="button"
                                                        className="px-2"
                                                    >
                                                        {day.label.slice(0, 3)}
                                                    </Button>
                                                ))}
                                            </div>
                                        </Form.Group>
                                    )}

                                    {formData.recurringPattern === 'monthly' && (
                                        <Form.Group className="mb-3">
                                            <Form.Label>Select Days of Month</Form.Label>
                                            <div className="d-flex flex-wrap gap-1" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                                {monthDays.map(day => (
                                                    <Button
                                                        key={day}
                                                        variant={formData.monthDays.includes(day) ? 'primary' : 'outline-secondary'}
                                                        size="sm"
                                                        onClick={() => handleMonthDayToggle(day)}
                                                        type="button"
                                                        style={{ width: '36px' }}
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
                                                <Form.Label>Start Date</Form.Label>
                                                <Form.Control
                                                    type="date"
                                                    value={formData.startDate}
                                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                    required
                                                    size="sm"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>End Date</Form.Label>
                                                <Form.Control
                                                    type="date"
                                                    value={formData.endDate}
                                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                    required
                                                    size="sm"
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </>
                            )}

                            {formData.scheduleType === 'specific' && (
                                <Form.Group className="mb-3">
                                    <Form.Label>Select Specific Dates</Form.Label>
                                    <div className="d-flex align-items-center mb-2">
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={handleSpecificDateAdd}
                                            type="button"
                                            className="d-flex align-items-center"
                                        >
                                            <FaPlus className="me-1" /> Add Date
                                        </Button>
                                    </div>
                                    <div className="border rounded p-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                        {formData.specificDates.length === 0 ? (
                                            <div className="text-muted text-center py-2">
                                                No dates selected. Click "Add Date" to add dates.
                                            </div>
                                        ) : (
                                            formData.specificDates.map((date, index) => (
                                                <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                                                    <div className="small">
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
                                                        className="px-2"
                                                    >
                                                        <FaTrash size={12} />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Form.Group>
                            )}

                            <div className="border-top pt-3 mt-3">
                                <h6 className="mb-3 d-flex align-items-center">
                                    <FaClock className="me-2 text-primary" />
                                    Duty Hours
                                </h6>
                                <Row className="g-2">
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Start Time</Form.Label>
                                            <Form.Control
                                                type="time"
                                                value={formData.dutyHours.startTime}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    dutyHours: { ...formData.dutyHours, startTime: e.target.value }
                                                })}
                                                required
                                                size="sm"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>End Time</Form.Label>
                                            <Form.Control
                                                type="time"
                                                value={formData.dutyHours.endTime}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    dutyHours: { ...formData.dutyHours, endTime: e.target.value }
                                                })}
                                                required
                                                size="sm"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Grace Period (minutes)</Form.Label>
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
                                            />
                                            <Form.Text className="text-muted">
                                                Allowed late minutes before marking as late
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Break Duration (minutes)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                min="0"
                                                value={formData.dutyHours.breakDuration}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    dutyHours: { ...formData.dutyHours, breakDuration: parseInt(e.target.value) || 60 }
                                                })}
                                                size="sm"
                                            />
                                            <Form.Text className="text-muted">
                                                Break time included in total hours calculation
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </div>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Office Location (Optional)</Form.Label>
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
                                >
                                    <option value="">Any Office Location</option>
                                    {officeLocations.map(location => (
                                        <option key={location._id || location.id} value={location._id || location.id}>
                                            {location.name} - {location.address || 'No address'}
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted">
                                    Select specific office location. Leave empty for any office.
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Notes (Optional)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Add any notes about this schedule..."
                                    size="sm"
                                />
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer className="bg-light">
                        <Button variant="outline-secondary" onClick={() => { setShowModal(false); resetForm(); }} size="sm">
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleCreateSchedule} size="sm" className="px-4">
                            Create Schedule
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}
        </Card>
    );
};

export default DutyScheduleManager;

//------------------------------------------------------------
// import React, { useState, useEffect } from 'react';
// import { 
//     Card, Button, Form, Row, Col, Table, Badge, Modal, Alert, 
//     Spinner, OverlayTrigger, Tooltip, Tabs, Tab 
// } from 'react-bootstrap';
// import { 
//     FaCalendar, FaClock, FaUser, FaBuilding, FaPlus, FaEdit, 
//     FaTrash, FaMapMarkerAlt, FaInfoCircle, FaEye, FaCalendarCheck,
//     FaCalendarDay, FaList, FaChevronRight, FaSave, FaTimes, FaCopy
// } from 'react-icons/fa';
// import axios from 'axios';

// const DutyScheduleManager = ({ company, user }) => {
//     const [schedules, setSchedules] = useState([]);
//     const [mySchedules, setMySchedules] = useState([]);
//     const [upcomingSchedule, setUpcomingSchedule] = useState(null);
//     const [upcomingWeek, setUpcomingWeek] = useState([]);
//     const [loading, setLoading] = useState(false);
//     const [mySchedulesLoading, setMySchedulesLoading] = useState(false);
//     const [showModal, setShowModal] = useState(false);
//     const [selectedUser, setSelectedUser] = useState(null);
//     const [usersLoading, setUsersLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [users, setUsers] = useState([]);
//     const [officeLocations, setOfficeLocations] = useState([]);
//     const [activeTab, setActiveTab] = useState('my-schedule'); // 'my-schedule', 'admin', or 'manual-create'
    
//     // Manual Schedule Table State
//     const [manualSchedules, setManualSchedules] = useState([]);
//     const [isCreatingManual, setIsCreatingManual] = useState(false);
//     const [manualScheduleUser, setManualScheduleUser] = useState(null);
//     const [manualStartDate, setManualStartDate] = useState('');
//     const [manualEndDate, setManualEndDate] = useState('');
//     const [manualDays, setManualDays] = useState(7); // Default 7 days
//     const [manualWeekDays, setManualWeekDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri default

//     // Check if user is admin
//     const isAdmin = () => {
//         return user?.role === 'Admin' || 
//                user?.role === 'ADMINISTRATOR' || 
//                user?.role === 'Supervisor' || 
//                user?.isAdmin;
//     };

//     // Reset manual schedule
//     const resetManualSchedule = () => {
//         setManualSchedules([]);
//         setManualScheduleUser(null);
//         setManualStartDate('');
//         setManualEndDate('');
//         setManualDays(7);
//         setManualWeekDays([1, 2, 3, 4, 5]);
//         setIsCreatingManual(false);
//     };

//     // Fetch schedules (admin view)
//     const fetchSchedules = async () => {
//         try {
//             setLoading(true);
//             console.log('🔍 Fetching schedules for company:', company._id);

//             const response = await axios.get(`/api/duty-schedule/company/${company._id}`, {
//                 headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//             });

//             console.log('📋 Schedules API Response:', response.data);

//             if (response.data.success) {
//                 console.log(`✅ Found ${response.data.data?.length || 0} schedules`);
//                 setSchedules(response.data.data || []);
//             } else {
//                 console.error('❌ API response not successful:', response.data);
//                 setSchedules([]);
//             }
//         } catch (error) {
//             console.error('❌ Error fetching schedules:', {
//                 message: error.message,
//                 response: error.response?.data,
//                 status: error.response?.status
//             });
//             alert('Failed to fetch schedules: ' + (error.response?.data?.message || error.message));
//             setSchedules([]);
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Fetch user's own schedules
//     const fetchMySchedules = async () => {
//         if (!user || !company) return;

//         setMySchedulesLoading(true);
//         try {
//             console.log('🔍 Fetching my schedules for user:', user._id);

//             const response = await axios.get(`/api/duty-schedule/user/${user._id}`, {
//                 params: { 
//                     companyId: company._id,
//                     activeOnly: true 
//                 },
//                 headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//             });

//             console.log('📋 My Schedules API Response:', response.data);

//             if (response.data.success) {
//                 const schedules = response.data.data || [];
                
//                 // Filter for active schedules
//                 const today = new Date();
//                 today.setHours(0, 0, 0, 0);
                
//                 const activeSchedules = schedules.filter(schedule => {
//                     const endDate = schedule.endDate ? new Date(schedule.endDate) : null;
//                     const startDate = new Date(schedule.startDate);
                    
//                     return schedule.isActive && 
//                            (startDate <= today || !endDate || endDate >= today);
//                 });
                
//                 console.log(`✅ Found ${activeSchedules.length} active schedules`);
//                 setMySchedules(activeSchedules);
                
//                 // Get today's schedule
//                 await fetchTodaySchedule();
//                 // Get upcoming week
//                 await fetchUpcomingWeek();
                
//             } else {
//                 console.warn('⚠️ No schedule data found');
//                 setMySchedules([]);
//                 setUpcomingSchedule(null);
//                 setUpcomingWeek([]);
//             }
//         } catch (error) {
//             console.error('❌ Error fetching my schedules:', error);
//             setMySchedules([]);
//             setUpcomingSchedule(null);
//             setUpcomingWeek([]);
//         } finally {
//             setMySchedulesLoading(false);
//         }
//     };

//     // Fetch today's schedule
//     const fetchTodaySchedule = async () => {
//         if (!user || !company) return;

//         try {
//             const response = await axios.get('/api/duty-schedule/check-today', {
//                 params: {
//                     userId: user._id,
//                     companyId: company._id
//                 },
//                 headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//             });

//             console.log('📅 Today schedule response:', response.data);

//             if (response.data.success && response.data.hasDuty) {
//                 setUpcomingSchedule(response.data.schedule);
//             } else {
//                 setUpcomingSchedule(null);
//             }
//         } catch (error) {
//             console.error('Error fetching today schedule:', error);
//             setUpcomingSchedule(null);
//         }
//     };

//     // Fetch upcoming week schedule
//     const fetchUpcomingWeek = async () => {
//         if (!user || !company) return;

//         try {
//             const response = await axios.get('/api/duty-schedule/upcoming-week', {
//                 params: {
//                     userId: user._id,
//                     companyId: company._id
//                 },
//                 headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//             });

//             console.log('📅 Upcoming week response:', response.data);

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

//     const fetchUsers = async () => {
//         if (!company || !company._id) {
//             console.error('No company ID available');
//             setError('No company selected');
//             return;
//         }

//         setUsersLoading(true);
//         setError(null);

//         try {
//             console.log('🔍 Fetching users from /api/duty-schedule/admin/users/list');

//             const response = await axios.get('/api/duty-schedule/admin/users/list', {
//                 headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//             });

//             console.log('📋 Users API Response:', response.data);

//             if (response.data.success && response.data.data && response.data.data.users) {
//                 const userList = response.data.data.users;

//                 const mappedUsers = userList.map(user => {
//                     const userId = user._id || user.id;

//                     return {
//                         _id: userId,
//                         id: userId,
//                         name: user.name,
//                         email: user.email,
//                         role: user.role,
//                         isAdmin: user.isAdmin,
//                         isActive: user.isActive,
//                         isOwner: user.isOwner !== undefined ? user.isOwner : false,
//                         preferences: user.preferences || {}
//                     };
//                 });

//                 console.log(`✅ Found ${mappedUsers.length} users`);
//                 setUsers(mappedUsers);

//             } else {
//                 console.warn('⚠️ No users data in response or response not successful');
//                 setError('No users found or unauthorized access');
//                 setUsers([]);
//             }

//         } catch (error) {
//             console.error('❌ Error fetching users:', {
//                 message: error.message,
//                 response: error.response?.data,
//                 status: error.response?.status
//             });

//             if (error.response?.status === 403) {
//                 setError('You do not have permission to view users. Only admins and supervisors can access this feature.');
//             } else if (error.response?.status === 401) {
//                 setError('Session expired. Please login again.');
//             } else {
//                 setError('Failed to load users. Please try again.');
//             }
//         } finally {
//             setUsersLoading(false);
//         }
//     };

//     const fetchOfficeLocations = async () => {
//         try {
//             const response = await axios.get('/api/attendance/office-locations', {
//                 params: { companyId: company._id },
//                 headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//             });

//             console.log('📍 Office locations response:', response.data);

//             if (response.data.success) {
//                 const locations = response.data.data?.officeLocations ||
//                     response.data.officeLocations ||
//                     response.data.data || [];
//                 setOfficeLocations(locations);
//                 console.log(`📍 Found ${locations.length} office locations`);
//             }
//         } catch (error) {
//             console.error('Error fetching office locations:', error);
//             setOfficeLocations([]);
//         }
//     };

//     useEffect(() => {
//         if (company) {
//             fetchUsers();
//             fetchOfficeLocations();
            
//             if (isAdmin()) {
//                 fetchSchedules();
//             }
            
//             fetchMySchedules();
//         }
//     }, [company]);

//     useEffect(() => {
//         if (company && user && activeTab === 'my-schedule') {
//             fetchMySchedules();
//         }
//     }, [company, user, activeTab]);

//     const formatTime = (timeString) => {
//         if (!timeString) return '';
//         const [hours, minutes] = timeString.split(':');
//         const hour = parseInt(hours);
//         const ampm = hour >= 12 ? 'PM' : 'AM';
//         const hour12 = hour % 12 || 12;
//         return `${hour12}:${minutes} ${ampm}`;
//     };

//     const formatDate = (dateString) => {
//         if (!dateString) return 'No date';
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

//     const formatScheduleType = (schedule) => {
//         if (schedule.scheduleType === 'specific') {
//             return `${schedule.specificDates?.length || 0} specific date(s)`;
//         } else if (schedule.scheduleType === 'recurring') {
//             if (schedule.recurringPattern === 'daily') {
//                 return 'Daily';
//             } else if (schedule.recurringPattern === 'weekly') {
//                 const days = schedule.weekDays?.map(day => {
//                     const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//                     return dayNames[day];
//                 }).join(', ');
//                 return `Weekly (${days})`;
//             } else if (schedule.recurringPattern === 'monthly') {
//                 return `Monthly (Days: ${schedule.monthDays?.join(', ')})`;
//             }
//         }
//         return schedule.scheduleType;
//     };

//     const formatShortScheduleType = (schedule) => {
//         if (schedule.scheduleType === 'specific') {
//             return `${schedule.specificDates?.length || 0} date(s)`;
//         } else if (schedule.scheduleType === 'recurring') {
//             if (schedule.recurringPattern === 'daily') {
//                 return 'Daily';
//             } else if (schedule.recurringPattern === 'weekly') {
//                 return `Weekly`;
//             } else if (schedule.recurringPattern === 'monthly') {
//                 return `Monthly`;
//             }
//         }
//         return 'Custom';
//     };

//     const weekDays = [
//         { value: 0, label: 'Sunday' },
//         { value: 1, label: 'Monday' },
//         { value: 2, label: 'Tuesday' },
//         { value: 3, label: 'Wednesday' },
//         { value: 4, label: 'Thursday' },
//         { value: 5, label: 'Friday' },
//         { value: 6, label: 'Saturday' }
//     ];

//     // Manual Schedule Functions
//     const handleStartManualSchedule = () => {
//         if (!manualScheduleUser) {
//             alert('Please select an employee first');
//             return;
//         }

//         // Generate initial schedule table
//         generateManualScheduleTable();
//         setIsCreatingManual(true);
//     };

//     const generateManualScheduleTable = () => {
//         const schedules = [];
//         const startDate = manualStartDate ? new Date(manualStartDate) : new Date();
        
//         // Calculate dates based on selected days
//         let dateCount = 0;
//         let currentDate = new Date(startDate);
        
//         while (dateCount < manualDays) {
//             const dayOfWeek = currentDate.getDay();
            
//             // Check if this day is in selected week days
//             if (manualWeekDays.includes(dayOfWeek)) {
//                 schedules.push({
//                     id: Date.now() + dateCount,
//                     date: new Date(currentDate).toISOString().split('T')[0],
//                     dayName: weekDays.find(d => d.value === dayOfWeek)?.label || '',
//                     dutyHours: {
//                         startTime: '09:00',
//                         endTime: '17:00',
//                         gracePeriod: 15,
//                         breakDuration: 60
//                     },
//                     officeLocationId: '',
//                     notes: '',
//                     isHoliday: false,
//                     isDayOff: false
//                 });
//                 dateCount++;
//             }
            
//             // Move to next day
//             currentDate.setDate(currentDate.getDate() + 1);
//         }
        
//         setManualSchedules(schedules);
//     };

//     const updateManualSchedule = (index, field, value) => {
//         const updatedSchedules = [...manualSchedules];
        
//         if (field.includes('.')) {
//             // Handle nested fields like dutyHours.startTime
//             const [parent, child] = field.split('.');
//             updatedSchedules[index][parent] = {
//                 ...updatedSchedules[index][parent],
//                 [child]: value
//             };
//         } else {
//             updatedSchedules[index][field] = value;
//         }
        
//         setManualSchedules(updatedSchedules);
//     };

//     const removeManualSchedule = (index) => {
//         const updatedSchedules = manualSchedules.filter((_, i) => i !== index);
//         setManualSchedules(updatedSchedules);
//     };

//     const addManualSchedule = () => {
//         const newSchedule = {
//             id: Date.now(),
//             date: new Date().toISOString().split('T')[0],
//             dayName: '',
//             dutyHours: {
//                 startTime: '09:00',
//                 endTime: '17:00',
//                 gracePeriod: 15,
//                 breakDuration: 60
//             },
//             officeLocationId: '',
//             notes: '',
//             isHoliday: false,
//             isDayOff: false
//         };
//         setManualSchedules([...manualSchedules, newSchedule]);
//     };

//     const copyPreviousSchedule = (index) => {
//         if (index === 0) return;
        
//         const previousSchedule = manualSchedules[index - 1];
//         updateManualSchedule(index, 'dutyHours', { ...previousSchedule.dutyHours });
//         updateManualSchedule(index, 'officeLocationId', previousSchedule.officeLocationId);
//         updateManualSchedule(index, 'notes', previousSchedule.notes);
//     };

//     const saveManualSchedules = async () => {
//         if (!manualScheduleUser) {
//             alert('Please select an employee');
//             return;
//         }

//         if (manualSchedules.length === 0) {
//             alert('No schedules to save');
//             return;
//         }

//         // Validate all schedules
//         for (let i = 0; i < manualSchedules.length; i++) {
//             const schedule = manualSchedules[i];
//             if (!schedule.date || !schedule.dutyHours.startTime || !schedule.dutyHours.endTime) {
//                 alert(`Please fill all required fields for row ${i + 1}`);
//                 return;
//             }
//         }

//         try {
//             const response = await axios.post('/api/duty-schedule/create-manual', {
//                 userId: manualScheduleUser,
//                 companyId: company._id,
//                 schedules: manualSchedules.map(s => ({
//                     date: s.date,
//                     dutyHours: s.dutyHours,
//                     officeLocationId: s.officeLocationId,
//                     notes: s.notes
//                 })),
//                 createdBy: user._id
//             }, {
//                 headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//             });

//             if (response.data.success) {
//                 alert(`Successfully created ${manualSchedules.length} schedule(s)`);
//                 resetManualSchedule();
//                 fetchSchedules();
//                 setActiveTab('admin');
//             }
//         } catch (error) {
//             console.error('Error creating manual schedules:', error);
//             alert(error.response?.data?.message || 'Failed to create schedules');
//         }
//     };

//     // Helper functions for rendering
//     const renderUserCell = (schedule) => (
//         <div className="d-flex align-items-center">
//             <div className="bg-light rounded-circle d-flex align-items-center justify-content-center me-2"
//                 style={{ width: '32px', height: '32px', minWidth: '32px' }}>
//                 <FaUser className="text-secondary" size={14} />
//             </div>
//             <div className="text-nowrap" style={{ minWidth: '150px' }}>
//                 <div className="fw-semibold text-truncate" style={{ maxWidth: '140px' }}>
//                     {schedule.user?.name || 'Unknown'}
//                 </div>
//                 <small className="text-muted d-block text-truncate" style={{ maxWidth: '140px' }}>
//                     {schedule.user?.email || ''}
//                 </small>
//             </div>
//         </div>
//     );

//     const renderScheduleTypeCell = (schedule) => (
//         <OverlayTrigger
//             placement="top"
//             overlay={
//                 <Tooltip>
//                     {formatScheduleType(schedule)}
//                 </Tooltip>
//             }
//         >
//             <div className="d-flex align-items-center">
//                 <FaCalendar className="me-2 text-primary" size={14} />
//                 <div>
//                     <div className="fw-medium small">
//                         {formatShortScheduleType(schedule)}
//                     </div>
//                     <small className="text-muted">
//                         {schedule.scheduleType === 'recurring' ? 'Recurring' : 'Specific'}
//                     </small>
//                 </div>
//             </div>
//         </OverlayTrigger>
//     );

//     const renderDutyHoursCell = (schedule) => (
//         <div className="d-flex align-items-center">
//             <FaClock className="me-2 text-muted" size={14} />
//             <div>
//                 <div className="fw-medium small">
//                     {formatTime(schedule.dutyHours.startTime)} - {formatTime(schedule.dutyHours.endTime)}
//                 </div>
//                 <small className="text-muted d-block">
//                     {schedule.dutyHours.gracePeriod}m grace • {schedule.dutyHours.breakDuration}m break
//                 </small>
//             </div>
//         </div>
//     );

//     const renderOfficeLocationCell = (schedule) => (
//         schedule.officeLocation ? (
//             <OverlayTrigger
//                 placement="top"
//                 overlay={
//                     <Tooltip>
//                         {schedule.officeLocation.address || 'No address'}
//                     </Tooltip>
//                 }
//             >
//                 <div className="d-flex align-items-center">
//                     <FaMapMarkerAlt className="me-2 text-info" size={14} />
//                     <div className="text-truncate" style={{ maxWidth: '120px' }}>
//                         <div className="fw-medium small">
//                             {schedule.officeLocation.name}
//                         </div>
//                     </div>
//                 </div>
//             </OverlayTrigger>
//         ) : (
//             <span className="text-muted small">Any Office</span>
//         )
//     );

//     const renderPeriodCell = (schedule) => (
//         <div className="small">
//             <div className="fw-medium">
//                 {new Date(schedule.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
//             </div>
//             {schedule.endDate ? (
//                 <>
//                     <div className="text-muted">to</div>
//                     <div>
//                         {new Date(schedule.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
//                     </div>
//                 </>
//             ) : (
//                 <div className="text-muted">No end date</div>
//             )}
//         </div>
//     );

//     // Render User View Components
//     const renderTodayScheduleCard = () => {
//         if (!upcomingSchedule) {
//             return (
//                 <Card className="mb-4 border-secondary">
//                     <Card.Header className="bg-light border-secondary">
//                         <h6 className="mb-0 d-flex align-items-center">
//                             <FaCalendarDay className="me-2 text-muted" />
//                             Today's Schedule
//                         </h6>
//                     </Card.Header>
//                     <Card.Body className="text-center py-4">
//                         <FaCalendar className="text-muted mb-2" size={24} />
//                         <p className="mb-0 text-muted">No duty schedule assigned for today</p>
//                         <small className="text-muted">You are free for today</small>
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
//                                     {formatShortScheduleType(upcomingSchedule)}
//                                 </div>
//                             </div>
//                             <div className="mb-3">
//                                 <small className="text-muted d-block">Duty Hours</small>
//                                 <div className="fw-semibold">
//                                     {formatTime(upcomingSchedule.dutyHours.startTime)} - {formatTime(upcomingSchedule.dutyHours.endTime)}
//                                 </div>
//                                 <small className="text-muted">
//                                     {upcomingSchedule.dutyHours.gracePeriod}m grace period
//                                 </small>
//                             </div>
//                         </Col>
//                         <Col md={6}>
//                             <div className="mb-3">
//                                 <small className="text-muted d-block">Period</small>
//                                 <div className="fw-semibold">
//                                     {formatDate(upcomingSchedule.startDate)}
//                                     {upcomingSchedule.endDate ? (
//                                         <> to {formatDate(upcomingSchedule.endDate)}</>
//                                     ) : (
//                                         ' (No end date)'
//                                     )}
//                                 </div>
//                             </div>
//                             {upcomingSchedule.officeLocation && (
//                                 <div className="mb-3">
//                                     <small className="text-muted d-block">Office Location</small>
//                                     <div className="fw-semibold d-flex align-items-center">
//                                         <FaMapMarkerAlt className="me-2 text-info" size={12} />
//                                         {upcomingSchedule.officeLocation.name}
//                                     </div>
//                                     <small className="text-muted d-block">
//                                         {upcomingSchedule.officeLocation.address}
//                                     </small>
//                                 </div>
//                             )}
//                         </Col>
//                     </Row>
//                     {upcomingSchedule.notes && (
//                         <Alert variant="info" className="mt-3 mb-0 py-2">
//                             <small className="d-flex align-items-center">
//                                 <FaInfoCircle className="me-2" />
//                                 {upcomingSchedule.notes}
//                             </small>
//                         </Alert>
//                     )}
//                 </Card.Body>
//             </Card>
//         );
//     };

//     const renderUpcomingWeek = () => {
//         if (!upcomingWeek || upcomingWeek.length === 0) {
//             return (
//                 <Card className="mb-4">
//                     <Card.Header className="bg-light">
//                         <h6 className="mb-0 d-flex align-items-center">
//                             <FaCalendar className="me-2" />
//                             Upcoming Week
//                         </h6>
//                     </Card.Header>
//                     <Card.Body className="text-center py-4">
//                         <FaCalendar className="text-muted mb-2" size={24} />
//                         <p className="mb-0 text-muted">No scheduled duties for the upcoming week</p>
//                     </Card.Body>
//                 </Card>
//             );
//         }

//         return (
//             <Card className="mb-4">
//                 <Card.Header className="bg-light">
//                     <h6 className="mb-0 d-flex align-items-center">
//                         <FaCalendar className="me-2" />
//                         Upcoming Week Schedule
//                     </h6>
//                 </Card.Header>
//                 <Card.Body>
//                     <div className="timeline">
//                         {upcomingWeek.map((day, index) => (
//                             <div key={index} className="timeline-item d-flex mb-3">
//                                 <div className="timeline-marker me-3">
//                                     <div className={`bg-${day.hasSchedule ? 'primary' : 'light'} rounded-circle d-flex align-items-center justify-content-center`}
//                                         style={{ width: '40px', height: '40px' }}>
//                                         {day.hasSchedule ? (
//                                             <FaCalendarCheck className="text-white" size={16} />
//                                         ) : (
//                                             <FaCalendar className="text-muted" size={16} />
//                                         )}
//                                     </div>
//                                 </div>
//                                 <div className="timeline-content flex-grow-1">
//                                     <div className="d-flex justify-content-between align-items-center">
//                                         <div>
//                                             <h6 className="mb-0">{day.dayName}</h6>
//                                             <small className="text-muted">{formatShortDate(day.date)}</small>
//                                         </div>
//                                         <div>
//                                             {day.hasSchedule ? (
//                                                 <Badge bg="success" className="px-3">
//                                                     <FaClock className="me-1" />
//                                                     {formatTime(day.schedule?.dutyHours?.startTime || '09:00')}
//                                                 </Badge>
//                                             ) : (
//                                                 <Badge bg="secondary" className="px-3">Off Day</Badge>
//                                             )}
//                                         </div>
//                                     </div>
//                                     {day.hasSchedule && day.schedule && (
//                                         <div className="mt-2">
//                                             <div className="d-flex align-items-center mb-1">
//                                                 <small className="text-muted me-2">Hours:</small>
//                                                 <span className="fw-medium">
//                                                     {formatTime(day.schedule.dutyHours.startTime)} - {formatTime(day.schedule.dutyHours.endTime)}
//                                                 </span>
//                                             </div>
//                                             {day.schedule.officeLocation && (
//                                                 <div className="d-flex align-items-center">
//                                                     <small className="text-muted me-2">Location:</small>
//                                                     <span className="text-truncate" style={{ maxWidth: '200px' }}>
//                                                         <FaMapMarkerAlt className="me-1 text-info" size={12} />
//                                                         {day.schedule.officeLocation.name}
//                                                     </span>
//                                                 </div>
//                                             )}
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </Card.Body>
//             </Card>
//         );
//     };

//     const renderMySchedulesTable = () => {
//         if (mySchedulesLoading) {
//             return (
//                 <div className="text-center py-5">
//                     <Spinner animation="border" variant="primary" />
//                     <p className="mt-2 text-muted">Loading your schedules...</p>
//                 </div>
//             );
//         }

//         if (mySchedules.length === 0) {
//             return (
//                 <div className="text-center py-5">
//                     <FaCalendar size={48} className="text-muted mb-3" />
//                     <h5>No Duty Schedules Assigned</h5>
//                     <p className="text-muted">You don't have any upcoming duty schedules.</p>
//                     <p className="text-muted small">Contact your supervisor for schedule information.</p>
//                 </div>
//             );
//         }

//         return (
//             <Card>
//                 <Card.Header className="bg-light">
//                     <h6 className="mb-0 d-flex align-items-center">
//                         <FaList className="me-2" />
//                         All My Schedules
//                     </h6>
//                 </Card.Header>
//                 <Card.Body>
//                     <div className="table-responsive">
//                         <Table hover className="mb-0 align-middle">
//                             <thead className="bg-light">
//                                 <tr>
//                                     <th>Schedule Type</th>
//                                     <th>Duty Hours</th>
//                                     <th>Office Location</th>
//                                     <th>Period</th>
//                                     <th>Status</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {mySchedules.map(schedule => (
//                                     <tr key={schedule._id}>
//                                         <td>
//                                             <div className="d-flex align-items-center">
//                                                 <FaCalendar className="me-2 text-primary" size={14} />
//                                                 <div>
//                                                     <div className="fw-medium">
//                                                         {formatShortScheduleType(schedule)}
//                                                     </div>
//                                                     <small className="text-muted">
//                                                         {schedule.scheduleType === 'recurring' ? 'Recurring' : 'Specific'}
//                                                     </small>
//                                                 </div>
//                                             </div>
//                                         </td>
//                                         <td>
//                                             <div className="d-flex align-items-center">
//                                                 <FaClock className="me-2 text-muted" size={14} />
//                                                 <div>
//                                                     <div className="fw-medium">
//                                                         {formatTime(schedule.dutyHours.startTime)} - {formatTime(schedule.dutyHours.endTime)}
//                                                     </div>
//                                                     <small className="text-muted d-block">
//                                                         {schedule.dutyHours.gracePeriod}m grace period
//                                                     </small>
//                                                 </div>
//                                             </div>
//                                         </td>
//                                         <td>
//                                             {schedule.officeLocation ? (
//                                                 <div className="d-flex align-items-center">
//                                                     <FaMapMarkerAlt className="me-2 text-info" size={14} />
//                                                     <div>
//                                                         <div className="fw-medium">
//                                                             {schedule.officeLocation.name}
//                                                         </div>
//                                                         <small className="text-muted d-block text-truncate" style={{ maxWidth: '150px' }}>
//                                                             {schedule.officeLocation.address}
//                                                         </small>
//                                                     </div>
//                                                 </div>
//                                             ) : (
//                                                 <span className="text-muted">Any Office</span>
//                                             )}
//                                         </td>
//                                         <td>
//                                             <div>
//                                                 <div className="fw-medium">
//                                                     {formatDate(schedule.startDate)}
//                                                 </div>
//                                                 {schedule.endDate ? (
//                                                     <small className="text-muted">
//                                                         to {formatDate(schedule.endDate)}
//                                                     </small>
//                                                 ) : (
//                                                     <small className="text-muted">No end date</small>
//                                                 )}
//                                             </div>
//                                         </td>
//                                         <td>
//                                             <Badge 
//                                                 bg={schedule.isActive ? 'success' : 'secondary'} 
//                                                 className="px-3 py-2"
//                                             >
//                                                 {schedule.isActive ? 'Active' : 'Inactive'}
//                                             </Badge>
//                                         </td>
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </Table>
//                     </div>
//                 </Card.Body>
//             </Card>
//         );
//     };

//     const renderManualScheduleCreator = () => {
//         return (
//             <Card>
//                 <Card.Header className="bg-light">
//                     <div className="d-flex justify-content-between align-items-center">
//                         <h6 className="mb-0 d-flex align-items-center">
//                             <FaEdit className="me-2 text-primary" />
//                             Manual Schedule Creator
//                         </h6>
//                         <div className="d-flex gap-2">
//                             {!isCreatingManual ? (
//                                 <Button 
//                                     variant="primary" 
//                                     size="sm"
//                                     onClick={handleStartManualSchedule}
//                                     disabled={!manualScheduleUser}
//                                     className="d-flex align-items-center"
//                                 >
//                                     <FaPlus className="me-1" /> Start Creating
//                                 </Button>
//                             ) : (
//                                 <>
//                                     <Button 
//                                         variant="outline-primary" 
//                                         size="sm"
//                                         onClick={addManualSchedule}
//                                         className="d-flex align-items-center"
//                                     >
//                                         <FaPlus className="me-1" /> Add Row
//                                     </Button>
//                                     <Button 
//                                         variant="success" 
//                                         size="sm"
//                                         onClick={saveManualSchedules}
//                                         className="d-flex align-items-center"
//                                     >
//                                         <FaSave className="me-1" /> Save All
//                                     </Button>
//                                     <Button 
//                                         variant="outline-secondary" 
//                                         size="sm"
//                                         onClick={resetManualSchedule}
//                                         className="d-flex align-items-center"
//                                     >
//                                         <FaTimes className="me-1" /> Cancel
//                                     </Button>
//                                 </>
//                             )}
//                         </div>
//                     </div>
//                 </Card.Header>
//                 <Card.Body>
//                     {/* Configuration Section */}
//                     {!isCreatingManual ? (
//                         <Row className="mb-4">
//                             <Col md={12}>
//                                 <h6 className="mb-3">Configuration</h6>
//                                 <Row className="g-3">
//                                     <Col md={6}>
//                                         <Form.Group>
//                                             <Form.Label>Select Employee</Form.Label>
//                                             <Form.Select
//                                                 value={manualScheduleUser || ''}
//                                                 onChange={(e) => setManualScheduleUser(e.target.value)}
//                                                 size="sm"
//                                             >
//                                                 <option value="">Select employee</option>
//                                                 {users.map(user => (
//                                                     <option key={user._id} value={user._id}>
//                                                         {user.name} - {user.email}
//                                                     </option>
//                                                 ))}
//                                             </Form.Select>
//                                         </Form.Group>
//                                     </Col>
//                                     <Col md={3}>
//                                         <Form.Group>
//                                             <Form.Label>Start Date</Form.Label>
//                                             <Form.Control
//                                                 type="date"
//                                                 value={manualStartDate}
//                                                 onChange={(e) => setManualStartDate(e.target.value)}
//                                                 size="sm"
//                                                 min={new Date().toISOString().split('T')[0]}
//                                             />
//                                         </Form.Group>
//                                     </Col>
//                                     <Col md={3}>
//                                         <Form.Group>
//                                             <Form.Label>Number of Days</Form.Label>
//                                             <Form.Control
//                                                 type="number"
//                                                 min="1"
//                                                 max="90"
//                                                 value={manualDays}
//                                                 onChange={(e) => setManualDays(parseInt(e.target.value) || 7)}
//                                                 size="sm"
//                                             />
//                                         </Form.Group>
//                                     </Col>
//                                     <Col md={12}>
//                                         <Form.Group>
//                                             <Form.Label>Days of Week</Form.Label>
//                                             <div className="d-flex flex-wrap gap-1">
//                                                 {weekDays.map(day => (
//                                                     <Button
//                                                         key={day.value}
//                                                         variant={manualWeekDays.includes(day.value) ? 'primary' : 'outline-secondary'}
//                                                         size="sm"
//                                                         onClick={() => {
//                                                             const newWeekDays = manualWeekDays.includes(day.value)
//                                                                 ? manualWeekDays.filter(d => d !== day.value)
//                                                                 : [...manualWeekDays, day.value];
//                                                             setManualWeekDays(newWeekDays.sort((a, b) => a - b));
//                                                         }}
//                                                         type="button"
//                                                         className="px-2"
//                                                     >
//                                                         {day.label.slice(0, 3)}
//                                                     </Button>
//                                                 ))}
//                                             </div>
//                                         </Form.Group>
//                                     </Col>
//                                 </Row>
//                             </Col>
//                         </Row>
//                     ) : (
//                         <>
//                             <Alert variant="info" className="mb-3">
//                                 <div className="d-flex align-items-center">
//                                     <FaInfoCircle className="me-2" />
//                                     <div>
//                                         <strong>Creating schedules for:</strong> {users.find(u => u._id === manualScheduleUser)?.name}
//                                         <div className="small mt-1">
//                                             Each row represents a day. You can customize working hours, location, and notes for each day individually.
//                                         </div>
//                                     </div>
//                                 </div>
//                             </Alert>

//                             {/* Manual Schedule Table */}
//                             <div className="table-responsive">
//                                 <Table striped bordered hover className="mb-0">
//                                     <thead className="bg-light">
//                                         <tr>
//                                             <th width="100">#</th>
//                                             <th width="120">Date</th>
//                                             <th width="100">Day</th>
//                                             <th width="100">Start Time</th>
//                                             <th width="100">End Time</th>
//                                             <th width="100">Grace (min)</th>
//                                             <th width="100">Break (min)</th>
//                                             <th width="150">Office Location</th>
//                                             <th width="200">Notes</th>
//                                             <th width="80">Actions</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody>
//                                         {manualSchedules.length === 0 ? (
//                                             <tr>
//                                                 <td colSpan="10" className="text-center py-4 text-muted">
//                                                     No schedules added yet. Click "Add Row" to start.
//                                                 </td>
//                                             </tr>
//                                         ) : (
//                                             manualSchedules.map((schedule, index) => (
//                                                 <tr key={schedule.id}>
//                                                     <td className="text-center">
//                                                         <strong>{index + 1}</strong>
//                                                     </td>
//                                                     <td>
//                                                         <Form.Control
//                                                             type="date"
//                                                             value={schedule.date}
//                                                             onChange={(e) => updateManualSchedule(index, 'date', e.target.value)}
//                                                             size="sm"
//                                                         />
//                                                     </td>
//                                                     <td className="text-center">
//                                                         <Badge bg="light" text="dark">
//                                                             {new Date(schedule.date).toLocaleDateString('en-US', { weekday: 'short' })}
//                                                         </Badge>
//                                                     </td>
//                                                     <td>
//                                                         <Form.Control
//                                                             type="time"
//                                                             value={schedule.dutyHours.startTime}
//                                                             onChange={(e) => updateManualSchedule(index, 'dutyHours.startTime', e.target.value)}
//                                                             size="sm"
//                                                         />
//                                                     </td>
//                                                     <td>
//                                                         <Form.Control
//                                                             type="time"
//                                                             value={schedule.dutyHours.endTime}
//                                                             onChange={(e) => updateManualSchedule(index, 'dutyHours.endTime', e.target.value)}
//                                                             size="sm"
//                                                         />
//                                                     </td>
//                                                     <td>
//                                                         <Form.Control
//                                                             type="number"
//                                                             min="0"
//                                                             max="60"
//                                                             value={schedule.dutyHours.gracePeriod}
//                                                             onChange={(e) => updateManualSchedule(index, 'dutyHours.gracePeriod', parseInt(e.target.value) || 15)}
//                                                             size="sm"
//                                                         />
//                                                     </td>
//                                                     <td>
//                                                         <Form.Control
//                                                             type="number"
//                                                             min="0"
//                                                             value={schedule.dutyHours.breakDuration}
//                                                             onChange={(e) => updateManualSchedule(index, 'dutyHours.breakDuration', parseInt(e.target.value) || 60)}
//                                                             size="sm"
//                                                         />
//                                                     </td>
//                                                     <td>
//                                                         <Form.Select
//                                                             value={schedule.officeLocationId || ''}
//                                                             onChange={(e) => updateManualSchedule(index, 'officeLocationId', e.target.value)}
//                                                             size="sm"
//                                                         >
//                                                             <option value="">Any Office</option>
//                                                             {officeLocations.map(location => (
//                                                                 <option key={location._id || location.id} value={location._id || location.id}>
//                                                                     {location.name}
//                                                                 </option>
//                                                             ))}
//                                                         </Form.Select>
//                                                     </td>
//                                                     <td>
//                                                         <Form.Control
//                                                             type="text"
//                                                             value={schedule.notes || ''}
//                                                             onChange={(e) => updateManualSchedule(index, 'notes', e.target.value)}
//                                                             placeholder="Notes..."
//                                                             size="sm"
//                                                         />
//                                                     </td>
//                                                     <td className="text-center">
//                                                         <div className="d-flex gap-1 justify-content-center">
//                                                             {index > 0 && (
//                                                                 <OverlayTrigger
//                                                                     placement="top"
//                                                                     overlay={<Tooltip>Copy from previous</Tooltip>}
//                                                                 >
//                                                                     <Button
//                                                                         variant="outline-info"
//                                                                         size="sm"
//                                                                         onClick={() => copyPreviousSchedule(index)}
//                                                                         className="px-2"
//                                                                     >
//                                                                         <FaCopy size={12} />
//                                                                     </Button>
//                                                                 </OverlayTrigger>
//                                                             )}
//                                                             <OverlayTrigger
//                                                                 placement="top"
//                                                                 overlay={<Tooltip>Remove this row</Tooltip>}
//                                                             >
//                                                                 <Button
//                                                                     variant="outline-danger"
//                                                                     size="sm"
//                                                                     onClick={() => removeManualSchedule(index)}
//                                                                     className="px-2"
//                                                                 >
//                                                                     <FaTrash size={12} />
//                                                                 </Button>
//                                                             </OverlayTrigger>
//                                                         </div>
//                                                     </td>
//                                                 </tr>
//                                             ))
//                                         )}
//                                     </tbody>
//                                 </Table>
//                             </div>
                            
//                             <div className="mt-3">
//                                 <div className="d-flex justify-content-between align-items-center">
//                                     <small className="text-muted">
//                                         Total: {manualSchedules.length} schedule(s)
//                                     </small>
//                                     <div className="d-flex gap-2">
//                                         <Button 
//                                             variant="outline-primary" 
//                                             size="sm"
//                                             onClick={addManualSchedule}
//                                             className="d-flex align-items-center"
//                                         >
//                                             <FaPlus className="me-1" /> Add Row
//                                         </Button>
//                                         <Button 
//                                             variant="success" 
//                                             size="sm"
//                                             onClick={saveManualSchedules}
//                                             className="d-flex align-items-center"
//                                         >
//                                             <FaSave className="me-1" /> Save All Schedules
//                                         </Button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </>
//                     )}
//                 </Card.Body>
//             </Card>
//         );
//     };

//     // Handle delete schedule
//     const handleDeleteSchedule = async (scheduleId) => {
//         if (!window.confirm('Are you sure you want to delete this schedule?')) {
//             return;
//         }

//         try {
//             const response = await axios.delete(`/api/duty-schedule/${scheduleId}`, {
//                 headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//             });

//             if (response.data.success) {
//                 fetchSchedules();
//                 alert('Duty schedule deleted successfully!');
//             }
//         } catch (error) {
//             console.error('Error deleting schedule:', error);
//             alert(error.response?.data?.message || 'Failed to delete schedule');
//         }
//     };

//     return (
//         <Card className="border-0 shadow-sm">
//             <Card.Header className="d-flex justify-content-between align-items-center bg-white border-bottom py-3">
//                 <div>
//                     <small className="text-muted">
//                         { activeTab === 'manual-create' ? 'Create manual schedules' : 
//                          'Manage all employee schedules'}
//                     </small>
//                 </div>
//                 {isAdmin() && activeTab === 'admin' && (
//                     <Button 
//                         size="sm" 
//                         variant="primary" 
//                         onClick={() => setActiveTab('manual-create')}
//                         className="d-flex align-items-center"
//                     >
//                         <FaPlus className="me-1" /> Create Schedule
//                     </Button>
//                 )}
//             </Card.Header>
            
//             <Card.Body className="p-3">
//                 {isAdmin() ? (
//                     <Tabs
//                         activeKey={activeTab}
//                         onSelect={(k) => {
//                             setActiveTab(k);
//                             if (k !== 'manual-create') {
//                                 resetManualSchedule();
//                             }
//                         }}
//                         className="mb-4"
//                     >
                        
//                         <Tab eventKey="manual-create" title={
//                             <span className="d-flex align-items-center">
//                                 <FaEdit className="me-1" /> Create Manual
//                             </span>
//                         }>
//                             {renderManualScheduleCreator()}
//                         </Tab>
//                     </Tabs>
//                 ) : (
//                     // Non-admin users only see "My Schedule" tab
//                     <Tabs
//                         activeKey={activeTab}
//                         onSelect={setActiveTab}
//                         className="mb-4"
//                     >
//                     </Tabs>
//                 )}
//             </Card.Body>
//         </Card>
//     );
// };

// export default DutyScheduleManager;

//-----------------------------------------------------------------