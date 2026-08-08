// CashSettlementModal.js
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Badge } from 'react-bootstrap';

const CashSettlementModal = ({ show, onClose, transaction, onSettle, formatCurrency }) => {
    const [status, setStatus] = useState('');
    const [remarks, setRemarks] = useState('');
    const [loading, setLoading] = useState(false);
    const [transactionId, setTransactionId] = useState(null);

    useEffect(() => {
        if (show && transaction) {
            // Get the transaction ID based on type
            let id = null;
            switch (transaction.type) {
                case 'Sale':
                    id = transaction.salesBillId;
                    break;
                case 'Purc':
                    id = transaction.purchaseBillId;
                    break;
                case 'SlRt':
                    id = transaction.salesReturnBillId;
                    break;
                case 'PrRt':
                    id = transaction.purchaseReturnBillId;
                    break;
                default:
                    id = transaction.billId || transaction.id || transaction.transactionId || transaction.BillId || transaction.Id;
            }

            console.log('Modal received transaction:', transaction);
            console.log('Extracted transaction ID:', id);
            console.log('Transaction type:', transaction.type);

            setTransactionId(id);

            // Set default status based on transaction type
            const defaultStatus = getDefaultStatus(transaction.type);
            setStatus(transaction.cashSettlementStatus || defaultStatus);
            setRemarks(transaction.cashSettlementRemarks || '');
        }
    }, [show, transaction]);

    const getStatusOptions = (transactionType) => {
        switch (transactionType) {
            case 'Sale':
                return [
                    { value: 'Received', label: 'Mark as Received', description: 'Money received from customer' },
                    { value: 'Pending', label: 'Mark as Pending', description: 'Settlement pending' }
                ];
            case 'Purc':
                return [
                    { value: 'Paid', label: 'Mark as Paid', description: 'Money paid to supplier' },
                    { value: 'Pending', label: 'Mark as Pending', description: 'Settlement pending' }
                ];
            case 'SlRt':
                return [
                    { value: 'Refunded', label: 'Mark as Refunded', description: 'Money refunded to customer' },
                    { value: 'Pending', label: 'Mark as Pending', description: 'Settlement pending' }
                ];
            case 'PrRt':
                return [
                    { value: 'Returned', label: 'Mark as Returned', description: 'Money returned from supplier' },
                    { value: 'Pending', label: 'Mark as Pending', description: 'Settlement pending' }
                ];
            default:
                return [
                    { value: 'Received', label: 'Received' },
                    { value: 'Paid', label: 'Paid' },
                    { value: 'Refunded', label: 'Refunded' },
                    { value: 'Returned', label: 'Returned' },
                    { value: 'Pending', label: 'Pending' }
                ];
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Received': return 'success';
            case 'Paid': return 'info';
            case 'Refunded': return 'warning';
            case 'Returned': return 'success';
            case 'Pending': return 'secondary';
            default: return 'secondary';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Received': return '✓';
            case 'Paid': return '✓';
            case 'Refunded': return '↩';
            case 'Returned': return '↩';
            case 'Pending': return '⏳';
            default: return '';
        }
    };

    const getDefaultStatus = (transactionType) => {
        switch (transactionType) {
            case 'Sale': return 'Received';
            case 'Purc': return 'Paid';
            case 'SlRt': return 'Refunded';
            case 'PrRt': return 'Returned';
            default: return 'Pending';
        }
    };

    const getStatusDescription = (status, transactionType) => {
        switch (status) {
            case 'Received': return 'Money has been received for this transaction.';
            case 'Paid': return 'Money has been paid for this transaction.';
            case 'Refunded': return 'Money has been refunded to the customer.';
            case 'Returned': return 'Money has been returned from the supplier.';
            case 'Pending': return 'Money settlement is pending.';
            default: return '';
        }
    };

    const handleSubmit = async () => {
        if (!transactionId) {
            console.error('No transaction ID available for settlement');
            alert('Transaction ID is missing. Please try again.');
            return;
        }

        setLoading(true);
        try {
            console.log('Submitting settlement with ID:', transactionId, 'Status:', status);
            await onSettle(transactionId, status, remarks);
        } catch (error) {
            console.error('Error in handleSubmit:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!transaction) return null;

    const options = getStatusOptions(transaction.type);

    return (
        <Modal show={show} onHide={onClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <span className="d-flex align-items-center">
                        <i className="bi bi-cash-stack me-2"></i>
                        Cash Settlement
                    </span>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="mb-3">
                    <h6 className="text-muted">Transaction Details</h6>
                    <div className="d-flex justify-content-between">
                        <span><strong>Voucher:</strong> {transaction.billNumber || transaction.BillNumber || 'N/A'}</span>
                        <span><strong>Type:</strong> {transaction.type}</span>
                    </div>
                    <div className="d-flex justify-content-between mt-1">
                        <span><strong>Amount:</strong> {formatCurrency(transaction.debit || transaction.credit || 0)}</span>
                        <span><strong>Payment Mode:</strong> {transaction.paymentMode}</span>
                    </div>
                    <div className="d-flex justify-content-between mt-1">
                        <span><strong>Transaction ID:</strong> <code>{transactionId || 'Not found'}</code></span>
                    </div>
                    {transaction.cashSettlementStatus && (
                        <div className="mt-2">
                            <Badge bg={getStatusColor(transaction.cashSettlementStatus)}>
                                {getStatusIcon(transaction.cashSettlementStatus)} Current Status: {transaction.cashSettlementStatus}
                            </Badge>
                        </div>
                    )}
                </div>

                <Form.Group className="mb-3">
                    <Form.Label><strong>Settlement Status</strong></Form.Label>
                    <div className="d-flex gap-2 flex-wrap">
                        {options.map(option => (
                            <Button
                                key={option.value}
                                variant={status === option.value ? 'primary' : 'outline-secondary'}
                                size="sm"
                                onClick={() => setStatus(option.value)}
                                className="flex-grow-1"
                                title={option.description}
                            >
                                <div>
                                    <span className="d-block">{option.label}</span>
                                    {option.description && (
                                        <small style={{ fontSize: '8px', opacity: 0.7 }}>{option.description}</small>
                                    )}
                                </div>
                            </Button>
                        ))}
                    </div>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label><strong>Remarks</strong></Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="Enter remarks..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                    />
                </Form.Group>

                {status && (
                    <div className="alert alert-info py-1">
                        <small>
                            <i className="bi bi-info-circle me-1"></i>
                            {getStatusDescription(status, transaction.type)}
                        </small>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={loading || !status || !transactionId}
                >
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Saving...
                        </>
                    ) : (
                        `Mark as ${status}`
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default CashSettlementModal;