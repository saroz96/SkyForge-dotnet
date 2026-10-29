// import React, { useState, useEffect, useRef } from 'react';

// const CashBillSettlementModal = ({
//     show,
//     totalAmount,
//     formatter,
//     initialSettlement,
//     onConfirm,
//     onCancel
// }) => {
//     const [type, setType] = useState('full');
//     const [received, setReceived] = useState(0);
//     const [remarks, setRemarks] = useState('');
//     const [error, setError] = useState('');
//     const receivedRef = useRef(null);
//     const remarksRef = useRef(null);
//     const confirmRef = useRef(null);

//     // Sync from initialSettlement whenever the modal opens
//     useEffect(() => {
//         if (!show) return;
//         const t = initialSettlement?.type || 'full';
//         const r = initialSettlement?.type === 'partial'
//             ? (parseFloat(initialSettlement?.receivedAmount) || 0)
//             : totalAmount;
//         setType(t);
//         setReceived(t === 'full' ? totalAmount : r);
//         setRemarks(initialSettlement?.remarks || '');
//         setError('');
//     }, [show, totalAmount, initialSettlement]);

//     const remaining = Math.max(0, Math.round((totalAmount - (parseFloat(received) || 0)) * 100) / 100);

//     // Focus the right input when the modal opens
//     useEffect(() => {
//         if (!show) return;
//         const t = setTimeout(() => {
//             if (type === 'partial') {
//                 receivedRef.current?.focus();
//                 receivedRef.current?.select();
//             } else {
//                 remarksRef.current?.focus();
//                 remarksRef.current?.select();
//             }
//         }, 100);
//         return () => clearTimeout(t);
//     }, [show, type]);

//     // Keyboard: Esc = cancel
//     useEffect(() => {
//         if (!show) return;
//         const onKey = (e) => {
//             if (e.key === 'Escape') {
//                 e.preventDefault();
//                 onCancel();
//             }
//         };
//         document.addEventListener('keydown', onKey);
//         return () => document.removeEventListener('keydown', onKey);
//     }, [show, onCancel]);

//     if (!show) return null;

//     const handleConfirm = () => {
//         const receivedNum = type === 'full'
//             ? totalAmount
//             : parseFloat(received) || 0;

//         if (receivedNum < 0) {
//             setError('Amount received cannot be negative.');
//             return;
//         }
//         if (receivedNum > totalAmount) {
//             setError('Amount received cannot exceed the bill total.');
//             return;
//         }
//         if (type === 'partial' && receivedNum >= totalAmount) {
//             setError('Partial settlement requires received < total. Switch to Full or lower the amount.');
//             return;
//         }

//         onConfirm({
//             type,
//             receivedAmount: Math.round(receivedNum * 100) / 100,
//             remainingAmount: Math.round((totalAmount - receivedNum) * 100) / 100,
//             remarks: remarks.trim()
//         });
//     };

//     return (
//         <div
//             className="modal fade show"
//             tabIndex="-1"
//             style={{
//                 display: 'block',
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//                 zIndex: 1070
//             }}
//             role="dialog"
//             aria-modal="true"
//         >
//             <div
//                 className="modal-dialog modal-dialog-centered"
//                 style={{ maxWidth: '860px', margin: '1.75rem auto' }}
//             >
//                 <div className="modal-content shadow-sm border-0 rounded-2">
//                     {/* Header */}
//                     <div
//                         className="modal-header py-1 px-2 bg-primary text-white rounded-top-2"
//                         style={{ borderBottom: 'none' }}
//                     >
//                         <div className="d-flex align-items-center">
//                             <i className="bi bi-cash-coin text-white me-1" style={{ fontSize: '0.9rem' }}></i>
//                             <h6 className="modal-title text-white mb-0" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
//                                 Cash Settlement
//                             </h6>
//                         </div>
//                         <button
//                             type="button"
//                             className="btn-close btn-close-white"
//                             style={{ fontSize: '0.5rem', padding: '0.5rem' }}
//                             onClick={onCancel}
//                             aria-label="Close"
//                         />
//                     </div>

//                     {/* Body — matches the inline panel layout */}
//                     <div className="modal-body p-2">
//                         <div
//                             className="row g-1 mb-2 p-2 rounded"
//                             style={{ background: '#f8f9fa', border: '1px dashed #6c757d' }}
//                         >
//                             {/* Bill Total (read-only display, keeps context visible) */}
//                             <div className="col-12 col-md-4">
//                                 <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>
//                                     Bill Total
//                                 </label>
//                                 <input
//                                     type="text"
//                                     readOnly
//                                     className="form-control form-control-sm"
//                                     value={`Rs. ${formatter.format(totalAmount)}`}
//                                     style={{
//                                         height: '34px',
//                                         fontSize: '0.875rem',
//                                         background: '#e9ecef',
//                                         fontWeight: '600'
//                                     }}
//                                 />
//                             </div>

