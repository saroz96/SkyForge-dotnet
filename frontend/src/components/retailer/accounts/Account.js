import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiEye, FiCheck, FiPrinter, FiArrowLeft, FiRefreshCw, FiX } from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Badge from 'react-bootstrap/Badge';
import Spinner from 'react-bootstrap/Spinner';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import ProductModal from '../dashboard/modals/ProductModal';
import NepaliDate from 'nepali-date-converter';
import * as XLSX from 'xlsx';

const Accounts = () => {
    const navigate = useNavigate();
    const [data, setData] = useState({
        accounts: [],
        accountGroups: [], // Changed from companyGroups
        company: null,
        currentFiscalYear: null,
        isInitialFiscalYear: false,
        companyId: '',
        currentCompanyName: '',
        companyDateFormat: 'english',
        nepaliDate: '',
        fiscalYear: '',
        user: null,
        theme: 'light',
        isAdminOrSupervisor: false
    });
    const [showProductModal, setShowProductModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentAccount, setCurrentAccount] = useState(null);
    const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('');

    // Print modal states
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printOption, setPrintOption] = useState('all');
    const [selectedAccountGroup, setSelectedAccountGroup] = useState(''); // Changed from selectedCompanyGroup

    // Excel export state
    const [exporting, setExporting] = useState(false);

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        name: 200,
        group: 200,
        actions: 140
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        ward: '',
        pan: '',
        email: '',
        creditLimit: '',
        contactPerson: '',
        accountGroups: '', // Changed from companyGroups
        openingBalance: {
            amount: 0,
            type: 'Dr'
        }
    });

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
        console.log('Accounts component mounted. Token exists:', !!token);
        if (token) {
            console.log('Token length:', token.length);
            console.log('Token starts with:', token.substring(0, 20) + '...');
        }
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            setLoading(true);

            // Check if token exists
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found, redirecting to login');
                navigate('/auth/login');
                return;
            }

            console.log('Fetching accounts from:', '/api/retailer/companies');
            console.log('Using token:', token.substring(0, 20) + '...');

            const response = await api.get('/api/retailer/companies');

            console.log('API Response:', {
                status: response.status,
                success: response.data?.success,
                data: response.data?.data ? 'has data' : 'no data',
                redirectTo: response.data?.redirectTo
            });

            if (response.data.redirectTo) {
                console.log('Redirecting to:', response.data.redirectTo);
                navigate(response.data.redirectTo);
                return;
            }

            if (response.data.success) {
                console.log('Successfully fetched accounts data');
                const newData = {
                    accounts: response.data.data.accounts || [],
                    accountGroups: response.data.data.accountGroups || [], // Changed from companyGroups
                    company: response.data.data.company,
                    currentFiscalYear: response.data.data.currentFiscalYear,
                    isInitialFiscalYear: response.data.data.isInitialFiscalYear || false,
                    companyId: response.data.data.companyId || '',
                    currentCompanyName: response.data.data.currentCompanyName || '',
                    companyDateFormat: response.data.data.companyDateFormat || 'english',
                    nepaliDate: response.data.data.nepaliDate || '',
                    fiscalYear: response.data.data.fiscalYear || '',
                    user: response.data.data.user,
                    theme: response.data.data.theme || 'light',
                    isAdminOrSupervisor: response.data.data.isAdminOrSupervisor || false
                };

                console.log('Setting data with accounts count:', newData.accounts.length);
                setData(newData);
            } else {
                console.error('API returned success=false:', response.data.error);
                throw new Error(response.data.error || 'Failed to fetch accounts');
            }
        } catch (err) {
            console.error('Error in fetchAccounts:', {
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
        const savedWidths = localStorage.getItem('accountsTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('accountsTableColumnWidths', JSON.stringify(columnWidths));
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

    // Filtered accounts with memoization
    const filteredAccounts = useMemo(() => {
        return data.accounts
            .filter(account => {
                const searchTermLower = searchTerm.toLowerCase();
                const accountName = account.name || '';
                const groupName = account.accountGroups?.name || ''; // Changed from companyGroups
                const pan = account.pan || '';
                const phone = account.phone || '';
                const email = account.email || '';

                return (
                    accountName.toLowerCase().includes(searchTermLower) ||
                    groupName.toLowerCase().includes(searchTermLower) ||
                    (pan && pan.toString().toLowerCase().includes(searchTermLower)) ||
                    (phone && phone.toString().includes(searchTerm)) ||
                    (email && email.toLowerCase().includes(searchTermLower))
                );
            })
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [data.accounts, searchTerm]);

    // Resizable Table Header Component
    const TableHeader = React.memo(() => {
        const totalWidth = columnWidths.name + columnWidths.group + columnWidths.actions;

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
                        width: '50px',
                        flexShrink: 0
                    }}
                >
                    <strong style={{ fontSize: '0.8rem' }}>S.N.</strong>
                </div>

                {/* Account Name */}
                <div
                    className="d-flex align-items-center ps-2 border-end border-white position-relative"
                    style={{
                        width: `${columnWidths.name}px`,
                        flexShrink: 0,
                        minWidth: '100px'
                    }}
                >
                    <strong style={{ fontSize: '0.8rem' }}>Account Name</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.name - 2}
                        columnName="name"
                    />
                </div>

                {/* Account Group */}
                <div
                    className="d-flex align-items-center px-2 border-end border-white position-relative"
                    style={{
                        width: `${columnWidths.group}px`,
                        flexShrink: 0,
                        minWidth: '100px'
                    }}
                >
                    <strong style={{ fontSize: '0.8rem' }}>Account Group</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.group - 2}
                        columnName="group"
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
        const { accounts, isAdminOrSupervisor } = data;
        const account = accounts[index];

        const handleView = useCallback(() => navigate(`/retailer/companies/${account?._id}`), [account?._id]);
        const handleEditClick = useCallback(() => account && handleEdit(account), [account]);
        const handleDeleteClick = useCallback(() => account?._id && handleDelete(account._id), [account?._id]);
        const handleSelect = useCallback(() => account && handleSelectAccount(account), [account]);

        if (!account) return null;

        const accountName = account.name || 'N/A';
        const groupName = account.accountGroups?.name || 'N/A'; // Changed from companyGroups

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
                onDoubleClick={handleView}
            >
                {/* S.N. */}
                <div
                    className="d-flex align-items-center justify-content-center px-0 border-end"
                    style={{
                        width: '50px',
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {index + 1}
                    </span>
                </div>

                {/* Account Name */}
                <div
                    className="d-flex align-items-center ps-2 border-end"
                    style={{
                        width: `${columnWidths.name}px`,
                        flexShrink: 0,
                        height: '100%',
                        overflow: 'hidden'
                    }}
                    title={`${accountName}${account.pan ? ` | PAN: ${account.pan}` : ''}${account.phone ? ` | Phone: ${account.phone}` : ''}`}
                >
                    <div className="d-flex flex-column justify-content-center" style={{ height: '100%', minWidth: 0 }}>
                        <div className="d-flex align-items-center">
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
                                {accountName}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Account Group */}
                <div
                    className="px-2 border-end d-flex flex-column justify-content-center"
                    style={{
                        width: `${columnWidths.group}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ fontSize: '0.8rem' }}>
                        {groupName}
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
                    <Button
                        variant="outline-info"
                        size="sm"
                        className="p-0 d-flex align-items-center justify-content-center"
                        style={{
                            width: '24px',
                            height: '24px',
                            minWidth: '24px'
                        }}
                        onClick={handleView}
                        title={`View ${accountName}`}
                    >
                        <FiEye size={12} />
                    </Button>

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
                                title={`Edit ${accountName}`}
                                disabled={!!currentAccount}
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
                                title={`Delete ${accountName}`}
                                disabled={!!currentAccount}
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
                        title={`Select ${accountName}`}
                    >
                        <FiCheck size={12} />
                    </Button>
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
        if (prevProps.style !== nextProps.style) return false;

        const prevAccount = prevProps.data.accounts[prevProps.index];
        const nextAccount = nextProps.data.accounts[nextProps.index];

        return (
            shallowEqual(prevAccount, nextAccount) &&
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

    // Reset column widths
    const resetColumnWidths = () => {
        setColumnWidths({
            name: 200,
            group: 200,
            actions: 140
        });
        showNotificationMessage('Column widths reset to default', 'success');
    };

    const resetForm = () => {
        setFormData({
            name: '',
            address: '',
            phone: '',
            ward: '',
            pan: '',
            email: '',
            creditLimit: '',
            contactPerson: '',
            accountGroups: '', // Changed from companyGroups
            openingBalance: {
                amount: 0,
                type: 'Dr'
            }
        });
        setCurrentAccount(null);
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
                    errorMessage = error.response.data.error || 'Invalid request';
                    break;
                case 401:
                    // This is handled by interceptor
                    errorMessage = 'Session expired. Please login again.';
                    navigate('/auth/login');
                    return;
                case 403:
                    // Check if it's a trade type error
                    if (error.response.data.error && error.response.data.error.includes('trade type')) {
                        errorMessage = 'Access denied for this trade type. Please select a Retailer company.';
                        navigate('/user-dashboard');
                    } else {
                        errorMessage = error.response.data.error || 'Access denied';
                        navigate('/user-dashboard');
                    }
                    break;
                case 409:
                    errorMessage = error.response.data.error || 'Account already exists';
                    break;
                default:
                    errorMessage = error.response.data.message || 'Request failed';
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

    const handleCancel = () => {
        setCurrentAccount(null);
        setFormData({
            name: '',
            address: '',
            phone: '',
            ward: '',
            pan: '',
            email: '',
            creditLimit: '',
            contactPerson: '',
            accountGroups: '', // Changed from companyGroups
            openingBalance: {
                amount: 0,
                type: 'Dr'
            }
        });
    };

    const handleEdit = (account) => {
        setCurrentAccount(account);
        setFormData({
            name: account.name,
            address: account.address || '',
            phone: account.phone || '',
            ward: account.ward || '',
            pan: account.pan || '',
            email: account.email || '',
            creditLimit: account.creditLimit || '',
            contactPerson: account.contactPerson || '',
            accountGroups: account.accountGroups?._id || '', // Changed from companyGroups
            openingBalance: {
                amount: account.openingBalance?.amount || 0,
                type: account.openingBalance?.type || 'Dr'
            }
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
            try {
                const response = await api.delete(`/api/retailer/companies/${id}`);

                if (response.data.success) {
                    showNotificationMessage('Account deleted successfully', 'success');
                    fetchAccounts();
                } else {
                    showNotificationMessage(response.data.error || 'Failed to delete account', 'error');
                }
            } catch (err) {
                handleApiError(err);
            }
        }
    };

    const handleSelectAccount = (account) => {
        setFormData({
            name: account.name,
            address: account.address || '',
            phone: account.phone || '',
            ward: account.ward || '',
            pan: account.pan || '',
            email: account.email || '',
            creditLimit: account.creditLimit || '',
            contactPerson: account.contactPerson || '',
            accountGroups: account.accountGroups?._id || '', // Changed from companyGroups
            openingBalance: {
                amount: account.openingBalance?.amount || 0,
                type: account.openingBalance?.type || 'Dr'
            }
        });
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;

        if (name.includes('openingBalance')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                openingBalance: {
                    ...prev.openingBalance,
                    [field]: field === 'amount' ? parseFloat(value) || 0 : value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));

            // Update search term when name field changes
            if (name === 'name') {
                setSearchTerm(value.toLowerCase());
            }
        }
    };

const handleSubmit = async (e) => {
    if (e) {
        e.preventDefault();
    }

    setIsSaving(true);

    try {
        // Prepare the data in the format expected by backend
        const requestData = {
            name: formData.name.trim(),
            address: formData.address?.trim() || '',
            phone: formData.phone?.trim() || '',
            ward: formData.ward ? parseInt(formData.ward) : null,
            pan: formData.pan?.trim() || null, // Send null if empty
            email: formData.email?.trim()?.toLowerCase() || '',
            creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 0,
            contactPerson: formData.contactPerson?.trim() || '',
            accountGroups: formData.accountGroups, // Guid as string
            openingBalance: {
                amount: parseFloat(formData.openingBalance.amount) || 0,
                type: formData.openingBalance.type || 'Dr'
            },
            isActive: true
        };

        // Validate required fields
        if (!requestData.name || !requestData.accountGroups) {
            showNotificationMessage('Account name and account group are required', 'error');
            setIsSaving(false);
            return;
        }

        console.log('=== SENDING DATA TO BACKEND ===');
        console.log('Request Data:', JSON.stringify(requestData, null, 2));
        console.log('===============================');

        if (currentAccount) {
            // Update existing account
            await api.put(`/api/retailer/companies/${currentAccount._id}`, requestData);
            showNotificationMessage('Account updated successfully!', 'success');
        } else {
            // Create new account
            await api.post('/api/retailer/companies', requestData);
            showNotificationMessage('Account created successfully!', 'success');
            resetForm();
        }
        fetchAccounts();
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
    const printAccounts = () => {
        let accountsToPrint = [...data.accounts];

        // Apply filters
        if (printOption === 'group' && selectedAccountGroup) { // Changed from selectedCompanyGroup
            accountsToPrint = accountsToPrint.filter(account =>
                account.accountGroups?._id === selectedAccountGroup // Changed from companyGroups
            );
        }

        if (accountsToPrint.length === 0) {
            alert("No accounts to print");
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
                .badge { 
                    padding: 3px 6px; 
                    border-radius: 3px; 
                    font-size: 10px; 
                    display: inline-block;
                }
                .badge-danger { 
                    background-color: #dc3545; 
                    color: white; 
                }
                .badge-success { 
                    background-color: #28a745; 
                    color: white; 
                }
                .badge-info { 
                    background-color: #17a2b8; 
                    color: white; 
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
            
            <div class="report-title">Accounts Report</div>
            
            <div class="header-info">
                <strong>Fiscal Year:</strong> ${data.currentFiscalYear?.name || 'N/A'} | 
                <strong>Total Accounts:</strong> ${accountsToPrint.length}
            </div>
            
            <div class="filter-info">
                ${printOption !== 'all' && selectedAccountGroup ?
                `<strong>Filter:</strong> Account Group: ${data.accountGroups.find(g => g._id === selectedAccountGroup)?.name || 'N/A'} | ` : ''
            }
                <strong>Printed on:</strong> ${data.companyDateFormat === 'nepali' ?
                (data.nepaliDate || new NepaliDate().format('YYYY-MM-DD')) :
                new Date().toLocaleDateString()}
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th class="nowrap">S.N.</th>
                        <th class="nowrap">Account Name</th>
                        <th class="nowrap">Account Group</th>
                        <th class="nowrap">Opening Balance</th>
                        <th class="nowrap">Credit Limit</th>
                        <th class="nowrap">Phone</th>
                        <th class="nowrap">Email</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Calculate totals
        let totalDr = 0;
        let totalCr = 0;
        let totalCreditLimit = 0;

        accountsToPrint.forEach((account, index) => {
            const balance = account.openingBalance?.amount || 0;
            const balanceType = account.openingBalance?.type || 'Dr';
            const creditLimit = parseFloat(account.creditLimit) || 0;

            if (balanceType === 'Dr') {
                totalDr += balance;
            } else {
                totalCr += balance;
            }
            totalCreditLimit += creditLimit;

            tableContent += `
                <tr>
                    <td class="nowrap">${index + 1}</td>
                    <td class="nowrap">${account.name || 'N/A'}</td>
                    <td class="nowrap">${account.accountGroups?.name || 'N/A'}</td> <!-- Changed from companyGroups -->
                    <td class="nowrap">
                            ${balance.toFixed(2)} ${balanceType}
                    </td>
                    <td class="nowrap">${creditLimit.toFixed(2)}</td>
                    <td class="nowrap">${account.phone || 'N/A'}</td>
                    <td class="nowrap">${account.email || 'N/A'}</td>
                </tr>
            `;
        });

        // Add summary row
        tableContent += `
                </tbody>
                <tfoot>
                    <tr class="summary-row">
                        <td colspan="3" class="nowrap"><strong>Summary</strong></td>
                        <td class="nowrap">
                            <strong>Dr: ${totalDr.toFixed(2)} | Cr: ${totalCr.toFixed(2)}</strong>
                        </td>
                        <td class="nowrap"><strong>Total Credit Limit: ${totalCreditLimit.toFixed(2)}</strong></td>
                        <td colspan="2"></td>
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
                    <title>Accounts Report - ${data.company?.companyName || data.currentCompanyName || 'Accounts Report'}</title>
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
            // Get accounts to export
            const accountsToExport = exportAll ? data.accounts : filteredAccounts;

            if (accountsToExport.length === 0) {
                showNotificationMessage('No accounts to export', 'warning');
                return;
            }

            // Prepare data for Excel
            const excelData = accountsToExport.map((account, index) => {
                return {
                    'S.N.': index + 1,
                    'Account Name': account.name || 'N/A',
                    'Account Group': account.accountGroups?.name || 'N/A', // Changed from companyGroups
                    'Opening Balance': account.openingBalance?.amount || 0,
                    'Balance Type': account.openingBalance?.type || 'Dr',
                    'Credit Limit': account.creditLimit || 0,
                    'Phone': account.phone || '',
                    'Email': account.email || '',
                    'Address': account.address || '',
                    'Ward No.': account.ward || '',
                    'PAN/VAT': account.pan || '',
                    'Contact Person': account.contactPerson || '',
                    'Created': account.createdAt ? new Date(account.createdAt).toLocaleDateString() : '',
                    'Last Updated': account.updatedAt ? new Date(account.updatedAt).toLocaleDateString() : ''
                };
            });

            // Add summary statistics
            const summaryData = [
                {},
                {
                    'S.N.': 'SUMMARY',
                    'Account Name': 'Total Accounts:',
                    'Account Group': accountsToExport.length
                },
                {
                    'S.N.': '',
                    'Account Name': 'Total Dr Balance:',
                    'Account Group': accountsToExport
                        .filter(acc => acc.openingBalance?.type === 'Dr')
                        .reduce((sum, acc) => sum + (parseFloat(acc.openingBalance?.amount) || 0), 0)
                        .toFixed(2)
                },
                {
                    'S.N.': '',
                    'Account Name': 'Total Cr Balance:',
                    'Account Group': accountsToExport
                        .filter(acc => acc.openingBalance?.type === 'Cr')
                        .reduce((sum, acc) => sum + (parseFloat(acc.openingBalance?.amount) || 0), 0)
                        .toFixed(2)
                },
                {
                    'S.N.': '',
                    'Account Name': 'Total Credit Limit:',
                    'Account Group': accountsToExport
                        .reduce((sum, acc) => sum + (parseFloat(acc.creditLimit) || 0), 0)
                        .toFixed(2)
                }
            ];

            // Create workbook
            const wb = XLSX.utils.book_new();

            // Main accounts sheet
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Auto-size columns
            ws['!cols'] = [
                { wch: 6 },   // S.N.
                { wch: 30 },  // Account Name
                { wch: 20 },  // Account Group
                { wch: 15 },  // Opening Balance
                { wch: 10 },  // Balance Type
                { wch: 15 },  // Credit Limit
                { wch: 15 },  // Phone
                { wch: 25 },  // Email
                { wch: 30 },  // Address
                { wch: 8 },   // Ward No.
                { wch: 12 },  // PAN/VAT
                { wch: 20 },  // Contact Person
                { wch: 12 },  // Created
                { wch: 12 }   // Last Updated
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Accounts');

            // Summary sheet
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            // Generate filename
            const date = new Date().toISOString().split('T')[0];
            const filterInfo = exportAll ? 'All' : 'Filtered';
            const fileName = `Accounts_Report_${filterInfo}_${date}.xlsx`;

            // Save file
            XLSX.writeFile(wb, fileName);

            showNotificationMessage(
                `${exportAll ? 'All' : 'Filtered'} accounts (${accountsToExport.length}) exported successfully!`,
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
                <p>Accounts count: {data.accounts.length}</p>
            </div>

            <div className="card mt-2">
                <div className="row g-3">
                    {/* Left Column - Add Account Form */}
                    <div className="col-lg-6">
                        <div className="card h-100 shadow-lg">
                            <div className="card-body">
                                <h3 className="text-center" style={{ textDecoration: 'underline' }}>
                                    {currentAccount ? `Edit Account: ${currentAccount.name}` : 'Create Accounts'}
                                </h3>
                                <Form onSubmit={handleSubmit} id="addAccountForm" style={{ marginTop: '5px' }}>
                                    <Form.Group className="row" style={{ marginBottom: '8px', gap: '5px 0' }}>
                                        <div className="col-md-5">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
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
                                                    Account Name <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Select
                                                    name="accountGroups" // Changed from companyGroups
                                                    value={formData.accountGroups} // Changed from companyGroups
                                                    onChange={handleFormChange}
                                                    required
                                                    style={{
                                                        height: '30px',
                                                        fontSize: '0.875rem',
                                                        paddingTop: '0.5rem',
                                                        paddingBottom: '0'
                                                    }}
                                                >
                                                    <option value="" disabled>Select Group</option>
                                                    {data.accountGroups.map(group => ( // Changed from companyGroups
                                                        <option key={group._id} value={group._id}>
                                                            {group.name}
                                                        </option>
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
                                                    Account Group <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-3">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                <div className="position-relative">
                                                    <div style={{ position: 'relative' }}>
                                                        <Form.Control
                                                            type="number"
                                                            name="openingBalance.amount"
                                                            value={formData.openingBalance.amount}
                                                            onChange={handleFormChange}
                                                            step="any"
                                                            disabled={!data.isInitialFiscalYear}
                                                            placeholder=" "
                                                            style={{
                                                                height: '30px',
                                                                fontSize: '0.875rem',
                                                                paddingTop: '0.75rem',
                                                                paddingRight: '45px'
                                                            }}
                                                        />
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '2px',
                                                            right: '5px',
                                                            width: '40px',
                                                            height: '26px'
                                                        }}>
                                                            <Form.Select
                                                                name="openingBalance.type"
                                                                value={formData.openingBalance.type}
                                                                onChange={handleFormChange}
                                                                disabled={!data.isInitialFiscalYear}
                                                                style={{
                                                                    height: '100%',
                                                                    fontSize: '0.75rem',
                                                                    padding: '0 4px',
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    appearance: 'none',
                                                                    WebkitAppearance: 'none',
                                                                    MozAppearance: 'none'
                                                                }}
                                                            >
                                                                <option value="Dr">Dr.</option>
                                                                <option value="Cr">Cr.</option>
                                                            </Form.Select>
                                                        </div>
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
                                                            Opening
                                                        </label>
                                                    </div>
                                                </div>

                                                {!data.isInitialFiscalYear && (
                                                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                        Op. only set init. f.y
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                    </Form.Group>

                                    <Form.Group className="row" style={{ marginBottom: '8px', gap: '5px 0' }}>
                                        <div className="col">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="number"
                                                    name="creditLimit"
                                                    value={formData.creditLimit}
                                                    onChange={handleFormChange}
                                                    step="any"
                                                    placeholder=" "
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
                                                    Credit Limit
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="text"
                                                    name="pan"
                                                    value={formData.pan}
                                                    onChange={handleFormChange}
                                                    minLength="9"
                                                    maxLength="9"
                                                    placeholder=" "
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
                                                    Pan No.
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="text"
                                                    name="address"
                                                    value={formData.address}
                                                    onChange={handleFormChange}
                                                    placeholder=" "
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
                                                    Address
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="number"
                                                    name="ward"
                                                    value={formData.ward}
                                                    onChange={handleFormChange}
                                                    placeholder=" "
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
                                                    Ward No.
                                                </label>
                                            </div>
                                        </div>
                                    </Form.Group>

                                    <Form.Group className="row" style={{ marginBottom: '12px', gap: '5px 0' }}>
                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="text"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleFormChange}
                                                    placeholder=" "
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
                                                    Phone
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleFormChange}
                                                    placeholder=" "
                                                    autoComplete="off"
                                                    style={{
                                                        height: '30px',
                                                        fontSize: '0.875rem',
                                                        paddingTop: '0.75rem',
                                                        textTransform: 'lowercase'
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
                                                    Email
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="text"
                                                    name="contactPerson"
                                                    value={formData.contactPerson}
                                                    onChange={handleFormChange}
                                                    placeholder=" "
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
                                                    Contact Person
                                                </label>
                                            </div>
                                        </div>
                                    </Form.Group>
                                    <div className="d-flex justify-content-between align-items-center">
                                        {currentAccount ? (
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
                                                ) : currentAccount ? (
                                                    <>
                                                        <FiCheck className="me-1" size={14} />
                                                        Save Changes
                                                    </>
                                                ) : (
                                                    'Add Account'
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
                                <h3 className="text-center" style={{ textDecoration: 'underline' }}>Existing Accounts</h3>

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
                                            disabled={exporting || data.accounts.length === 0}
                                            title="Export all accounts to Excel"
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
                                                Search accounts...
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
                                                Loading accounts...
                                            </p>
                                        </div>
                                    ) : filteredAccounts.length === 0 ? (
                                        <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                            <i className="bi bi-people text-muted" style={{ fontSize: '1.5rem' }}></i>
                                            <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
                                                No accounts found
                                            </h6>
                                            <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                                {searchTerm ? 'Try a different search term' : 'Create your first account using the form'}
                                            </p>
                                        </div>
                                    ) : (
                                        <AutoSizer>
                                            {({ height, width }) => {
                                                const totalWidth = 60 + columnWidths.name + columnWidths.group + columnWidths.actions;

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
                                                            itemCount={filteredAccounts.length}
                                                            itemSize={26}
                                                            width={Math.max(width, totalWidth)}
                                                            itemData={{
                                                                accounts: filteredAccounts,
                                                                isAdminOrSupervisor: data.isAdminOrSupervisor
                                                            }}
                                                        >
                                                            {TableRow}
                                                        </List>
                                                        <div className="mt-2 text-muted small">
                                                            Showing {filteredAccounts.length} of {data.accounts.length} accounts
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
                            <span className="fw-bold fs-6">Print Accounts Report</span>
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
                                All Accounts
                            </Button>
                            <Button
                                variant={printOption === 'group' ? 'info' : 'outline-info'}
                                onClick={() => setPrintOption('group')}
                                size="sm"
                            >
                                By Account Group
                            </Button>
                        </div>

                        {printOption === 'group' && (
                            <div className="mt-3">
                                <Form.Label className="small fw-semibold">Select Account Group</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={selectedAccountGroup} // Changed from selectedCompanyGroup
                                    onChange={(e) => setSelectedAccountGroup(e.target.value)} // Changed from selectedCompanyGroup
                                    className="mb-2"
                                >
                                    <option value="">All Groups</option>
                                    {data.accountGroups.map(group => ( // Changed from companyGroups
                                        <option key={group._id} value={group._id}>
                                            {group.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </div>
                        )}

                        <div className="border-top pt-3 mt-3">
                            <h6 className="fw-bold mb-2 text-primary">Report Summary</h6>
                            <div className="row text-center">
                                <div className="col-4">
                                    <div className="text-muted small">Total Accounts</div>
                                    <div className="fw-bold h5">{data.accounts.length}</div>
                                </div>
                                <div className="col-4">
                                    <div className="text-muted small">Dr Accounts</div>
                                    <div className="fw-bold h5 text-danger">
                                        {data.accounts.filter(acc => acc.openingBalance?.type === 'Dr').length}
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-muted small">Cr Accounts</div>
                                    <div className="fw-bold h5 text-success">
                                        {data.accounts.filter(acc => acc.openingBalance?.type === 'Cr').length}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {printOption !== 'all' && selectedAccountGroup && ( // Changed from selectedCompanyGroup
                            <div className="alert alert-info border small mt-3 py-2">
                                <i className="bi bi-info-circle me-2"></i>
                                <span>
                                    Filtering by: <strong>{data.accountGroups.find(g => g._id === selectedAccountGroup)?.name}</strong> {/* Changed from companyGroups */}
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
                                    setSelectedAccountGroup(''); // Changed from selectedCompanyGroup
                                }}
                                size="sm"
                            >
                                Reset
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    printAccounts();
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
                    <p>Are you sure you want to save this account?</p>
                    {currentAccount && (
                        <div className="alert alert-warning small">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            This will update the existing account: <strong>{currentAccount.name}</strong>
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
                        {currentAccount ? 'Update Account' : 'Create Account'}
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

export default Accounts;