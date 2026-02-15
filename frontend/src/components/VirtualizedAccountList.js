import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';

const AccountRow = memo(({ account, index, style, onAccountClick, searchRef }) => {
    const handleClick = () => onAccountClick(account);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onAccountClick(account);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextItem = e.target.nextElementSibling;
            if (nextItem) {
                e.target.classList.remove('active');
                nextItem.classList.add('active');
                nextItem.focus();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevItem = e.target.previousElementSibling;
            if (prevItem) {
                e.target.classList.remove('active');
                prevItem.classList.add('active');
                prevItem.focus();
            } else {
                searchRef.current?.focus();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            // Focus will be handled by parent component
        }
    };

    const handleFocus = (e) => {
        document.querySelectorAll('.account-item').forEach(item => {
            item.classList.remove('active');
        });
        e.target.classList.add('active');
    };

    return (
        <div
            data-index={index}
            data-account-id={account._id}
            className="account-item list-group-item py-1 px-2"
            style={{
                ...style,
                cursor: 'pointer',
                fontSize: '0.75rem',
                borderBottom: '1px solid #dee2e6',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
            }}
            onClick={handleClick}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
        >
            <div className="d-flex justify-content-between align-items-center" style={{ lineHeight: '1.2' }}>
                <strong style={{ fontSize: '0.8rem' }}>
                    {account.uniqueNumber || 'N/A'} {account.name}
                </strong>
                <span style={{ fontSize: '0.7rem' }}>
                    📍 {account.address || 'N/A'} | 🆔 PAN: {account.pan || 'N/A'} | Balance: Rs. {account.balance?.toFixed(2) || '0.00'}
                </span>
            </div>
        </div>
    );
});

const VirtualizedAccountList = memo(({
    accounts,
    onAccountClick,
    searchRef,
    hasMore,
    isSearching,
    onLoadMore,
    totalAccounts,
    page,
    searchQuery = ''
}) => {
    const itemHeight = 32;
    const containerRef = useRef(null);
    const loadingRef = useRef(false);
    const [visibleAccounts, setVisibleAccounts] = useState([]);

    // Filter accounts based on search state
    const displayedAccounts = useMemo(() => {
        if (!searchQuery.trim()) {
            return accounts;
        }
        return accounts.slice(0, 15);
    }, [accounts, searchQuery]);

    // Update visible accounts based on display limit
    useEffect(() => {
        if (!searchQuery.trim()) {
            setVisibleAccounts(accounts);
        } else {
            setVisibleAccounts(accounts.slice(0, 15));
        }
    }, [accounts, searchQuery]);

    // Handle scroll for keyboard navigation from search input
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!searchRef?.current || document.activeElement !== searchRef.current) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const firstAccountItem = containerRef.current?.querySelector('.account-item');
                if (firstAccountItem) {
                    containerRef.current?.querySelectorAll('.account-item').forEach(item => {
                        item.classList.remove('active');
                    });

                    firstAccountItem.classList.add('active');
                    firstAccountItem.focus();

                    if (containerRef.current) {
                        containerRef.current.scrollTop = 0;
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [searchRef]);

    // Load more items when reaching near the bottom
    const loadMoreItems = useCallback(() => {
        if (loadingRef.current || !hasMore || isSearching) return;

        loadingRef.current = true;
        onLoadMore();
        setTimeout(() => {
            loadingRef.current = false;
        }, 500);
    }, [hasMore, isSearching, onLoadMore]);

    // Scroll handler for infinite scrolling
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current || loadingRef.current) return;

            const container = containerRef.current;
            const scrollTop = container.scrollTop;
            const clientHeight = container.clientHeight;
            const scrollHeight = container.scrollHeight;

            if (hasMore && !isSearching) {
                const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

                if (scrollPercentage > 0.9) {
                    loadMoreItems();
                }
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [hasMore, isSearching, loadMoreItems]);

    // Show no accounts found message
    if (accounts.length === 0) {
        return (
            <div style={{
                height: 'calc(320px - 40px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa'
            }}>
                <div className="text-center text-muted">
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        {searchQuery ? 'No accounts found' : 'No accounts available'}
                    </div>
                    <div className="small">
                        <small className="text-info">
                            {searchQuery ? 'Try a different search term' : 'Press F6 to create a new account'}
                        </small>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{
                height: 'calc(320px - 40px)',
                overflowY: 'auto',
                position: 'relative'
            }}
        >
            <div style={{ position: 'relative' }}>
                {visibleAccounts.map((account, index) => (
                    <AccountRow
                        key={account._id || index}
                        account={account}
                        index={index}
                        style={{
                            height: `${itemHeight}px`,
                            lineHeight: 'normal'
                        }}
                        onAccountClick={onAccountClick}
                        searchRef={searchRef}
                    />
                ))}
            </div>
        </div>
    );
});

export default VirtualizedAccountList;