// // CashSettlementModal.js
// import React, { useState, useEffect } from 'react';
// import { Modal, Button, Form, Badge } from 'react-bootstrap';

// const CashSettlementModal = ({ show, onClose, transaction, onSettle, formatCurrency }) => {
//     const [status, setStatus] = useState('');
//     const [remarks, setRemarks] = useState('');
//     const [loading, setLoading] = useState(false);
//     const [transactionId, setTransactionId] = useState(null);

//     useEffect(() => {
//         if (show && transaction) {
//             // Get the transaction ID based on type
//             let id = null;
//             switch (transaction.type) {
//                 case 'Sale':
//                     id = transaction.salesBillId;
//                     break;
//                 case 'Purc':
//                     id = transaction.purchaseBillId;
//                     break;
//                 case 'SlRt':
//                     id = transaction.salesReturnBillId;
//                     break;
//                 case 'PrRt':
//                     id = transaction.purchaseReturnBillId;
//                     break;
//                 default:
//                     id = transaction.billId || transaction.id || transaction.transactionId || transaction.BillId || transaction.Id;
//             }

//             console.log('Modal received transaction:', transaction);
//             console.log('Extracted transaction ID:', id);
//             console.log('Transaction type:', transaction.type);

//             setTransactionId(id);

//             // Set default status based on transaction type
//             const defaultStatus = getDefaultStatus(transaction.type);
//             setStatus(transaction.cashSettlementStatus || defaultStatus);
//             setRemarks(transaction.cashSettlementRemarks || '');
//         }
//     }, [show, transaction]);

//     const getStatusOptions = (transactionType) => {
//         switch (transactionType) {
//             case 'Sale':
//                 return [
//                     { value: 'Received', label: 'Mark as Received', description: 'Money received from customer' },
//                     { value: 'Pending', label: 'Mark as Pending', description: 'Settlement pending' }
//                 ];
//             case 'Purc':
//                 return [
//                     { value: 'Paid', label: 'Mark as Paid', description: 'Money paid to supplier' },
//                     { value: 'Pending', label: 'Mark as Pending', description: 'Settlement pending' }
//                 ];
//             case 'SlRt':
//                 return [
//                     { value: 'Refunded', label: 'Mark as Refunded', description: 'Money refunded to customer' },
//                     { value: 'Pending', label: 'Mark as Pending', description: 'Settlement pending' }
//                 ];
//             case 'PrRt':
//                 return [
//                     { value: 'Returned', label: 'Mark as Returned', description: 'Money returned from supplier' },
//                     { value: 'Pending', label: 'Mark as Pending', description: 'Settlement pending' }
//                 ];
//             default:
//                 return [
//                     { value: 'Received', label: 'Received' },
//                     { value: 'Paid', label: 'Paid' },
//                     { value: 'Refunded', label: 'Refunded' },
//                     { value: 'Returned', label: 'Returned' },
//                     { value: 'Pending', label: 'Pending' }
//                 ];
//         }
//     };

//     const getStatusColor = (status) => {
//         switch (status) {
//             case 'Received': return 'success';
//             case 'Paid': return 'info';
//             case 'Refunded': return 'warning';
//             case 'Returned': return 'success';
//             case 'Pending': return 'secondary';
//             default: return 'secondary';
//         }
//     };

//     const getStatusIcon = (status) => {
//         switch (status) {
//             case 'Received': return '✓';
//             case 'Paid': return '✓';
//             case 'Refunded': return '↩';
//             case 'Returned': return '↩';
//             case 'Pending': return '⏳';
//             default: return '';
//         }
//     };

//     const getDefaultStatus = (transactionType) => {
//         switch (transactionType) {
//             case 'Sale': return 'Received';
//             case 'Purc': return 'Paid';
//             case 'SlRt': return 'Refunded';
//             case 'PrRt': return 'Returned';
//             default: return 'Pending';
//         }
//     };

//     const getStatusDescription = (status, transactionType) => {
//         switch (status) {
//             case 'Received': return 'Money has been received for this transaction.';
//             case 'Paid': return 'Money has been paid for this transaction.';
//             case 'Refunded': return 'Money has been refunded to the customer.';
//             case 'Returned': return 'Money has been returned from the supplier.';
//             case 'Pending': return 'Money settlement is pending.';
//             default: return '';
//         }
//     };

//     const handleSubmit = async () => {
//         if (!transactionId) {
//             console.error('No transaction ID available for settlement');
//             alert('Transaction ID is missing. Please try again.');
//             return;
//         }

//         setLoading(true);
//         try {
//             console.log('Submitting settlement with ID:', transactionId, 'Status:', status);
//             await onSettle(transactionId, status, remarks);
//         } catch (error) {
//             console.error('Error in handleSubmit:', error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     if (!transaction) return null;

//     const options = getStatusOptions(transaction.type);

