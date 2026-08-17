// // src/components/retailer/dashboard/modals/DailyInventorySummary.jsx

// import React, { useState, useEffect } from 'react';
// import axios from 'axios';

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

//     // Pagination state
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

//     const fetchInventoryData = async () => {
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
//     };

//     useEffect(() => {
//         if (show && companyId) {
//             fetchInventoryData();
//         }
//     }, [show, companyId, currentPage, rowsPerPage]);

//     const handleSearch = (e) => {
//         e.preventDefault();
//         setCurrentPage(1);
//         fetchInventoryData();
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
//             'safe': 'bg-success',
//             'warning': 'bg-warning',
//             'danger': 'bg-danger',
//             'expired': 'bg-dark'
//         };
//         return statusMap[status] || 'bg-secondary';
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

//     if (!show) return null;

//     return (
//         <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
//             <div className="modal-dialog modal-xl modal-dialog-centered">
//                 <div className="modal-content">
//                     <div className="modal-header bg-primary text-white">
//                         <h5 className="modal-title">
//                             <i className="bi bi-box-seam me-2"></i>
//                             Inventory Stock Details
//                         </h5>
//                         <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
//                     </div>

//                     <div className="modal-body">
//                         {/* Search Bar */}
//                         <div className="row g-1 mb-2">
//                             <div className="col-12 col-md-8">
//                                 <form onSubmit={handleSearch} className="d-flex gap-1">
//                                     <input
//                                         type="text"
//                                         className="form-control form-control-sm"
//                                         placeholder="Search by Item Name, Code, Batch, Supplier, Bill No..."
//                                         value={searchTerm}
//                                         onChange={(e) => setSearchTerm(e.target.value)}
//                                         style={{ height: '32px', fontSize: '0.875rem' }}
//                                     />
//                                     <button
//                                         type="submit"
//                                         className="btn btn-primary btn-sm"
//                                         style={{ height: '32px' }}
//                                     >
//                                         <i className="bi bi-search me-1"></i> Search
//                                     </button>
//                                     {searchTerm && (
//                                         <button
//                                             type="button"
//                                             className="btn btn-outline-secondary btn-sm"
//                                             onClick={() => {
//                                                 setSearchTerm('');
//                                                 setCurrentPage(1);
//                                                 fetchInventoryData();
//                                             }}
//                                             style={{ height: '32px' }}
//                                         >
//                                             <i className="bi bi-x-circle"></i>
//                                         </button>
//                                     )}
//                                 </form>
//                             </div>
//                             <div className="col-12 col-md-4">
//                                 <div className="d-flex align-items-center justify-content-end h-100">
//                                     <small className="text-muted me-2" style={{ fontSize: '0.7rem' }}>
//                                         Total Items: {inventoryData.totalItems}
//                                     </small>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Inventory Table */}
//                         {loading ? (
//                             <div className="text-center py-4">
//                                 <div className="spinner-border text-primary" role="status">
//                                     <span className="visually-hidden">Loading...</span>
//                                 </div>
//                             </div>
//                         ) : (
//                             <>
//                                 <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
//                                     <table className="table table-sm table-hover table-bordered">
//                                         <thead className="table-light sticky-top">
//                                             <tr>
//                                                 <th style={{ fontSize: '0.75rem', width: '5%' }}>#</th>
//                                                 <th style={{ fontSize: '0.75rem', width: '8%' }}>Code</th>
//                                                 <th style={{ fontSize: '0.75rem', width: '15%' }}>Item Name</th>
//                                                 <th style={{ fontSize: '0.75rem', width: '10%' }}>Category</th>
//                                                 <th style={{ fontSize: '0.75rem', width: '8%' }}>Unit</th>
//                                                 <th style={{ fontSize: '0.75rem', width: '8%' }} className="text-end">Stock Qty</th>
//                                                 <th style={{ fontSize: '0.75rem', width: '10%' }} className="text-end">Stock Value</th>
//                                                 <th style={{ fontSize: '0.75rem', width: '8%' }} className="text-center">Batches</th>
//                                                 <th style={{ fontSize: '0.75rem', width: '8%' }} className="text-center">Actions</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {inventoryData.items.length > 0 ? (
//                                                 inventoryData.items.map((item, index) => (
//                                                     <React.Fragment key={item.itemId}>
//                                                         <tr>
//                                                             <td style={{ fontSize: '0.75rem' }}>
//                                                                 {((currentPage - 1) * rowsPerPage) + index + 1}
//                                                             </td>
//                                                             <td style={{ fontSize: '0.75rem' }}>
//                                                                 {item.uniqueNumber || 'N/A'}
//                                                             </td>
//                                                             <td style={{ fontSize: '0.75rem' }}>
//                                                                 <strong>{item.itemName}</strong>
//                                                             </td>
//                                                             <td style={{ fontSize: '0.75rem' }}>
//                                                                 {item.categoryName || 'N/A'}
//                                                             </td>
//                                                             <td style={{ fontSize: '0.75rem' }}>
//                                                                 {item.unitName || 'N/A'}
//                                                             </td>
//                                                             <td style={{ fontSize: '0.75rem' }} className="text-end">
//                                                                 <span className="fw-bold">{item.totalStock}</span>
//                                                             </td>
//                                                             <td style={{ fontSize: '0.75rem' }} className="text-end">
//                                                                 Rs. {formatCurrency(item.totalValue)}
//                                                             </td>
//                                                             <td style={{ fontSize: '0.75rem' }} className="text-center">
//                                                                 <span className="badge bg-info">
//                                                                     {item.batches.length}
//                                                                 </span>
//                                                             </td>
//                                                             <td style={{ fontSize: '0.75rem' }} className="text-center">
//                                                                 <button
//                                                                     className="btn btn-sm btn-outline-primary py-0 px-1"
//                                                                     onClick={() => toggleExpandItem(item.itemId)}
//                                                                     style={{ fontSize: '0.65rem' }}
//                                                                 >
//                                                                     {expandedItem === item.itemId ? (
//                                                                         <i className="bi bi-chevron-up"></i>
//                                                                     ) : (
//                                                                         <i className="bi bi-chevron-down"></i>
//                                                                     )}
//                                                                 </button>
//                                                             </td>
//                                                         </tr>
//                                                         {expandedItem === item.itemId && item.batches.length > 0 && (
//                                                             <tr>
//                                                                 <td colSpan="9" className="p-0">
//                                                                     <div className="table-responsive" style={{ backgroundColor: '#f8f9fa' }}>
//                                                                         <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.7rem' }}>
//                                                                             <thead className="bg-light">
//                                                                                 <tr>
//                                                                                     <th>Batch</th>
//                                                                                     <th>Expiry</th>
//                                                                                     <th className="text-end">Qty</th>
//                                                                                     <th className="text-end">Pu Price</th>
//                                                                                     <th className="text-end">MRP</th>
//                                                                                     <th>Supplier</th>
//                                                                                     <th>Bill No</th>
//                                                                                     <th>Status</th>
//                                                                                     <th>Store</th>
//                                                                                     <th>Rack</th>
//                                                                                 </tr>
//                                                                             </thead>
//                                                                             <tbody>
//                                                                                 {item.batches.map((batch, idx) => (
//                                                                                     <tr key={idx}>
//                                                                                         <td>{batch.batchNumber || 'N/A'}</td>
//                                                                                         <td>{batch.expiryDate || 'N/A'}</td>
//                                                                                         <td className="text-end">{batch.quantity}</td>
//                                                                                         <td className="text-end">Rs. {formatCurrency(batch.puPrice)}</td>
//                                                                                         <td className="text-end">Rs. {formatCurrency(batch.mrp)}</td>
//                                                                                         <td>{batch.supplierName || 'N/A'}</td>
//                                                                                         <td>
//                                                                                             {batch.purchaseBillNumber || ''}
//                                                                                             {batch.partyBillNumber && ` (${batch.partyBillNumber})`}
//                                                                                         </td>                                                                                        <td>
//                                                                                             <span className={`badge ${getExpiryStatusBadge(batch.expiryStatus)}`} style={{ fontSize: '0.55rem' }}>
//                                                                                                 {batch.expiryStatus || 'N/A'}
//                                                                                                 {batch.daysUntilExpiry > 0 && batch.daysUntilExpiry <= 90 && (
//                                                                                                     <span> ({batch.daysUntilExpiry}d)</span>
//                                                                                                 )}
//                                                                                             </span>
//                                                                                         </td>
//                                                                                         <td>{batch.storeName || 'N/A'}</td>
//                                                                                         <td>{batch.rackName || 'N/A'}</td>
//                                                                                     </tr>
//                                                                                 ))}
//                                                                             </tbody>
//                                                                         </table>
//                                                                     </div>
//                                                                 </td>
//                                                             </tr>
//                                                         )}
//                                                     </React.Fragment>
//                                                 ))
//                                             ) : (
//                                                 <tr>
//                                                     <td colSpan="9" className="text-center text-muted py-3">
//                                                         <i className="bi bi-inbox me-1"></i>
//                                                         No inventory items found
//                                                     </td>
//                                                 </tr>
//                                             )}
//                                         </tbody>
//                                     </table>
//                                 </div>

//                                 {/* Pagination Controls */}
//                                 {inventoryData.totalItems > 0 && (
//                                     <div className="d-flex justify-content-between align-items-center mt-1">
//                                         <div className="d-flex align-items-center">
//                                             <label className="mb-0 me-2" style={{ fontSize: '0.75rem' }}>
//                                                 Rows per page:
//                                             </label>
//                                             <select
//                                                 className="form-select form-select-sm"
//                                                 value={rowsPerPage}
//                                                 onChange={handleRowsPerPageChange}
//                                                 style={{ width: '60px', fontSize: '0.75rem' }}
//                                             >
//                                                 <option value={5}>5</option>
//                                                 <option value={10}>10</option>
//                                                 <option value={25}>25</option>
//                                                 <option value={50}>50</option>
//                                             </select>
//                                             <span className="ms-2" style={{ fontSize: '0.75rem', color: '#6c757d' }}>
//                                                 {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, inventoryData.totalItems)} of {inventoryData.totalItems}
//                                             </span>
//                                         </div>

//                                         <div className="d-flex align-items-center gap-1">
//                                             <button
//                                                 className="btn btn-sm btn-outline-secondary"
//                                                 onClick={goToPreviousPage}
//                                                 disabled={currentPage === 1}
//                                                 style={{ padding: '0 8px', fontSize: '0.75rem' }}
//                                             >
//                                                 <i className="bi bi-chevron-left"></i>
//                                             </button>

