import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../retailer/Header';
import NotificationToast from '../NotificationToast';
import { FaUsers, FaUserPlus, FaSearch, FaEye, FaLock, FaEdit, FaUserSlash, FaUserCheck, FaSave, FaBuilding } from 'react-icons/fa';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const UserList = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [company, setCompany] = useState(null);
    const [currentFiscalYear, setCurrentFiscalYear] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });
    const [currentUser, setCurrentUser] = useState({
        isAdminOrSupervisor: false,
        theme: 'light'
    });
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

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

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/user/admin/users/list');

                if (response.data.success) {
                    setUsers(response.data.data.users);
                    setCompany(response.data.data.company);
                    setCurrentFiscalYear(response.data.data.currentFiscalYear);
                    setCurrentUser({
                        isAdminOrSupervisor: response.data.data.isAdminOrSupervisor,
                        theme: response.data.data.currentUser.theme
                    });
                } else {
                    setError(response.data.error);
                    if (response.status === 403) {
                        setTimeout(() => navigate('/dashboard'), 2000);
                    }
                }
            } catch (err) {
                console.error('Error fetching users:', err);
                const errorMessage = err.response?.data?.error || 'Failed to load users';
                setError(errorMessage);
                if (err.response?.status === 403) {
                    setTimeout(() => navigate('/dashboard'), 2000);
                } else if (err.response?.status === 401) {
                    setTimeout(() => navigate('/login'), 2000);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [navigate]);

    const handleRoleChange = async (userId, newRole) => {
        try {
            const response = await api.put(`/api/user/admin/users/${userId}/role`, { role: newRole });
            if (response.data.success) {
                setUsers(users.map(user =>
                    user.id === userId ? { ...user, role: newRole } : user
                ));
                showNotification('User role updated successfully', 'success');
            }
        } catch (err) {
            showNotification(err.response?.data?.error || 'Failed to update user role', 'error');
        }
    };

    const toggleUserStatus = async (userId, activate) => {
        const action = activate ? 'activate' : 'deactivate';
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) {
            return;
        }

        try {
            const response = await api.post(`/api/user/admin/users/${userId}/${action}`);
            if (response.data.success) {
                setUsers(users.map(user =>
                    user.id === userId ? { ...user, isActive: activate } : user
                ));
                showNotification(`User ${activate ? 'activated' : 'deactivated'} successfully`, 'success');
            }
        } catch (err) {
            showNotification(err.response?.data?.error || `Failed to ${action} user`, 'error');
        }
    };

    const showNotification = (message, type) => {
        setNotification({
            show: true,
            message,
            type,
            duration: 3000
        });
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedUsers = [...users].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
    });

    const filteredUsers = sortedUsers.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
            user.name.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            user.role.toLowerCase().includes(searchLower)
        );
    });

    const renderTooltip = (text) => (
        <Tooltip id="button-tooltip">{text}</Tooltip>
    );

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    const getRoleBadgeClass = (role) => {
        switch (role?.toLowerCase()) {
            case 'admin':
            case 'administrator':
                return 'bg-danger';
            case 'supervisor':
                return 'bg-warning text-dark';
            case 'account':
                return 'bg-info text-dark';
            case 'sales':
                return 'bg-success';
            case 'purchase':
                return 'bg-primary';
            default:
                return 'bg-secondary';
        }
    };

    // if (loading) {
    //     return (
    //         <div className='container-fluid'>
    //             <Header />
    //             <div className="container user-management-container mt-4">
    //                 <div className="card user-management-card shadow-sm">
    //                     <div className="card-header bg-white py-0">
    //                         <Skeleton height={30} width={200} />
    //                     </div>
    //                     <div className="card-body p-2 p-md-3">
    //                         <Skeleton count={5} height={50} className="mb-2" />
    //                     </div>
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // }

    if (loading) {
        return (
            <div className='container-fluid'>
                <Header />
                <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                    <div className="card-header bg-white py-0">
                        <h1 className="h4 mb-0 text-center text-primary">
                            <FaUsers className="me-2" />
                            User Management
                        </h1>
                    </div>

                    <div className="card-body p-2 p-md-3">
                        {/* Search and Add User Skeleton */}
                        <div className="row g-2 mb-3">
                            <div className="col-12 d-flex flex-wrap justify-content-between align-items-center gap-2">
                                <div className="d-flex gap-2">
                                    <div className="position-relative">
                                        <Skeleton width={250} height={26} />
                                    </div>
                                    <Skeleton width={80} height={26} />
                                </div>
                            </div>
                        </div>

                        {/* Table Header Skeleton */}
                        <div className="table-responsive" style={{ maxHeight: '500px', overflow: 'auto' }}>
                            <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.75rem' }}>
                                <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                    <tr>
                                        <th style={{ padding: '6px 8px', width: '25%' }}><Skeleton height={20} /></th>
                                        <th style={{ padding: '6px 8px', width: '25%' }}><Skeleton height={20} /></th>
                                        <th style={{ padding: '6px 8px', width: '20%' }}><Skeleton height={20} /></th>
                                        <th style={{ padding: '6px 8px', width: '15%' }}><Skeleton height={20} /></th>
                                        <th style={{ padding: '6px 8px', width: '15%' }} className="text-end"><Skeleton height={20} /></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Show 5-7 skeleton rows to match typical display */}
                                    {[1, 2, 3, 4, 5, 6, 7].map((item) => (
                                        <tr key={item}>
                                            <td style={{ padding: '6px 8px' }}>
                                                <div className="d-flex align-items-center">
                                                    <Skeleton circle width={28} height={28} className="me-2" />
                                                    <div>
                                                        <Skeleton width={120} height={16} className="mb-1" />
                                                        <Skeleton width={80} height={12} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 8px' }}>
                                                <div>
                                                    <Skeleton width={150} height={16} className="mb-1" />
                                                    <Skeleton width={60} height={12} />
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 8px' }}>
                                                <Skeleton width={100} height={30} />
                                            </td>
                                            <td style={{ padding: '6px 8px' }}>
                                                <Skeleton width={60} height={20} />
                                            </td>
                                            <td className="text-end" style={{ padding: '6px 8px' }}>
                                                <div className="d-flex justify-content-end gap-1">
                                                    <Skeleton width={24} height={24} />
                                                    <Skeleton width={24} height={24} />
                                                    <Skeleton width={24} height={24} />
                                                    <Skeleton width={24} height={24} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Skeleton */}
                        <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                            <Skeleton width={200} height={16} />
                            <Skeleton width={100} height={24} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='container-fluid'>
                <Header />
                <div className="container mt-4">
                    <div className="alert alert-danger text-center py-1 mb-2 small" style={{ fontSize: '0.75rem' }}>
                        <i className="fas fa-exclamation-circle me-2"></i>
                        {error}
                        <button
                            className="btn btn-sm btn-outline-danger mt-2"
                            onClick={() => window.location.reload()}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='container-fluid'>
            <Header />
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">
                        <FaUsers className="me-2" />
                        User Management
                    </h1>
                </div>

                <div className="card-body p-2 p-md-3">
                    {/* Header with company info and search */}
                    <div className="row g-2 mb-3">
                        <div className="col-12 d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <div className="d-flex gap-2">
                                <div className="position-relative">
                                    <div className="input-group" style={{ width: '250px' }}>
                                        <span className="input-group-text bg-white border-end-0" style={{ padding: '0 8px' }}>
                                            <FaSearch className="text-muted" size={12} />
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm border-start-0"
                                            placeholder="Search users..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ height: '26px', fontSize: '0.75rem' }}
                                        />
                                    </div>
                                </div>
                                {currentUser.isAdminOrSupervisor && (
                                    <Link
                                        to="/auth/admin/create-user/new"
                                        className="btn btn-primary btn-sm d-flex align-items-center"
                                        style={{ height: '26px', padding: '0 12px', fontSize: '0.75rem' }}
                                    >
                                        <FaUserPlus className="me-1" size={12} />
                                        Add User
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Users Table */}
                    {filteredUsers.length === 0 ? (
                        <div className="empty-state text-center py-5">
                            <div className="mb-3">
                                <FaUsers size={48} className="text-muted" />
                            </div>
                            <h4 className="mb-2" style={{ fontSize: '1rem' }}>No Users Found</h4>
                            <p className="text-muted mb-4" style={{ fontSize: '0.75rem' }}>
                                {searchTerm ?
                                    'No users match your search criteria' :
                                    'There are currently no users in the system'}
                            </p>
                            {currentUser.isAdminOrSupervisor && (
                                <Link
                                    to="/auth/admin/create-user/new"
                                    className="btn btn-primary btn-sm"
                                    style={{ fontSize: '0.75rem' }}
                                >
                                    <FaUserPlus className="me-2" size={12} />
                                    Create New User
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive" style={{ maxHeight: '500px', overflow: 'auto' }}>
                                <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.75rem' }}>
                                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                        <tr>
                                            <th
                                                className="cursor-pointer"
                                                onClick={() => requestSort('name')}
                                                style={{ cursor: 'pointer', padding: '6px 8px' }}
                                            >
                                                User {renderSortIcon('name')}
                                            </th>
                                            <th
                                                className="cursor-pointer"
                                                onClick={() => requestSort('email')}
                                                style={{ cursor: 'pointer', padding: '6px 8px' }}
                                            >
                                                Email {renderSortIcon('email')}
                                            </th>
                                            <th
                                                className="cursor-pointer"
                                                onClick={() => requestSort('role')}
                                                style={{ cursor: 'pointer', padding: '6px 8px' }}
                                            >
                                                Role {renderSortIcon('role')}
                                            </th>
                                            <th
                                                className="cursor-pointer"
                                                onClick={() => requestSort('isActive')}
                                                style={{ cursor: 'pointer', padding: '6px 8px' }}
                                            >
                                                Status {renderSortIcon('isActive')}
                                            </th>
                                            <th className="text-end" style={{ padding: '6px 8px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map(user => (
                                            <tr key={user.id} className={!user.isActive ? 'opacity-75' : ''}>
                                                <td style={{ padding: '6px 8px' }}>
                                                    <div className="d-flex align-items-center">
                                                        <div
                                                            className="user-avatar d-flex align-items-center justify-content-center rounded-circle me-2"
                                                            style={{
                                                                width: '28px',
                                                                height: '28px',
                                                                backgroundColor: user.isOwner ? '#6f42c1' : '#0d6efd',
                                                                color: 'white',
                                                                fontWeight: 'bold',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="fw-semibold" style={{ fontSize: '0.75rem' }}>
                                                                {user.name}
                                                                {user.isOwner && (
                                                                    <span className="badge bg-primary ms-1" style={{ fontSize: '0.65rem' }}>Owner</span>
                                                                )}
                                                            </div>
                                                            <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                                                                Joined {new Date(user.createdAt).toLocaleDateString()}
                                                            </small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '6px 8px' }}>
                                                    <div className="d-flex align-items-center">
                                                        <span className="text-truncate" style={{ maxWidth: '180px', fontSize: '0.75rem' }}>
                                                            {user.email}
                                                        </span>
                                                        {user.isEmailVerified ? (
                                                            <span className="badge bg-success ms-1" style={{ fontSize: '0.65rem' }}>Verified</span>
                                                        ) : (
                                                            <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.65rem' }}>Pending</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '6px 8px' }}>
                                                    {user.isOwner ? (
                                                        <span className="badge bg-primary" style={{ fontSize: '0.7rem' }}>Owner</span>
                                                    ) : currentUser.isAdminOrSupervisor ? (
                                                        <div className="d-flex align-items-center gap-1">
                                                            <select
                                                                className="form-select form-select-sm"
                                                                style={{ width: '110px', fontSize: '0.7rem', height: '30px' }}
                                                                value={user.role}
                                                                onChange={(e) => {
                                                                    const newRole = e.target.value;
                                                                    setUsers(users.map(u =>
                                                                        u.id === user.id ? { ...u, role: newRole } : u
                                                                    ));
                                                                }}
                                                            >
                                                                <option value="User">User</option>
                                                                <option value="Sales">Sales</option>
                                                                <option value="Purchase">Purchase</option>
                                                                <option value="Account">Account</option>
                                                                <option value="Supervisor">Supervisor</option>
                                                                <option value="Admin">Admin</option>
                                                            </select>
                                                            <OverlayTrigger
                                                                placement="top"
                                                                overlay={renderTooltip('Save Role')}
                                                            >
                                                                <button
                                                                    className="btn btn-primary btn-sm"
                                                                    style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                                                                    onClick={() => handleRoleChange(user.id, user.role)}
                                                                >
                                                                    <FaSave size={10} />
                                                                </button>
                                                            </OverlayTrigger>
                                                        </div>
                                                    ) : (
                                                        <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: '0.7rem' }}>
                                                            {user.role}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '6px 8px' }}>
                                                    <span className={`badge ${user.isActive ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.7rem' }}>
                                                        {user.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="text-end" style={{ padding: '6px 8px' }}>
                                                    <div className="d-flex justify-content-end gap-1">
                                                        <OverlayTrigger
                                                            placement="top"
                                                            overlay={renderTooltip('View User')}
                                                        >
                                                            <Link
                                                                to={`/auth/users/view/${user.id}`}
                                                                className="btn btn-outline-primary btn-sm"
                                                                style={{ padding: '2px 6px' }}
                                                            >
                                                                <FaEye size={10} />
                                                            </Link>
                                                        </OverlayTrigger>
                                                        {currentUser.isAdminOrSupervisor && (
                                                            <>
                                                                <OverlayTrigger
                                                                    placement="top"
                                                                    overlay={renderTooltip('Permissions')}
                                                                >
                                                                    <Link
                                                                        to={`/auth/admin/users/user-permissions/${user.id}`}
                                                                        className="btn btn-outline-primary btn-sm"
                                                                        style={{ padding: '2px 6px' }}
                                                                    >
                                                                        <FaLock size={10} />
                                                                    </Link>
                                                                </OverlayTrigger>
                                                                {!user.isOwner && (
                                                                    <>
                                                                        <OverlayTrigger
                                                                            placement="top"
                                                                            overlay={renderTooltip('Edit User')}
                                                                        >
                                                                            <Link
                                                                                to={`/auth/admin/users/edit/${user.id}`}
                                                                                className="btn btn-outline-warning btn-sm"
                                                                                style={{ padding: '2px 6px' }}
                                                                            >
                                                                                <FaEdit size={10} />
                                                                            </Link>
                                                                        </OverlayTrigger>
                                                                        {user.isActive ? (
                                                                            <OverlayTrigger
                                                                                placement="top"
                                                                                overlay={renderTooltip('Deactivate User')}
                                                                            >
                                                                                <button
                                                                                    className="btn btn-outline-danger btn-sm"
                                                                                    style={{ padding: '2px 6px' }}
                                                                                    onClick={() => toggleUserStatus(user.id, false)}
                                                                                >
                                                                                    <FaUserSlash size={10} />
                                                                                </button>
                                                                            </OverlayTrigger>
                                                                        ) : (
                                                                            <OverlayTrigger
                                                                                placement="top"
                                                                                overlay={renderTooltip('Activate User')}
                                                                            >
                                                                                <button
                                                                                    className="btn btn-outline-success btn-sm"
                                                                                    style={{ padding: '2px 6px' }}
                                                                                    onClick={() => toggleUserStatus(user.id, true)}
                                                                                >
                                                                                    <FaUserCheck size={10} />
                                                                                </button>
                                                                            </OverlayTrigger>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer with counts */}
                            <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                    Showing <span className="fw-semibold">{filteredUsers.length}</span> of{' '}
                                    <span className="fw-semibold">{users.length}</span> user{users.length !== 1 ? 's' : ''}
                                </div>
                                {currentUser.isAdminOrSupervisor && (
                                    <Link
                                        to="/auth/admin/create-user/new"
                                        className="btn btn-outline-primary btn-sm"
                                        style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                    >
                                        <FaUserPlus className="me-1" size={10} />
                                        Add New User
                                    </Link>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                duration={notification.duration}
                onClose={() => setNotification({ ...notification, show: false })}
            />
        </div>
    );
};

export default UserList;