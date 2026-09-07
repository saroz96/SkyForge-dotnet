// // src/components/retailer/dashboard/modals/DailyInventorySummary.js
// import React, { useState, useEffect, useCallback } from 'react';
// import axios from 'axios';
// import './DailyInventorySummary.css';

// const DailyInventorySummary = ({ show, onClose, companyId }) => {
//     const [loading, setLoading] = useState(false);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [inventoryData, setInventoryData] = useState({
//         totalStockQuantity: 0,
//         totalStockValue: 0,
//         totalItems: 0,
//         currentPage: 1,
//         pageSize: 10,
//         totalPages: 0,
//         items: []
//     });
//     const [expandedItem, setExpandedItem] = useState(null);
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success'
//     });
//     const [currentPage, setCurrentPage] = useState(1);
//     const [rowsPerPage, setRowsPerPage] = useState(10);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     api.interceptors.request.use(
//         (config) => {
//             const token = localStorage.getItem('token');
//             if (token) {
//                 config.headers.Authorization = `Bearer ${token}`;
//             }
//             return config;
//         },
//         (error) => Promise.reject(error)
//     );

//     const formatCurrency = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         return number.toLocaleString('en-IN', {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         });
//     };

//     const formatNumber = (num) => {
//         return Number(num || 0).toLocaleString('en-IN');
//     };

//     const fetchInventoryData = useCallback(async () => {
//         if (!companyId) {
//             setNotification({
//                 show: true,
//                 message: 'Company not selected',
//                 type: 'error'
//             });
//             return;
//         }

//         setLoading(true);
//         try {
//             const params = new URLSearchParams();
//             params.append('companyId', companyId);
//             params.append('page', currentPage);
//             params.append('pageSize', rowsPerPage);
//             if (searchTerm) {
//                 params.append('searchTerm', searchTerm);
//             }

//             const response = await api.get(`/api/retailer/inventory-stock?${params.toString()}`);

//             if (response.data.success) {
//                 const data = response.data.data;
//                 setInventoryData({
//                     totalStockQuantity: data.totalStockQuantity || 0,
//                     totalStockValue: data.totalStockValue || 0,
//                     totalItems: data.totalItems || 0,
//                     currentPage: data.currentPage || 1,
//                     pageSize: data.pageSize || 10,
//                     totalPages: data.totalPages || 0,
//                     items: data.items || []
//                 });
//             } else {
//                 setNotification({
//                     show: true,
//                     message: response.data.error || 'Failed to fetch inventory data',
//                     type: 'error'
//                 });
//             }
//         } catch (error) {
//             console.error('Error fetching inventory data:', error);
//             setNotification({
//                 show: true,
//                 message: error.response?.data?.error || 'Failed to fetch inventory data',
//                 type: 'error'
//             });
//         } finally {
//             setLoading(false);
//         }
//     }, [companyId, currentPage, rowsPerPage, searchTerm]);

//     useEffect(() => {
//         if (show && companyId) {
//             fetchInventoryData();
//         }
//     }, [show, companyId, currentPage, rowsPerPage, searchTerm, fetchInventoryData]);

//     const handleSearch = (e) => {
//         e.preventDefault();
//         setCurrentPage(1);
//     };

//     const handleClearSearch = () => {
//         setSearchTerm('');
//         setCurrentPage(1);
//     };

//     const handlePageChange = (pageNumber) => {
//         setCurrentPage(pageNumber);
//     };

//     const handleRowsPerPageChange = (e) => {
//         setRowsPerPage(parseInt(e.target.value));
//         setCurrentPage(1);
//     };

//     const toggleExpandItem = (itemId) => {
//         setExpandedItem(expandedItem === itemId ? null : itemId);
//     };

//     const getExpiryStatusBadge = (status) => {
//         const statusMap = {
//             'safe': { bg: 'success', label: 'Safe' },
//             'warning': { bg: 'warning', label: 'Expiring Soon' },
//             'danger': { bg: 'danger', label: 'Expiring' },
//             'expired': { bg: 'dark', label: 'Expired' }
//         };
//         return statusMap[status] || { bg: 'secondary', label: 'Unknown' };
//     };

