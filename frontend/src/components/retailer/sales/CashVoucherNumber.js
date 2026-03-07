
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import ProductModal from '../dashboard/modals/ProductModal';

const CashSalesVoucherNumber = () => {
    const [billNumber, setBillNumber] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingLatest, setIsFetchingLatest] = useState(true);
    const [showProductModal, setShowProductModal] = useState(false);
    const billNumberInputRef = useRef(null);

    // NEW: State for credit sales warning
    const [showCreditSalesWarning, setShowCreditSalesWarning] = useState(false);
    const [creditSalesBillNumber, setCreditSalesBillNumber] = useState('');

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
        if (!showCreditSalesWarning) {
            const timer = setTimeout(() => {
                if (billNumberInputRef.current) {
                    billNumberInputRef.current.focus();
                }
            }, 200);

            return () => clearTimeout(timer);
        }
    }, [showCreditSalesWarning]);

    // Fetch the latest bill number when component mounts
    useEffect(() => {
        const fetchLatestBillNumber = async () => {
            try {
                const response = await api.get('/api/retailer/cash-sales/finds');

                console.log('API Response:', response.data);
                if (response.data.success) {
                    setBillNumber(response.data.data.billNumber || '');
                }
            } catch (err) {
                console.error('Error fetching latest bill number:', err);
            } finally {
                setIsFetchingLatest(false);
            }
        };

        fetchLatestBillNumber();
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

    // NEW: Check if bill is credit sales before proceeding
    const checkBillEditable = async (billNum) => {
        try {
            const response = await api.get('/api/retailer/cash-sales/check-editable', {
                params: { billNumber: billNum }
            });

            if (response.data.success) {
                return {
                    isEditable: response.data.isEditable,
                    hasCreditAccount: response.data.hasCreditAccount,
                    message: response.data.message
                };
            }
            return { isEditable: false, hasCreditAccount: false, message: response.data.error };
        } catch (err) {
            console.error('Error checking bill editability:', err);
            return { isEditable: false, hasCreditAccount: false, message: 'Error checking voucher' };
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setShowCreditSalesWarning(false);

        if (!billNumber.trim()) {
            setError('Please enter a voucher number');
            return;
        }

        setIsLoading(true);
        try {
            // NEW: First check if bill is editable
            const editableCheck = await checkBillEditable(billNumber);

            if (!editableCheck.isEditable) {
                if (editableCheck.hasCreditAccount) {
                    // Show credit sales warning
                    setCreditSalesBillNumber(billNumber);
                    setShowCreditSalesWarning(true);
                } else {
                    setError(editableCheck.message || 'Voucher not found or cannot be edited');
                }
                setIsLoading(false);
                return;
            }

            // UPDATED: Use the correct endpoint to get bill ID by number
            const response = await api.get('/api/retailer/cash-sales/get-id-by-number', {
                params: { billNumber }
            });

            if (response.data.success) {
                // Navigate to edit page with the sales bill ID
                navigate(`/retailer/cash-sales/edit/${response.data.data.id}`);
            } else {
                setError(response.data.error || 'Sales voucher not found');
            }
        } catch (err) {
            console.error('Error fetching sales bill:', err);
            if (err.response?.status === 404) {
                setError('Voucher not found');
            } else {
                setError(err.response?.data?.error || 'An error occurred while fetching sales bill');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // NEW: Handle close credit sales warning
    const handleCloseCreditSalesWarning = () => {
        setShowCreditSalesWarning(false);
        setCreditSalesBillNumber('');
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

            if (!showCreditSalesWarning) {
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
                    <h1 className="text-center mb-4">Enter Cash Sales Voucher Number</h1>

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
                                Enter voucher number to find and edit cash sales
                            </small>
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
                            ) : 'Find Cash Sales'}
                        </button>
                    </form>
                </div>
            </div>

            {/* NEW: Credit Sales Warning Modal */}
            {showCreditSalesWarning && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
                    <div className="modal fade show" tabIndex="-1" style={{ display: 'block', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}>
                        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
                            <div className="modal-content">
                                <div className="modal-header bg-warning text-dark">
                                    <h5 className="modal-title">
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        Cannot Edit Credit Sales
                                    </h5>
                                    <button type="button" className="btn-close" onClick={handleCloseCreditSalesWarning}></button>
                                </div>
                                <div className="modal-body text-center py-4">
                                    <i className="bi bi-credit-card text-warning" style={{ fontSize: '3rem' }}></i>
                                    <h6 className="mt-3">Voucher #{creditSalesBillNumber}</h6>
                                    <p className="mt-2">
                                        This is a credit sales voucher and cannot be edited as cash sales.
                                        Credit sales vouchers are processed through the credit sales module.
                                    </p>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-primary w-100"
                                        onClick={handleCloseCreditSalesWarning}
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

export default CashSalesVoucherNumber;