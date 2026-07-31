import React, { useState, useEffect } from 'react';
import { Container, Card, Spinner, Alert, Row, Col, Tabs, Tab, Badge, Table, Button, Modal } from 'react-bootstrap';
import { FaClock, FaBuilding, FaUser, FaSync, FaMapMarkerAlt, FaExclamationTriangle, FaCalendar, FaUsers, FaChartBar } from 'react-icons/fa';
import axios from 'axios';
import LocationPermissionWrapper from './LocationPermissionWrapper';
import AttendanceButton from './AttendanceButton';
import '../../stylesheet/attendance/AttendanceDashboard.css';
import OfficeLocationManager from './OfficeLocationManager';
import DutyScheduleManager from './admin/DutyScheduleManager';
import UserDutySchedules from './UserDutySchedules';
import Header from '../retailer/Header';

// Create axios instance with auth interceptor
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

const AttendanceDashboard = () => {
    const [user, setUser] = useState(null);
    const [company, setCompany] = useState(null);
    const [activeTab, setActiveTab] = useState('today');
    const [attendanceData, setAttendanceData] = useState([]);
    const [reports, setReports] = useState([]);
    const [location, setLocation] = useState(null);
    const [locationReady, setLocationReady] = useState(false);
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

    useEffect(() => {
        if (user && company) {
            if (activeTab === 'history') {
                fetchAttendanceHistory();
            } else if (activeTab === 'reports') {
                fetchReports();
            } else if (activeTab === 'team') {
                fetchTeamAttendance();
            } else if (activeTab === 'today') {
                fetchTodayAttendance();
            }
        }
    }, [activeTab, filters, user, company]);

    // Get user from localStorage/token
    const getUserFromToken = () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;

            // Decode JWT token
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const decoded = JSON.parse(jsonPayload);
            
            console.log('🔑 Decoded JWT:', decoded);

            // Extract role from claims
            let role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 
                      decoded['role'] || 
                      decoded.Role || 
                      'User';

            // Check if user is admin based on role
            const isAdmin = role === 'Admin' || 
                           role === 'ADMINISTRATOR' || 
                           role === 'Supervisor' || 
                           role === 'Owner' ||
                           decoded.isAdmin === 'true' || 
                           decoded.isAdmin === true;

            return {
                id: decoded.userId || decoded.sub || decoded.nameid,
                name: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 
                      decoded.name || 
                      decoded.unique_name || 
                      'User',
                email: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || 
                       decoded.email || 
                       decoded.Email,
                role: role,
                isAdmin: isAdmin,
                isSupervisor: role === 'Supervisor' || role === 'supervisor',
                isOwner: role === 'Owner' || role === 'owner',
                companies: decoded.companies || [],
                currentCompany: decoded.currentCompany || decoded.companyId
            };
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    };

    // Get company from token or session
    const getCompanyFromToken = () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const decoded = JSON.parse(jsonPayload);
                
                // Try multiple claim names for company ID
                const companyId = decoded.currentCompany || 
                                decoded.companyId || 
                                decoded.currentCompanyId ||
                                decoded.CompanyId;
                
                const companyName = decoded.currentCompanyName || 
                                  decoded.companyName ||
                                  decoded.CompanyName;

                console.log('🏢 Company from token:', { companyId, companyName, decoded });
                
                if (companyId) {
                    return {
                        id: companyId,
                        _id: companyId,
                        name: companyName || 'Company',
                        attendanceSettings: {
                            geoFencingEnabled: false,
                            officeLocations: [],
                            workingHours: { startTime: '09:00', endTime: '17:00', gracePeriod: 15 }
                        }
                    };
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting company from token:', error);
            return null;
        }
    };

    const fetchUserAndCompany = async () => {
        setLoading(true);
        setError(null);

        try {
            // Get user from token
            const userData = getUserFromToken();
            if (userData) {
                console.log('👤 User data from token:', userData);
                setUser(userData);
                
                // Get company from token
                const companyData = getCompanyFromToken();
                if (companyData) {
                    console.log('🏢 Company from token:', companyData);
                    setCompany(companyData);
                    // Fetch full company data including attendance settings
                    await fetchCompanyData(companyData.id);
                } else {
                    // Try to fetch company data from API
                    await fetchCompanyDataFromAPI();
                }
            } else {
                setError('Please login to access attendance features');
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            setError('Failed to load user information.');
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanyData = async (companyId) => {
        if (!companyId) return;
        
        setCompanyLoading(true);
        try {
            const response = await api.get('/api/attendance/company-data');
            
            if (response.data.success) {
                const companyData = response.data.data;
                console.log('📦 Company data from API:', companyData);
                setCompany(prev => ({
                    id: companyData._id || companyData.id,
                    _id: companyData._id || companyData.id,
                    name: companyData.name,
                    attendanceSettings: companyData.attendanceSettings || {
                        geoFencingEnabled: false,
                        officeLocations: [],
                        workingHours: { startTime: '09:00', endTime: '17:00', gracePeriod: 15 }
                    }
                }));
            }
        } catch (error) {
            console.error('Error fetching company data:', error);
            // Keep the basic company data from token
        } finally {
            setCompanyLoading(false);
        }
    };

    const fetchCompanyDataFromAPI = async () => {
        setCompanyLoading(true);
        try {
            // Try to get company from API
            const response = await api.get('/api/attendance/company-data');
            
            if (response.data.success) {
                const companyData = response.data.data;
                setCompany({
                    id: companyData._id || companyData.id,
                    _id: companyData._id || companyData.id,
                    name: companyData.name,
                    attendanceSettings: companyData.attendanceSettings || {
                        geoFencingEnabled: false,
                        officeLocations: [],
                        workingHours: { startTime: '09:00', endTime: '17:00', gracePeriod: 15 }
                    }
                });
            } else {
                setError('Failed to load company attendance settings');
            }
        } catch (error) {
            console.error('Error fetching company data:', error);
            setError('Failed to load company information');
        } finally {
            setCompanyLoading(false);
        }
    };

    const isAdmin = () => {
        if (!user) return false;
        return user.isAdmin === true || 
               user.role === 'Admin' || 
               user.role === 'ADMINISTRATOR' || 
               user.role === 'Supervisor' ||
               user.role === 'Owner';
    };

    const fetchTodayAttendance = async () => {
        if (!user || !company) return;
        setDataLoading(true);
        setError(null);

        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await api.get('/api/attendance/my-attendance', {
                params: {
                    companyId: company.id,
                    startDate: today,
                    endDate: today,
                    page: 1,
                    limit: 10
                }
            });

            if (response.data.success) {
                const data = response.data.data;
                setAttendanceData(data.attendance || []);
                setStats(data.statistics || null);
            }
        } catch (error) {
            console.error('Error fetching today attendance:', error);
            setError(error.response?.data?.message || 'Failed to fetch today attendance');
        } finally {
            setDataLoading(false);
        }
    };

    const fetchAttendanceHistory = async () => {
        if (!user || !company) return;
        setDataLoading(true);
        setError(null);

        try {
            const response = await api.get('/api/attendance/my-attendance', {
                params: {
                    companyId: company.id,
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    page: 1,
                    limit: 100
                }
            });

            if (response.data.success) {
                const data = response.data.data;
                setAttendanceData(data.attendance || []);
                setStats(data.statistics || null);
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
            const response = await api.get('/api/attendance/reports', {
                params: {
                    companyId: company.id,
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    reportType: 'daily'
                }
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
            console.log('User does not have admin privileges for team attendance');
            return;
        }
        setDataLoading(true);
        setError(null);

        try {
            const params = {
                companyId: company.id,
                startDate: filters.startDate,
                endDate: filters.endDate,
                page: 1,
                limit: 100
            };
            
            if (filters.userId) params.userId = filters.userId;
            if (filters.status) params.status = filters.status;

            const response = await api.get(`/api/attendance/company/${company.id}`, { params });

            if (response.data.success) {
                const data = response.data.data;
                setAttendanceData(data.attendance || []);
                setStats(data.statistics || null);
            }
        } catch (error) {
            console.error('Error fetching team attendance:', error);
            setError(error.response?.data?.message || 'Failed to fetch team attendance');
        } finally {
            setDataLoading(false);
        }
    };

    const handleLocationUpdate = (loc) => {
        console.log('📍 Location received in dashboard:', loc);
        setLocation(loc);
        setLocationReady(true);
    };

    const renderHistoryTable = () => {
        if (dataLoading) {
            return (
                <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="mt-2 text-muted" style={{ fontSize: '0.85rem' }}>Loading attendance records...</p>
                </div>
            );
        }

        if (attendanceData.length === 0) {
            return (
                <div className="text-center py-4">
                    <FaCalendar size={36} className="text-muted mb-2" />
                    <h6 className="text-muted" style={{ fontSize: '0.95rem' }}>No attendance records found</h6>
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>Select a different date range to view records</p>
                </div>
            );
        }

        return (
            <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
                <Table hover striped size="sm" className="mb-0" style={{ fontSize: '0.8rem' }}>
                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                            <th style={{ padding: '8px 10px' }}>Date</th>
                            <th style={{ padding: '8px 10px' }}>Day</th>
                            <th style={{ padding: '8px 10px' }}>Clock In</th>
                            <th style={{ padding: '8px 10px' }}>Clock Out</th>
                            <th style={{ padding: '8px 10px' }}>Total Hours</th>
                            <th style={{ padding: '8px 10px' }}>Status</th>
                            <th style={{ padding: '8px 10px' }}>Location</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendanceData.map((record) => (
                            <tr key={record.id || record._id}>
                                <td style={{ padding: '6px 10px' }}>{new Date(record.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                <td style={{ padding: '6px 10px' }}>{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}</td>
                                <td style={{ padding: '6px 10px' }}>
                                    {record.clockIn?.time ? (
                                        <>
                                            {new Date(record.clockIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            {record.lateMinutes > 0 && <Badge bg="warning" className="ms-1" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>+{record.lateMinutes}m</Badge>}
                                        </>
                                    ) : <span className="text-muted">-</span>}
                                </td>
                                <td style={{ padding: '6px 10px' }}>
                                    {record.clockOut?.time ? 
                                        new Date(record.clockOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 
                                        <span className="text-muted">-</span>}
                                </td>
                                <td style={{ padding: '6px 10px' }}>
                                    {record.totalHours > 0 ? <strong>{record.totalHours.toFixed(2)} hrs</strong> : <span className="text-muted">-</span>}
                                    {record.overtime > 0 && <Badge bg="success" className="ms-1" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>+{record.overtime.toFixed(2)}</Badge>}
                                </td>
                                <td style={{ padding: '6px 10px' }}>
                                    <Badge bg={
                                        record.status === 'present' ? 'success' :
                                        record.status === 'absent' ? 'danger' :
                                        record.status === 'half-day' ? 'warning' : 'secondary'
                                    } style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                                        {record.status?.charAt(0).toUpperCase() + record.status?.slice(1)}
                                    </Badge>
                                </td>
                                <td style={{ padding: '6px 10px' }}>
                                    <Badge bg={record.source === 'geo-fence' ? 'info' : 'secondary'} style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                                        {record.source === 'geo-fence' ? <><FaMapMarkerAlt className="me-1" style={{ fontSize: '0.65rem' }} />Geo-fenced</> : 'Manual'}
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        );
    };

    // Main render - show loading state
    if (loading || companyLoading) {
        return (
            <Container className="attendance-dashboard py-2">
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>Loading attendance system...</p>
                </div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="attendance-dashboard py-2">
                <Card className="shadow-sm">
                    <Card.Body className="text-center py-4">
                        <Alert variant="danger" className="mb-3" style={{ fontSize: '0.9rem' }}>
                            <FaExclamationTriangle className="me-2" />
                            {error}
                        </Alert>
                        <Button variant="primary" size="sm" onClick={fetchUserAndCompany}>
                            <FaSync className="me-2" />Retry
                        </Button>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    if (!company) {
        return (
            <Container className="attendance-dashboard py-2">
                <Card className="shadow-sm">
                    <Card.Body className="text-center py-4">
                        <FaBuilding size={44} className="text-muted mb-3" />
                        <h5 className="mb-2" style={{ fontSize: '1rem' }}>No Company Selected</h5>
                        <p className="text-muted" style={{ fontSize: '0.9rem' }}>Please select a company to access attendance features</p>
                        <Button variant="primary" size="sm" className="mt-2" onClick={() => window.location.href = '/select-company'}>
                            Select Company
                        </Button>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    if (!user) {
        return (
            <Container className="attendance-dashboard py-2">
                <Card className="shadow-sm">
                    <Card.Body className="text-center py-4">
                        <FaUser size={44} className="text-muted mb-3" />
                        <h5 className="mb-2" style={{ fontSize: '1rem' }}>User Not Found</h5>
                        <p className="text-muted" style={{ fontSize: '0.9rem' }}>Please login to access attendance features</p>
                        <Button variant="primary" size="sm" className="mt-2" onClick={() => window.location.href = '/login'}>
                            Login
                        </Button>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    return (
        <div>
            <Header user={user} company={company} />
            <Container className="attendance-dashboard py-2" style={{ maxWidth: '1400px' }}>
                <LocationPermissionWrapper onLocationUpdate={handleLocationUpdate} required={true}>
                    {/* Dashboard Header */}
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                        <div>
                            <h5 className="mb-1 d-flex align-items-center" style={{ fontSize: '1.1rem' }}>
                                <FaClock className="me-2 text-primary" size={18} />
                                Attendance Management
                            </h5>
                        </div>
                        <div className="d-flex gap-2">
                            {isAdmin() && (
                                <Button variant="outline-primary" size="sm" onClick={() => setShowLocationModal(true)} className="d-flex align-items-center" style={{ fontSize: '0.8rem', padding: '5px 14px' }}>
                                    <FaMapMarkerAlt className="me-1" style={{ fontSize: '0.75rem' }} />
                                    Office Locations
                                </Button>
                            )}
                            {/* <Button variant="outline-secondary" size="sm" onClick={fetchUserAndCompany} className="d-flex align-items-center" style={{ fontSize: '0.8rem', padding: '5px 14px' }}>
                                <FaSync className="me-1" style={{ fontSize: '0.75rem' }} />
                                Refresh
                            </Button> */}
                        </div>
                    </div>

                    {error && (
                        <Alert variant="danger" className="mb-3 py-2" style={{ fontSize: '0.85rem' }}>
                            <FaExclamationTriangle className="me-2" />
                            {error}
                        </Alert>
                    )}

                    <Row className="g-3">
                        <Col lg={4}>
                            <AttendanceButton 
                                user={user} 
                                company={company} 
                                currentLocation={location} 
                                onAttendanceUpdate={fetchTodayAttendance} 
                            />
                            {/* <div className="mt-3">
                                <UserDutySchedules user={user} company={company} />
                            </div> */}
                        </Col>

                        <Col lg={8}>
                            <Card className="shadow-sm border-0">
                                <Card.Body className="p-0">
                                    <Tabs 
                                        activeKey={activeTab} 
                                        onSelect={(k) => setActiveTab(k)} 
                                        className="mb-0"
                                        style={{ fontSize: '0.85rem' }}
                                    >
                                        <Tab eventKey="today" title={<><FaCalendar className="me-1" style={{ fontSize: '0.75rem' }} /> Today</>}>
                                            <div className="p-3">
                                                <h6 className="mb-3" style={{ fontSize: '0.9rem' }}>Today's Overview</h6>
                                                {renderHistoryTable()}
                                            </div>
                                        </Tab>

                                        <Tab eventKey="history" title={<><FaCalendar className="me-1" style={{ fontSize: '0.75rem' }} /> History</>}>
                                            <div className="p-3">
                                                <h6 className="mb-3" style={{ fontSize: '0.9rem' }}>Attendance History</h6>
                                                <div className="mb-3 d-flex flex-wrap gap-2">
                                                    <input 
                                                        type="date" 
                                                        className="form-control form-control-sm"
                                                        style={{ width: 'auto', minWidth: '150px', fontSize: '0.8rem', height: '32px' }}
                                                        value={filters.startDate}
                                                        onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                                                    />
                                                    <input 
                                                        type="date" 
                                                        className="form-control form-control-sm"
                                                        style={{ width: 'auto', minWidth: '150px', fontSize: '0.8rem', height: '32px' }}
                                                        value={filters.endDate}
                                                        onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                                                    />
                                                    <Button variant="primary" size="sm" onClick={fetchAttendanceHistory} style={{ fontSize: '0.8rem', height: '32px' }}>
                                                        Apply Filter
                                                    </Button>
                                                </div>
                                                {renderHistoryTable()}
                                            </div>
                                        </Tab>

                                        <Tab eventKey="my-duty-schedule" title={<><FaCalendar className="me-1" style={{ fontSize: '0.75rem' }} /> My Duty</>}>
                                            <div className="p-3">
                                                <UserDutySchedules user={user} company={company} />
                                            </div>
                                        </Tab>

                                        {isAdmin() && (
                                            <Tab eventKey="team" title={<><FaUsers className="me-1" style={{ fontSize: '0.75rem' }} /> Team</>}>
                                                <div className="p-3">
                                                    <h6 className="mb-3" style={{ fontSize: '0.9rem' }}>Team Attendance</h6>
                                                    <div className="mb-3 d-flex flex-wrap gap-2">
                                                        <input 
                                                            type="date" 
                                                            className="form-control form-control-sm"
                                                            style={{ width: 'auto', minWidth: '150px', fontSize: '0.8rem', height: '32px' }}
                                                            value={filters.startDate}
                                                            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                                                        />
                                                        <input 
                                                            type="date" 
                                                            className="form-control form-control-sm"
                                                            style={{ width: 'auto', minWidth: '150px', fontSize: '0.8rem', height: '32px' }}
                                                            value={filters.endDate}
                                                            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                                                        />
                                                        <Button variant="primary" size="sm" onClick={fetchTeamAttendance} style={{ fontSize: '0.8rem', height: '32px' }}>
                                                            Apply Filter
                                                        </Button>
                                                    </div>
                                                    {renderHistoryTable()}
                                                </div>
                                            </Tab>
                                        )}

                                        {isAdmin() && (
                                            <Tab eventKey="reports" title={<><FaChartBar className="me-1" style={{ fontSize: '0.75rem' }} /> Reports</>}>
                                                <div className="p-3">
                                                    <h6 className="mb-3" style={{ fontSize: '0.9rem' }}>Attendance Reports</h6>
                                                    <div className="text-center py-4">
                                                        <FaChartBar size={36} className="text-muted mb-2" />
                                                        <p className="text-muted" style={{ fontSize: '0.85rem' }}>Reports feature coming soon</p>
                                                    </div>
                                                </div>
                                            </Tab>
                                        )}

                                        {isAdmin() && (
                                            <Tab eventKey="duty-schedule" title={<><FaCalendar className="me-1" style={{ fontSize: '0.75rem' }} /> Duty Schedule</>}>
                                                <div className="p-0">
                                                    <DutyScheduleManager company={company} user={user} />
                                                </div>
                                            </Tab>
                                        )}
                                    </Tabs>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </LocationPermissionWrapper>

                {/* Office Location Modal */}
                <Modal show={showLocationModal} onHide={() => setShowLocationModal(false)} size="xl">
                    <Modal.Header closeButton className="bg-light py-2">
                        <Modal.Title className="d-flex align-items-center" style={{ fontSize: '1.05rem' }}>
                            <FaMapMarkerAlt className="me-2 text-primary" size={18} />
                            Office Locations Management
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <OfficeLocationManager company={company} onUpdate={() => fetchCompanyData(company.id)} />
                    </Modal.Body>
                </Modal>
            </Container>
        </div>
    );
};

export default AttendanceDashboard;