//                                             {Array.from({ length: Math.min(5, inventoryData.totalPages) }, (_, i) => {
//                                                 let pageNumber;
//                                                 if (inventoryData.totalPages <= 5) {
//                                                     pageNumber = i + 1;
//                                                 } else if (currentPage <= 3) {
//                                                     pageNumber = i + 1;
//                                                 } else if (currentPage >= inventoryData.totalPages - 2) {
//                                                     pageNumber = inventoryData.totalPages - 4 + i;
//                                                 } else {
//                                                     pageNumber = currentPage - 2 + i;
//                                                 }

//                                                 return (
//                                                     <button
//                                                         key={i}
//                                                         className={`btn btn-sm ${currentPage === pageNumber ? 'btn-primary' : 'btn-outline-secondary'}`}
//                                                         onClick={() => handlePageChange(pageNumber)}
//                                                         style={{
//                                                             padding: '0 8px',
//                                                             fontSize: '0.75rem',
//                                                             minWidth: '30px'
//                                                         }}
//                                                     >
//                                                         {pageNumber}
//                                                     </button>
//                                                 );
//                                             })}

//                                             <button
//                                                 className="btn btn-sm btn-outline-secondary"
//                                                 onClick={goToNextPage}
//                                                 disabled={currentPage === inventoryData.totalPages}
//                                                 style={{ padding: '0 8px', fontSize: '0.75rem' }}
//                                             >
//                                                 <i className="bi bi-chevron-right"></i>
//                                             </button>
//                                         </div>
//                                     </div>
//                                 )}
//                             </>
//                         )}
//                     </div>

//                     <div className="modal-footer">
//                         <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
//                             <i className="bi bi-x-circle me-1"></i> Close
//                         </button>
//                     </div>
//                 </div>
//             </div>

//             <style>{`
//                 .sticky-top {
//                     position: sticky;
//                     top: 0;
//                     z-index: 10;
//                 }

//                 .modal-body .table-responsive {
//                     scrollbar-width: thin;
//                 }

//                 .modal-body .table-responsive::-webkit-scrollbar {
//                     width: 4px;
//                     height: 4px;
//                 }

//                 .modal-body .table-responsive::-webkit-scrollbar-thumb {
//                     background-color: #c1c7cd;
//                     border-radius: 4px;
//                 }

//                 .modal-body .table-responsive::-webkit-scrollbar-track {
//                     background-color: #f1f1f1;
//                 }

//                 .badge {
//                     font-size: 0.65rem;
//                     font-weight: 500;
//                 }
//             `}</style>
//         </div>
//     );
// };

// export default DailyInventorySummary;

//------------------------------------------------------end1

// src/components/retailer/dashboard/modals/DailyInventorySummary.jsx

// import React, { useState, useEffect, useCallback } from 'react';
// import axios from 'axios';

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
//         const config = statusMap[status] || { bg: 'secondary', label: 'Unknown' };
//         return config;
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
//             {/* Modal Overlay */}
//             <div
//                 className="modal fade show"
//                 style={{
//                     display: 'block',
//                     backgroundColor: 'rgba(0,0,0,0.6)',
//                     backdropFilter: 'blur(4px)',
//                     zIndex: 1050
//                 }}
//                 tabIndex="-1"
//                 onClick={(e) => {
//                     if (e.target === e.currentTarget) onClose();
//                 }}
//             >
//                 <div className="modal-dialog modal-xl modal-dialog-centered">
//                     <div className="modal-content" style={{
//                         borderRadius: '16px',
//                         overflow: 'hidden',
//                         boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
//                         border: 'none'
//                     }}>
//                         {/* Header */}
//                         <div className="modal-header" style={{
//                             background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
//                             borderBottom: 'none',
//                             padding: '1.25rem 1.5rem'
//                         }}>
//                             <div className="d-flex align-items-center">
//                                 <div className="me-3" style={{
//                                     width: '44px',
//                                     height: '44px',
//                                     borderRadius: '12px',
//                                     background: 'rgba(255,255,255,0.15)',
//                                     display: 'flex',
//                                     alignItems: 'center',
//                                     justifyContent: 'center'
//                                 }}>
//                                     <i className="bi bi-box-seam" style={{ fontSize: '1.5rem', color: '#fff' }}></i>
//                                 </div>
//                                 <div>
//                                     <h5 className="modal-title text-white" style={{ fontWeight: '600', fontSize: '1.15rem' }}>
//                                         Inventory Stock Summary
//                                     </h5>
//                                     <small className="text-white-50" style={{ fontSize: '0.75rem' }}>
//                                         Total {inventoryData.totalItems} items in stock
//                                     </small>
//                                 </div>
//                             </div>
//                             <button
//                                 type="button"
//                                 className="btn-close btn-close-white"
//                                 onClick={onClose}
//                                 style={{ opacity: 0.8 }}
//                             ></button>
//                         </div>

