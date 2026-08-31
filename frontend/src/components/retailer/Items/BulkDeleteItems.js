// BulkDeleteItems.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Header';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import Loader from '../../Loader';
import ProductModal from '../dashboard/modals/ProductModal';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import NotificationToast from '../../NotificationToast';
import { 
    FiTrash2, FiSearch, FiRefreshCw, FiCheckCircle, FiXCircle, 
    FiAlertCircle, FiFileText, FiInfo
} from 'react-icons/fi';
import './BulkDeleteItems.css';
import api from '../../services/api';

const BulkDeleteItems = () => {
    const navigate = useNavigate();
    const { draftSave, setDraftSave } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteResults, setDeleteResults] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const [loadingItems, setLoadingItems] = useState(false);
    const [companyInfo, setCompanyInfo] = useState({
        name: '',
        dateFormat: 'english',
        vatEnabled: true
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        checkbox: 40,
        uniqueNumber: 80,
        name: 200,
        category: 150,
        company: 150,
        unit: 80,
        price: 100,
        puPrice: 100,
        status: 80,
        createdAt: 100,
        actions: 120
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

    // Save state to draft context
    useEffect(() => {
        setDraftSave({
            ...draftSave,
            bulkDeleteData: {
                items: items,
                searchQuery: searchQuery,
                selectedItems: Array.from(selectedItems),
                selectedRowIndex: selectedRowIndex,
                currentPage: currentPage,
                itemsPerPage: itemsPerPage
            }
        });
    }, [items, searchQuery, selectedItems, selectedRowIndex, currentPage, itemsPerPage]);

    // Load saved state from draft context
    useEffect(() => {
        if (draftSave && draftSave.bulkDeleteData) {
            setItems(draftSave.bulkDeleteData.items || []);
            setSearchQuery(draftSave.bulkDeleteData.searchQuery || '');
            setSelectedItems(new Set(draftSave.bulkDeleteData.selectedItems || []));
            setSelectedRowIndex(draftSave.bulkDeleteData.selectedRowIndex || 0);
            setCurrentPage(draftSave.bulkDeleteData.currentPage || 1);
            setItemsPerPage(draftSave.bulkDeleteData.itemsPerPage || 10);
        }
    }, []);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('bulkDeleteTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('bulkDeleteTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // Fetch items
    const fetchItems = async () => {
        try {
            setLoadingItems(true);
            setError(null);
            
            const response = await api.get('/api/retailer/items');

            console.log('API Response:', response.data);

            if (response.data && response.data.success) {
                const itemsData = response.data.items || [];
                
                console.log('Items data:', itemsData);
                
                setItems(itemsData);
                setFilteredItems(itemsData);
                
                if (response.data.currentCompany) {
                    setCompanyInfo({
                        name: response.data.currentCompany.name || '',
                        dateFormat: response.data.companyDateFormat || 'english',
                        vatEnabled: response.data.vatEnabled || false
                    });
                }
                
                setSelectedItems(new Set());
                setSelectAll(false);
                setCurrentPage(1);
            } else {
                setError(response.data?.error || 'Failed to fetch items');
                setItems([]);
                setFilteredItems([]);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.response?.data?.error || 'Failed to fetch items');
            setItems([]);
            setFilteredItems([]);
        } finally {
            setLoadingItems(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchItems();
    }, []);

    // Filter items based on search
    useEffect(() => {
        if (!items.length) {
            setFilteredItems([]);
            return;
        }

        const query = searchQuery.toLowerCase().trim();
        if (!query) {
            setFilteredItems(items);
            return;
        }

        const filtered = items.filter(item => {
            return (
                (item.name?.toLowerCase() || '').includes(query) ||
                (item.uniqueNumber?.toString() || '').includes(query) ||
                (item.categoryName?.toLowerCase() || '').includes(query) ||
                (item.itemsCompanyName?.toLowerCase() || '').includes(query) ||
                (item.hscode?.toLowerCase() || '').includes(query)
            );
        });

        setFilteredItems(filtered);
        if (selectedRowIndex >= filtered.length && filtered.length > 0) {
            setSelectedRowIndex(0);
        }
        // Reset to page 1 when filtering
        setCurrentPage(1);
    }, [items, searchQuery]);

    // Get current page items
    const currentPageItems = useMemo(() => {
        if (itemsPerPage === 'all') return filteredItems;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredItems.slice(startIndex, endIndex);
    }, [filteredItems, itemsPerPage, currentPage]);

    const totalPages = useMemo(() => {
        if (itemsPerPage === 'all') return 1;
        return Math.ceil(filteredItems.length / itemsPerPage);
    }, [filteredItems.length, itemsPerPage]);

    // Handle select all on current page
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedItems(new Set());
        } else {
            const allIds = currentPageItems.map(item => item.id || item._id);
            setSelectedItems(new Set(allIds));
        }
        setSelectAll(!selectAll);
    };

    const handleSelectItem = (itemId) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
        // Check if all items on current page are selected
        const allIds = currentPageItems.map(item => item.id || item._id);
        setSelectAll(allIds.every(id => newSelected.has(id)));
    };

    const handleRowClick = useCallback((index) => {
        setSelectedRowIndex(index);
        const item = currentPageItems[index];
        if (item) {
            const itemId = item.id || item._id;
            if (itemId) {
                handleSelectItem(itemId);
            }
        }
    }, [currentPageItems]);

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) {
            setNotification({
                show: true,
                message: 'Please select at least one item to delete',
                type: 'warning'
            });
            return;
        }

        const itemIds = Array.from(selectedItems);
        const itemsToDelete = filteredItems.filter(item => {
            const id = item.id || item._id;
            return selectedItems.has(id);
        });
        const itemNames = itemsToDelete.map(item => item.name).join(', ');

        if (!window.confirm(
            `Are you sure you want to delete ${selectedItems.size} item(s)?\n\n` +
            `Items: ${itemNames}\n\n` +
            `⚠️ Warning: This action cannot be undone. Items with related transactions cannot be deleted.`
        )) {
            return;
        }

        setDeleting(true);
        setError(null);

        try {
            const response = await api.delete('/api/retailer/items/bulk', {
                data: { itemIds }
            });

            if (response.data.success) {
                const resultData = response.data.data || response.data;
                setDeleteResults(resultData);
                setShowResults(true);

                const deletedIds = resultData.results
                    ?.filter(r => r.success)
                    ?.map(r => r.itemId) || [];

                if (deletedIds.length > 0) {
                    setItems(prev => prev.filter(item => {
                        const id = item.id || item._id;
                        return !deletedIds.includes(id);
                    }));
                }
                setSelectedItems(new Set());
                setSelectAll(false);
                setCurrentPage(1);

                setNotification({
                    show: true,
                    message: `Successfully deleted ${resultData.deletedCount || deletedIds.length} out of ${resultData.totalRequested || selectedItems.size} items`,
                    type: resultData.success ? 'success' : 'warning'
                });
            } else {
                setError(response.data.error || 'Failed to delete items');
                setNotification({
                    show: true,
                    message: response.data.error || 'Failed to delete items',
                    type: 'error'
                });
            }
        } catch (err) {
            console.error('Delete error:', err);
            const errorMsg = err.response?.data?.error || 'Failed to delete items';
            setError(errorMsg);
            setNotification({
                show: true,
                message: errorMsg,
                type: 'error'
            });
        } finally {
            setDeleting(false);
        }
    };

    const resetColumnWidths = () => {
        setColumnWidths({
            checkbox: 40,
            uniqueNumber: 80,
            name: 200,
            category: 150,
            company: 150,
            unit: 80,
            price: 100,
            puPrice: 100,
            status: 80,
            createdAt: 100,
            actions: 120
        });
        setNotification({
            show: true,
            message: 'Column widths reset',
            type: 'success',
            duration: 2000
        });
    };

    const formatCurrency = useCallback((num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, []);

    const getStatusBadge = (status) => {
        const statusMap = {
            'active': { label: 'Active', class: 'bd-status--active' },
            'inactive': { label: 'Inactive', class: 'bd-status--inactive' },
            'discontinued': { label: 'Discontinued', class: 'bd-status--discontinued' }
        };
        const s = statusMap[status?.toLowerCase()] || { label: status || 'Unknown', class: 'bd-status--unknown' };
        return <span className={`bd-status ${s.class}`}>{s.label}</span>;
    };

    const handlePageChange = useCallback((newPage) => {
        if (itemsPerPage === 'all') return;
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            setSelectedRowIndex(0);
        }
    }, [itemsPerPage, totalPages]);

    // Resize Handle Component
    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => {
        return (
            <div
                className="bd-resize-handle"
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

    // Table Header Component
    const TableHeader = React.memo(() => {
        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="bd-header"
                style={{
                    minWidth: `${totalWidth}px`,
                    zIndex: 2,
                    height: '28px'
                }}
                onMouseMove={(e) => {
                    if (isResizing && resizingColumn) {
                        const diff = e.clientX - startX;
                        const newWidth = Math.max(40, startWidth + diff);
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
                <div className="bd-header-cell bd-header-cell--center" style={{ width: `${columnWidths.checkbox}px`, flexShrink: 0, minWidth: '40px' }}>
                    <input
                        type="checkbox"
                        checked={selectAll && currentPageItems.length > 0}
                        onChange={handleSelectAll}
                        disabled={currentPageItems.length === 0}
                        className="bd-checkbox"
                    />
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.checkbox - 2} columnName="checkbox" />
                </div>

                <div className="bd-header-cell bd-header-cell--center" style={{ width: `${columnWidths.uniqueNumber}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong>#</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.uniqueNumber - 2} columnName="uniqueNumber" />
                </div>

                <div className="bd-header-cell" style={{ width: `${columnWidths.name}px`, flexShrink: 0, minWidth: '120px' }}>
                    <strong>Item Name</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.name - 2} columnName="name" />
                </div>

                <div className="bd-header-cell" style={{ width: `${columnWidths.category}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong>Category</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.category - 2} columnName="category" />
                </div>

                <div className="bd-header-cell" style={{ width: `${columnWidths.company}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong>Company</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.company - 2} columnName="company" />
                </div>

                <div className="bd-header-cell" style={{ width: `${columnWidths.unit}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong>Unit</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.unit - 2} columnName="unit" />
                </div>

                <div className="bd-header-cell bd-header-cell--end" style={{ width: `${columnWidths.price}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>Price</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.price - 2} columnName="price" />
                </div>

                <div className="bd-header-cell bd-header-cell--end" style={{ width: `${columnWidths.puPrice}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>PU Price</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.puPrice - 2} columnName="puPrice" />
                </div>

                <div className="bd-header-cell" style={{ width: `${columnWidths.status}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong>Status</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.status - 2} columnName="status" />
                </div>

                <div className="bd-header-cell" style={{ width: `${columnWidths.createdAt}px`, flexShrink: 0, minWidth: '90px' }}>
                    <strong>Created</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.createdAt - 2} columnName="createdAt" />
                </div>

                <div className="bd-header-cell" style={{ width: `${columnWidths.actions}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong>Actions</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.actions - 2} columnName="actions" />
                </div>

                {isResizing && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, cursor: 'col-resize' }} />
                )}
            </div>
        );
    });

    // Table Row Component
    const TableRow = React.memo(({ index, style, data: rowData }) => {
        const { items: rowItems, selectedItems, selectedRowIndex, formatCurrency, handleRowClick, handleSelectItem } = rowData;
        const item = rowItems[index];

        if (!item) return null;

        const itemId = item.id || item._id;
        const isSelected = selectedRowIndex === index;
        const isChecked = selectedItems.has(itemId);

        const handleCheckboxChange = (e) => {
            e.stopPropagation();
            if (itemId) {
                handleSelectItem(itemId);
            }
        };

        return (
            <div
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    height: '28px',
                    minHeight: '28px',
                    padding: '0',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    backgroundColor: isChecked ? '#dbeafe' : (isSelected ? '#eff6ff' : (index % 2 === 0 ? '#f8fafc' : 'white'))
                }}
                className="bd-row"
                onClick={() => handleRowClick(index)}
            >
                <div className="bd-cell bd-cell--center" style={{ width: `${columnWidths.checkbox}px`, flexShrink: 0, height: '100%' }}>
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={handleCheckboxChange}
                        onClick={(e) => e.stopPropagation()}
                        className="bd-checkbox"
                    />
                </div>

                <div className="bd-cell bd-cell--center" style={{ width: `${columnWidths.uniqueNumber}px`, flexShrink: 0, height: '100%' }}>
                    <span className="bd-unique-number">{item.uniqueNumber || '-'}</span>
                </div>

                <div className="bd-cell" style={{ width: `${columnWidths.name}px`, flexShrink: 0, height: '100%' }} title={item.name}>
                    <span className="bd-item-name">{item.name || 'N/A'}</span>
                </div>

                <div className="bd-cell" style={{ width: `${columnWidths.category}px`, flexShrink: 0, height: '100%' }}>
                    <span className="bd-category">{item.categoryName || '-'}</span>
                </div>

                <div className="bd-cell" style={{ width: `${columnWidths.company}px`, flexShrink: 0, height: '100%' }}>
                    <span className="bd-company">{item.itemsCompanyName || '-'}</span>
                </div>

                <div className="bd-cell" style={{ width: `${columnWidths.unit}px`, flexShrink: 0, height: '100%' }}>
                    <span className="bd-unit">{item.unitName || '-'}</span>
                </div>

                <div className="bd-cell bd-cell--end" style={{ width: `${columnWidths.price}px`, flexShrink: 0, height: '100%' }}>
                    <span className="bd-price">{formatCurrency(item.price)}</span>
                </div>

                <div className="bd-cell bd-cell--end" style={{ width: `${columnWidths.puPrice}px`, flexShrink: 0, height: '100%' }}>
                    <span className="bd-pu-price">{formatCurrency(item.puPrice)}</span>
                </div>

                <div className="bd-cell" style={{ width: `${columnWidths.status}px`, flexShrink: 0, height: '100%' }}>
                    {getStatusBadge(item.status)}
                </div>

                <div className="bd-cell bd-cell--center" style={{ width: `${columnWidths.createdAt}px`, flexShrink: 0, height: '100%' }}>
                    <span className="bd-created-at">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}</span>
                </div>

                <div className="bd-cell bd-cell--center" style={{ width: `${columnWidths.actions}px`, flexShrink: 0, height: '100%' }}>
                    <button
                        className="bd-btn-action bd-btn-action--view"
                        onClick={(e) => { e.stopPropagation(); navigate(`/retailer/items/${itemId}`); }}
                        title="View Item"
                    >
                        <FiInfo size={12} />
                    </button>
                    <button
                        className="bd-btn-action bd-btn-action--delete"
                        onClick={(e) => { e.stopPropagation(); if (itemId) handleSelectItem(itemId); }}
                        title="Select for Deletion"
                    >
                        <FiTrash2 size={12} />
                    </button>
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
        if (prevProps.style !== nextProps.style) return false;
        const prevItem = prevProps.data.items[prevProps.index];
        const nextItem = nextProps.data.items[nextProps.index];
        return prevItem === nextItem && 
               prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex &&
               prevProps.data.selectedItems.size === nextProps.data.selectedItems.size;
    });

    // Results Modal Component
    const ResultsModal = ({ results, onClose }) => {
        if (!results) return null;

        const { success, totalRequested, deletedCount, failedCount, results: itemResults } = results;

        return (
            <div className="bd-modal-overlay" onClick={onClose}>
                <div className="bd-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="bd-modal-header">
                        <h3 className="bd-modal-title">
                            {success ? (
                                <><FiCheckCircle className="bd-icon-success" /> Deletion Complete</>
                            ) : (
                                <><FiAlertCircle className="bd-icon-warning" /> Deletion Results</>
                            )}
                        </h3>
                        <button className="bd-modal-close" onClick={onClose}>×</button>
                    </div>
                    <div className="bd-modal-body">
                        <div className="bd-results-summary">
                            <div className="bd-result-stat">
                                <span className="bd-result-label">Total Requested</span>
                                <span className="bd-result-value">{totalRequested || 0}</span>
                            </div>
                            <div className="bd-result-stat bd-result-stat--success">
                                <span className="bd-result-label">Deleted</span>
                                <span className="bd-result-value">{deletedCount || 0}</span>
                            </div>
                            <div className="bd-result-stat bd-result-stat--danger">
                                <span className="bd-result-label">Failed</span>
                                <span className="bd-result-value">{failedCount || 0}</span>
                            </div>
                        </div>

                        {itemResults && itemResults.length > 0 && (
                            <div className="bd-results-list">
                                <div className="bd-results-header">
                                    <span>Item</span>
                                    <span>Status</span>
                                    <span>Message</span>
                                </div>
                                {itemResults.map((result, idx) => (
                                    <div key={idx} className={`bd-result-item ${result.success ? 'bd-result-item--success' : 'bd-result-item--error'}`}>
                                        <span className="bd-result-item-name">{result.itemName || result.itemId}</span>
                                        <span className="bd-result-item-status">
                                            {result.success ? (
                                                <FiCheckCircle className="bd-icon-success" />
                                            ) : (
                                                <FiXCircle className="bd-icon-error" />
                                            )}
                                            {result.status || (result.success ? 'Deleted' : 'Failed')}
                                        </span>
                                        <span className="bd-result-item-message">{result.errorMessage || 'OK'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="bd-modal-footer">
                        <button className="bd-btn bd-btn-primary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        );
    };

    if (loadingItems && items.length === 0) return <Loader />;

    return (
        <div className="bd-page">
            <Header />

            <div className="bd-shell">
                {/* Top Bar */}
                <div className="bd-topbar">
                    <div className="bd-topbar__left">
                        <div className="bd-topbar__icon"><FiTrash2 /></div>
                        <div><h1>Bulk Delete Items</h1></div>
                    </div>
                    <div className="bd-topbar__actions">
                        <button className="bd-btn-icon" onClick={fetchItems} disabled={loadingItems}>
                            <FiRefreshCw className={loadingItems ? 'bd-spin' : ''} /> Refresh
                        </button>
                        <button className="bd-btn-icon" onClick={resetColumnWidths} title="Reset columns">
                            <FiRefreshCw /> Reset
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bd-toolbar">
                    <div className="bd-field bd-field--search">
                        <label>Search Items</label>
                        <div className="bd-search-wrap">
                            <FiSearch className="bd-search-icon" />
                            <input
                                type="text"
                                id="searchInput"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Name, category..."
                                autoComplete="off"
                            />
                            {searchQuery && (
                                <button className="bd-search-clear" onClick={() => {
                                    setSearchQuery('');
                                }}>×</button>
                            )}
                        </div>
                    </div>

                    <div className="bd-field bd-field--select">
                        <label>Rows</label>
                        <select 
                            value={itemsPerPage} 
                            onChange={(e) => {
                                setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                                setCurrentPage(1);
                            }}
                            disabled={filteredItems.length === 0}
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>

                    <div className="bd-field bd-field--info">
                        <span className="bd-selection-info">
                            <FiInfo className="bd-info-icon" />
                            <strong>{selectedItems.size}</strong> selected out of <strong>{filteredItems.length}</strong> items
                        </span>
                    </div>

                    {error && (
                        <div className="bd-alert">
                            <FiAlertCircle /> {error}
                            <button type="button" className="bd-alert-close" onClick={() => setError(null)}>×</button>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="bd-main">
                    {items.length === 0 && !loadingItems ? (
                        <div className="bd-state">
                            <FiFileText size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>No items found</h3>
                            <p>Create items first to enable bulk deletion</p>
                            <button 
                                className="bd-btn bd-btn-primary" 
                                onClick={() => navigate('/retailer/items/create')}
                                style={{ marginTop: '0.5rem' }}
                            >
                                Create Item
                            </button>
                        </div>
                    ) : loadingItems ? (
                        <div className="bd-state"><div className="spinner-border text-primary" /><p>Loading items...</p></div>
                    ) : filteredItems.length === 0 ? (
                        <div className="bd-state">
                            <FiSearch size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>No items match your search</h3>
                            <p>Try a different search term</p>
                        </div>
                    ) : (
                        <>
                            <div className="bd-main__bar">
                                <span>
                                    <strong>{filteredItems.length}</strong> items found
                                    {selectedItems.size > 0 && (
                                        <span className="bd-selected-count">
                                            <FiCheckCircle className="bd-icon-success" /> {selectedItems.size} selected
                                        </span>
                                    )}
                                </span>
                                <span>
                                    <button 
                                        className="bd-btn bd-btn-sm bd-btn-danger" 
                                        onClick={handleBulkDelete} 
                                        disabled={selectedItems.size === 0 || deleting}
                                    >
                                        {deleting ? 'Deleting...' : `Delete Selected (${selectedItems.size})`}
                                    </button>
                                </span>
                            </div>
                            <div className="bd-table-wrap">
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);
                                        return (
                                            <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List
                                                    height={height - 28}
                                                    itemCount={currentPageItems.length}
                                                    itemSize={28}
                                                    width={Math.max(width, totalWidth)}
                                                    itemData={{
                                                        items: currentPageItems,
                                                        selectedItems,
                                                        selectedRowIndex,
                                                        formatCurrency,
                                                        handleRowClick,
                                                        handleSelectItem
                                                    }}
                                                >
                                                    {TableRow}
                                                </List>
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            </div>

                            {/* Pagination */}
                            {itemsPerPage !== 'all' && totalPages > 1 && (
                                <div className="bd-pager">
                                    <span>
                                        {filteredItems.length > 0 ? 
                                            `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filteredItems.length)} of ${filteredItems.length}` : 
                                            '0 of 0'}
                                    </span>
                                    <nav>
                                        <ul className="pagination pagination-sm mb-0">
                                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>‹</button>
                                            </li>
                                            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                                let p = totalPages <= 5 ? i + 1 : 
                                                    (currentPage <= 3 ? i + 1 : 
                                                    (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
                                                return (
                                                    <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                                                        <button className="page-link" onClick={() => handlePageChange(p)}>{p}</button>
                                                    </li>
                                                );
                                            })}
                                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>›</button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Product modal */}
            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}

            {/* Results Modal */}
            {showResults && deleteResults && (
                <ResultsModal 
                    results={deleteResults} 
                    onClose={() => {
                        setShowResults(false);
                        setDeleteResults(null);
                    }} 
                />
            )}

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

export default BulkDeleteItems;