// VirtualizedProductList.js
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
      <div>{product.uniqueNumber || 'N/A'}</div>
      <div>{product.hscode || 'N/A'}</div>
      <div className="dropdown-items-name">{product.name}</div>
      <div>{displayCategory}</div>
      <div>{product.currentStock || 0}</div>
      <div>{displayUnit}</div>
      <div>Rs.{formatter.format(product.latestPrice || 0)}</div>
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

// import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
// import { calculateExpiryStatus } from './retailer/dashboard/modals/ExpiryStatus';

// const ProductRow = memo(({ product, index, style, onProductClick, searchRef }) => {
//   const handleClick = () => onProductClick(product);

//   const handleKeyDown = (e) => {
//     if (e.key === 'Enter') {
//       e.preventDefault();
//       onProductClick(product);
//     } else if (e.key === 'ArrowDown') {
//       e.preventDefault();
//       const nextItem = e.target.nextElementSibling;
//       if (nextItem) {
//         e.target.classList.remove('active');
//         nextItem.classList.add('active');
//         nextItem.focus();
//       }
//     } else if (e.key === 'ArrowUp') {
//       e.preventDefault();
//       const prevItem = e.target.previousElementSibling;
//       if (prevItem) {
//         e.target.classList.remove('active');
//         prevItem.classList.add('active');
//         prevItem.focus();
//       } else {
//         searchRef.current?.focus();
//       }
//     } else if (e.key === 'F2') {
//       e.preventDefault();
//       searchRef.current?.focus();
//     }
//   };

//   const handleFocus = (e) => {
//     document.querySelectorAll('.dropdown-item').forEach(item => {
//       item.classList.remove('active');
//     });
//     e.target.classList.add('active');
//   };

//   const formatter = new Intl.NumberFormat('en-NP', {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   });

//   // Calculate expiry status from stock entries
//   const calculateProductExpiryStatus = () => {
//     if (!product.stockEntries || !Array.isArray(product.stockEntries) || product.stockEntries.length === 0) {
//       return 'none';
//     }
    
//     try {
//       // Get the latest stock entry for expiry status
//       const latestEntry = product.stockEntries.sort((a, b) => 
//         new Date(b.date || b.Date) - new Date(a.date || a.Date)
//       )[0];
      
//       if (!latestEntry || !latestEntry.expiryDate) {
//         return 'none';
//       }
      
//       const expiryDate = new Date(latestEntry.expiryDate);
//       const today = new Date();
//       const diffTime = expiryDate - today;
//       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
//       if (diffDays < 0) return 'expired';
//       if (diffDays <= 30) return 'critical';
//       if (diffDays <= 90) return 'warning';
//       return 'safe';
//     } catch (error) {
//       console.error('Error calculating expiry status:', error);
//       return 'none';
//     }
//   };

//   const expiryStatus = calculateProductExpiryStatus();

//   // Calculate latest price from stock entries or use Price field
//   const latestPrice = useMemo(() => {
//     if (product.stockEntries && Array.isArray(product.stockEntries) && product.stockEntries.length > 0) {
//       const sortedEntries = [...product.stockEntries].sort((a, b) => 
//         new Date(b.date || b.Date) - new Date(a.date || a.Date)
//       );
//       return sortedEntries[0]?.price || sortedEntries[0]?.Price || product.Price || 0;
//     }
//     return product.Price || product.price || 0;
//   }, [product]);

//   // Build CSS class string
//   const rowClasses = [
//     'dropdown-item',
//     product.vatStatus === 'vatable' ? 'vatable' : 'vatExempt',
//     `expiry-${expiryStatus}`
//   ].filter(Boolean).join(' ');

//   // Get display values with fallbacks for ASP.NET response
//   const displayUniqueNumber = product.uniqueNumber || 'N/A';
//   const displayHscode = product.Hscode || product.hscode || 'N/A';
//   const displayName = product.Name || product.name || '';
//   const displayCategory = product.categoryName || product.category?.name || 'No Category';
//   const displayStock = product.currentStock || product.CurrentStock || 0;
//   const displayUnit = product.unitName || product.unit?.name || '';
//   const displayPrice = latestPrice;

//   return (
//     <div
//       data-index={index}
//       className={rowClasses}
//       style={{
//         ...style,
//         display: 'grid',
//         gridTemplateColumns: 'repeat(7, 1fr)',
//         alignItems: 'center',
//         padding: '0 8px',
//         borderBottom: '1px solid #eee',
//         cursor: 'pointer',
//         fontSize: '12px',
//         backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
//       }}
//       onClick={handleClick}
//       tabIndex={0}
//       onKeyDown={handleKeyDown}
//       onFocus={handleFocus}
//       title={`${displayName} (Code: ${displayUniqueNumber}, HSN: ${displayHscode})`}
//     >
//       <div>{displayUniqueNumber}</div>
//       <div>{displayHscode}</div>
//       <div className="dropdown-items-name" style={{
//         whiteSpace: 'nowrap',
//         overflow: 'hidden',
//         textOverflow: 'ellipsis'
//       }}>
//         {displayName}
//       </div>
//       <div style={{
//         whiteSpace: 'nowrap',
//         overflow: 'hidden',
//         textOverflow: 'ellipsis'
//       }}>
//         {displayCategory}
//       </div>
//       <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
//         {displayStock.toFixed(2)}
//       </div>
//       <div>{displayUnit}</div>
//       <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
//         Rs.{formatter.format(displayPrice)}
//       </div>
//     </div>
//   );
// });