//                         <div className="modal-body" style={{ padding: '1.5rem', background: '#f8f9fa' }}>
//                             {/* Stats Cards */}
//                             <div className="row g-2 mb-3">
//                                 <div className="col-6 col-md-4">
//                                     <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', background: 'white' }}>
//                                         <div className="card-body p-2 px-3 d-flex align-items-center justify-content-between">
//                                             <div>
//                                                 <small className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
//                                                     Total Items
//                                                 </small>
//                                                 <h5 className="mb-0" style={{ fontWeight: '700', fontSize: '1.1rem' }}>
//                                                     {formatNumber(inventoryData.totalItems)}
//                                                 </h5>
//                                             </div>
//                                             <div style={{
//                                                 width: '36px',
//                                                 height: '36px',
//                                                 borderRadius: '10px',
//                                                 background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//                                                 display: 'flex',
//                                                 alignItems: 'center',
//                                                 justifyContent: 'center'
//                                             }}>
//                                                 <i className="bi bi-grid-3x3-gap-fill" style={{ color: 'white', fontSize: '1rem' }}></i>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                                 <div className="col-6 col-md-4">
//                                     <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', background: 'white' }}>
//                                         <div className="card-body p-2 px-3 d-flex align-items-center justify-content-between">
//                                             <div>
//                                                 <small className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
//                                                     Total Quantity
//                                                 </small>
//                                                 <h5 className="mb-0" style={{ fontWeight: '700', fontSize: '1.1rem' }}>
//                                                     {formatNumber(inventoryData.totalStockQuantity)}
//                                                 </h5>
//                                             </div>
//                                             <div style={{
//                                                 width: '36px',
//                                                 height: '36px',
//                                                 borderRadius: '10px',
//                                                 background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
//                                                 display: 'flex',
//                                                 alignItems: 'center',
//                                                 justifyContent: 'center'
//                                             }}>
//                                                 <i className="bi bi-cubes" style={{ color: 'white', fontSize: '1rem' }}></i>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                                 <div className="col-12 col-md-4">
//                                     <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', background: 'white' }}>
//                                         <div className="card-body p-2 px-3 d-flex align-items-center justify-content-between">
//                                             <div>
//                                                 <small className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
//                                                     Total Stock Value
//                                                 </small>
//                                                 <h5 className="mb-0" style={{ fontWeight: '700', fontSize: '1.1rem', color: '#2d3436' }}>
//                                                     Rs. {formatCurrency(inventoryData.totalStockValue)}
//                                                 </h5>
//                                             </div>
//                                             <div style={{
//                                                 width: '36px',
//                                                 height: '36px',
//                                                 borderRadius: '10px',
//                                                 background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
//                                                 display: 'flex',
//                                                 alignItems: 'center',
//                                                 justifyContent: 'center'
//                                             }}>
//                                                 <i className="bi bi-currency-rupee" style={{ color: 'white', fontSize: '1rem' }}></i>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Search Bar */}
//                             <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '12px' }}>
//                                 <div className="card-body p-2">
//                                     <form onSubmit={handleSearch} className="d-flex gap-2">
//                                         <div className="flex-grow-1 position-relative">
//                                             <i className="bi bi-search" style={{
//                                                 position: 'absolute',
//                                                 left: '12px',
//                                                 top: '50%',
//                                                 transform: 'translateY(-50%)',
//                                                 color: '#adb5bd',
//                                                 fontSize: '0.9rem'
//                                             }}></i>
//                                             <input
//                                                 type="text"
//                                                 className="form-control"
//                                                 placeholder="Search by Item Name, Code, Batch, Supplier, Bill No..."
//                                                 value={searchTerm}
//                                                 onChange={(e) => setSearchTerm(e.target.value)}
//                                                 style={{
//                                                     height: '40px',
//                                                     borderRadius: '10px',
//                                                     paddingLeft: '36px',
//                                                     fontSize: '0.875rem',
//                                                     border: '1px solid #e9ecef'
//                                                 }}
//                                             />
//                                         </div>
//                                         <button
//                                             type="submit"
//                                             className="btn btn-primary"
//                                             style={{
//                                                 borderRadius: '10px',
//                                                 padding: '0 20px',
//                                                 fontWeight: '500',
//                                                 fontSize: '0.85rem',
//                                                 background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//                                                 border: 'none'
//                                             }}
//                                         >
//                                             <i className="bi bi-search me-1"></i> Search
//                                         </button>
//                                         {searchTerm && (
//                                             <button
//                                                 type="button"
//                                                 className="btn btn-outline-secondary"
//                                                 onClick={handleClearSearch}
//                                                 style={{
//                                                     borderRadius: '10px',
//                                                     padding: '0 16px',
//                                                     fontSize: '0.85rem'
//                                                 }}
//                                             >
//                                                 <i className="bi bi-x-lg"></i>
//                                             </button>
//                                         )}
//                                     </form>
//                                 </div>
//                             </div>

