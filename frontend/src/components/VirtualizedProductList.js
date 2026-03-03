import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { calculateExpiryStatus } from './retailer/dashboard/modals/ExpiryStatus';

const ProductRow = memo(({ product, index, style, onProductClick, searchRef }) => {
  const handleClick = () => onProductClick(product);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onProductClick(product);
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
  const basePrice = product.latestPrice || 0;

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
        gridTemplateColumns: 'repeat(8, 1fr)',
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
      <div>{product.uniqueNumber || 'N/A'}</div>
      <div>{product.hscode || 'N/A'}</div>
      <div className="dropdown-items-name">{product.name}</div>
      <div>{displayCategory}</div>
      <div>Rs.{formatter.format(product.latestPrice || 0)}</div>
      <div>
        Rs. {formatter.format(priceWithVAT)}
        {isVatable && (
          <span style={{ fontSize: '8px', marginLeft: '4px', color: '#28a745' }}>
            (+13%)
          </span>
        )}
        {!isVatable && (
          <span style={{ fontSize: '8px', marginLeft: '4px', color: '#6c757d' }}>
            (Exempt)
          </span>
        )}
      </div>
      <div>{product.currentStock || 0}</div>
      <div>{displayUnit}</div>
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
            key={product._id || index}
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