//     const getStockLevelBadge = (quantity) => {
//         if (quantity === 0) return { bg: 'danger', label: 'Out of Stock' };
//         if (quantity < 10) return { bg: 'warning', label: 'Low Stock' };
//         if (quantity < 50) return { bg: 'info', label: 'Medium Stock' };
//         return { bg: 'success', label: 'In Stock' };
//     };

//     const goToPreviousPage = () => {
//         if (currentPage > 1) {
//             setCurrentPage(currentPage - 1);
//         }
//     };

//     const goToNextPage = () => {
//         if (currentPage < inventoryData.totalPages) {
//             setCurrentPage(currentPage + 1);
//         }
//     };

//     const getPageNumbers = () => {
//         const totalPages = inventoryData.totalPages;
//         const current = currentPage;
//         const delta = 2;
//         const range = [];
//         const rangeWithDots = [];
//         let l;

//         for (let i = 1; i <= totalPages; i++) {
//             if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)) {
//                 range.push(i);
//             }
//         }

//         range.forEach((i) => {
//             if (l) {
//                 if (i - l === 2) {
//                     rangeWithDots.push(l + 1);
//                 } else if (i - l !== 1) {
//                     rangeWithDots.push('...');
//                 }
//             }
//             rangeWithDots.push(i);
//             l = i;
//         });

//         return rangeWithDots;
//     };

//     if (!show) return null;

//     return (
//         <>
//             <div
//                 className="dis-modal-overlay"
//                 onClick={(e) => {
//                     if (e.target === e.currentTarget) onClose();
//                 }}
//             >
//                 <div className="dis-modal">
//                     {/* Header */}
//                     <div className="dis-modal-header">
//                         <div className="dis-modal-header-left">
//                             <div className="dis-modal-header-icon">
//                                 <i className="bi bi-box-seam"></i>
//                             </div>
//                             <div>
//                                 <h5 className="dis-modal-title">Inventory Stock Summary</h5>
//                                 <small className="dis-modal-subtitle">
//                                     Total {inventoryData.totalItems} items in stock
//                                 </small>
//                             </div>
//                         </div>
//                         <button
//                             type="button"
//                             className="dis-modal-close"
//                             onClick={onClose}
//                         >
//                             <i className="bi bi-x-lg"></i>
//                         </button>
//                     </div>

//                     <div className="dis-modal-body">
//                         {/* Stats Cards */}
//                         <div className="dis-stats-row">
//                             <div className="dis-stat-card">
//                                 <div className="dis-stat-card-body">
//                                     <div>
//                                         <small className="dis-stat-label">Total Items</small>
//                                         <h5 className="dis-stat-value">{formatNumber(inventoryData.totalItems)}</h5>
//                                     </div>
//                                     <div className="dis-stat-icon dis-stat-icon--purple">
//                                         <i className="bi bi-grid-3x3-gap-fill"></i>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="dis-stat-card">
//                                 <div className="dis-stat-card-body">
//                                     <div>
//                                         <small className="dis-stat-label">Total Quantity</small>
//                                         <h5 className="dis-stat-value">{formatNumber(inventoryData.totalStockQuantity)}</h5>
//                                     </div>
//                                     <div className="dis-stat-icon dis-stat-icon--pink">
//                                         <i className="bi bi-cubes"></i>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="dis-stat-card">
//                                 <div className="dis-stat-card-body">
//                                     <div>
//                                         <small className="dis-stat-label">Total Stock Value</small>
//                                         <h5 className="dis-stat-value dis-stat-value--blue">
//                                             Rs. {formatCurrency(inventoryData.totalStockValue)}
//                                         </h5>
//                                     </div>
//                                     <div className="dis-stat-icon dis-stat-icon--blue">
//                                         {/* <i className="bi bi-currency-rupee"></i> */}
//                                         <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Rs.</span>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Search Bar */}
//                         <div className="dis-search-card">
//                             <div className="dis-search-card-body">
//                                 <form onSubmit={handleSearch} className="dis-search-form">
//                                     <div className="dis-search-input-wrap">
//                                         <i className="bi bi-search dis-search-icon"></i>
//                                         <input
//                                             type="text"
//                                             className="dis-search-input"
//                                             placeholder="Search by Item Name, Code, Batch, Supplier, Bill No..."
//                                             value={searchTerm}
//                                             onChange={(e) => setSearchTerm(e.target.value)}
//                                         />
//                                     </div>
//                                     <button type="submit" className="dis-btn-primary dis-btn-search">
//                                         <i className="bi bi-search me-1"></i> Search
//                                     </button>
//                                     {searchTerm && (
//                                         <button
//                                             type="button"
//                                             className="dis-btn-outline"
//                                             onClick={handleClearSearch}
//                                         >
//                                             <i className="bi bi-x-lg"></i>
//                                         </button>
//                                     )}
//                                 </form>
//                             </div>
//                         </div>