//                             {/* Table */}
//                             <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
//                                 <div className="card-body p-0">
//                                     {loading ? (
//                                         <div className="text-center py-5">
//                                             <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
//                                                 <span className="visually-hidden">Loading...</span>
//                                             </div>
//                                             <p className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>Loading inventory data...</p>
//                                         </div>
//                                     ) : (
//                                         <>
//                                             <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
//                                                 <table className="table table-hover mb-0" style={{ fontSize: '0.8rem' }}>
//                                                     <thead style={{
//                                                         position: 'sticky',
//                                                         top: 0,
//                                                         zIndex: 10,
//                                                         background: '#f8f9fa',
//                                                         borderBottom: '2px solid #dee2e6'
//                                                     }}>
//                                                         <tr>
//                                                             <th style={{ padding: '10px 12px', fontWeight: '600', color: '#495057', width: '5%' }}>#</th>
//                                                             <th style={{ padding: '10px 12px', fontWeight: '600', color: '#495057', width: '8%' }}>Code</th>
//                                                             <th style={{ padding: '10px 12px', fontWeight: '600', color: '#495057', width: '18%' }}>Item Name</th>
//                                                             <th style={{ padding: '10px 12px', fontWeight: '600', color: '#495057', width: '10%' }}>Category</th>
//                                                             <th style={{ padding: '10px 12px', fontWeight: '600', color: '#495057', width: '6%' }}>Unit</th>
//                                                             <th style={{ padding: '10px 12px', fontWeight: '600', color: '#495057', width: '10%', textAlign: 'right' }}>Qty</th>
//                                                             <th style={{ padding: '10px 12px', fontWeight: '600', color: '#495057', width: '12%', textAlign: 'right' }}>Value</th>
//                                                             <th style={{ padding: '10px 12px', fontWeight: '600', color: '#495057', width: '10%', textAlign: 'center' }}>Batches</th>
//                                                             <th style={{ padding: '10px 12px', fontWeight: '600', color: '#495057', width: '10%', textAlign: 'center' }}>Status</th>
//                                                             <th style={{ padding: '10px 12px', fontWeight: '600', color: '#495057', width: '8%', textAlign: 'center' }}>Actions</th>
//                                                         </tr>
//                                                     </thead>
//                                                     <tbody>
//                                                         {inventoryData.items.length > 0 ? (
//                                                             inventoryData.items.map((item, index) => {
//                                                                 const stockStatus = getStockLevelBadge(item.totalStock);
//                                                                 const isExpanded = expandedItem === item.itemId;
//                                                                 return (
//                                                                     <React.Fragment key={item.itemId}>
//                                                                         <tr
//                                                                             style={{
//                                                                                 transition: 'background-color 0.2s ease',
//                                                                                 cursor: 'pointer'
//                                                                             }}
//                                                                             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f3f5'}
//                                                                             onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
//                                                                             onClick={() => toggleExpandItem(item.itemId)}
//                                                                         >
//                                                                             <td style={{ padding: '8px 12px', color: '#6c757d', fontWeight: '500' }}>
//                                                                                 {((currentPage - 1) * rowsPerPage) + index + 1}
//                                                                             </td>
//                                                                             <td style={{ padding: '8px 12px' }}>
//                                                                                 <span className="badge" style={{
//                                                                                     background: '#e9ecef',
//                                                                                     color: '#495057',
//                                                                                     fontWeight: '500',
//                                                                                     fontSize: '0.7rem',
//                                                                                     padding: '4px 8px'
//                                                                                 }}>
//                                                                                     {item.uniqueNumber || 'N/A'}
//                                                                                 </span>
//                                                                             </td>
//                                                                             <td style={{ padding: '8px 12px' }}>
//                                                                                 <strong style={{ color: '#2d3436', fontSize: '0.85rem' }}>{item.itemName}</strong>
//                                                                             </td>
//                                                                             <td style={{ padding: '8px 12px', color: '#6c757d' }}>
//                                                                                 {item.categoryName || 'N/A'}
//                                                                             </td>
//                                                                             <td style={{ padding: '8px 12px', color: '#6c757d' }}>
//                                                                                 {item.unitName || 'N/A'}
//                                                                             </td>
//                                                                             <td style={{ padding: '8px 12px', textAlign: 'right' }}>
//                                                                                 <span className="fw-bold" style={{ fontSize: '0.85rem' }}>
//                                                                                     {formatNumber(item.totalStock)}
//                                                                                 </span>
//                                                                             </td>
//                                                                             <td style={{ padding: '8px 12px', textAlign: 'right' }}>
//                                                                                 <span style={{ color: '#2d3436', fontWeight: '500' }}>
//                                                                                     Rs. {formatCurrency(item.totalValue)}
//                                                                                 </span>
//                                                                             </td>
//                                                                             <td style={{ padding: '8px 12px', textAlign: 'center' }}>
//                                                                                 <span className="badge" style={{
//                                                                                     background: '#e3f2fd',
//                                                                                     color: '#1976d2',
//                                                                                     fontSize: '0.7rem',
//                                                                                     padding: '4px 10px',
//                                                                                     borderRadius: '20px'
//                                                                                 }}>
//                                                                                     {item.batches.length}
//                                                                                 </span>
//                                                                             </td>
//                                                                             <td style={{ padding: '8px 12px', textAlign: 'center' }}>
//                                                                                 <span className={`badge bg-${stockStatus.bg}`} style={{
//                                                                                     fontSize: '0.65rem',
//                                                                                     padding: '4px 10px',
//                                                                                     borderRadius: '20px',
//                                                                                     fontWeight: '500'
//                                                                                 }}>
//                                                                                     {stockStatus.label}
//                                                                                 </span>
//                                                                             </td>
//                                                                             <td style={{ padding: '8px 12px', textAlign: 'center' }}>
//                                                                                 <button
//                                                                                     className="btn btn-sm"
//                                                                                     onClick={(e) => {
//                                                                                         e.stopPropagation();
//                                                                                         toggleExpandItem(item.itemId);
//                                                                                     }}
//                                                                                     style={{
//                                                                                         borderRadius: '8px',
//                                                                                         padding: '4px 8px',
//                                                                                         background: isExpanded ? '#e9ecef' : 'transparent',
//                                                                                         border: '1px solid #dee2e6',
//                                                                                         color: '#495057',
//                                                                                         fontSize: '0.7rem'
//                                                                                     }}
//                                                                                 >
//                                                                                     <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
//                                                                                 </button>
//                                                                             </td>
//                                                                         </tr>
//                                                                         {isExpanded && item.batches.length > 0 && (
//                                                                             <tr>
//                                                                                 <td colSpan="10" className="p-0" style={{ background: '#f8f9fa' }}>
//                                                                                     <div style={{ padding: '12px 20px' }}>
//                                                                                         <div className="table-responsive">
//                                                                                             <table className="table table-sm mb-0" style={{ fontSize: '0.7rem' }}>
//                                                                                                 <thead>
//                                                                                                     <tr style={{ borderBottom: '2px solid #dee2e6' }}>
//                                                                                                         <th style={{ padding: '6px 10px', fontWeight: '600', color: '#495057' }}>Batch</th>
//                                                                                                         <th style={{ padding: '6px 10px', fontWeight: '600', color: '#495057' }}>Expiry</th>
//                                                                                                         <th style={{ padding: '6px 10px', fontWeight: '600', color: '#495057', textAlign: 'right' }}>Qty</th>
//                                                                                                         <th style={{ padding: '6px 10px', fontWeight: '600', color: '#495057', textAlign: 'right' }}>Pu Price</th>
//                                                                                                         <th style={{ padding: '6px 10px', fontWeight: '600', color: '#495057', textAlign: 'right' }}>MRP</th>
//                                                                                                         <th style={{ padding: '6px 10px', fontWeight: '600', color: '#495057' }}>Supplier</th>
//                                                                                                         <th style={{ padding: '6px 10px', fontWeight: '600', color: '#495057' }}>Bill No</th>
//                                                                                                         <th style={{ padding: '6px 10px', fontWeight: '600', color: '#495057' }}>Status</th>
//                                                                                                         <th style={{ padding: '6px 10px', fontWeight: '600', color: '#495057' }}>Store</th>
//                                                                                                         <th style={{ padding: '6px 10px', fontWeight: '600', color: '#495057' }}>Rack</th>
//                                                                                                     </tr>
//                                                                                                 </thead>
//                                                                                                 <tbody>
//                                                                                                     {item.batches.map((batch, idx) => {
//                                                                                                         const expiryStatus = getExpiryStatusBadge(batch.expiryStatus);
//                                                                                                         return (
//                                                                                                             <tr key={idx} style={{ borderBottom: '1px solid #f1f3f5' }}>
//                                                                                                                 <td style={{ padding: '6px 10px', fontWeight: '500' }}>
//                                                                                                                     {batch.batchNumber || 'N/A'}
//                                                                                                                 </td>
//                                                                                                                 <td style={{ padding: '6px 10px', color: '#6c757d' }}>
//                                                                                                                     {batch.expiryDate || 'N/A'}
//                                                                                                                 </td>
//                                                                                                                 <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '500' }}>
//                                                                                                                     {formatNumber(batch.quantity)}
//                                                                                                                 </td>
//                                                                                                                 <td style={{ padding: '6px 10px', textAlign: 'right' }}>
//                                                                                                                     Rs. {formatCurrency(batch.puPrice)}
//                                                                                                                 </td>
//                                                                                                                 <td style={{ padding: '6px 10px', textAlign: 'right' }}>
//                                                                                                                     Rs. {formatCurrency(batch.mrp)}
//                                                                                                                 </td>
//                                                                                                                 <td style={{ padding: '6px 10px', color: '#6c757d' }}>
//                                                                                                                     {batch.supplierName || 'N/A'}
//                                                                                                                 </td>
//                                                                                                                 <td style={{ padding: '6px 10px', color: '#6c757d' }}>
//                                                                                                                     {batch.purchaseBillNumber || ''}
//                                                                                                                     {batch.partyBillNumber && ` (${batch.partyBillNumber})`}
//                                                                                                                 </td>
//                                                                                                                 <td style={{ padding: '6px 10px' }}>
//                                                                                                                     <span className={`badge bg-${expiryStatus.bg}`} style={{
//                                                                                                                         fontSize: '0.6rem',
//                                                                                                                         padding: '3px 8px',
//                                                                                                                         borderRadius: '12px',
//                                                                                                                         fontWeight: '500'
//                                                                                                                     }}>
//                                                                                                                         {expiryStatus.label}
//                                                                                                                         {batch.daysUntilExpiry > 0 && batch.daysUntilExpiry <= 90 && (
//                                                                                                                             <span> ({batch.daysUntilExpiry}d)</span>
//                                                                                                                         )}
//                                                                                                                     </span>
//                                                                                                                 </td>
//                                                                                                                 <td style={{ padding: '6px 10px', color: '#6c757d' }}>
//                                                                                                                     {batch.storeName || 'N/A'}
//                                                                                                                 </td>
//                                                                                                                 <td style={{ padding: '6px 10px', color: '#6c757d' }}>
//                                                                                                                     {batch.rackName || 'N/A'}
//                                                                                                                 </td>
//                                                                                                             </tr>
//                                                                                                         );
//                                                                                                     })}
//                                                                                                 </tbody>
//                                                                                             </table>
//                                                                                         </div>
//                                                                                     </div>
//                                                                                 </td>
//                                                                             </tr>
//                                                                         )}
//                                                                     </React.Fragment>
//                                                                 );
//                                                             })
//                                                         ) : (
//                                                             <tr>
//                                                                 <td colSpan="10" className="text-center py-5">
//                                                                     <i className="bi bi-inbox" style={{ fontSize: '2rem', color: '#dee2e6' }}></i>
//                                                                     <p className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>
//                                                                         {searchTerm ? 'No items match your search' : 'No inventory items found'}
//                                                                     </p>
//                                                                 </td>
//                                                             </tr>
//                                                         )}
//                                                     </tbody>
//                                                 </table>
//                                             </div>

