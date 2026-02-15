
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiEye, FiCheck, FiPrinter, FiArrowLeft, FiPlus, FiRefreshCw, FiX } from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Badge from 'react-bootstrap/Badge';
import Spinner from 'react-bootstrap/Spinner';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import ProductModal from '../dashboard/modals/ProductModal';
import NepaliDate from 'nepali-date-converter';
import * as XLSX from 'xlsx';

const Items = () => {
    const { itemsTableDraftSave, setItemsTableDraftSave } = usePageNotRefreshContext();
    const [isTableDataFresh, setIsTableDataFresh] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [exporting, setExporting] = useState(false);
    const navigate = useNavigate();
    const [data, setData] = useState({
        items: [],
        categories: [],
        itemsCompanies: [],
        units: [],
        mainUnits: [],
        composition: [],
        company: null,
        currentFiscalYear: null,
        vatEnabled: false,
        companyId: '',
        currentCompanyName: '',
        companyDateFormat: 'english',
        nepaliDate: '',
        fiscalYear: '',
        user: null,
        theme: 'light',
        isAdminOrSupervisor: false
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showCompositionModal, setShowCompositionModal] = useState(false);
    const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [printOption, setPrintOption] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedCompany, setSelectedCompany] = useState('');
    const [selectedCompositions, setSelectedCompositions] = useState([]);
    const [compositionSearch, setCompositionSearch] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [itemsWithTransactions, setItemsWithTransactions] = useState({});

    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('');
    const [showProductModal, setShowProductModal] = useState(false);

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        name: 160,
        company: 100,
        category: 100,
        vat: 60,
        actions: 140
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Form state - Updated to match backend DTO structure
    const [formData, setFormData] = useState({
        name: '',
        hscode: '',
        categoryId: '', // Changed from category to categoryId
        itemsCompanyId: '', // Changed from itemsCompany to itemsCompanyId
        mainUnitId: '', // Changed from mainUnit to mainUnitId (nullable)
        wsUnit: '', // Changed from WSUnit to wsUnit (lowercase)
        unitId: '', // Changed from unit to unitId
        vatStatus: '',
        reorderLevel: '',
        price: '',
        puPrice: '',
        openingStock: '',
        openingStockBalance: ''
    });

    // Create axios instance with interceptors
    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142',
        withCredentials: true,
    });

    // Add request interceptor
    api.interceptors.request.use(
        config => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        error => {
            return Promise.reject(error);
        }
    );

    // Add response interceptor
    api.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401) {
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
        if (!token) {
            navigate('/auth/login');
            return;
        }

        if (itemsTableDraftSave) {
            setData(prev => ({
                ...prev,
                items: itemsTableDraftSave.items
            }));
            fetchItems();
        } else {
            fetchItems();
        }

        const interval = setInterval(fetchItems, 300000);
        return () => clearInterval(interval);
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

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('itemsTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('itemsTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                setShowSaveConfirmModal(true);
            } else if (e.key === 'F6') {
                e.preventDefault();
                setShowCompositionModal(true);
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

    // Filtered items with memoization
const filteredItems = useMemo(() => {
    const items = (data.items)  // Always use data.items as primary source
        .filter(item => {
            const itemName = item.name?.toLowerCase() || '';
            const companyName = item.itemsCompanyName?.toLowerCase() || '';
            const categoryName = item.categoryName?.toLowerCase() || '';
            const searchTermLower = searchTerm.toLowerCase();
            
            return itemName.includes(searchTermLower) ||
                   companyName.includes(searchTermLower) ||
                   categoryName.includes(searchTermLower);
        })
        .sort((a, b) => a.name?.localeCompare(b.name));
    return items;
}, [data.items, searchTerm]);

// Process filtered items for display
const processedFilteredItems = useMemo(() => {
    return filteredItems.map(item => {
        return {
            ...item,
            _id: item.id || item._id,
            categoryId: item.categoryId,
            itemsCompanyId: item.itemsCompanyId,
            mainUnitId: item.mainUnitId,
            unitId: item.unitId,
            hasTransactions: item.hasTransactions || itemsWithTransactions[item.id || item._id] || false,
            currentStock: item.totalStock || item.currentStock || 0
        };
    });
}, [filteredItems, itemsWithTransactions]);

    // Resizable Table Header Component
    const TableHeader = React.memo(() => {
        const totalWidth = columnWidths.name + columnWidths.company + columnWidths.category + columnWidths.vat + columnWidths.actions;

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
                <div className="d-flex align-items-center justify-content-center px-2 border-end border-white"
                     style={{ width: '50px', flexShrink: 0 }}>
                    <strong style={{ fontSize: '0.8rem' }}>S.N.</strong>
                </div>

                <div className="d-flex align-items-center ps-2 border-end border-white position-relative"
                     style={{ width: `${columnWidths.name}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong style={{ fontSize: '0.8rem' }}>Item Name</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.name - 2} columnName="name" />
                </div>

                <div className="d-flex align-items-center px-2 border-end border-white position-relative"
                     style={{ width: `${columnWidths.company}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong style={{ fontSize: '0.8rem' }}>Company</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.company - 2} columnName="company" />
                </div>

                <div className="d-flex align-items-center px-2 border-end border-white position-relative"
                     style={{ width: `${columnWidths.category}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong style={{ fontSize: '0.8rem' }}>Category</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.category - 2} columnName="category" />
                </div>

                <div className="d-flex align-items-center justify-content-center px-2 border-end border-white position-relative"
                     style={{ width: `${columnWidths.vat}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong style={{ fontSize: '0.8rem' }}>VAT</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.vat - 2} columnName="vat" />
                </div>

                <div className="d-flex align-items-center justify-content-end px-2"
                     style={{ width: `${columnWidths.actions}px`, flexShrink: 0, minWidth: '120px' }}>
                    <strong style={{ fontSize: '0.8rem' }}>Actions</strong>
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
        const { items, isAdminOrSupervisor } = data;
        const item = items[index];

        const handleView = useCallback(() => navigate(`/retailer/items/${item?._id}`), [item?._id]);
        const handleEditClick = useCallback(() => item && handleEdit(item), [item]);
        const handleDeleteClick = useCallback(() => item?._id && handleDelete(item._id), [item?._id]);
        const handleSelect = useCallback(() => item && handleSelectItem(item), [item]);

        if (!item) return null;

        const itemName = item.name || 'N/A';
        const companyName = item.itemsCompanyName || 'N/A';
        const categoryName = item.categoryName || 'N/A';
        const isVatable = item.vatStatus === 'vatable';

        return (
            <div
                style={{ ...style, display: 'flex', alignItems: 'center', height: '26px', minHeight: '26px', padding: '0', borderBottom: '1px solid #dee2e6', cursor: 'pointer' }}
                className={index % 1 === 0 ? 'bg-light' : 'bg-white'}
                onDoubleClick={handleView}
            >
                <div className="d-flex align-items-center justify-content-center px-0 border-end"
                     style={{ width: '50px', flexShrink: 0, height: '100%' }}>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>{index + 1}</span>
                </div>

                <div className="d-flex align-items-center ps-2 border-end"
                     style={{ width: `${columnWidths.name}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}
                     title={itemName}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {itemName}
                    </span>
                </div>

                <div className="px-2 border-end d-flex flex-column justify-content-center"
                     style={{ width: `${columnWidths.company}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.8rem' }}>{companyName}</span>
                </div>

                <div className="px-2 border-end d-flex flex-column justify-content-center"
                     style={{ width: `${columnWidths.category}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.8rem' }}>{categoryName}</span>
                </div>

                <div className="px-2 border-end d-flex align-items-center justify-content-center"
                     style={{ width: `${columnWidths.vat}px`, flexShrink: 0, height: '100%' }}>
                    <Badge bg={isVatable ? 'success' : 'warning'} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        {isVatable ? '13%' : 'Exempt'}
                    </Badge>
                </div>

                <div className="px-2 d-flex align-items-center justify-content-end gap-1"
                     style={{ width: `${columnWidths.actions}px`, flexShrink: 0, height: '100%' }}>
                    <Button variant="outline-info" size="sm" className="p-0 d-flex align-items-center justify-content-center"
                            style={{ width: '24px', height: '24px', minWidth: '24px' }} onClick={handleView}
                            title={`View ${itemName}`}>
                        <FiEye size={12} />
                    </Button>

                    {isAdminOrSupervisor && (
                        <>
                            <Button variant="outline-warning" size="sm" className="p-0 d-flex align-items-center justify-content-center"
                                    style={{ width: '24px', height: '24px', minWidth: '24px' }} onClick={handleEditClick}
                                    title={`Edit ${itemName}`} disabled={!!currentItem}>
                                <FiEdit2 size={12} />
                            </Button>
                            <Button variant="outline-danger" size="sm" className="p-0 d-flex align-items-center justify-content-center"
                                    style={{ width: '24px', height: '24px', minWidth: '24px' }} onClick={handleDeleteClick}
                                    title={`Delete ${itemName}`} disabled={!!currentItem}>
                                <FiTrash2 size={12} />
                            </Button>
                        </>
                    )}

                    <Button variant="outline-success" size="sm" className="p-0 d-flex align-items-center justify-content-center"
                            style={{ width: '24px', height: '24px', minWidth: '24px' }} onClick={handleSelect}
                            title={`Select ${itemName}`}>
                        <FiCheck size={12} />
                    </Button>
                </div>
            </div>
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

    const resetForm = () => {
        setFormData({
            name: '',
            hscode: '',
            categoryId: '',
            itemsCompanyId: '',
            mainUnitId: '',
            wsUnit: '',
            unitId: '',
            vatStatus: '',
            reorderLevel: '',
            price: '',
            puPrice: '',
            openingStock: '',
            openingStockBalance: ''
        });
        setSelectedCompositions([]);
        setCurrentItem(null);
    };

    const handleCancel = () => {
        setCurrentItem(null);
        resetForm();
    };

    const resetColumnWidths = () => {
        setColumnWidths({
            name: 160,
            company: 100,
            category: 100,
            vat: 60,
            actions: 140
        });
        showNotificationMessage('Column widths reset to default', 'success');
    };

    const handleApiError = (error) => {
        console.error('API Error:', error);

        let errorMessage = 'An error occurred';

        if (error.response) {
            switch (error.response.status) {
                case 400:
                    errorMessage = error.response.data.error || 'Invalid request';
                    break;
                case 401:
                    errorMessage = 'Session expired. Please login again.';
                    return;
                case 403:
                    errorMessage = error.response.data.error || 'Access denied';
                    navigate('/user-dashboard');
                    return;
                case 409:
                    errorMessage = error.response.data.error || 'Item already exists';
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

    const fetchItems = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/auth/login');
                return;
            }

            const response = await api.get('/api/retailer/items');

            if (response.data.redirectTo) {
                navigate(response.data.redirectTo);
                return;
            }

            if (response.data.success) {
                const itemsArray = response.data.items || [];
                const transactionsMap = {};
                
                itemsArray.forEach(item => {
                    transactionsMap[item.id || item._id] = 
                        item.hasTransactions === 'true' || 
                        item.hasTransactions === true;
                });

                setItemsWithTransactions(transactionsMap);

                const newData = {
                    items: itemsArray,
                    categories: response.data.categories || [],
                    itemsCompanies: response.data.itemsCompanies || [],
                    units: response.data.units || [],
                    mainUnits: response.data.mainUnits || [],
                    composition: response.data.composition || [],
                    company: response.data.company,
                    currentFiscalYear: response.data.currentFiscalYear,
                    vatEnabled: response.data.vatEnabled || false,
                    companyId: response.data.companyId || '',
                    currentCompanyName: response.data.currentCompanyName || '',
                    companyDateFormat: response.data.companyDateFormat || 'english',
                    nepaliDate: response.data.nepaliDate || '',
                    fiscalYear: response.data.fiscalYear || '',
                    user: response.data.user,
                    theme: response.data.theme || 'light',
                    isAdminOrSupervisor: response.data.isAdminOrSupervisor || false
                };

                setData(newData);
                setIsTableDataFresh(true);
                setLastUpdated(new Date().toISOString());
                setItemsTableDraftSave({
                    items: newData.items,
                    lastUpdated: new Date().toISOString()
                });
            } else {
                throw new Error(response.data.error || 'Failed to fetch items');
            }
        } catch (err) {
            console.error('Error in fetchItems:', err);
            
            if (itemsTableDraftSave) {
                setData(prev => ({
                    ...prev,
                    items: itemsTableDraftSave.items
                }));
                showNotificationMessage('Using cached data. Could not fetch fresh items.', 'warning');
            } else {
                handleApiError(err);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value.toLowerCase());
    };

    const handleEdit = async (item) => {
        setCurrentItem(item);

        // Set search term to the item name so it shows in the list
    setSearchTerm(item.name?.toLowerCase() || '');

        // Extract composition IDs from item.compositions
        const compositionIds = item.compositions 
            ? item.compositions.map(c => c.id || c._id)
            : [];

        // Find the selected composition objects from data.composition
        const selectedCompositionObjs = data.composition.filter(comp => 
            compositionIds.includes(comp.id || comp._id)
        );

        setSelectedCompositions(selectedCompositionObjs);

        setFormData({
            name: item.name || '',
            hscode: item.hscode || '',
            categoryId: item.categoryId || '',
            itemsCompanyId: item.itemsCompanyId || '',
            mainUnitId: item.mainUnitId || '',
            wsUnit: item.wsUnit || '',
            unitId: item.unitId || '',
            vatStatus: item.vatStatus || '',
            reorderLevel: item.reorderLevel || '',
            price: item.price || '',
            puPrice: item.puPrice || '',
            openingStock: item.openingStock || '',
            openingStockBalance: item.openingStockBalance || (item.puPrice * item.openingStock).toFixed(2)
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                const response = await api.delete(`/api/retailer/items/${id}`);

                if (response.data?.success) {
                    showNotificationMessage(response.data.message || 'Item deleted successfully', 'success');
                    fetchItems();
                } else {
                    showNotificationMessage(response.data?.message || 'Failed to delete item', 'error');
                }
            } catch (err) {
                console.error('Delete error:', err);
                if (err.response && err.response.status === 400) {
                    showNotificationMessage(err.response.data?.message || 'Item cannot be deleted as it has related transactions', 'error');
                } else {
                    handleApiError(err);
                }
            }
        }
    };

    const handleSelectItem = (item) => {

     setSearchTerm(item.name?.toLowerCase() || '');

        // Extract composition IDs from item.compositions
        const compositionIds = item.compositions 
            ? item.compositions.map(c => c.id || c._id)
            : [];

        // Find the selected composition objects from data.composition
        const selectedCompositionObjs = data.composition.filter(comp => 
            compositionIds.includes(comp.id || comp._id)
        );

        setSelectedCompositions(selectedCompositionObjs);

        setFormData({
            name: item.name || '',
            hscode: item.hscode || '',
            categoryId: item.categoryId || '',
            itemsCompanyId: item.itemsCompanyId || '',
            mainUnitId: item.mainUnitId || '',
            wsUnit: item.wsUnit || '',
            unitId: item.unitId || '',
            vatStatus: item.vatStatus || '',
            reorderLevel: item.reorderLevel || '',
            price: item.price || '',
            puPrice: item.puPrice || '',
            openingStock: item.openingStock || '',
            openingStockBalance: item.openingStockBalance || (item.puPrice * item.openingStock).toFixed(2)
        });
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

    const handleCompositionSelect = (composition) => {
        setSelectedCompositions(prev => {
            const exists = prev.some(c => c.id === composition.id);
            if (exists) {
                return prev.filter(c => c.id !== composition.id);
            } else {
                return [...prev, composition];
            }
        });
    };

    const handleSelectAllCompositions = (e) => {
        if (e.target.checked) {
            setSelectedCompositions(filteredCompositions);
        } else {
            setSelectedCompositions([]);
        }
    };

    const handleCompositionDone = () => {
        setShowCompositionModal(false);
    };

    const handleSubmit = async (e) => {
    if (e) {
        e.preventDefault();
    }

    setIsSaving(true);

    try {
        // Prepare the data - match backend CreateItemDTO structure
        const requestData = {
            name: formData.name.trim(),
            hscode: formData.hscode,
            categoryId: formData.categoryId,
            itemsCompanyId: formData.itemsCompanyId,
            mainUnitId: formData.mainUnitId || null,
            wsUnit: formData.wsUnit ? parseFloat(formData.wsUnit) : 0,
            unitId: formData.unitId,
            vatStatus: formData.vatStatus,
            reorderLevel: formData.reorderLevel ? parseFloat(formData.reorderLevel) : 0,
            price: formData.price ? parseFloat(formData.price) : null,
            puPrice: formData.puPrice ? parseFloat(formData.puPrice) : null,
            openingStock: formData.openingStock ? parseFloat(formData.openingStock) : 0,
            compositionIds: selectedCompositions.map(comp => comp.id || comp._id)
        };

        // Validate required fields
        if (!requestData.name || !requestData.categoryId || !requestData.itemsCompanyId || 
            !requestData.unitId || !requestData.vatStatus) {
            showNotificationMessage('Please fill all required fields', 'error');
            setIsSaving(false);
            return;
        }

        if (currentItem) {
            // Update existing item
            const response = await api.put(`/api/retailer/items/${currentItem._id}`, requestData);
            
            if (response.data?.success) {
                showNotificationMessage('Item updated successfully!', 'success');
                                
                // Refresh items list
                await fetchItems();
                
                // Reset form
                resetForm();
                handleCancel();
            } else {
                showNotificationMessage(response.data?.error || 'Failed to update item', 'error');
            }
        } else {
            // Create new item
            const response = await api.post('/api/retailer/items/create', requestData);
            
            if (response.data?.success) {
                showNotificationMessage('Item created successfully!', 'success');
                
                // Clear search to show all items
                // setSearchTerm('');
                
                // Clear form
                resetForm();
                
                // Refresh items list - this will show all items
                await fetchItems();
            } else {
                showNotificationMessage(response.data?.error || 'Failed to create item', 'error');
            }
        }
    } catch (err) {
        console.error('Submit error:', err);
        
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
    const filteredCompositions = data.composition.filter(comp =>
        comp.name?.toLowerCase().includes(compositionSearch.toLowerCase()) ||
        (comp.uniqueNumber && comp.uniqueNumber.toString().includes(compositionSearch))
    );

    // Get composition display names for form
    const getCompositionDisplayNames = () => {
        return selectedCompositions.map(c => c.name).join(', ');
    };

    const printItems = () => {
        const itemsToPrintSource = isTableDataFresh ? data.items : (itemsTableDraftSave?.items || data.items);
        let itemsToPrint = [...itemsToPrintSource];

        switch (printOption) {
            case 'active':
                itemsToPrint = itemsToPrint.filter(item => item.status === 'active');
                break;
            case 'vatable':
                itemsToPrint = itemsToPrint.filter(item => item.vatStatus === 'vatable');
                break;
            case 'vatExempt':
                itemsToPrint = itemsToPrint.filter(item => item.vatStatus === 'vatExempt');
                break;
            case 'category':
                itemsToPrint = itemsToPrint.filter(item => item.categoryId === selectedCategory);
                break;
            case 'itemsCompany':
                itemsToPrint = itemsToPrint.filter(item => item.itemsCompanyId === selectedCompany);
                break;
        }

        if (itemsToPrint.length === 0) {
            alert("No items to print");
            return;
        }

        const printWindow = window.open("", "_blank");
        let tableContent = `
            <style>
                @page { size: A4 landscape; margin: 10mm; }
                body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; padding: 10mm; }
                table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                th, td { border: 1px solid #000; padding: 4px; text-align: left; white-space: nowrap; }
                th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; }
                .print-header { text-align: center; margin-bottom: 15px; }
                .nowrap { white-space: nowrap; }
                .badge { padding: 3px 6px; border-radius: 3px; font-size: 10px; display: inline-block; }
                .badge-success { background-color: #28a745; color: white; }
                .badge-warning { background-color: #ffc107; color: black; }
                .footer-note { margin-top: 20px; font-size: 0.9em; color: #666; text-align: center; }
                .header-info { text-align: center; margin-bottom: 10px; font-size: 11px; }
                .report-title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 5px; text-decoration: underline; }
                .filter-info { text-align: center; font-size: 11px; margin-bottom: 15px; color: #666; }
            </style>
            <div class="print-header">
                <h1>${data.company?.companyName || data.currentCompanyName || 'Company Name'}</h1>
                <hr>
            </div>
            
            <div class="report-title">Items Report</div>
            
            <div class="header-info">
                <strong>Fiscal Year:</strong> ${data.currentFiscalYear?.name || 'N/A'} | 
                <strong>Total Items:</strong> ${itemsToPrint.length}
            </div>
            
            <div class="filter-info">
                ${printOption !== 'all' ? `<strong>Filter:</strong> ${printOption.charAt(0).toUpperCase() + printOption.slice(1)} | ` : ''}
                <strong>Printed on:</strong> ${data.companyDateFormat === 'nepali' ?
                (data.nepaliDate || new NepaliDate().format('YYYY-MM-DD')) :
                new Date().toLocaleDateString()}
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th class="nowrap">S.N.</th>
                        <th class="nowrap">Item Name</th>
                        <th class="nowrap">Company</th>
                        <th class="nowrap">Category</th>
                        <th class="nowrap">VAT</th>
                        <th class="nowrap">Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        itemsToPrint.forEach((item, index) => {
            const companyName = item.itemsCompanyName || 'N/A';
            const categoryName = item.categoryName || 'N/A';
            
            tableContent += `
                <tr>
                    <td class="nowrap">${index + 1}</td>
                    <td class="nowrap">${item.name || 'N/A'}</td>
                    <td class="nowrap">${companyName}</td>
                    <td class="nowrap">${categoryName}</td>
                    <td class="nowrap">
                        <span class="nowrap">${item.vatStatus === 'vatable' ? '13%' : 'Exempt'}</span>
                    </td>
                    <td class="nowrap">
                        <span class="nowrap">${item.status || 'N/A'}</span>
                    </td>
                </tr>
            `;
        });

        tableContent += `
                </tbody>
            </table>
            
            <div class="footer-note">
                <br>
                ${data.company?.companyName ? `© ${new Date().getFullYear()} ${data.company.companyName}` : ''}
            </div>
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Items Report - ${data.company?.companyName || data.currentCompanyName || 'Items Report'}</title>
                </head>
                <body>${tableContent}
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
            const itemsToExport = exportAll ? data.items : filteredItems;

            if (itemsToExport.length === 0) {
                showNotificationMessage('No items to export', 'warning');
                return;
            }

            const excelData = itemsToExport.map((item, index) => {
                const companyName = item.itemsCompanyName || 'N/A';
                const categoryName = item.categoryName || 'N/A';
                const mainUnitName = item.mainUnitName || 'N/A';
                const unitName = item.unitName || 'N/A';
                const compositions = item.compositions 
                    ? item.compositions.map(c => c.name).join(', ') 
                    : '';

                return {
                    'S.N.': index + 1,
                    'Item Name': item.name || 'N/A',
                    'HSN Code': item.hscode || '',
                    'Company': companyName,
                    'Category': categoryName,
                    'Composition': compositions,
                    'Main Unit': mainUnitName,
                    'Unit': unitName,
                    'WS Unit': item.wsUnit || '',
                    'VAT Status': item.vatStatus === 'vatable' ? '13%' : 'Exempt',
                    'Purchase Price': item.puPrice || 0,
                    'Sales Price': item.price || 0,
                    'Opening Stock': item.openingStock || 0,
                    'Opening Value': item.openingStockBalance || 0,
                    'Reorder Level': item.reorderLevel || '',
                    'Status': item.status || 'N/A',
                    'Created': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
                    'Last Updated': item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
                };
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            XLSX.utils.book_append_sheet(wb, ws, 'Items');

            const date = new Date().toISOString().split('T')[0];
            const filterInfo = exportAll ? 'All' : 'Filtered';
            const fileName = `Items_Report_${filterInfo}_${date}.xlsx`;

            XLSX.writeFile(wb, fileName);
            showNotificationMessage(`${exportAll ? 'All' : 'Filtered'} items (${itemsToExport.length}) exported successfully!`, 'success');

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
                    {/* Left Column - Add Item Form */}
                    <div className="col-lg-6">
                        <div className="card h-100 shadow-lg">
                            <div className="card-body">
                                <h3 className="text-center" style={{ textDecoration: 'underline' }}>
                                    {currentItem ? `Edit Item: ${currentItem.name}` : 'Create Items'}
                                </h3>
                                <Form onSubmit={handleSubmit} id="addItemForm" style={{ marginTop: '5px' }}>
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
                                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.75rem' }}
                                                />
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    Item Name <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Select
                                                    name="itemsCompanyId"
                                                    value={formData.itemsCompanyId}
                                                    onChange={handleFormChange}
                                                    required
                                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.5rem', paddingBottom: '0' }}
                                                >
                                                    <option value="" disabled>Select Company</option>
                                                    {data.itemsCompanies.map(company => (
                                                        <option key={company.id || company._id} value={company.id || company._id}>
                                                            {company.name}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    Company <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-3">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="text"
                                                    name="hscode"
                                                    value={formData.hscode}
                                                    onChange={handleFormChange}
                                                    placeholder=" "
                                                    autoComplete="off"
                                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.75rem' }}
                                                />
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    HSN Code
                                                </label>
                                            </div>
                                        </div>
                                    </Form.Group>

                                    <Form.Group className="row" style={{ marginBottom: '8px', gap: '5px 0' }}>
                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Select
                                                    name="categoryId"
                                                    value={formData.categoryId}
                                                    onChange={handleFormChange}
                                                    required
                                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.5rem', paddingBottom: '0' }}
                                                >
                                                    <option value="" disabled>Select Category</option>
                                                    {data.categories.map(category => (
                                                        <option key={category.id || category._id} value={category.id || category._id}>
                                                            {category.name}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    Category <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-8">
                                            <div className="position-relative">
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500', zIndex: 5 }}>
                                                    Composition
                                                </label>
                                                <div className="input-group">
                                                    <Form.Control
                                                        type="text"
                                                        value={getCompositionDisplayNames()}
                                                        readOnly
                                                        placeholder="Press F6 to add compositions"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'F6') {
                                                                e.preventDefault();
                                                                setShowCompositionModal(true);
                                                            }
                                                        }}
                                                        style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.75rem', backgroundColor: '#f8f9fa' }}
                                                    />
                                                    <Button variant="outline-secondary" onClick={() => setShowCompositionModal(true)}
                                                            style={{ height: '35px', padding: '0 8px', borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>
                                                        <FiPlus size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Form.Group>

                                    <Form.Group className="row" style={{ marginBottom: '8px', gap: '5px 0' }}>
                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Select
                                                    name="mainUnitId"
                                                    value={formData.mainUnitId}
                                                    onChange={handleFormChange}
                                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.5rem', paddingBottom: '0' }}
                                                >
                                                    <option value="">Select Main Unit</option>
                                                    {data.mainUnits.map(unit => (
                                                        <option key={unit.id || unit._id} value={unit.id || unit._id}>
                                                            {unit.name}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    Main Unit
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="number"
                                                    name="wsUnit"
                                                    value={formData.wsUnit}
                                                    onChange={handleFormChange}
                                                    placeholder=" "
                                                    autoComplete="off"
                                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.75rem' }}
                                                />
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    WS Unit
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Select
                                                    name="unitId"
                                                    value={formData.unitId}
                                                    onChange={handleFormChange}
                                                    required
                                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.5rem', paddingBottom: '0' }}
                                                >
                                                    <option value="" disabled>Select Unit</option>
                                                    {data.units.map(unit => (
                                                        <option key={unit.id || unit._id} value={unit.id || unit._id}>
                                                            {unit.name}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    Unit <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>
                                    </Form.Group>

                                    <Form.Group className="row" style={{ marginBottom: '8px', gap: '5px 0' }}>
                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Select
                                                    name="vatStatus"
                                                    value={formData.vatStatus}
                                                    onChange={handleFormChange}
                                                    required
                                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.5rem', paddingBottom: '0' }}
                                                >
                                                    <option value="" disabled>Select VAT</option>
                                                    {data.vatEnabled && <option value="vatable">Vatable</option>}
                                                    <option value="vatExempt">VAT Exempt</option>
                                                </Form.Select>
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    VAT <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="number"
                                                    name="reorderLevel"
                                                    value={formData.reorderLevel}
                                                    onChange={handleFormChange}
                                                    placeholder=" "
                                                    autoComplete="off"
                                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.75rem' }}
                                                />
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    Re-Order Level
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="number"
                                                    name="price"
                                                    value={formData.price}
                                                    onChange={handleFormChange}
                                                    step="0.01"
                                                    placeholder=" "
                                                    autoComplete="off"
                                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.75rem' }}
                                                />
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    Sales Price
                                                </label>
                                            </div>
                                        </div>
                                    </Form.Group>

                                    <Form.Group className="row" style={{ marginBottom: '12px', gap: '5px 0' }}>
                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="number"
                                                    name="puPrice"
                                                    value={formData.puPrice}
                                                    onChange={(e) => {
                                                        const puPrice = parseFloat(e.target.value) || 0;
                                                        const openingStock = parseFloat(formData.openingStock) || 0;
                                                        const hasTransactions = currentItem ? itemsWithTransactions[currentItem._id] : false;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            puPrice: e.target.value,
                                                            openingStockBalance: hasTransactions ? prev.openingStockBalance : (puPrice * openingStock).toFixed(2)
                                                        }));
                                                    }}
                                                    step="any"
                                                    placeholder=" "
                                                    autoComplete="off"
                                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.75rem' }}
                                                />
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    Purchase Price
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="number"
                                                    name="openingStock"
                                                    value={formData.openingStock}
                                                    onChange={(e) => {
                                                        if (currentItem && itemsWithTransactions[currentItem._id]) return;
                                                        const openingStock = parseFloat(e.target.value) || 0;
                                                        const puPrice = parseFloat(formData.puPrice) || 0;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            openingStock: e.target.value,
                                                            openingStockBalance: (puPrice * openingStock).toFixed(2)
                                                        }));
                                                    }}
                                                    readOnly={currentItem ? itemsWithTransactions[currentItem._id] : false}
                                                    placeholder=" "
                                                    autoComplete="off"
                                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.75rem', backgroundColor: currentItem && itemsWithTransactions[currentItem._id] ? '#f8f9fa' : 'white' }}
                                                />
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: currentItem && itemsWithTransactions[currentItem._id] ? '#f8f9fa' : 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    Opening Stock
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="position-relative">
                                                <Form.Control
                                                    type="number"
                                                    name="openingStockBalance"
                                                    value={formData.openingStockBalance}
                                                    onChange={handleFormChange}
                                                    step="any"
                                                    readOnly={currentItem ? itemsWithTransactions[currentItem._id] : false}
                                                    placeholder=" "
                                                    autoComplete="off"
                                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.75rem', backgroundColor: currentItem && itemsWithTransactions[currentItem._id] ? '#f8f9fa' : 'white' }}
                                                />
                                                <label className="position-absolute"
                                                       style={{ top: '-8px', left: '0.75rem', fontSize: '0.75rem', backgroundColor: currentItem && itemsWithTransactions[currentItem._id] ? '#f8f9fa' : 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                    Opening Value
                                                </label>
                                            </div>
                                        </div>
                                    </Form.Group>

                                    <div className="d-flex justify-content-between align-items-center">
                                        {currentItem ? (
                                            <Button variant="secondary" onClick={handleCancel} disabled={isSaving}
                                                    className="d-flex align-items-center" style={{ height: '28px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500' }}>
                                                <FiX className="me-1" size={14} /> Cancel
                                            </Button>
                                        ) : <div></div>}
                                        <div className="d-flex align-items-center">
                                            <Button variant="primary" type="submit" disabled={isSaving}
                                                    className="d-flex align-items-center" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(e); } }}
                                                    style={{ height: '28px', padding: '0 16px', fontSize: '0.8rem', fontWeight: '500' }}>
                                                {isSaving ? (
                                                    <>
                                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                                        Saving...
                                                    </>
                                                ) : currentItem ? (
                                                    <>
                                                        <FiCheck className="me-1" size={14} /> Save Changes
                                                    </>
                                                ) : 'Add Item'}
                                            </Button>
                                            <small className="ms-2 text-muted" style={{ fontSize: '0.7rem' }}>Alt+S to Save</small>
                                        </div>
                                    </div>
                                </Form>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Items List */}
                    <div className="col-lg-6">
                        <div className="card h-100 shadow-lg">
                            <div className="card-body">
                                <h3 className="text-center" style={{ textDecoration: 'underline' }}>Existing Items</h3>

                                <div className="row g-1 mb-2 align-items-center">
                                    <div className="col-auto">
                                        <Button variant="primary" onClick={() => navigate(-1)} className="d-flex align-items-center p-1"
                                                title="Go back" style={{ height: '24px', minWidth: '24px', fontSize: '0.7rem' }}>
                                            <FiArrowLeft size={10} />
                                            <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Back</span>
                                        </Button>
                                    </div>
                                    <div className="col-auto">
                                        <Button variant="primary" onClick={() => setShowPrintModal(true)} className="d-flex align-items-center p-1"
                                                title="Print report" style={{ height: '24px', minWidth: '24px', fontSize: '0.7rem' }}>
                                            <FiPrinter size={10} />
                                            <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Print</span>
                                        </Button>
                                    </div>
                                    <div className="col-auto">
                                        <Button variant="success" onClick={() => exportToExcel(true)} disabled={exporting || data.items.length === 0}
                                                title="Export all items to Excel" className="d-flex align-items-center p-1"
                                                style={{ height: '24px', minWidth: '24px', fontSize: '0.7rem' }}>
                                            {exporting ? (
                                                <Spinner animation="border" size="sm" className="me-1" style={{ width: '10px', height: '10px' }} />
                                            ) : <i className="fas fa-file-excel" style={{ fontSize: '0.7rem' }}></i>}
                                            <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Export</span>
                                        </Button>
                                    </div>
                                    <div className="col">
                                        <div style={{ position: 'relative' }}>
                                            <Form.Control type="text" placeholder=" " value={searchTerm} onChange={handleSearch} className="w-100"
                                                          style={{ height: '24px', fontSize: '0.75rem', paddingTop: '0.6rem', paddingLeft: '0.5rem' }} />
                                            <label className="position-absolute"
                                                   style={{ top: '-6px', left: '0.5rem', fontSize: '0.65rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                Search items...
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-auto">
                                        <Button variant="outline-secondary" size="sm" onClick={resetColumnWidths}
                                                title="Reset column widths to default" className="d-flex align-items-center p-1"
                                                style={{ height: '24px', minWidth: '24px', fontSize: '0.7rem' }}>
                                            <FiRefreshCw size={10} />
                                            <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Reset</span>
                                        </Button>
                                    </div>
                                </div>
                                <div style={{ height: 'calc(100vh - 300px)', width: '100%' }}>
                                    {loading ? (
                                        <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                            <Spinner animation="border" variant="primary" size="sm" style={{ width: '1.5rem', height: '1.5rem' }} />
                                            <p className="mt-2 small text-muted" style={{ fontSize: '0.8rem' }}>Loading items...</p>
                                        </div>
                                    ) : filteredItems.length === 0 ? (
                                        <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                            <i className="bi bi-package text-muted" style={{ fontSize: '1.5rem' }}></i>
                                            <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>No items found</h6>
                                            <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                                {searchTerm ? 'Try a different search term' : 'Create your first item using the form'}
                                            </p>
                                        </div>
                                    ) : (
                                        <AutoSizer>
                                            {({ height, width }) => {
                                                const totalWidth = 50 + columnWidths.name + columnWidths.company + columnWidths.category + columnWidths.vat + columnWidths.actions;
                                                return (
                                                    <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth), overflowX: 'auto' }}>
                                                        <TableHeader />
                                                        <List
                                                        key={`items-list-${filteredItems.length}-${data.items.length}-${lastUpdated}`}
                                                         height={height - 60} itemCount={filteredItems.length} itemSize={26}
                                                              width={Math.max(width, totalWidth)}
                                                              itemData={{ items: processedFilteredItems, isAdminOrSupervisor: data.isAdminOrSupervisor }}>
                                                            {TableRow}
                                                        </List>
                                                        <div className="mt-2 text-muted small">
                                                            Showing {filteredItems.length} of {data.items.length} items
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
            <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} centered size="md">
                <Modal.Header closeButton className="bg-primary text-white py-2">
                    <Modal.Title className="d-flex align-items-center">
                        <FiPrinter className="me-2" size={20} />
                        <div className="d-flex flex-column">
                            <span className="fw-bold fs-6">Print Items Report</span>
                            <small className="opacity-75">Select filter options</small>
                        </div>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-3">
                    <div className="mb-3">
                        <h6 className="fw-bold mb-2 text-primary">Filter Options</h6>
                        <div className="d-flex gap-2 mb-3">
                            <Button variant={printOption === 'all' ? 'primary' : 'outline-primary'} onClick={() => setPrintOption('all')} size="sm">All Items</Button>
                            <Button variant={printOption === 'active' ? 'success' : 'outline-success'} onClick={() => setPrintOption('active')} size="sm">Active Only</Button>
                            <Button variant={printOption === 'vatable' ? 'warning' : 'outline-warning'} onClick={() => setPrintOption('vatable')} size="sm">VAT Items</Button>
                        </div>
                        <div className="d-flex gap-2 mb-3">
                            <Button variant={printOption === 'vatExempt' ? 'info' : 'outline-info'} onClick={() => setPrintOption('vatExempt')} size="sm">Exempt Only</Button>
                            <Button variant={printOption === 'category' ? 'secondary' : 'outline-secondary'} onClick={() => setPrintOption('category')} size="sm">By Category</Button>
                            <Button variant={printOption === 'itemsCompany' ? 'secondary' : 'outline-secondary'} onClick={() => setPrintOption('itemsCompany')} size="sm">By Company</Button>
                        </div>

                        {printOption === 'category' && (
                            <div className="mt-3">
                                <Form.Label className="small fw-semibold">Select Category</Form.Label>
                                <Form.Select size="sm" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="mb-2">
                                    <option value="">All Categories</option>
                                    {data.categories.map(category => (
                                        <option key={category.id || category._id} value={category.id || category._id}>{category.name}</option>
                                    ))}
                                </Form.Select>
                            </div>
                        )}

                        {printOption === 'itemsCompany' && (
                            <div className="mt-3">
                                <Form.Label className="small fw-semibold">Select Company</Form.Label>
                                <Form.Select size="sm" value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="mb-2">
                                    <option value="">All Companies</option>
                                    {data.itemsCompanies.map(company => (
                                        <option key={company.id || company._id} value={company.id || company._id}>{company.name}</option>
                                    ))}
                                </Form.Select>
                            </div>
                        )}
                    </div>
                </Modal.Body>
                <Modal.Footer className="py-2 border-top">
                    <div className="d-flex justify-content-between w-100 align-items-center">
                        <Button variant="outline-secondary" onClick={() => setShowPrintModal(false)} size="sm" className="px-3">Cancel</Button>
                        <div className="d-flex gap-2">
                            <Button variant="outline-primary" onClick={() => { setPrintOption('all'); setSelectedCategory(''); setSelectedCompany(''); }}
                                    size="sm" disabled={printOption === 'all' && !selectedCategory && !selectedCompany}>Reset</Button>
                            <Button variant="primary" onClick={() => { printItems(); setShowPrintModal(false); }} size="sm" className="px-4">
                                <FiPrinter className="me-1" /> Print Report
                            </Button>
                        </div>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Composition Selection Modal */}
            <Modal show={showCompositionModal} onHide={() => setShowCompositionModal(false)} size="lg" centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title><div className="d-flex align-items-center"><FiEdit2 className="me-2" /><span>Select Compositions</span></div></Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <div className="sticky-top p-3 bg-light border-bottom">
                        <div className="input-group">
                            <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                            <Form.Control type="search" placeholder="Search compositions by name or code..." value={compositionSearch}
                                          onChange={(e) => setCompositionSearch(e.target.value)} autoFocus className="border-start-0" />
                        </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center p-3 bg-light border-bottom">
                        <small className="text-muted">Showing {filteredCompositions.length} of {data.composition.length} compositions</small>
                        <Form.Check type="checkbox" label="Select All"
                                    checked={selectedCompositions.length === filteredCompositions.length && filteredCompositions.length > 0}
                                    onChange={handleSelectAllCompositions} className="ms-2" />
                    </div>

                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        {filteredCompositions.length === 0 ? (
                            <div className="text-center p-5">
                                <div className="mb-3"><i className="bi bi-search text-muted" style={{ fontSize: '2rem' }}></i></div>
                                <h5 className="text-muted">No compositions found</h5>
                                <p className="text-muted small">Try a different search term</p>
                            </div>
                        ) : (
                            <div className="list-group list-group-flush">
                                {filteredCompositions.map(comp => (
                                    <div key={comp.id || comp._id}
                                         className={`list-group-item list-group-item-action ${selectedCompositions.some(c => (c.id || c._id) === (comp.id || comp._id)) ? 'active' : ''}`}
                                         onClick={() => handleCompositionSelect(comp)}>
                                        <div className="d-flex align-items-center">
                                            <Form.Check type="checkbox" checked={selectedCompositions.some(c => (c.id || c._id) === (comp.id || comp._id))}
                                                        onChange={() => handleCompositionSelect(comp)} className="me-3 flex-shrink-0" />
                                            <div className="flex-grow-1">
                                                <div className="d-flex justify-content-between">
                                                    <strong>{comp.name}</strong>
                                                    {comp.uniqueNumber && <span className="badge bg-secondary ms-2">#{comp.uniqueNumber}</span>}
                                                </div>
                                                {comp.description && <small className="text-muted d-block mt-1">{comp.description}</small>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <div>
                        <Badge bg="primary" className="me-2">{selectedCompositions.length} selected</Badge>
                        <small className="text-muted">
                            {selectedCompositions.length > 0 ? selectedCompositions.map(c => c.name).join(', ') : 'No compositions selected'}
                        </small>
                    </div>
                    <div>
                        <Button variant="outline-secondary" onClick={() => setShowCompositionModal(false)} className="me-2">Cancel</Button>
                        <Button variant="primary" onClick={handleCompositionDone} disabled={selectedCompositions.length === 0}>
                            <FiCheck className="me-1" /> Apply Selected
                        </Button>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Save Confirmation Modal */}
            <Modal show={showSaveConfirmModal} onHide={() => setShowSaveConfirmModal(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white"><Modal.Title>Confirm Save</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to save this item?</p>
                    {currentItem && (
                        <div className="alert alert-warning small">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            This will update the existing item: <strong>{currentItem.name}</strong>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSaveConfirmModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={() => { handleSubmit(); setShowSaveConfirmModal(false); }}>
                        {currentItem ? 'Update Item' : 'Create Item'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Product Modal */}
            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
        </div>
    );
};

export default Items;
