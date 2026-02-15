import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiPrinter, FiArrowLeft, FiX, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Badge from 'react-bootstrap/Badge';
import Spinner from 'react-bootstrap/Spinner';
import Modal from 'react-bootstrap/Modal';
import Header from '../retailer/Header';
import NotificationToast from '../NotificationToast';
import ProductModal from './dashboard/modals/ProductModal';
import * as XLSX from 'xlsx';

const Categories = () => {
    const [exporting, setExporting] = useState(false);
    const navigate = useNavigate();
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
    const [searchTerm, setSearchTerm] = useState('');
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

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        name: 200,
        actions: 140
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

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

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
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

    // Filtered categories with memoization
    const filteredCategories = useMemo(() => {
        return data.categories
            .filter(category =>
                category.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [data.categories, searchTerm]);

    // Resizable Table Header Component
    const TableHeader = React.memo(() => {
        const totalWidth = 50 + columnWidths.name + columnWidths.actions;

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

                {/* Category Name */}
                <div
                    className="d-flex align-items-center ps-2 border-end border-white position-relative"
                    style={{
                        width: `${columnWidths.name}px`,
                        flexShrink: 0,
                        minWidth: '100px'
                    }}
                >
                    <strong style={{ fontSize: '0.8rem' }}>Category Name</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.name - 2}
                        columnName="name"
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
    // Table Row Component
const TableRow = React.memo(({ index, style, data }) => {
    const { categories, isAdminOrSupervisor } = data;
    const category = categories[index];

    const handleEditClick = useCallback(() => category && handleEdit(category), [category]);
    const handleDeleteClick = useCallback(() => category?._id && handleDelete(category._id), [category?._id]);
    const handleSelect = useCallback(() => category && handleSelectCategory(category), [category]);

    if (!category) return null;

    // Use id instead of _id for ASP.NET
    const categoryId = category.id || category._id;
    const categoryName = category.name || 'N/A';
    const isDefault = category.name === 'General'; // Check if this is the default category
    const isActive = category.status === 'active';

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

            {/* Category Name */}
            <div
                className="d-flex align-items-center ps-2 border-end"
                style={{
                    width: `${columnWidths.name}px`,
                    flexShrink: 0,
                    height: '100%',
                    overflow: 'hidden'
                }}
                title={`${categoryName}`}
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
                            {categoryName}
                        </span>
                        {isDefault && (
                            <Badge bg="info" className="ms-2" style={{
                                fontSize: '0.6rem',
                                padding: '1px 4px'
                            }}>
                                Default
                            </Badge>
                        )}
                        {isActive && !isDefault && (
                            <Badge bg="success" className="ms-2" style={{
                                fontSize: '0.6rem',
                                padding: '1px 4px'
                            }}>
                                Active
                            </Badge>
                        )}
                    </div>
                </div>
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
                {isAdminOrSupervisor && !isDefault && (
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
                            title={`Edit ${categoryName}`}
                            disabled={!!currentCategory}
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
                            title={`Delete ${categoryName}`}
                            disabled={!!currentCategory}
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
                    title={`Select ${categoryName}`}
                >
                    <FiCheck size={12} />
                </Button>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    if (prevProps.index !== nextProps.index) return false;
    if (prevProps.style !== nextProps.style) return false;

    const prevCategory = prevProps.data.categories[prevProps.index];
    const nextCategory = nextProps.data.categories[nextProps.index];

    return (
        shallowEqual(prevCategory, nextCategory) &&
        prevProps.data.isAdminOrSupervisor === nextProps.data.isAdminOrSupervisor
    );
});
    // const TableRow = React.memo(({ index, style, data }) => {
    //     const { categories, isAdminOrSupervisor } = data;
    //     const category = categories[index];

    //     const handleEditClick = useCallback(() => category && handleEdit(category), [category]);
    //     const handleDeleteClick = useCallback(() => category?._id && handleDelete(category._id), [category?._id]);
    //     const handleSelect = useCallback(() => category && handleSelectCategory(category), [category]);

    //     if (!category) return null;

    //     // Use id instead of _id for ASP.NET
    //     const categoryId = category.id || category._id;
    //     const categoryName = category.name || 'N/A';
    //     const isDefault = category.name === 'General';
    //     const isActive = category.status === 'active';

    //     return (
    //         <div
    //             style={{
    //                 ...style,
    //                 display: 'flex',
    //                 alignItems: 'center',
    //                 height: '26px',
    //                 minHeight: '26px',
    //                 padding: '0',
    //                 borderBottom: '1px solid #dee2e6',
    //                 cursor: 'pointer',
    //             }}
    //             className={index % 1 === 0 ? 'bg-light' : 'bg-white'}
    //         >
    //             {/* S.N. */}
    //             <div
    //                 className="d-flex align-items-center justify-content-center px-0 border-end"
    //                 style={{
    //                     width: '50px',
    //                     flexShrink: 0,
    //                     height: '100%'
    //                 }}
    //             >
    //                 <span className="text-muted" style={{ fontSize: '0.75rem' }}>
    //                     {index + 1}
    //                 </span>
    //             </div>

    //             {/* Category Name */}
    //             <div
    //                 className="d-flex align-items-center ps-2 border-end"
    //                 style={{
    //                     width: `${columnWidths.name}px`,
    //                     flexShrink: 0,
    //                     height: '100%',
    //                     overflow: 'hidden'
    //                 }}
    //                 title={`${categoryName}`}
    //             >
    //                 <div className="d-flex flex-column justify-content-center" style={{ height: '100%', minWidth: 0 }}>
    //                     <div className="d-flex align-items-center">
    //                         <span
    //                             style={{
    //                                 fontSize: '0.8rem',
    //                                 fontWeight: '500',
    //                                 whiteSpace: 'nowrap',
    //                                 overflow: 'hidden',
    //                                 textOverflow: 'ellipsis',
    //                                 display: 'block',
    //                                 maxWidth: '100%'
    //                             }}
    //                         >
    //                             {categoryName}
    //                         </span>
    //                        {isDefault && (
    //                         <Badge bg="info" className="ms-2" style={{
    //                             fontSize: '0.6rem',
    //                             padding: '1px 4px'
    //                         }}>
    //                             Default
    //                         </Badge>
    //                     )}
    //                     {isActive && !isDefault && (
    //                         <Badge bg="success" className="ms-2" style={{
    //                             fontSize: '0.6rem',
    //                             padding: '1px 4px'
    //                         }}>
    //                             Active
    //                         </Badge>
    //                     )}
    //                     </div>
    //                 </div>
    //             </div>

    //             {/* Actions */}
    //             <div
    //                 className="px-2 d-flex align-items-center justify-content-end gap-1"
    //                 style={{
    //                     width: `${columnWidths.actions}px`,
    //                     flexShrink: 0,
    //                     height: '100%'
    //                 }}
    //             >
    //                 {isAdminOrSupervisor && (
    //                     <>
    //                         <Button
    //                             variant="outline-warning"
    //                             size="sm"
    //                             className="p-0 d-flex align-items-center justify-content-center"
    //                             style={{
    //                                 width: '24px',
    //                                 height: '24px',
    //                                 minWidth: '24px'
    //                             }}
    //                             onClick={handleEditClick}
    //                             title={`Edit ${categoryName}`}
    //                             disabled={!!currentCategory}
    //                         >
    //                             <FiEdit2 size={12} />
    //                         </Button>
    //                         <Button
    //                             variant="outline-danger"
    //                             size="sm"
    //                             className="p-0 d-flex align-items-center justify-content-center"
    //                             style={{
    //                                 width: '24px',
    //                                 height: '24px',
    //                                 minWidth: '24px'
    //                             }}
    //                             onClick={handleDeleteClick}
    //                             title={`Delete ${categoryName}`}
    //                             disabled={!!currentCategory}
    //                         >
    //                             <FiTrash2 size={12} />
    //                         </Button>
    //                     </>
    //                 )}

    //                 <Button
    //                     variant="outline-success"
    //                     size="sm"
    //                     className="p-0 d-flex align-items-center justify-content-center"
    //                     style={{
    //                         width: '24px',
    //                         height: '24px',
    //                         minWidth: '24px'
    //                     }}
    //                     onClick={handleSelect}
    //                     title={`Select ${categoryName}`}
    //                 >
    //                     <FiCheck size={12} />
    //                 </Button>
    //             </div>
    //         </div>
    //     );
    // }, (prevProps, nextProps) => {
    //     if (prevProps.index !== nextProps.index) return false;
    //     if (prevProps.style !== nextProps.style) return false;

    //     const prevCategory = prevProps.data.categories[prevProps.index];
    //     const nextCategory = nextProps.data.categories[nextProps.index];

    //     return (
    //         shallowEqual(prevCategory, nextCategory) &&
    //         prevProps.data.isAdminOrSupervisor === nextProps.data.isAdminOrSupervisor
    //     );
    // });

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

                // Set companyId in formData
                if (apiData.companyId) {
                    setFormData(prev => ({
                        ...prev,
                        companyId: apiData.companyId
                    }));
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
            console.log('Error response:', error.response);
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
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (name === 'name') {
            setSearchTerm(value.toLowerCase());
        }
    };

    const handleEnterKey = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission

            // Get the submit button reference
            const submitButton = document.getElementById('submitCategoryButton');

            // If button exists, focus on it
            if (submitButton) {
                submitButton.focus();
            }
        }
    };

    const handleSubmit = async (e) => {
        if (e) {
            e.preventDefault();
        }

        // Validate form
        if (!formData.name.trim()) {
            showNotificationMessage('Category name is required', 'error');
            return;
        }

        if (!formData.companyId) {
            showNotificationMessage('Company ID is missing', 'error');
            return;
        }

        setIsSaving(true);
        try {
            if (currentCategory) {
                // Update existing category
                const updateData = {
                    name: formData.name
                };
                const response = await api.put(`/api/retailer/categories/${currentCategory.id || currentCategory._id}`, updateData);

                if (response.data.success) {
                    showNotificationMessage('Category updated successfully!', 'success');
                    handleCancel();
                } else {
                    throw new Error(response.data.error || 'Failed to update category');
                }
            } else {
                // Create new category
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
        const categoriesToPrint = printOption === 'all'
            ? data.categories
            : data.categories.filter(cat => cat.status === 'active');

        if (categoriesToPrint.length === 0) {
            alert("No categories to print");
            return;
        }

        const printWindow = window.open("", "_blank");

        const printHeader = `
            <div class="print-header">
                <h1>${data.company?.name || data.currentCompanyName || 'Company Name'}</h1>
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
                .badge-success { 
                    background-color: #28a745; 
                    color: white; 
                }
                .badge-danger { 
                    background-color: #dc3545; 
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
            </style>
            ${printHeader}
            
            <div class="report-title">Categories Report</div>
            
            <div class="header-info">
                <strong>Fiscal Year:</strong> ${data.currentFiscalYear?.name || 'N/A'} | 
                <strong>Total Categories:</strong> ${categoriesToPrint.length}
            </div>
            
            <div class="filter-info">
                ${printOption !== 'all' ?
                `<strong>Filter:</strong> ${printOption.charAt(0).toUpperCase() + printOption.slice(1)} | ` : ''
            }
                <strong>Printed on:</strong> ${new Date().toLocaleDateString()}
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th class="nowrap">S.N.</th>
                        <th class="nowrap">Category Name</th>
                        <th class="nowrap">Status</th>
                        <th class="nowrap">Total Items</th>
                        <th class="nowrap">Unique Number</th>
                        <th class="nowrap">Created Date</th>
                    </tr>
                </thead>
                <tbody>
        `;

        categoriesToPrint.forEach((category, index) => {
            tableContent += `
                <tr>
                    <td class="nowrap">${index + 1}</td>
                    <td class="nowrap">${category.name || 'N/A'}</td>
                    <td class="nowrap">
                        <span class="nowrap badge ${category.status === 'active' ? 'badge-success' : 'badge-danger'}">
                            ${category.status || 'N/A'}
                        </span>
                    </td>
                    <td class="nowrap">
                        <span class="nowrap">
                            ${category.itemCount || 0}
                        </span>
                    </td>
                    <td class="nowrap">
                        ${category.uniqueNumber || 'N/A'}
                    </td>
                    <td class="nowrap">
                        ${category.createdAt ? new Date(category.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                </tr>
            `;
        });

        tableContent += `
                </tbody>
            </table>
            
            <div class="footer-note">
                <br>
                ${data.company?.name ? `© ${new Date().getFullYear()} ${data.company.name}` : ''}
            </div>
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Categories Report - ${data.company?.name || data.currentCompanyName || 'Categories Report'}</title>
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

    const exportToExcel = async (exportAll = false) => {
        setExporting(true);
        try {
            const categoriesToExport = exportAll ? data.categories : filteredCategories;

            if (categoriesToExport.length === 0) {
                showNotificationMessage('No categories to export', 'warning');
                return;
            }

            const excelData = categoriesToExport.map((category, index) => {
                return {
                    'S.N.': index + 1,
                    'Category Name': category.name || 'N/A',
                    'Status': category.status || 'N/A',
                    'Total Items': category.itemCount || 0,
                    'Unique Number': category.uniqueNumber || '',
                    'Created': category.createdAt ? new Date(category.createdAt).toLocaleDateString() : '',
                    'Last Updated': category.updatedAt ? new Date(category.updatedAt).toLocaleDateString() : ''
                };
            });

            const summaryData = [
                {},
                {
                    'S.N.': 'SUMMARY',
                    'Category Name': 'Total Categories:',
                    'Status': categoriesToExport.length
                },
                {
                    'S.N.': '',
                    'Category Name': 'Active Categories:',
                    'Status': categoriesToExport.filter(cat => cat.status === 'active').length
                },
                {
                    'S.N.': '',
                    'Category Name': 'Inactive Categories:',
                    'Status': categoriesToExport.filter(cat => cat.status !== 'active').length
                }
            ];

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);

            ws['!cols'] = [
                { wch: 6 },
                { wch: Math.min(categoriesToExport.reduce((w, r) => Math.max(w, r['Category Name']?.length || 0), 10), 50) },
                { wch: 10 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Categories');

            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            const date = new Date().toISOString().split('T')[0];
            const filterInfo = exportAll ? 'All' : 'Filtered';
            const fileName = `Categories_Report_${filterInfo}_${date}.xlsx`;

            XLSX.writeFile(wb, fileName);

            showNotificationMessage(
                `${exportAll ? 'All' : 'Filtered'} categories (${categoriesToExport.length}) exported successfully!`,
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
            <div className="card mt-2">
                <div className="row g-3">
                    {/* Left Column - Add Category Form */}
                    <div className="col-lg-6">
                        <div className="card h-100 shadow-lg">
                            <div className="card-body">
                                <h3 className="text-center" style={{ textDecoration: 'underline' }}>
                                    {currentCategory ? `Edit Category: ${currentCategory.name}` : 'Create Category'}
                                </h3>
                                <Form onSubmit={handleSubmit} id="addCategoryForm" style={{ marginTop: '5px' }}>
                                    <Form.Group style={{ marginBottom: '12px' }}>
                                        <div className="position-relative">
                                            <Form.Control
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleFormChange}
                                                onKeyDown={handleEnterKey}
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
                                                Category Name <span className="text-danger">*</span>
                                            </label>
                                        </div>
                                    </Form.Group>

                                    {/* Hidden companyId field */}
                                    <input type="hidden" name="companyId" value={formData.companyId} />

                                    <div className="d-flex justify-content-between align-items-center">
                                        {currentCategory ? (
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
                                                id="submitCategoryButton"
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
                                                ) : currentCategory ? (
                                                    <>
                                                        <FiCheck className="me-1" size={14} />
                                                        Save Changes
                                                    </>
                                                ) : (
                                                    'Add Category'
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

                    {/* Right Column - Existing Categories */}
                    <div className="col-lg-6">
                        <div className="card h-100 shadow-lg">
                            <div className="card-body">
                                <h3 className="text-center" style={{ textDecoration: 'underline' }}>Existing Categories</h3>

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
                                            disabled={exporting || data.categories.length === 0}
                                            title="Export all categories to Excel"
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
                                                Search categories...
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
                                                Loading categories...
                                            </p>
                                        </div>
                                    ) : filteredCategories.length === 0 ? (
                                        <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                            <i className="bi bi-tags text-muted" style={{ fontSize: '1.5rem' }}></i>
                                            <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
                                                No categories found
                                            </h6>
                                            <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                                {searchTerm ? 'Try a different search term' : 'Create your first category using the form'}
                                            </p>
                                        </div>
                                    ) : (
                                        <AutoSizer>
                                            {({ height, width }) => {
                                                const totalWidth = 50 + columnWidths.name + columnWidths.actions;

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
                                                            itemCount={filteredCategories.length}
                                                            itemSize={26}
                                                            width={Math.max(width, totalWidth)}
                                                            itemData={{
                                                                categories: filteredCategories,
                                                                isAdminOrSupervisor: data.isAdminOrSupervisor
                                                            }}
                                                        >
                                                            {TableRow}
                                                        </List>
                                                        <div className="mt-2 text-muted small">
                                                            Showing {filteredCategories.length} of {data.categories.length} categories
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
                            <span className="fw-bold fs-6">Print Categories Report</span>
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
                                All Categories
                            </Button>
                            <Button
                                variant={printOption === 'active' ? 'success' : 'outline-success'}
                                onClick={() => setPrintOption('active')}
                                size="sm"
                            >
                                Active Only
                            </Button>
                        </div>

                        <div className="border-top pt-3 mt-3">
                            <h6 className="fw-bold mb-2 text-primary">Report Summary</h6>
                            <div className="row text-center">
                                <div className="col-4">
                                    <div className="text-muted small">Total Categories</div>
                                    <div className="fw-bold h5">{data.categories.length}</div>
                                </div>
                                <div className="col-4">
                                    <div className="text-muted small">Active</div>
                                    <div className="fw-bold h5 text-success">
                                        {data.categories.filter(cat => cat.status === 'active').length}
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-muted small">Inactive</div>
                                    <div className="fw-bold h5 text-danger">
                                        {data.categories.filter(cat => cat.status !== 'active').length}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {printOption !== 'all' && (
                            <div className="alert alert-info border small mt-3 py-2">
                                <i className="bi bi-info-circle me-2"></i>
                                <span>
                                    Filtering by: <strong>{
                                        printOption === 'active'
                                            ? 'Active categories only'
                                            : 'All categories'
                                    }</strong>
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
                                }}
                                size="sm"
                                disabled={printOption === 'all'}
                            >
                                Reset
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    printCategories();
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
                    <p>Are you sure you want to save this category?</p>
                    {currentCategory && (
                        <div className="alert alert-warning small">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            This will update the existing category: <strong>{currentCategory.name}</strong>
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
                        {currentCategory ? 'Update Category' : 'Create Category'}
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

export default Categories;