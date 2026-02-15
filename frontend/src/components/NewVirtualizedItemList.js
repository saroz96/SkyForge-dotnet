import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { calculateExpiryStatus } from './retailer/dashboard/modals/ExpiryStatus';

const ItemRow = memo(({ item, index, style, onItemClick, searchRef }) => {
  const handleClick = () => onItemClick(item);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onItemClick(item);
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
      <div>{item.category?.name || 'No Category'}</div>
      <div>{item.stock || 0}</div>
      <div>{item.unit?.name || ''}</div>
      {/* <div>Rs.{item.latestPrice || 0}</div> */}
      <div>Rs.{formatter.format(item.latestPrice || 0)}</div>
    </div>
  );
});

const NewVirtualizedItemList = memo(({
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
  // const displayedItems = useMemo(() => {
  //   if (!searchQuery.trim()) {
  //     // When not searching, show all items
  //     return items;
  //   }
  //   // When searching, show only first 15 items
  //   return items.slice(0, 15);
  // }, [items, searchQuery]);

  const displayedItems = useMemo(() => {
    return items; // Always show all items
  }, [items]);


  // Update visible items based on display limit
  // useEffect(() => {
  //   if (!searchQuery.trim()) {
  //     // When not searching, show all items
  //     setVisibleItems(items);
  //   } else {
  //     // When searching, limit to 15
  //     setVisibleItems(items.slice(0, 15));
  //   }
  // }, [items, searchQuery]);

  useEffect(() => {
    setVisibleItems(items); // Always show all items
  }, [items]);


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
        {visibleItems.map((item, index) => (
          <ItemRow
            key={item._id || index}
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
    </div>
  );
});

export default NewVirtualizedItemList;