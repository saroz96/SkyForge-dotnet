import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import axios from 'axios';
import NotificationToast from '../../../NotificationToast';

const BatchUpdateModal = ({ product, batch, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        batchNumber: batch.batchNumber || '',
        expiryDate: batch.expiryDate ? new Date(batch.expiryDate).toISOString().split('T')[0] : '',
        price: batch.price || 0
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: ''
    });
    const [apiError, setApiError] = useState(null);

    // Debug: Log the batch index being passed
    useEffect(() => {
        console.log('BatchUpdateModal - Debug Info:');
        console.log('Product ID:', product._id);
        console.log('Batch index being used:', batch.index);
        console.log('Batch data:', batch);
        console.log('Full stock entries:', product.stockEntries);
        
        if (product.stockEntries && batch.index !== undefined) {
            console.log('Stock entry at this index:', product.stockEntries[batch.index]);
        }
    }, [product, batch]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' ? parseFloat(value) || 0 : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setApiError(null);
        
        try {
            // Use product._id instead of product.id
            const response = await axios.put(
                `/api/retailer/update-batch/${product._id}/${batch.index}`,
                formData,
                {
                    validateStatus: (status) => status < 500
                }
            );
            
            if (response.status === 200 && response.data.success) {
                setNotification({
                    show: true,
                    message: 'Batch updated successfully!',
                    type: 'success'
                });
                onUpdate();
                setTimeout(() => onClose(), 1500);
            } else {
                const errorMsg = response.data.message || 
                               response.data.error || 
                               'Failed to update batch';
                setNotification({
                    show: true,
                    message: errorMsg,
                    type: 'error'
                });
                setApiError(errorMsg);
            }
        } catch (error) {
            console.error('Error updating batch:', error);
            
            let errorMessage = 'An error occurred while updating batch';
            if (error.response) {
                errorMessage = error.response.data?.message || 
                             error.response.data?.error || 
                             `Server error: ${error.response.status}`;
            } else if (error.request) {
                errorMessage = 'No response from server';
            }
            
            setNotification({
                show: true,
                message: errorMessage,
                type: 'error'
            });
            setApiError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeNotification = () => {
        setNotification(prev => ({ ...prev, show: false }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, '-');
    };

    const numberFormatter = new Intl.NumberFormat('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

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
                <Modal.Header closeButton className="py-1" style={{
                    backgroundColor: '#f8f9fa',
                    borderBottom: '1px solid #dee2e6',
                    fontSize: '0.9rem'
                }}>
                    <div className="d-flex justify-content-between align-items-center w-100">
                        <div>
                            <span className="fw-bold" style={{ fontSize: '0.85rem' }}>
                                Update Batch - {product.name}
                            </span>
                            <span className="ms-2 text-muted" style={{ fontSize: '0.8rem' }}>
                                ({product.uniqueNumber})
                            </span>
                        </div>
                        <div style={{ fontSize: '0.8rem' }}>
                            Batch: <span className="fw-bold">{batch.batchNumber || '-'}</span>
                        </div>
                    </div>
                </Modal.Header>

                <Modal.Body className="p-0" style={{ maxHeight: '250px', minHeight: '250px', overflowY: 'auto' }}>
                    <div className="px-3 py-2" style={{ fontSize: '0.8rem' }}>
                        <Form id="batchUpdateForm" onSubmit={handleSubmit}>
                            <div className="row mb-2">
                                <div className="col-md-6">
                                    <Form.Group>
                                        <Form.Label style={{ fontSize: '0.75rem' }}>Batch Number</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="batchNumber"
                                            value={formData.batchNumber}
                                            onChange={handleChange}
                                            required
                                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                        />
                                    </Form.Group>
                                </div>
                                <div className="col-md-6">
                                    <Form.Group>
                                        <Form.Label style={{ fontSize: '0.75rem' }}>Expiry Date</Form.Label>
                                        <Form.Control
                                            type="date"
                                            name="expiryDate"
                                            value={formData.expiryDate}
                                            onChange={handleChange}
                                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                        />
                                        <Form.Text className="text-muted" style={{ fontSize: '0.7rem' }}>
                                            Leave empty if no expiry date
                                        </Form.Text>
                                    </Form.Group>
                                </div>
                            </div>
                            
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <Form.Group>
                                        <Form.Label style={{ fontSize: '0.75rem' }}>Sales Price (Rs.)</Form.Label>
                                        <div className="input-group" style={{ fontSize: '0.8rem' }}>
                                            <span className="input-group-text" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>Rs.</span>
                                            <Form.Control
                                                type="number"
                                                name="price"
                                                value={formData.price}
                                                onChange={handleChange}
                                                step="0.01"
                                                min="0"
                                                required
                                                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                            />
                                        </div>
                                    </Form.Group>
                                </div>
                            </div>
                        </Form>

                        <div className="p-2 bg-light rounded" style={{ fontSize: '0.75rem' }}>
                            <div className="fw-bold mb-1">Current Batch Info:</div>
                            <div className="row">
                                <div className="col-4">
                                    <strong>Batch:</strong> {batch.batchNumber || '-'}
                                </div>
                                <div className="col-4">
                                    <strong>Expiry:</strong> {formatDate(batch.expiryDate)}
                                </div>
                                <div className="col-4">
                                    <strong>Price:</strong> Rs.{numberFormatter.format(batch.price)}
                                </div>
                            </div>
                            <div className="mt-2 text-muted" style={{ fontSize: '0.7rem' }}>
                                <small>Index: {batch.index} | Total batches: {product.stockEntries?.length || 0}</small>
                            </div>
                        </div>
                    </div>
                </Modal.Body>

                <Modal.Footer className="py-1 px-2" style={{
                    backgroundColor: '#f8f9fa',
                    borderTop: '1px solid #dee2e6',
                    fontSize: '0.75rem'
                }}>
                    <div className="d-flex justify-content-end align-items-center w-100">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary py-1 px-3 me-2"
                            onClick={onClose}
                            disabled={isSubmitting}
                            style={{ fontSize: '0.75rem' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-primary py-1 px-3"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            style={{ fontSize: '0.75rem' }}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-1" style={{ width: '0.8rem', height: '0.8rem' }}></span>
                                    Saving...
                                </>
                            ) : 'Save Changes'}
                        </button>
                    </div>
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
                    max-width: 50vw;
                    width: 50vw;
                    max-height: 350px;
                    margin: 0 auto;
                }
                .batch-update-modal-compact .modal-content {
                    max-height: 350px;
                }
                .batch-update-modal-compact .modal-body {
                    max-height: 250px;
                    overflow-y: auto;
                }
                .form-control:focus {
                    box-shadow: 0 0 0 0.1rem rgba(13, 110, 253, 0.25);
                    border-color: #86b7fe;
                }
            `}</style>
        </>
    );
};

export default BatchUpdateModal;