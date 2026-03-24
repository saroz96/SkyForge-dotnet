import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import ProductModal from '../dashboard/modals/ProductModal';

const ReceiptVoucherForm = () => {
    const [billNumber, setBillNumber] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingLatest, setIsFetchingLatest] = useState(true);
    const [showProductModal, setShowProductModal] = useState(false);
    const billNumberInputRef = useRef(null);

    // State for canceled receipt warning
    const [showCanceledWarning, setShowCanceledWarning] = useState(false);
    const [canceledBillNumber, setCanceledBillNumber] = useState('');

    const navigate = useNavigate();

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

    // Focus the input when component mounts
    useEffect(() => {
        const timer = setTimeout(() => {
            if (billNumberInputRef.current) {
                billNumberInputRef.current.focus();
            }
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    // Also focus when modal closes
    useEffect(() => {
        if (!showCanceledWarning) {
            const timer = setTimeout(() => {
                if (billNumberInputRef.current) {
                    billNumberInputRef.current.focus();
                }
            }, 200);

            return () => clearTimeout(timer);
        }
    }, [showCanceledWarning]);

    // Fetch the latest receipt bill number when component mounts
    useEffect(() => {
        const fetchLatestReceiptNumber = async () => {
            try {
                const response = await api.get('/api/retailer/receipts/finds');

                console.log('API Response:', response.data);
                if (response.data.success) {
                    setBillNumber(response.data.data.billNumber || '');
                }
            } catch (err) {
                console.error('Error fetching latest receipt number:', err);
                // Proceed with empty field if there's an error
            } finally {
                setIsFetchingLatest(false);
            }
        };

        fetchLatestReceiptNumber();
    }, []);

    // F9 key handler for product modal
    useEffect(() => {
        const handleF9KeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleF9KeyDown);
        return () => {
            window.removeEventListener('keydown', handleF9KeyDown);
        };
    }, []);

    // Check if receipt is editable (not canceled)
    const checkReceiptEditable = async (billNum) => {
        try {
            // Get the receipt by bill number to check its status
            const response = await api.get('/api/retailer/receipts/get-id-by-number', {
                params: { billNumber: billNum }
            });

            if (response.data.success) {
                // We'll need to check the receipt status - this would require another API call
                // or modify the get-id-by-number endpoint to return status
                // For now, assume not canceled
                return {
                    isEditable: true,
                    isCanceled: false,
                    message: ''
                };
            }
            return { isEditable: false, isCanceled: false, message: response.data.error };
        } catch (err) {
            console.error('Error checking receipt editability:', err);
            if (err.response?.status === 404) {
                return { isEditable: false, isCanceled: false, message: 'Voucher not found' };
            }
            return { isEditable: false, isCanceled: false, message: 'Error checking voucher' };
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setShowCanceledWarning(false);

        if (!billNumber.trim()) {
            setError('Please enter a voucher number');
            return;
        }

        setIsLoading(true);
        try {
            // Use the correct endpoint to get receipt ID by number
            const response = await api.get('/api/retailer/receipts/get-id-by-number', {
                params: { billNumber: billNumber.trim() }
            });

            if (response.data.success) {
                // Navigate to edit page with the receipt ID
                navigate(`/retailer/receipts/edit/${response.data.data.id}`);
            } else {
                setError(response.data.error || 'Receipt voucher not found');
            }
        } catch (err) {
            console.error('Error fetching receipt:', err);
            if (err.response?.status === 404) {
                setError('Voucher not found');
            } else if (err.response?.status === 403) {
                setError('Access denied. Retailer account required.');
            } else {
                setError(err.response?.data?.error || 'An error occurred while fetching receipt');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle close canceled warning
    const handleCloseCanceledWarning = () => {
        setShowCanceledWarning(false);
        setCanceledBillNumber('');
        // Focus back on input
        setTimeout(() => {
            if (billNumberInputRef.current) {
                billNumberInputRef.current.focus();
            }
        }, 100);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            if (!showCanceledWarning) {
                // Programmatically click the submit button
                document.getElementById('findBill')?.click();
            }
        }
    };

    return (
        <div className='Container-fluid'>
            <Header />

            {/* Main Search Form */}
            <div className="container mt-5 wow-form centered-container">
                <div className="card shadow-lg p-4 animate__animated animate__fadeInUp expanded-card">
                    <h1 className="text-center mb-4">Enter Receipt Voucher Number</h1>

                    {error && (
                        <div className="alert alert-danger alert-dismissible fade show" role="alert">
                            <strong>Error:</strong> {error}
                            <button type="button" className="btn-close" onClick={() => setError('')}></button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="needs-validation" noValidate>
                        <div className="form-group">
                            <label htmlFor="billNumber" className="form-label">Voucher Number</label>
                            <input
                                type="text"
                                name="billNumber"
                                id="billNumber"
                                className={`form-control ${error ? 'is-invalid' : ''}`}
                                required
                                placeholder="Enter voucher number"
                                aria-describedby="billHelp"
                                autoComplete="off"
                                ref={billNumberInputRef}
                                value={billNumber}
                                onChange={(e) => setBillNumber(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isFetchingLatest}
                            />
                            {isFetchingLatest && (
                                <div className="text-muted small mt-1">Loading latest voucher number...</div>
                            )}
                            <small id="billHelp" className="form-text text-muted">
                                Enter voucher number to find and edit receipt
                            </small>
                            {error && (
                                <div className="invalid-feedback d-block">
                                    {error}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block mt-3"
                            disabled={isLoading || isFetchingLatest || !billNumber.trim()}
                            id="findBill"
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Searching...
                                </>
                            ) : 'Find Receipt'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Canceled Receipt Warning Modal */}
            {showCanceledWarning && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
                    <div className="modal fade show" tabIndex="-1" style={{ display: 'block', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}>
                        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
                            <div className="modal-content">
                                <div className="modal-header bg-danger text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        Canceled Receipt
                                    </h5>
                                    <button type="button" className="btn-close" onClick={handleCloseCanceledWarning}></button>
                                </div>
                                <div className="modal-body text-center py-4">
                                    <i className="bi bi-x-circle text-danger" style={{ fontSize: '3rem' }}></i>
                                    <h6 className="mt-3">Voucher #{canceledBillNumber}</h6>
                                    <p className="mt-2">
                                        This receipt voucher has been canceled and cannot be edited.
                                        Canceled vouchers are locked for editing.
                                    </p>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-primary w-100"
                                        onClick={handleCloseCanceledWarning}
                                    >
                                        OK, Got It
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Product Modal */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}
        </div>
    );
};

export default ReceiptVoucherForm;