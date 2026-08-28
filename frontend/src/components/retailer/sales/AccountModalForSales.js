import React, { useState, useEffect, useRef, useCallback } from 'react';

const AccountModalForSales = ({
    show,
    onClose,
    onSelectAccount,
    accounts,
    totalAccounts,
    isSearching,
    hasMore,
    searchQuery,
    onSearch,
    onLoadMore,
    page,
    onCreateAccount,
    selectedAccountId,
    paymentMode = 'credit', // 'cash' or 'credit'
    isManualEntry = false,
    onManualEntryChange,
    cashInHandAccountId = null
}) => {
    // Modal position and size states
    const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
    const [modalSize, setModalSize] = useState({ width: 900, height: 450 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] = useState('');
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 });
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isVisible, setIsVisible] = useState(false);
    const [currentFocus, setCurrentFocus] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [manualAccountName, setManualAccountName] = useState('');

    const modalRef = useRef(null);
    const searchInputRef = useRef(null);
    const listRef = useRef(null);
    const rowRefs = useRef({});
    const isLoadingMoreRef = useRef(false);
    const lastScrollTop = useRef(0);
    const loadMoreTimerRef = useRef(null);

    // Show modal with animation
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                setIsVisible(true);
                setTimeout(() => {
                    if (searchInputRef.current) {
                        searchInputRef.current.focus();
                        searchInputRef.current.select();
                    }
                }, 100);
            }, 50);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [show]);

    // Center modal on initial load
    useEffect(() => {
        if (show) {
            const width = Math.min(900, window.innerWidth - 40);
            const height = Math.min(400, window.innerHeight - 40);
            setModalSize({ width, height });
            setModalPosition({
                x: (window.innerWidth - width) / 2,
                y: (window.innerHeight - height) / 2
            });
        }
    }, [show]);

    // Reset focus when accounts change
    useEffect(() => {
        if (accounts.length > 0 && currentFocus >= accounts.length) {
            setCurrentFocus(accounts.length - 1);
        }
    }, [accounts, currentFocus]);

    // Scroll to item
    const scrollToItem = useCallback((index) => {
        if (!listRef.current || !rowRefs.current[index]) return;

        const container = listRef.current;
        const rowElement = rowRefs.current[index];

        const containerRect = container.getBoundingClientRect();
        const rowRect = rowElement.getBoundingClientRect();

        const rowTop = rowRect.top - containerRect.top;
        const rowBottom = rowRect.bottom - containerRect.top;
        const containerHeight = container.clientHeight;

        if (rowTop < 0) {
            container.scrollTop += rowTop - 8;
        } else if (rowBottom > containerHeight) {
            container.scrollTop += rowBottom - containerHeight + 8;
        }
    }, []);

    // Drag Handlers
    const handleMouseDown = (e) => {
        if (e.target.closest('.modal-header') && !e.target.closest('.btn-close') && !e.target.closest('.resize-handle')) {
            e.preventDefault();
            setIsDragging(true);
            const rect = modalRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            e.preventDefault();
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;

            const maxX = window.innerWidth - modalSize.width;
            const maxY = window.innerHeight - modalSize.height;

            setModalPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        } else if (isResizing) {
            e.preventDefault();
            const deltaX = e.clientX - resizeStart.x;
            const deltaY = e.clientY - resizeStart.y;

            let newWidth = resizeStart.width;
            let newHeight = resizeStart.height;

            switch (resizeDirection) {
                case 'right':
                    newWidth = Math.max(500, Math.min(resizeStart.width + deltaX, window.innerWidth - modalPosition.x));
                    break;
                case 'bottom':
                    newHeight = Math.max(300, Math.min(resizeStart.height + deltaY, window.innerHeight - modalPosition.y));
                    break;
                case 'bottom-right':
                    newWidth = Math.max(500, Math.min(resizeStart.width + deltaX, window.innerWidth - modalPosition.x));
                    newHeight = Math.max(300, Math.min(resizeStart.height + deltaY, window.innerHeight - modalPosition.y));
                    break;
                default:
                    break;
            }

            setModalSize({ width: newWidth, height: newHeight });
        }
    }, [isDragging, isResizing, dragOffset, modalSize, resizeStart, modalPosition, resizeDirection]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeDirection('');
    }, []);

    // Resize Handlers
    const handleResizeStart = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        const rect = modalRef.current.getBoundingClientRect();
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: rect.width,
            height: rect.height,
            left: rect.left,
            top: rect.top
        });
    };

    // Zoom handler
    const handleWheel = useCallback((e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Math.min(Math.max(0.5, zoomLevel + delta), 2);
            setZoomLevel(newZoom);
        }
    }, [zoomLevel]);

    // Add global event listeners
    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
        };
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    // Add wheel event listener for zoom
    useEffect(() => {
        const modal = modalRef.current;
        if (modal) {
            modal.addEventListener('wheel', handleWheel, { passive: false });
            return () => {
                modal.removeEventListener('wheel', handleWheel);
            };
        }
    }, [handleWheel]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e) => {
        const currentAccounts = accounts;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentAccounts.length > 0) {
                const nextFocus = Math.min(currentFocus + 1, currentAccounts.length - 1);
                setCurrentFocus(nextFocus);
                setTimeout(() => {
                    scrollToItem(nextFocus);
                }, 50);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentAccounts.length > 0) {
                const nextFocus = Math.max(currentFocus - 1, 0);
                setCurrentFocus(nextFocus);
                setTimeout(() => {
                    scrollToItem(nextFocus);
                }, 50);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            
            // Check if we're in cash mode and there's a search query
            if (paymentMode === 'cash' && searchQuery.trim()) {
                // First, check if there are accounts and one is focused
                if (currentAccounts.length > 0 && currentFocus >= 0 && currentFocus < currentAccounts.length) {
                    // Select the focused account
                    onSelectAccount(currentAccounts[currentFocus]);
                    return;
                }
                
                // If no account is focused OR no accounts exist, use manual entry
                // Check if the search query matches any account name (case insensitive)
                const exactMatch = currentAccounts.find(acc => 
                    acc.name.toLowerCase() === searchQuery.trim().toLowerCase()
                );
                
                if (exactMatch) {
                    // If exact match exists, select it
                    onSelectAccount(exactMatch);
                    return;
                }
                
                // No exact match, use as manual entry
                onSelectAccount({
                    id: cashInHandAccountId,
                    name: searchQuery.trim(),
                    isManual: true
                });
                return;
            }
            
            // Credit mode or no search query - select focused account if exists
            if (currentAccounts.length > 0 && currentFocus >= 0 && currentFocus < currentAccounts.length) {
                onSelectAccount(currentAccounts[currentFocus]);
            }
        } else if (e.key === 'Escape') {
            handleClose();
        } else if (e.key === 'F6') {
            e.preventDefault();
            if (onCreateAccount) {
                onCreateAccount();
            }
        }
    }, [accounts, currentFocus, onSelectAccount, scrollToItem, onCreateAccount, paymentMode, searchQuery, cashInHandAccountId]);

    // Scroll to focused item when currentFocus changes
    useEffect(() => {
        if (currentFocus >= 0 && accounts.length > 0 && currentFocus < accounts.length) {
            setTimeout(() => {
                scrollToItem(currentFocus);
            }, 50);
        }
    }, [currentFocus, accounts, scrollToItem]);

    // OPTIMIZED: Handle scroll for infinite loading - Loads earlier
    const handleScroll = useCallback((e) => {
        const container = e.target;
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;

        lastScrollTop.current = scrollTop;

        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;

        if (loadMoreTimerRef.current) {
            clearTimeout(loadMoreTimerRef.current);
        }

        const shouldLoadMore =
            !isSearching &&
            hasMore &&
            onLoadMore &&
            !isLoadingMoreRef.current &&
            accounts.length > 0 &&
            (distanceFromBottom < 200 || scrollPercentage > 70);

        if (shouldLoadMore) {
            loadMoreTimerRef.current = setTimeout(() => {
                isLoadingMoreRef.current = true;
                setIsLoadingMore(true);
                onLoadMore();
                setTimeout(() => {
                    isLoadingMoreRef.current = false;
                    setIsLoadingMore(false);
                }, 1000);
            }, 200);
        }
    }, [isSearching, hasMore, onLoadMore, accounts.length]);

    // Reset loading state when search changes
    useEffect(() => {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
        if (loadMoreTimerRef.current) {
            clearTimeout(loadMoreTimerRef.current);
        }
    }, [searchQuery]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (loadMoreTimerRef.current) {
                clearTimeout(loadMoreTimerRef.current);
            }
        };
    }, []);

    // Handle close with animation
    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    // Resize handle styles
    const resizeHandleStyle = {
        position: 'absolute',
        zIndex: 20,
    };

    // Format account display
    const formatAccountDisplay = (account) => {
        if (!account) return '';
        const number = account.uniqueNumber || account.code || '';
        const name = account.name || '';
        return `${number} ${name}`.trim();
    };

    // Get account address
    const getAccountAddress = (account) => {
        if (!account) return '';
        return account.address || account.city || account.location || '';
    };

    // Get account PAN
    const getAccountPan = (account) => {
        if (!account) return '';
        return account.pan || account.panNumber || account.vatNumber || '';
    };

    // Get account balance and balance type
    const getAccountBalanceInfo = (account) => {
        if (!account) return { balance: null, balanceType: null };

        if (account.balance !== undefined && account.balance !== null) {
            const balanceType = account.balanceType || (account.balance > 0 ? 'Dr' : 'Cr');
            return {
                balance: account.balance,
                balanceType: balanceType
            };
        }

        return { balance: null, balanceType: null };
    };

    // Get balance color based on balance type (Dr = Red, Cr = Green)
    const getBalanceColor = (balanceType) => {
        if (balanceType === 'Dr') {
            return '#dc3545'; // Red for Debit
        } else if (balanceType === 'Cr') {
            return '#28a745'; // Green for Credit
        }
        return '#999';
    };

    // Compress text
    const compressText = (text, maxLength = 30) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`modal-backdrop fade ${isVisible ? 'show' : ''}`}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 1040,
                    transition: 'opacity 0.15s linear',
                    opacity: isVisible ? 1 : 0,
                    pointerEvents: isVisible ? 'auto' : 'none'
                }}
                onClick={handleClose}
            />

            {/* Account Selection Modal */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1050,
                    pointerEvents: 'none'
                }}
            >
                <div
                    ref={modalRef}
                    className={`modal fade ${isVisible ? 'show' : ''}`}
                    style={{
                        width: `${modalSize.width}px`,
                        height: `${modalSize.height}px`,
                        position: 'fixed',
                        left: `${modalPosition.x}px`,
                        top: `${modalPosition.y}px`,
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        pointerEvents: isVisible ? 'all' : 'none',
                        cursor: isDragging ? 'grabbing' : 'default',
                        overflow: 'hidden',
                        zIndex: 1051,
                        border: '1px solid rgba(0,0,0,0.1)',
                        transform: `scale(${isVisible ? zoomLevel : 0.8})`,
                        transformOrigin: 'center center',
                        opacity: isVisible ? 1 : 0,
                        transition: isDragging || isResizing ? 'none' : 'all 0.3s ease-in-out',
                    }}
                    onMouseDown={handleMouseDown}
                >
                    {/* Zoom indicator */}
                    {zoomLevel !== 1 && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            zIndex: 100,
                            pointerEvents: 'none',
                            opacity: 0.8,
                            animation: 'fadeInOut 1.5s ease-in-out'
                        }}>
                            {Math.round(zoomLevel * 100)}%
                        </div>
                    )}

                    {/* Resize Handles */}
                    <div
                        className="resize-handle"
                        style={{
                            ...resizeHandleStyle,
                            right: '-5px',
                            top: '20px',
                            bottom: '20px',
                            width: '10px',
                            cursor: 'ew-resize',
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'right')}
                    />
                    <div
                        className="resize-handle"
                        style={{
                            ...resizeHandleStyle,
                            bottom: '-5px',
                            left: '20px',
                            right: '20px',
                            height: '10px',
                            cursor: 'ns-resize',
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
                    />
                    <div
                        className="resize-handle"
                        style={{
                            ...resizeHandleStyle,
                            bottom: '-5px',
                            right: '-5px',
                            width: '15px',
                            height: '15px',
                            cursor: 'nwse-resize',
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
                    />

                    {/* Header */}
                    <div
                        className="modal-header py-1"
                        style={{
                            cursor: 'grab',
                            backgroundColor: '#f8f9fa',
                            borderBottom: '1px solid #dee2e6',
                            padding: '8px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0,
                            minHeight: '40px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <p className="modal-title mb-0" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                {paymentMode === 'cash' ? 'Select Cash Account' : 'Select Account'}
                            </p>
                            {zoomLevel !== 1 && (
                                <span style={{
                                    fontSize: '0.65rem',
                                    color: '#999',
                                    backgroundColor: '#f0f0f0',
                                    padding: '1px 8px',
                                    borderRadius: '3px',
                                    fontFamily: 'monospace',
                                    marginLeft: '8px'
                                }}>
                                    {Math.round(zoomLevel * 100)}%
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            style={{
                                fontSize: '0.7rem',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                padding: '4px',
                                color: '#000',
                                opacity: 0.7,
                                transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = '1'}
                            onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                        >
                            <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>×</span>
                        </button>
                    </div>

                    {/* Search Controls */}
                    <div className="p-2 bg-white" style={{ flexShrink: 0 }}>
                        <div className="row g-2 align-items-center">
                            <div className={paymentMode === 'cash' ? 'col-12' : 'col-9'}>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    id="searchAccount"
                                    className="form-control form-control-sm"
                                    placeholder={
                                        paymentMode === 'cash'
                                            ? "Type to search or enter new account name... (Press Enter to select/use)"
                                            : "Search Account... (Press F6 to create new account)"
                                    }
                                    autoComplete='off'
                                    value={searchQuery}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        onSearch(value);
                                    }}
                                    onKeyDown={handleKeyDown}
                                    style={{
                                        fontSize: '0.8rem',
                                        padding: '0.25rem 0.5rem',
                                        height: '32px'
                                    }}
                                />
                            </div>
                            {paymentMode !== 'cash' && (
                                <div className="col-3">
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm w-100"
                                        onClick={() => {
                                            if (onCreateAccount) onCreateAccount();
                                        }}
                                        style={{ fontSize: '0.75rem', height: '32px' }}
                                    >
                                        <i className="bi bi-plus-circle me-1"></i> New Account
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Modal Body - Account List */}
                    <div className="modal-body p-0" style={{ flex: 1, overflow: 'hidden', padding: '8px' }}>
                        <div style={{ height: '100%' }}>
                            <div
                                style={{
                                    border: '1px solid #dee2e6',
                                    borderRadius: '0.25rem',
                                    overflow: 'hidden',
                                    height: '100%'
                                }}
                            >
                                {/* Header Row */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1.8fr 1.2fr 1.2fr',
                                    alignItems: 'center',
                                    padding: '0 8px',
                                    height: '28px',
                                    background: '#f0f0f0',
                                    fontWeight: 'bold',
                                    borderBottom: '1px solid #dee2e6',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 1,
                                    fontSize: '0.7rem'
                                }}>
                                    <div><strong>Account Name</strong></div>
                                    <div><strong>Address</strong></div>
                                    <div><strong>PAN</strong></div>
                                    <div style={{ textAlign: 'right' }}><strong>Balance</strong></div>
                                </div>

                                {/* Accounts List */}
                                <div
                                    style={{
                                        height: 'calc(100% - 28px)',
                                        overflowY: 'auto',
                                        position: 'relative'
                                    }}
                                    ref={listRef}
                                    tabIndex={0}
                                    onKeyDown={handleKeyDown}
                                    onScroll={handleScroll}
                                >
                                    {isSearching && accounts.length === 0 ? (
                                        <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            Loading accounts...
                                        </div>
                                    ) : accounts.length === 0 ? (
                                        <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
                                            {searchQuery && paymentMode === 'cash' ? (
                                                <>
                                                    No accounts found for "<strong>{searchQuery}</strong>"
                                                    <div className="mt-2">
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => {
                                                                onSelectAccount({
                                                                    id: cashInHandAccountId,
                                                                    name: searchQuery.trim(),
                                                                    isManual: true
                                                                });
                                                            }}
                                                            style={{ fontSize: '0.7rem' }}
                                                        >
                                                            <i className="bi bi-plus-circle me-1"></i>
                                                            Use "{searchQuery}" as new account
                                                        </button>
                                                        <span className="ms-2 text-muted" style={{ fontSize: '0.65rem' }}>
                                                            or press <kbd>Enter</kbd>
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                searchQuery ? 'No accounts match your search' : 'No accounts available'
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {accounts.map((account, index) => {
                                                const isFocused = index === currentFocus;
                                                const isSelected = selectedAccountId === account.id;
                                                const displayName = formatAccountDisplay(account);
                                                const address = getAccountAddress(account);
                                                const pan = getAccountPan(account);
                                                const { balance, balanceType } = getAccountBalanceInfo(account);
                                                const balanceColor = getBalanceColor(balanceType);

                                                return (
                                                    <div
                                                        key={account.id || index}
                                                        ref={el => {
                                                            if (el) {
                                                                rowRefs.current[index] = el;
                                                            }
                                                        }}
                                                        className={`account-item ${isFocused ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            onSelectAccount(account);
                                                            setTimeout(() => {
                                                                if (searchInputRef.current) {
                                                                    searchInputRef.current.focus();
                                                                }
                                                            }, 0);
                                                        }}
                                                        onMouseEnter={() => setCurrentFocus(index)}
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: '2fr 1.8fr 1.2fr 1.2fr',
                                                            alignItems: 'center',
                                                            padding: '6px 8px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem',
                                                            borderBottom: '1px solid #f0f0f0',
                                                            margin: 0,
                                                            gap: 0,
                                                            userSelect: 'none',
                                                            WebkitUserSelect: 'none',
                                                            MozUserSelect: 'none',
                                                            msUserSelect: 'none',
                                                            backgroundColor: isSelected ? '#d4edda' : (isFocused ? '#cce5ff' : 'transparent'),
                                                            transition: 'background-color 0.15s ease',
                                                            borderLeft: isSelected ? '3px solid #28a745' : (isFocused ? '3px solid #0d6efd' : '3px solid transparent'),
                                                            paddingLeft: isSelected || isFocused ? '5px' : '8px'
                                                        }}
                                                        tabIndex={0}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                onSelectAccount(account);
                                                            }
                                                        }}
                                                        title={displayName}
                                                    >
                                                        <div
                                                            style={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                fontWeight: isSelected ? '600' : 'normal'
                                                            }}
                                                            title={displayName}
                                                        >
                                                            {compressText(displayName, 30)}
                                                        </div>
                                                        <div
                                                            style={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                color: address ? '#333' : '#999'
                                                            }}
                                                            title={address || 'No address'}
                                                        >
                                                            {address ? compressText(address, 25) : '—'}
                                                        </div>
                                                        <div
                                                            style={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                fontFamily: 'monospace',
                                                                color: pan ? '#333' : '#999'
                                                            }}
                                                            title={pan || 'No PAN'}
                                                        >
                                                            {pan ? compressText(pan, 15) : '—'}
                                                        </div>
                                                        <div style={{
                                                            textAlign: 'right',
                                                            fontFamily: 'monospace',
                                                            fontWeight: balance !== null ? '600' : 'normal',
                                                            color: balanceColor
                                                        }}>
                                                            {balance !== null && balance !== undefined
                                                                ? `${balance.toFixed(2)} ${balanceType || ''}`
                                                                : '—'}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Cash mode - "Use as new" option at bottom */}
                                            {paymentMode === 'cash' && searchQuery.trim() && accounts.length > 0 && (
                                                <div
                                                    style={{
                                                        padding: '8px 12px',
                                                        borderTop: '1px dashed #dee2e6',
                                                        backgroundColor: '#f8f9fa',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => {
                                                        onSelectAccount({
                                                            id: cashInHandAccountId,
                                                            name: searchQuery.trim(),
                                                            isManual: true
                                                        });
                                                    }}
                                                    onMouseEnter={() => setCurrentFocus(-1)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            onSelectAccount({
                                                                id: cashInHandAccountId,
                                                                name: searchQuery.trim(),
                                                                isManual: true
                                                            });
                                                        }
                                                    }}
                                                    tabIndex={0}
                                                >
                                                    <span style={{ fontSize: '0.75rem', color: '#0d6efd' }}>
                                                        <i className="bi bi-plus-circle me-1"></i>
                                                        Use "<strong>{searchQuery.trim()}</strong>" as new account
                                                    </span>
                                                    <span className="text-muted" style={{ fontSize: '0.6rem' }}>
                                                        Press <kbd>Enter</kbd>
                                                    </span>
                                                </div>
                                            )}

                                            {/* Loading indicator */}
                                            {(isLoadingMore || isSearching) && hasMore && (
                                                <div style={{
                                                    height: '32px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.7rem',
                                                    color: '#666',
                                                    borderTop: '1px solid #f0f0f0',
                                                    backgroundColor: '#fafafa'
                                                }}>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    Loading more accounts...
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer py-1" style={{
                        fontSize: '0.75rem',
                        position: 'relative',
                        flexShrink: 0,
                        padding: '8px 16px',
                        borderTop: '1px solid #dee2e6',
                        backgroundColor: '#f8f9fa'
                    }}>
                        <div className="d-flex justify-content-between w-100">
                            <div>
                                Showing {accounts.length} of {totalAccounts} accounts
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.65rem' }}>
                                <kbd>↑↓</kbd> navigate · <kbd>Enter</kbd> select · <kbd>F6</kbd> new account · <kbd>Ctrl+Scroll</kbd> zoom
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style jsx global>{`
                .modal.fade {
                    transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
                }
                
                .modal.fade:not(.show) {
                    opacity: 0;
                    transform: scale(0.8);
                }
                
                .modal.fade.show {
                    opacity: 1;
                    transform: scale(1);
                }
                
                .modal-backdrop.fade {
                    transition: opacity 0.15s linear;
                }
                
                .modal-backdrop.fade:not(.show) {
                    opacity: 0;
                }
                
                .modal-backdrop.fade.show {
                    opacity: 1;
                }

                .account-item:hover {
                    background-color: #f8f9fa !important;
                }

                .account-item.active {
                    background-color: #cce5ff !important;
                    border-left: 3px solid #0d6efd !important;
                }

                .account-item.selected {
                    background-color: #d4edda !important;
                    border-left: 3px solid #28a745 !important;
                }

                .account-item.selected.active {
                    background-color: #d4edda !important;
                    border-left: 3px solid #28a745 !important;
                }
                
                @keyframes fadeInOut {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                    20% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    80% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                }
            `}</style>
        </>
    );
};

export default AccountModalForSales;