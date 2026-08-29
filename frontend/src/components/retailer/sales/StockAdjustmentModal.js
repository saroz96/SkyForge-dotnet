import React, { useState, useEffect, useRef } from 'react';
import NepaliDate from 'nepali-datetime';
import api from '../../services/api';
import NotificationToast from '../../NotificationToast';

const getDefaultExpiryDate = () => {
    const today = new Date();
    today.setFullYear(today.getFullYear() + 2);
    return today.toISOString().split('T')[0];
};

const StockAdjustmentModal = ({ show, onClose, product, onStockAdded, companyDateFormat = 'english', formDate = null }) => {
    const [formData, setFormData] = useState({
        adjustmentType: 'xcess',
        quantity: 1,
        batchNumber: '',
        expiryDate: getDefaultExpiryDate(),
        puPrice: 0,
        price: 0,
        mrp: 0,
        marginPercentage: 0,
        note: '',
        nepaliDate: '',
        billDate: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [nextBillNumber, setNextBillNumber] = useState('');
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const quantityInputRef = useRef(null);
    
    // Refs for all input fields
    const batchInputRef = useRef(null);
    const expiryInputRef = useRef(null);
    const puPriceInputRef = useRef(null);
    const marginInputRef = useRef(null);
    const priceInputRef = useRef(null);
    const mrpInputRef = useRef(null);
    const noteInputRef = useRef(null);
    const cancelButtonRef = useRef(null);
    const submitButtonRef = useRef(null);

    const convertBsToAd = (bsDate) => {
        if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
        try {
            const nepaliDate = new NepaliDate(bsDate);
            const jsDate = nepaliDate.getDateObject();
            if (!jsDate || isNaN(jsDate.getTime())) return null;
            const year = jsDate.getFullYear();
            const month = String(jsDate.getMonth() + 1).padStart(2, '0');
            const day = String(jsDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Error converting BS to AD:', error);
            return null;
        }
    };

    const convertAdToBs = (adDate) => {
        if (!adDate) return null;
        try {
            const date = new Date(adDate + 'T00:00:00');
            if (isNaN(date.getTime())) return null;
            const nepaliDate = new NepaliDate(date);
            const year = nepaliDate.getYear();
            const month = nepaliDate.getMonth() + 1;
            const day = nepaliDate.getDate();
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } catch (error) {
            console.error('Error converting AD to BS:', error);
            return null;
        }
    };

    const getCurrentNepaliDate = () => {
        try {
            const now = new NepaliDate();
            const year = now.getYear();
            const month = now.getMonth() + 1;
            const day = now.getDate();
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } catch (error) {
            console.error('Error getting current Nepali date:', error);
            return '2080-01-01';
        }
    };

    useEffect(() => {
        if (show && product) {
            fetchInitialData();
            generateBatchNumber();

            const isNepaliFormat = companyDateFormat === 'nepali' || companyDateFormat === 'Nepali';
            let nepaliDate = '', billDate = '';

            if (formDate) {
                if (isNepaliFormat) {
                    nepaliDate = formDate;
                    billDate = convertBsToAd(formDate) || new Date().toISOString().split('T')[0];
                } else {
                    billDate = formDate;
                    nepaliDate = convertAdToBs(formDate) || getCurrentNepaliDate();
                }
            } else {
                if (isNepaliFormat) {
                    nepaliDate = getCurrentNepaliDate();
                    billDate = convertBsToAd(nepaliDate) || new Date().toISOString().split('T')[0];
                } else {
                    billDate = new Date().toISOString().split('T')[0];
                    nepaliDate = convertAdToBs(billDate) || getCurrentNepaliDate();
                }
            }

            const defaultPrice = product.stockEntries?.[0]?.price || product.latestPrice || product.price || 0;
            const defaultPuPrice = product.stockEntries?.[0]?.puPrice || product.latestPuPrice || product.puPrice || 0;
            const defaultMrp = product.stockEntries?.[0]?.mrp || product.mrp || 0;
            const defaultMargin = product.stockEntries?.[0]?.marginPercentage || product.marginPercentage || 0;

            setFormData(prev => ({
                ...prev,
                nepaliDate, billDate,
                puPrice: defaultPuPrice,
                price: defaultPrice,
                mrp: defaultMrp,
                marginPercentage: defaultMargin
            }));

            setTimeout(() => {
                if (quantityInputRef.current) {
                    quantityInputRef.current.focus();
                    quantityInputRef.current.select();
                }
            }, 300);
        }
    }, [show, product, companyDateFormat, formDate]);

    const fetchInitialData = async () => {
        try {
            const response = await api.get('/api/retailer/stock-adjustments/current-number');
            setNextBillNumber(response.data.data?.currentStockAdjustmentBillNumber || 'SA-001');
        } catch (error) {
            console.error('Error fetching stock adjustment data:', error);
            setNextBillNumber('SA-001');
        }
    };

    const generateBatchNumber = () => {
        const timestamp = new Date().getTime().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        setFormData(prev => ({ ...prev, batchNumber: `${timestamp}-${random}` }));
    };

    const calculatePriceFromMargin = () => {
        const puPrice = parseFloat(formData.puPrice) || 0;
        const margin = parseFloat(formData.marginPercentage) || 0;
        const calculatedPrice = puPrice * (1 + margin / 100);
        setFormData(prev => ({ ...prev, price: Math.round(calculatedPrice * 100) / 100 }));
    };

    const calculateMarginFromPrice = () => {
        const puPrice = parseFloat(formData.puPrice) || 0;
        const price = parseFloat(formData.price) || 0;
        if (puPrice > 0) {
            const margin = ((price - puPrice) / puPrice) * 100;
            setFormData(prev => ({ ...prev, marginPercentage: Math.round(margin * 100) / 100 }));
        }
    };

    // Enter key navigation handler
    const handleKeyDown = (e, nextFieldRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldRef && nextFieldRef.current) {
                nextFieldRef.current.focus();
                if (nextFieldRef.current.type === 'number' || nextFieldRef.current.type === 'text') {
                    nextFieldRef.current.select();
                }
            }
        }
    };

    // Handle Enter key on the last field (notes) to submit
    const handleNoteKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (submitButtonRef.current) {
                submitButtonRef.current.focus();
                submitButtonRef.current.click();
            }
        }
    };

    // Global Enter key handler for the modal
    const handleModalKeyDown = (e) => {
        // If Enter is pressed and the submit button is focused, submit the form
        if (e.key === 'Enter' && document.activeElement === submitButtonRef.current) {
            e.preventDefault();
            submitButtonRef.current.click();
        }
        // If Escape is pressed, close the modal
        if (e.key === 'Escape') {
            e.preventDefault();
            handleClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.quantity || formData.quantity <= 0) {
            setNotification({ show: true, message: 'Please enter a valid quantity', type: 'error' });
            if (quantityInputRef.current) {
                quantityInputRef.current.focus();
                quantityInputRef.current.select();
            }
            return;
        }

        if (!formData.puPrice || formData.puPrice <= 0) {
            setNotification({ show: true, message: 'Please enter a valid purchase price', type: 'error' });
            if (puPriceInputRef.current) {
                puPriceInputRef.current.focus();
                puPriceInputRef.current.select();
            }
            return;
        }

        if (!formData.price || formData.price <= 0) {
            setNotification({ show: true, message: 'Please enter a valid selling price', type: 'error' });
            if (priceInputRef.current) {
                priceInputRef.current.focus();
                priceInputRef.current.select();
            }
            return;
        }

        setIsLoading(true);
        try {
            const adjustmentData = {
                adjustmentType: 'xcess',
                items: [{
                    itemId: product._id || product.id,
                    unitId: product.unit?._id || product.unitId || product.unit,
                    quantity: parseFloat(formData.quantity),
                    batchNumber: formData.batchNumber || `BATCH-${Date.now().toString().slice(-6)}`,
                    expiryDate: formData.expiryDate || getDefaultExpiryDate(),
                    puPrice: parseFloat(formData.puPrice) || 0,
                    price: parseFloat(formData.price) || 0,
                    mrp: parseFloat(formData.mrp) || 0,
                    marginPercentage: parseFloat(formData.marginPercentage) || 0,
                    reason: ['excess_stock'],
                    vatStatus: product.vatStatus || '13'
                }],
                note: formData.note || `Excess stock added for ${product.name}`,
                nepaliDate: formData.nepaliDate,
                date: new Date(formData.billDate).toISOString(),
                billDate: formData.billDate,
                isVatExempt: 'all',
                vatPercentage: 13,
                discountPercentage: 0
            };

            const response = await api.post('/api/retailer/stock-adjustments', adjustmentData);

            if (onStockAdded) onStockAdded(response.data.data);

            setNotification({ show: true, message: 'Stock added successfully!', type: 'success' });
            setTimeout(handleClose, 1500);
        } catch (error) {
            console.error('Error adding stock:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to add stock. Please try again.';
            setNotification({ show: true, message: errorMessage, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            adjustmentType: 'xcess',
            quantity: 1,
            batchNumber: '',
            expiryDate: '',
            puPrice: 0,
            price: 0,
            mrp: 0,
            marginPercentage: 0,
            note: '',
            nepaliDate: '',
            billDate: ''
        });
        onClose();
    };

    if (!show || !product) return null;

    const totalValue = (formData.quantity * formData.puPrice).toFixed(2);
    const newStock = (product.stock || 0) + parseInt(formData.quantity || 0);
    const profitMargin = formData.marginPercentage || 0;

    return (
        <>
            <div 
                className="modal fade show" 
                style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
                onKeyDown={handleModalKeyDown}
            >
                <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '680px', margin: '0.5rem auto' }}>
                    <div className="modal-content" style={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                        overflow: 'hidden',
                        maxHeight: '98vh'
                    }}>

                        {/* ===== COMPACT HEADER ===== */}
                        <div style={{
                            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                            padding: '10px 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '2px solid #e94560',
                            minHeight: '44px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '16px' }}>📦</span>
                                <div>
                                    <h6 style={{
                                        margin: 0,
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        letterSpacing: '0.3px'
                                    }}>
                                        Stock Adjustment
                                    </h6>
                                    <span style={{
                                        color: 'rgba(255,255,255,0.5)',
                                        fontSize: '0.6rem'
                                    }}>
                                        {product.name.length > 30 ? product.name.substring(0, 30) + '...' : product.name}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: 'none',
                                    color: '#fff',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* ===== COMPACT BODY ===== */}
                            <div style={{ padding: '12px 18px', background: '#f5f6fa' }}>

                                {/* === Product Info Row === */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 0.8fr',
                                    gap: '8px',
                                    background: '#fff',
                                    borderRadius: '8px',
                                    padding: '8px 14px',
                                    marginBottom: '10px',
                                    border: '1px solid #e8e8e8',
                                    fontSize: '0.7rem'
                                }}>
                                    <div>
                                        <span style={{ color: '#888', fontSize: '0.55rem', textTransform: 'uppercase', fontWeight: '600' }}>Product</span>
                                        <div style={{ fontWeight: '600', color: '#1a1a2e', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {product.name}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ color: '#888', fontSize: '0.55rem', textTransform: 'uppercase', fontWeight: '600' }}>Stock</span>
                                        <div style={{ fontWeight: '700', color: '#e94560', fontSize: '0.8rem' }}>
                                            {product.stock || 0}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ color: '#888', fontSize: '0.55rem', textTransform: 'uppercase', fontWeight: '600' }}>Voucher</span>
                                        <div style={{ fontWeight: '600', color: '#0f3460', fontSize: '0.7rem' }}>
                                            {nextBillNumber}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ color: '#888', fontSize: '0.55rem', textTransform: 'uppercase', fontWeight: '600' }}>Type</span>
                                        <div style={{
                                            fontSize: '0.6rem',
                                            fontWeight: '700',
                                            color: '#e94560',
                                            background: 'rgba(233,69,96,0.1)',
                                            padding: '1px 10px',
                                            borderRadius: '12px',
                                            display: 'inline-block'
                                        }}>
                                            EXCESS
                                        </div>
                                    </div>
                                </div>

                                {/* === Dates Row === */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '10px',
                                    marginBottom: '10px'
                                }}>
                                    <div>
                                        <label style={{
                                            fontSize: '0.55rem',
                                            fontWeight: '600',
                                            color: '#666',
                                            display: 'block',
                                            marginBottom: '2px'
                                        }}>
                                            📅 BS Date
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.nepaliDate}
                                            readOnly
                                            style={{
                                                background: '#eef1f5',
                                                border: '1px solid #dde1e6',
                                                borderRadius: '6px',
                                                padding: '4px 10px',
                                                fontSize: '0.7rem',
                                                height: '26px',
                                                width: '100%',
                                                color: '#333',
                                                cursor: 'default'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{
                                            fontSize: '0.55rem',
                                            fontWeight: '600',
                                            color: '#666',
                                            display: 'block',
                                            marginBottom: '2px'
                                        }}>
                                            📅 AD Date
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.billDate}
                                            readOnly
                                            style={{
                                                background: '#eef1f5',
                                                border: '1px solid #dde1e6',
                                                borderRadius: '6px',
                                                padding: '4px 10px',
                                                fontSize: '0.7rem',
                                                height: '26px',
                                                width: '100%',
                                                color: '#333',
                                                cursor: 'default'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* === Stock Details === */}
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1.2fr 1.5fr 1.2fr 1fr',
                                        gap: '8px'
                                    }}>
                                        <div>
                                            <label style={{
                                                fontSize: '0.55rem',
                                                fontWeight: '600',
                                                color: '#666',
                                                display: 'block',
                                                marginBottom: '2px'
                                            }}>
                                                Qty <span style={{ color: '#e94560' }}>*</span>
                                            </label>
                                            <input
                                                ref={quantityInputRef}
                                                type="number"
                                                value={formData.quantity}
                                                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                                required
                                                min="1"
                                                onKeyDown={(e) => handleKeyDown(e, batchInputRef)}
                                                style={{
                                                    borderRadius: '6px',
                                                    border: '2px solid #28a745',
                                                    padding: '2px 8px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600',
                                                    height: '26px',
                                                    width: '100%',
                                                    textAlign: 'center'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{
                                                fontSize: '0.55rem',
                                                fontWeight: '600',
                                                color: '#666',
                                                display: 'block',
                                                marginBottom: '2px'
                                            }}>
                                                Batch No.
                                            </label>
                                            <input
                                                ref={batchInputRef}
                                                type="text"
                                                value={formData.batchNumber}
                                                onChange={(e) => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                                                required
                                                onKeyDown={(e) => handleKeyDown(e, expiryInputRef)}
                                                style={{
                                                    borderRadius: '6px',
                                                    border: '2px solid #0d6efd',
                                                    padding: '2px 8px',
                                                    fontSize: '0.65rem',
                                                    height: '26px',
                                                    width: '100%',
                                                    background: '#f8f9fa'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{
                                                fontSize: '0.55rem',
                                                fontWeight: '600',
                                                color: '#666',
                                                display: 'block',
                                                marginBottom: '2px'
                                            }}>
                                                Expiry
                                            </label>
                                            <input
                                                ref={expiryInputRef}
                                                type="date"
                                                value={formData.expiryDate}
                                                onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                                                onKeyDown={(e) => handleKeyDown(e, puPriceInputRef)}
                                                style={{
                                                    borderRadius: '6px',
                                                    border: '2px solid #fd7e14',
                                                    padding: '2px 8px',
                                                    fontSize: '0.65rem',
                                                    height: '26px',
                                                    width: '100%'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{
                                                fontSize: '0.55rem',
                                                fontWeight: '600',
                                                color: '#666',
                                                display: 'block',
                                                marginBottom: '2px'
                                            }}>
                                                Barcode
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Auto"
                                                disabled
                                                style={{
                                                    borderRadius: '6px',
                                                    border: '1px solid #dde1e6',
                                                    padding: '2px 8px',
                                                    fontSize: '0.6rem',
                                                    height: '26px',
                                                    width: '100%',
                                                    background: '#eef1f5',
                                                    color: '#999',
                                                    fontStyle: 'italic'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* === Pricing === */}
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1.2fr 1fr 1.2fr 1fr',
                                        gap: '8px'
                                    }}>
                                        <div>
                                            <label style={{
                                                fontSize: '0.55rem',
                                                fontWeight: '600',
                                                color: '#666',
                                                display: 'block',
                                                marginBottom: '2px'
                                            }}>
                                                Purchase <span style={{ color: '#e94560' }}>*</span>
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    left: '6px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    fontSize: '0.6rem',
                                                    fontWeight: '600',
                                                    color: '#888'
                                                }}>Rs.</span>
                                                <input
                                                    ref={puPriceInputRef}
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.puPrice}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, puPrice: parseFloat(e.target.value) || 0 }))}
                                                    onBlur={calculatePriceFromMargin}
                                                    onKeyDown={(e) => handleKeyDown(e, marginInputRef)}
                                                    required
                                                    style={{
                                                        borderRadius: '6px',
                                                        border: '2px solid #28a745',
                                                        padding: '2px 8px 2px 28px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        height: '26px',
                                                        width: '100%'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{
                                                fontSize: '0.55rem',
                                                fontWeight: '600',
                                                color: '#666',
                                                display: 'block',
                                                marginBottom: '2px'
                                            }}>
                                                Margin %
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                                                <input
                                                    ref={marginInputRef}
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.marginPercentage}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, marginPercentage: parseFloat(e.target.value) || 0 }))}
                                                    onBlur={calculatePriceFromMargin}
                                                    onKeyDown={(e) => handleKeyDown(e, priceInputRef)}
                                                    style={{
                                                        borderRadius: '6px 0 0 6px',
                                                        border: '2px solid #fd7e14',
                                                        padding: '2px 8px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        height: '26px',
                                                        width: '100%',
                                                        borderRight: 'none'
                                                    }}
                                                />
                                                <span style={{
                                                    background: '#fd7e14',
                                                    color: 'white',
                                                    fontWeight: '700',
                                                    fontSize: '0.6rem',
                                                    padding: '0 6px',
                                                    height: '26px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    borderRadius: '0 6px 6px 0',
                                                    border: '2px solid #fd7e14',
                                                    borderLeft: 'none'
                                                }}>%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{
                                                fontSize: '0.55rem',
                                                fontWeight: '600',
                                                color: '#666',
                                                display: 'block',
                                                marginBottom: '2px'
                                            }}>
                                                Selling <span style={{ color: '#e94560' }}>*</span>
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    left: '6px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    fontSize: '0.6rem',
                                                    fontWeight: '600',
                                                    color: '#888'
                                                }}>Rs.</span>
                                                <input
                                                    ref={priceInputRef}
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.price}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                                    onBlur={calculateMarginFromPrice}
                                                    onKeyDown={(e) => handleKeyDown(e, mrpInputRef)}
                                                    required
                                                    style={{
                                                        borderRadius: '6px',
                                                        border: '2px solid #0d6efd',
                                                        padding: '2px 8px 2px 28px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        height: '26px',
                                                        width: '100%'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{
                                                fontSize: '0.55rem',
                                                fontWeight: '600',
                                                color: '#666',
                                                display: 'block',
                                                marginBottom: '2px'
                                            }}>
                                                MRP
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    left: '6px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    fontSize: '0.6rem',
                                                    fontWeight: '600',
                                                    color: '#888'
                                                }}>Rs.</span>
                                                <input
                                                    ref={mrpInputRef}
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.mrp}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, mrp: parseFloat(e.target.value) || 0 }))}
                                                    onKeyDown={(e) => handleKeyDown(e, noteInputRef)}
                                                    style={{
                                                        borderRadius: '6px',
                                                        border: '2px solid #6f42c1',
                                                        padding: '2px 8px 2px 28px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        height: '26px',
                                                        width: '100%'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* === Summary Row === */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: '8px',
                                    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                    borderRadius: '8px',
                                    padding: '6px 14px',
                                    marginBottom: '8px',
                                    border: '1px solid #a5d6a7'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.5rem', textTransform: 'uppercase', color: '#1b5e20', fontWeight: '600' }}>
                                            Total Value
                                        </div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1b5e20' }}>
                                            Rs. {totalValue}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.5rem', textTransform: 'uppercase', color: '#bf360c', fontWeight: '600' }}>
                                            New Stock
                                        </div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#bf360c' }}>
                                            {newStock}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.5rem', textTransform: 'uppercase', color: '#4a148c', fontWeight: '600' }}>
                                            Profit Margin
                                        </div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4a148c' }}>
                                            {profitMargin}%
                                        </div>
                                    </div>
                                </div>

                                {/* === Notes === */}
                                <div>
                                    <label style={{
                                        fontSize: '0.55rem',
                                        fontWeight: '600',
                                        color: '#666',
                                        display: 'block',
                                        marginBottom: '2px'
                                    }}>
                                        📝 Notes
                                    </label>
                                    <textarea
                                        ref={noteInputRef}
                                        value={formData.note}
                                        onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                                        placeholder="Add notes..."
                                        onKeyDown={handleNoteKeyDown}
                                        style={{
                                            borderRadius: '6px',
                                            border: '1px solid #dde1e6',
                                            padding: '3px 10px',
                                            fontSize: '0.65rem',
                                            resize: 'none',
                                            height: '24px',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* ===== COMPACT FOOTER ===== */}
                            <div style={{
                                padding: '8px 18px',
                                background: '#fff',
                                borderTop: '1px solid #e8e8e8',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                minHeight: '40px'
                            }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: '0.5rem',
                                        color: '#888',
                                        background: '#f5f6fa',
                                        padding: '2px 8px',
                                        borderRadius: '10px'
                                    }}>
                                        ⏰ {new Date().toLocaleTimeString()}
                                    </span>
                                    <span style={{
                                        fontSize: '0.5rem',
                                        color: '#888',
                                        background: '#f5f6fa',
                                        padding: '2px 8px',
                                        borderRadius: '10px'
                                    }}>
                                        📊 {product.stock || 0}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        ref={cancelButtonRef}
                                        type="button"
                                        onClick={handleClose}
                                        disabled={isLoading}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleClose();
                                            }
                                        }}
                                        style={{
                                            padding: '4px 16px',
                                            borderRadius: '6px',
                                            fontSize: '0.7rem',
                                            fontWeight: '600',
                                            color: '#666',
                                            border: '1.5px solid #dde1e6',
                                            background: 'transparent',
                                            cursor: isLoading ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.15s ease',
                                            height: '28px'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isLoading) {
                                                e.currentTarget.style.background = '#f5f6fa';
                                                e.currentTarget.style.borderColor = '#bbb';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.borderColor = '#dde1e6';
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        ref={submitButtonRef}
                                        type="submit"
                                        disabled={isLoading}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSubmit(e);
                                            }
                                        }}
                                        style={{
                                            padding: '4px 20px',
                                            borderRadius: '6px',
                                            fontSize: '0.7rem',
                                            fontWeight: '600',
                                            color: '#fff',
                                            border: 'none',
                                            background: isLoading
                                                ? '#999'
                                                : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                                            boxShadow: isLoading ? 'none' : '0 2px 10px rgba(40,167,69,0.25)',
                                            cursor: isLoading ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.15s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            height: '28px'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isLoading) {
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(40,167,69,0.35)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 10px rgba(40,167,69,0.25)';
                                        }}
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }} />
                                                <span style={{ fontSize: '0.65rem' }}>Adding...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>✓</span>
                                                <span>Add Stock</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />
        </>
    );
};

export default StockAdjustmentModal;