//     return (
//         <Modal show={show} onHide={onClose} centered>
//             <Modal.Header closeButton>
//                 <Modal.Title>
//                     <span className="d-flex align-items-center">
//                         <i className="bi bi-cash-stack me-2"></i>
//                         Cash Settlement
//                     </span>
//                 </Modal.Title>
//             </Modal.Header>
//             <Modal.Body>
//                 <div className="mb-3">
//                     <h6 className="text-muted">Transaction Details</h6>
//                     <div className="d-flex justify-content-between">
//                         <span><strong>Voucher:</strong> {transaction.billNumber || transaction.BillNumber || 'N/A'}</span>
//                         <span><strong>Type:</strong> {transaction.type}</span>
//                     </div>
//                     <div className="d-flex justify-content-between mt-1">
//                         <span><strong>Amount:</strong> {formatCurrency(transaction.debit || transaction.credit || 0)}</span>
//                         <span><strong>Payment Mode:</strong> {transaction.paymentMode}</span>
//                     </div>
//                     <div className="d-flex justify-content-between mt-1">
//                         <span><strong>Transaction ID:</strong> <code>{transactionId || 'Not found'}</code></span>
//                     </div>
//                     {transaction.cashSettlementStatus && (
//                         <div className="mt-2">
//                             <Badge bg={getStatusColor(transaction.cashSettlementStatus)}>
//                                 {getStatusIcon(transaction.cashSettlementStatus)} Current Status: {transaction.cashSettlementStatus}
//                             </Badge>
//                         </div>
//                     )}
//                 </div>

//                 <Form.Group className="mb-3">
//                     <Form.Label><strong>Settlement Status</strong></Form.Label>
//                     <div className="d-flex gap-2 flex-wrap">
//                         {options.map(option => (
//                             <Button
//                                 key={option.value}
//                                 variant={status === option.value ? 'primary' : 'outline-secondary'}
//                                 size="sm"
//                                 onClick={() => setStatus(option.value)}
//                                 className="flex-grow-1"
//                                 title={option.description}
//                             >
//                                 <div>
//                                     <span className="d-block">{option.label}</span>
//                                     {option.description && (
//                                         <small style={{ fontSize: '8px', opacity: 0.7 }}>{option.description}</small>
//                                     )}
//                                 </div>
//                             </Button>
//                         ))}
//                     </div>
//                 </Form.Group>

//                 <Form.Group className="mb-3">
//                     <Form.Label><strong>Remarks</strong></Form.Label>
//                     <Form.Control
//                         as="textarea"
//                         rows={2}
//                         placeholder="Enter remarks..."
//                         value={remarks}
//                         onChange={(e) => setRemarks(e.target.value)}
//                     />
//                 </Form.Group>

//                 {status && (
//                     <div className="alert alert-info py-1">
//                         <small>
//                             <i className="bi bi-info-circle me-1"></i>
//                             {getStatusDescription(status, transaction.type)}
//                         </small>
//                     </div>
//                 )}
//             </Modal.Body>
//             <Modal.Footer>
//                 <Button variant="secondary" onClick={onClose} disabled={loading}>
//                     Cancel
//                 </Button>
//                 <Button
//                     variant="primary"
//                     onClick={handleSubmit}
//                     disabled={loading || !status || !transactionId}
//                 >
//                     {loading ? (
//                         <>
//                             <span className="spinner-border spinner-border-sm me-2" />
//                             Saving...
//                         </>
//                     ) : (
//                         `Mark as ${status}`
//                     )}
//                 </Button>
//             </Modal.Footer>
//         </Modal>
//     );
// };

// export default CashSettlementModal;

//--------------------------------------------end