//                                             {/* Pagination */}
//                                             {inventoryData.totalItems > 0 && (
//                                                 <div className="d-flex flex-wrap justify-content-between align-items-center p-3" style={{
//                                                     borderTop: '1px solid #e9ecef',
//                                                     background: '#fafafa'
//                                                 }}>
//                                                     <div className="d-flex align-items-center gap-2">
//                                                         <label className="mb-0" style={{ fontSize: '0.8rem', color: '#6c757d' }}>
//                                                             Rows:
//                                                         </label>
//                                                         <select
//                                                             className="form-select form-select-sm"
//                                                             value={rowsPerPage}
//                                                             onChange={handleRowsPerPageChange}
//                                                             style={{
//                                                                 width: '60px',
//                                                                 borderRadius: '8px',
//                                                                 fontSize: '0.8rem',
//                                                                 border: '1px solid #dee2e6'
//                                                             }}
//                                                         >
//                                                             <option value={5}>5</option>
//                                                             <option value={10}>10</option>
//                                                             <option value={25}>25</option>
//                                                             <option value={50}>50</option>
//                                                         </select>
//                                                         <span className="text-muted" style={{ fontSize: '0.8rem' }}>
//                                                             {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, inventoryData.totalItems)} of {inventoryData.totalItems}
//                                                         </span>
//                                                     </div>

