import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiEdit2,
    FiTrash2,
    FiPrinter,
    FiArrowLeft,
    FiX,
    FiCheck,
    FiRefreshCw,
    FiSearch,
    FiGrid,
    FiDownload,
    FiSave,
    FiHash
} from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Modal from 'react-bootstrap/Modal';
import Header from '../retailer/Header';
import NotificationToast from '../NotificationToast';
import ProductModal from './dashboard/modals/ProductModal';
import * as XLSX from 'xlsx';
import './Units.css';
import api, { refreshToken } from '../services/api';
import { usePageNotRefreshContext } from '../retailer/PageNotRefreshContext';

const Units = () => {
    const [exporting, setExporting] = useState(false);
    const navigate = useNavigate();
    const {
        unitsSearchDraftSave,
        setUnitsSearchDraftSave,
        clearUnitsSearchDraft
    } = usePageNotRefreshContext();

    const [data, setData] = useState({
        units: [],
        company: null,
        currentFiscalYear: null,
        companyId: '',
        currentCompanyName: '',
        user: null,
        theme: 'light',
        isAdminOrSupervisor: false
    });
    const [loading, setLoading] = useState(true);
    // const [searchTerm, setSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState(
        unitsSearchDraftSave?.searchTerm || ''
    );
    const [currentUnit, setCurrentUnit] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('');
    const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [printOption, setPrintOption] = useState('all');
    const unitNameRef = useRef(null);

    // Pagination state
    const [paginatedUnits, setPaginatedUnits] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreItems, setHasMoreItems] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalFilteredUnits, setTotalFilteredUnits] = useState(0);
    const tableContainerRef = useRef(null);

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        name: 350,
        status: 100,
        code: 100,
        actions: 140
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const showNotificationMessage = (message, type) => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    useEffect(() => {
        fetchUnits();
    }, []);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('unitsTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('unitsTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    useEffect(() => {
        setUnitsSearchDraftSave({
            searchTerm,
            timestamp: Date.now(),
        });
    }, [searchTerm, setUnitsSearchDraftSave]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                setShowSaveConfirmModal(true);
            }
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Filtered units
    const filteredUnits = useMemo(() => {
        return (data.units || [])
            .filter(unit =>
                unit?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [data.units, searchTerm]);

    const processedFilteredUnits = useMemo(() => {
        return filteredUnits.map(unit => ({
            ...unit,
            _id: unit.id || unit._id
        }));
    }, [filteredUnits]);

    // Pagination
    const paginateUnits = useCallback((unitsList, pageNum, itemsPerPage = 25) => {
        const actualLimit = pageNum === 1 ? 15 : 15 + ((pageNum - 1) * itemsPerPage);
        return unitsList.slice(0, actualLimit);
    }, []);

    useEffect(() => {
        const initialUnits = paginateUnits(processedFilteredUnits, 1);
        setPaginatedUnits(initialUnits);
        setCurrentPage(1);
        setHasMoreItems(processedFilteredUnits.length > initialUnits.length);
        setTotalFilteredUnits(processedFilteredUnits.length);
    }, [processedFilteredUnits, paginateUnits]);

    const loadMoreItems = useCallback(() => {
        if (!hasMoreItems || isLoadingMore) return;
        setIsLoadingMore(true);

        setTimeout(() => {
            const nextPage = currentPage + 1;
            const itemsPerPage = 25;
            const newLimit = nextPage === 1 ? 15 : 15 + ((nextPage - 1) * itemsPerPage);
            const newPaginatedUnits = processedFilteredUnits.slice(0, newLimit);

            if (newPaginatedUnits.length === paginatedUnits.length) {
                setHasMoreItems(false);
            } else {
                setPaginatedUnits(newPaginatedUnits);
                setCurrentPage(nextPage);
            }
            setIsLoadingMore(false);
        }, 100);
    }, [hasMoreItems, isLoadingMore, currentPage, processedFilteredUnits, paginatedUnits]);

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

    // Resizable Table Header
    const TableHeader = React.memo(() => {
        const totalWidth = 50 + columnWidths.name + columnWidths.status + columnWidths.code + columnWidths.actions;

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="un-header"
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
                <div className="un-header-cell un-header-cell--sn">S.N.</div>
                <div className="un-header-cell un-header-cell--resizable" style={{ width: `${columnWidths.name}px`, minWidth: '100px' }}>
                    Unit Name
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="name" />
                </div>
                <div className="un-header-cell un-header-cell--resizable" style={{ width: `${columnWidths.status}px`, minWidth: '60px' }}>
                    Status
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="status" />
                </div>
                <div className="un-header-cell" style={{ width: `${columnWidths.actions}px`, minWidth: '120px', textAlign: 'center' }}>
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
        const { units, isAdminOrSupervisor } = data;
        const unit = units[index];

        if (!unit) return null;

        const handleEditClick = useCallback(() => unit && handleEdit(unit), [unit]);
        const handleDeleteClick = useCallback(() => {
            const unitId = unit.id || unit._id;
            if (unitId) handleDelete(unitId);
        }, [unit]);
        const handleSelect = useCallback(() => unit && handleSelectUnit(unit), [unit]);

        const unitName = unit.name || 'N/A';
        const isActive = unit.status === 'active';

        return (
            <div
                style={{ ...style, display: 'flex', alignItems: 'center', height: '28px', minHeight: '28px', padding: '0', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                className={index % 2 === 0 ? 'un-row-even' : 'un-row-odd'}
            >
                <div className="un-cell un-cell--sn">{index + 1}</div>
                <div className="un-cell un-cell--name" style={{ width: `${columnWidths.name}px`, flexShrink: 0 }} title={unitName}>
                    <span className="un-item-name">{unitName}</span>
                </div>
                <div className="un-cell un-cell--status" style={{ width: `${columnWidths.status}px`, flexShrink: 0 }}>
                    <span className={`un-status-badge un-status-badge--${isActive ? 'active' : 'inactive'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div className="un-cell un-cell--actions" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>
                    {isAdminOrSupervisor && (
                        <>
                            <button className="un-btn-action un-btn-action--edit" onClick={handleEditClick} title="Edit" disabled={!!currentUnit}>
                                <FiEdit2 size={12} />
                            </button>
                            <button className="un-btn-action un-btn-action--delete" onClick={handleDeleteClick} title="Delete" disabled={!!currentUnit}>
                                <FiTrash2 size={12} />
                            </button>
                        </>
                    )}
                    <button className="un-btn-action un-btn-action--select" onClick={handleSelect} title="Select">
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
                className="un-resize-handle"
                onMouseDown={(e) => {
                    e.preventDefault();
                    onResizeStart(e, columnName);
                }}
            />
        );
    });

    const resetColumnWidths = () => {
        setColumnWidths({
            name: 350,
            status: 100,
            code: 100,
            actions: 140
        });
        showNotificationMessage('Column widths reset to default', 'success');
    };

    const fetchUnits = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/retailer/units');

            if (response.data.redirectTo) {
                navigate(response.data.redirectTo);
                return;
            }

            if (response.data.success) {
                const apiData = response.data.data;
                setData({
                    units: apiData.units || [],
                    company: apiData.company || null,
                    currentFiscalYear: apiData.currentFiscalYear || null,
                    companyId: apiData.companyId || '',
                    currentCompanyName: apiData.currentCompanyName || '',
                    user: apiData.user || null,
                    theme: apiData.theme || 'light',
                    isAdminOrSupervisor: apiData.isAdminOrSupervisor || false
                });
            } else {
                throw new Error(response.data.error || 'Failed to fetch units');
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApiError = (error) => {
        let errorMessage = 'An error occurred';

        if (error.response) {
            switch (error.response.status) {
                case 400:
                    if (error.response.data.error === 'No fiscal year found for company') {
                        navigate('/select-fiscal-year');
                        return;
                    }
                    if (error.response.data.error === 'No company selected. Please select a company first.') {
                        navigate('/user-dashboard');
                        return;
                    }
                    errorMessage = error.response.data.error || 'Invalid request';
                    break;
                case 401:
                    navigate('/login');
                    return;
                case 403:
                    navigate('/dashboard');
                    return;
                case 404:
                    errorMessage = error.response.data.error || 'Resource not found';
                    break;
                case 409:
                    errorMessage = error.response.data.error || 'Unit already exists or cannot be deleted';
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

    const handleEdit = (unit) => {
        setCurrentUnit(unit);
        setFormData({
            name: unit.name,
        });
    };

    const handleSelectUnit = (unit) => {
        setFormData({
            name: unit.name,
        });
    };

    const handleCancel = () => {
        setCurrentUnit(null);
        setFormData({
            name: '',
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this unit?')) {
            try {
                const response = await api.delete(`/api/retailer/units/${id}`);

                if (response.data.success) {
                    showNotificationMessage('Unit deleted successfully', 'success');
                    fetchUnits();
                } else {
                    showNotificationMessage(response.data.error || 'Failed to delete unit', 'error');
                }
            } catch (err) {
                if (err.response && err.response.status === 409) {
                    showNotificationMessage(err.response.data.error || 'Unit cannot be deleted as it is being used by items', 'error');
                } else {
                    handleApiError(err);
                }
            }
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'name') {
            setSearchTerm(value.toLowerCase());
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!formData.name.trim()) {
            showNotificationMessage('Unit name is required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            if (currentUnit) {
                const updateData = { name: formData.name };
                const response = await api.put(`/api/retailer/units/${currentUnit.id || currentUnit._id}`, updateData);

                if (response.data.success) {
                    showNotificationMessage('Unit updated successfully!', 'success');
                    handleCancel();
                } else {
                    throw new Error(response.data.error || 'Failed to update unit');
                }
            } else {
                const response = await api.post('/api/retailer/units', { name: formData.name });

                if (response.data.success) {
                    showNotificationMessage('Unit created successfully!', 'success');
                    setFormData({
                        name: '',
                    });
                    setTimeout(() => {
                        if (unitNameRef.current) {
                            unitNameRef.current.focus();
                        }
                    }, 50);
                } else {
                    throw new Error(response.data.error || 'Failed to create unit');
                }
            }
            fetchUnits();
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsSaving(false);
        }
    };

    const printUnits = () => {
        const unitsToPrint = printOption === 'all'
            ? data.units
            : data.units.filter(unit => unit.status === 'active');

        if (unitsToPrint.length === 0) {
            alert("No units to print");
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
            </style>
            ${printHeader}
            <div class="report-title">Units Report</div>
            <div class="header-info">
                <strong>Fiscal Year:</strong> ${data.currentFiscalYear?.name || 'N/A'} | 
                <strong>Total Units:</strong> ${unitsToPrint.length}
            </div>
            <div class="filter-info">
                ${printOption !== 'all' ? `<strong>Filter:</strong> Active Only | ` : ''}
                <strong>Printed on:</strong> ${new Date().toLocaleDateString()}
            </div>
            <table>
                <thead>
                    <tr>
                        <th class="nowrap">S.N.</th>
                        <th class="nowrap">Unit Name</th>
                        <th class="nowrap">Status</th>
                        <th class="nowrap">Code</th>
                    </tr>
                </thead>
                <tbody>
        `;

        unitsToPrint.forEach((unit, index) => {
            const statusClass = unit.status === 'active' ? 'badge-success' : 'badge-secondary';
            const statusText = unit.status === 'active' ? 'Active' : (unit.status || 'N/A');

            tableContent += `
                <tr>
                    <td class="nowrap">${index + 1}</td>
                    <td class="nowrap">${unit.name || 'N/A'}</td>
                    <td class="nowrap"><span class="badge ${statusClass}">${statusText}</span></td>
                    <td class="nowrap">${unit.uniqueNumber || 'N/A'}</td>
                </tr>
            `;
        });

        tableContent += `
                </tbody>
            </table>
            <div class="footer-note">
                ${data.company?.companyName ? `© ${new Date().getFullYear()} ${data.company.companyName}` : ''}
            </div>
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Units Report - ${data.company?.companyName || data.currentCompanyName || 'Units Report'}</title>
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
            const unitsToExport = exportAll ? data.units : filteredUnits;

            if (unitsToExport.length === 0) {
                showNotificationMessage('No units to export', 'warning');
                return;
            }

            const excelData = unitsToExport.map((unit, index) => ({
                'S.N.': index + 1,
                'Unit Name': unit.name || 'N/A',
                'Status': unit.status || 'N/A',
                'Code': unit.uniqueNumber || '',
                'Created': unit.createdAt ? new Date(unit.createdAt).toLocaleDateString() : '',
                'Last Updated': unit.updatedAt ? new Date(unit.updatedAt).toLocaleDateString() : ''
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            XLSX.utils.book_append_sheet(wb, ws, 'Units');

            const date = new Date().toISOString().split('T')[0];
            const fileName = `Units_Report_${exportAll ? 'All' : 'Filtered'}_${date}.xlsx`;

            XLSX.writeFile(wb, fileName);
            showNotificationMessage(`${exportAll ? 'All' : 'Filtered'} units (${unitsToExport.length}) exported successfully!`, 'success');

        } catch (err) {
            console.error('Error exporting to Excel:', err);
            showNotificationMessage('Failed to export to Excel', 'error');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="un-container">
            <Header />
            <NotificationToast
                message={notificationMessage}
                type={notificationType}
                show={showNotification}
                onClose={() => setShowNotification(false)}
            />

            <div className="un-main">
                {/* Left Column - Add Unit Form */}
                <div className="un-form-section">
                    <div className="un-card un-card--form">
                        <div className="un-card-header">
                            <div className="un-card-header-left">
                                <div className="un-card-header-icon un-card-header-icon--form">
                                    <FiHash />
                                </div>
                                <div>
                                    <h5 className="un-card-title">{currentUnit ? `Edit Unit: ${currentUnit.name}` : 'Create Unit'}</h5>
                                    <small className="un-card-subtitle">
                                        {currentUnit ? 'Update existing unit' : 'Add new unit'}
                                    </small>
                                </div>
                            </div>
                            {currentUnit && (
                                <button className="un-btn-cancel" onClick={handleCancel} disabled={isSaving}>
                                    <FiX /> Cancel
                                </button>
                            )}
                        </div>

                        <div className="un-card-body">
                            <form onSubmit={handleSubmit} id="addUnitForm">
                                <div className="un-form-row">
                                    <div className="un-form-group un-form-group--full">
                                        <label className="un-form-label">Unit Name <span className="un-required">*</span></label>
                                        <input
                                            ref={unitNameRef}
                                            type="text"
                                            name="name"
                                            className="un-form-input"
                                            value={formData.name}
                                            onChange={handleFormChange}
                                            placeholder="Enter unit name"
                                            required
                                            autoFocus
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const submitButton = document.getElementById('submitUnitButton');
                                                    if (submitButton) {
                                                        submitButton.focus();
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="un-form-row">
                                    <div className="un-form-group un-form-group--full">
                                        <div className="un-form-actions un-form-actions--right">
                                            <button
                                                id="submitUnitButton"
                                                type="submit"
                                                className="un-btn-save"
                                                disabled={isSaving}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <span className="un-spinner-small"></span>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiSave size={14} /> {currentUnit ? 'Update Unit' : 'Add Unit'}
                                                    </>
                                                )}
                                            </button>
                                            <small className="un-shortcut-hint">Alt+S</small>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right Column - Existing Units */}
                <div className="un-list-section">
                    <div className="un-card un-card--list">
                        <div className="un-card-header un-card-header--list">
                            <div className="un-card-header-left">
                                <div className="un-card-header-icon un-card-header-icon--list">
                                    <FiGrid />
                                </div>
                                <div>
                                    <h5 className="un-card-title">Existing Units</h5>
                                    <small className="un-card-subtitle">
                                        {totalFilteredUnits} units found
                                    </small>
                                </div>
                            </div>
                            <div className="un-card-actions">
                                <button className="un-btn-toolbar" onClick={() => navigate(-1)} title="Go back">
                                    <FiArrowLeft size={14} />
                                </button>
                                <button className="un-btn-toolbar" onClick={() => setShowPrintModal(true)} title="Print report">
                                    <FiPrinter size={14} />
                                </button>
                                <button className="un-btn-toolbar" onClick={() => exportToExcel(true)} disabled={exporting || (data.units || []).length === 0} title="Export to Excel">
                                    {exporting ? <span className="un-spinner-small"></span> : <FiDownload size={14} />}
                                </button>
                                <button className="un-btn-toolbar" onClick={resetColumnWidths} title="Reset column widths">
                                    <FiRefreshCw size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="un-search-bar">
                            <div className="un-search-wrapper">
                                <FiSearch className="un-search-icon" />
                                <input
                                    type="text"
                                    className="un-search-input"
                                    placeholder="Search units by name..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                                {searchTerm && (
                                    <button className="un-search-clear" onClick={() => setSearchTerm('')}>
                                        <FiX size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="un-table-wrapper" ref={tableContainerRef}>
                            {loading ? (
                                <div className="un-loading">
                                    <div className="un-spinner"></div>
                                    <p className="un-loading-text">Loading units...</p>
                                </div>
                            ) : paginatedUnits.length === 0 ? (
                                <div className="un-empty">
                                    <FiHash className="un-empty-icon" size={32} />
                                    <h6 className="un-empty-title">No units found</h6>
                                    <p className="un-empty-text">
                                        {searchTerm ? 'Try a different search term' : 'Create your first unit using the form'}
                                    </p>
                                </div>
                            ) : (
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth = 50 + columnWidths.name + columnWidths.status + columnWidths.code + columnWidths.actions;
                                        return (
                                            <div style={{ height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List
                                                    key={`units-list-${paginatedUnits.length}-${currentPage}`}
                                                    height={height - 30}
                                                    itemCount={paginatedUnits.length}
                                                    itemSize={28}
                                                    width={Math.max(width, totalWidth)}
                                                    itemData={{
                                                        units: paginatedUnits,
                                                        isAdminOrSupervisor: data.isAdminOrSupervisor
                                                    }}
                                                >
                                                    {TableRow}
                                                </List>
                                                {isLoadingMore && (
                                                    <div className="un-loading-more">
                                                        <div className="un-spinner-small"></div>
                                                        <span>Loading more units...</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            )}
                        </div>

                        <div className="un-table-footer">
                            <span className="un-footer-info">
                                Showing {paginatedUnits.length} of {totalFilteredUnits} units
                            </span>
                            {hasMoreItems && paginatedUnits.length < totalFilteredUnits && (
                                <button className="un-btn-load-more" onClick={loadMoreItems} disabled={isLoadingMore}>
                                    Load more...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Options Modal */}
            <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} centered size="md">
                <Modal.Header closeButton className="un-modal-header">
                    <div className="d-flex align-items-center">
                        <FiPrinter className="me-2" size={20} />
                        <div>
                            <span className="fw-bold fs-6">Print Units Report</span>
                            <small className="d-block opacity-75">Select filter options</small>
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body className="p-3">
                    <div className="un-print-options">
                        <h6 className="un-print-options-title">Filter Options</h6>
                        <div className="un-print-options-grid">
                            <button className={`un-print-option ${printOption === 'all' ? 'un-print-option--active' : ''}`} onClick={() => setPrintOption('all')}>
                                All Units
                            </button>
                            <button className={`un-print-option ${printOption === 'active' ? 'un-print-option--active' : ''}`} onClick={() => setPrintOption('active')}>
                                Active Only
                            </button>
                        </div>

                        <div className="un-print-summary">
                            <h6 className="un-print-options-title">Report Summary</h6>
                            <div className="un-print-stats">
                                <div className="un-print-stat">
                                    <span className="un-print-stat-label">Total Units</span>
                                    <span className="un-print-stat-value">{(data.units || []).length}</span>
                                </div>
                                <div className="un-print-stat">
                                    <span className="un-print-stat-label un-print-stat-label--success">Active</span>
                                    <span className="un-print-stat-value un-print-stat-value--success">
                                        {(data.units || []).filter(unit => unit.status === 'active').length}
                                    </span>
                                </div>
                                <div className="un-print-stat">
                                    <span className="un-print-stat-label un-print-stat-label--danger">Inactive</span>
                                    <span className="un-print-stat-value un-print-stat-value--danger">
                                        {(data.units || []).filter(unit => unit.status !== 'active').length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="py-2">
                    <button className="un-btn-secondary" onClick={() => setShowPrintModal(false)}>Cancel</button>
                    <button className="un-btn-primary" onClick={() => { printUnits(); setShowPrintModal(false); }}>
                        <FiPrinter className="me-1" /> Print Report
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Save Confirmation Modal */}
            <Modal show={showSaveConfirmModal} onHide={() => setShowSaveConfirmModal(false)} centered>
                <Modal.Header closeButton className="un-modal-header">
                    <Modal.Title>Confirm Save</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to save this unit?</p>
                    {currentUnit && (
                        <div className="alert alert-warning small">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            This will update the existing unit: <strong>{currentUnit.name}</strong>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className="un-btn-secondary" onClick={() => setShowSaveConfirmModal(false)}>Cancel</button>
                    <button className="un-btn-primary" onClick={() => { handleSubmit(); setShowSaveConfirmModal(false); }}>
                        {currentUnit ? 'Update Unit' : 'Create Unit'}
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Product Modal */}
            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
        </div>
    );
};

export default Units;