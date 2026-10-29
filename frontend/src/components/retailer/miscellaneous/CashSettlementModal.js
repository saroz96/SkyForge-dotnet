// CashSettlementModal.js
import React, { useState, useEffect } from 'react';
import { Form, Badge, InputGroup } from 'react-bootstrap';

const CashSettlementModal = ({ show, onClose, transaction, onSettle, formatCurrency }) => {
    const [status, setStatus] = useState('');
    const [remarks, setRemarks] = useState('');
    const [amount, setAmount] = useState(0);
    const [settlementType, setSettlementType] = useState('full'); // 'full' or 'partial'
    const [loading, setLoading] = useState(false);
    const [transactionId, setTransactionId] = useState(null);

    const getFullAmount = () => {
        if (!transaction) return 0;
        return transaction.debit > 0 ? transaction.debit : transaction.credit;
    };

    useEffect(() => {
        if (show && transaction) {
            let id = null;
            switch (transaction.type) {
                case 'Sale': id = transaction.salesBillId; break;
                case 'Purc': id = transaction.purchaseBillId; break;
                case 'SlRt': id = transaction.salesReturnBillId; break;
                case 'PrRt': id = transaction.purchaseReturnBillId; break;
                default: id = transaction.billId || transaction.id || transaction.transactionId || transaction.BillId || transaction.Id;
            }

            setTransactionId(id);

            const defaultStatus = getDefaultStatus(transaction.type);
            const initStatus = transaction.cashSettlementStatus || defaultStatus;
            
            // If the existing status is "Partial", default the UI to partial
            const isAlreadyPartial = initStatus === 'Partial';
            setSettlementType(isAlreadyPartial ? 'partial' : 'full');
            setStatus(isAlreadyPartial ? defaultStatus : initStatus);
            
            setRemarks(transaction.cashSettlementRemarks || '');
            
            const fullAmt = getFullAmount();
            // If existing amount is less than full, it's partial
            const existingAmount = transaction.cashSettlementAmount !== undefined && transaction.cashSettlementAmount !== null 
                ? transaction.cashSettlementAmount 
                : fullAmt;
                
            setAmount(existingAmount);
            if (existingAmount < fullAmt) {
                setSettlementType('partial');
            }
        }
    }, [show, transaction]);

    const getStatusOptions = (transactionType) => {
        switch (transactionType) {
            case 'Sale': return [{ value: 'Received', label: 'Received' }, { value: 'Pending', label: 'Pending' }];
            case 'Purc': return [{ value: 'Paid', label: 'Paid' }, { value: 'Pending', label: 'Pending' }];
            case 'SlRt': return [{ value: 'Refunded', label: 'Refunded' }, { value: 'Pending', label: 'Pending' }];
            case 'PrRt': return [{ value: 'Returned', label: 'Returned' }, { value: 'Pending', label: 'Pending' }];
            default: return [{ value: 'Received', label: 'Received' }, { value: 'Pending', label: 'Pending' }];
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

    const handleSubmit = async () => {
        if (!transactionId) {
            alert('Transaction ID is missing. Please try again.');
            return;
        }

        if (status !== 'Pending' && amount <= 0) {
            alert('Settlement amount must be greater than 0.');
            return;
        }

        if (amount > getFullAmount()) {
            alert('Settlement amount cannot exceed the total transaction amount.');
            return;
        }

        setLoading(true);
        try {
            // If partial, we override the status to "Partial" before sending
            const finalStatus = (settlementType === 'partial' && status !== 'Pending') ? 'Partial' : status;
            await onSettle(transactionId, finalStatus, remarks, parseFloat(amount));
        } catch (error) {
            console.error('Error in handleSubmit:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!transaction) return null;

    const options = getStatusOptions(transaction.type);
    const isPending = status === 'Pending';

    return (
        <>
            {show && (
                <div className="st-modal-overlay" onClick={onClose}>
                    <div className="st-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="st-modal-header">
                            <h5 className="d-flex align-items-center">
                                <i className="bi bi-cash-stack me-2" style={{ color: 'var(--st-success)' }}></i>
                                Cash Settlement
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} disabled={loading} />
                        </div>
                        
                        <div className="st-modal-body">
                            {/* Transaction Details */}
                            <div className="mb-3" style={{ background: 'var(--st-primary-soft)', borderRadius: 'var(--st-radius)', padding: '0.75rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem 0.5rem', fontSize: '0.75rem' }}>
                                    <div><span style={{ color: 'var(--st-muted)' }}>Voucher:</span><strong className="ms-1">{transaction.billNumber || 'N/A'}</strong></div>
                                    <div><span style={{ color: 'var(--st-muted)' }}>Bill Total:</span><strong className="ms-1">{formatCurrency(getFullAmount())}</strong></div>
                                </div>
                            </div>

                            {/* Status Selection */}
                            <Form.Group className="mb-3">
                                <Form.Label style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.3rem' }}>Action Status</Form.Label>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {options.map(option => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setStatus(option.value)}
                                            style={{
                                                flex: 1, padding: '0.4rem 0.6rem', borderRadius: 'var(--st-radius)',
                                                border: `1px solid ${status === option.value ? 'var(--st-primary-light)' : 'var(--st-border)'}`,
                                                background: status === option.value ? 'var(--st-primary-soft)' : '#fff',
                                                color: status === option.value ? 'var(--st-primary-light)' : 'var(--st-text)',
                                                fontSize: '0.7rem', fontWeight: status === option.value ? 600 : 400,
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </Form.Group>

                            {/* Settlement Type & Amount */}
                            {!isPending && (
                                <>
                                    <Form.Group className="mb-3">
                                        <Form.Label style={{ fontSize: '0.7rem', fontWeight: 600 }}>Settlement Type</Form.Label>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => { setSettlementType('full'); setAmount(getFullAmount()); }}
                                                style={{
                                                    flex: 1, padding: '0.4rem', borderRadius: 'var(--st-radius)',
                                                    border: `1px solid ${settlementType === 'full' ? 'var(--st-primary-light)' : 'var(--st-border)'}`,
                                                    background: settlementType === 'full' ? 'var(--st-primary-soft)' : '#fff',
                                                    color: settlementType === 'full' ? 'var(--st-primary-light)' : 'var(--st-text)',
                                                    fontSize: '0.7rem', fontWeight: settlementType === 'full' ? 600 : 400,
                                                }}
                                            >
                                                Full Amount
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSettlementType('partial')}
                                                style={{
                                                    flex: 1, padding: '0.4rem', borderRadius: 'var(--st-radius)',
                                                    border: `1px solid ${settlementType === 'partial' ? 'var(--st-warning)' : 'var(--st-border)'}`,
                                                    background: settlementType === 'partial' ? '#fff3cd' : '#fff',
                                                    color: settlementType === 'partial' ? '#856404' : 'var(--st-text)',
                                                    fontSize: '0.7rem', fontWeight: settlementType === 'partial' ? 600 : 400,
                                                }}
                                            >
                                                Partial Amount
                                            </button>
                                        </div>
                                    </Form.Group>

                                    {settlementType === 'partial' && (
                                        <Form.Group className="mb-3">
                                            <Form.Label style={{ fontSize: '0.7rem', fontWeight: 600 }}>Amount Received</Form.Label>
                                            <InputGroup size="sm">
                                                <InputGroup.Text>Rs</InputGroup.Text>
                                                <Form.Control
                                                    type="number"
                                                    min="1"
                                                    max={getFullAmount()}
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    style={{ fontSize: '0.75rem' }}
                                                />
                                            </InputGroup>
                                        </Form.Group>
                                    )}
                                </>
                            )}

                            {/* Remarks */}
                            <Form.Group className="mb-3">
                                <Form.Label style={{ fontSize: '0.7rem', fontWeight: 600 }}>Remarks</Form.Label>
                                <textarea
                                    className="st-textarea"
                                    rows={2}
                                    placeholder="Enter remarks..."
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    style={{ width: '100%', border: '1px solid var(--st-border-strong)', borderRadius: 'var(--st-radius)', fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}
                                />
                            </Form.Group>
                        </div>

                        <div className="st-modal-footer">
                            <button className="st-btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                            <button
                                className="st-btn-gen"
                                onClick={handleSubmit}
                                disabled={loading || !status || !transactionId}
                                style={{ background: 'var(--st-primary-light)', minWidth: '100px' }}
                            >
                                {loading ? 'Saving...' : 'Save Settlement'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CashSettlementModal;