import React, { useState, useEffect } from 'react';
import {
    Tabs,
    Tab,
    Row,
    Col,
    Card,
    Button,
    Form,
    Spinner,
    Table,
    Badge,
    Modal,
    Alert,
    Container
} from 'react-bootstrap';
import {
    FaCalendar,
    FaClock,
    FaUsers,
    FaChartBar,
    FaDownload,
    FaFilter,
    FaSync,
    FaMapMarkerAlt,
    FaExclamationTriangle,
    FaBuilding,
    FaUser
} from 'react-icons/fa';
import axios from 'axios';
import LocationPermissionWrapper from './LocationPermissionWrapper';
import AttendanceButton from './AttendanceButton';
import '../../stylesheet/attendance/AttendanceDashboard.css';
import OfficeLocationManager from './OfficeLocationManager';
import DutyScheduleManager from './admin/DutyScheduleManager';
import UpcomingDutySchedule from './UpcomingDutySchedule';
import UserDutySchedules from './UserDutySchedules';
import Header from '../retailer/Header'

const AttendanceDashboard = () => {
    const [user, setUser] = useState(null);
    const [company, setCompany] = useState(null);
    const [activeTab, setActiveTab] = useState('today');
    const [attendanceData, setAttendanceData] = useState([]);
    const [reports, setReports] = useState([]);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [filters, setFilters] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        userId: '',
        status: ''
    });
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    const [companyLoading, setCompanyLoading] = useState(false);

    // Fetch user and company data on component mount
    useEffect(() => {
        fetchUserAndCompany();
    }, []);

    // Fetch attendance data when tab changes
    useEffect(() => {
        if (user && company) {
            if (activeTab === 'history') {
                fetchAttendanceHistory();
            } else if (activeTab === 'reports') {
                fetchReports();
            } else if (activeTab === 'team') {
                fetchTeamAttendance();
            }
        }
    }, [activeTab, filters, user, company]);

    const fetchUserAndCompany = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch user data
            const userResponse = await axios.get('/api/auth/me', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (userResponse.data.user) {
                setUser(userResponse.data.user);

                // Fetch company data after getting user
                await fetchCompanyData();
            } else {
                setError('Failed to load user information');
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            if (error.response?.status === 401) {
                setError('Session expired. Please login again.');
                // Redirect to login
                // window.location.href = '/login';
            } else {
                setError('Failed to load user information. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanyData = async () => {
        setCompanyLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/attendance/company-data', {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('📦 Company data response:', response.data);

            if (response.data.success) {
                const companyData = response.data.data;

                // Debug log
                console.log('🏢 Processed Company Data for Attendance:', {
                    name: companyData.name,
                    id: companyData._id,
                    hasAttendanceSettings: !!companyData.attendanceSettings,
                    officeLocations: companyData.attendanceSettings?.officeLocations,
                    officeLocationsCount: companyData.attendanceSettings?.officeLocations?.length || 0,
                    geoFencingEnabled: companyData.attendanceSettings?.geoFencingEnabled || false
                });

                setCompany(companyData);
            } else {
                console.error('Failed to fetch company data:', response.data.message);
                setError('Failed to load company attendance settings');
            }
        } catch (error) {
            console.error('Error fetching company data:', error);

            // Fallback to existing endpoint if new one fails
            try {
                console.log('Trying fallback to /api/my-company...');
                const fallbackResponse = await axios.get('/api/my-company', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });

                if (fallbackResponse.data.success) {
                    const fallbackData = {
                        ...fallbackResponse.data.company,
                        _id: fallbackResponse.data.company._id,
                        name: fallbackResponse.data.currentCompanyName,
                        attendanceSettings: fallbackResponse.data.company?.attendanceSettings || {
                            geoFencingEnabled: false,
                            officeLocations: [],
                            workingHours: {
                                startTime: '09:00',
                                endTime: '17:00',
                                gracePeriod: 15
                            }
                        }
                    };
                    setCompany(fallbackData);
                    console.log('Fallback successful:', fallbackData);
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                setError('Failed to load company information');
            }
        } finally {
            setCompanyLoading(false);
        }
    };

    const getUserRole = () => {
        return user?.role || 'User'; // Default to 'User' if user is undefined
    };

    // Check if user has admin role
    const isAdmin = () => {
        const role = getUserRole();
        return role === 'Admin' || role === 'ADMINISTRATOR' || role === 'Supervisor' || user?.isAdmin;
    };

    const fetchAttendanceHistory = async () => {
        if (!user || !company) return;

        setDataLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication required. Please login again.');
                return;
            }

            const response = await axios.get('/api/attendance/my-attendance', {
                params: {
                    companyId: company._id,
                    startDate: filters.startDate,
                    endDate: filters.endDate
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setAttendanceData(response.data.data.attendance || []);
                setStats(response.data.data.statistics || null);
            }
        } catch (error) {
            console.error('Error fetching attendance history:', error);
            setError(error.response?.data?.message || 'Failed to fetch attendance history');
        } finally {
            setDataLoading(false);
        }
    };

    const fetchReports = async () => {
        if (!user || !company) return;

        setDataLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication required. Please login again.');
                return;
            }

            const response = await axios.get('/api/attendance/reports', {
                params: {
                    companyId: company._id,
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    reportType: 'daily'
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setReports(response.data.data.report || []);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
            setError(error.response?.data?.message || 'Failed to fetch reports');
        } finally {
            setDataLoading(false);
        }
    };

    const fetchTeamAttendance = async () => {
        if (!isAdmin() || !user || !company) {
            console.log('Cannot fetch team attendance - Conditions:', {
                isAdmin: isAdmin(),
                userExists: !!user,
                companyExists: !!company,
                userRole: user?.role,
                userIsAdmin: user?.isAdmin
            });
            return;
        }

        setDataLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication required. Please login again.');
                return;
            }

            const response = await axios.get(`/api/attendance/company/${company._id}`, {
                params: {
                    ...filters,
                    page: 1,
                    limit: 100
                },
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Team attendance response:', response.data);

            if (response.data.success) {
                // The API should return attendance with populated user data
                setAttendanceData(response.data.data.attendance || []);
            } else {
                setError(response.data.message || 'Failed to fetch team attendance');
            }
        } catch (error) {
            console.error('Error fetching team attendance:', error);
            console.error('Full error object:', error.response?.data);

            if (error.response?.status === 403) {
                setError('Access denied. You need admin privileges to view team attendance.');
            } else if (error.response?.status === 401) {
                setError('Session expired. Please login again.');
            } else {
                setError(error.response?.data?.message || 'Failed to fetch team attendance');
            }
        } finally {
            setDataLoading(false);
        }
    };

    const debugUserAccess = () => {
        console.log('=== DEBUG USER ACCESS ===');
        console.log('User:', {
            id: user?._id,
            name: user?.name,
            email: user?.email,
            role: user?.role,
            isAdmin: user?.isAdmin,
            company: user?.company // This should be an array of company IDs
        });
        console.log('Company:', {
            id: company?._id,
            name: company?.name
        });
        console.log('Is Admin?', isAdmin());
        console.log('User role check:', {
            isAdminRole: user?.role === 'Admin',
            isAdministrator: user?.role === 'ADMINISTRATOR',
            isSupervisor: user?.role === 'Supervisor',
            isAdminFlag: user?.isAdmin === true
        });
        console.log('=== END DEBUG ===');
    };

    // Call this function in useEffect or add a debug button
    useEffect(() => {
        if (user && company) {
            debugUserAccess();
        }
    }, [user, company]);

    const handleExport = async (type) => {
        if (!user || !company) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Authentication required. Please login again.');
                return;
            }

            const response = await axios.get('/api/attendance/reports', {
                params: {
                    companyId: company._id,
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    reportType: type
                },
                responseType: 'blob',
                headers: { Authorization: `Bearer ${token}` }
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance-${type}-${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export error:', error);
            alert('Export failed: ' + (error.response?.data?.message || error.message));
        }
    };

    const renderStatsCard = () => {
        if (!stats) return null;

        return (
            <Row className="mb-4">
                <Col md={3} sm={6}>
                    <Card className="stats-card present">
                        <Card.Body>
                            <h6>Present</h6>
                            <h2>{stats.present || 0}</h2>
                            <small className="text-muted">Days</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3} sm={6}>
                    <Card className="stats-card absent">
                        <Card.Body>
                            <h6>Absent</h6>
                            <h2>{stats.absent || 0}</h2>
                            <small className="text-muted">Days</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3} sm={6}>
                    <Card className="stats-card half-day">
                        <Card.Body>
                            <h6>Half Day</h6>
                            <h2>{stats.halfDay || 0}</h2>
                            <small className="text-muted">Days</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3} sm={6}>
                    <Card className="stats-card total">
                        <Card.Body>
                            <h6>Total Days</h6>
                            <h2>{stats.total || 0}</h2>
                            <small className="text-muted">Tracked</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        );
    };

    const renderHistoryTable = () => {
        if (dataLoading) {
            return (
                <div className="text-center py-5">
                    <Spinner animation="border" />
                    <p className="mt-3">Loading attendance history...</p>
                </div>
            );
        }

        if (attendanceData.length === 0) {
            return (
                <div className="text-center py-5">
                    <FaCalendar size={48} className="text-muted mb-3" />
                    <h5>No attendance records found</h5>
                    <p className="text-muted">Select a different date range to view records</p>
                </div>
            );
        }

        return (
            <div className="table-responsive">
                <Table hover striped>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Day</th>
                            <th>Clock In</th>
                            <th>Clock Out</th>
                            <th>Total Hours</th>
                            <th>Status</th>
                            <th>Location</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendanceData.map((record) => (
                            <tr key={record._id}>
                                <td>
                                    {new Date(record.date).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </td>
                                <td>
                                    {new Date(record.date).toLocaleDateString('en-US', {
                                        weekday: 'short'
                                    })}
                                </td>
                                <td>
                                    {record.clockIn?.time ? (
                                        new Date(record.clockIn.time).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                        })
                                    ) : (
                                        <span className="text-muted">-</span>
                                    )}
                                    {record.lateMinutes > 0 && (
                                        <Badge bg="warning" className="ms-2" pill>
                                            +{record.lateMinutes}m
                                        </Badge>
                                    )}
                                </td>
                                <td>
                                    {record.clockOut?.time ? (
                                        new Date(record.clockOut.time).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                        })
                                    ) : (
                                        <span className="text-muted">-</span>
                                    )}
                                </td>
                                <td>
                                    {record.totalHours > 0 ? (
                                        <strong>{record.totalHours.toFixed(2)} hrs</strong>
                                    ) : (
                                        <span className="text-muted">-</span>
                                    )}
                                    {record.overtime > 0 && (
                                        <Badge bg="success" className="ms-2" pill>
                                            +{record.overtime.toFixed(2)}
                                        </Badge>
                                    )}
                                </td>
                                <td>
                                    <Badge
                                        bg={
                                            record.status === 'present' ? 'success' :
                                                record.status === 'absent' ? 'danger' :
                                                    record.status === 'half-day' ? 'warning' : 'secondary'
                                        }
                                        pill
                                    >
                                        {record.status?.charAt(0).toUpperCase() + record.status?.slice(1)}
                                    </Badge>
                                </td>
                                <td>
                                    {record.source === 'geo-fence' ? (
                                        <Badge bg="info" pill>
                                            <FaMapMarkerAlt className="me-1" />
                                            Geo-fenced
                                        </Badge>
                                    ) : (
                                        <Badge bg="secondary" pill>
                                            Manual
                                        </Badge>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        );
    };

    const renderTeamAttendance = () => {
        if (!isAdmin()) {
            return (
                <div className="text-center py-5">
                    <FaExclamationTriangle size={48} className="text-warning mb-3" />
                    <h5>Access Restricted</h5>
                    <p className="text-muted">You need admin privileges to view team attendance</p>
                </div>
            );
        }

        if (dataLoading) {
            return (
                <div className="text-center py-5">
                    <Spinner animation="border" />
                    <p className="mt-3">Loading team attendance...</p>
                </div>
            );
        }

        if (attendanceData.length === 0) {
            return (
                <div className="text-center py-5">
                    <FaUsers size={48} className="text-muted mb-3" />
                    <h5>No team attendance records found</h5>
                    <p className="text-muted">Select a different date range to view records</p>
                </div>
            );
        }

        return (
            <div className="table-responsive">
                <Table hover striped className="align-middle">
                    <thead>
                        <tr>
                            <th style={{ width: '20%', minWidth: '150px' }}>Employee</th>
                            <th style={{ width: '12%', minWidth: '100px' }}>Date</th>
                            <th style={{ width: '8%', minWidth: '70px' }}>Day</th>
                            <th style={{ width: '15%', minWidth: '120px' }}>Clock In</th>
                            <th style={{ width: '15%', minWidth: '120px' }}>Clock Out</th>
                            <th style={{ width: '12%', minWidth: '100px' }}>Total Hours</th>
                            <th style={{ width: '10%', minWidth: '90px' }}>Status</th>
                            <th style={{ width: '8%', minWidth: '80px' }}>Location</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendanceData.map((record) => (
                            <tr key={record._id}>
                                {/* Employee Column - Compact with text truncation */}
                                <td className="text-nowrap">
                                    <div className="d-flex align-items-center">
                                        <div className="flex-shrink-0 me-2">
                                            <div className="bg-light rounded-circle d-flex align-items-center justify-content-center"
                                                style={{ width: '32px', height: '32px' }}>
                                                <FaUser size={14} className="text-secondary" />
                                            </div>
                                        </div>
                                        <div className="flex-grow-1 overflow-hidden">
                                            <div className="fw-semibold text-truncate"
                                                style={{ maxWidth: '120px' }}
                                                title={record.user?.name || 'Unknown User'}>
                                                {record.user?.name || 'Unknown User'}
                                            </div>
                                            <small className="text-muted text-truncate d-block"
                                                style={{ maxWidth: '120px' }}
                                                title={record.user?.email || ''}>
                                                {record.user?.email || ''}
                                            </small>
                                        </div>
                                    </div>
                                </td>

                                {/* Date Column */}
                                <td className="text-nowrap small">
                                    {new Date(record.date).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </td>

                                {/* Day Column */}
                                <td className="text-nowrap small">
                                    {new Date(record.date).toLocaleDateString('en-US', {
                                        weekday: 'short'
                                    })}
                                </td>

                                {/* Clock In Column */}
                                <td className="text-nowrap">
                                    <div className="d-flex align-items-center">
                                        <span className="fw-medium">
                                            {record.clockIn?.time ? (
                                                new Date(record.clockIn.time).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </span>
                                        {record.lateMinutes > 0 && (
                                            <Badge bg="warning" className="ms-1" pill style={{ fontSize: '0.65rem' }}>
                                                +{record.lateMinutes}m
                                            </Badge>
                                        )}
                                    </div>
                                </td>

                                {/* Clock Out Column */}
                                <td className="text-nowrap fw-medium">
                                    {record.clockOut?.time ? (
                                        new Date(record.clockOut.time).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                        })
                                    ) : (
                                        <span className="text-muted">-</span>
                                    )}
                                </td>

                                {/* Total Hours Column */}
                                <td className="text-nowrap">
                                    <div className="d-flex align-items-center">
                                        <span className="fw-medium">
                                            {record.totalHours > 0 ? (
                                                <>{record.totalHours.toFixed(2)} hrs</>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </span>
                                        {record.overtime > 0 && (
                                            <Badge bg="success" className="ms-1" pill style={{ fontSize: '0.65rem' }}>
                                                +{record.overtime.toFixed(2)}
                                            </Badge>
                                        )}
                                    </div>
                                </td>

                                {/* Status Column */}
                                <td className="text-nowrap">
                                    <Badge
                                        bg={
                                            record.status === 'present' ? 'success' :
                                                record.status === 'absent' ? 'danger' :
                                                    record.status === 'half-day' ? 'warning' : 'secondary'
                                        }
                                        pill
                                        className="px-2 py-1"
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        {record.status?.charAt(0).toUpperCase() + record.status?.slice(1)}
                                    </Badge>
                                </td>

                                {/* Location Column */}
                                <td className="text-nowrap">
                                    <Badge
                                        bg={record.source === 'geo-fence' ? 'info' : 'secondary'}
                                        pill
                                        className="px-2 py-1 d-flex align-items-center"
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        {record.source === 'geo-fence' ? (
                                            <>
                                                <FaMapMarkerAlt className="me-1" size={10} />
                                                <span>Geo</span>
                                            </>
                                        ) : (
                                            'Manual'
                                        )}
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        );
    };

    const renderReports = () => {
        if (dataLoading) {
            return (
                <div className="text-center py-5">
                    <Spinner animation="border" />
                    <p className="mt-3">Generating reports...</p>
                </div>
            );
        }

        return (
            <>
                <div className="d-flex justify-content-between mb-4">
                    <div>
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleExport('daily')}
                        >
                            <FaDownload className="me-2" />
                            Daily Report
                        </Button>
                        <Button
                            variant="outline-success"
                            size="sm"
                            className="ms-2"
                            onClick={() => handleExport('summary')}
                        >
                            <FaChartBar className="me-2" />
                            Summary Report
                        </Button>
                    </div>
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={fetchReports}
                    >
                        <FaSync className="me-2" />
                        Refresh
                    </Button>
                </div>

                {reports.length > 0 ? (
                    <Table hover responsive>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Present</th>
                                <th>Absent</th>
                                <th>Half Day</th>
                                <th>Avg Hours</th>
                                <th>Total Hours</th>
                                <th>Users</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report, index) => (
                                <tr key={index}>
                                    <td>{report._id}</td>
                                    <td>
                                        <Badge bg="success">
                                            {report.statuses?.find(s => s.status === 'present')?.count || 0}
                                        </Badge>
                                    </td>
                                    <td>
                                        <Badge bg="danger">
                                            {report.statuses?.find(s => s.status === 'absent')?.count || 0}
                                        </Badge>
                                    </td>
                                    <td>
                                        <Badge bg="warning">
                                            {report.statuses?.find(s => s.status === 'half-day')?.count || 0}
                                        </Badge>
                                    </td>
                                    <td>
                                        {report.statuses?.find(s => s.status === 'present')?.avgHours?.toFixed(2) || '0.00'}
                                    </td>
                                    <td>{report.totalHours?.toFixed(2) || '0.00'}</td>
                                    <td>{report.totalUsers || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                ) : (
                    <div className="text-center py-5">
                        <FaChartBar size={48} className="text-muted mb-3" />
                        <h5>No report data available</h5>
                        <p className="text-muted">Select a date range to generate reports</p>
                    </div>
                )}
            </>
        );
    };

    // Show loading state
    if (loading || companyLoading) {
        return (
            <Container className="attendance-dashboard">
                <div className="dashboard-header mb-4">
                    <h3>
                        <FaClock className="me-2" />
                        Attendance Management
                    </h3>
                </div>
                <Card>
                    <Card.Body className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-3">Loading attendance system...</p>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    // Show error state
    if (error) {
        return (
            <Container className="attendance-dashboard">
                <div className="dashboard-header mb-4">
                    <h3>
                        <FaClock className="me-2" />
                        Attendance Management
                    </h3>
                    <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={debugUserAccess}
                        className="me-2"
                    >
                        Debug Access
                    </Button>
                </div>
                <Card>
                    <Card.Body className="text-center py-5">
                        <Alert variant="danger">
                            <FaExclamationTriangle className="me-2" />
                            {error}
                        </Alert>
                        <Button
                            variant="primary"
                            className="mt-3"
                            onClick={fetchUserAndCompany}
                        >
                            <FaSync className="me-2" />
                            Retry
                        </Button>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    // Show no company selected state
    if (!company) {
        return (
            <Container className="attendance-dashboard">
                <div className="dashboard-header mb-4">
                    <h3>
                        <FaClock className="me-2" />
                        Attendance Management
                    </h3>
                </div>
                <Card>
                    <Card.Body className="text-center py-5">
                        <FaBuilding size={48} className="text-muted mb-3" />
                        <h5>No Company Selected</h5>
                        <p className="text-muted">Please select a company to access attendance features</p>
                        <Button
                            variant="primary"
                            className="mt-3"
                            onClick={() => window.location.href = '/select-company'}
                        >
                            Select Company
                        </Button>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    // Show no user state
    if (!user) {
        return (
            <Container className="attendance-dashboard">
                <div className="dashboard-header mb-4">
                    <h3>
                        <FaClock className="me-2" />
                        Attendance Management
                    </h3>
                </div>
                <Card>
                    <Card.Body className="text-center py-5">
                        <FaUser size={48} className="text-muted mb-3" />
                        <h5>User Not Found</h5>
                        <p className="text-muted">Please login to access attendance features</p>
                        <Button
                            variant="primary"
                            className="mt-3"
                            onClick={() => window.location.href = '/login'}
                        >
                            Login
                        </Button>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    return (
        <div>
            <Header />
            <Container className="attendance-dashboard">
                <LocationPermissionWrapper
                    onLocationUpdate={setLocation}
                    required={true}
                >
                    <div className="dashboard-header mb-4">
                        <div>
                            <h3>
                                <FaClock className="me-2" />
                                Attendance Management
                            </h3>
                            <p className="text-muted mb-0">
                                <FaBuilding className="me-1" />
                                {company.name}
                                <span className="mx-2">•</span>
                                <FaUser className="me-1" />
                                {user.name}
                                <span className="mx-2">•</span>
                                <Badge bg={isAdmin() ? "success" : "info"}>
                                    {getUserRole()}
                                </Badge>
                            </p>
                        </div>
                        <div className="header-actions">

                            {/* {company.attendanceSettings?.geoFencingEnabled && (
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => setShowLocationModal(true)}
                                className="me-2"
                            >
                                <FaMapMarkerAlt className="me-2" />
                                Office Locations
                            </Button>
                        )} */}

                            {(
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => setShowLocationModal(true)}
                                    className="me-2"
                                >
                                    <FaMapMarkerAlt className="me-2" />
                                    Office Locations
                                </Button>
                            )}
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={fetchUserAndCompany}
                            >
                                <FaSync className="me-2" />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <Alert variant="danger" className="mb-4">
                            <FaExclamationTriangle className="me-2" />
                            {error}
                        </Alert>
                    )}

                    <Row>
                        <Col lg={4}>
                            <AttendanceButton
                                user={user}
                                company={company}
                                currentLocation={location}
                                onAttendanceUpdate={fetchAttendanceHistory}
                            />

                            <UpcomingDutySchedule user={user} company={company} />

                            {/* <Card className="mt-4 shadow-sm">
                                <Card.Header>
                                    <h6 className="mb-0">
                                        <FaFilter className="me-2" />
                                        Filters
                                    </h6>
                                </Card.Header>
                                <Card.Body>
                                    <Form>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Date Range</Form.Label>
                                            <Row>
                                                <Col>
                                                    <Form.Control
                                                        type="date"
                                                        value={filters.startDate}
                                                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                                    />
                                                </Col>
                                                <Col>
                                                    <Form.Control
                                                        type="date"
                                                        value={filters.endDate}
                                                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                                    />
                                                </Col>
                                            </Row>
                                        </Form.Group>
                                        {isAdmin() && activeTab === 'team' && (
                                            <Form.Group className="mb-3">
                                                <Form.Label>Employee</Form.Label>
                                                <Form.Select
                                                    value={filters.userId}
                                                    onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                                                >
                                                    <option value="">All Employees</option>
                                                </Form.Select>
                                            </Form.Group>
                                        )}

                                        <Form.Group className="mb-3">
                                            <Form.Label>Status</Form.Label>
                                            <Form.Select
                                                value={filters.status}
                                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                            >
                                                <option value="">All Status</option>
                                                <option value="present">Present</option>
                                                <option value="absent">Absent</option>
                                                <option value="half-day">Half Day</option>
                                            </Form.Select>
                                        </Form.Group>

                                        <Button
                                            variant="primary"
                                            onClick={() => {
                                                if (activeTab === 'history') fetchAttendanceHistory();
                                                else if (activeTab === 'reports') fetchReports();
                                                else if (activeTab === 'team') fetchTeamAttendance();
                                            }}
                                            className="w-100"
                                        >
                                            Apply Filters
                                        </Button>
                                    </Form>
                                </Card.Body>
                            </Card> */}
                        </Col>

                        <Col lg={8}>
                            <Tabs
                                activeKey={activeTab}
                                onSelect={(k) => setActiveTab(k)}
                                className="mb-4"
                            >
                                <Tab eventKey="today" title={<><FaClock /> Today</>}>
                                    <Card>
                                        <Card.Body>
                                            <h5 className="mb-4">Today's Overview</h5>
                                            {renderStatsCard()}
                                            {renderHistoryTable()}
                                        </Card.Body>
                                    </Card>
                                </Tab>

                                <Tab eventKey="history" title={<><FaCalendar /> History</>}>
                                    <Card>
                                        <Card.Body>
                                            <h5 className="mb-4">Attendance History</h5>
                                            {renderStatsCard()}
                                            {renderHistoryTable()}
                                        </Card.Body>
                                    </Card>
                                </Tab>

                                <Tab eventKey="my-duty-schedule" title={<><FaCalendar /> My Duty</>}>
                                    <Card>
                                        <Card.Body>
                                            <h5 className="mb-4 d-flex align-items-center">
                                                <FaCalendar className="me-2 text-primary" />
                                                My Upcoming Duty Schedules
                                            </h5>

                                            {/* Enhanced UpcomingDutySchedule component with full view */}
                                            <UserDutySchedules user={user} company={company} />

                                            {/* Additional info for users */}
                                            <div className="mt-4">
                                                <Alert variant="info" className="small">
                                                    <strong>ℹ️ Note:</strong> This shows all your upcoming duty schedules.
                                                    For today's schedule and attendance, check the "Today" tab.
                                                </Alert>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Tab>

                                {isAdmin() && (
                                    <Tab eventKey="team" title={<><FaUsers /> Team</>}>
                                        <Card>
                                            <Card.Body>
                                                <h5 className="mb-4">Team Attendance</h5>
                                                {renderTeamAttendance()}
                                            </Card.Body>
                                        </Card>
                                    </Tab>
                                )}

                                {isAdmin() && (
                                    <Tab eventKey="reports" title={<><FaChartBar /> Reports</>}>
                                        <Card>
                                            <Card.Body>
                                                <h5 className="mb-4">Attendance Reports</h5>
                                                {renderReports()}
                                            </Card.Body>
                                        </Card>
                                    </Tab>
                                )}
                                {isAdmin() && (
                                    <Tab eventKey="duty-schedule" title={<><FaCalendar /> Duty Schedule</>}>
                                        <Card>
                                            <Card.Body>
                                                <h5 className="mb-4">Duty Schedule Management</h5>
                                                <DutyScheduleManager company={company} user={user} />
                                            </Card.Body>
                                        </Card>
                                    </Tab>
                                )}
                            </Tabs>
                        </Col>
                    </Row>
                </LocationPermissionWrapper>

                {/* Office Locations Modal */}
                <Modal show={showLocationModal} onHide={() => setShowLocationModal(false)} size="xl">
                    <Modal.Header closeButton>
                        <Modal.Title>
                            <FaMapMarkerAlt className="me-2" />
                            Office Locations Management
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <OfficeLocationManager
                            company={company}
                            onUpdate={() => {
                                // Refresh company data when locations are updated
                                fetchCompanyData();
                            }}
                        />
                    </Modal.Body>
                </Modal>
            </Container>
        </div>
    );
};

// Sub-component for office locations
const OfficeLocationsList = ({ company }) => {
    const [locations, setLocations] = useState([]);

    useEffect(() => {
        if (company?.attendanceSettings?.officeLocations) {
            setLocations(company.attendanceSettings.officeLocations);
        }
    }, [company]);

    return (
        <div>
            {locations.length === 0 ? (
                <div className="text-center py-4">
                    <FaMapMarkerAlt size={48} className="text-muted mb-3" />
                    <h5>No office locations configured</h5>
                    <p className="text-muted">Contact your administrator to add office locations</p>
                </div>
            ) : (
                <>
                    <Alert variant="info" className="mb-3">
                        <strong>Note:</strong> Attendance is only available when you are within the specified radius of these locations.
                    </Alert>
                    <Row>
                        {locations.map((location, index) => (
                            <Col md={6} key={index} className="mb-3">
                                <Card className={location.isActive ? 'border-success' : 'border-secondary'}>
                                    <Card.Body>
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <h6 className="mb-0">{location.name}</h6>
                                            <Badge bg={location.isActive ? 'success' : 'secondary'}>
                                                {location.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                        <p className="small text-muted mb-2">{location.address}</p>
                                        <div className="location-details">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Coordinates:</span>
                                                <code className="small">
                                                    {location.coordinates.lat.toFixed(6)}, {location.coordinates.lng.toFixed(6)}
                                                </code>
                                            </div>
                                            <div className="d-flex justify-content-between mt-2">
                                                <span className="text-muted">Radius:</span>
                                                <strong>{location.radius} meters</strong>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </>
            )}
        </div>
    );
};

export default AttendanceDashboard;