//                         {/* Table */}
//                         <div className="dis-table-card">
//                             <div className="dis-table-card-body">
//                                 {loading ? (
//                                     <div className="dis-loading">
//                                         <div className="dis-spinner"></div>
//                                         <p className="dis-loading-text">Loading inventory data...</p>
//                                     </div>
//                                 ) : (
//                                     <>
//                                         <div className="dis-table-wrap">
//                                             <table className="dis-table">
//                                                 <thead className="dis-table-header">
//                                                     <tr>
//                                                         <th style={{ width: '5%' }}>#</th>
//                                                         <th style={{ width: '8%' }}>Code</th>
//                                                         <th style={{ width: '18%' }}>Item Name</th>
//                                                         <th style={{ width: '10%' }}>Category</th>
//                                                         <th style={{ width: '6%' }}>Unit</th>
//                                                         <th style={{ width: '10%', textAlign: 'right' }}>Qty</th>
//                                                         <th style={{ width: '12%', textAlign: 'right' }}>Value</th>
//                                                         <th style={{ width: '10%', textAlign: 'center' }}>Batches</th>
//                                                         <th style={{ width: '10%', textAlign: 'center' }}>Status</th>
//                                                         <th style={{ width: '8%', textAlign: 'center' }}>Actions</th>
//                                                     </tr>
//                                                 </thead>
//                                                 <tbody>
//                                                     {inventoryData.items.length > 0 ? (
//                                                         inventoryData.items.map((item, index) => {
//                                                             const stockStatus = getStockLevelBadge(item.totalStock);
//                                                             const isExpanded = expandedItem === item.itemId;
//                                                             return (
//                                                                 <React.Fragment key={item.itemId}>
//                                                                     <tr
//                                                                         className="dis-table-row"
//                                                                         onClick={() => toggleExpandItem(item.itemId)}
//                                                                     >
//                                                                         <td className="dis-row-index">
//                                                                             {((currentPage - 1) * rowsPerPage) + index + 1}
//                                                                         </td>
//                                                                         <td>
//                                                                             <span className="dis-badge-code">
//                                                                                 {item.uniqueNumber || 'N/A'}
//                                                                             </span>
//                                                                         </td>
//                                                                         <td className="dis-item-name">
//                                                                             <strong>{item.itemName}</strong>
//                                                                         </td>
//                                                                         <td className="dis-muted">{item.categoryName || 'N/A'}</td>
//                                                                         <td className="dis-muted">{item.unitName || 'N/A'}</td>
//                                                                         <td style={{ textAlign: 'right' }}>
//                                                                             <span className="dis-qty-value">
//                                                                                 {formatNumber(item.totalStock)}
//                                                                             </span>
//                                                                         </td>
//                                                                         <td style={{ textAlign: 'right' }}>
//                                                                             <span className="dis-value-text">
//                                                                                 Rs. {formatCurrency(item.totalValue)}
//                                                                             </span>
//                                                                         </td>
//                                                                         <td style={{ textAlign: 'center' }}>
//                                                                             <span className="dis-badge-batches">
//                                                                                 {item.batches.length}
//                                                                             </span>
//                                                                         </td>
//                                                                         <td style={{ textAlign: 'center' }}>
//                                                                             <span className={`dis-badge-stock dis-badge-stock--${stockStatus.bg}`}>
//                                                                                 {stockStatus.label}
//                                                                             </span>
//                                                                         </td>
//                                                                         <td style={{ textAlign: 'center' }}>
//                                                                             <button
//                                                                                 className={`dis-btn-expand ${isExpanded ? 'dis-btn-expand--active' : ''}`}
//                                                                                 onClick={(e) => {
//                                                                                     e.stopPropagation();
//                                                                                     toggleExpandItem(item.itemId);
//                                                                                 }}
//                                                                             >
//                                                                                 <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
//                                                                             </button>
//                                                                         </td>
//                                                                     </tr>
//                                                                     {isExpanded && item.batches.length > 0 && (
//                                                                         <tr>
//                                                                             <td colSpan="10" className="dis-expanded-row">
//                                                                                 <div className="dis-expanded-content">
//                                                                                     <div className="dis-expanded-table-wrap">
//                                                                                         <table className="dis-expanded-table">
//                                                                                             <thead>
//                                                                                                 <tr>
//                                                                                                     <th>Batch</th>
//                                                                                                     <th>Expiry</th>
//                                                                                                     <th style={{ textAlign: 'right' }}>Qty</th>
//                                                                                                     <th style={{ textAlign: 'right' }}>Pu Price</th>
//                                                                                                     <th style={{ textAlign: 'right' }}>MRP</th>
//                                                                                                     <th>Supplier</th>
//                                                                                                     <th>Bill No</th>
//                                                                                                     <th>Status</th>
//                                                                                                     <th>Store</th>
//                                                                                                     <th>Rack</th>
//                                                                                                 </tr>
//                                                                                             </thead>
//                                                                                             <tbody>
//                                                                                                 {item.batches.map((batch, idx) => {
//                                                                                                     const expiryStatus = getExpiryStatusBadge(batch.expiryStatus);
//                                                                                                     return (
//                                                                                                         <tr key={idx}>
//                                                                                                             <td className="dis-batch-number">
//                                                                                                                 {batch.batchNumber || 'N/A'}
//                                                                                                             </td>
//                                                                                                             <td className="dis-muted">
//                                                                                                                 {batch.expiryDate || 'N/A'}
//                                                                                                             </td>
//                                                                                                             <td style={{ textAlign: 'right', fontWeight: '500' }}>
//                                                                                                                 {formatNumber(batch.quantity)}
//                                                                                                             </td>
//                                                                                                             <td style={{ textAlign: 'right' }}>
//                                                                                                                 Rs. {formatCurrency(batch.puPrice)}
//                                                                                                             </td>
//                                                                                                             <td style={{ textAlign: 'right' }}>
//                                                                                                                 Rs. {formatCurrency(batch.mrp)}
//                                                                                                             </td>
//                                                                                                             <td className="dis-muted">
//                                                                                                                 {batch.supplierName || 'N/A'}
//                                                                                                             </td>
//                                                                                                             <td className="dis-muted">
//                                                                                                                 {batch.purchaseBillNumber || ''}
//                                                                                                                 {batch.partyBillNumber && ` (${batch.partyBillNumber})`}
//                                                                                                             </td>
//                                                                                                             <td>
//                                                                                                                 <span className={`dis-badge-expiry dis-badge-expiry--${expiryStatus.bg}`}>
//                                                                                                                     {expiryStatus.label}
//                                                                                                                     {batch.daysUntilExpiry > 0 && batch.daysUntilExpiry <= 90 && (
//                                                                                                                         <span> ({batch.daysUntilExpiry}d)</span>
//                                                                                                                     )}
//                                                                                                                 </span>
//                                                                                                             </td>
//                                                                                                             <td className="dis-muted">
//                                                                                                                 {batch.storeName || 'N/A'}
//                                                                                                             </td>
//                                                                                                             <td className="dis-muted">
//                                                                                                                 {batch.rackName || 'N/A'}
//                                                                                                             </td>
//                                                                                                         </tr>
//                                                                                                     );
//                                                                                                 })}
//                                                                                             </tbody>
//                                                                                         </table>
//                                                                                     </div>
//                                                                                 </div>
//                                                                             </td>
//                                                                         </tr>
//                                                                     )}
//                                                                 </React.Fragment>
//                                                             );
//                                                         })
//                                                     ) : (
//                                                         <tr>
//                                                             <td colSpan="10" className="dis-empty-state">
//                                                                 <i className="bi bi-inbox dis-empty-icon"></i>
//                                                                 <p className="dis-empty-text">
//                                                                     {searchTerm ? 'No items match your search' : 'No inventory items found'}
//                                                                 </p>
//                                                             </td>
//                                                         </tr>
//                                                     )}
//                                                 </tbody>
//                                             </table>
//                                         </div>

