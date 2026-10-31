import React, { useState, useEffect, useRef } from 'react';

const CashBillSettlementModal = ({
    show,
    totalAmount,
    formatter,
    initialSettlement,
    onConfirm,
    onCancel
}) => {
    const [type, setType] = useState('full'); // 'full' | 'partial' | 'pending'
    const [tendered, setTendered] = useState(0);
    const [remarks, setRemarks] = useState('');
    const [error, setError] = useState('');
    const tenderedRef = useRef(null);
    const remarksRef = useRef(null);
    const confirmRef = useRef(null);

    // Sync from initialSettlement whenever the modal opens
    useEffect(() => {
        if (!show) return;
        const t = initialSettlement?.type || 'full';
        let tenderedVal = totalAmount;

        if (t === 'partial') {
            // If partial, default tendered to whatever was last tendered or 0
            tenderedVal = parseFloat(initialSettlement?.tenderedAmount) || 0;
        } else if (t === 'pending') {
            tenderedVal = 0;
        }

        setType(t);
        setTendered(tenderedVal);
        setRemarks(initialSettlement?.remarks || '');
        setError('');
    }, [show, totalAmount, initialSettlement]);

    // Calculations
    const tenderedNum = parseFloat(tendered) || 0;
    const actualReceived = Math.min(tenderedNum, totalAmount);
    const changeToReturn = tenderedNum > totalAmount ? tenderedNum - totalAmount : 0;
    const remaining = Math.max(0, Math.round((totalAmount - actualReceived) * 100) / 100);

    // Focus the right input when the modal opens
    useEffect(() => {
        if (!show) return;
        const t = setTimeout(() => {
            if (type !== 'pending') {
                tenderedRef.current?.focus();
                tenderedRef.current?.select();
            } else {
                remarksRef.current?.focus();
            }
        }, 100);
        return () => clearTimeout(t);
    }, [show, type]);

    // Keyboard: Esc = cancel
    useEffect(() => {
        if (!show) return;
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [show, onCancel]);

    if (!show) return null;

    const handleConfirm = () => {
        if (type !== 'pending' && tenderedNum < totalAmount && type === 'full') {
            setError('Full settlement requires cash tendered to cover the bill total.');
            return;
        }
        if (type !== 'pending' && tenderedNum <= 0) {
            setError('Amount tendered must be greater than 0.');
            return;
        }

        onConfirm({
            type,
            receivedAmount: Math.round(actualReceived * 100) / 100,
            remainingAmount: remaining,
            tenderedAmount: Math.round(tenderedNum * 100) / 100,
            changeAmount: Math.round(changeToReturn * 100) / 100,
            remarks: remarks.trim()
        });
    };

    return (
        <div
            className="modal fade show"
            tabIndex="-1"
            style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1070 }}
            role="dialog"
            aria-modal="true"
        >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '860px', margin: '1.75rem auto' }}>
                <div className="modal-content shadow-sm border-0 rounded-2">
                    {/* Header */}
                    <div className="modal-header py-1 px-2 bg-primary text-white rounded-top-2" style={{ borderBottom: 'none' }}>
                        <div className="d-flex align-items-center">
                            <i className="bi bi-cash-coin text-white me-1" style={{ fontSize: '0.9rem' }}></i>
                            <h6 className="modal-title text-white mb-0" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                Cash Settlement
                            </h6>
                        </div>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            style={{ fontSize: '0.5rem', padding: '0.5rem' }}
                            onClick={onCancel}
                            aria-label="Close"
                        />
                    </div>

                    {/* Body */}
                    <div className="modal-body p-2">
                        <div className="row g-1 mb-2 p-2 rounded" style={{ background: '#f8f9fa', border: '1px dashed #6c757d' }}>
                            {/* Bill Total */}
                            <div className="col-12 col-md-3">
                                <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Bill Total</label>
                                <input
                                    type="text"
                                    readOnly
                                    className="form-control form-control-sm"
                                    value={`Rs. ${formatter.format(totalAmount)}`}
                                    style={{ height: '34px', fontSize: '0.875rem', background: '#e9ecef', fontWeight: '600' }}
                                />
                            </div>

                            {/* Settlement Type */}
                            <div className="col-12 col-md-3">
                                <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Settlement</label>
                                <select
                                    className="form-control form-control-sm"
                                    value={type}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        setType(next);
                                        setError('');
                                        if (next === 'full') setTendered(totalAmount);
                                        else if (next === 'pending') setTendered(0);
                                        else setTendered(0);
                                    }}
                                    style={{ height: '34px', fontSize: '0.875rem' }}
                                >
                                    <option value="full">Full</option>
                                    <option value="partial">Partial</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            {/* Cash Tendered */}
                            <div className="col-12 col-md-3">
                                <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Cash Tendered</label>
                                <input
                                    ref={tenderedRef}
                                    type="number"
                                    step="any"
                                    min="0"
                                    className={`form-control form-control-sm ${error ? 'is-invalid' : ''}`}
                                    value={tendered}
                                    disabled={type === 'pending'}
                                    onChange={(e) => {
                                        setError('');
                                        setTendered(e.target.value);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            remarksRef.current?.focus();
                                            remarksRef.current?.select();
                                        }
                                    }}
                                    style={{ height: '34px', fontSize: '0.875rem', background: type === 'pending' ? '#e9ecef' : '#fff' }}
                                />
                            </div>

                            {/* Remaining (Due) */}
                            <div className="col-12 col-md-3">
                                <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Remaining (Due)</label>
                                <input
                                    type="text"
                                    readOnly
                                    className="form-control form-control-sm"
                                    value={`Rs. ${formatter.format(remaining)}`}
                                    style={{
                                        height: '34px',
                                        fontSize: '0.875rem',
                                        background: remaining > 0 ? '#fff5f5' : '#e9ecef',
                                        color: remaining > 0 ? '#dc3545' : '#212529',
                                        fontWeight: remaining > 0 ? '600' : 'normal'
                                    }}
                                />
                            </div>

                            {/* Breakdown row — Applied / Change */}
                            {type !== 'pending' && (
                                <div className="col-12 mt-1">
                                    <div
                                        className="d-flex justify-content-between align-items-center p-2 rounded"
                                        style={{ background: '#fff', border: '1px solid #dee2e6', fontSize: '0.78rem' }}
                                    >
                                        <div>
                                            <span className="text-muted">Applied to Bill:</span>
                                            <strong className="ms-1">Rs. {formatter.format(actualReceived)}</strong>
                                        </div>
                                        {changeToReturn > 0 && (
                                            <div className="text-success">
                                                <i className="bi bi-arrow-return-left me-1"></i>
                                                <span className="text-muted">Change Returned:</span>
                                                <strong className="ms-1">Rs. {formatter.format(changeToReturn)}</strong>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Remarks */}
                            <div className="col-12 mt-1">
                                <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Remarks</label>
                                <input
                                    ref={remarksRef}
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="e.g. Received by..."
                                    maxLength={500}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            confirmRef.current?.focus();
                                        }
                                    }}
                                    style={{ height: '34px', fontSize: '0.875rem' }}
                                />
                            </div>

                            {/* Error message row */}
                            {error && (
                                <div className="col-12">
                                    <small className="text-danger">
                                        <i className="bi bi-exclamation-triangle me-1"></i>
                                        {error}
                                    </small>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer py-1 px-2 bg-light border-top">
                        <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={onCancel}
                            style={{ fontSize: '0.75rem', height: '28px' }}
                        >
                            <i className="bi bi-x-lg me-1"></i>
                            Cancel
                        </button>
                        <button
                            ref={confirmRef}
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={handleConfirm}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleConfirm();
                                }
                            }}
                            style={{ fontSize: '0.75rem', height: '28px' }}
                        >
                            <i className="bi bi-check-lg me-1"></i>
                            Save Bill
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashBillSettlementModal;