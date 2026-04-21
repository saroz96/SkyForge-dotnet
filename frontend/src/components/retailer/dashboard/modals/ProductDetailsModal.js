// import React from 'react';
// import { Modal } from 'react-bootstrap';
// import '../../../../stylesheet/retailer/dashboard/modals/ProductDetailsModal.css';

// const ProductDetailsModal = ({ product, onClose, onBatchUpdate }) => {
//     const getExpiryStatus = (expiryDate) => {
//         if (!expiryDate) return { status: 'safe', text: 'OK' };

//         const now = new Date();
//         const expiry = new Date(expiryDate);
//         const timeDiff = expiry - now;
//         const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

//         if (daysUntilExpiry <= 0) {
//             return { status: 'expired', text: 'EXPIRED' };
//         } else if (daysUntilExpiry <= 30) {
//             return { status: 'danger', text: `${daysUntilExpiry}d` };
//         } else if (daysUntilExpiry <= 90) {
//             return { status: 'warning', text: `${daysUntilExpiry}d` };
//         } else {
//             return { status: 'safe', text: 'OK' };
//         }
//     };

//     const formatDate = (dateString) => {
//         if (!dateString) return '-';
//         const date = new Date(dateString);
//         return date.toLocaleDateString('en-GB', {
//             day: '2-digit',
//             month: 'short',
//             year: 'numeric'
//         }).replace(/ /g, '-');
//     };

//     const numberFormatter = new Intl.NumberFormat('en-NP', {
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2,
//     });

//     return (
//         <Modal
//             show={true}
//             onHide={onClose}
//             size="xl"
//             centered
//             backdrop="static"
//             dialogClassName="product-details-modal-compact"
//         >
//             <Modal.Header closeButton className="py-1" style={{
//                 backgroundColor: '#f8f9fa',
//                 borderBottom: '1px solid #dee2e6',
//                 fontSize: '0.9rem'
//             }}>
//                 <div className="d-flex justify-content-between align-items-center w-100">
//                     <div>
//                         <span className="fw-bold" style={{ fontSize: '0.85rem' }}>
//                             {product.name}
//                         </span>
//                     </div>
//                 </div>
//             </Modal.Header>

//             <Modal.Body className="p-0" style={{ maxHeight: '300px', minHeight: '300px', overflowY: 'auto' }}>
//                 {product.composition && product.composition.length > 0 && (
//                     <div className="px-2 py-1 bg-light border-bottom" style={{ fontSize: '0.75rem' }}>
//                         <strong>Composition:</strong>
//                         {product.composition.map((comp, idx) => (
//                             <span key={idx} className="badge bg-white text-dark border py-1" style={{ fontSize: '0.7rem' }}>
//                                 {comp.uniqueNumber ? `${comp.uniqueNumber} - ` : ''}{comp.name}
//                             </span>
//                         ))}
//                     </div>
//                 )}

//                 <div className="table-responsive" style={{ fontSize: '0.8rem' }}>
//                     <table className="table table-sm table-hover align-middle mb-0">
//                         <thead className="table-light sticky-top" style={{ fontSize: '0.75rem' }}>
//                             <tr>
//                                 <th className="px-2 py-1" style={{ width: '15%' }}>Batch</th>
//                                 <th className="px-2 py-1" style={{ width: '15%' }}>Expiry</th>
//                                 <th className="px-2 py-1" style={{ width: '12%' }}>Status</th>
//                                 <th className="px-2 py-1 text-end" style={{ width: '10%' }}>Stock</th>
//                                 <th className="px-2 py-1" style={{ width: '10%' }}>Unit</th>
//                                 <th className="px-2 py-1 text-end" style={{ width: '12%' }}>C.P</th>
//                                 <th className="px-2 py-1 text-end" style={{ width: '12%' }}>S.P</th>
//                                 <th className="px-2 py-1 text-end" style={{ width: '12%' }}>MRP</th>
//                                 <th className="px-2 py-1 text-center" style={{ width: '12%' }}>Action</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {product.stockEntries && product.stockEntries
//                                 .filter(entry => entry.quantity > 0)
//                                 .map((entry, index) => {
//                                     const status = getExpiryStatus(entry.expiryDate);