//                                         {/* Pagination */}
//                                         {inventoryData.totalItems > 0 && (
//                                             <div className="dis-pagination">
//                                                 <div className="dis-pagination-left">
//                                                     <label className="dis-pagination-label">Rows:</label>
//                                                     <select
//                                                         className="dis-pagination-select"
//                                                         value={rowsPerPage}
//                                                         onChange={handleRowsPerPageChange}
//                                                     >
//                                                         <option value={5}>5</option>
//                                                         <option value={10}>10</option>
//                                                         <option value={25}>25</option>
//                                                         <option value={50}>50</option>
//                                                     </select>
//                                                     <span className="dis-pagination-info">
//                                                         {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, inventoryData.totalItems)} of {inventoryData.totalItems}
//                                                     </span>
//                                                 </div>

//                                                 <div className="dis-pagination-right">
//                                                     <button
//                                                         className={`dis-pagination-btn ${currentPage === 1 ? 'dis-pagination-btn--disabled' : ''}`}
//                                                         onClick={goToPreviousPage}
//                                                         disabled={currentPage === 1}
//                                                     >
//                                                         <i className="bi bi-chevron-left"></i>
//                                                     </button>

//                                                     {getPageNumbers().map((page, index) => (
//                                                         typeof page === 'number' ? (
//                                                             <button
//                                                                 key={index}
//                                                                 className={`dis-pagination-btn ${currentPage === page ? 'dis-pagination-btn--active' : ''}`}
//                                                                 onClick={() => handlePageChange(page)}
//                                                             >
//                                                                 {page}
//                                                             </button>
//                                                         ) : (
//                                                             <span key={index} className="dis-pagination-ellipsis">
//                                                                 {page}
//                                                             </span>
//                                                         )
//                                                     ))}

