import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { calculateExpiryStatus } from './retailer/dashboard/modals/ExpiryStatus';
import axios from 'axios';

// Create axios instance with auth interceptor
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

const ItemRow = memo(({ item, index, style, onItemClick, searchRef }) => {
    const [displayPrice, setDisplayPrice] = useState(item.latestPrice || item.price || 0);

    useEffect(() => {
        // Only fetch if stock is zero and we don't already have a price
        const fetchPriceIfNeeded = async () => {
            const currentStock = item.currentStock || item.stock || 0;

            // If we already have a price from the item, use it
            if (displayPrice > 0) {
                return;
            }

            // If stock is zero, try to get last purchase price
            if (currentStock <= 0) {
                try {
                    const response = await api.get(`/api/retailer/items/${item.id}/last-purchase-price`);
                    if (response.data.success && response.data.price > 0) {
                        setDisplayPrice(response.data.price);
                    }
                } catch (error) {
                    // Silently fail - keep existing price
                    console.error('Error fetching price:', error);
                }
            }
        };

        fetchPriceIfNeeded();
    }, [item.id, item.currentStock, item.stock, displayPrice, item.latestPrice, item.price]);

    const handleClick = () => {
        // Pass the item with the fetched price
        onItemClick({
            ...item,
            latestPrice: displayPrice
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleClick();
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
        }
    };

    const handleFocus = (e) => {
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.classList.remove('active');
        });
        e.target.classList.add('active');
    };

    const formatter = new Intl.NumberFormat('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    // Calculate expiry status
    const expiryStatus = calculateExpiryStatus(item);

    // Build CSS class string
    const rowClasses = [
        'dropdown-item',
        item.vatStatus === 'vatable' ? 'vatable' : 'vatExempt',
        `expiry-${expiryStatus}`
    ].filter(Boolean).join(' ');

    // Handle different property names for consistency
    const displayCategory = item.categoryName || item.category?.name || 'No Category';
    const displayStock = item.currentStock || item.stock || 0;
    const displayUnit = item.unitName || item.unit?.name || '';

    return (
        <div
            data-index={index}
            className={rowClasses}
            style={{
                ...style,
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                alignItems: 'center',
                padding: '0 8px',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                fontSize: '12px'
            }}
            onClick={handleClick}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
        >
            <div>{item.uniqueNumber || 'N/A'}</div>
            <div>{item.hscode || 'N/A'}</div>
            <div className="dropdown-items-name">{item.name}</div>
            <div>{displayCategory}</div>
            <div>{displayStock}</div>
            <div>{displayUnit}</div>
            <div>Rs.{formatter.format(displayPrice)}</div>
        </div>
    );
});

const VirtualizedItemListForPurchase = memo(({
    items,
    onItemClick,
    searchRef,
    hasMore,
    isSearching,
    onLoadMore,
    totalItems,
    page,
    searchQuery = ''
}) => {
    const itemHeight = 28;
    const containerRef = useRef(null);
    const loadingRef = useRef(false);
    const [visibleItems, setVisibleItems] = useState([]);

    // Filter items based on search state - limit to 15 when searching
    const displayedItems = useMemo(() => {
        if (!searchQuery.trim()) {
            // When not searching, show all items
            return items;
        }
        // When searching, show only first 15 items
        return items.slice(0, 15);
    }, [items, searchQuery]);

    // Update visible items based on display limit
    useEffect(() => {
        if (!searchQuery.trim()) {
            // When not searching, show all items
            setVisibleItems(items);
        } else {
            // When searching, limit to 15
            setVisibleItems(items.slice(0, 15));
        }
    }, [items, searchQuery]);

    // Load more items when reaching near the bottom
    const loadMoreItems = useCallback(() => {
        if (loadingRef.current || !hasMore || isSearching) return;

        loadingRef.current = true;
        onLoadMore();
        // Reset loading after a delay
        setTimeout(() => {
            loadingRef.current = false;
        }, 500);
    }, [hasMore, isSearching, onLoadMore]);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;

            const container = containerRef.current;
            const scrollTop = container.scrollTop;
            const clientHeight = container.clientHeight;
            const scrollHeight = container.scrollHeight;

            // Load more items when scrolled near bottom (90% threshold)
            if (!loadingRef.current && hasMore) {
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
    }, [hasMore, loadMoreItems]);

    return (
        <div
            ref={containerRef}
            style={{
                height: '400px', // Increased height like the ASP.NET version
                overflow: 'auto',
                position: 'relative'
            }}
        >
            <div style={{ position: 'relative' }}>
                {visibleItems.map((item, index) => (
                    <ItemRow
                        key={item._id || item.id || index}
                        item={item}
                        index={index}
                        style={{
                            height: `${itemHeight}px`,
                            lineHeight: `${itemHeight}px`
                        }}
                        onItemClick={onItemClick}
                        searchRef={searchRef}
                    />
                ))}
            </div>

            {/* Loading indicator */}
            {isSearching && (
                <div style={{
                    height: `${itemHeight}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    color: '#666'
                }}>
                    Loading...
                </div>
            )}
        </div>
    );
});

export default VirtualizedItemListForPurchase;