//                                     return (
//                                         <tr key={index} className={status.status} style={{ fontSize: '0.75rem' }}>
//                                             <td className="px-2 py-1">{entry.batchNumber || '-'}</td>
//                                             <td className="px-2 py-1">{formatDate(entry.expiryDate)}</td>
//                                             <td className="px-2 py-1">
//                                                 <span className={`expiry-badge-modal ${status.status} px-1 py-0`} style={{ fontSize: '0.7rem' }}>
//                                                     {status.text}
//                                                 </span>
//                                             </td>
//                                             <td className="px-2 py-1 text-end">{entry.quantity}</td>
//                                             <td className="px-2 py-1">{product.unit?.name || product.unit || ''}</td>
//                                             <td className="px-2 py-1 text-end">{numberFormatter.format(entry.puPrice || 0)}</td>
//                                             <td className="px-2 py-1 text-end">{numberFormatter.format(entry.price || 0)}</td>
//                                             <td className="px-2 py-1 text-end">{numberFormatter.format(entry.mrp || 0)}</td>
//                                             <td className="px-2 py-1 text-center">
//                                                 <button
//                                                     className="btn btn-sm btn-outline-primary py-0 px-2"
//                                                     onClick={() => onBatchUpdate(index)}
//                                                     style={{ fontSize: '0.7rem' }}
//                                                 >
//                                                     Update
//                                                 </button>
//                                             </td>
//                                         </tr>
//                                     );
//                                 })}
//                         </tbody>
//                     </table>
//                 </div>
//             </Modal.Body>

//             <Modal.Footer className="py-1 px-2" style={{
//                 backgroundColor: '#f8f9fa',
//                 borderTop: '1px solid #dee2e6',
//                 fontSize: '0.75rem'
//             }}>
//                 <div className="d-flex justify-content-between align-items-center w-100">
//                     <div className="expiry-legend">
//                         <strong>Expiry Legend:</strong>
//                         <span className="expiry-badge-modal expired ms-1">EXPIRED</span>
//                         <span className="expiry-badge-modal danger ms-1">≤30d</span>
//                         <span className="expiry-badge-modal warning ms-1">≤90d</span>
//                         <span className="expiry-badge-modal safe ms-1">OK</span>
//                     </div>
//                     <button
//                         type="button"
//                         className="btn btn-sm btn-outline-secondary py-1 px-3"
//                         onClick={onClose}
//                         style={{ fontSize: '0.75rem' }}
//                     >
//                         Close
//                     </button>
//                 </div>
//             </Modal.Footer>

//             <style jsx global>{`
//                 .product-details-modal-compact {
//                     max-width: 70vw;
//                     width: 70vw;
//                     max-height: 400px;
//                     margin: 0 auto;
//                 }
//                 .product-details-modal-compact .modal-content {
//                     max-height: 400px;
//                 }
//                 .product-details-modal-compact .modal-body {
//                     max-height: 300px;
//                     overflow-y: auto;
//                 }
//                 .expiry-badge-modal {
//                     padding: 1px 5px;
//                     border-radius: 3px;
//                     font-size: 0.7rem;
//                     font-weight: 500;
//                 }
//                 .expired {
//                     background-color: #ffcccc;
//                     color: #cc0000;
//                 }
//                 .danger {
//                     background-color: #ffcc00;
//                     color: #663300;
//                 }
//                 .warning {
//                     background-color: #fff0cc;
//                     color: #996600;
//                 }
//                 .safe {
//                     background-color: #ccffcc;
//                     color: #006600;
//                 }
//                 table tr.expired {
//                     background-color: #fff5f5 !important;
//                 }
//                 table tr.danger {
//                     background-color: #fff9e6 !important;
//                 }
//                 table tr.warning {
//                     background-color: #fffdf0 !important;
//                 }
//                 table tr.safe {
//                     background-color: #f0fff0 !important;
//                 }
//             `}</style>
//         </Modal>
//     );
// };

// export default ProductDetailsModal;

//----------------------------------------------------------------end

import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import axios from 'axios';
import NotificationToast from '../../../NotificationToast';
import BatchUpdateModal from './BatchUpdateModal';
import '../../../../stylesheet/retailer/dashboard/modals/ProductDetailsModal.css';