//                             {/* Settlement Type */}
//                             <div className="col-12 col-md-4">
//                                 <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>
//                                     Settlement
//                                 </label>
//                                 <select
//                                     className="form-control form-control-sm"
//                                     value={type}
//                                     onChange={(e) => {
//                                         const next = e.target.value;
//                                         setType(next);
//                                         setError('');
//                                         setReceived(next === 'full' ? totalAmount : 0);
//                                     }}
//                                     style={{ height: '34px', fontSize: '0.875rem' }}
//                                 >
//                                     <option value="full">Full</option>
//                                     <option value="partial">Partial</option>
//                                 </select>
//                             </div>

//                             {/* Amount Received */}
//                             <div className="col-12 col-md-4">
//                                 <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>
//                                     Amount Received
//                                 </label>
//                                 <input
//                                     ref={receivedRef}
//                                     type="number"
//                                     step="any"
//                                     min="0"
//                                     max={totalAmount}
//                                     className={`form-control form-control-sm ${error ? 'is-invalid' : ''}`}
//                                     value={received}
//                                     disabled={type === 'full'}
//                                     onChange={(e) => {
//                                         setError('');
//                                         setReceived(e.target.value);
//                                     }}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             // ✅ Move focus to Remarks field instead of saving
//                                             remarksRef.current?.focus();
//                                             remarksRef.current?.select();
//                                         }
//                                     }}
//                                     style={{
//                                         height: '34px',
//                                         fontSize: '0.875rem',
//                                         background: type === 'full' ? '#e9ecef' : '#fff'
//                                     }}
//                                 />
//                             </div>

//                             {/* Remaining */}
//                             <div className="col-12 col-md-4">
//                                 <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>
//                                     Remaining (Due)
//                                 </label>
//                                 <input
//                                     type="text"
//                                     readOnly
//                                     className="form-control form-control-sm"
//                                     value={`Rs. ${formatter.format(remaining)}`}
//                                     style={{
//                                         height: '34px',
//                                         fontSize: '0.875rem',
//                                         background: remaining > 0 ? '#fff5f5' : '#e9ecef',
//                                         color: remaining > 0 ? '#dc3545' : '#212529',
//                                         fontWeight: remaining > 0 ? '600' : 'normal'
//                                     }}
//                                 />
//                             </div>

//                             {/* Remarks */}
//                             <div className="col-12 col-md-8">
//                                 <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>
//                                     Remarks
//                                 </label>
//                                 <input
//                                     ref={remarksRef}
//                                     type="text"
//                                     className="form-control form-control-sm"
//                                     value={remarks}
//                                     onChange={(e) => setRemarks(e.target.value)}
//                                     placeholder="e.g. Received by..."
//                                     maxLength={500}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             // ✅ Move focus to Save button instead of saving directly
//                                             confirmRef.current?.focus();
//                                         }
//                                     }}
//                                     style={{ height: '34px', fontSize: '0.875rem' }}
//                                 />
//                             </div>

//                             {/* Error message row */}
//                             {error && (
//                                 <div className="col-12">
//                                     <small className="text-danger">
//                                         <i className="bi bi-exclamation-triangle me-1"></i>
//                                         {error}
//                                     </small>
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     {/* Footer */}
//                     <div className="modal-footer py-1 px-2 bg-light border-top">
//                         <button
//                             type="button"
//                             className="btn btn-sm btn-secondary"
//                             onClick={onCancel}
//                             style={{ fontSize: '0.75rem', height: '28px' }}
//                         >
//                             <i className="bi bi-x-lg me-1"></i>
//                             Cancel
//                         </button>
//                         <button
//                             ref={confirmRef}
//                             type="button"
//                             className="btn btn-sm btn-primary"
//                             onClick={handleConfirm}
//                             onKeyDown={(e) => {
//                                 if (e.key === 'Enter') {
//                                     e.preventDefault();
//                                     handleConfirm();
//                                 }
//                             }}
//                             style={{ fontSize: '0.75rem', height: '28px' }}
//                         >
//                             <i className="bi bi-check-lg me-1"></i>
//                             Save Bill
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default CashBillSettlementModal;