// CashSettlementModal.js
import React, { useState, useEffect } from 'react';
import { Button, Form, Badge } from 'react-bootstrap';

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
        <>
            {show && (
                <>
                    <div className="st-modal-overlay" onClick={onClose}>
                        <div className="st-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                            <div className="st-modal-header">
                                <h5 className="d-flex align-items-center">
                                    <i className="bi bi-cash-stack me-2" style={{ color: 'var(--st-success)' }}></i>
                                    Cash Settlement
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={onClose}
                                    disabled={loading}
                                />
                            </div>
                            
                            <div className="st-modal-body">
                                {/* Transaction Details */}
                                <div className="mb-3" style={{ 
                                    background: 'var(--st-primary-soft)',
                                    borderRadius: 'var(--st-radius)',
                                    padding: '0.75rem'
                                }}>
                                    <h6 style={{ 
                                        fontSize: '0.7rem', 
                                        fontWeight: 600,
                                        color: 'var(--st-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.03em',
                                        marginBottom: '0.5rem'
                                    }}>
                                        Transaction Details
                                    </h6>
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '0.3rem 0.5rem',
                                        fontSize: '0.75rem'
                                    }}>
                                        <div>
                                            <span style={{ color: 'var(--st-muted)' }}>Voucher:</span>
                                            <strong className="ms-1">{transaction.billNumber || transaction.BillNumber || 'N/A'}</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--st-muted)' }}>Type:</span>
                                            <strong className="ms-1">{transaction.type}</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--st-muted)' }}>Amount:</span>
                                            <strong className="ms-1">{formatCurrency(transaction.debit || transaction.credit || 0)}</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--st-muted)' }}>Payment Mode:</span>
                                            <strong className="ms-1">{transaction.paymentMode}</strong>
                                        </div>
                                    </div>
                                    <div className="mt-2" style={{ fontSize: '0.7rem', color: 'var(--st-muted)' }}>
                                        <span>Transaction ID:</span>
                                        <code className="ms-1" style={{ 
                                            background: '#fff', 
                                            padding: '0.1rem 0.3rem',
                                            borderRadius: '3px',
                                            fontSize: '0.65rem'
                                        }}>
                                            {transactionId || 'Not found'}
                                        </code>
                                    </div>
                                    {transaction.cashSettlementStatus && (
                                        <div className="mt-2">
                                            <Badge bg={getStatusColor(transaction.cashSettlementStatus)} style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}>
                                                {getStatusIcon(transaction.cashSettlementStatus)} Current: {transaction.cashSettlementStatus}
                                            </Badge>
                                        </div>
                                    )}
                                </div>

                                {/* Status Selection */}
                                <Form.Group className="mb-3">
                                    <Form.Label style={{ 
                                        fontSize: '0.7rem', 
                                        fontWeight: 600,
                                        color: 'var(--st-text)',
                                        marginBottom: '0.3rem'
                                    }}>
                                        Settlement Status
                                    </Form.Label>
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: '0.4rem', 
                                        flexWrap: 'wrap' 
                                    }}>
                                        {options.map(option => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={`st-btn-status ${status === option.value ? 'active' : ''}`}
                                                onClick={() => setStatus(option.value)}
                                                style={{
                                                    flex: 1,
                                                    minWidth: '80px',
                                                    padding: '0.4rem 0.6rem',
                                                    borderRadius: 'var(--st-radius)',
                                                    border: `1px solid ${status === option.value ? 'var(--st-primary-light)' : 'var(--st-border)'}`,
                                                    background: status === option.value ? 'var(--st-primary-soft)' : '#fff',
                                                    color: status === option.value ? 'var(--st-primary-light)' : 'var(--st-text)',
                                                    fontSize: '0.7rem',
                                                    fontWeight: status === option.value ? 600 : 400,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                    textAlign: 'center'
                                                }}
                                                title={option.description}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{option.label}</div>
                                                    {option.description && (
                                                        <div style={{ 
                                                            fontSize: '0.55rem', 
                                                            opacity: 0.7,
                                                            marginTop: '0.1rem'
                                                        }}>
                                                            {option.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </Form.Group>

                                {/* Remarks */}
                                <Form.Group className="mb-3">
                                    <Form.Label style={{ 
                                        fontSize: '0.7rem', 
                                        fontWeight: 600,
                                        color: 'var(--st-text)',
                                        marginBottom: '0.3rem'
                                    }}>
                                        Remarks
                                    </Form.Label>
                                    <textarea
                                        className="st-textarea"
                                        rows={2}
                                        placeholder="Enter remarks..."
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        style={{
                                            width: '100%',
                                            border: '1px solid var(--st-border-strong)',
                                            borderRadius: 'var(--st-radius)',
                                            fontSize: '0.75rem',
                                            padding: '0.4rem 0.5rem',
                                            color: 'var(--st-text)',
                                            background: '#fff',
                                            resize: 'vertical',
                                            minHeight: '50px'
                                        }}
                                    />
                                </Form.Group>

                                {/* Status Info */}
                                {status && (
                                    <div style={{ 
                                        background: '#f0f9ff',
                                        border: '1px solid #bae6fd',
                                        borderRadius: 'var(--st-radius)',
                                        padding: '0.4rem 0.6rem',
                                        fontSize: '0.7rem',
                                        color: '#0369a1'
                                    }}>
                                        <i className="bi bi-info-circle me-1"></i>
                                        {getStatusDescription(status, transaction.type)}
                                    </div>
                                )}
                            </div>

                            <div className="st-modal-footer">
                                <button 
                                    className="st-btn-secondary" 
                                    onClick={onClose} 
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="st-btn-gen"
                                    onClick={handleSubmit}
                                    disabled={loading || !status || !transactionId}
                                    style={{
                                        background: status === 'Received' || status === 'Paid' || status === 'Returned' 
                                            ? 'var(--st-success)' 
                                            : status === 'Refunded' 
                                            ? 'var(--st-warning)' 
                                            : 'var(--st-primary-light)',
                                        minWidth: '100px'
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" style={{ width: 12, height: 12 }} />
                                            Saving...
                                        </>
                                    ) : (
                                        `Mark as ${status}`
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default CashSettlementModal;