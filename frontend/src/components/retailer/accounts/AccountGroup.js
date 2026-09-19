import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiEdit2,
    FiTrash2,
    FiCheck,
    FiPrinter,
    FiArrowLeft,
    FiRefreshCw,
    FiX,
    FiSearch,
    FiGrid,
    FiFolder,
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
import './AccountGroups.css';
import api, { refreshToken } from '../../services/api';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';

const AccountGroups = () => {
    const navigate = useNavigate();
    const {
        accountGroupsSearchDraftSave,
        setAccountGroupsSearchDraftSave,
        clearAccountGroupsSearchDraft
    } = usePageNotRefreshContext();
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
    // const [searchTerm, setSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState(
        accountGroupsSearchDraftSave?.searchTerm || ''
    );
    const [currentGroup, setCurrentGroup] = useState(null);
    const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('');
    const accountGroupInputRef = useRef(null);

    // Pagination state
    const [paginatedGroups, setPaginatedGroups] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreItems, setHasMoreItems] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalFilteredGroups, setTotalFilteredGroups] = useState(0);
    const tableContainerRef = useRef(null);

    // Print modal states
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printOption, setPrintOption] = useState('all');
    const [selectedType, setSelectedType] = useState('');

    // Excel export state
    const [exporting, setExporting] = useState(false);

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        name: 220,
        primaryGroup: 60,
        type: 180,
        actions: 140
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Form state
    const [formData, setFormData] = useState({
        Name: '',
        Type: '',
        PrimaryGroup: ''
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

    const showNotificationMessage = (message, type) => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchAccountGroups();
        }
    }, []);

    const fetchAccountGroups = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/auth/login');
                return;
            }

            const response = await api.get('/api/retailer/account-group');

            if (response.data) {
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
                setData(newData);
            } else {
                throw new Error('Failed to fetch account groups');
            }
        } catch (err) {
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

    useEffect(() => {
        setAccountGroupsSearchDraftSave({
            searchTerm,
            timestamp: Date.now(),
        });
    }, [searchTerm, setAccountGroupsSearchDraftSave]);

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

    // Filtered groups
    const filteredGroups = useMemo(() => {
        return data.groups
            .filter(group =>
                group?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (group.type && group.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (group.primaryGroup && group.primaryGroup.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [data.groups, searchTerm]);

    const processedFilteredGroups = useMemo(() => {
        return filteredGroups.map(group => ({
            ...group,
            _id: group._id || group.id
        }));
    }, [filteredGroups]);

    // Load more items
    const loadMoreItems = useCallback(() => {
        if (!hasMoreItems || isLoadingMore) return;
        setIsLoadingMore(true);

        setTimeout(() => {
            const nextPage = currentPage + 1;
            const itemsPerPage = 25;
            const newLimit = nextPage === 1 ? 15 : 15 + ((nextPage - 1) * itemsPerPage);
            const newPaginatedGroups = processedFilteredGroups.slice(0, newLimit);

            if (newPaginatedGroups.length === paginatedGroups.length) {
                setHasMoreItems(false);
            } else {
                setPaginatedGroups(newPaginatedGroups);
                setCurrentPage(nextPage);
            }
            setIsLoadingMore(false);
        }, 100);
    }, [hasMoreItems, isLoadingMore, currentPage, processedFilteredGroups, paginatedGroups]);

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

    // Pagination
    const paginateGroups = useCallback((groupsList, pageNum, itemsPerPage = 25) => {
        const actualLimit = pageNum === 1 ? 15 : 15 + ((pageNum - 1) * itemsPerPage);
        return groupsList.slice(0, actualLimit);
    }, []);

    // Reset pagination
    useEffect(() => {
        const initialGroups = paginateGroups(processedFilteredGroups, 1);
        setPaginatedGroups(initialGroups);
        setCurrentPage(1);
        setHasMoreItems(processedFilteredGroups.length > initialGroups.length);
        setTotalFilteredGroups(processedFilteredGroups.length);
    }, [processedFilteredGroups, paginateGroups]);

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

    // Filter group types
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

    // Resizable Table Header
    const TableHeader = React.memo(() => {
        const totalWidth = 50 + columnWidths.name + columnWidths.primaryGroup + columnWidths.type + columnWidths.actions;

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="ag-header"
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
                <div className="ag-header-cell ag-header-cell--sn">S.N.</div>
                <div className="ag-header-cell ag-header-cell--resizable" style={{ width: `${columnWidths.name}px`, minWidth: '100px' }}>
                    Group Name
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="name" />
                </div>
                <div className="ag-header-cell ag-header-cell--resizable" style={{ width: `${columnWidths.primaryGroup}px`, minWidth: '60px' }}>
                    Primary
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="primaryGroup" />
                </div>
                <div className="ag-header-cell ag-header-cell--resizable" style={{ width: `${columnWidths.type}px`, minWidth: '100px' }}>
                    Group Type
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="type" />
                </div>
                <div className="ag-header-cell" style={{ width: `${columnWidths.actions}px`, minWidth: '120px', textAlign: 'center' }}>
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
        const { groups, isAdminOrSupervisor } = data;
        const group = groups[index];

        if (!group) return null;

        const handleEditClick = useCallback(() => group && handleEdit(group), [group]);
        const handleDeleteClick = useCallback(() => group?._id && handleDelete(group._id), [group?._id]);
        const handleSelect = useCallback(() => group && handleSelectGroup(group), [group]);

        const isPrimary = group.primaryGroup === 'Yes';

        return (
            <div
                style={{ ...style, display: 'flex', alignItems: 'center', height: '28px', minHeight: '28px', padding: '0', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                className={index % 2 === 0 ? 'ag-row-even' : 'ag-row-odd'}
                onDoubleClick={handleEditClick}
            >
                <div className="ag-cell ag-cell--sn">{index + 1}</div>
                <div className="ag-cell ag-cell--name" style={{ width: `${columnWidths.name}px`, flexShrink: 0 }} title={group.name}>
                    <span className="ag-item-name">{group.name}</span>
                </div>
                <div className="ag-cell ag-cell--primary" style={{ width: `${columnWidths.primaryGroup}px`, flexShrink: 0 }}>
                    <span className={`ag-primary-badge ag-primary-badge--${isPrimary ? 'yes' : 'no'}`}>
                        {group.primaryGroup || 'N/A'}
                    </span>
                </div>
                <div className="ag-cell ag-cell--type" style={{ width: `${columnWidths.type}px`, flexShrink: 0 }}>
                    <span className="ag-text-muted">{group.type || 'N/A'}</span>
                </div>
                <div className="ag-cell ag-cell--actions" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>
                    {isAdminOrSupervisor && (
                        <>
                            <button className="ag-btn-action ag-btn-action--edit" onClick={handleEditClick} title="Edit" disabled={!!currentGroup}>
                                <FiEdit2 size={12} />
                            </button>
                            <button className="ag-btn-action ag-btn-action--delete" onClick={handleDeleteClick} title="Delete" disabled={!!currentGroup}>
                                <FiTrash2 size={12} />
                            </button>
                        </>
                    )}
                    <button className="ag-btn-action ag-btn-action--select" onClick={handleSelect} title="Select">
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
                className="ag-resize-handle"
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
            primaryGroup: 100,
            type: 180,
            actions: 140
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

    const handleCancel = () => {
        setCurrentGroup(null);
        setFormData({ Name: '', Type: '', PrimaryGroup: '' });
    };

    const handleApiError = (error) => {
        let errorMessage = 'An error occurred';

        if (error.response) {
            switch (error.response.status) {
                case 400:
                    errorMessage = error.response.data?.error || 'Invalid request';
                    break;
                case 401:
                    errorMessage = 'Session expired. Please login again.';
                    return;
                case 403:
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

        if (name === 'PrimaryGroup' && value === 'No' && formData.Type === 'Primary') {
            setFormData(prev => ({
                ...prev,
                Type: ''
            }));
        }

        if (name === 'Name') {
            setSearchTerm(value.toLowerCase());
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        setIsSaving(true);

        try {
            const requestData = {
                Name: formData.Name.trim(),
                Type: formData.Type,
                PrimaryGroup: formData.PrimaryGroup
            };

            if (currentGroup) {
                const response = await api.put(`/api/retailer/account-group/${currentGroup._id}`, requestData);

                if (response.data?.success) {
                    showNotificationMessage('Account group updated successfully!', 'success');
                    fetchAccountGroups();
                    resetForm();
                } else {
                    showNotificationMessage(response.data?.error || 'Failed to update account group', 'error');
                }
            } else {
                const response = await api.post('/api/retailer/account-group', requestData);

                if (response.data?.success) {
                    showNotificationMessage('Account group created successfully!', 'success');
                    fetchAccountGroups();
                    resetForm();

                    setTimeout(() => {
                        if (accountGroupInputRef.current) {
                            accountGroupInputRef.current.focus();
                        }
                    }, 50);
                } else {
                    showNotificationMessage(response.data?.error || 'Failed to create account group', 'error');
                }
            }
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

    const printGroups = () => {
        let groupsToPrint = [...data.groups];

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
            .badge { padding: 2px 4px; border-radius: 3px; font-size: 7px; display: inline-block; }
            .badge-success { background-color: #28a745; color: white; }
            .badge-secondary { background-color: #6c757d; color: white; }
            .footer-note { margin-top: 10px; font-size: 7px; color: #666; text-align: center; }
            .text-center { text-align: center; }
        </style>
        ${printHeader}
        <div class="report-title">Account Groups Report</div>
        <div class="header-info">
            <strong>Fiscal Year:</strong> ${data.currentFiscalYear?.name || 'N/A'} | 
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
                </tr>
            </thead>
            <tbody>
    `;

        groupsToPrint.forEach((group, index) => {
            const primaryBadgeClass = group.primaryGroup === 'Yes' ? 'badge-success' : 'badge-secondary';

            tableContent += `
            <tr>
                <td class="nowrap">${index + 1}</td>
                <td class="nowrap">${escapeHtml(group.name || 'N/A')}</td>
                <td class="nowrap text-center"><span class="badge ${primaryBadgeClass}">${group.primaryGroup || 'N/A'}</span></td>
                <td class="nowrap">${escapeHtml(group.type || 'N/A')}</td>
            </tr>
        `;
        });

        const primaryGroupsCount = groupsToPrint.filter(g => g.primaryGroup === 'Yes').length;
        const nonPrimaryGroupsCount = groupsToPrint.filter(g => g.primaryGroup === 'No').length;

        tableContent += `
            </tbody>
            <tfoot>
                <tr class="grand-total-row">
                    <td colspan="2" class="nowrap"><strong>Summary</strong></td>
                    <td class="nowrap"><strong>Primary: ${primaryGroupsCount} | Non-Primary: ${nonPrimaryGroupsCount}</strong></td>
                    <td class="nowrap"><strong>Total: ${groupsToPrint.length}</strong></td>
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
                <title>Account Groups Report - ${data.company?.companyName || data.currentCompanyName || 'Account Groups Report'}</title>
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
            const groupsToExport = exportAll ? data.groups : filteredGroups;

            if (groupsToExport.length === 0) {
                showNotificationMessage('No account groups to export', 'warning');
                return;
            }

            const excelData = groupsToExport.map((group, index) => ({
                'S.N.': index + 1,
                'Group Name': group.name || 'N/A',
                'Primary Group': group.primaryGroup || 'N/A',
                'Group Type': group.type || 'N/A',
                'Created': group.createdAt ? new Date(group.createdAt).toLocaleDateString() : '',
                'Last Updated': group.updatedAt ? new Date(group.updatedAt).toLocaleDateString() : ''
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            XLSX.utils.book_append_sheet(wb, ws, 'Account Groups');

            const date = new Date().toISOString().split('T')[0];
            const fileName = `Account_Groups_Report_${exportAll ? 'All' : 'Filtered'}_${date}.xlsx`;

            XLSX.writeFile(wb, fileName);
            showNotificationMessage(`${exportAll ? 'All' : 'Filtered'} account groups (${groupsToExport.length}) exported successfully!`, 'success');

        } catch (err) {
            console.error('Error exporting to Excel:', err);
            showNotificationMessage('Failed to export to Excel', 'error');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="ag-container">
            <Header />
            <NotificationToast
                message={notificationMessage}
                type={notificationType}
                show={showNotification}
                onClose={() => setShowNotification(false)}
            />

            <div className="ag-main">
                {/* Left Column - Add Group Form */}
                <div className="ag-form-section">
                    <div className="ag-card ag-card--form">
                        <div className="ag-card-header">
                            <div className="ag-card-header-left">
                                <div className="ag-card-header-icon ag-card-header-icon--form">
                                    <FiFolder />
                                </div>
                                <div>
                                    <h5 className="ag-card-title">{currentGroup ? `Edit Group: ${currentGroup.name}` : 'Create Group'}</h5>
                                    <small className="ag-card-subtitle">
                                        {currentGroup ? 'Update existing group' : 'Add new account group'}
                                    </small>
                                </div>
                            </div>
                            {currentGroup && (
                                <button className="ag-btn-cancel" onClick={handleCancel} disabled={isSaving}>
                                    <FiX /> Cancel
                                </button>
                            )}
                        </div>

                        <div className="ag-card-body">
                            <form onSubmit={handleSubmit} id="addGroupForm">
                                <div className="ag-form-row">
                                    <div className="ag-form-group ag-form-group--third">
                                        <label className="ag-form-label">Group Name <span className="ag-required">*</span></label>
                                        <input
                                            ref={accountGroupInputRef}
                                            type="text"
                                            name="Name"
                                            className="ag-form-input"
                                            value={formData.Name}
                                            onChange={handleFormChange}
                                            placeholder="Enter group name"
                                            required
                                            autoFocus
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const primarySelect = document.querySelector('select[name="PrimaryGroup"]');
                                                    if (primarySelect) primarySelect.focus();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="ag-form-group ag-form-group--third">
                                        <label className="ag-form-label">Primary Group <span className="ag-required">*</span></label>
                                        <select
                                            name="PrimaryGroup"
                                            className="ag-form-select"
                                            value={formData.PrimaryGroup}
                                            onChange={handleFormChange}
                                            required
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const typeSelect = document.querySelector('select[name="Type"]');
                                                    if (typeSelect) typeSelect.focus();
                                                }
                                            }}
                                        >
                                            <option value="">Select Primary</option>
                                            {primaryGroup.map(primary => (
                                                <option key={primary} value={primary}>{primary}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="ag-form-group ag-form-group--third">
                                        <label className="ag-form-label">Group Type <span className="ag-required">*</span></label>
                                        <select
                                            name="Type"
                                            className="ag-form-select"
                                            value={formData.Type}
                                            onChange={handleFormChange}
                                            required
                                            disabled={filteredGroupTypes.length === 0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const submitButton = document.getElementById('submitGroupButton');
                                                    if (submitButton) submitButton.focus();
                                                }
                                            }}
                                        >
                                            <option value="">Select Type</option>
                                            {filteredGroupTypes.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="ag-form-row">
                                    <div className="ag-form-group ag-form-group--full">
                                        <div className="ag-form-actions ag-form-actions--right">
                                            <button
                                                id="submitGroupButton"
                                                type="submit"
                                                className="ag-btn-save"
                                                disabled={isSaving}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <span className="ag-spinner-small"></span>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiSave size={14} /> {currentGroup ? 'Update Group' : 'Add Group'}
                                                    </>
                                                )}
                                            </button>
                                            <small className="ag-shortcut-hint">Alt+S</small>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right Column - Existing Groups */}
                <div className="ag-list-section">
                    <div className="ag-card ag-card--list">
                        <div className="ag-card-header ag-card-header--list">
                            <div className="ag-card-header-left">
                                <div className="ag-card-header-icon ag-card-header-icon--list">
                                    <FiGrid />
                                </div>
                                <div>
                                    <h5 className="ag-card-title">Existing Groups</h5>
                                    <small className="ag-card-subtitle">
                                        {totalFilteredGroups} groups found
                                    </small>
                                </div>
                            </div>
                            <div className="ag-card-actions">
                                <button className="ag-btn-toolbar" onClick={() => navigate(-1)} title="Go back">
                                    <FiArrowLeft size={14} />
                                </button>
                                <button className="ag-btn-toolbar" onClick={() => setShowPrintModal(true)} title="Print report">
                                    <FiPrinter size={14} />
                                </button>
                                <button className="ag-btn-toolbar" onClick={() => exportToExcel(true)} disabled={exporting || data.groups.length === 0} title="Export to Excel">
                                    {exporting ? <span className="ag-spinner-small"></span> : <FiDownload size={14} />}
                                </button>
                                <button className="ag-btn-toolbar" onClick={resetColumnWidths} title="Reset column widths">
                                    <FiRefreshCw size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="ag-search-bar">
                            <div className="ag-search-wrapper">
                                <FiSearch className="ag-search-icon" />
                                <input
                                    type="text"
                                    className="ag-search-input"
                                    placeholder="Search groups by name, type or primary..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                                {searchTerm && (
                                    <button className="ag-search-clear" onClick={() => setSearchTerm('')}>
                                        <FiX size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="ag-table-wrapper" ref={tableContainerRef}>
                            {loading ? (
                                <div className="ag-loading">
                                    <div className="ag-spinner"></div>
                                    <p className="ag-loading-text">Loading account groups...</p>
                                </div>
                            ) : paginatedGroups.length === 0 ? (
                                <div className="ag-empty">
                                    <FiFolder className="ag-empty-icon" size={32} />
                                    <h6 className="ag-empty-title">No account groups found</h6>
                                    <p className="ag-empty-text">
                                        {searchTerm ? 'Try a different search term' : 'Create your first group using the form'}
                                    </p>
                                </div>
                            ) : (
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth = 50 + columnWidths.name + columnWidths.primaryGroup + columnWidths.type + columnWidths.actions;
                                        return (
                                            <div style={{ height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List
                                                    key={`groups-list-${paginatedGroups.length}-${currentPage}`}
                                                    height={height - 30}
                                                    itemCount={paginatedGroups.length}
                                                    itemSize={28}
                                                    width={Math.max(width, totalWidth)}
                                                    itemData={{
                                                        groups: paginatedGroups,
                                                        isAdminOrSupervisor: data.isAdminOrSupervisor
                                                    }}
                                                >
                                                    {TableRow}
                                                </List>
                                                {isLoadingMore && (
                                                    <div className="ag-loading-more">
                                                        <div className="ag-spinner-small"></div>
                                                        <span>Loading more groups...</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            )}
                        </div>

                        <div className="ag-table-footer">
                            <span className="ag-footer-info">
                                Showing {paginatedGroups.length} of {totalFilteredGroups} groups
                            </span>
                            {hasMoreItems && paginatedGroups.length < totalFilteredGroups && (
                                <button className="ag-btn-load-more" onClick={loadMoreItems} disabled={isLoadingMore}>
                                    Load more...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Options Modal */}
            <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} centered size="md">
                <Modal.Header closeButton className="ag-modal-header">
                    <div className="d-flex align-items-center">
                        <FiPrinter className="me-2" size={20} />
                        <div>
                            <span className="fw-bold fs-6">Print Account Groups Report</span>
                            <small className="d-block opacity-75">Select filter options</small>
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body className="p-3">
                    <div className="ag-print-options">
                        <h6 className="ag-print-options-title">Filter Options</h6>
                        <div className="ag-print-options-grid">
                            <button className={`ag-print-option ${printOption === 'all' ? 'ag-print-option--active' : ''}`} onClick={() => setPrintOption('all')}>
                                All Groups
                            </button>
                            <button className={`ag-print-option ${printOption === 'type' ? 'ag-print-option--active' : ''}`} onClick={() => setPrintOption('type')}>
                                By Group Type
                            </button>
                        </div>

                        {printOption === 'type' && (
                            <div className="ag-print-filter">
                                <label className="ag-form-label small fw-semibold">Select Group Type</label>
                                <select
                                    className="ag-form-select"
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                >
                                    <option value="">All Types</option>
                                    {groupTypes.map(type => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="ag-print-summary">
                            <h6 className="ag-print-options-title">Report Summary</h6>
                            <div className="ag-print-stats">
                                <div className="ag-print-stat">
                                    <span className="ag-print-stat-label">Total Groups</span>
                                    <span className="ag-print-stat-value">{data.groups.length}</span>
                                </div>
                                <div className="ag-print-stat">
                                    <span className="ag-print-stat-label ag-print-stat-label--success">Primary</span>
                                    <span className="ag-print-stat-value ag-print-stat-value--success">
                                        {data.groups.filter(g => g.primaryGroup === 'Yes').length}
                                    </span>
                                </div>
                                <div className="ag-print-stat">
                                    <span className="ag-print-stat-label ag-print-stat-label--info">Non-Primary</span>
                                    <span className="ag-print-stat-value ag-print-stat-value--info">
                                        {data.groups.filter(g => g.primaryGroup === 'No').length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="py-2">
                    <button className="ag-btn-secondary" onClick={() => setShowPrintModal(false)}>Cancel</button>
                    <button className="ag-btn-primary" onClick={() => { printGroups(); setShowPrintModal(false); }}>
                        <FiPrinter className="me-1" /> Print Report
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Save Confirmation Modal */}
            <Modal show={showSaveConfirmModal} onHide={() => setShowSaveConfirmModal(false)} centered>
                <Modal.Header closeButton className="ag-modal-header">
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
                    <button className="ag-btn-secondary" onClick={() => setShowSaveConfirmModal(false)}>Cancel</button>
                    <button className="ag-btn-primary" onClick={() => { handleSubmit(); setShowSaveConfirmModal(false); }}>
                        {currentGroup ? 'Update Group' : 'Create Group'}
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Product Modal */}
            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
        </div>
    );
};

export default AccountGroups;