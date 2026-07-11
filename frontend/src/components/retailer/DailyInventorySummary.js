// src/components/retailer/dashboard/modals/DailyInventorySummary.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

    // Pagination state
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

    const fetchInventoryData = async () => {
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
    };

    useEffect(() => {
        if (show && companyId) {
            fetchInventoryData();
        }
    }, [show, companyId, currentPage, rowsPerPage]);

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchInventoryData();
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
            'safe': 'bg-success',
            'warning': 'bg-warning',
            'danger': 'bg-danger',
            'expired': 'bg-dark'
        };
        return statusMap[status] || 'bg-secondary';
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

    if (!show) return null;

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-xl modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title">
                            <i className="bi bi-box-seam me-2"></i>
                            Inventory Stock Details
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">
                        {/* Search Bar */}
                        <div className="row g-1 mb-2">
                            <div className="col-12 col-md-8">
                                <form onSubmit={handleSearch} className="d-flex gap-1">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Search by Item Name, Code, Batch, Supplier, Bill No..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ height: '32px', fontSize: '0.875rem' }}
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-sm"
                                        style={{ height: '32px' }}
                                    >
                                        <i className="bi bi-search me-1"></i> Search
                                    </button>
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => {
                                                setSearchTerm('');
                                                setCurrentPage(1);
                                                fetchInventoryData();
                                            }}
                                            style={{ height: '32px' }}
                                        >
                                            <i className="bi bi-x-circle"></i>
                                        </button>
                                    )}
                                </form>
                            </div>
                            <div className="col-12 col-md-4">
                                <div className="d-flex align-items-center justify-content-end h-100">
                                    <small className="text-muted me-2" style={{ fontSize: '0.7rem' }}>
                                        Total Items: {inventoryData.totalItems}
                                    </small>
                                </div>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        {/* <div className="row g-1 mb-2">
                            <div className="col-12 col-md-4">
                                <div className="card border-start border-info border-3">
                                    <div className="card-body py-1 px-2">
                                        <h6 className="text-muted mb-0" style={{ fontSize: '0.6rem' }}>Total Stock Qty</h6>
                                        <h5 className="mb-0 text-info" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                            {formatCurrency(inventoryData.totalStockQuantity)} Units
                                        </h5>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-md-4">
                                <div className="card border-start border-success border-3">
                                    <div className="card-body py-1 px-2">
                                        <h6 className="text-muted mb-0" style={{ fontSize: '0.6rem' }}>Total Stock Value</h6>
                                        <h5 className="mb-0 text-success" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                            Rs. {formatCurrency(inventoryData.totalStockValue)}
                                        </h5>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-md-4">
                                <div className="card border-start border-warning border-3">
                                    <div className="card-body py-1 px-2">
                                        <h6 className="text-muted mb-0" style={{ fontSize: '0.6rem' }}>Total Items</h6>
                                        <h5 className="mb-0 text-warning" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                            {inventoryData.totalItems}
                                        </h5>
                                    </div>
                                </div>
                            </div>
                        </div> */}

                        {/* Inventory Table */}
                        {loading ? (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    <table className="table table-sm table-hover table-bordered">
                                        <thead className="table-light sticky-top">
                                            <tr>
                                                <th style={{ fontSize: '0.75rem', width: '5%' }}>#</th>
                                                <th style={{ fontSize: '0.75rem', width: '8%' }}>Code</th>
                                                <th style={{ fontSize: '0.75rem', width: '15%' }}>Item Name</th>
                                                <th style={{ fontSize: '0.75rem', width: '10%' }}>Category</th>
                                                <th style={{ fontSize: '0.75rem', width: '8%' }}>Unit</th>
                                                <th style={{ fontSize: '0.75rem', width: '8%' }} className="text-end">Stock Qty</th>
                                                <th style={{ fontSize: '0.75rem', width: '10%' }} className="text-end">Stock Value</th>
                                                <th style={{ fontSize: '0.75rem', width: '8%' }} className="text-center">Batches</th>
                                                <th style={{ fontSize: '0.75rem', width: '8%' }} className="text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inventoryData.items.length > 0 ? (
                                                inventoryData.items.map((item, index) => (
                                                    <React.Fragment key={item.itemId}>
                                                        <tr>
                                                            <td style={{ fontSize: '0.75rem' }}>
                                                                {((currentPage - 1) * rowsPerPage) + index + 1}
                                                            </td>
                                                            <td style={{ fontSize: '0.75rem' }}>
                                                                {item.uniqueNumber || 'N/A'}
                                                            </td>
                                                            <td style={{ fontSize: '0.75rem' }}>
                                                                <strong>{item.itemName}</strong>
                                                            </td>
                                                            <td style={{ fontSize: '0.75rem' }}>
                                                                {item.categoryName || 'N/A'}
                                                            </td>
                                                            <td style={{ fontSize: '0.75rem' }}>
                                                                {item.unitName || 'N/A'}
                                                            </td>
                                                            <td style={{ fontSize: '0.75rem' }} className="text-end">
                                                                <span className="fw-bold">{item.totalStock}</span>
                                                            </td>
                                                            <td style={{ fontSize: '0.75rem' }} className="text-end">
                                                                Rs. {formatCurrency(item.totalValue)}
                                                            </td>
                                                            <td style={{ fontSize: '0.75rem' }} className="text-center">
                                                                <span className="badge bg-info">
                                                                    {item.batches.length}
                                                                </span>
                                                            </td>
                                                            <td style={{ fontSize: '0.75rem' }} className="text-center">
                                                                <button
                                                                    className="btn btn-sm btn-outline-primary py-0 px-1"
                                                                    onClick={() => toggleExpandItem(item.itemId)}
                                                                    style={{ fontSize: '0.65rem' }}
                                                                >
                                                                    {expandedItem === item.itemId ? (
                                                                        <i className="bi bi-chevron-up"></i>
                                                                    ) : (
                                                                        <i className="bi bi-chevron-down"></i>
                                                                    )}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        {expandedItem === item.itemId && item.batches.length > 0 && (
                                                            <tr>
                                                                <td colSpan="9" className="p-0">
                                                                    <div className="table-responsive" style={{ backgroundColor: '#f8f9fa' }}>
                                                                        <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.7rem' }}>
                                                                            <thead className="bg-light">
                                                                                <tr>
                                                                                    <th>Batch</th>
                                                                                    <th>Expiry</th>
                                                                                    <th className="text-end">Qty</th>
                                                                                    <th className="text-end">Pu Price</th>
                                                                                    <th className="text-end">MRP</th>
                                                                                    <th>Supplier</th>
                                                                                    <th>Bill No</th>
                                                                                    <th>Status</th>
                                                                                    <th>Store</th>
                                                                                    <th>Rack</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {item.batches.map((batch, idx) => (
                                                                                    <tr key={idx}>
                                                                                        <td>{batch.batchNumber || 'N/A'}</td>
                                                                                        <td>{batch.expiryDate || 'N/A'}</td>
                                                                                        <td className="text-end">{batch.quantity}</td>
                                                                                        <td className="text-end">Rs. {formatCurrency(batch.puPrice)}</td>
                                                                                        <td className="text-end">Rs. {formatCurrency(batch.mrp)}</td>
                                                                                        <td>{batch.supplierName || 'N/A'}</td>
                                                                                        <td>
                                                                                            {batch.purchaseBillNumber || ''}
                                                                                            {batch.partyBillNumber && ` (${batch.partyBillNumber})`}
                                                                                        </td>                                                                                        <td>
                                                                                            <span className={`badge ${getExpiryStatusBadge(batch.expiryStatus)}`} style={{ fontSize: '0.55rem' }}>
                                                                                                {batch.expiryStatus || 'N/A'}
                                                                                                {batch.daysUntilExpiry > 0 && batch.daysUntilExpiry <= 90 && (
                                                                                                    <span> ({batch.daysUntilExpiry}d)</span>
                                                                                                )}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td>{batch.storeName || 'N/A'}</td>
                                                                                        <td>{batch.rackName || 'N/A'}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="9" className="text-center text-muted py-3">
                                                        <i className="bi bi-inbox me-1"></i>
                                                        No inventory items found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {inventoryData.totalItems > 0 && (
                                    <div className="d-flex justify-content-between align-items-center mt-1">
                                        <div className="d-flex align-items-center">
                                            <label className="mb-0 me-2" style={{ fontSize: '0.75rem' }}>
                                                Rows per page:
                                            </label>
                                            <select
                                                className="form-select form-select-sm"
                                                value={rowsPerPage}
                                                onChange={handleRowsPerPageChange}
                                                style={{ width: '60px', fontSize: '0.75rem' }}
                                            >
                                                <option value={5}>5</option>
                                                <option value={10}>10</option>
                                                <option value={25}>25</option>
                                                <option value={50}>50</option>
                                            </select>
                                            <span className="ms-2" style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                                                {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, inventoryData.totalItems)} of {inventoryData.totalItems}
                                            </span>
                                        </div>

                                        <div className="d-flex align-items-center gap-1">
                                            <button
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={goToPreviousPage}
                                                disabled={currentPage === 1}
                                                style={{ padding: '0 8px', fontSize: '0.75rem' }}
                                            >
                                                <i className="bi bi-chevron-left"></i>
                                            </button>

                                            {Array.from({ length: Math.min(5, inventoryData.totalPages) }, (_, i) => {
                                                let pageNumber;
                                                if (inventoryData.totalPages <= 5) {
                                                    pageNumber = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNumber = i + 1;
                                                } else if (currentPage >= inventoryData.totalPages - 2) {
                                                    pageNumber = inventoryData.totalPages - 4 + i;
                                                } else {
                                                    pageNumber = currentPage - 2 + i;
                                                }

                                                return (
                                                    <button
                                                        key={i}
                                                        className={`btn btn-sm ${currentPage === pageNumber ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                        onClick={() => handlePageChange(pageNumber)}
                                                        style={{
                                                            padding: '0 8px',
                                                            fontSize: '0.75rem',
                                                            minWidth: '30px'
                                                        }}
                                                    >
                                                        {pageNumber}
                                                    </button>
                                                );
                                            })}

                                            <button
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={goToNextPage}
                                                disabled={currentPage === inventoryData.totalPages}
                                                style={{ padding: '0 8px', fontSize: '0.75rem' }}
                                            >
                                                <i className="bi bi-chevron-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                            <i className="bi bi-x-circle me-1"></i> Close
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .sticky-top {
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                
                .modal-body .table-responsive {
                    scrollbar-width: thin;
                }
                
                .modal-body .table-responsive::-webkit-scrollbar {
                    width: 4px;
                    height: 4px;
                }
                
                .modal-body .table-responsive::-webkit-scrollbar-thumb {
                    background-color: #c1c7cd;
                    border-radius: 4px;
                }
                
                .modal-body .table-responsive::-webkit-scrollbar-track {
                    background-color: #f1f1f1;
                }
                
                .badge {
                    font-size: 0.65rem;
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
};

export default DailyInventorySummary;