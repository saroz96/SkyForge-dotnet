
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiCheck, FiPrinter, FiArrowLeft, FiRefreshCw, FiX } from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import ProductModal from '../dashboard/modals/ProductModal';
import NepaliDate from 'nepali-date-converter';
import * as XLSX from 'xlsx';

const AccountGroups = () => {
    const navigate = useNavigate();
    const [data, setData] = useState({
        groups: [],
        company: null,
        currentCompanyName: '',
        companyDateFormat: 'english',
        nepaliDate: '',
        user: null,
        theme: 'light',
        isAdminOrSupervisor: false
    });
    const [showProductModal, setShowProductModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentGroup, setCurrentGroup] = useState(null);
    const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('');

    // Print modal states
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printOption, setPrintOption] = useState('all');
    const [selectedType, setSelectedType] = useState('');

    // Excel export state
    const [exporting, setExporting] = useState(false);

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        name: 160,
        primaryGroup: 80,
        type: 130,
        actions: 100
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Form state
    const [formData, setFormData] = useState({
        Name: '', // Changed from 'name' to 'Name'
        Type: '', // Changed from 'type' to 'Type'
        PrimaryGroup: '' // Changed from 'primaryGroup' to 'PrimaryGroup'
    });

    const groupTypes = [
        "Current Assets",
        "Current Liabilities",
        "Fixed Assets",
        "Loans(Liability)",
        "Capital Account",
        "Revenue Accounts",
        "Primary"
    ];

    const primaryGroup = ["Yes", "No"];

    // Create axios instance with interceptors
    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142',
        withCredentials: true,
    });

    // Add request interceptor to add token to EVERY request
    api.interceptors.request.use(
        config => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
                console.log('Adding Authorization header:', token.substring(0, 20) + '...');
            } else {
                console.warn('No token found in localStorage');
            }
            return config;
        },
        error => {
            console.error('Request interceptor error:', error);
            return Promise.reject(error);
        }
    );

    // Add response interceptor to handle 401 errors
    api.interceptors.response.use(
        response => {
            console.log('Response received:', response.status, response.config.url);
            return response;
        },
        error => {
            console.error('Response error:', {
                status: error.response?.status,
                url: error.config?.url,
                message: error.message
            });

            if (error.response?.status === 401) {
                console.log('401 Unauthorized - Redirecting to login');
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('userInfo');
                localStorage.removeItem('currentCompany');
                localStorage.removeItem('currentCompanyId');
                localStorage.removeItem('userCompanies');
                window.location.href = '/auth/login';
            }
            return Promise.reject(error);
        }
    );

    const showNotificationMessage = (message, type) => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        console.log('AccountGroups component mounted. Token exists:', !!token);
        if (token) {
            console.log('Token length:', token.length);
            console.log('Token starts with:', token.substring(0, 20) + '...');
        }
        fetchAccountGroups();
    }, []);

    const fetchAccountGroups = async () => {
        try {
            setLoading(true);

            // Check if token exists
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found, redirecting to login');
                navigate('/auth/login');
                return;
            }

            console.log('Fetching account groups from:', '/api/retailer/account-group');
            console.log('Using token:', token.substring(0, 20) + '...');

            const response = await api.get('/api/retailer/account-group');

            console.log('API Response:', {
                status: response.status,
                data: response.data
            });

            if (response.data) {
                console.log('Successfully fetched account groups data');
                const newData = {
                    groups: response.data.companiesGroups || [],
                    company: response.data.company,
                    currentCompanyName: response.data.currentCompanyName,
                    companyDateFormat: response.data.company?.dateFormat || 'english',
                    nepaliDate: new NepaliDate().format('YYYY-MM-DD'),
                    user: response.data.user,
                    theme: response.data.user?.preferences?.theme || 'light',
                    isAdminOrSupervisor: response.data.isAdminOrSupervisor || false
                };

                console.log('Setting data with groups count:', newData.groups.length);
                setData(newData);
            } else {
                throw new Error('Failed to fetch account groups');
            }
        } catch (err) {
            console.error('Error in fetchAccountGroups:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            handleApiError(err);
        } finally {
            setLoading(false);
        }
    };

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('accountGroupsTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('accountGroupsTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // F9 key handler for product modal
    useEffect(() => {
        const handleF9KeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleF9KeyDown);
        return () => {
            window.removeEventListener('keydown', handleF9KeyDown);
        };
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                setShowSaveConfirmModal(true);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const form = e.target.form;
                if (form) {
                    const index = Array.prototype.indexOf.call(form, e.target);
                    if (index < form.length - 1) {
                        form.elements[index + 1].focus();
                    }
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Shallow equal function for memoization
    function shallowEqual(objA, objB) {
        if (objA === objB) return true;

        if (typeof objA !== 'object' || objA === null ||
            typeof objB !== 'object' || objB === null) {
            return false;
        }

        const keysA = Object.keys(objA);
        const keysB = Object.keys(objB);

        if (keysA.length !== keysB.length) return false;

        for (let i = 0; i < keysA.length; i++) {
            if (!objB.hasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
                return false;
            }
        }

        return true;
    }

    // Filtered groups with memoization
    const filteredGroups = useMemo(() => {
        return data.groups
            .filter(group =>
                group?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (group.type && group.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (group.primaryGroup && group.primaryGroup.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [data.groups, searchTerm]);

    // Filter group types based on primary group selection
    const getFilteredGroupTypes = useCallback(() => {
        if (formData.PrimaryGroup === 'Yes') {
            return groupTypes.filter(type => type === 'Primary');
        } else if (formData.PrimaryGroup === 'No') {
            return groupTypes.filter(type => type !== 'Primary');
        } else {
            return groupTypes;
        }
    }, [formData.PrimaryGroup]);

    const filteredGroupTypes = getFilteredGroupTypes();

    // Resizable Table Header Component
    const TableHeader = React.memo(() => {
        const totalWidth = 60 + columnWidths.name + columnWidths.primaryGroup + columnWidths.type + columnWidths.actions;

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="d-flex bg-primary text-white sticky-top align-items-center position-relative"
                style={{
                    zIndex: 2,
                    height: '26px',
                    minWidth: `${totalWidth}px`,
                    userSelect: isResizing ? 'none' : 'auto'
                }}
                onMouseMove={(e) => {
                    if (isResizing && resizingColumn) {
                        const diff = e.clientX - startX;
                        const newWidth = Math.max(100, startWidth + diff);
                        setColumnWidths(prev => ({
                            ...prev,
                            [resizingColumn]: newWidth
                        }));
                    }
                }}
                onMouseUp={() => {
                    if (isResizing) {
                        setIsResizing(false);
                        setResizingColumn(null);
                    }
                }}
                onMouseLeave={() => {
                    if (isResizing) {
                        setIsResizing(false);
                        setResizingColumn(null);
                    }
                }}
            >
                {/* S.N. */}
                <div
                    className="d-flex align-items-center justify-content-center px-2 border-end border-white"
                    style={{
                        width: '60px',
                        flexShrink: 0
                    }}
                >
                    <strong style={{ fontSize: '0.8rem' }}>S.N.</strong>
                </div>

                {/* Group Name */}
                <div
                    className="d-flex align-items-center ps-2 border-end border-white position-relative"
                    style={{
                        width: `${columnWidths.name}px`,
                        flexShrink: 0,
                        minWidth: '100px'
                    }}
                >
                    <strong style={{ fontSize: '0.8rem' }}>Group Name</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.name - 2}
                        columnName="name"
                    />
                </div>

                {/* Primary Group */}
                <div
                    className="d-flex align-items-center px-2 border-end border-white position-relative"
                    style={{
                        width: `${columnWidths.primaryGroup}px`,
                        flexShrink: 0,
                        minWidth: '80px'
                    }}
                >
                    <strong style={{ fontSize: '0.8rem' }}>Primary</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.primaryGroup - 2}
                        columnName="primaryGroup"
                    />
                </div>

                {/* Group Type */}
                <div
                    className="d-flex align-items-center px-2 border-end border-white position-relative"
                    style={{
                        width: `${columnWidths.type}px`,
                        flexShrink: 0,
                        minWidth: '100px'
                    }}
                >
                    <strong style={{ fontSize: '0.8rem' }}>Group Type</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.type - 2}
                        columnName="type"
                    />
                </div>

                {/* Actions */}
                <div
                    className="d-flex align-items-center justify-content-end px-2"
                    style={{
                        width: `${columnWidths.actions}px`,
                        flexShrink: 0,
                        minWidth: '120px'
                    }}
                >
                    <strong style={{ fontSize: '0.8rem' }}>Actions</strong>
                </div>

                {/* Resizing indicator overlay */}
                {isResizing && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1000,
                            cursor: 'col-resize'
                        }}
                    />
                )}
            </div>
        );
    });

    // Table Row Component
    const TableRow = React.memo(({ index, style, data }) => {
        const { groups, isAdminOrSupervisor } = data;
        const group = groups[index];

        const handleEditClick = useCallback(() => group && handleEdit(group), [group]);
        const handleDeleteClick = useCallback(() => group?._id && handleDelete(group._id), [group?._id]);
        const handleSelect = useCallback(() => group && handleSelectGroup(group), [group]);

        if (!group) return null;

        return (
            <div
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    height: '26px',
                    minHeight: '26px',
                    padding: '0',
                    borderBottom: '1px solid #dee2e6',
                    cursor: 'pointer',
                }}
                className={index % 1 === 0 ? 'bg-light' : 'bg-white'}
                onDoubleClick={handleEditClick}
            >
                {/* S.N. */}
                <div
                    className="d-flex align-items-center justify-content-center px-0 border-end"
                    style={{
                        width: '60px',
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {index + 1}
                    </span>
                </div>

                {/* Group Name */}
                <div
                    className="d-flex align-items-center ps-2 border-end"
                    style={{
                        width: `${columnWidths.name}px`,
                        flexShrink: 0,
                        height: '100%',
                        overflow: 'hidden'
                    }}
                    title={group.name}
                >
                    <div className="d-flex flex-column justify-content-center" style={{ height: '100%', minWidth: 0 }}>
                        <span
                            style={{
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'block',
                                maxWidth: '100%'
                            }}
                        >
                            {group.name}
                        </span>
                    </div>
                </div>

                {/* Primary Group */}
                <div
                    className="px-2 border-end d-flex flex-column justify-content-center"
                    style={{
                        width: `${columnWidths.primaryGroup}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ fontSize: '0.8rem' }}>
                        {group.primaryGroup}
                    </span>
                </div>

                {/* Group Type */}
                <div
                    className="px-2 border-end d-flex flex-column justify-content-center"
                    style={{
                        width: `${columnWidths.type}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ fontSize: '0.8rem' }}>
                        {group.type}
                    </span>
                </div>

                {/* Actions */}
                <div
                    className="px-2 d-flex align-items-center justify-content-end gap-1"
                    style={{
                        width: `${columnWidths.actions}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    {isAdminOrSupervisor && (
                        <>
                            <Button
                                variant="outline-warning"
                                size="sm"
                                className="p-0 d-flex align-items-center justify-content-center"
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    minWidth: '24px'
                                }}
                                onClick={handleEditClick}
                                title={`Edit ${group.name}`}
                                disabled={!!currentGroup}
                            >
                                <FiEdit2 size={12} />
                            </Button>
                            <Button
                                variant="outline-danger"
                                size="sm"
                                className="p-0 d-flex align-items-center justify-content-center"
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    minWidth: '24px'
                                }}
                                onClick={handleDeleteClick}
                                title={`Delete ${group.name}`}
                                disabled={!!currentGroup}
                            >
                                <FiTrash2 size={12} />
                            </Button>
                        </>
                    )}

                    <Button
                        variant="outline-success"
                        size="sm"
                        className="p-0 d-flex align-items-center justify-content-center"
                        style={{
                            width: '24px',
                            height: '24px',
                            minWidth: '24px'
                        }}
                        onClick={handleSelect}
                        title={`Select ${group.name}`}
                    >
                        <FiCheck size={12} />
                    </Button>
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
        if (prevProps.style !== nextProps.style) return false;

        const prevGroup = prevProps.data.groups[prevProps.index];
        const nextGroup = nextProps.data.groups[nextProps.index];

        return (
            shallowEqual(prevGroup, nextGroup) &&
            prevProps.data.isAdminOrSupervisor === nextProps.data.isAdminOrSupervisor
        );
    });

    // Resize Handle Component
    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => {
        return (
            <div
                className="resize-handle"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: `${left}px`,
                    width: '5px',
                    height: '100%',
                    cursor: 'col-resize',
                    backgroundColor: 'transparent',
                    zIndex: 10,
                    userSelect: 'none'
                }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    onResizeStart(e, columnName);
                }}
            />
        );
    });

    const handleCancel = () => {
        setCurrentGroup(null);
        setFormData({ Name: '', Type: '', PrimaryGroup: '' });
    };

    // Reset column widths
    const resetColumnWidths = () => {
        setColumnWidths({
            name: 160,
            primaryGroup: 80,
            type: 130,
            actions: 100
        });
        showNotificationMessage('Column widths reset to default', 'success');
    };

    const resetForm = () => {
        setFormData({
            Name: '',
            Type: '',
            PrimaryGroup: ''
        });
        setCurrentGroup(null);
    };

    const handleApiError = (error) => {
        console.error('API Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            config: error.config
        });

        let errorMessage = 'An error occurred';

        if (error.response) {
            switch (error.response.status) {
                case 400:
                    errorMessage = error.response.data?.error || 'Invalid request';
                    break;
                case 401:
                    // This is handled by interceptor
                    errorMessage = 'Session expired. Please login again.';
                    return;
                case 403:
                    // Check if it's a trade type error
                    if (error.response.data?.error && error.response.data.error.includes('trade type')) {
                        errorMessage = 'Access denied for this trade type. Please select a Retailer company.';
                        navigate('/user-dashboard');
                    } else {
                        errorMessage = error.response.data?.error || 'Access denied';
                        navigate('/user-dashboard');
                    }
                    return;
                case 409:
                    errorMessage = error.response.data?.error || 'Account group already exists';
                    break;
                default:
                    errorMessage = error.response.data?.error || error.response.data?.message || 'Request failed';
            }
        } else if (error.request) {
            errorMessage = 'No response from server. Please check your connection.';
        } else {
            errorMessage = error.message || 'An error occurred';
        }

        showNotificationMessage(errorMessage, 'error');
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value.toLowerCase());
    };

    const handleEdit = (group) => {
        setCurrentGroup(group);
        setFormData({
            Name: group.name,
            Type: group.type,
            PrimaryGroup: group.primaryGroup
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this account group? This action cannot be undone.')) {
            try {
                const response = await api.delete(`/api/retailer/account-group/${id}`);

                if (response.data?.success) {
                    showNotificationMessage('Account group deleted successfully', 'success');
                    fetchAccountGroups();
                    resetForm();
                } else {
                    showNotificationMessage(response.data?.error || 'Failed to delete account group', 'error');
                }
            } catch (err) {
                handleApiError(err);
            }
        }
    };

    const handleSelectGroup = (group) => {
        setFormData({
            Name: group.name,
            Type: group.type,
            PrimaryGroup: group.primaryGroup
        });
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // If primary group is changed to "No", reset the type field if it was set to "Primary"
        if (name === 'PrimaryGroup' && value === 'No' && formData.Type === 'Primary') {
            setFormData(prev => ({
                ...prev,
                Type: ''
            }));
        }

        // Update search term when Name field changes
        if (name === 'Name') {
            setSearchTerm(value.toLowerCase());
        }
    };

    const handleSubmit = async (e) => {
        if (e) {
            e.preventDefault();
        }

        setIsSaving(true);

        try {
            // Prepare data in the format expected by the API
            const requestData = {
                Name: formData.Name.trim(),
                Type: formData.Type,
                PrimaryGroup: formData.PrimaryGroup
            };

            console.log('=== SENDING DATA TO BACKEND ===');
            console.log('Request Data:', JSON.stringify(requestData, null, 2));
            console.log('===============================');

            if (currentGroup) {
                // Update existing group
                const response = await api.put(`/api/retailer/account-group/${currentGroup._id}`, requestData);
                
                if (response.data?.success) {
                    showNotificationMessage('Account group updated successfully!', 'success');
                    fetchAccountGroups();
                    resetForm();
                } else {
                    showNotificationMessage(response.data?.error || 'Failed to update account group', 'error');
                }
            } else {
                // Create new group
                const response = await api.post('/api/retailer/account-group', requestData);
                
                if (response.data?.success) {
                    showNotificationMessage('Account group created successfully!', 'success');
                    fetchAccountGroups();
                    resetForm();
                } else {
                    showNotificationMessage(response.data?.error || 'Failed to create account group', 'error');
                }
            }
        } catch (err) {
            console.error('=== SUBMIT ERROR DETAILS ===');
            console.error('Error:', err);
            console.error('Response:', err.response?.data);
            
            if (err.response?.data?.errors) {
                console.error('Validation Errors:', err.response.data.errors);
                const validationErrors = Object.entries(err.response.data.errors)
                    .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
                    .join('; ');
                showNotificationMessage(`Validation errors: ${validationErrors}`, 'error');
            } else {
                handleApiError(err);
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Print function
    const printGroups = () => {
        let groupsToPrint = [...data.groups];

        // Apply filters
        if (printOption === 'type' && selectedType) {
            groupsToPrint = groupsToPrint.filter(group => group.type === selectedType);
        }

        if (groupsToPrint.length === 0) {
            alert("No account groups to print");
            return;
        }

        const printWindow = window.open("", "_blank");

        const printHeader = `
            <div class="print-header">
                <h1>${data.company?.companyName || data.currentCompanyName || 'Company Name'}</h1>
                <hr>
            </div>
        `;

        let tableContent = `
            <style>
                @page {
                    size: A4 landscape;
                    margin: 10mm;
                }
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 10px; 
                    margin: 0;
                    padding: 10mm;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    page-break-inside: auto;
                }
                tr { 
                    page-break-inside: avoid; 
                    page-break-after: auto; 
                }
                th, td { 
                    border: 1px solid #000; 
                    padding: 4px; 
                    text-align: left; 
                    white-space: nowrap;
                }
                th { 
                    background-color: #f2f2f2 !important; 
                    -webkit-print-color-adjust: exact; 
                }
                .print-header { 
                    text-align: center; 
                    margin-bottom: 15px; 
                }
                .nowrap {
                    white-space: nowrap;
                }
                .footer-note {
                    margin-top: 20px; 
                    font-size: 0.9em; 
                    color: #666;
                    text-align: center;
                }
                .header-info {
                    text-align: center;
                    margin-bottom: 10px;
                    font-size: 11px;
                }
                .report-title {
                    text-align: center;
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 5px;
                    text-decoration: underline;
                }
                .filter-info {
                    text-align: center;
                    font-size: 11px;
                    margin-bottom: 15px;
                    color: #666;
                }
                .summary-row {
                    background-color: #f8f9fa;
                    font-weight: bold;
                }
            </style>
            ${printHeader}
            
            <div class="report-title">Account Groups Report</div>
            
            <div class="header-info">
                <strong>Total Groups:</strong> ${groupsToPrint.length}
            </div>
            
            <div class="filter-info">
                ${printOption !== 'all' && selectedType ?
                `<strong>Filter:</strong> Group Type: ${selectedType} | ` : ''
            }
                <strong>Printed on:</strong> ${data.companyDateFormat === 'nepali' ?
                (data.nepaliDate || new NepaliDate().format('YYYY-MM-DD')) :
                new Date().toLocaleDateString()}
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th class="nowrap">S.N.</th>
                        <th class="nowrap">Group Name</th>
                        <th class="nowrap">Primary Group</th>
                        <th class="nowrap">Group Type</th>
                        <th class="nowrap">Created Date</th>
                    </tr>
                </thead>
                <tbody>
        `;

        groupsToPrint.forEach((group, index) => {
            const createdDate = group.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'N/A';

            tableContent += `
                <tr>
                    <td class="nowrap">${index + 1}</td>
                    <td class="nowrap">${group.name || 'N/A'}</td>
                    <td class="nowrap">${group.primaryGroup || 'N/A'}</td>
                    <td class="nowrap">${group.type || 'N/A'}</td>
                    <td class="nowrap">${createdDate}</td>
                </tr>
            `;
        });

        // Add summary row
        const primaryGroupsCount = groupsToPrint.filter(g => g.primaryGroup === 'Yes').length;
        const nonPrimaryGroupsCount = groupsToPrint.filter(g => g.primaryGroup === 'No').length;

        tableContent += `
                </tbody>
                <tfoot>
                    <tr class="summary-row">
                        <td colspan="2" class="nowrap"><strong>Summary</strong></td>
                        <td class="nowrap">
                            <strong>Primary: ${primaryGroupsCount} | Non-Primary: ${nonPrimaryGroupsCount}</strong>
                        </td>
                        <td class="nowrap"><strong>Total: ${groupsToPrint.length}</strong></td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer-note">
                <br>
                ${data.company?.companyName ? `© ${new Date().getFullYear()} ${data.company.companyName}` : ''}
            </div>
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Account Groups Report - ${data.company?.companyName || data.currentCompanyName || 'Account Groups Report'}</title>
                </head>
                <body>
                    ${tableContent}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.onafterprint = function() {
                                    window.close();
                                };
                            }, 200);
                        };
                    <\/script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Export to Excel function
    const exportToExcel = async (exportAll = false) => {
        setExporting(true);
        try {
            // Get groups to export
            const groupsToExport = exportAll ? data.groups : filteredGroups;

            if (groupsToExport.length === 0) {
                showNotificationMessage('No account groups to export', 'warning');
                return;
            }

            // Prepare data for Excel
            const excelData = groupsToExport.map((group, index) => {
                return {
                    'S.N.': index + 1,
                    'Group Name': group.name || 'N/A',
                    'Primary Group': group.primaryGroup || 'N/A',
                    'Group Type': group.type || 'N/A',
                    'Created Date': group.createdAt ? new Date(group.createdAt).toLocaleDateString() : '',
                    'Last Updated': group.updatedAt ? new Date(group.updatedAt).toLocaleDateString() : ''
                };
            });

            // Add summary statistics
            const summaryData = [
                {},
                {
                    'S.N.': 'SUMMARY',
                    'Group Name': 'Total Groups:',
                    'Primary Group': groupsToExport.length
                },
                {
                    'S.N.': '',
                    'Group Name': 'Primary Groups:',
                    'Primary Group': groupsToExport.filter(g => g.primaryGroup === 'Yes').length
                },
                {
                    'S.N.': '',
                    'Group Name': 'Non-Primary Groups:',
                    'Primary Group': groupsToExport.filter(g => g.primaryGroup === 'No').length
                }
            ];

            // Create workbook
            const wb = XLSX.utils.book_new();

            // Main groups sheet
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Auto-size columns
            ws['!cols'] = [
                { wch: 6 },   // S.N.
                { wch: 30 },  // Group Name
                { wch: 15 },  // Primary Group
                { wch: 20 },  // Group Type
                { wch: 12 },  // Created Date
                { wch: 12 }   // Last Updated
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Account Groups');

            // Summary sheet
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            // Generate filename
            const date = new Date().toISOString().split('T')[0];
            const filterInfo = exportAll ? 'All' : 'Filtered';
            const fileName = `Account_Groups_Report_${filterInfo}_${date}.xlsx`;

            // Save file
            XLSX.writeFile(wb, fileName);

            showNotificationMessage(
                `${exportAll ? 'All' : 'Filtered'} account groups (${groupsToExport.length}) exported successfully!`,
                'success'
            );

        } catch (err) {
            console.error('Error exporting to Excel:', err);
            showNotificationMessage('Failed to export to Excel', 'error');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="container-fluid">
            <Header />
            <NotificationToast
                message={notificationMessage}
                type={notificationType}
                show={showNotification}
                onClose={() => setShowNotification(false)}
            />

            {/* Debug info - remove in production */}
            <div className="debug-info" style={{ display: 'none' }}>
                <p>Token: {localStorage.getItem('token') ? 'Exists' : 'Missing'}</p>
                <p>Loading: {loading.toString()}</p>
                <p>Groups count: {data.groups.length}</p>
            </div>

            <div className="card mt-2">
                <div className="row g-3">
                    {/* Left Column - Add Group Form */}
                    <div className="col-lg-6">
                        <div className="card h-100 shadow-lg">
                            <div className="card-body">
                                <h3 className="text-center" style={{ textDecoration: 'underline' }}>
                                    {currentGroup ? `Edit Group: ${currentGroup.name}` : 'Create Group'}
                                </h3>
                                <Form onSubmit={handleSubmit} id="addGroupForm" style={{ marginTop: '5px' }}>
                                    <Form.Group className="row" style={{ marginBottom: '8px', gap: '5px 0' }}>
                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="text"
                                                    name="Name" // Changed to match API
                                                    value={formData.Name}
                                                    onChange={handleFormChange}
                                                    placeholder=" "
                                                    required
                                                    autoFocus
                                                    autoComplete="off"
                                                    style={{
                                                        height: '30px',
                                                        fontSize: '0.875rem',
                                                        paddingTop: '0.75rem'
                                                    }}
                                                />
                                                <label
                                                    className="position-absolute"
                                                    style={{
                                                        top: '-8px',
                                                        left: '0.75rem',
                                                        fontSize: '0.75rem',
                                                        backgroundColor: 'white',
                                                        padding: '0 0.25rem',
                                                        color: '#6c757d',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    Group Name <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Select
                                                    name="PrimaryGroup" // Changed to match API
                                                    value={formData.PrimaryGroup}
                                                    onChange={handleFormChange}
                                                    required
                                                    style={{
                                                        height: '30px',
                                                        fontSize: '0.875rem',
                                                        paddingTop: '0.5rem',
                                                        paddingBottom: '0'
                                                    }}
                                                >
                                                    <option value="" disabled>Select Primary</option>
                                                    {primaryGroup.map(primary => (
                                                        <option key={primary} value={primary}>{primary}</option>
                                                    ))}
                                                </Form.Select>
                                                <label
                                                    className="position-absolute"
                                                    style={{
                                                        top: '-8px',
                                                        left: '0.75rem',
                                                        fontSize: '0.75rem',
                                                        backgroundColor: 'white',
                                                        padding: '0 0.25rem',
                                                        color: '#6c757d',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    Primary Group <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Select
                                                    name="Type" // Changed to match API
                                                    value={formData.Type}
                                                    onChange={handleFormChange}
                                                    required
                                                    disabled={filteredGroupTypes.length === 0}
                                                    style={{
                                                        height: '30px',
                                                        fontSize: '0.875rem',
                                                        paddingTop: '0.5rem',
                                                        paddingBottom: '0'
                                                    }}
                                                >
                                                    <option value="" disabled>Select Type</option>
                                                    {filteredGroupTypes.map(type => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                </Form.Select>
                                                <label
                                                    className="position-absolute"
                                                    style={{
                                                        top: '-8px',
                                                        left: '0.75rem',
                                                        fontSize: '0.75rem',
                                                        backgroundColor: 'white',
                                                        padding: '0 0.25rem',
                                                        color: '#6c757d',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    Group Type <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>
                                    </Form.Group>

                                    <div className="d-flex justify-content-between align-items-center" style={{ marginTop: '10px' }}>
                                        {currentGroup ? (
                                            <Button
                                                variant="secondary"
                                                onClick={handleCancel}
                                                disabled={isSaving}
                                                className="d-flex align-items-center"
                                                style={{
                                                    height: '28px',
                                                    padding: '0 12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                <FiX className="me-1" size={14} />
                                                Cancel
                                            </Button>
                                        ) : (
                                            <div></div>
                                        )}
                                        <div className="d-flex align-items-center">
                                            <Button
                                                variant="primary"
                                                type="submit"
                                                disabled={isSaving}
                                                className="d-flex align-items-center"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleSubmit(e);
                                                    }
                                                }}
                                                style={{
                                                    height: '28px',
                                                    padding: '0 16px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <Spinner
                                                            as="span"
                                                            animation="border"
                                                            size="sm"
                                                            role="status"
                                                            aria-hidden="true"
                                                            className="me-2"
                                                        />
                                                        Saving...
                                                    </>
                                                ) : currentGroup ? (
                                                    <>
                                                        <FiCheck className="me-1" size={14} />
                                                        Save Changes
                                                    </>
                                                ) : (
                                                    'Add Group'
                                                )}
                                            </Button>
                                            <small className="ms-2 text-muted" style={{ fontSize: '0.7rem' }}>
                                                Alt+S to Save
                                            </small>
                                        </div>
                                    </div>
                                </Form>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="card h-100 shadow-lg">
                            <div className="card-body">
                                <h3 className="text-center" style={{ textDecoration: 'underline' }}>Existing Groups</h3>

                                <div className="row g-1 mb-2 align-items-center">
                                    <div className="col-auto">
                                        <Button
                                            variant="primary"
                                            onClick={() => navigate(-1)}
                                            className="d-flex align-items-center p-1"
                                            title="Go back"
                                            style={{
                                                height: '24px',
                                                minWidth: '24px',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            <FiArrowLeft size={10} />
                                            <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Back</span>
                                        </Button>
                                    </div>
                                    <div className="col-auto">
                                        <Button
                                            variant="primary"
                                            onClick={() => setShowPrintModal(true)}
                                            className="d-flex align-items-center p-1"
                                            title="Print report"
                                            style={{
                                                height: '24px',
                                                minWidth: '24px',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            <FiPrinter size={10} />
                                            <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Print</span>
                                        </Button>
                                    </div>
                                    <div className="col-auto">
                                        <Button
                                            variant="success"
                                            onClick={() => exportToExcel(true)}
                                            disabled={exporting || data.groups.length === 0}
                                            title="Export all groups to Excel"
                                            className="d-flex align-items-center p-1"
                                            style={{
                                                height: '24px',
                                                minWidth: '24px',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            {exporting ? (
                                                <Spinner animation="border" size="sm" className="me-1" style={{ width: '10px', height: '10px' }} />
                                            ) : (
                                                <i className="fas fa-file-excel" style={{ fontSize: '0.7rem' }}></i>
                                            )}
                                            <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Export</span>
                                        </Button>
                                    </div>
                                    <div className="col">
                                        <div style={{ position: 'relative' }}>
                                            <Form.Control
                                                type="text"
                                                placeholder=" "
                                                value={searchTerm}
                                                onChange={handleSearch}
                                                className="w-100"
                                                style={{
                                                    height: '24px',
                                                    fontSize: '0.75rem',
                                                    paddingTop: '0.6rem',
                                                    paddingLeft: '0.5rem'
                                                }}
                                            />
                                            <label
                                                className="position-absolute"
                                                style={{
                                                    top: '-6px',
                                                    left: '0.5rem',
                                                    fontSize: '0.65rem',
                                                    backgroundColor: 'white',
                                                    padding: '0 0.25rem',
                                                    color: '#6c757d',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Search groups...
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-auto">
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            onClick={resetColumnWidths}
                                            title="Reset column widths to default"
                                            className="d-flex align-items-center p-1"
                                            style={{
                                                height: '24px',
                                                minWidth: '24px',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            <FiRefreshCw size={10} />
                                            <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Reset</span>
                                        </Button>
                                    </div>
                                </div>
                                <div style={{ height: 'calc(100vh - 300px)', width: '100%' }}>
                                    {loading ? (
                                        <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                            <Spinner
                                                animation="border"
                                                variant="primary"
                                                size="sm"
                                                style={{ width: '1.5rem', height: '1.5rem' }}
                                            />
                                            <p className="mt-2 small text-muted" style={{ fontSize: '0.8rem' }}>
                                                Loading account groups...
                                            </p>
                                        </div>
                                    ) : filteredGroups.length === 0 ? (
                                        <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                            <i className="bi bi-folder text-muted" style={{ fontSize: '1.5rem' }}></i>
                                            <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
                                                No account groups found
                                            </h6>
                                            <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                                {searchTerm ? 'Try a different search term' : 'Create your first group using the form'}
                                            </p>
                                        </div>
                                    ) : (
                                        <AutoSizer>
                                            {({ height, width }) => {
                                                const totalWidth = 60 + columnWidths.name + columnWidths.primaryGroup + columnWidths.type + columnWidths.actions;

                                                return (
                                                    <div style={{
                                                        position: 'relative',
                                                        height: height,
                                                        width: Math.max(width, totalWidth),
                                                        overflowX: 'auto'
                                                    }}>
                                                        <TableHeader />
                                                        <List
                                                            height={height - 60}
                                                            itemCount={filteredGroups.length}
                                                            itemSize={26}
                                                            width={Math.max(width, totalWidth)}
                                                            itemData={{
                                                                groups: filteredGroups,
                                                                isAdminOrSupervisor: data.isAdminOrSupervisor
                                                            }}
                                                        >
                                                            {TableRow}
                                                        </List>
                                                        <div className="mt-2 text-muted small">
                                                            Showing {filteredGroups.length} of {data.groups.length} groups
                                                            {searchTerm && ` (filtered)`}
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        </AutoSizer>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Print Options Modal */}
            <Modal
                show={showPrintModal}
                onHide={() => setShowPrintModal(false)}
                centered
                size="md"
            >
                <Modal.Header closeButton className="bg-primary text-white py-2">
                    <Modal.Title className="d-flex align-items-center">
                        <FiPrinter className="me-2" size={20} />
                        <div className="d-flex flex-column">
                            <span className="fw-bold fs-6">Print Account Groups Report</span>
                            <small className="opacity-75">Select filter options</small>
                        </div>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-3">
                    <div className="mb-3">
                        <h6 className="fw-bold mb-2 text-primary">Filter Options</h6>
                        <div className="d-flex gap-2 mb-3">
                            <Button
                                variant={printOption === 'all' ? 'primary' : 'outline-primary'}
                                onClick={() => setPrintOption('all')}
                                size="sm"
                            >
                                All Groups
                            </Button>
                            <Button
                                variant={printOption === 'type' ? 'info' : 'outline-info'}
                                onClick={() => setPrintOption('type')}
                                size="sm"
                            >
                                By Group Type
                            </Button>
                        </div>

                        {printOption === 'type' && (
                            <div className="mt-3">
                                <Form.Label className="small fw-semibold">Select Group Type</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="mb-2"
                                >
                                    <option value="">All Types</option>
                                    {groupTypes.map(type => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </Form.Select>
                            </div>
                        )}

                        <div className="border-top pt-3 mt-3">
                            <h6 className="fw-bold mb-2 text-primary">Report Summary</h6>
                            <div className="row text-center">
                                <div className="col-4">
                                    <div className="text-muted small">Total Groups</div>
                                    <div className="fw-bold h5">{data.groups.length}</div>
                                </div>
                                <div className="col-4">
                                    <div className="text-muted small">Primary Groups</div>
                                    <div className="fw-bold h5 text-success">
                                        {data.groups.filter(g => g.primaryGroup === 'Yes').length}
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-muted small">Non-Primary</div>
                                    <div className="fw-bold h5 text-info">
                                        {data.groups.filter(g => g.primaryGroup === 'No').length}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {printOption !== 'all' && selectedType && (
                            <div className="alert alert-info border small mt-3 py-2">
                                <i className="bi bi-info-circle me-2"></i>
                                <span>
                                    Filtering by: <strong>{selectedType}</strong>
                                </span>
                            </div>
                        )}
                    </div>
                </Modal.Body>
                <Modal.Footer className="py-2 border-top">
                    <div className="d-flex justify-content-between w-100 align-items-center">
                        <Button
                            variant="outline-secondary"
                            onClick={() => setShowPrintModal(false)}
                            size="sm"
                            className="px-3"
                        >
                            Cancel
                        </Button>
                        <div className="d-flex gap-2">
                            <Button
                                variant="outline-primary"
                                onClick={() => {
                                    setPrintOption('all');
                                    setSelectedType('');
                                }}
                                size="sm"
                            >
                                Reset
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    printGroups();
                                    setShowPrintModal(false);
                                }}
                                size="sm"
                                className="px-4"
                            >
                                <FiPrinter className="me-1" />
                                Print Report
                            </Button>
                        </div>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Save Confirmation Modal */}
            <Modal show={showSaveConfirmModal} onHide={() => setShowSaveConfirmModal(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>Confirm Save</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to save this account group?</p>
                    {currentGroup && (
                        <div className="alert alert-warning small">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            This will update the existing group: <strong>{currentGroup.name}</strong>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSaveConfirmModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={() => {
                        handleSubmit();
                        setShowSaveConfirmModal(false);
                    }}>
                        {currentGroup ? 'Update Group' : 'Create Group'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Product Modal */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}
        </div>
    );
};

export default AccountGroups;

