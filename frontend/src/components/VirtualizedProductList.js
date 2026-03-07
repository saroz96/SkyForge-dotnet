
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

const ProductRow = memo(({ product, index, style, onProductClick, searchRef }) => {
  const [displayPrice, setDisplayPrice] = useState(product.latestPrice || 0);
  const [displayMargin, setDisplayMargin] = useState(product.latestMarginPercentage || 0);

  useEffect(() => {
    // Only fetch if stock is zero and we don't already have a price
    const fetchPriceAndMarginIfNeeded = async () => {
      const currentStock = product.currentStock || product.CurrentStock || 0;

      // If we already have a price, use it
      if (displayPrice > 0 && displayMargin > 0) {
        return;
      }

      // If stock is zero, try to get last sales price
      if (currentStock <= 0) {
        try {
          const response = await api.get(`/api/retailer/items/${product.id}/last-sales-price`);
          if (response.data.success && response.data.price > 0) {
            setDisplayPrice(response.data.price);
          }
          if (response.data.marginPercentage !== undefined) {
            setDisplayMargin(response.data.marginPercentage);
          }
        } catch (error) {
          // Silently fail - keep existing price
          console.error('Error fetching price:', error);
        }
      }
    };

    fetchPriceAndMarginIfNeeded();
  }, [product.id, product.currentStock, product.CurrentStock, displayPrice, displayMargin]);

  const handleClick = () => {
    // Pass the product with the fetched price
    onProductClick({
      ...product,
      latestPrice: displayPrice,
      latestMarginPercentage: displayMargin
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

  // VAT rate constant (13% for Nepal)
  const VAT_RATE = 0.13;

  // Calculate price with VAT based on vatStatus
  const basePrice = displayPrice;

  // Determine if product is vatable
  const isVatable = product.vatStatus === 'vatable';

  // Calculate price with VAT (only for vatable items)
  const priceWithVAT = isVatable
    ? basePrice * (1 + VAT_RATE)
    : basePrice;

  // Calculate expiry status
  const expiryStatus = calculateExpiryStatus(product);

  // Build CSS class string
  const rowClasses = [
    'dropdown-item',
    product.vatStatus === 'vatable' ? 'vatable' : 'vatExempt',
    `expiry-${expiryStatus}`
  ].filter(Boolean).join(' ');

  const displayCategory = product.categoryName || product.category?.name || 'No Category';
  const displayStock = product.currentStock || product.CurrentStock || 0;
  const displayUnit = product.unitName || product.unit?.name || '';

  return (
    <div
      data-index={index}
      className={rowClasses}
      style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: 'repeat(9, 1fr)',
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
      <div>{product.uniqueNumber || ''}</div>
      <div>{product.hscode || ''}</div>
      <div className="dropdown-items-name">{product.name}</div>
      <div>{displayCategory}</div>
      <div>Rs.{formatter.format(displayPrice)}</div>
      <div>Rs. {formatter.format(priceWithVAT)}</div>
      <div>{displayStock}</div>
      <div>{displayUnit}</div>
      <div>{displayMargin}</div>
    </div>
  );
});

const VirtualizedProductList = memo(({
  products,
  onProductClick,
  searchRef,
  hasMore,
  isSearching,
  onLoadMore,
  totalProducts,
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
      return products;
    }
    // When searching, show only first 15 items
    return products.slice(0, 15);
  }, [products, searchQuery]);

  // Update visible items based on display limit
  useEffect(() => {
    if (!searchQuery.trim()) {
      // When not searching, show all items
      setVisibleItems(products);
    } else {
      // When searching, limit to 15
      setVisibleItems(products.slice(0, 15));
    }
  }, [products, searchQuery]);

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
        height: '400px',
        overflow: 'auto',
        position: 'relative'
      }}
    >
      <div style={{ position: 'relative' }}>
        {visibleItems.map((product, index) => (
          <ProductRow
            key={product._id || product.id || index}
            product={product}
            index={index}
            style={{
              height: `${itemHeight}px`,
              lineHeight: `${itemHeight}px`
            }}
            onProductClick={onProductClick}
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

export default VirtualizedProductList;