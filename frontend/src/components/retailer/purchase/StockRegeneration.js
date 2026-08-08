import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';

const StockRegeneration = () => {
    const { billId } = useParams();
    const navigate = useNavigate();
    
    // State declarations
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [billData, setBillData] = useState(null);
    const [stockEntries, setStockEntries] = useState([]);
    const [existingStockCount, setExistingStockCount] = useState(0);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [overwriteExisting, setOverwriteExisting] = useState(true);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [company, setCompany] = useState({
        dateFormat: 'nepali'
    });

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

    // Fetch bill data on load
    useEffect(() => {
        fetchBillData();
    }, [billId]);

    const fetchBillData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch the purchase bill details
            const billResponse = await api.get(`/api/retailer/purchase/${billId}`);
            
            if (billResponse.data.success) {
                setBillData(billResponse.data.data);
                
                // Check if there are existing stock entries
                const stockResponse = await api.get(`/api/retailer/purchase/${billId}/stock-entries`);
                if (stockResponse.data.success) {
                    setStockEntries(stockResponse.data.data || []);
                    setExistingStockCount(stockResponse.data.data?.length || 0);
                }
            } else {
                setError('Failed to load bill data');
            }
        } catch (err) {
            console.error('Error fetching bill data:', err);
            setError(err.response?.data?.error || 'Failed to load bill data');
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async () => {
        setProcessing(true);
        setError(null);
        setResult(null);

        try {
            const response = await api.post('/api/retailer/purchase/regenerate-stock', {
                purchaseBillId: billId,
                overwriteExisting: overwriteExisting
            });

            if (response.data.success) {
                setResult(response.data.data);
                setNotification({
                    show: true,
                    message: response.data.message || 'Stock entries regenerated successfully!',
                    type: 'success'
                });
                setShowConfirmModal(false);
                // Refresh stock entries
                await fetchBillData();
            } else {
                setError(response.data.error || 'Failed to regenerate stock entries');
                setNotification({
                    show: true,
                    message: response.data.error || 'Failed to regenerate stock entries',
                    type: 'error'
                });
            }
        } catch (err) {
            console.error('Error regenerating stock:', err);
            const errorMsg = err.response?.data?.error || 'Failed to regenerate stock entries';
            setError(errorMsg);
            setNotification({
                show: true,
                message: errorMsg,
                type: 'error'
            });
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return 'N/A';
            return d.toLocaleDateString('en-NP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch {
            return 'N/A';
        }
    };

    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null) return 'Rs. 0.00';
        return `Rs. ${parseFloat(amount).toFixed(2)}`;
    };

    if (loading) {
        return (
            <div className="container-fluid">
                <Header />
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 text-muted">Loading bill data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid">
                <Header />
                <div className="card mt-3 shadow-sm">
                    <div className="card-body text-center py-4">
                        <div className="alert alert-danger">
                            <h5 className="alert-heading">
                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                Error
                            </h5>
                            <p>{error}</p>
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/retailer/purchase-register')}
                        >
                            <i className="bi bi-arrow-left me-2"></i>
                            Back to Register
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <Header />
            
            <div className="card mt-3 shadow-lg animate__animated animate__fadeInUp">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                        <i className="bi bi-arrow-repeat me-2"></i>
                        Regenerate Stock Entries
                    </h5>
                    <div>
                        <span className="badge bg-light text-dark me-2">
                            Bill: {billData?.billNumber || 'N/A'}
                        </span>
                        <span className="badge bg-light text-dark">
                            {billData?.items?.length || 0} Items
                        </span>
                    </div>
                </div>

                <div className="card-body">
                    {/* Bill Information */}
                    <div className="row mb-4">
                        <div className="col-md-6">
                            <h6 className="border-bottom pb-2">
                                <i className="bi bi-info-circle me-1"></i>
                                Bill Information
                            </h6>
                            <table className="table table-sm table-bordered">
                                <tbody>
                                    <tr>
                                        <th style={{ width: '40%' }}>Bill Number</th>
                                        <td><strong>{billData?.billNumber || 'N/A'}</strong></td>
                                    </tr>
                                    <tr>
                                        <th>Party Bill Number</th>
                                        <td>{billData?.partyBillNumber || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <th>Date</th>
                                        <td>{formatDate(billData?.date)}</td>
                                    </tr>
                                    <tr>
                                        <th>Party</th>
                                        <td>{billData?.accountName || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <th>Total Amount</th>
                                        <td><strong>{formatCurrency(billData?.totalAmount)}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="col-md-6">
                            <h6 className="border-bottom pb-2">
                                <i className="bi bi-box-seam me-1"></i>
                                Stock Status
                            </h6>
                            <table className="table table-sm table-bordered">
                                <tbody>
                                    <tr>
                                        <th style={{ width: '40%' }}>Existing Stock Entries</th>
                                        <td>
                                            <span className={`badge ${existingStockCount > 0 ? 'bg-warning' : 'bg-success'}`}>
                                                {existingStockCount} entries
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>Status</th>
                                        <td>
                                            {existingStockCount > 0 ? (
                                                <span className="badge bg-warning">
                                                    <i className="bi bi-exclamation-triangle me-1"></i>
                                                    Existing entries found
                                                </span>
                                            ) : (
                                                <span className="badge bg-success">
                                                    <i className="bi bi-check-circle me-1"></i>
                                                    No entries found
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>Items in Bill</th>
                                        <td>
                                            <span className="badge bg-info">
                                                {billData?.items?.length || 0} items
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Items List */}
                    <h6 className="border-bottom pb-2 mt-3">
                        <i className="bi bi-list-ul me-1"></i>
                        Bill Items
                    </h6>
                    <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        <table className="table table-sm table-bordered table-hover">
                            <thead className="sticky-top bg-light">
                                <tr>
                                    <th>#</th>
                                    <th>Item</th>
                                    <th>Batch</th>
                                    <th>Expiry</th>
                                    <th>Qty</th>
                                    <th>Free</th>
                                    <th>Rate</th>
                                    <th className="text-end">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billData?.items?.map((item, index) => (
                                    <tr key={item.id || index}>
                                        <td>{index + 1}</td>
                                        <td>{item.itemName || 'N/A'}</td>
                                        <td>{item.batchNumber || 'XXX'}</td>
                                        <td>{item.expiryDate ? formatDate(item.expiryDate) : 'N/A'}</td>
                                        <td>{item.quantity || 0}</td>
                                        <td>{item.bonus || 0}</td>
                                        <td>{formatCurrency(item.puPrice)}</td>
                                        <td className="text-end">
                                            {formatCurrency((item.quantity || 0) * (item.puPrice || 0))}
                                        </td>
                                    </tr>
                                ))}
                                {(!billData?.items || billData.items.length === 0) && (
                                    <tr>
                                        <td colSpan="8" className="text-center text-muted py-2">
                                            No items found in this bill
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Existing Stock Entries Warning */}
                    {existingStockCount > 0 && (
                        <div className="alert alert-warning mt-3">
                            <h6 className="alert-heading">
                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                Existing Stock Entries Found
                            </h6>
                            <p className="mb-0">
                                This bill already has <strong>{existingStockCount}</strong> stock entries.
                                {overwriteExisting ? ' They will be replaced.' : ' They will be kept.'}
                            </p>
                        </div>
                    )}

                    {/* Result Display */}
                    {result && (
                        <div className="alert alert-success mt-3">
                            <h6 className="alert-heading">
                                <i className="bi bi-check-circle-fill me-2"></i>
                                Success!
                            </h6>
                            <p className="mb-1">{result.message}</p>
                            <hr />
                            <p className="mb-0">
                                <strong>Entries Regenerated:</strong> {result.entriesRegenerated}
                                {result.errors && result.errors.length > 0 && (
                                    <span className="ms-3 text-warning">
                                        <i className="bi bi-exclamation-triangle me-1"></i>
                                        <strong>Warnings:</strong> {result.errors.length}
                                    </span>
                                )}
                            </p>
                            {result.errors && result.errors.length > 0 && (
                                <ul className="mt-2 mb-0">
                                    {result.errors.map((err, idx) => (
                                        <li key={idx} className="text-warning">{err}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                <div className="card-footer d-flex justify-content-between align-items-center">
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/retailer/purchase-register')}
                    >
                        <i className="bi bi-arrow-left me-2"></i>
                        Back to Register
                    </button>
                    <div className="d-flex align-items-center gap-3">
                        <div className="form-check mb-0">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="overwriteExisting"
                                checked={overwriteExisting}
                                onChange={(e) => setOverwriteExisting(e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="overwriteExisting">
                                Overwrite existing entries
                            </label>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowConfirmModal(true)}
                            disabled={processing || !billData?.items?.length}
                        >
                            {processing ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-arrow-repeat me-2"></i>
                                    Regenerate Stock Entries
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div 
                    className="modal fade show" 
                    style={{ 
                        display: 'block', 
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 1050 
                    }}
                    tabIndex="-1"
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-warning text-dark">
                                <h5 className="modal-title">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    Confirm Regeneration
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowConfirmModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p>You are about to regenerate stock entries for bill <strong>{billData?.billNumber}</strong>.</p>
                                <p>This will:</p>
                                <ul>
                                    <li>
                                        {overwriteExisting ? (
                                            <strong className="text-warning">
                                                Remove and recreate all {existingStockCount} existing stock entries
                                            </strong>
                                        ) : (
                                            <span>Create new stock entries (existing ones will be kept)</span>
                                        )}
                                    </li>
                                    <li>Create stock entries for all {billData?.items?.length || 0} items in this bill</li>
                                </ul>
                                <div className="alert alert-danger">
                                    <i className="bi bi-exclamation-circle me-2"></i>
                                    This action cannot be undone!
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => setShowConfirmModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="btn btn-warning" 
                                    onClick={handleRegenerate}
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-check-lg me-2"></i>
                                            Confirm Regeneration
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />
        </div>
    );
};

export default StockRegeneration;