//                                                     <div className="d-flex align-items-center gap-1">
//                                                         <button
//                                                             className="btn btn-sm"
//                                                             onClick={goToPreviousPage}
//                                                             disabled={currentPage === 1}
//                                                             style={{
//                                                                 borderRadius: '8px',
//                                                                 padding: '4px 12px',
//                                                                 border: '1px solid #dee2e6',
//                                                                 background: currentPage === 1 ? '#f8f9fa' : 'white',
//                                                                 color: currentPage === 1 ? '#adb5bd' : '#495057',
//                                                                 fontSize: '0.8rem'
//                                                             }}
//                                                         >
//                                                             <i className="bi bi-chevron-left"></i>
//                                                         </button>

//                                                         {getPageNumbers().map((page, index) => (
//                                                             typeof page === 'number' ? (
//                                                                 <button
//                                                                     key={index}
//                                                                     className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-outline-secondary'}`}
//                                                                     onClick={() => handlePageChange(page)}
//                                                                     style={{
//                                                                         borderRadius: '8px',
//                                                                         padding: '4px 12px',
//                                                                         fontSize: '0.8rem',
//                                                                         minWidth: '32px',
//                                                                         fontWeight: currentPage === page ? '600' : '400',
//                                                                         ...(currentPage === page && {
//                                                                             background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//                                                                             border: 'none',
//                                                                             color: 'white'
//                                                                         })
//                                                                     }}
//                                                                 >
//                                                                     {page}
//                                                                 </button>
//                                                             ) : (
//                                                                 <span key={index} className="px-1 text-muted" style={{ fontSize: '0.8rem' }}>
//                                                                     {page}
//                                                                 </span>
//                                                             )
//                                                         ))}