//                                                     <button
//                                                         className={`dis-pagination-btn ${currentPage === inventoryData.totalPages ? 'dis-pagination-btn--disabled' : ''}`}
//                                                         onClick={goToNextPage}
//                                                         disabled={currentPage === inventoryData.totalPages}
//                                                     >
//                                                         <i className="bi bi-chevron-right"></i>
//                                                     </button>
//                                                 </div>
//                                             </div>
//                                         )}
//                                     </>
//                                 )}
//                             </div>
//                         </div>
//                     </div>

//                     {/* Footer */}
//                     <div className="dis-modal-footer">
//                         <button type="button" className="dis-btn-secondary" onClick={onClose}>
//                             <i className="bi bi-x-circle me-1"></i> Close
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </>
//     );
// };

// export default DailyInventorySummary;

//------------------------------------------------------end1

// src/components/retailer/dashboard/modals/DailyInventorySummary.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './DailyInventorySummary.css';

const DailyInventorySummary = ({ show, onClose, companyId }) => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [inventoryData, setInventoryData] = useState({
        totalStockQuantity: 0,
        totalStockValue: 0,
        totalItems: 0,
        currentPage: 1,
        pageSize: 10,
        totalPages: 0,
        items: []
    });
    const [expandedItem, setExpandedItem] = useState(null);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    api.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    const formatCurrency = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatNumber = (num) => {
        return Number(num || 0).toLocaleString('en-IN');
    };

    const fetchInventoryData = useCallback(async () => {
        if (!companyId) {
            setNotification({
                show: true,
                message: 'Company not selected',
                type: 'error'
            });
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('companyId', companyId);
            params.append('page', currentPage);
            params.append('pageSize', rowsPerPage);
            if (searchTerm) {
                params.append('searchTerm', searchTerm);
            }

            const response = await api.get(`/api/retailer/inventory-stock?${params.toString()}`);

            if (response.data.success) {
                const data = response.data.data;
                setInventoryData({
                    totalStockQuantity: data.totalStockQuantity || 0,
                    totalStockValue: data.totalStockValue || 0,
                    totalItems: data.totalItems || 0,
                    currentPage: data.currentPage || 1,
                    pageSize: data.pageSize || 10,
                    totalPages: data.totalPages || 0,
                    items: data.items || []
                });
            } else {
                setNotification({
                    show: true,
                    message: response.data.error || 'Failed to fetch inventory data',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error fetching inventory data:', error);
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Failed to fetch inventory data',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    }, [companyId, currentPage, rowsPerPage, searchTerm]);

    useEffect(() => {
        if (show && companyId) {
            fetchInventoryData();
        }
    }, [show, companyId, currentPage, rowsPerPage, searchTerm, fetchInventoryData]);

    // FIX: Add Escape key handler to close modal
    useEffect(() => {
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape' && show) {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscapeKey);

        return () => {
            window.removeEventListener('keydown', handleEscapeKey);
        };
    }, [show, onClose]);

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setCurrentPage(1);
    };

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(parseInt(e.target.value));
        setCurrentPage(1);
    };

    const toggleExpandItem = (itemId) => {
        setExpandedItem(expandedItem === itemId ? null : itemId);
    };

    const getExpiryStatusBadge = (status) => {
        const statusMap = {
            'safe': { bg: 'success', label: 'Safe' },
            'warning': { bg: 'warning', label: 'Expiring Soon' },
            'danger': { bg: 'danger', label: 'Expiring' },
            'expired': { bg: 'dark', label: 'Expired' }
        };
        return statusMap[status] || { bg: 'secondary', label: 'Unknown' };
    };

    const getStockLevelBadge = (quantity) => {
        if (quantity === 0) return { bg: 'danger', label: 'Out of Stock' };
        if (quantity < 10) return { bg: 'warning', label: 'Low Stock' };
        if (quantity < 50) return { bg: 'info', label: 'Medium Stock' };
        return { bg: 'success', label: 'In Stock' };
    };

    const goToPreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const goToNextPage = () => {
        if (currentPage < inventoryData.totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const getPageNumbers = () => {
        const totalPages = inventoryData.totalPages;
        const current = currentPage;
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)) {
                range.push(i);
            }
        }

        range.forEach((i) => {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        });

        return rangeWithDots;
    };

    if (!show) return null;

    return (
        <>
            <div
                className="dis-modal-overlay"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <div className="dis-modal">
                    {/* Header */}
                    <div className="dis-modal-header">
                        <div className="dis-modal-header-left">
                            <div className="dis-modal-header-icon">
                                <i className="bi bi-box-seam"></i>
                            </div>
                            <div>
                                <h5 className="dis-modal-title">Inventory Stock Summary</h5>
                                <small className="dis-modal-subtitle">
                                    Total {inventoryData.totalItems} items in stock
                                </small>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="dis-modal-close"
                            onClick={onClose}
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div className="dis-modal-body">

                        {/* Search Bar */}
                        <div className="dis-search-card">
                            <div className="dis-search-card-body">
                                <form onSubmit={handleSearch} className="dis-search-form">
                                    <div className="dis-search-input-wrap">
                                        <i className="bi bi-search dis-search-icon"></i>
                                        <input
                                            type="text"
                                            className="dis-search-input"
                                            placeholder="Search by Item Name, Code, Batch, Supplier, Bill No..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" className="dis-btn-primary dis-btn-search">
                                        <i className="bi bi-search me-1"></i> Search
                                    </button>
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            className="dis-btn-outline"
                                            onClick={handleClearSearch}
                                        >
                                            <i className="bi bi-x-lg"></i>
                                        </button>
                                    )}
                                </form>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="dis-table-card">
                            <div className="dis-table-card-body">
                                {loading ? (
                                    <div className="dis-loading">
                                        <div className="dis-spinner"></div>
                                        <p className="dis-loading-text">Loading inventory data...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="dis-table-wrap">
                                            <table className="dis-table">
                                                <thead className="dis-table-header">
                                                    <tr>
                                                        <th style={{ width: '5%' }}>#</th>
                                                        <th style={{ width: '8%' }}>Code</th>
                                                        <th style={{ width: '18%' }}>Item Name</th>
                                                        <th style={{ width: '10%' }}>Category</th>
                                                        <th style={{ width: '6%' }}>Unit</th>
                                                        <th style={{ width: '10%', textAlign: 'right' }}>Qty</th>
                                                        <th style={{ width: '12%', textAlign: 'right' }}>Value</th>
                                                        <th style={{ width: '10%', textAlign: 'center' }}>Batches</th>
                                                        <th style={{ width: '10%', textAlign: 'center' }}>Status</th>
                                                        <th style={{ width: '8%', textAlign: 'center' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {inventoryData.items.length > 0 ? (
                                                        inventoryData.items.map((item, index) => {
                                                            const stockStatus = getStockLevelBadge(item.totalStock);
                                                            const isExpanded = expandedItem === item.itemId;
                                                            return (
                                                                <React.Fragment key={item.itemId}>
                                                                    <tr
                                                                        className="dis-table-row"
                                                                        onClick={() => toggleExpandItem(item.itemId)}
                                                                    >
                                                                        <td className="dis-row-index">
                                                                            {((currentPage - 1) * rowsPerPage) + index + 1}
                                                                        </td>
                                                                        <td>
                                                                            <span className="dis-badge-code">
                                                                                {item.uniqueNumber || 'N/A'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="dis-item-name">
                                                                            <strong>{item.itemName}</strong>
                                                                        </td>
                                                                        <td className="dis-muted">{item.categoryName || 'N/A'}</td>
                                                                        <td className="dis-muted">{item.unitName || 'N/A'}</td>
                                                                        <td style={{ textAlign: 'right' }}>
                                                                            <span className="dis-qty-value">
                                                                                {formatNumber(item.totalStock)}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ textAlign: 'right' }}>
                                                                            <span className="dis-value-text">
                                                                                Rs. {formatCurrency(item.totalValue)}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            <span className="dis-badge-batches">
                                                                                {item.batches.length}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            <span className={`dis-badge-stock dis-badge-stock--${stockStatus.bg}`}>
                                                                                {stockStatus.label}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            <button
                                                                                className={`dis-btn-expand ${isExpanded ? 'dis-btn-expand--active' : ''}`}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleExpandItem(item.itemId);
                                                                                }}
                                                                            >
                                                                                <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                    {isExpanded && item.batches.length > 0 && (
                                                                        <tr>
                                                                            <td colSpan="10" className="dis-expanded-row">
                                                                                <div className="dis-expanded-content">
                                                                                    <div className="dis-expanded-table-wrap">
                                                                                        <table className="dis-expanded-table">
                                                                                            <thead>
                                                                                                <tr>
                                                                                                    <th>Batch</th>
                                                                                                    <th>Expiry</th>
                                                                                                    <th style={{ textAlign: 'right' }}>Qty</th>
                                                                                                    <th style={{ textAlign: 'right' }}>Pu Price</th>
                                                                                                    <th style={{ textAlign: 'right' }}>MRP</th>
                                                                                                    <th>Supplier</th>
                                                                                                    <th>Bill No</th>
                                                                                                    <th>Status</th>
                                                                                                    <th>Store</th>
                                                                                                    <th>Rack</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody>
                                                                                                {item.batches.map((batch, idx) => {
                                                                                                    const expiryStatus = getExpiryStatusBadge(batch.expiryStatus);
                                                                                                    return (
                                                                                                        <tr key={idx}>
                                                                                                            <td className="dis-batch-number">
                                                                                                                {batch.batchNumber || 'N/A'}
                                                                                                            </td>
                                                                                                            <td className="dis-muted">
                                                                                                                {batch.expiryDate || 'N/A'}
                                                                                                            </td>
                                                                                                            <td style={{ textAlign: 'right', fontWeight: '500' }}>
                                                                                                                {formatNumber(batch.quantity)}
                                                                                                            </td>
                                                                                                            <td style={{ textAlign: 'right' }}>
                                                                                                                Rs. {formatCurrency(batch.puPrice)}
                                                                                                            </td>
                                                                                                            <td style={{ textAlign: 'right' }}>
                                                                                                                Rs. {formatCurrency(batch.mrp)}
                                                                                                            </td>
                                                                                                            <td className="dis-muted">
                                                                                                                {batch.supplierName || 'N/A'}
                                                                                                            </td>
                                                                                                            <td className="dis-muted">
                                                                                                                {batch.purchaseBillNumber || ''}
                                                                                                                {batch.partyBillNumber && ` (${batch.partyBillNumber})`}
                                                                                                            </td>
                                                                                                            <td>
                                                                                                                <span className={`dis-badge-expiry dis-badge-expiry--${expiryStatus.bg}`}>
                                                                                                                    {expiryStatus.label}
                                                                                                                    {batch.daysUntilExpiry > 0 && batch.daysUntilExpiry <= 90 && (
                                                                                                                        <span> ({batch.daysUntilExpiry}d)</span>
                                                                                                                    )}
                                                                                                                </span>
                                                                                                            </td>
                                                                                                            <td className="dis-muted">
                                                                                                                {batch.storeName || 'N/A'}
                                                                                                            </td>
                                                                                                            <td className="dis-muted">
                                                                                                                {batch.rackName || 'N/A'}
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                    );
                                                                                                })}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="10" className="dis-empty-state">
                                                                <i className="bi bi-inbox dis-empty-icon"></i>
                                                                <p className="dis-empty-text">
                                                                    {searchTerm ? 'No items match your search' : 'No inventory items found'}
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination */}
                                        {inventoryData.totalItems > 0 && (
                                            <div className="dis-pagination">
                                                <div className="dis-pagination-left">
                                                    <label className="dis-pagination-label">Rows:</label>
                                                    <select
                                                        className="dis-pagination-select"
                                                        value={rowsPerPage}
                                                        onChange={handleRowsPerPageChange}
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={25}>25</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                    <span className="dis-pagination-info">
                                                        {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, inventoryData.totalItems)} of {inventoryData.totalItems}
                                                    </span>
                                                </div>

                                                <div className="dis-pagination-right">
                                                    <button
                                                        className={`dis-pagination-btn ${currentPage === 1 ? 'dis-pagination-btn--disabled' : ''}`}
                                                        onClick={goToPreviousPage}
                                                        disabled={currentPage === 1}
                                                    >
                                                        <i className="bi bi-chevron-left"></i>
                                                    </button>

                                                    {getPageNumbers().map((page, index) => (
                                                        typeof page === 'number' ? (
                                                            <button
                                                                key={index}
                                                                className={`dis-pagination-btn ${currentPage === page ? 'dis-pagination-btn--active' : ''}`}
                                                                onClick={() => handlePageChange(page)}
                                                            >
                                                                {page}
                                                            </button>
                                                        ) : (
                                                            <span key={index} className="dis-pagination-ellipsis">
                                                                {page}
                                                            </span>
                                                        )
                                                    ))}

                                                    <button
                                                        className={`dis-pagination-btn ${currentPage === inventoryData.totalPages ? 'dis-pagination-btn--disabled' : ''}`}
                                                        onClick={goToNextPage}
                                                        disabled={currentPage === inventoryData.totalPages}
                                                    >
                                                        <i className="bi bi-chevron-right"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="dis-modal-footer">
                        <button type="button" className="dis-btn-secondary" onClick={onClose}>
                            <i className="bi bi-x-circle me-1"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DailyInventorySummary;