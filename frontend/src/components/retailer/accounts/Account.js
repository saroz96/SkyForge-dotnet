import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiEdit2,
    FiTrash2,
    FiEye,
    FiCheck,
    FiPrinter,
    FiArrowLeft,
    FiRefreshCw,
    FiX,
    FiSearch,
    FiGrid,
    FiUsers,
    FiDownload,
    FiSave
} from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Modal from 'react-bootstrap/Modal';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import ProductModal from '../dashboard/modals/ProductModal';
import NepaliDate from 'nepali-datetime';
import * as XLSX from 'xlsx';
import './Accounts.css';
import api, { refreshToken } from '../../services/api';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';

const Accounts = () => {
    const navigate = useNavigate();
    const { accountsSearchDraftSave, setAccountsSearchDraftSave, clearAccountsSearchDraft } = usePageNotRefreshContext();
    const [data, setData] = useState({
        accounts: [],
        accountGroups: [],
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
    // const [searchTerm, setSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState(
        accountsSearchDraftSave?.searchTerm || ''
    );
    const [currentAccount, setCurrentAccount] = useState(null);
    const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('');
    const accountNameInputRef = useRef(null);
    // Print modal states
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printOption, setPrintOption] = useState('all');
    const [selectedAccountGroup, setSelectedAccountGroup] = useState('');
    const openingBalanceTypeRef = useRef(null);
    // Pagination state
    const [paginatedAccounts, setPaginatedAccounts] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreItems, setHasMoreItems] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalFilteredAccounts, setTotalFilteredAccounts] = useState(0);
    const tableContainerRef = useRef(null);

    // Excel export state
    const [exporting, setExporting] = useState(false);

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        name: 250,
        group: 180,
        balance: 120,
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
        accountGroups: '',
        openingBalance: {
            amount: 0,
            type: 'Dr'
        }
    });

    const showNotificationMessage = (message, type) => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchAccounts();
        }
    }, []);

    useEffect(() => {
        setAccountsSearchDraftSave({
            searchTerm,
            timestamp: Date.now(),
        });
    }, [searchTerm, setAccountsSearchDraftSave]);

    // Sort account groups alphabetically by name
    const sortedAccountGroups = useMemo(() => {
        return [...data.accountGroups].sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }, [data.accountGroups]);

    const fetchAccounts = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/auth/login');
                return;
            }

            const response = await api.get('/api/retailer/companies');

            if (response.data.redirectTo) {
                navigate(response.data.redirectTo);
                return;
            }

            if (response.data.success) {
                const newData = {
                    accounts: response.data.data.accounts || [],
                    accountGroups: response.data.data.accountGroups || [],
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

                setData(newData);
            } else {
                throw new Error(response.data.error || 'Failed to fetch accounts');
            }
        } catch (err) {
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
        return () => window.removeEventListener('keydown', handleF9KeyDown);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                setShowSaveConfirmModal(true);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const handleFocus = () => {
            // Simulate click to open dropdown when focused via keyboard
            if (openingBalanceTypeRef.current) {
                // Small delay to ensure focus is applied first
                setTimeout(() => {
                    openingBalanceTypeRef.current.click();
                }, 100);
            }
        };

        const currentRef = openingBalanceTypeRef.current;
        if (currentRef) {
            currentRef.addEventListener('focus', handleFocus);
            return () => {
                currentRef.removeEventListener('focus', handleFocus);
            };
        }
    }, []);

    // Pagination function
    const paginateAccounts = useCallback((accountsList, pageNum, itemsPerPage = 25) => {
        const actualLimit = pageNum === 1 ? 15 : 15 + ((pageNum - 1) * itemsPerPage);
        return accountsList.slice(0, actualLimit);
    }, []);

    // Filtered accounts
    const filteredAccounts = useMemo(() => {
        return data.accounts
            .filter(account => {
                const searchTermLower = searchTerm.toLowerCase();
                const accountName = account.name || '';
                const groupName = account.accountGroups?.name || '';
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

    const processedFilteredAccounts = useMemo(() => {
        return filteredAccounts.map(account => ({
            ...account,
            _id: account._id || account.id,
            accountGroups: account.accountGroups,
            openingBalance: account.openingBalance || { amount: 0, type: 'Dr' }
        }));
    }, [filteredAccounts]);

    // Load more items
    const loadMoreItems = useCallback(() => {
        if (!hasMoreItems || isLoadingMore) return;
        setIsLoadingMore(true);

        setTimeout(() => {
            const nextPage = currentPage + 1;
            const itemsPerPage = 25;
            const newLimit = nextPage === 1 ? 15 : 15 + ((nextPage - 1) * itemsPerPage);
            const newPaginatedAccounts = processedFilteredAccounts.slice(0, newLimit);

            if (newPaginatedAccounts.length === paginatedAccounts.length) {
                setHasMoreItems(false);
            } else {
                setPaginatedAccounts(newPaginatedAccounts);
                setCurrentPage(nextPage);
            }
            setIsLoadingMore(false);
        }, 100);
    }, [hasMoreItems, isLoadingMore, currentPage, processedFilteredAccounts, paginatedAccounts]);

    // Handle scroll
    useEffect(() => {
        const handleScroll = () => {
            if (!tableContainerRef.current) return;
            const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
            if ((scrollTop + clientHeight) / scrollHeight > 0.8 && hasMoreItems && !isLoadingMore) {
                loadMoreItems();
            }
        };
        const tableContainer = tableContainerRef.current;
        if (tableContainer) {
            tableContainer.addEventListener('scroll', handleScroll);
            return () => tableContainer.removeEventListener('scroll', handleScroll);
        }
    }, [hasMoreItems, isLoadingMore, loadMoreItems]);

    // Reset pagination
    useEffect(() => {
        const initialAccounts = paginateAccounts(processedFilteredAccounts, 1);
        setPaginatedAccounts(initialAccounts);
        setCurrentPage(1);
        setHasMoreItems(processedFilteredAccounts.length > initialAccounts.length);
        setTotalFilteredAccounts(processedFilteredAccounts.length);
    }, [processedFilteredAccounts, paginateAccounts]);

    // Shallow equal function
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

    // Resizable Table Header
    const TableHeader = React.memo(() => {
        const totalWidth = 50 + columnWidths.name + columnWidths.group + columnWidths.balance + columnWidths.actions;

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="acc-header"
                style={{
                    width: Math.max(totalWidth, '100%'),
                    userSelect: isResizing ? 'none' : 'auto'
                }}
                onMouseMove={(e) => {
                    if (isResizing && resizingColumn) {
                        const diff = e.clientX - startX;
                        const newWidth = Math.max(80, startWidth + diff);
                        setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
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
                <div className="acc-header-cell acc-header-cell--sn">S.N.</div>
                <div className="acc-header-cell acc-header-cell--resizable" style={{ width: `${columnWidths.name}px`, minWidth: '100px' }}>
                    Account Name
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="name" />
                </div>
                <div className="acc-header-cell acc-header-cell--resizable" style={{ width: `${columnWidths.group}px`, minWidth: '80px' }}>
                    Account Group
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="group" />
                </div>
                <div className="acc-header-cell" style={{ width: `${columnWidths.actions}px`, minWidth: '120px', textAlign: 'center' }}>
                    Actions
                </div>

                {isResizing && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1000,
                        cursor: 'col-resize'
                    }} />
                )}
            </div>
        );
    });

    // Table Row Component
    const TableRow = React.memo(({ index, style, data }) => {
        const { accounts, isAdminOrSupervisor } = data;
        const account = accounts[index];

        if (!account) return null;

        const handleView = useCallback(() => navigate(`/retailer/companies/${account?._id}`), [account?._id]);
        const handleEditClick = useCallback(() => account && handleEdit(account), [account]);
        const handleDeleteClick = useCallback(() => account?._id && handleDelete(account._id), [account?._id]);
        const handleSelect = useCallback(() => account && handleSelectAccount(account), [account]);

        const accountName = account.name || 'N/A';
        const groupName = account.accountGroups?.name || 'N/A';
        const balance = account.openingBalance?.amount || 0;
        const balanceType = account.openingBalance?.type || 'Dr';
        const isDr = balanceType === 'Dr';

        return (
            <div
                style={{ ...style, display: 'flex', alignItems: 'center', height: '28px', minHeight: '28px', padding: '0', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                className={index % 2 === 0 ? 'acc-row-even' : 'acc-row-odd'}
                onDoubleClick={handleView}
            >
                <div className="acc-cell acc-cell--sn">{index + 1}</div>
                <div className="acc-cell acc-cell--name" style={{ width: `${columnWidths.name}px`, flexShrink: 0 }} title={accountName}>
                    <span className="acc-item-name">{accountName}</span>
                    {account.pan && <span className="acc-badge acc-badge--pan">PAN: {account.pan}</span>}
                </div>
                <div className="acc-cell acc-cell--group" style={{ width: `${columnWidths.group}px`, flexShrink: 0 }}>
                    <span className="acc-text-muted">{groupName}</span>
                </div>
                <div className="acc-cell acc-cell--actions" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>
                    <button className="acc-btn-action acc-btn-action--view" onClick={handleView} title="View">
                        <FiEye size={12} />
                    </button>
                    {isAdminOrSupervisor && (
                        <>
                            <button className="acc-btn-action acc-btn-action--edit" onClick={handleEditClick} title="Edit" disabled={!!currentAccount}>
                                <FiEdit2 size={12} />
                            </button>
                            <button className="acc-btn-action acc-btn-action--delete" onClick={handleDeleteClick} title="Delete" disabled={!!currentAccount}>
                                <FiTrash2 size={12} />
                            </button>
                        </>
                    )}
                    <button className="acc-btn-action acc-btn-action--select" onClick={handleSelect} title="Select">
                        <FiCheck size={12} />
                    </button>
                </div>
            </div>
        );
    });

    // Resize Handle Component
    const ResizeHandle = React.memo(({ onResizeStart, columnName }) => {
        return (
            <div
                className="acc-resize-handle"
                onMouseDown={(e) => {
                    e.preventDefault();
                    onResizeStart(e, columnName);
                }}
            />
        );
    });

    const resetColumnWidths = () => {
        setColumnWidths({
            name: 250,
            group: 180,
            balance: 120,
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
            accountGroups: '',
            openingBalance: {
                amount: 0,
                type: 'Dr'
            }
        });
        setCurrentAccount(null);
    };

    const handleApiError = (error) => {
        let errorMessage = 'An error occurred';

        if (error.response) {
            switch (error.response.status) {
                case 400:
                    errorMessage = error.response.data.error || 'Invalid request';
                    break;
                case 401:
                    errorMessage = 'Session expired. Please login again.';
                    navigate('/auth/login');
                    return;
                case 403:
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
            accountGroups: '',
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
            accountGroups: account.accountGroups?._id || '',
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
            accountGroups: account.accountGroups?._id || '',
            openingBalance: {
                amount: 0,
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
            if (name === 'name') {
                setSearchTerm(value.toLowerCase());
            }
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        setIsSaving(true);

        try {
            const requestData = {
                name: formData.name.trim(),
                address: formData.address?.trim() || '',
                phone: formData.phone?.trim() || '',
                ward: formData.ward ? parseInt(formData.ward) : null,
                pan: formData.pan?.trim() || null,
                email: formData.email?.trim()?.toLowerCase() || '',
                creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 0,
                contactPerson: formData.contactPerson?.trim() || '',
                accountGroups: formData.accountGroups,
                openingBalance: {
                    amount: parseFloat(formData.openingBalance.amount) || 0,
                    type: formData.openingBalance.type || 'Dr'
                },
                isActive: true
            };

            if (!requestData.name || !requestData.accountGroups) {
                showNotificationMessage('Account name and account group are required', 'error');
                setIsSaving(false);
                return;
            }

            if (currentAccount) {
                await api.put(`/api/retailer/companies/${currentAccount._id}`, requestData);
                showNotificationMessage('Account updated successfully!', 'success');
            } else {
                await api.post('/api/retailer/companies', requestData);
                showNotificationMessage('Account created successfully!', 'success');
                resetForm();

                setTimeout(() => {
                    if (accountNameInputRef.current) {
                        accountNameInputRef.current.focus();
                    }
                }, 50);
            }
            fetchAccounts();
        } catch (err) {
            if (err.response?.data?.errors) {
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

    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const printAccounts = () => {
        let accountsToPrint = [...data.accounts];

        if (printOption === 'group' && selectedAccountGroup) {
            accountsToPrint = accountsToPrint.filter(account =>
                account.accountGroups?._id === selectedAccountGroup
            );
        }

        if (accountsToPrint.length === 0) {
            alert("No accounts to print");
            return;
        }

        const printWindow = window.open("", "_blank");

        const printHeader = `
        <div class="print-header">
            <h1 style="font-size: 14px; margin: 0;">${data.company?.companyName || data.currentCompanyName || 'Company Name'}</h1>
            <p style="font-size: 8px; margin: 2px 0;">
                ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''},
                PAN: ${data.company?.pan || ''}<br>
            </p>
            <hr style="margin: 2px 0;">
        </div>
    `;

        let tableContent = `
        <style>
            @page { margin: 3mm; }
            body { font-family: Arial, sans-serif; font-size: 7px; margin: 0; padding: 2mm; }
            table { width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 6px; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th, td { border: 1px solid #000; padding: 2px 3px; text-align: left; white-space: nowrap; }
            th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; font-size: 10px; font-weight: bold; padding: 3px 3px; }
            td { font-size: 8px; padding: 2px 3px; }
            .print-header { text-align: center; margin-bottom: 5px; }
            .nowrap { white-space: nowrap; }
            h1 { font-size: 14px; margin: 0; }
            .report-title { text-align: center; text-decoration: underline; font-size: 11px; font-weight: bold; margin: 3px 0; }
            .header-info { text-align: center; margin-bottom: 5px; font-size: 8px; }
            .filter-info { text-align: center; margin-bottom: 8px; font-size: 7px; color: #666; }
            .balance-dr { color: #dc3545; font-weight: bold; }
            .balance-cr { color: #28a745; font-weight: bold; }
            .summary-row { background-color: #f8f9fa; font-weight: bold; }
            .footer-note { margin-top: 10px; font-size: 7px; color: #666; text-align: center; }
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
                    <th class="nowrap">PAN/VAT</th>
                </tr>
            </thead>
            <tbody>
    `;

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

            const balanceClass = balanceType === 'Dr' ? 'balance-dr' : 'balance-cr';

            tableContent += `
            <tr>
                <td class="nowrap">${index + 1}</td>
                <td class="nowrap">${escapeHtml(account.name || 'N/A')}</td>
                <td class="nowrap">${escapeHtml(account.accountGroups?.name || 'N/A')}</td>
                <td class="nowrap ${balanceClass}">${balance.toFixed(2)} ${balanceType}</td>
                <td class="nowrap">${creditLimit.toFixed(2)}</td>
                <td class="nowrap">${escapeHtml(account.phone || 'N/A')}</td>
                <td class="nowrap">${escapeHtml(account.pan || 'N/A')}</td>
            </tr>
        `;
        });

        tableContent += `
            </tbody>
            <tfoot>
                <tr class="summary-row">
                    <td colspan="3" class="nowrap"><strong>Summary</strong></td>
                    <td class="nowrap"><strong>Dr: ${totalDr.toFixed(2)} | Cr: ${totalCr.toFixed(2)}</strong></td>
                    <td class="nowrap"><strong>${totalCreditLimit.toFixed(2)}</strong></td>
                    <td colspan="2"></td>
                </tr>
            </tfoot>
        </table>
        <div class="footer-note">
            ${data.company?.companyName ? `© ${new Date().getFullYear()} ${data.company.companyName}` : ''}
        </div>
    `;

        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Accounts Report - ${data.company?.companyName || data.currentCompanyName || 'Accounts Report'}</title>
                <meta charset="UTF-8">
            </head>
            <body>
                ${tableContent}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 200);
                    };
                <\/script>
            </body>
        </html>
    `);
        printWindow.document.close();
    };

    const exportToExcel = async (exportAll = false) => {
        setExporting(true);
        try {
            const accountsToExport = exportAll ? data.accounts : filteredAccounts;

            if (accountsToExport.length === 0) {
                showNotificationMessage('No accounts to export', 'warning');
                return;
            }

            const excelData = accountsToExport.map((account, index) => ({
                'S.N.': index + 1,
                'Account Name': account.name || 'N/A',
                'Account Group': account.accountGroups?.name || 'N/A',
                'Opening Balance': account.openingBalance?.amount || 0,
                'Balance Type': account.openingBalance?.type || 'Dr',
                'Credit Limit': account.creditLimit || 0,
                'Phone': account.phone || '',
                'Email': account.email || '',
                'Address': account.address || '',
                'PAN/VAT': account.pan || '',
                'Contact Person': account.contactPerson || '',
                'Created': account.createdAt ? new Date(account.createdAt).toLocaleDateString() : '',
                'Last Updated': account.updatedAt ? new Date(account.updatedAt).toLocaleDateString() : ''
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            XLSX.utils.book_append_sheet(wb, ws, 'Accounts');

            const date = new Date().toISOString().split('T')[0];
            const fileName = `Accounts_Report_${exportAll ? 'All' : 'Filtered'}_${date}.xlsx`;

            XLSX.writeFile(wb, fileName);
            showNotificationMessage(`${exportAll ? 'All' : 'Filtered'} accounts (${accountsToExport.length}) exported successfully!`, 'success');

        } catch (err) {
            console.error('Error exporting to Excel:', err);
            showNotificationMessage('Failed to export to Excel', 'error');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="acc-container">
            <Header />
            <NotificationToast
                message={notificationMessage}
                type={notificationType}
                show={showNotification}
                onClose={() => setShowNotification(false)}
            />

            <div className="acc-main">
                {/* Left Column - Add Account Form */}
                <div className="acc-form-section">
                    <div className="acc-card acc-card--form">
                        <div className="acc-card-header">
                            <div className="acc-card-header-left">
                                <div className="acc-card-header-icon acc-card-header-icon--form">
                                    <FiUsers />
                                </div>
                                <div>
                                    <h5 className="acc-card-title">{currentAccount ? `Edit Account: ${currentAccount.name}` : 'Create Accounts'}</h5>
                                    <small className="acc-card-subtitle">
                                        {currentAccount ? 'Update existing account' : 'Add new account'}
                                    </small>
                                </div>
                            </div>
                            {currentAccount && (
                                <button className="acc-btn-cancel" onClick={handleCancel} disabled={isSaving}>
                                    <FiX /> Cancel
                                </button>
                            )}
                        </div>

                        <div className="acc-card-body">
                            <form onSubmit={handleSubmit} id="addAccountForm">
                                <div className="acc-form-row">
                                    <div className="acc-form-group acc-form-group--half">
                                        <label className="acc-form-label">Account Name <span className="acc-required">*</span></label>
                                        <input
                                            ref={accountNameInputRef}
                                            type="text"
                                            name="name"
                                            className="acc-form-input"
                                            value={formData.name}
                                            onChange={handleFormChange}
                                            placeholder="Enter account name"
                                            required
                                            autoFocus
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const groupSelect = document.querySelector('select[name="accountGroups"]');
                                                    if (groupSelect) groupSelect.focus();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="acc-form-group acc-form-group--half">
                                        <label className="acc-form-label">Account Group <span className="acc-required">*</span></label>
                                        <select
                                            name="accountGroups"
                                            className="acc-form-select"
                                            value={formData.accountGroups}
                                            onChange={handleFormChange}
                                            required
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const openingBalanceInput = document.querySelector('input[name="openingBalance.amount"]');
                                                    if (openingBalanceInput) openingBalanceInput.focus();
                                                }
                                            }}
                                        >
                                            <option value="">Select Group</option>
                                            {sortedAccountGroups.map(group => (
                                                <option key={group._id} value={group._id}>
                                                    {group.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="acc-form-row">
                                    <div className="acc-form-group acc-form-group--third">
                                        <label className="acc-form-label">Opening Balance</label>
                                        <div className="acc-balance-input">
                                            <input
                                                type="number"
                                                name="openingBalance.amount"
                                                className="acc-form-input"
                                                value={formData.openingBalance.amount}
                                                onChange={handleFormChange}
                                                step="any"
                                                readOnly={!data.isInitialFiscalYear}
                                                placeholder="0.00"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        const openingBalanceTypeInput = document.querySelector('select[name="openingBalance.type"]');
                                                        if (openingBalanceTypeInput) {
                                                            openingBalanceTypeInput.focus();
                                                            // ✅ Open the dropdown after focusing
                                                            setTimeout(() => {
                                                                openingBalanceTypeInput.click();
                                                            }, 50);
                                                        }
                                                    }
                                                }}
                                            />
                                            <select
                                                name="openingBalance.type"
                                                className="acc-balance-type-select"
                                                value={formData.openingBalance.type}
                                                onChange={handleFormChange}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        const creditLimitInput = document.querySelector('input[name="creditLimit"]');
                                                        if (creditLimitInput) creditLimitInput.focus();
                                                    }
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.backgroundColor = '#e7f1ff';
                                                    e.target.style.borderColor = '#86b7fe';
                                                    e.target.style.boxShadow = '0 0 0 0.25rem rgba(13, 110, 253, 0.25)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.backgroundColor = '';
                                                    e.target.style.borderColor = '';
                                                    e.target.style.boxShadow = '';
                                                }}
                                            >
                                                <option value="Dr">Dr.</option>
                                                <option value="Cr">Cr.</option>
                                            </select>
                                        </div>
                                        {!data.isInitialFiscalYear && (
                                            <small className="acc-form-hint">Op. bal. can only be set in initial F.Y</small>
                                        )}
                                    </div>

                                    <div className="acc-form-group acc-form-group--third">
                                        <label className="acc-form-label">Credit Limit</label>
                                        <input
                                            type="number"
                                            name="creditLimit"
                                            className="acc-form-input"
                                            value={formData.creditLimit}
                                            onChange={handleFormChange}
                                            step="any"
                                            placeholder="0.00"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const panInput = document.querySelector('input[name="pan"]');
                                                    if (panInput) panInput.focus();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="acc-form-group acc-form-group--third">
                                        <label className="acc-form-label">PAN/VAT</label>
                                        <input
                                            type="text"
                                            name="pan"
                                            className="acc-form-input"
                                            value={formData.pan}
                                            onChange={handleFormChange}
                                            minLength="9"
                                            maxLength="9"
                                            placeholder="PAN Number"
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const addressInput = document.querySelector('input[name="address"]');
                                                    if (addressInput) addressInput.focus();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="acc-form-row">
                                    <div className="acc-form-group acc-form-group--third">
                                        <label className="acc-form-label">Address</label>
                                        <input
                                            type="text"
                                            name="address"
                                            className="acc-form-input"
                                            value={formData.address}
                                            onChange={handleFormChange}
                                            placeholder="Enter address"
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const wardInput = document.querySelector('input[name="ward"]');
                                                    if (wardInput) wardInput.focus();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="acc-form-group acc-form-group--third">
                                        <label className="acc-form-label">Ward No.</label>
                                        <input
                                            type="number"
                                            name="ward"
                                            className="acc-form-input"
                                            value={formData.ward}
                                            onChange={handleFormChange}
                                            placeholder="Ward number"
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const phoneInput = document.querySelector('input[name="phone"]');
                                                    if (phoneInput) phoneInput.focus();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="acc-form-group acc-form-group--third">
                                        <label className="acc-form-label">Phone</label>
                                        <input
                                            type="text"
                                            name="phone"
                                            className="acc-form-input"
                                            value={formData.phone}
                                            onChange={handleFormChange}
                                            placeholder="Phone number"
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const emailInput = document.querySelector('input[name="email"]');
                                                    if (emailInput) emailInput.focus();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="acc-form-row">
                                    <div className="acc-form-group acc-form-group--half">
                                        <label className="acc-form-label">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            className="acc-form-input"
                                            value={formData.email}
                                            onChange={handleFormChange}
                                            placeholder="Email address"
                                            autoComplete="off"
                                            style={{ textTransform: 'lowercase' }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const contactPersonInput = document.querySelector('input[name="contactPerson"]');
                                                    if (contactPersonInput) contactPersonInput.focus();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="acc-form-group acc-form-group--half">
                                        <label className="acc-form-label">Contact Person</label>
                                        <input
                                            type="text"
                                            name="contactPerson"
                                            className="acc-form-input"
                                            value={formData.contactPerson}
                                            onChange={handleFormChange}
                                            placeholder="Contact person name"
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const submitButton = document.getElementById('submitAccountButton');
                                                    if (submitButton) submitButton.focus();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="acc-form-row">
                                    <div className="acc-form-group acc-form-group--full">
                                        <div className="acc-form-actions acc-form-actions--right">
                                            <button
                                                id="submitAccountButton"
                                                type="submit"
                                                className="acc-btn-save"
                                                disabled={isSaving}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <span className="acc-spinner-small"></span>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiSave size={14} /> {currentAccount ? 'Update Account' : 'Add Account'}
                                                    </>
                                                )}
                                            </button>
                                            <small className="acc-shortcut-hint">Alt+S</small>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right Column - Existing Accounts */}
                <div className="acc-list-section">
                    <div className="acc-card acc-card--list">
                        <div className="acc-card-header acc-card-header--list">
                            <div className="acc-card-header-left">
                                <div className="acc-card-header-icon acc-card-header-icon--list">
                                    <FiGrid />
                                </div>
                                <div>
                                    <h5 className="acc-card-title">Existing Accounts</h5>
                                    <small className="acc-card-subtitle">
                                        {totalFilteredAccounts} accounts found
                                    </small>
                                </div>
                            </div>
                            <div className="acc-card-actions">
                                <button className="acc-btn-toolbar" onClick={() => navigate(-1)} title="Go back">
                                    <FiArrowLeft size={14} />
                                </button>
                                <button className="acc-btn-toolbar" onClick={() => setShowPrintModal(true)} title="Print report">
                                    <FiPrinter size={14} />
                                </button>
                                <button className="acc-btn-toolbar" onClick={() => exportToExcel(true)} disabled={exporting || data.accounts.length === 0} title="Export to Excel">
                                    {exporting ? <span className="acc-spinner-small"></span> : <FiDownload size={14} />}
                                </button>
                                <button className="acc-btn-toolbar" onClick={resetColumnWidths} title="Reset column widths">
                                    <FiRefreshCw size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="acc-search-bar">
                            <div className="acc-search-wrapper">
                                <FiSearch className="acc-search-icon" />
                                <input
                                    type="text"
                                    className="acc-search-input"
                                    placeholder="Search accounts by name, group, PAN, phone or email..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                                {searchTerm && (
                                    <button className="acc-search-clear" onClick={() => setSearchTerm('')}>
                                        <FiX size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="acc-table-wrapper" ref={tableContainerRef}>
                            {loading ? (
                                <div className="acc-loading">
                                    <div className="acc-spinner"></div>
                                    <p className="acc-loading-text">Loading accounts...</p>
                                </div>
                            ) : paginatedAccounts.length === 0 ? (
                                <div className="acc-empty">
                                    <FiUsers className="acc-empty-icon" size={32} />
                                    <h6 className="acc-empty-title">No accounts found</h6>
                                    <p className="acc-empty-text">
                                        {searchTerm ? 'Try a different search term' : 'Create your first account using the form'}
                                    </p>
                                </div>
                            ) : (
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth = 50 + columnWidths.name + columnWidths.group + columnWidths.balance + columnWidths.actions;
                                        return (
                                            <div style={{ height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List
                                                    key={`accounts-list-${paginatedAccounts.length}-${currentPage}`}
                                                    height={height - 30}
                                                    itemCount={paginatedAccounts.length}
                                                    itemSize={28}
                                                    width={Math.max(width, totalWidth)}
                                                    itemData={{
                                                        accounts: paginatedAccounts,
                                                        isAdminOrSupervisor: data.isAdminOrSupervisor
                                                    }}
                                                >
                                                    {TableRow}
                                                </List>
                                                {isLoadingMore && (
                                                    <div className="acc-loading-more">
                                                        <div className="acc-spinner-small"></div>
                                                        <span>Loading more accounts...</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            )}
                        </div>

                        <div className="acc-table-footer">
                            <span className="acc-footer-info">
                                Showing {paginatedAccounts.length} of {totalFilteredAccounts} accounts
                            </span>
                            {hasMoreItems && paginatedAccounts.length < totalFilteredAccounts && (
                                <button className="acc-btn-load-more" onClick={loadMoreItems} disabled={isLoadingMore}>
                                    Load more...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Options Modal */}
            <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} centered size="md">
                <Modal.Header closeButton className="acc-modal-header">
                    <div className="d-flex align-items-center">
                        <FiPrinter className="me-2" size={20} />
                        <div>
                            <span className="fw-bold fs-6">Print Accounts Report</span>
                            <small className="d-block opacity-75">Select filter options</small>
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body className="p-3">
                    <div className="acc-print-options">
                        <h6 className="acc-print-options-title">Filter Options</h6>
                        <div className="acc-print-options-grid">
                            <button className={`acc-print-option ${printOption === 'all' ? 'acc-print-option--active' : ''}`} onClick={() => setPrintOption('all')}>
                                All Accounts
                            </button>
                            <button className={`acc-print-option ${printOption === 'group' ? 'acc-print-option--active' : ''}`} onClick={() => setPrintOption('group')}>
                                By Account Group
                            </button>
                        </div>

                        {printOption === 'group' && (
                            <div className="acc-print-filter">
                                <label className="acc-form-label small fw-semibold">Select Account Group</label>
                                <select
                                    className="acc-form-select"
                                    value={selectedAccountGroup}
                                    onChange={(e) => setSelectedAccountGroup(e.target.value)}
                                >
                                    <option value="">All Groups</option>
                                    {sortedAccountGroups.map(group => (
                                        <option key={group._id} value={group._id}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="acc-print-summary">
                            <h6 className="acc-print-options-title">Report Summary</h6>
                            <div className="acc-print-stats">
                                <div className="acc-print-stat">
                                    <span className="acc-print-stat-label">Total Accounts</span>
                                    <span className="acc-print-stat-value">{data.accounts.length}</span>
                                </div>
                                <div className="acc-print-stat">
                                    <span className="acc-print-stat-label acc-print-stat-label--danger">Dr Accounts</span>
                                    <span className="acc-print-stat-value acc-print-stat-value--danger">
                                        {data.accounts.filter(acc => acc.openingBalance?.type === 'Dr').length}
                                    </span>
                                </div>
                                <div className="acc-print-stat">
                                    <span className="acc-print-stat-label acc-print-stat-label--success">Cr Accounts</span>
                                    <span className="acc-print-stat-value acc-print-stat-value--success">
                                        {data.accounts.filter(acc => acc.openingBalance?.type === 'Cr').length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="py-2">
                    <button className="acc-btn-secondary" onClick={() => setShowPrintModal(false)}>Cancel</button>
                    <button className="acc-btn-primary" onClick={() => { printAccounts(); setShowPrintModal(false); }}>
                        <FiPrinter className="me-1" /> Print Report
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Save Confirmation Modal */}
            <Modal show={showSaveConfirmModal} onHide={() => setShowSaveConfirmModal(false)} centered>
                <Modal.Header closeButton className="acc-modal-header">
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
                    <button className="acc-btn-secondary" onClick={() => setShowSaveConfirmModal(false)}>Cancel</button>
                    <button className="acc-btn-primary" onClick={() => { handleSubmit(); setShowSaveConfirmModal(false); }}>
                        {currentAccount ? 'Update Account' : 'Create Account'}
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Product Modal */}
            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
        </div>
    );
};

export default Accounts;