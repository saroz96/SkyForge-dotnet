import React, { useState, useEffect } from 'react';
import { Modal, Form } from 'react-bootstrap';
import axios from 'axios';
import NotificationToast from '../../../NotificationToast';

const BatchUpdateModal = ({ product, batch, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        oldBatchNumber: batch?.batchNumber || '',
        newBatchNumber: batch?.batchNumber || '',
        expiryDate: batch?.expiryDate ? new Date(batch.expiryDate).toISOString().split('T')[0] : '',
        price: batch?.price || 0,       // Sales Price (editable)
        mrp: batch?.mrp || 0            // MRP (editable)
    });

    // Store puPrice separately for display only (not for update)
    const [displayPuPrice, setDisplayPuPrice] = useState(batch?.puPrice || 0);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: ''
    });

    // Create axios instance with auth
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

    // Debug: Log the batch being updated
    useEffect(() => {
        console.log('BatchUpdateModal - Debug Info:');
        console.log('Product ID:', product?._id || product?.id);
        console.log('Batch data:', batch);
        console.log('Old Batch Number:', batch?.batchNumber);
        console.log('PuPrice (display only):', batch?.puPrice);
        console.log('Full stock entries:', product?.stockEntries);

        // Update displayPuPrice when batch changes
        if (batch?.puPrice !== undefined) {
            setDisplayPuPrice(batch.puPrice);
        }
    }, [product, batch]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' || name === 'mrp' ? parseFloat(value) || 0 : value
        }));
    };

    // Calculate margin percentage from PuPrice (display only) to Sales Price
    const calculateMarginPercentage = (puPrice, price) => {
        if (puPrice <= 0 || price <= 0) return 0;
        const margin = ((price - puPrice) / puPrice) * 100;
        return margin.toFixed(2);
    };

    // Calculate markup percentage (for display)
    const calculateMarkupPercentage = (puPrice, mrp) => {
        if (puPrice <= 0 || mrp <= 0) return 0;
        const markup = ((mrp - puPrice) / puPrice) * 100;
        return markup.toFixed(2);
    };

    // Use displayPuPrice for calculations (not formData.puPrice since it doesn't exist)
    const marginPercentage = calculateMarginPercentage(displayPuPrice, formData.price);
    const markupPercentage = calculateMarkupPercentage(displayPuPrice, formData.mrp);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Validate that at least one field has changed
        const hasChanges =
            formData.newBatchNumber !== batch?.batchNumber ||
            formData.price !== batch?.price ||
            formData.mrp !== batch?.mrp ||
            formData.expiryDate !== (batch?.expiryDate ? new Date(batch.expiryDate).toISOString().split('T')[0] : '');

        if (!hasChanges) {
            setNotification({
                show: true,
                message: 'No changes detected',
                type: 'warning'
            });
            setIsSubmitting(false);
            return;
        }

        // Validate MRP is not less than Sales Price
        if (formData.mrp < formData.price) {
            setNotification({
                show: true,
                message: 'MRP cannot be less than Sales Price',
                type: 'error'
            });
            setIsSubmitting(false);
            return;
        }

        // Validate Sales Price is not less than Purchase Price (using displayPuPrice)
        if (formData.price < displayPuPrice) {
            setNotification({
                show: true,
                message: `Sales Price (Rs.${formData.price}) cannot be less than Purchase Price (Rs.${displayPuPrice})`,
                type: 'error'
            });
            setIsSubmitting(false);
            return;
        }

        try {
            // Calculate margin percentage (based on displayPuPrice to Price)
            const calculatedMargin = parseFloat(calculateMarginPercentage(displayPuPrice, formData.price));

            const requestBody = {
                oldBatchNumber: batch.batchNumber,
                newBatchNumber: formData.newBatchNumber,
                expiryDate: formData.expiryDate || null,
                price: formData.price,           // Sales Price
                mrp: formData.mrp,               // MRP
                marginPercentage: calculatedMargin  // Auto-calculate and send margin
                // NOTE: puPrice is NOT sent - it should not be updated
            };

            console.log('Sending update request (puPrice not included):', requestBody);

            const response = await api.put(
                `/api/retailer/items/${product._id || product.id}/batch`,
                requestBody
            );

            if (response.status === 200 && response.data.success) {
                setNotification({
                    show: true,
                    message: 'Batch updated successfully!',
                    type: 'success'
                });

                // Call the onUpdate callback to refresh the data
                if (onUpdate && typeof onUpdate === 'function') {
                    onUpdate();
                }

                // Close modal after short delay
                setTimeout(() => {
                    if (onClose && typeof onClose === 'function') {
                        onClose();
                    }
                }, 1500);
            } else {
                const errorMsg = response.data?.message ||
                    response.data?.error ||
                    'Failed to update batch';
                setNotification({
                    show: true,
                    message: errorMsg,
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error updating batch:', error);

            let errorMessage = 'An error occurred while updating batch';
            if (error.response) {
                errorMessage = error.response.data?.message ||
                    error.response.data?.error ||
                    `Server error: ${error.response.status}`;
            } else if (error.request) {
                errorMessage = 'No response from server. Please check your connection.';
            } else {
                errorMessage = error.message || 'An unexpected error occurred';
            }

            setNotification({
                show: true,
                message: errorMessage,
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeNotification = () => {
        setNotification(prev => ({ ...prev, show: false }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/ /g, '-');
        } catch {
            return '-';
        }
    };

    const numberFormatter = new Intl.NumberFormat('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    // If no batch data, don't render modal
    if (!batch) {
        return null;
    }

    return (
        <>
            <Modal
                show={true}
                onHide={onClose}
                centered
                backdrop="static"
                size="lg"
                dialogClassName="batch-update-modal-compact"
            >
                <Modal.Header closeButton className="py-2" style={{
                    backgroundColor: '#f8f9fa',
                    borderBottom: '1px solid #dee2e6'
                }}>
                    <div className="d-flex justify-content-between align-items-center w-100 flex-wrap">
                        <div>
                            <span className="fw-bold" style={{ fontSize: '0.9rem' }}>
                                Update Batch - {product?.name || 'Product'}
                            </span>
                            <span className="ms-2 text-muted" style={{ fontSize: '0.8rem' }}>
                                ({product?.uniqueNumber || 'N/A'})
                            </span>
                        </div>
                    </div>
                </Modal.Header>

                <Modal.Body className="p-3" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <Form id="batchUpdateForm" onSubmit={handleSubmit}>
                        {/* Batch Number Row */}
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <Form.Group>
                                    <Form.Label style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                        <span className="text-danger">*</span> Old Batch
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={batch.batchNumber || ''}
                                        disabled
                                        className="bg-light"
                                        style={{
                                            fontSize: '0.85rem',
                                            padding: '0.375rem 0.5rem',
                                            cursor: 'not-allowed'
                                        }}
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group>
                                    <Form.Label style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                        <span className="text-danger">*</span> New Batch
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="newBatchNumber"
                                        value={formData.newBatchNumber}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter new batch number"
                                        style={{ fontSize: '0.85rem', padding: '0.375rem 0.5rem' }}
                                    />
                                </Form.Group>
                            </div>
                        </div>

                        {/* Purchase Price Row - READ ONLY (Display Only) */}
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <Form.Group>
                                    <Form.Label style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                        Purchase Price (Rs.) <span className="text-muted">(Read Only)</span>
                                    </Form.Label>
                                    <div className="input-group">
                                        <span className="input-group-text" style={{ fontSize: '0.8rem', padding: '0.375rem 0.5rem' }}>Rs.</span>
                                        <Form.Control
                                            type="text"
                                            value={numberFormatter.format(displayPuPrice)}
                                            disabled
                                            className="bg-light"
                                            style={{
                                                fontSize: '0.85rem',
                                                padding: '0.375rem 0.5rem',
                                                cursor: 'not-allowed',
                                                backgroundColor: '#e9ecef'
                                            }}
                                        />
                                    </div>
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group>
                                    <Form.Label style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                        Expiry Date
                                    </Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="expiryDate"
                                        value={formData.expiryDate}
                                        onChange={handleChange}
                                        style={{ fontSize: '0.85rem', padding: '0.375rem 0.5rem' }}
                                    />
                                </Form.Group>
                            </div>
                        </div>
                        <div className="row mb-3">
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                        <span className="text-danger">*</span> MRP (Rs.)
                                    </Form.Label>
                                    <div className="input-group">
                                        <span className="input-group-text" style={{ fontSize: '0.8rem', padding: '0.375rem 0.5rem' }}>Rs.</span>
                                        <Form.Control
                                            type="number"
                                            name="mrp"
                                            value={formData.mrp}
                                            onChange={handleChange}
                                            step="0.01"
                                            min="0"
                                            required
                                            style={{ fontSize: '0.85rem', padding: '0.375rem 0.5rem' }}
                                        />
                                    </div>
                                </Form.Group>
                            </div>
                                   <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                        Margin (%)
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={marginPercentage > 0 ? `${marginPercentage}%` : '0%'}
                                        disabled
                                        className={`bg-light ${marginPercentage < 0 ? 'text-danger' : marginPercentage > 0 ? 'text-success' : ''}`}
                                        style={{
                                            fontSize: '0.85rem',
                                            padding: '0.375rem 0.5rem',
                                            fontWeight: 500
                                        }}
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                        <span className="text-danger">*</span> Sales Price (Rs.)
                                    </Form.Label>
                                    <div className="input-group">
                                        <span className="input-group-text" style={{ fontSize: '0.8rem', padding: '0.375rem 0.5rem' }}>Rs.</span>
                                        <Form.Control
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleChange}
                                            step="0.01"
                                            min="0"
                                            required
                                            style={{ fontSize: '0.85rem', padding: '0.375rem 0.5rem' }}
                                        />
                                    </div>
                                </Form.Group>
                            </div>
                        </div>
                    </Form>

                    {/* Warning Messages */}
                    {formData.newBatchNumber !== batch.batchNumber && (
                        <div className="alert alert-warning py-2 px-2 mt-2 mb-0" style={{ fontSize: '0.7rem' }}>
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            <strong>Warning:</strong> Changing batch number from
                            <span className="fw-bold mx-1">"{batch.batchNumber}"</span>
                            to <span className="fw-bold mx-1">"{formData.newBatchNumber}"</span>
                            will update all related transactions.
                        </div>
                    )}

                    {formData.price < displayPuPrice && formData.price > 0 && (
                        <div className="alert alert-danger py-2 px-2 mt-2 mb-0" style={{ fontSize: '0.7rem' }}>
                            <i className="bi bi-exclamation-circle me-1"></i>
                            <strong>Error:</strong> Sales Price (Rs.{numberFormatter.format(formData.price)}) is less than Purchase Price (Rs.{numberFormatter.format(displayPuPrice)}).
                            This will result in negative margin!
                        </div>
                    )}

                    {formData.mrp < formData.price && formData.mrp > 0 && (
                        <div className="alert alert-warning py-2 px-2 mt-2 mb-0" style={{ fontSize: '0.7rem' }}>
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            <strong>Warning:</strong> MRP (Rs.{numberFormatter.format(formData.mrp)}) is less than Sales Price (Rs.{numberFormatter.format(formData.price)}).
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer className="py-2 px-3" style={{
                    backgroundColor: '#f8f9fa',
                    borderTop: '1px solid #dee2e6'
                }}>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary px-3"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{ fontSize: '0.8rem' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-primary px-3"
                        onClick={handleSubmit}
                        disabled={isSubmitting || (formData.price < displayPuPrice && formData.price > 0)}
                        style={{ fontSize: '0.8rem' }}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" style={{ width: '0.8rem', height: '0.8rem' }}></span>
                                Updating...
                            </>
                        ) : 'Update Batch'}
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Notification Toast */}
            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={closeNotification}
            />

            <style jsx global>{`
                .batch-update-modal-compact {
                    max-width: 700px;
                    width: 100%;
                    margin: 0 auto;
                }
                .batch-update-modal-compact .modal-content {
                    border-radius: 8px;
                    overflow: hidden;
                }
                .form-control:focus {
                    box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.15);
                    border-color: #86b7fe;
                }
                .btn:focus {
                    box-shadow: none;
                }
                @media (max-width: 768px) {
                    .batch-update-modal-compact {
                        max-width: 95%;
                        margin: 0 auto;
                    }
                }
            `}</style>
        </>
    );
};

export default BatchUpdateModal;