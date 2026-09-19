import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiPrinter, FiArrowLeft, FiX, FiCheck, FiRefreshCw, FiSearch, FiGrid, FiTag, FiDownload, FiSave } from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Modal from 'react-bootstrap/Modal';
import Header from '../retailer/Header';
import NotificationToast from '../NotificationToast';
import ProductModal from './dashboard/modals/ProductModal';
import * as XLSX from 'xlsx';
import './Categories.css';
import api, { refreshToken } from '../services/api';
import { usePageNotRefreshContext } from '../retailer/PageNotRefreshContext';

const Categories = () => {
    const [exporting, setExporting] = useState(false);
    const navigate = useNavigate();
    const {
        categoriesSearchDraftSave,
        setCategoriesSearchDraftSave,
        clearCategoriesSearchDraft
    } = usePageNotRefreshContext();
    const [data, setData] = useState({
        categories: [],
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
        categoriesSearchDraftSave?.searchTerm || ''
    );
    const [currentCategory, setCurrentCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        companyId: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('');
    const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [printOption, setPrintOption] = useState('all');
    const categoryNameRef = useRef(null);

    // Pagination state
    const [paginatedCategories, setPaginatedCategories] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreItems, setHasMoreItems] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalFilteredCategories, setTotalFilteredCategories] = useState(0);
    const tableContainerRef = useRef(null);

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        name: 300,
        status: 100,
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
        fetchCategories();
    }, []);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('categoriesTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('categoriesTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    useEffect(() => {
        setCategoriesSearchDraftSave({
            searchTerm,
            timestamp: Date.now(),
        });
    }, [searchTerm, setCategoriesSearchDraftSave]);

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

    // Filtered categories
    const filteredCategories = useMemo(() => {
        return data.categories
            .filter(category =>
                category.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [data.categories, searchTerm]);

    const processedFilteredCategories = useMemo(() => {
        return filteredCategories.map(category => ({
            ...category,
            _id: category.id || category._id
        }));
    }, [filteredCategories]);

    // Pagination
    const paginateCategories = useCallback((categoriesList, pageNum, itemsPerPage = 25) => {
        const actualLimit = pageNum === 1 ? 15 : 15 + ((pageNum - 1) * itemsPerPage);
        return categoriesList.slice(0, actualLimit);
    }, []);

    useEffect(() => {
        const initialCategories = paginateCategories(processedFilteredCategories, 1);
        setPaginatedCategories(initialCategories);
        setCurrentPage(1);
        setHasMoreItems(processedFilteredCategories.length > initialCategories.length);
        setTotalFilteredCategories(processedFilteredCategories.length);
    }, [processedFilteredCategories, paginateCategories]);

    const loadMoreItems = useCallback(() => {
        if (!hasMoreItems || isLoadingMore) return;
        setIsLoadingMore(true);

        setTimeout(() => {
            const nextPage = currentPage + 1;
            const itemsPerPage = 25;
            const newLimit = nextPage === 1 ? 15 : 15 + ((nextPage - 1) * itemsPerPage);
            const newPaginatedCategories = processedFilteredCategories.slice(0, newLimit);

            if (newPaginatedCategories.length === paginatedCategories.length) {
                setHasMoreItems(false);
            } else {
                setPaginatedCategories(newPaginatedCategories);
                setCurrentPage(nextPage);
            }
            setIsLoadingMore(false);
        }, 100);
    }, [hasMoreItems, isLoadingMore, currentPage, processedFilteredCategories, paginatedCategories]);

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
        const totalWidth = 50 + columnWidths.name + columnWidths.status + columnWidths.actions;

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="cat-header"
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
                <div className="cat-header-cell cat-header-cell--sn">S.N.</div>
                <div className="cat-header-cell cat-header-cell--resizable" style={{ width: `${columnWidths.name}px`, minWidth: '100px' }}>
                    Category Name
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="name" />
                </div>
                <div className="cat-header-cell cat-header-cell--resizable" style={{ width: `${columnWidths.status}px`, minWidth: '60px' }}>
                    Status
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="status" />
                </div>
                <div className="cat-header-cell" style={{ width: `${columnWidths.actions}px`, minWidth: '120px', textAlign: 'center' }}>
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
        const { categories, isAdminOrSupervisor } = data;
        const category = categories[index];

        if (!category) return null;

        const handleEditClick = useCallback(() => category && handleEdit(category), [category]);
        const handleDeleteClick = useCallback(() => category?._id && handleDelete(category._id), [category?._id]);
        const handleSelect = useCallback(() => category && handleSelectCategory(category), [category]);

        const categoryId = category.id || category._id;
        const categoryName = category.name || 'N/A';
        const isDefault = category.name === 'General';
        const isActive = category.status === 'active';

        return (
            <div
                style={{ ...style, display: 'flex', alignItems: 'center', height: '28px', minHeight: '28px', padding: '0', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                className={index % 2 === 0 ? 'cat-row-even' : 'cat-row-odd'}
            >
                <div className="cat-cell cat-cell--sn">{index + 1}</div>
                <div className="cat-cell cat-cell--name" style={{ width: `${columnWidths.name}px`, flexShrink: 0 }} title={categoryName}>
                    <span className="cat-item-name">{categoryName}</span>
                    {isDefault && <span className="cat-badge cat-badge--default">Default</span>}
                </div>
                <div className="cat-cell cat-cell--status" style={{ width: `${columnWidths.status}px`, flexShrink: 0 }}>
                    <span className={`cat-status-badge cat-status-badge--${isActive ? 'active' : 'inactive'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div className="cat-cell cat-cell--actions" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>
                    {isAdminOrSupervisor && !isDefault && (
                        <>
                            <button className="cat-btn-action cat-btn-action--edit" onClick={handleEditClick} title="Edit" disabled={!!currentCategory}>
                                <FiEdit2 size={12} />
                            </button>
                            <button className="cat-btn-action cat-btn-action--delete" onClick={handleDeleteClick} title="Delete" disabled={!!currentCategory}>
                                <FiTrash2 size={12} />
                            </button>
                        </>
                    )}
                    <button className="cat-btn-action cat-btn-action--select" onClick={handleSelect} title="Select">
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
                className="cat-resize-handle"
                onMouseDown={(e) => {
                    e.preventDefault();
                    onResizeStart(e, columnName);
                }}
            />
        );
    });

    const resetColumnWidths = () => {
        setColumnWidths({
            name: 300,
            status: 100,
            actions: 140
        });
        showNotificationMessage('Column widths reset to default', 'success');
    };

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/retailer/categories');

            if (response.data.redirectTo) {
                navigate(response.data.redirectTo);
                return;
            }

            if (response.data.success) {
                const apiData = response.data.data;
                setData({
                    categories: apiData.categories || [],
                    company: apiData.company || null,
                    currentFiscalYear: apiData.currentFiscalYear || null,
                    companyId: apiData.companyId || '',
                    currentCompanyName: apiData.currentCompanyName || '',
                    user: apiData.user || null,
                    theme: apiData.theme || 'light',
                    isAdminOrSupervisor: apiData.isAdminOrSupervisor || false
                });

                if (apiData.companyId) {
                    setFormData(prev => ({ ...prev, companyId: apiData.companyId }));
                }
            } else {
                throw new Error(response.data.error || 'Failed to fetch categories');
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
                    errorMessage = error.response.data.error || 'Category already exists';
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

    const handleEdit = (category) => {
        setCurrentCategory(category);
        setFormData({
            name: category.name,
            companyId: category.companyId || data.companyId
        });
    };

    const handleSelectCategory = (category) => {
        setFormData({
            name: category.name,
        });
    };

    const handleCancel = () => {
        setCurrentCategory(null);
        setFormData({
            name: '',
            companyId: data.companyId
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                const response = await api.delete(`/api/retailer/categories/${id}`);

                if (response.data.success) {
                    showNotificationMessage('Category deleted successfully', 'success');
                    fetchCategories();
                } else {
                    showNotificationMessage(response.data.error || 'Failed to delete category', 'error');
                }
            } catch (err) {
                if (err.response && err.response.status === 400) {
                    showNotificationMessage(err.response.data.error || 'Category cannot be deleted as it has related items', 'error');
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
            showNotificationMessage('Category name is required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            if (currentCategory) {
                const updateData = { name: formData.name };
                const response = await api.put(`/api/retailer/categories/${currentCategory.id || currentCategory._id}`, updateData);

                if (response.data.success) {
                    showNotificationMessage('Category updated successfully!', 'success');
                    handleCancel();
                } else {
                    throw new Error(response.data.error || 'Failed to update category');
                }
            } else {
                const createData = {
                    name: formData.name,
                    companyId: formData.companyId
                };
                const response = await api.post('/api/retailer/categories', createData);

                if (response.data.success) {
                    showNotificationMessage('Category created successfully!', 'success');
                    setFormData({
                        name: '',
                        companyId: data.companyId
                    });
                    setTimeout(() => {
                        if (categoryNameRef.current) {
                            categoryNameRef.current.focus();
                        }
                    }, 50);
                } else {
                    throw new Error(response.data.error || 'Failed to create category');
                }
            }
            fetchCategories();
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsSaving(false);
        }
    };

    const printCategories = () => {
        let categoriesToPrint = [...data.categories];

        if (printOption === 'active') {
            categoriesToPrint = categoriesToPrint.filter(cat => cat.status === 'active');
        }

        if (categoriesToPrint.length === 0) {
            alert("No categories to print");
            return;
        }

        const printWindow = window.open("", "_blank");

        const printHeader = `
        <div class="print-header">
            <h1 style="font-size: 14px; margin: 0;">${data.company?.name || data.currentCompanyName || 'Company Name'}</h1>
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
        </style>
        ${printHeader}
        <div class="report-title">Categories Report</div>
        <div class="header-info">
            <strong>Fiscal Year:</strong> ${data.currentFiscalYear?.name || 'N/A'} | 
            <strong>Total Categories:</strong> ${categoriesToPrint.length}
        </div>
        <div class="filter-info">
            ${printOption !== 'all' ? `<strong>Filter:</strong> Active Only | ` : ''}
            <strong>Printed on:</strong> ${new Date().toLocaleDateString()}
        </div>
        <table>
            <thead>
                <tr>
                    <th class="nowrap">S.N.</th>
                    <th class="nowrap">Category Name</th>
                    <th class="nowrap">Status</th>
                    <th class="nowrap">Total Items</th>
                </tr>
            </thead>
            <tbody>
    `;

        categoriesToPrint.forEach((category, index) => {
            const statusClass = category.status === 'active' ? 'badge-success' : 'badge-secondary';
            const statusText = category.status === 'active' ? 'Active' : (category.status || 'N/A');

            tableContent += `
            <tr>
                <td class="nowrap">${index + 1}</td>
                <td class="nowrap">${category.name || 'N/A'}</td>
                <td class="nowrap"><span class="badge ${statusClass}">${statusText}</span></td>
                <td class="nowrap text-end">${category.itemCount || 0}</td>
            </tr>
        `;
        });

        tableContent += `
            </tbody>
        </table>
        <div class="footer-note" style="margin-top: 10px; font-size: 7px; color: #666; text-align: center;">
            ${data.company?.name ? `© ${new Date().getFullYear()} ${data.company.name}` : ''}
        </div>
    `;

        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Categories Report - ${data.company?.name || data.currentCompanyName || 'Categories Report'}</title>
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
            const categoriesToExport = exportAll ? data.categories : filteredCategories;

            if (categoriesToExport.length === 0) {
                showNotificationMessage('No categories to export', 'warning');
                return;
            }

            const excelData = categoriesToExport.map((category, index) => ({
                'S.N.': index + 1,
                'Category Name': category.name || 'N/A',
                'Status': category.status || 'N/A',
                'Total Items': category.itemCount || 0,
                'Created': category.createdAt ? new Date(category.createdAt).toLocaleDateString() : '',
                'Last Updated': category.updatedAt ? new Date(category.updatedAt).toLocaleDateString() : ''
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            XLSX.utils.book_append_sheet(wb, ws, 'Categories');

            const date = new Date().toISOString().split('T')[0];
            const fileName = `Categories_Report_${exportAll ? 'All' : 'Filtered'}_${date}.xlsx`;

            XLSX.writeFile(wb, fileName);
            showNotificationMessage(`${exportAll ? 'All' : 'Filtered'} categories (${categoriesToExport.length}) exported successfully!`, 'success');

        } catch (err) {
            console.error('Error exporting to Excel:', err);
            showNotificationMessage('Failed to export to Excel', 'error');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="cat-container">
            <Header />
            <NotificationToast
                message={notificationMessage}
                type={notificationType}
                show={showNotification}
                onClose={() => setShowNotification(false)}
            />

            <div className="cat-main">
                {/* Left Column - Add Category Form */}
                <div className="cat-form-section">
                    <div className="cat-card cat-card--form">
                        <div className="cat-card-header">
                            <div className="cat-card-header-left">
                                <div className="cat-card-header-icon cat-card-header-icon--form">
                                    <FiTag />
                                </div>
                                <div>
                                    <h5 className="cat-card-title">{currentCategory ? `Edit Category: ${currentCategory.name}` : 'Create Category'}</h5>
                                    <small className="cat-card-subtitle">
                                        {currentCategory ? 'Update existing category' : 'Add new category'}
                                    </small>
                                </div>
                            </div>
                            {currentCategory && (
                                <button className="cat-btn-cancel" onClick={handleCancel} disabled={isSaving}>
                                    <FiX /> Cancel
                                </button>
                            )}
                        </div>

                        <div className="cat-card-body">
                            <form onSubmit={handleSubmit} id="addCategoryForm">
                                <div className="cat-form-row">
                                    <div className="cat-form-group cat-form-group--full">
                                        <label className="cat-form-label">Category Name <span className="cat-required">*</span></label>
                                        <input
                                            ref={categoryNameRef}
                                            type="text"
                                            name="name"
                                            className="cat-form-input"
                                            value={formData.name}
                                            onChange={handleFormChange}
                                            placeholder="Enter category name"
                                            required
                                            autoFocus
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const submitButton = document.getElementById('submitCategoryButton');
                                                    if (submitButton) {
                                                        submitButton.focus();
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <input type="hidden" name="companyId" value={formData.companyId} />

                                <div className="cat-form-row">
                                    <div className="cat-form-group cat-form-group--full">
                                        <div className="cat-form-actions cat-form-actions--right">
                                            <button
                                                id="submitCategoryButton"
                                                type="submit"
                                                className="cat-btn-save"
                                                disabled={isSaving}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <span className="cat-spinner-small"></span>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiSave size={14} /> {currentCategory ? 'Update Category' : 'Add Category'}
                                                    </>
                                                )}
                                            </button>
                                            <small className="cat-shortcut-hint">Alt+S</small>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right Column - Existing Categories */}
                <div className="cat-list-section">
                    <div className="cat-card cat-card--list">
                        <div className="cat-card-header cat-card-header--list">
                            <div className="cat-card-header-left">
                                <div className="cat-card-header-icon cat-card-header-icon--list">
                                    <FiGrid />
                                </div>
                                <div>
                                    <h5 className="cat-card-title">Existing Categories</h5>
                                    <small className="cat-card-subtitle">
                                        {totalFilteredCategories} categories found
                                    </small>
                                </div>
                            </div>
                            <div className="cat-card-actions">
                                <button className="cat-btn-toolbar" onClick={() => navigate(-1)} title="Go back">
                                    <FiArrowLeft size={14} />
                                </button>
                                <button className="cat-btn-toolbar" onClick={() => setShowPrintModal(true)} title="Print report">
                                    <FiPrinter size={14} />
                                </button>
                                <button className="cat-btn-toolbar" onClick={() => exportToExcel(true)} disabled={exporting || data.categories.length === 0} title="Export to Excel">
                                    {exporting ? <span className="cat-spinner-small"></span> : <FiDownload size={14} />}
                                </button>
                                <button className="cat-btn-toolbar" onClick={resetColumnWidths} title="Reset column widths">
                                    <FiRefreshCw size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="cat-search-bar">
                            <div className="cat-search-wrapper">
                                <FiSearch className="cat-search-icon" />
                                <input
                                    type="text"
                                    className="cat-search-input"
                                    placeholder="Search categories by name..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                                {searchTerm && (
                                    <button className="cat-search-clear" onClick={() => setSearchTerm('')}>
                                        <FiX size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="cat-table-wrapper" ref={tableContainerRef}>
                            {loading ? (
                                <div className="cat-loading">
                                    <div className="cat-spinner"></div>
                                    <p className="cat-loading-text">Loading categories...</p>
                                </div>
                            ) : paginatedCategories.length === 0 ? (
                                <div className="cat-empty">
                                    <FiTag className="cat-empty-icon" size={32} />
                                    <h6 className="cat-empty-title">No categories found</h6>
                                    <p className="cat-empty-text">
                                        {searchTerm ? 'Try a different search term' : 'Create your first category using the form'}
                                    </p>
                                </div>
                            ) : (
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth = 50 + columnWidths.name + columnWidths.status + columnWidths.actions;
                                        return (
                                            <div style={{ height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List
                                                    key={`categories-list-${paginatedCategories.length}-${currentPage}`}
                                                    height={height - 30}
                                                    itemCount={paginatedCategories.length}
                                                    itemSize={28}
                                                    width={Math.max(width, totalWidth)}
                                                    itemData={{
                                                        categories: paginatedCategories,
                                                        isAdminOrSupervisor: data.isAdminOrSupervisor
                                                    }}
                                                >
                                                    {TableRow}
                                                </List>
                                                {isLoadingMore && (
                                                    <div className="cat-loading-more">
                                                        <div className="cat-spinner-small"></div>
                                                        <span>Loading more categories...</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            )}
                        </div>

                        <div className="cat-table-footer">
                            <span className="cat-footer-info">
                                Showing {paginatedCategories.length} of {totalFilteredCategories} categories
                            </span>
                            {hasMoreItems && paginatedCategories.length < totalFilteredCategories && (
                                <button className="cat-btn-load-more" onClick={loadMoreItems} disabled={isLoadingMore}>
                                    Load more...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Options Modal */}
            <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} centered size="md">
                <Modal.Header closeButton className="cat-modal-header">
                    <div className="d-flex align-items-center">
                        <FiPrinter className="me-2" size={20} />
                        <div>
                            <span className="fw-bold fs-6">Print Categories Report</span>
                            <small className="d-block opacity-75">Select filter options</small>
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body className="p-3">
                    <div className="cat-print-options">
                        <h6 className="cat-print-options-title">Filter Options</h6>
                        <div className="cat-print-options-grid">
                            <button className={`cat-print-option ${printOption === 'all' ? 'cat-print-option--active' : ''}`} onClick={() => setPrintOption('all')}>
                                All Categories
                            </button>
                            <button className={`cat-print-option ${printOption === 'active' ? 'cat-print-option--active' : ''}`} onClick={() => setPrintOption('active')}>
                                Active Only
                            </button>
                        </div>

                        <div className="cat-print-summary">
                            <h6 className="cat-print-options-title">Report Summary</h6>
                            <div className="cat-print-stats">
                                <div className="cat-print-stat">
                                    <span className="cat-print-stat-label">Total Categories</span>
                                    <span className="cat-print-stat-value">{data.categories.length}</span>
                                </div>
                                <div className="cat-print-stat">
                                    <span className="cat-print-stat-label cat-print-stat-label--success">Active</span>
                                    <span className="cat-print-stat-value cat-print-stat-value--success">
                                        {data.categories.filter(cat => cat.status === 'active').length}
                                    </span>
                                </div>
                                <div className="cat-print-stat">
                                    <span className="cat-print-stat-label cat-print-stat-label--danger">Inactive</span>
                                    <span className="cat-print-stat-value cat-print-stat-value--danger">
                                        {data.categories.filter(cat => cat.status !== 'active').length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="py-2">
                    <button className="cat-btn-secondary" onClick={() => setShowPrintModal(false)}>Cancel</button>
                    <button className="cat-btn-primary" onClick={() => { printCategories(); setShowPrintModal(false); }}>
                        <FiPrinter className="me-1" /> Print Report
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Save Confirmation Modal */}
            <Modal show={showSaveConfirmModal} onHide={() => setShowSaveConfirmModal(false)} centered>
                <Modal.Header closeButton className="cat-modal-header">
                    <Modal.Title>Confirm Save</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to save this category?</p>
                    {currentCategory && (
                        <div className="alert alert-warning small">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            This will update the existing category: <strong>{currentCategory.name}</strong>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className="cat-btn-secondary" onClick={() => setShowSaveConfirmModal(false)}>Cancel</button>
                    <button className="cat-btn-primary" onClick={() => { handleSubmit(); setShowSaveConfirmModal(false); }}>
                        {currentCategory ? 'Update Category' : 'Create Category'}
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Product Modal */}
            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
        </div>
    );
};

export default Categories;