// const VirtualizedProductList = memo(({
//   products,
//   onProductClick,
//   searchRef,
//   hasMore,
//   isSearching,
//   onLoadMore,
//   totalProducts,
//   page,
//   searchQuery = ''
// }) => {
//   const itemHeight = 28;
//   const containerRef = useRef(null);
//   const loadingRef = useRef(false);
//   const observerRef = useRef(null);

//   // Use all products (no limiting for search in ASP.NET version)
//   const displayedItems = useMemo(() => {
//     return products || [];
//   }, [products]);

//   // Create intersection observer for infinite scrolling
//   useEffect(() => {
//     if (!hasMore) return;

//     const options = {
//       root: containerRef.current,
//       rootMargin: '100px',
//       threshold: 0.1,
//     };

//     const handleIntersection = (entries) => {
//       const [entry] = entries;
//       if (entry.isIntersecting && hasMore && !loadingRef.current && !isSearching) {
//         loadingRef.current = true;
//         onLoadMore?.();
//       }
//     };

//     observerRef.current = new IntersectionObserver(handleIntersection, options);
    
//     return () => {
//       if (observerRef.current) {
//         observerRef.current.disconnect();
//       }
//     };
//   }, [hasMore, isSearching, onLoadMore]);

//   // Set up intersection observer for last item
//   useEffect(() => {
//     if (!containerRef.current || !observerRef.current || !hasMore) return;

//     const container = containerRef.current;
//     const lastItem = container.querySelector('.dropdown-item:last-child');
    
//     if (lastItem) {
//       observerRef.current.observe(lastItem);
//     }

//     return () => {
//       if (observerRef.current && lastItem) {
//         observerRef.current.unobserve(lastItem);
//       }
//     };
//   }, [displayedItems, hasMore]);

//   // Reset loading state when products change
//   useEffect(() => {
//     loadingRef.current = false;
//   }, [displayedItems]);

//   // Scroll to top when search query changes
//   useEffect(() => {
//     if (containerRef.current) {
//       containerRef.current.scrollTop = 0;
//     }
//   }, [searchQuery]);

//   // Handle scroll for loading more (fallback)
//   const handleScroll = useCallback(() => {
//     if (!containerRef.current || loadingRef.current || !hasMore || isSearching) return;

//     const container = containerRef.current;
//     const { scrollTop, scrollHeight, clientHeight } = container;
    
//     // Load more when 80% scrolled
//     if (scrollTop + clientHeight >= scrollHeight * 0.8) {
//       loadingRef.current = true;
//       onLoadMore?.();
//     }
//   }, [hasMore, isSearching, onLoadMore]);

//   useEffect(() => {
//     const container = containerRef.current;
//     if (!container) return;

//     container.addEventListener('scroll', handleScroll);
//     return () => container.removeEventListener('scroll', handleScroll);
//   }, [handleScroll]);

//   return (
//     <div
//       ref={containerRef}
//       style={{
//         height: '400px',
//         overflow: 'auto',
//         position: 'relative',
//         scrollBehavior: 'smooth'
//       }}
//     >
//       {displayedItems.length === 0 && !isSearching ? (
//         <div style={{
//           height: '100%',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'center',
//           fontSize: '0.8rem',
//           color: '#6c757d'
//         }}>
//           No products found{searchQuery && ` for "${searchQuery}"`}
//         </div>
//       ) : (
//         <>
//           {displayedItems.map((product, index) => (
//             <ProductRow
//               key={product.id || product._id || `product-${index}`}
//               product={product}
//               index={index}
//               style={{
//                 height: `${itemHeight}px`,
//                 lineHeight: `${itemHeight}px`
//               }}
//               onProductClick={onProductClick}
//               searchRef={searchRef}
//             />
//           ))}

//           {/* Loading indicator */}
//           {isSearching && (
//             <div style={{
//               height: `${itemHeight}px`,
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               fontSize: '0.7rem',
//               color: '#666',
//               fontStyle: 'italic'
//             }}>
//               Searching products...
//             </div>
//           )}

//           {/* Load more indicator */}
//           {hasMore && !isSearching && displayedItems.length > 0 && (
//             <div 
//               style={{
//                 height: `${itemHeight}px`,
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 fontSize: '0.7rem',
//                 color: '#0d6efd',
//                 cursor: 'pointer',
//                 backgroundColor: '#f8f9fa',
//                 borderTop: '1px solid #dee2e6'
//               }}
//               onClick={() => {
//                 if (!loadingRef.current) {
//                   loadingRef.current = true;
//                   onLoadMore?.();
//                 }
//               }}
//               onKeyDown={(e) => {
//                 if (e.key === 'Enter' && !loadingRef.current) {
//                   loadingRef.current = true;
//                   onLoadMore?.();
//                 }
//               }}
//               tabIndex={0}
//               role="button"
//               aria-label="Load more products"
//             >
//               {loadingRef.current ? 'Loading...' : `Load more (Page ${page + 1})...`}
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// });

// export default VirtualizedProductList;



