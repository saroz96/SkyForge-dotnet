import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiEye, FiCheck, FiPrinter, FiArrowLeft, FiPlus, FiRefreshCw, FiX, FiHash, FiSearch, FiBox, FiGrid, FiTag, FiFileText, FiDownload, FiSave } from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Badge from 'react-bootstrap/Badge';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import ProductModal from '../dashboard/modals/ProductModal';
import NepaliDate from 'nepali-datetime';
import * as XLSX from 'xlsx';
import './Items.css';
import api, { refreshToken } from '../../services/api';

const Items = () => {
    const [isTableDataFresh, setIsTableDataFresh] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [exporting, setExporting] = useState(false);
    const navigate = useNavigate();
    const {
        itemsTableDraftSave,
        setItemsTableDraftSave,
        itemsSearchDraftSave,
        setItemsSearchDraftSave,
        clearItemsSearchDraft
    } = usePageNotRefreshContext();
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

    const [paginatedItems, setPaginatedItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreItems, setHasMoreItems] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalFilteredItems, setTotalFilteredItems] = useState(0);
    const tableContainerRef = useRef(null);
    const [isInitialFiscalYear, setIsInitialFiscalYear] = useState(false);
    const [loading, setLoading] = useState(true);
    // const [searchTerm, setSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState(
        itemsSearchDraftSave?.searchTerm || ''
    );
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
    const [generatedUniqueNumber, setGeneratedUniqueNumber] = useState(null);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [pendingNumberGeneration, setPendingNumberGeneration] = useState(false);

    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('');
    const [showProductModal, setShowProductModal] = useState(false);

    // Form field refs
    const itemNameRef = useRef(null);
    const companySelectRef = useRef(null);
    const hsnInputRef = useRef(null);
    const categorySelectRef = useRef(null);
    const compositionInputRef = useRef(null);
    const compositionButtonRef = useRef(null);
    const mainUnitSelectRef = useRef(null);
    const wsUnitInputRef = useRef(null);
    const unitSelectRef = useRef(null);
    const vatSelectRef = useRef(null);
    const reorderInputRef = useRef(null);
    const salesPriceInputRef = useRef(null);
    const purchasePriceInputRef = useRef(null);
    const openingStockInputRef = useRef(null);
    const openingValueInputRef = useRef(null);
    const uniqueNumberInputRef = useRef(null);
    const submitButtonRef = useRef(null);

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        name: 180,
        company: 80,
        category: 80,
        code: 60,
        vat: 60,
        actions: 140
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Form state
    const [formData, setFormData] = useState({
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
        openingStockBalance: '',
        uniqueNumber: ''
    });

    const showNotificationMessage = (message, type) => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    // Generate next unique number
    const generateNextUniqueNumber = useCallback(() => {
        const existingNumbers = data.items
            .map(item => item.uniqueNumber)
            .filter(num => num && num >= 10001 && num <= 99999)
            .sort((a, b) => a - b);

        if (existingNumbers.length === 0) return 10001;

        let nextNumber = 10001;
        let foundGap = false;

        for (const num of existingNumbers) {
            if (num === nextNumber) {
                nextNumber++;
            } else if (num > nextNumber) {
                foundGap = true;
                break;
            }
        }

        if (foundGap) return nextNumber;
        if (nextNumber <= 99999) return nextNumber;

        const sortedSet = new Set(existingNumbers);
        for (let i = 10001; i <= 99999; i++) {
            if (!sortedSet.has(i)) return i;
        }

        showNotificationMessage('No available 5-digit numbers!', 'error');
        return null;
    }, [data.items]);

    const setNextNumberInForm = useCallback(() => {
        if (!currentItem) {
            const nextNumber = generateNextUniqueNumber();
            if (nextNumber) {
                setGeneratedUniqueNumber(nextNumber);
                setFormData(prev => ({ ...prev, uniqueNumber: nextNumber }));
                return nextNumber;
            }
        }
        return null;
    }, [currentItem, generateNextUniqueNumber]);

    const autoGenerateAndSetNumber = useCallback(() => {
        if (!currentItem) {
            const nextNumber = generateNextUniqueNumber();
            if (nextNumber) {
                setGeneratedUniqueNumber(nextNumber);
                setFormData(prev => ({ ...prev, uniqueNumber: nextNumber }));
                return nextNumber;
            }
        }
        return null;
    }, [currentItem, generateNextUniqueNumber]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth/login');
            return;
        }

        if (itemsTableDraftSave) {
            setData(prev => ({ ...prev, items: itemsTableDraftSave.items }));
            fetchItems();
        } else {
            fetchItems();
        }

        const interval = setInterval(fetchItems, 300000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setItemsSearchDraftSave({
            searchTerm,
            timestamp: Date.now(),
        });
    }, [searchTerm, setItemsSearchDraftSave]);

    useEffect(() => {
        if (!loading && !currentItem && isFirstLoad) {
            setTimeout(() => {
                if (!formData.uniqueNumber) {
                    autoGenerateAndSetNumber();
                }
                setIsFirstLoad(false);
            }, 150);
        }
    }, [loading, currentItem, autoGenerateAndSetNumber, formData.uniqueNumber, isFirstLoad]);

    useEffect(() => {
        if (!isFirstLoad && !currentItem && !formData.uniqueNumber) {
            autoGenerateAndSetNumber();
        }
    }, [data.items, isFirstLoad, currentItem, formData.uniqueNumber, autoGenerateAndSetNumber]);

    useEffect(() => {
        if (pendingNumberGeneration && !loading && !currentItem) {
            const nextNumber = setNextNumberInForm();
            if (nextNumber) {
                setPendingNumberGeneration(false);
                setTimeout(() => {
                    if (itemNameRef.current) {
                        itemNameRef.current.focus();
                    }
                }, 100);
            }
        }
    }, [pendingNumberGeneration, loading, currentItem, setNextNumberInForm]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                if (!currentItem) {
                    const nextNumber = generateNextUniqueNumber();
                    if (nextNumber) {
                        setGeneratedUniqueNumber(nextNumber);
                        setFormData(prev => ({ ...prev, uniqueNumber: nextNumber }));
                        showNotificationMessage(`Generated unique number: ${nextNumber}`, 'success');
                    }
                }
            }
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                setShowSaveConfirmModal(true);
            }
            if (e.key === 'F6') {
                e.preventDefault();
                setShowCompositionModal(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [generateNextUniqueNumber, currentItem]);

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

    // Handle Enter key navigation for form fields
    const handleFieldKeyDown = (e, nextFieldRef) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (nextFieldRef && nextFieldRef.current) {
                nextFieldRef.current.focus();
                // For select elements, also open the dropdown
                if (nextFieldRef.current.tagName === 'SELECT') {
                    nextFieldRef.current.click();
                }
            }
        }
    };

    // Handle composition field - only open modal on button click or F6
    const handleCompositionKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Do NOT open modal - just move to next field
            if (mainUnitSelectRef && mainUnitSelectRef.current) {
                mainUnitSelectRef.current.focus();
                mainUnitSelectRef.current.click();
            }
        }
        if (e.key === 'F6') {
            e.preventDefault();
            setShowCompositionModal(true);
        }
    };

    // Filtered items
    const filteredItems = useMemo(() => {
        return (data.items || [])
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
    }, [data.items, searchTerm]);

    const processedFilteredItems = useMemo(() => {
        return filteredItems.map(item => ({
            ...item,
            _id: item.id || item._id,
            categoryId: item.categoryId,
            itemsCompanyId: item.itemsCompanyId,
            mainUnitId: item.mainUnitId,
            unitId: item.unitId,
            hasTransactions: item.hasTransactions || itemsWithTransactions[item.id || item._id] || false,
            currentStock: item.totalStock || item.currentStock || 0
        }));
    }, [filteredItems, itemsWithTransactions]);

    // Pagination
    useEffect(() => {
        const initialItems = paginateItems(processedFilteredItems, 1);
        setPaginatedItems(initialItems);
        setCurrentPage(1);
        setHasMoreItems(processedFilteredItems.length > initialItems.length);
        setTotalFilteredItems(processedFilteredItems.length);
    }, [processedFilteredItems]);

    const paginateItems = useCallback((itemsList, pageNum, itemsPerPage = 25) => {
        const actualLimit = pageNum === 1 ? 15 : 15 + ((pageNum - 1) * itemsPerPage);
        return itemsList.slice(0, actualLimit);
    }, []);

    const loadMoreItems = useCallback(() => {
        if (!hasMoreItems || isLoadingMore) return;
        setIsLoadingMore(true);

        setTimeout(() => {
            const nextPage = currentPage + 1;
            const itemsPerPage = 25;
            const newLimit = nextPage === 1 ? 15 : 15 + ((nextPage - 1) * itemsPerPage);
            const newPaginatedItems = processedFilteredItems.slice(0, newLimit);

            if (newPaginatedItems.length === paginatedItems.length) {
                setHasMoreItems(false);
            } else {
                setPaginatedItems(newPaginatedItems);
                setCurrentPage(nextPage);
            }
            setIsLoadingMore(false);
        }, 100);
    }, [hasMoreItems, isLoadingMore, currentPage, processedFilteredItems, paginatedItems]);

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
        const totalWidth = columnWidths.name + columnWidths.company + columnWidths.category + columnWidths.code + columnWidths.vat + columnWidths.actions;

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="it-header"
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
                <div className="it-header-cell it-header-cell--sn">S.N.</div>
                <div className="it-header-cell it-header-cell--resizable" style={{ width: `${columnWidths.code}px`, minWidth: '60px' }}>
                    Code
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="code" />
                </div>
                <div className="it-header-cell it-header-cell--resizable" style={{ width: `${columnWidths.name}px`, minWidth: '100px' }}>
                    Item Name
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="name" />
                </div>
                <div className="it-header-cell it-header-cell--resizable" style={{ width: `${columnWidths.category}px`, minWidth: '80px' }}>
                    Category
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="category" />
                </div>
                <div className="it-header-cell it-header-cell--resizable" style={{ width: `${columnWidths.company}px`, minWidth: '80px' }}>
                    Company
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="company" />
                </div>
                <div className="it-header-cell it-header-cell--resizable" style={{ width: `${columnWidths.vat}px`, minWidth: '50px' }}>
                    VAT
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="vat" />
                </div>
                <div className="it-header-cell" style={{ width: `${columnWidths.actions}px`, minWidth: '120px', textAlign: 'center' }}>
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
        const { items, isAdminOrSupervisor } = data;
        const item = items[index];

        if (!item) return null;

        const handleView = useCallback(() => navigate(`/retailer/items/${item?._id}`), [item?._id]);
        const handleEditClick = useCallback(() => item && handleEdit(item), [item]);
        const handleDeleteClick = useCallback(() => item?._id && handleDelete(item._id), [item?._id]);
        const handleSelect = useCallback(() => item && handleSelectItem(item), [item]);

        const isVatable = item.vatStatus === '13';

        return (
            <div
                style={{ ...style, display: 'flex', alignItems: 'center', height: '28px', minHeight: '28px', padding: '0', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                className={index % 2 === 0 ? 'it-row-even' : 'it-row-odd'}
                onDoubleClick={handleView}
            >
                <div className="it-cell it-cell--sn">{index + 1}</div>
                <div className="it-cell it-cell--code" style={{ width: `${columnWidths.code}px`, flexShrink: 0 }}>
                    <span className="it-code-badge">{item.uniqueNumber || 'N/A'}</span>
                </div>
                <div className="it-cell it-cell--name" style={{ width: `${columnWidths.name}px`, flexShrink: 0 }} title={item.name}>
                    <span className="it-item-name">{item.name || 'N/A'}</span>
                </div>
                <div className="it-cell it-cell--category" style={{ width: `${columnWidths.category}px`, flexShrink: 0 }}>
                    <span className="it-text-muted">{item.categoryName || 'N/A'}</span>
                </div>
                <div className="it-cell it-cell--company" style={{ width: `${columnWidths.company}px`, flexShrink: 0 }}>
                    <span className="it-text-muted">{item.itemsCompanyName || 'N/A'}</span>
                </div>
                <div className="it-cell it-cell--vat" style={{ width: `${columnWidths.vat}px`, flexShrink: 0 }}>
                    <span className={`it-vat-badge it-vat-badge--${isVatable ? 'taxable' : 'exempt'}`}>
                        {isVatable ? '13%' : 'Exempt'}
                    </span>
                </div>
                <div className="it-cell it-cell--actions" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>
                    <button className="it-btn-action it-btn-action--view" onClick={handleView} title="View">
                        <FiEye size={12} />
                    </button>
                    {isAdminOrSupervisor && (
                        <>
                            <button className="it-btn-action it-btn-action--edit" onClick={handleEditClick} title="Edit" disabled={!!currentItem}>
                                <FiEdit2 size={12} />
                            </button>
                            <button className="it-btn-action it-btn-action--delete" onClick={handleDeleteClick} title="Delete" disabled={!!currentItem}>
                                <FiTrash2 size={12} />
                            </button>
                        </>
                    )}
                    <button className="it-btn-action it-btn-action--select" onClick={handleSelect} title="Select" disabled={!!currentItem}>
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
                className="it-resize-handle"
                onMouseDown={(e) => {
                    e.preventDefault();
                    onResizeStart(e, columnName);
                }}
            />
        );
    });

    const resetFormOnly = useCallback(() => {
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
            openingStockBalance: '',
            uniqueNumber: ''
        });
        setSelectedCompositions([]);
        setCurrentItem(null);
        setGeneratedUniqueNumber(null);
    }, []);

    const resetForm = useCallback(() => {
        resetFormOnly();
        setPendingNumberGeneration(true);
    }, [resetFormOnly]);

    const handleCancel = () => {
        setCurrentItem(null);
        resetFormOnly();
        setTimeout(() => setNextNumberInForm(), 100);
    };

    const resetColumnWidths = () => {
        setColumnWidths({
            name: 180,
            company: 80,
            category: 80,
            code: 60,
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
                case 400: errorMessage = error.response.data.error || 'Invalid request'; break;
                case 401: errorMessage = 'Session expired. Please login again.'; return;
                case 403: errorMessage = error.response.data.error || 'Access denied'; navigate('/user-dashboard'); return;
                case 409: errorMessage = error.response.data.error || 'Item already exists'; break;
                default: errorMessage = error.response.data.message || 'Request failed';
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
                    transactionsMap[item.id || item._id] = item.hasTransactions === 'true' || item.hasTransactions === true;
                });
                setItemsWithTransactions(transactionsMap);
                const isInitial = response.data.isInitialFiscalYear || false;
                setIsInitialFiscalYear(isInitial);
                setData({
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
                    isAdminOrSupervisor: response.data.isAdminOrSupervisor || false,
                    isInitialFiscalYear: isInitial
                });
                setIsTableDataFresh(true);
                setLastUpdated(new Date().toISOString());
                setItemsTableDraftSave({
                    items: itemsArray,
                    lastUpdated: new Date().toISOString()
                });
            } else {
                throw new Error(response.data.error || 'Failed to fetch items');
            }
        } catch (err) {
            console.error('Error in fetchItems:', err);
            if (itemsTableDraftSave) {
                setData(prev => ({ ...prev, items: itemsTableDraftSave.items }));
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
        setSearchTerm(item.name?.toLowerCase() || '');

        const compositionIds = item.compositions ? item.compositions.map(c => c.id || c._id) : [];
        const selectedCompositionObjs = data.composition.filter(comp =>
            compositionIds.includes(comp.id || comp._id)
        );
        setSelectedCompositions(selectedCompositionObjs);

        // ✅ Get opening stock from OpeningStocksByFiscalYear for the current fiscal year
        const currentFiscalYearId = data.currentFiscalYear?.id || data.currentFiscalYear?._id;
        const openingStockData = item.openingStocksByFiscalYear?.find(
            os => os.fiscalYearId === currentFiscalYearId || os.fiscalYear?.id === currentFiscalYearId
        );

        // ✅ If no opening stock found for current fiscal year, use item defaults
        const openingStock = openingStockData?.openingStock ?? item.openingStock ?? 0;
        const purchasePrice = openingStockData?.purchasePrice ?? item.puPrice ?? 0;
        const salesPrice = openingStockData?.salesPrice ?? item.price ?? 0;
        const openingStockValue = openingStockData?.openingStockValue ?? (purchasePrice * openingStock);

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
            price: salesPrice, // ✅ Use sales price from opening stock data
            puPrice: purchasePrice, // ✅ Use purchase price from opening stock data
            openingStock: openingStock, // ✅ Use opening stock from opening stock data
            openingStockBalance: openingStockValue, // ✅ Use opening stock value from opening stock data
            uniqueNumber: item.uniqueNumber || ''
        });
        setGeneratedUniqueNumber(item.uniqueNumber);
        setPendingNumberGeneration(false);
    };

    const handleSelectItem = (item) => {
        setSearchTerm(item.name?.toLowerCase() || '');

        const compositionIds = item.compositions ? item.compositions.map(c => c.id || c._id) : [];
        const selectedCompositionObjs = data.composition.filter(comp =>
            compositionIds.includes(comp.id || comp._id)
        );
        setSelectedCompositions(selectedCompositionObjs);

        // ✅ Get opening stock from OpeningStocksByFiscalYear for the current fiscal year
        const currentFiscalYearId = data.currentFiscalYear?.id || data.currentFiscalYear?._id;
        const openingStockData = item.openingStocksByFiscalYear?.find(
            os => os.fiscalYearId === currentFiscalYearId || os.fiscalYear?.id === currentFiscalYearId
        );

        // ✅ If no opening stock found for current fiscal year, use item defaults
        const openingStock = openingStockData?.openingStock ?? item.openingStock ?? 0;
        const purchasePrice = openingStockData?.purchasePrice ?? item.puPrice ?? 0;
        const salesPrice = openingStockData?.salesPrice ?? item.price ?? 0;
        const openingStockValue = openingStockData?.openingStockValue ?? (purchasePrice * openingStock);

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
            price: salesPrice, // ✅ Use sales price from opening stock data
            puPrice: purchasePrice, // ✅ Use purchase price from opening stock data
        });
        setGeneratedUniqueNumber(item.uniqueNumber);
        setPendingNumberGeneration(false);
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

    // const handleSelectItem = (item) => {
    //     setSearchTerm(item.name?.toLowerCase() || '');

    //     const compositionIds = item.compositions ? item.compositions.map(c => c.id || c._id) : [];
    //     const selectedCompositionObjs = data.composition.filter(comp =>
    //         compositionIds.includes(comp.id || comp._id)
    //     );
    //     setSelectedCompositions(selectedCompositionObjs);

    //     setFormData({
    //         name: item.name || '',
    //         hscode: item.hscode || '',
    //         categoryId: item.categoryId || '',
    //         itemsCompanyId: item.itemsCompanyId || '',
    //         mainUnitId: item.mainUnitId || '',
    //         wsUnit: item.wsUnit || '',
    //         unitId: item.unitId || '',
    //         vatStatus: item.vatStatus || '',
    //         reorderLevel: item.reorderLevel || '',
    //         price: item.price || '',
    //         puPrice: item.puPrice || '',
    //         openingStock: item.openingStock || '',
    //         openingStockBalance: item.openingStockBalance || (item.puPrice * item.openingStock).toFixed(2),
    //     });
    //     setGeneratedUniqueNumber(item.uniqueNumber);
    //     setPendingNumberGeneration(false);
    // };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'name') setSearchTerm(value.toLowerCase());
    };

    const handleUniqueNumberChange = (e) => {
        const value = e.target.value;
        const numValue = parseInt(value);

        if (value && (numValue < 10001 || numValue > 99999)) {
            showNotificationMessage('Unique number must be between 10001 and 99999', 'warning');
            return;
        }

        if (!currentItem && value) {
            const currentCompanyId = data.companyId || data.currentCompany?.id;
            const exists = data.items.some(item =>
                item.uniqueNumber === numValue && item.companyId === currentCompanyId
            );
            if (exists) {
                showNotificationMessage(`Number ${numValue} already exists! Please use a different number.`, 'error');
                return;
            }
        }

        setFormData(prev => ({ ...prev, uniqueNumber: value }));
        setGeneratedUniqueNumber(value ? numValue : null);
    };

    const handleGenerateNumber = () => {
        if (currentItem) {
            showNotificationMessage('Cannot generate new number for existing item', 'warning');
            return;
        }
        const nextNumber = generateNextUniqueNumber();
        if (nextNumber) {
            setGeneratedUniqueNumber(nextNumber);
            setFormData(prev => ({ ...prev, uniqueNumber: nextNumber }));
            showNotificationMessage(`Generated unique number: ${nextNumber}`, 'success');
        }
    };

    const handleCompositionSelect = (composition) => {
        setSelectedCompositions(prev => {
            const exists = prev.some(c => c.id === composition.id);
            return exists ? prev.filter(c => c.id !== composition.id) : [...prev, composition];
        });
    };

    const handleSelectAllCompositions = (e) => {
        setSelectedCompositions(e.target.checked ? filteredCompositions : []);
    };

    const handleCompositionDone = () => {
        setShowCompositionModal(false);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setIsSaving(true);

        try {
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
                compositionIds: selectedCompositions.map(comp => comp.id || comp._id),
                uniqueNumber: formData.uniqueNumber ? parseInt(formData.uniqueNumber) : null
            };

            if (!requestData.name || !requestData.categoryId || !requestData.itemsCompanyId ||
                !requestData.unitId || !requestData.vatStatus) {
                showNotificationMessage('Please fill all required fields', 'error');
                setIsSaving(false);
                return;
            }

            if (!requestData.uniqueNumber) {
                showNotificationMessage('Please generate or enter a unique number', 'error');
                setIsSaving(false);
                return;
            }

            if (!currentItem) {
                const currentCompanyId = data.companyId || data.currentCompany?.id;
                const numberExists = data.items.some(item =>
                    item.uniqueNumber === requestData.uniqueNumber && item.companyId === currentCompanyId
                );
                if (numberExists) {
                    showNotificationMessage(`Number ${requestData.uniqueNumber} already exists in this company! Please use another number.`, 'error');
                    setIsSaving(false);
                    return;
                }
            }

            if (currentItem) {
                const response = await api.put(`/api/retailer/items/${currentItem._id}`, requestData);
                if (response.data?.success) {
                    showNotificationMessage('Item updated successfully!', 'success');
                    await fetchItems();
                    resetFormOnly();
                    setPendingNumberGeneration(true);
                } else {
                    showNotificationMessage(response.data?.error || 'Failed to update item', 'error');
                }
            } else {
                const response = await api.post('/api/retailer/items/create', requestData);
                if (response.data?.success) {
                    showNotificationMessage('Item created successfully!', 'success');
                    resetFormOnly();
                    setPendingNumberGeneration(true);
                    await fetchItems();
                } else {
                    showNotificationMessage(response.data?.error || 'Failed to create item', 'error');
                }
            }
        } catch (err) {
            console.error('Submit error:', err);
            const errorMessage = err.response?.data?.error || err.message || '';

            if (errorMessage.toLowerCase().includes('already exists') ||
                errorMessage.toLowerCase().includes('already exists for this fiscal year')) {
                showNotificationMessage(errorMessage, 'error');
            } else if (err.response?.data?.error?.includes('duplicate') ||
                err.response?.data?.error?.includes('unique constraint') ||
                errorMessage.toLowerCase().includes('unique number') ||
                errorMessage.toLowerCase().includes('already exists')) {
                showNotificationMessage('This unique number is already taken. Please generate a new one.', 'error');
                const nextNumber = generateNextUniqueNumber();
                if (nextNumber) {
                    setGeneratedUniqueNumber(nextNumber);
                    setFormData(prev => ({ ...prev, uniqueNumber: nextNumber }));
                }
            } else if (err.response?.data?.errors) {
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
            case '13':
                itemsToPrint = itemsToPrint.filter(item => item.vatStatus === '13');
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
        </style>
        ${printHeader}
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
                    <th class="nowrap">Code</th>
                    <th class="nowrap">Company</th>
                    <th class="nowrap">Category</th>
                    <th class="nowrap">VAT</th>
                    <th class="nowrap">Status</th>
                </tr>
            </thead>
            <tbody>
    `;

        itemsToPrint.forEach((item, index) => {
            tableContent += `
            <tr>
                <td class="nowrap">${index + 1}</td>
                <td class="nowrap">${item.name || 'N/A'}</td>
                <td class="nowrap">${item.uniqueNumber || ''}</td>
                <td class="nowrap">${item.itemsCompanyName || 'N/A'}</td>
                <td class="nowrap">${item.categoryName || 'N/A'}</td>
                <td class="nowrap" style="text-align: center;">${item.vatStatus === '13' ? '13%' : 'Exempt'}</td>
                <td class="nowrap" style="text-align: center;">${item.status || 'N/A'}</td>
            </tr>
        `;
        });

        tableContent += `
            </tbody>
        </table>
        <div class="footer-note" style="margin-top: 10px; font-size: 7px; color: #666; text-align: center;">
            ${data.company?.companyName ? `© ${new Date().getFullYear()} ${data.company.companyName}` : ''}
        </div>
    `;

        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Items Report - ${data.company?.companyName || data.currentCompanyName || 'Items Report'}</title>
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
            const itemsToExport = exportAll ? data.items : filteredItems;

            if (itemsToExport.length === 0) {
                showNotificationMessage('No items to export', 'warning');
                return;
            }

            const excelData = itemsToExport.map((item, index) => ({
                'S.N.': index + 1,
                'Item Name': item.name || 'N/A',
                'Unique Number': item.uniqueNumber || '',
                'HSN Code': item.hscode || '',
                'Company': item.itemsCompanyName || 'N/A',
                'Category': item.categoryName || 'N/A',
                'Composition': item.compositions ? item.compositions.map(c => c.name).join(', ') : '',
                'Main Unit': item.mainUnitName || 'N/A',
                'Unit': item.unitName || 'N/A',
                'WS Unit': item.wsUnit || '',
                'VAT Status': item.vatStatus === '13' ? '13%' : 'Exempt',
                'Purchase Price': item.puPrice || 0,
                'Sales Price': item.price || 0,
                'Opening Stock': item.openingStock || 0,
                'Opening Value': item.openingStockBalance || 0,
                'Reorder Level': item.reorderLevel || '',
                'Status': item.status || 'N/A',
                'Created': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
                'Last Updated': item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            XLSX.utils.book_append_sheet(wb, ws, 'Items');

            const date = new Date().toISOString().split('T')[0];
            const fileName = `Items_Report_${exportAll ? 'All' : 'Filtered'}_${date}.xlsx`;

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
        <div className="it-container">
            <Header />
            <NotificationToast
                message={notificationMessage}
                type={notificationType}
                show={showNotification}
                onClose={() => setShowNotification(false)}
            />

            <div className="it-main">
                {/* Left Column - Add Item Form */}
                <div className="it-form-section">
                    <div className="it-card it-card--form">
                        <div className="it-card-header">
                            <div className="it-card-header-left">
                                <div className="it-card-header-icon it-card-header-icon--form">
                                    <FiBox />
                                </div>
                                <div>
                                    <h5 className="it-card-title">{currentItem ? `Edit Item: ${currentItem.name}` : 'Create Items'}</h5>
                                    <small className="it-card-subtitle">
                                        {currentItem ? 'Update existing item' : 'Add new item to inventory'}
                                    </small>
                                </div>
                            </div>
                            {currentItem && (
                                <button className="it-btn-cancel" onClick={handleCancel} disabled={isSaving}>
                                    <FiX /> Cancel
                                </button>
                            )}
                        </div>

                        <div className="it-card-body">
                            <Form onSubmit={handleSubmit} id="addItemForm">
                                <div className="it-form-row">
                                    <div className="it-form-group it-form-group--half">
                                        <label className="it-form-label">Item Name <span className="it-required">*</span></label>
                                        <input
                                            ref={itemNameRef}
                                            type="text"
                                            name="name"
                                            className="it-form-input"
                                            value={formData.name}
                                            onChange={handleFormChange}
                                            placeholder="Enter item name"
                                            required
                                            autoFocus
                                            autoComplete="off"
                                            onKeyDown={(e) => handleFieldKeyDown(e, companySelectRef)}
                                        />
                                    </div>

                                    <div className="it-form-group it-form-group--quarter">
                                        <label className="it-form-label">Company <span className="it-required">*</span></label>
                                        <select
                                            ref={companySelectRef}
                                            name="itemsCompanyId"
                                            className="it-form-select"
                                            value={formData.itemsCompanyId}
                                            onChange={handleFormChange}
                                            required
                                            onKeyDown={(e) => handleFieldKeyDown(e, hsnInputRef)}
                                        >
                                            <option value="">Select Company</option>
                                            {data.itemsCompanies.map(company => (
                                                <option key={company.id || company._id} value={company.id || company._id}>
                                                    {company.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="it-form-group it-form-group--quarter">
                                        <label className="it-form-label">HSN</label>
                                        <input
                                            ref={hsnInputRef}
                                            type="text"
                                            name="hscode"
                                            className="it-form-input"
                                            value={formData.hscode}
                                            onChange={handleFormChange}
                                            placeholder="HSN Code"
                                            autoComplete="off"
                                            onKeyDown={(e) => handleFieldKeyDown(e, categorySelectRef)}
                                        />
                                    </div>
                                </div>

                                <div className="it-form-row">
                                    <div className="it-form-group it-form-group--half">
                                        <label className="it-form-label">Category <span className="it-required">*</span></label>
                                        <select
                                            ref={categorySelectRef}
                                            name="categoryId"
                                            className="it-form-select"
                                            value={formData.categoryId}
                                            onChange={handleFormChange}
                                            required
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    // Move to main unit instead of composition
                                                    if (compositionInputRef && compositionInputRef.current) {
                                                        compositionInputRef.current.focus();
                                                        compositionInputRef.current.click();
                                                    }
                                                }
                                            }}
                                        >
                                            <option value="">Select Category</option>
                                            {data.categories.map(category => (
                                                <option key={category.id || category._id} value={category.id || category._id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="it-form-group it-form-group--half">
                                        <label className="it-form-label">Composition</label>
                                        <div className="it-composition-input">
                                            <input
                                                ref={compositionInputRef}
                                                type="text"
                                                className="it-form-input"
                                                value={getCompositionDisplayNames()}
                                                readOnly
                                                placeholder="Press F6 or Click +"
                                                onClick={() => { }} // Empty onClick to prevent accidental opening
                                                onKeyDown={handleCompositionKeyDown}
                                                style={{ backgroundColor: '#f8f9fa', cursor: 'default' }}
                                            />
                                            <button
                                                ref={compositionButtonRef}
                                                type="button"
                                                className="it-btn-composition"
                                                onClick={() => setShowCompositionModal(true)}
                                                title="Add compositions (F6)"
                                            >
                                                <FiPlus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="it-form-row">
                                    <div className="it-form-group it-form-group--third">
                                        <label className="it-form-label">Main Unit</label>
                                        <select
                                            ref={mainUnitSelectRef}
                                            name="mainUnitId"
                                            className="it-form-select"
                                            value={formData.mainUnitId}
                                            onChange={handleFormChange}
                                            onKeyDown={(e) => handleFieldKeyDown(e, wsUnitInputRef)}
                                        >
                                            <option value="">Select Main Unit</option>
                                            {data.mainUnits.map(unit => (
                                                <option key={unit.id || unit._id} value={unit.id || unit._id}>
                                                    {unit.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="it-form-group it-form-group--third">
                                        <label className="it-form-label">WS Unit</label>
                                        <input
                                            ref={wsUnitInputRef}
                                            type="number"
                                            name="wsUnit"
                                            className="it-form-input"
                                            value={formData.wsUnit}
                                            onChange={handleFormChange}
                                            placeholder="0"
                                            step="any"
                                            onKeyDown={(e) => handleFieldKeyDown(e, unitSelectRef)}
                                        />
                                    </div>

                                    <div className="it-form-group it-form-group--third">
                                        <label className="it-form-label">Unit <span className="it-required">*</span></label>
                                        <select
                                            ref={unitSelectRef}
                                            name="unitId"
                                            className="it-form-select"
                                            value={formData.unitId}
                                            onChange={handleFormChange}
                                            required
                                            onKeyDown={(e) => handleFieldKeyDown(e, vatSelectRef)}
                                        >
                                            <option value="">Select Unit</option>
                                            {data.units.map(unit => (
                                                <option key={unit.id || unit._id} value={unit.id || unit._id}>
                                                    {unit.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="it-form-row">
                                    <div className="it-form-group it-form-group--third">
                                        <label className="it-form-label">VAT <span className="it-required">*</span></label>
                                        <select
                                            ref={vatSelectRef}
                                            name="vatStatus"
                                            className="it-form-select"
                                            value={formData.vatStatus}
                                            onChange={handleFormChange}
                                            required
                                            onKeyDown={(e) => handleFieldKeyDown(e, reorderInputRef)}
                                        >
                                            <option value="">Select VAT</option>
                                            {data.vatEnabled && <option value="13">13%</option>}
                                            <option value="vatExempt">VAT Exempt</option>
                                        </select>
                                    </div>

                                    <div className="it-form-group it-form-group--third">
                                        <label className="it-form-label">Re-Order Level</label>
                                        <input
                                            ref={reorderInputRef}
                                            type="number"
                                            name="reorderLevel"
                                            className="it-form-input"
                                            value={formData.reorderLevel}
                                            onChange={handleFormChange}
                                            placeholder="0"
                                            step="any"
                                            onKeyDown={(e) => handleFieldKeyDown(e, salesPriceInputRef)}
                                        />
                                    </div>

                                    <div className="it-form-group it-form-group--third">
                                        <label className="it-form-label">Sales Price</label>
                                        <input
                                            ref={salesPriceInputRef}
                                            type="number"
                                            name="price"
                                            className="it-form-input"
                                            value={formData.price}
                                            onChange={handleFormChange}
                                            placeholder="0.00"
                                            step="0.01"
                                            onKeyDown={(e) => handleFieldKeyDown(e, purchasePriceInputRef)}
                                        />
                                    </div>
                                </div>

                                <div className="it-form-row">
                                    <div className="it-form-group it-form-group--third">
                                        <label className="it-form-label">Purchase Price</label>
                                        <input
                                            ref={purchasePriceInputRef}
                                            type="number"
                                            name="puPrice"
                                            className="it-form-input"
                                            value={formData.puPrice}
                                            onChange={(e) => {
                                                const puPrice = parseFloat(e.target.value) || 0;
                                                const openingStock = parseFloat(formData.openingStock) || 0;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    puPrice: e.target.value,
                                                    openingStockBalance: (puPrice * openingStock).toFixed(2)
                                                }));
                                            }}
                                            placeholder="0.00"
                                            step="any"
                                            onKeyDown={(e) => handleFieldKeyDown(e, openingStockInputRef)}
                                        />
                                    </div>

                                    <div className="it-form-group it-form-group--third">
                                        <label className="it-form-label">Opening Stock
                                        </label>
                                        <input
                                            ref={openingStockInputRef}
                                            type="number"
                                            name="openingStock"
                                            className="it-form-input"
                                            value={formData.openingStock}
                                            onChange={(e) => {
                                                const openingStock = parseFloat(e.target.value) || 0;
                                                const puPrice = parseFloat(formData.puPrice) || 0;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    openingStock: e.target.value,
                                                    openingStockBalance: (puPrice * openingStock).toFixed(2)
                                                }));
                                            }}
                                            placeholder="0"
                                            step="any"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    // ✅ Move focus to Opening Value input
                                                    if (openingValueInputRef && openingValueInputRef.current) {
                                                        openingValueInputRef.current.focus();
                                                    }
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="it-form-group it-form-group--third">
                                        <label className="it-form-label">Opening Value</label>
                                        <input
                                            ref={openingValueInputRef}
                                            type="number"
                                            name="openingStockBalance"
                                            className="it-form-input it-form-input--readonly"
                                            value={formData.openingStockBalance}
                                            onChange={handleFormChange}
                                            readOnly={currentItem ? itemsWithTransactions[currentItem._id] : false && !isInitialFiscalYear}
                                            placeholder="0.00"
                                            autoComplete="off"
                                            step="any"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    // Move focus to the submit button
                                                    if (submitButtonRef && submitButtonRef.current) {
                                                        submitButtonRef.current.focus();
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Hidden Code field - value stored but not displayed */}
                                <div className="it-form-row" style={{ display: 'none' }}>
                                    <div className="it-form-group it-form-group--half">
                                        <label className="it-form-label">Code <span className="it-required">*</span></label>
                                        <div className="it-code-input">
                                            <input
                                                ref={uniqueNumberInputRef}
                                                type="number"
                                                name="uniqueNumber"
                                                className="it-form-input"
                                                value={formData.uniqueNumber || ''}
                                                onChange={handleUniqueNumberChange}
                                                readOnly={!!currentItem}
                                                required
                                                min="10001"
                                                max="99999"
                                                placeholder="Auto-generated"
                                            />
                                            {!currentItem && (
                                                <button
                                                    type="button"
                                                    className="it-btn-generate"
                                                    onClick={handleGenerateNumber}
                                                    title="Generate unique number (Ctrl+N)"
                                                >
                                                    <FiHash size={14} />
                                                </button>
                                            )}
                                        </div>
                                        {!currentItem && generatedUniqueNumber && (
                                            <small className="it-form-hint it-form-hint--success">
                                                ✓ Generated: {generatedUniqueNumber}
                                            </small>
                                        )}
                                    </div>
                                </div>

                                {/* Submit Button Row */}
                                <div className="it-form-row">
                                    <div className="it-form-group it-form-group--full">
                                        <div className="it-form-actions" style={{ justifyContent: 'flex-end' }}>
                                            <button
                                                ref={submitButtonRef}
                                                type="submit"
                                                className="it-btn-save"
                                                disabled={isSaving}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <span className="it-spinner-small"></span>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiSave size={14} /> {currentItem ? 'Update Item' : 'Add Item'}
                                                    </>
                                                )}
                                            </button>
                                            <small className="it-shortcut-hint">Alt+S</small>
                                        </div>
                                    </div>
                                </div>
                            </Form>
                        </div>
                    </div>
                </div>

                {/* Right Column - Items List */}
                <div className="it-list-section">
                    <div className="it-card it-card--list">
                        <div className="it-card-header it-card-header--list">
                            <div className="it-card-header-left">
                                <div className="it-card-header-icon it-card-header-icon--list">
                                    <FiGrid />
                                </div>
                                <div>
                                    <h5 className="it-card-title">Existing Items</h5>
                                    <small className="it-card-subtitle">
                                        {totalFilteredItems} items found
                                    </small>
                                </div>
                            </div>
                            <div className="it-card-actions">
                                <button className="it-btn-toolbar" onClick={() => navigate(-1)} title="Go back">
                                    <FiArrowLeft size={14} />
                                </button>
                                <button className="it-btn-toolbar" onClick={() => setShowPrintModal(true)} title="Print report">
                                    <FiPrinter size={14} />
                                </button>
                                <button className="it-btn-toolbar" onClick={() => exportToExcel(true)} disabled={exporting || data.items.length === 0} title="Export to Excel">
                                    {exporting ? <span className="it-spinner-small"></span> : <FiDownload size={14} />}
                                </button>
                                <button className="it-btn-toolbar" onClick={resetColumnWidths} title="Reset column widths">
                                    <FiRefreshCw size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="it-search-bar">
                            <div className="it-search-wrapper">
                                <FiSearch className="it-search-icon" />
                                <input
                                    type="text"
                                    className="it-search-input"
                                    placeholder="Search by Item Name, Code, Category, Company..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                                {searchTerm && (
                                    <button className="it-search-clear" onClick={() => setSearchTerm('')}>
                                        <FiX size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="it-table-wrapper" ref={tableContainerRef}>
                            {loading ? (
                                <div className="it-loading">
                                    <div className="it-spinner"></div>
                                    <p className="it-loading-text">Loading items...</p>
                                </div>
                            ) : paginatedItems.length === 0 ? (
                                <div className="it-empty">
                                    <FiBox className="it-empty-icon" size={32} />
                                    <h6 className="it-empty-title">No items found</h6>
                                    <p className="it-empty-text">
                                        {searchTerm ? 'Try a different search term' : 'Create your first item using the form'}
                                    </p>
                                </div>
                            ) : (
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth = 50 + columnWidths.name + columnWidths.company + columnWidths.category + columnWidths.code + columnWidths.vat + columnWidths.actions;
                                        return (
                                            <div style={{ height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List
                                                    key={`items-list-${paginatedItems.length}-${currentPage}`}
                                                    height={height - 30}
                                                    itemCount={paginatedItems.length}
                                                    itemSize={28}
                                                    width={Math.max(width, totalWidth)}
                                                    itemData={{ items: paginatedItems, isAdminOrSupervisor: data.isAdminOrSupervisor }}
                                                >
                                                    {TableRow}
                                                </List>
                                                {isLoadingMore && (
                                                    <div className="it-loading-more">
                                                        <div className="it-spinner-small"></div>
                                                        <span>Loading more items...</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            )}
                        </div>

                        <div className="it-table-footer">
                            <span className="it-footer-info">
                                Showing {paginatedItems.length} of {totalFilteredItems} items
                            </span>
                            {hasMoreItems && paginatedItems.length < totalFilteredItems && (
                                <button className="it-btn-load-more" onClick={loadMoreItems} disabled={isLoadingMore}>
                                    Load more...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Options Modal */}
            <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} centered size="md">
                <Modal.Header closeButton className="it-modal-header">
                    <div className="d-flex align-items-center">
                        <FiPrinter className="me-2" size={20} />
                        <div>
                            <span className="fw-bold fs-6">Print Items Report</span>
                            <small className="d-block opacity-75">Select filter options</small>
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body className="p-3">
                    <div className="it-print-options">
                        <h6 className="it-print-options-title">Filter Options</h6>
                        <div className="it-print-options-grid">
                            <button className={`it-print-option ${printOption === 'all' ? 'it-print-option--active' : ''}`} onClick={() => setPrintOption('all')}>
                                All Items
                            </button>
                            <button className={`it-print-option ${printOption === 'active' ? 'it-print-option--active' : ''}`} onClick={() => setPrintOption('active')}>
                                Active Only
                            </button>
                            <button className={`it-print-option ${printOption === '13' ? 'it-print-option--active' : ''}`} onClick={() => setPrintOption('13')}>
                                VAT Items
                            </button>
                            <button className={`it-print-option ${printOption === 'vatExempt' ? 'it-print-option--active' : ''}`} onClick={() => setPrintOption('vatExempt')}>
                                Exempt Only
                            </button>
                            <button className={`it-print-option ${printOption === 'category' ? 'it-print-option--active' : ''}`} onClick={() => setPrintOption('category')}>
                                By Category
                            </button>
                            <button className={`it-print-option ${printOption === 'itemsCompany' ? 'it-print-option--active' : ''}`} onClick={() => setPrintOption('itemsCompany')}>
                                By Company
                            </button>
                        </div>

                        {printOption === 'category' && (
                            <div className="mt-3">
                                <label className="it-form-label small fw-semibold">Select Category</label>
                                <select className="it-form-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                                    <option value="">All Categories</option>
                                    {data.categories.map(category => (
                                        <option key={category.id || category._id} value={category.id || category._id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {printOption === 'itemsCompany' && (
                            <div className="mt-3">
                                <label className="it-form-label small fw-semibold">Select Company</label>
                                <select className="it-form-select" value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>
                                    <option value="">All Companies</option>
                                    {data.itemsCompanies.map(company => (
                                        <option key={company.id || company._id} value={company.id || company._id}>{company.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </Modal.Body>
                <Modal.Footer className="py-2">
                    <button className="it-btn-secondary" onClick={() => setShowPrintModal(false)}>Cancel</button>
                    <button className="it-btn-primary" onClick={() => { printItems(); setShowPrintModal(false); }}>
                        <FiPrinter className="me-1" /> Print Report
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Composition Selection Modal */}
            <Modal show={showCompositionModal} onHide={() => setShowCompositionModal(false)} size="lg" centered>
                <Modal.Header closeButton className="it-modal-header">
                    <div className="d-flex align-items-center">
                        <FiEdit2 className="me-2" size={20} />
                        <span>Select Compositions</span>
                    </div>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <div className="it-composition-search">
                        <FiSearch className="it-composition-search-icon" />
                        <input
                            type="search"
                            className="it-composition-search-input"
                            placeholder="Search compositions by name or code..."
                            value={compositionSearch}
                            onChange={(e) => setCompositionSearch(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    const firstItem = document.querySelector('.it-composition-item');
                                    if (firstItem) {
                                        firstItem.focus();
                                    }
                                }
                            }}
                        />
                    </div>

                    <div className="it-composition-toolbar">
                        <small className="text-muted">Showing {filteredCompositions.length} of {data.composition.length} compositions</small>
                        <label className="it-checkbox-label">
                            <input
                                type="checkbox"
                                checked={selectedCompositions.length === filteredCompositions.length && filteredCompositions.length > 0}
                                onChange={handleSelectAllCompositions}
                            />
                            Select All
                        </label>
                    </div>

                    <div className="it-composition-list">
                        {filteredCompositions.length === 0 ? (
                            <div className="it-composition-empty">
                                <FiSearch size={32} className="text-muted" />
                                <p className="text-muted">No compositions found</p>
                                <small className="text-muted">Try a different search term</small>
                            </div>
                        ) : (
                            filteredCompositions.map(comp => (
                                <div
                                    key={comp.id || comp._id}
                                    className={`it-composition-item ${selectedCompositions.some(c => (c.id || c._id) === (comp.id || comp._id)) ? 'it-composition-item--selected' : ''}`}
                                    onClick={() => handleCompositionSelect(comp)}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleCompositionSelect(comp);
                                        }
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedCompositions.some(c => (c.id || c._id) === (comp.id || comp._id))}
                                        onChange={() => handleCompositionSelect(comp)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="it-composition-item-info">
                                        <div className="it-composition-item-name">{comp.name}</div>
                                        {comp.uniqueNumber && <span className="it-code-badge">#{comp.uniqueNumber}</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="d-flex justify-content-between w-100 align-items-center">
                        <div>
                            <Badge bg="primary" className="me-2">{selectedCompositions.length} selected</Badge>
                            <small className="text-muted">
                                {selectedCompositions.length > 0 ? selectedCompositions.map(c => c.name).join(', ') : 'No compositions selected'}
                            </small>
                        </div>
                        <div>
                            <button className="it-btn-secondary me-2" onClick={() => setShowCompositionModal(false)}>Cancel</button>
                            <button className="it-btn-primary" onClick={handleCompositionDone} disabled={selectedCompositions.length === 0}>
                                <FiCheck className="me-1" /> Apply Selected
                            </button>
                        </div>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Save Confirmation Modal */}
            <Modal show={showSaveConfirmModal} onHide={() => setShowSaveConfirmModal(false)} centered>
                <Modal.Header closeButton className="it-modal-header">
                    <Modal.Title>Confirm Save</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to save this item?</p>
                    {currentItem && (
                        <div className="alert alert-warning small">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            This will update the existing item: <strong>{currentItem.name}</strong>
                        </div>
                    )}
                    {formData.uniqueNumber && (
                        <div className="alert alert-info small">
                            <i className="bi bi-info-circle me-1"></i>
                            Unique Number: <strong>{formData.uniqueNumber}</strong>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className="it-btn-secondary" onClick={() => setShowSaveConfirmModal(false)}>Cancel</button>
                    <button className="it-btn-primary" onClick={() => { handleSubmit(); setShowSaveConfirmModal(false); }}>
                        {currentItem ? 'Update Item' : 'Create Item'}
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Product Modal */}
            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
        </div>
    );
};

export default Items;