//                                                         <button
//                                                             className="btn btn-sm"
//                                                             onClick={goToNextPage}
//                                                             disabled={currentPage === inventoryData.totalPages}
//                                                             style={{
//                                                                 borderRadius: '8px',
//                                                                 padding: '4px 12px',
//                                                                 border: '1px solid #dee2e6',
//                                                                 background: currentPage === inventoryData.totalPages ? '#f8f9fa' : 'white',
//                                                                 color: currentPage === inventoryData.totalPages ? '#adb5bd' : '#495057',
//                                                                 fontSize: '0.8rem'
//                                                             }}
//                                                         >
//                                                             <i className="bi bi-chevron-right"></i>
//                                                         </button>
//                                                     </div>
//                                                 </div>
//                                             )}
//                                         </>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Footer */}
//                         <div className="modal-footer" style={{
//                             padding: '0.75rem 1.5rem',
//                             borderTop: '1px solid #e9ecef',
//                             background: 'white'
//                         }}>
//                             <button
//                                 type="button"
//                                 className="btn btn-secondary"
//                                 onClick={onClose}
//                                 style={{
//                                     borderRadius: '10px',
//                                     padding: '8px 24px',
//                                     fontSize: '0.85rem',
//                                     fontWeight: '500'
//                                 }}
//                             >
//                                 <i className="bi bi-x-circle me-1"></i> Close
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             <style>{`
//                 .modal-dialog {
//                     max-width: 95%;
//                 }

//                 .table-responsive::-webkit-scrollbar {
//                     width: 6px;
//                     height: 6px;
//                 }

//                 .table-responsive::-webkit-scrollbar-track {
//                     background: #f1f1f1;
//                     border-radius: 10px;
//                 }

//                 .table-responsive::-webkit-scrollbar-thumb {
//                     background: #c1c7cd;
//                     border-radius: 10px;
//                 }

//                 .table-responsive::-webkit-scrollbar-thumb:hover {
//                     background: #a8aeb4;
//                 }

//                 .table-hover tbody tr:hover {
//                     background-color: #f1f3f5 !important;
//                 }

//                 .badge {
//                     font-weight: 500;
//                 }

//                 @media (max-width: 768px) {
//                     .modal-dialog {
//                         max-width: 100%;
//                         margin: 0.5rem;
//                     }

//                     .modal-body {
//                         padding: 0.75rem !important;
//                     }

//                     .table-responsive {
//                         max-height: 300px !important;
//                     }
//                 }
//             `}</style>
//         </>
//     );
// };

// export default DailyInventorySummary;

//------------------------------------------------end2

// src/components/retailer/dashboard/modals/DailyInventorySummary.jsx

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

        // setLoading(true);
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
            // setLoading(false);
        }
    }, [companyId, currentPage, rowsPerPage, searchTerm]);

    useEffect(() => {
        if (show && companyId) {
            fetchInventoryData();
        }
    }, [show, companyId, currentPage, rowsPerPage, searchTerm, fetchInventoryData]);

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
                        {/* Stats Cards */}
                        <div className="dis-stats-row">
                            <div className="dis-stat-card">
                                <div className="dis-stat-card-body">
                                    <div>
                                        <small className="dis-stat-label">Total Items</small>
                                        <h5 className="dis-stat-value">{formatNumber(inventoryData.totalItems)}</h5>
                                    </div>
                                    <div className="dis-stat-icon dis-stat-icon--purple">
                                        <i className="bi bi-grid-3x3-gap-fill"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="dis-stat-card">
                                <div className="dis-stat-card-body">
                                    <div>
                                        <small className="dis-stat-label">Total Quantity</small>
                                        <h5 className="dis-stat-value">{formatNumber(inventoryData.totalStockQuantity)}</h5>
                                    </div>
                                    <div className="dis-stat-icon dis-stat-icon--pink">
                                        <i className="bi bi-cubes"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="dis-stat-card">
                                <div className="dis-stat-card-body">
                                    <div>
                                        <small className="dis-stat-label">Total Stock Value</small>
                                        <h5 className="dis-stat-value dis-stat-value--blue">
                                            Rs. {formatCurrency(inventoryData.totalStockValue)}
                                        </h5>
                                    </div>
                                    <div className="dis-stat-icon dis-stat-icon--blue">
                                        {/* <i className="bi bi-currency-rupee"></i> */}
                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Rs.</span>
                                    </div>
                                </div>
                            </div>
                        </div>

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