const ProductDetailsModal = ({ product: initialProduct, onClose, onBatchUpdate }) => {
    const [product, setProduct] = useState(initialProduct);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [selectedBatchIndex, setSelectedBatchIndex] = useState(null);
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

    // Refresh product data when the component mounts or when initialProduct changes
    useEffect(() => {
        if (initialProduct) {
            setProduct(initialProduct);
        }
    }, [initialProduct]);

    // Function to fetch latest product data
    const fetchLatestProductData = async () => {
        if (!product?._id && !product?.id) return;
        
        try {
            const productId = product._id || product.id;
            const response = await api.get(`/api/retailer/items/${productId}`);
            
            if (response.data.success && response.data.data) {
                const latestProduct = response.data.data.item;
                setProduct(latestProduct);
                
                // Call the onBatchUpdate callback if provided to refresh parent
                if (onBatchUpdate && typeof onBatchUpdate === 'function') {
                    onBatchUpdate();
                }
            }
        } catch (error) {
            console.error('Error fetching latest product data:', error);
        }
    };

    // Handle batch update
    const handleBatchUpdate = (batchIndex) => {
        const stockEntries = product.stockEntries || [];
        const batch = stockEntries[batchIndex];
        
        if (batch) {
            setSelectedBatch({
                index: batchIndex,
                batchNumber: batch.batchNumber,
                expiryDate: batch.expiryDate,
                puPrice: batch.puPrice || 0,
                price: batch.price || 0,
                mrp: batch.mrp || 0
            });
            setSelectedBatchIndex(batchIndex);
            setShowBatchModal(true);
        }
    };

    // Handle batch update success
    const handleBatchUpdateSuccess = async () => {
        await fetchLatestProductData();
        setNotification({
            show: true,
            message: 'Batch updated successfully!',
            type: 'success'
        });
    };

    const getExpiryStatus = (expiryDate) => {
        if (!expiryDate) return { status: 'safe', text: 'OK' };

        const now = new Date();
        const expiry = new Date(expiryDate);
        const timeDiff = expiry - now;
        const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysUntilExpiry <= 0) {
            return { status: 'expired', text: 'EXPIRED' };
        } else if (daysUntilExpiry <= 30) {
            return { status: 'danger', text: `${daysUntilExpiry}d` };
        } else if (daysUntilExpiry <= 90) {
            return { status: 'warning', text: `${daysUntilExpiry}d` };
        } else {
            return { status: 'safe', text: 'OK' };
        }
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

    const closeNotification = () => {
        setNotification(prev => ({ ...prev, show: false }));
    };

    return (
        <>
            <Modal
                show={true}
                onHide={onClose}
                size="xl"
                centered
                backdrop="static"
                dialogClassName="product-details-modal-compact"
            >
                <Modal.Header closeButton className="py-1" style={{
                    backgroundColor: '#f8f9fa',
                    borderBottom: '1px solid #dee2e6',
                    fontSize: '0.9rem'
                }}>
                    <div className="d-flex justify-content-between align-items-center w-100">
                        <div>
                            <span className="fw-bold" style={{ fontSize: '0.85rem' }}>
                                {product?.name || 'Product Details'}
                            </span>
                            <span className="ms-2 text-muted" style={{ fontSize: '0.8rem' }}>
                                ({product?.uniqueNumber || 'N/A'})
                            </span>
                        </div>
                    </div>
                </Modal.Header>

                <Modal.Body className="p-0" style={{ maxHeight: '300px', minHeight: '300px', overflowY: 'auto' }}>
                    {product?.composition && product.composition.length > 0 && (
                        <div className="px-2 py-1 bg-light border-bottom" style={{ fontSize: '0.75rem' }}>
                            <strong>Composition:</strong>
                            {product.composition.map((comp, idx) => (
                                <span key={idx} className="badge bg-white text-dark border py-1 ms-1" style={{ fontSize: '0.7rem' }}>
                                    {comp.uniqueNumber ? `${comp.uniqueNumber} - ` : ''}{comp.name}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="table-responsive" style={{ fontSize: '0.8rem' }}>
                        <table className="table table-sm table-hover align-middle mb-0">
                            <thead className="table-light sticky-top" style={{ fontSize: '0.75rem' }}>
                                <tr>
                                    <th className="px-2 py-1" style={{ width: '15%' }}>Batch</th>
                                    <th className="px-2 py-1" style={{ width: '15%' }}>Expiry</th>
                                    <th className="px-2 py-1" style={{ width: '12%' }}>Status</th>
                                    <th className="px-2 py-1 text-end" style={{ width: '10%' }}>Stock</th>
                                    <th className="px-2 py-1" style={{ width: '10%' }}>Unit</th>
                                    <th className="px-2 py-1 text-end" style={{ width: '12%' }}>C.P</th>
                                    <th className="px-2 py-1 text-end" style={{ width: '12%' }}>S.P</th>
                                    <th className="px-2 py-1 text-end" style={{ width: '12%' }}>MRP</th>
                                    <th className="px-2 py-1 text-center" style={{ width: '12%' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {product?.stockEntries && product.stockEntries
                                    .filter(entry => entry.quantity > 0)
                                    .map((entry, index) => {
                                        const status = getExpiryStatus(entry.expiryDate);
                                        return (
                                            <tr key={index} className={status.status} style={{ fontSize: '0.75rem' }}>
                                                <td className="px-2 py-1">{entry.batchNumber || '-'}</td>
                                                <td className="px-2 py-1">{formatDate(entry.expiryDate)}</td>
                                                <td className="px-2 py-1">
                                                    <span className={`expiry-badge-modal ${status.status} px-1 py-0`} style={{ fontSize: '0.7rem' }}>
                                                        {status.text}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-1 text-end">{entry.quantity}</td>
                                                <td className="px-2 py-1">{product?.unit?.name || product?.unit || ''}</td>
                                                <td className="px-2 py-1 text-end">{numberFormatter.format(entry.puPrice || 0)}</td>
                                                <td className="px-2 py-1 text-end">{numberFormatter.format(entry.price || 0)}</td>
                                                <td className="px-2 py-1 text-end">{numberFormatter.format(entry.mrp || 0)}</td>
                                                <td className="px-2 py-1 text-center">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary py-0 px-2"
                                                        onClick={() => handleBatchUpdate(index)}
                                                        style={{ fontSize: '0.7rem' }}
                                                    >
                                                        Update
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>

                <Modal.Footer className="py-1 px-2" style={{
                    backgroundColor: '#f8f9fa',
                    borderTop: '1px solid #dee2e6',
                    fontSize: '0.75rem'
                }}>
                    <div className="d-flex justify-content-between align-items-center w-100">
                        <div className="expiry-legend">
                            <strong>Expiry Legend:</strong>
                            <span className="expiry-badge-modal expired ms-1">EXPIRED</span>
                            <span className="expiry-badge-modal danger ms-1">≤30d</span>
                            <span className="expiry-badge-modal warning ms-1">≤90d</span>
                            <span className="expiry-badge-modal safe ms-1">OK</span>
                        </div>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary py-1 px-3"
                            onClick={onClose}
                            style={{ fontSize: '0.75rem' }}
                        >
                            Close
                        </button>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Batch Update Modal */}
            {showBatchModal && selectedBatch && (
                <BatchUpdateModal
                    product={product}
                    batch={selectedBatch}
                    onClose={() => {
                        setShowBatchModal(false);
                        setSelectedBatch(null);
                        setSelectedBatchIndex(null);
                    }}
                    onUpdate={handleBatchUpdateSuccess}
                />
            )}

            {/* Notification Toast */}
            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={closeNotification}
            />

            <style jsx global>{`
                .product-details-modal-compact {
                    max-width: 70vw;
                    width: 70vw;
                    max-height: 400px;
                    margin: 0 auto;
                }
                .product-details-modal-compact .modal-content {
                    max-height: 400px;
                }
                .product-details-modal-compact .modal-body {
                    max-height: 300px;
                    overflow-y: auto;
                }
                .expiry-badge-modal {
                    padding: 1px 5px;
                    border-radius: 3px;
                    font-size: 0.7rem;
                    font-weight: 500;
                }
                .expired {
                    background-color: #ffcccc;
                    color: #cc0000;
                }
                .danger {
                    background-color: #ffcc00;
                    color: #663300;
                }
                .warning {
                    background-color: #fff0cc;
                    color: #996600;
                }
                .safe {
                    background-color: #ccffcc;
                    color: #006600;
                }
                table tr.expired {
                    background-color: #fff5f5 !important;
                }
                table tr.danger {
                    background-color: #fff9e6 !important;
                }
                table tr.warning {
                    background-color: #fffdf0 !important;
                }
                table tr.safe {
                    background-color: #f0fff0 !important;
                }
                @media (max-width: 768px) {
                    .product-details-modal-compact {
                        max-width: 95vw;
                        width: 95vw;
                    }
                }
            `}</style>
        </>
    );
};

export default ProductDetailsModal;