//----------------------------------------------------end1

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
    const [received, setReceived] = useState(0);
    const [remarks, setRemarks] = useState('');
    const [error, setError] = useState('');
    const receivedRef = useRef(null);
    const remarksRef = useRef(null);
    const confirmRef = useRef(null);

    // Sync from initialSettlement whenever the modal opens
    useEffect(() => {
        if (!show) return;
        const t = initialSettlement?.type || 'full';
        let r = totalAmount;
        
        if (t === 'partial') {
            r = parseFloat(initialSettlement?.receivedAmount) || 0;
        } else if (t === 'pending') {
            r = 0;
        }

        setType(t);
        setReceived(r);
        setRemarks(initialSettlement?.remarks || '');
        setError('');
    }, [show, totalAmount, initialSettlement]);

    const remaining = Math.max(0, Math.round((totalAmount - (parseFloat(received) || 0)) * 100) / 100);

    // Focus the right input when the modal opens
    useEffect(() => {
        if (!show) return;
        const t = setTimeout(() => {
            if (type === 'partial') {
                receivedRef.current?.focus();
                receivedRef.current?.select();
            } else {
                remarksRef.current?.focus();
                remarksRef.current?.select();
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
        const receivedNum = type === 'full'
            ? totalAmount
            : type === 'pending' ? 0 : parseFloat(received) || 0;

        if (receivedNum < 0) {
            setError('Amount received cannot be negative.');
            return;
        }
        if (receivedNum > totalAmount) {
            setError('Amount received cannot exceed the bill total.');
            return;
        }
        if (type === 'partial' && receivedNum >= totalAmount) {
            setError('Partial settlement requires received < total. Switch to Full or lower the amount.');
            return;
        }

        onConfirm({
            type,
            receivedAmount: Math.round(receivedNum * 100) / 100,
            remainingAmount: Math.round((totalAmount - receivedNum) * 100) / 100,
            remarks: remarks.trim()
        });
    };

    return (
        <div
            className="modal fade show"
            tabIndex="-1"
            style={{
                display: 'block',
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 1070
            }}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="modal-dialog modal-dialog-centered"
                style={{ maxWidth: '860px', margin: '1.75rem auto' }}
            >
                <div className="modal-content shadow-sm border-0 rounded-2">
                    {/* Header */}
                    <div
                        className="modal-header py-1 px-2 bg-primary text-white rounded-top-2"
                        style={{ borderBottom: 'none' }}
                    >
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
                        <div
                            className="row g-1 mb-2 p-2 rounded"
                            style={{ background: '#f8f9fa', border: '1px dashed #6c757d' }}
                        >
                            {/* Bill Total */}
                            <div className="col-12 col-md-3">
                                <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>
                                    Bill Total
                                </label>
                                <input
                                    type="text"
                                    readOnly
                                    className="form-control form-control-sm"
                                    value={`Rs. ${formatter.format(totalAmount)}`}
                                    style={{
                                        height: '34px',
                                        fontSize: '0.875rem',
                                        background: '#e9ecef',
                                        fontWeight: '600'
                                    }}
                                />
                            </div>

                            {/* Settlement Type */}
                            <div className="col-12 col-md-3">
                                <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>
                                    Settlement
                                </label>
                                <select
                                    className="form-control form-control-sm"
                                    value={type}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        setType(next);
                                        setError('');
                                        if (next === 'full') setReceived(totalAmount);
                                        else if (next === 'pending') setReceived(0);
                                        else setReceived(0);
                                    }}
                                    style={{ height: '34px', fontSize: '0.875rem' }}
                                >
                                    <option value="full">Full</option>
                                    <option value="partial">Partial</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            {/* Amount Received */}
                            <div className="col-12 col-md-3">
                                <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>
                                    Amount Received
                                </label>
                                <input
                                    ref={receivedRef}
                                    type="number"
                                    step="any"
                                    min="0"
                                    max={totalAmount}
                                    className={`form-control form-control-sm ${error ? 'is-invalid' : ''}`}
                                    value={received}
                                    disabled={type !== 'partial'}
                                    onChange={(e) => {
                                        setError('');
                                        setReceived(e.target.value);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            remarksRef.current?.focus();
                                            remarksRef.current?.select();
                                        }
                                    }}
                                    style={{
                                        height: '34px',
                                        fontSize: '0.875rem',
                                        background: type !== 'partial' ? '#e9ecef' : '#fff'
                                    }}
                                />
                            </div>

                            {/* Remaining */}
                            <div className="col-12 col-md-3">
                                <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>
                                    Remaining (Due)
                                </label>
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

                            {/* Remarks */}
                            <div className="col-12">
                                <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>
                                    Remarks
                                </label>
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