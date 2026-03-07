import React, { useState, useEffect, useRef } from 'react';

const BatchSelectionModal = ({ item, stockEntries, onSelect, onClose, notification, setNotification }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredEntries, setFilteredEntries] = useState(stockEntries || []);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const searchInputRef = useRef(null);

    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const filtered = stockEntries.filter(entry =>
                entry.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.price?.toString().includes(searchQuery) ||
                entry.purchasePrice?.toString().includes(searchQuery)
            );
            setFilteredEntries(filtered);
            setSelectedIndex(0);
        } else {
            setFilteredEntries(stockEntries);
        }
    }, [searchQuery, stockEntries]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-NP');
        } catch {
            return dateString;
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filteredEntries.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredEntries[selectedIndex]) {
                onSelect(filteredEntries[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    return (
        <div
            className="modal fade show"
            id="batchSelectionModal"
            tabIndex="-1"
            style={{
                display: 'block',
                backgroundColor: 'rgba(0,0,0,0.5)',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1060
            }}
        >
            <div
                className="modal-dialog modal-lg modal-dialog-centered"
                style={{ maxWidth: '800px' }}
            >
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white py-2">
                        <h5 className="modal-title" style={{ fontSize: '1rem' }}>
                            Select Batch for {item.name}
                        </h5>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={onClose}
                            aria-label="Close"
                            style={{ fontSize: '0.75rem' }}
                        ></button>
                    </div>

                    <div className="modal-body p-2">
                        <div className="mb-2">
                            <input
                                type="text"
                                ref={searchInputRef}
                                className="form-control form-control-sm"
                                placeholder="Search by batch number or price..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                style={{ fontSize: '0.85rem' }}
                            />
                        </div>

                        <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <table className="table table-sm table-hover mb-0">
                                <thead className="sticky-top bg-light" style={{ top: 0 }}>
                                    <tr>
                                        <th style={{ width: '5%', fontSize: '0.75rem', padding: '0.25rem' }}>#</th>
                                        <th style={{ width: '15%', fontSize: '0.75rem', padding: '0.25rem' }}>Batch No.</th>
                                        <th style={{ width: '15%', fontSize: '0.75rem', padding: '0.25rem' }}>Expiry Date</th>
                                        <th style={{ width: '15%', fontSize: '0.75rem', padding: '0.25rem' }}>Quantity</th>
                                        <th style={{ width: '15%', fontSize: '0.75rem', padding: '0.25rem' }}>Price (Rs.)</th>
                                        <th style={{ width: '15%', fontSize: '0.75rem', padding: '0.25rem' }}>Purchase Price</th>
                                        <th style={{ width: '20%', fontSize: '0.75rem', padding: '0.25rem' }}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEntries.length > 0 ? (
                                        filteredEntries.map((entry, index) => (
                                            <tr
                                                key={index}
                                                className={index === selectedIndex ? 'table-primary' : ''}
                                                style={{
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem'
                                                }}
                                                onClick={() => onSelect(entry)}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                            >
                                                <td style={{ padding: '0.25rem' }}>{index + 1}</td>
                                                <td style={{ padding: '0.25rem', fontWeight: '500' }}>
                                                    {entry.batchNumber || 'N/A'}
                                                </td>
                                                <td style={{ padding: '0.25rem' }}>
                                                    {entry.expiryDate ? formatDate(entry.expiryDate) : 'N/A'}
                                                </td>
                                                <td style={{ padding: '0.25rem' }}>
                                                    {entry.quantity || entry.availableQuantity || 0}
                                                </td>
                                                <td style={{ padding: '0.25rem', fontWeight: '500' }}>
                                                    Rs. {Math.round((entry.price || 0) * 100) / 100}
                                                </td>
                                                <td style={{ padding: '0.25rem', color: '#6c757d' }}>
                                                    Rs. {Math.round((entry.purchasePrice || entry.price || 0) * 100) / 100}
                                                </td>
                                                <td style={{ padding: '0.25rem' }}>
                                                    {entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="text-center py-3 text-muted" style={{ fontSize: '0.8rem' }}>
                                                No stock entries found for this item
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {filteredEntries.length === 0 && stockEntries.length > 0 && (
                            <div className="text-center py-2 text-muted" style={{ fontSize: '0.75rem' }}>
                                No matching batches found
                            </div>
                        )}
                    </div>

                    <div className="modal-footer py-1 px-2">
                        <div className="d-flex justify-content-between align-items-center w-100">
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                {filteredEntries.length} of {stockEntries.length} batches •
                                Use ↑↓ arrows to navigate, Enter to select, Esc to cancel
                            </small>
                            <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                onClick={onClose}
                                style={{
                                    fontSize: '0.75rem',
                                    padding: '0.15rem 0.5rem'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BatchSelectionModal;