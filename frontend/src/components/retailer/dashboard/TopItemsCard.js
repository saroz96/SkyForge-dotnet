// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import axios from 'axios';
// import './TopItemsCard.css';

// const TopItemsCard = ({ 
//   companyId,
//   companyName,
//   fiscalYearJson,
//   isLoading: externalLoading = false,
//   onRefresh: externalRefresh = null
// }) => {
//   const [activeTab, setActiveTab] = useState('transaction');
//   const [items, setItems] = useState([]);
//   const [sortBy, setSortBy] = useState('rank');
//   const [filterText, setFilterText] = useState('');
  
//   // ✅ Internal state for data
//   const [topItemsByTransaction, setTopItemsByTransaction] = useState([]);
//   const [topItemsByRevenue, setTopItemsByRevenue] = useState([]);
//   const [topItemsByFrequency, setTopItemsByFrequency] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(null);
  
//   const abortControllerRef = useRef(null);
//   const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142';
//   const hasFetchedRef = useRef(false);

//   // ✅ Fetch top items data independently
//   const fetchTopItems = useCallback(async () => {
//     // ✅ Don't fetch if no companyId
//     if (!companyId) {
//       console.log('⏳ TopItemsCard: No companyId, skipping fetch');
//       return;
//     }

//     // ✅ Prevent duplicate concurrent fetches
//     if (isLoading) {
//       console.log('⏳ TopItemsCard: Already fetching, skipping');
//       return;
//     }

//     if (abortControllerRef.current) {
//       abortControllerRef.current.abort();
//     }

//     abortControllerRef.current = new AbortController();
//     setIsLoading(true);
//     setError(null);

//     try {
//       const params = new URLSearchParams();
//       params.append('companyId', companyId);
//       if (companyName) params.append('companyName', companyName);
//       if (fiscalYearJson) params.append('fiscalYearJson', fiscalYearJson);

//       const url = `${API_BASE_URL}/api/retailer/retailerDashboard/indexv1?${params.toString()}`;

//       console.log('📊 TopItemsCard: Fetching data for company:', companyId);

//       const response = await axios.get(url, {
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${localStorage.getItem('token')}`
//         },
//         withCredentials: true,
//         signal: abortControllerRef.current.signal
//       });

//       if (response.data.success) {
//         const dashboardData = response.data.data;
        
//         setTopItemsByTransaction(dashboardData.topItemsByTransaction || []);
//         setTopItemsByRevenue(dashboardData.topItemsByRevenue || []);
//         setTopItemsByFrequency(dashboardData.topItemsByFrequency || []);
//         hasFetchedRef.current = true;
        
//         console.log('✅ TopItemsCard: Data fetched successfully');
//       } else {
//         throw new Error(response.data.error || 'Failed to load top items');
//       }
//     } catch (error) {
//       if (error.name === 'AbortError') {
//         console.log('⛔ TopItemsCard: Fetch aborted');
//         return;
//       }
//       console.error('❌ TopItemsCard: Error fetching data:', error);
//       setError(error.response?.data?.error || error.message);
//       hasFetchedRef.current = false;
//     } finally {
//       setIsLoading(false);
//     }
//   }, [companyId, companyName, fiscalYearJson, API_BASE_URL, isLoading]);

//   // ✅ Auto-fetch when companyId becomes available
//   useEffect(() => {
//     // ✅ Reset fetch flag when companyId changes
//     if (companyId) {
//       console.log('🔄 TopItemsCard: companyId changed or available:', companyId);
//       // Only fetch if we haven't fetched or if companyId changed
//       if (!hasFetchedRef.current) {
//         console.log('🔄 TopItemsCard: Triggering initial fetch');
//         fetchTopItems();
//       }
//     } else {
//       // Reset when companyId is removed
//       hasFetchedRef.current = false;
//     }
//   }, [companyId, fetchTopItems]); // ✅ Add fetchTopItems as dependency

//   // ✅ Handle refresh - either internal or external
//   const handleRefresh = useCallback(() => {
//     console.log('🔄 TopItemsCard: Manual refresh triggered');
//     if (externalRefresh) {
//       externalRefresh();
//     } else if (companyId) {
//       hasFetchedRef.current = false;
//       fetchTopItems();
//     }
//   }, [externalRefresh, fetchTopItems, companyId]);

//   // ✅ Update items when tab changes or data updates
//   useEffect(() => {
//     let data = [];
//     switch (activeTab) {
//       case 'transaction':
//         data = [...topItemsByTransaction];
//         break;
//       case 'revenue':
//         data = [...topItemsByRevenue];
//         break;
//       case 'frequency':
//         data = [...topItemsByFrequency];
//         break;
//       default:
//         data = [...topItemsByTransaction];
//     }
//     setItems(data);
//   }, [activeTab, topItemsByTransaction, topItemsByRevenue, topItemsByFrequency]);

//   // ✅ Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       if (abortControllerRef.current) {
//         abortControllerRef.current.abort();
//       }
//     };
//   }, []);

//   const getRankBadge = (index) => {
//     switch (index) {
//       case 0: return { label: '🥇', color: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)' };
//       case 1: return { label: '🥈', color: '#C0C0C0', bg: 'rgba(192, 192, 192, 0.15)' };
//       case 2: return { label: '🥉', color: '#CD7F32', bg: 'rgba(205, 127, 50, 0.15)' };
//       default: return { label: `#${index + 1}`, color: '#6b7280', bg: 'transparent' };
//     }
//   };

//   const getTabIcon = (tab) => {
//     switch (tab) {
//       case 'transaction': return '📦';
//       case 'revenue': return '💰';
//       case 'frequency': return '🔥';
//       default: return '📦';
//     }
//   };

//   const getTabLabel = (tab) => {
//     switch (tab) {
//       case 'transaction': return 'Top Selling';
//       case 'revenue': return 'Top Revenue';
//       case 'frequency': return 'Most Frequent';
//       default: return 'Top Selling';
//     }
//   };

//   const getTabDescription = (tab) => {
//     switch (tab) {
//       case 'transaction': return 'Highest quantity sold';
//       case 'revenue': return 'Highest revenue generated';
//       case 'frequency': return 'Most frequently purchased';
//       default: return 'Highest quantity sold';
//     }
//   };

//   const formatCurrency = (amount) => {
//     if (amount === undefined || amount === null || isNaN(amount)) return 'Rs.0.00';
    
//     const formatted = amount.toLocaleString('en-IN', {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2
//     });
    
//     return 'Rs.' + formatted;
//   };

//   const formatNumber = (num) => {
//     if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
//     if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
//     return num.toFixed(1);
//   };

//   const filteredItems = items.filter(item => 
//     item.itemName?.toLowerCase().includes(filterText.toLowerCase()) || false
//   );

//   const sortedItems = [...filteredItems];
//   if (sortBy === 'rank') {
//     // Keep original order
//   } else if (sortBy === 'name') {
//     sortedItems.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || ''));
//   } else if (sortBy === 'value') {
//     sortedItems.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
//   } else if (sortBy === 'quantity') {
//     sortedItems.sort((a, b) => (b.totalQuantity || 0) - (a.totalQuantity || 0));
//   }

//   const loading = externalLoading || isLoading;

//   // ✅ Show loading state if we have no data and are loading
//   if (loading && !hasFetchedRef.current && items.length === 0) {
//     return (
//       <div className="tic-card">
//         <div className="tic-loading">
//           <div className="tic-spinner">
//             <div className="tic-spinner-ring"></div>
//           </div>
//           <p className="tic-loading-text">Loading top items...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error && !hasFetchedRef.current) {
//     return (
//       <div className="tic-card">
//         <div className="tic-error">
//           <div className="tic-error-icon">⚠️</div>
//           <p className="tic-error-title">Error loading items</p>
//           <p className="tic-error-subtitle">{error}</p>
//           <button className="tic-error-retry" onClick={handleRefresh}>
//             Retry
//           </button>
//         </div>
//       </div>
//     );
//   }

//   const hasData = items.length > 0;

//   return (
//     <div className="tic-card">
//       <div className="tic-glow-line"></div>
//       <div className="tic-glow-spot"></div>

//       <div className="tic-header">
//         <div className="tic-header-left">
//           <div className="tic-icon">
//             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//               <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
//               <polyline points="17 6 23 6 23 12" />
//             </svg>
//           </div>
//           <div>
//             <h3 className="tic-title">Top Items</h3>
//             <span className="tic-subtitle">{getTabDescription(activeTab)}</span>
//           </div>
//         </div>
//         <div className="tic-header-right">
//           <span className="tic-badge">
//             <span className="tic-badge-dot"></span>
//             {items.length} items
//           </span>
//           <button className="tic-refresh" onClick={handleRefresh} disabled={loading}>
//             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'tic-spinning' : ''}>
//               <polyline points="23 4 23 10 17 10" />
//               <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
//             </svg>
//           </button>
//         </div>
//       </div>

//       <div className="tic-tabs">
//         {['transaction', 'revenue', 'frequency'].map((tab) => (
//           <button
//             key={tab}
//             className={`tic-tab ${activeTab === tab ? 'active' : ''}`}
//             onClick={() => setActiveTab(tab)}
//           >
//             <span className="tic-tab-icon">{getTabIcon(tab)}</span>
//             <span className="tic-tab-label">{getTabLabel(tab)}</span>
//           </button>
//         ))}
//       </div>

//       <div className="tic-filters">
//         <div className="tic-search">
//           <svg className="tic-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <circle cx="11" cy="11" r="8" />
//             <line x1="21" y1="21" x2="16.65" y2="16.65" />
//           </svg>
//           <input
//             type="text"
//             placeholder="Search items..."
//             value={filterText}
//             onChange={(e) => setFilterText(e.target.value)}
//             className="tic-search-input"
//           />
//           {filterText && (
//             <button className="tic-search-clear" onClick={() => setFilterText('')}>
//               ✕
//             </button>
//           )}
//         </div>
//         <select 
//           value={sortBy} 
//           onChange={(e) => setSortBy(e.target.value)}
//           className="tic-sort"
//         >
//           <option value="rank">Rank</option>
//           <option value="name">Name</option>
//           <option value="value">Value</option>
//           <option value="quantity">Quantity</option>
//         </select>
//       </div>

//       <div className="tic-list">
//         {!hasData ? (
//           <div className="tic-empty">
//             <div className="tic-empty-icon">📦</div>
//             <p className="tic-empty-title">No items data</p>
//             <p className="tic-empty-subtitle">Start selling to see your top items here</p>
//           </div>
//         ) : (
//           filteredItems.length === 0 ? (
//             <div className="tic-empty">
//               <div className="tic-empty-icon">🔍</div>
//               <p className="tic-empty-title">No matches found</p>
//               <p className="tic-empty-subtitle">Try adjusting your search</p>
//             </div>
//           ) : (
//             filteredItems.map((item, index) => {
//               const rank = getRankBadge(index);
//               const isTop3 = index < 3;
//               return (
//                 <div key={item.itemId || index} className={`tic-item ${isTop3 ? 'top' : ''}`}>
//                   <div className="tic-item-rank" style={{ background: rank.bg }}>
//                     <span className="tic-item-rank-label" style={{ color: rank.color }}>
//                       {rank.label}
//                     </span>
//                   </div>
//                   <div className="tic-item-info">
//                     <div className="tic-item-name">{item.itemName || 'Unknown Item'}</div>
//                     <div className="tic-item-meta">
//                       <span className="tic-item-unit">{item.unitName || 'Unit'}</span>
//                       <span className="tic-item-dot">•</span>
//                       <span className="tic-item-count">
//                         {item.transactionCount || 0} {item.transactionCount === 1 ? 'sale' : 'sales'}
//                       </span>
//                     </div>
//                   </div>
//                   <div className="tic-item-stats">
//                     <div className="tic-stat">
//                       <span className="tic-stat-label">Qty</span>
//                       <span className="tic-stat-value">{formatNumber(item.totalQuantity || 0)}</span>
//                     </div>
//                     <div className="tic-stat">
//                       <span className="tic-stat-label">Revenue</span>
//                       <span className="tic-stat-value highlight">{formatCurrency(item.totalAmount || 0)}</span>
//                     </div>
//                     <div className="tic-stat">
//                       <span className="tic-stat-label">Price</span>
//                       <span className="tic-stat-value">{formatCurrency(item.latestPrice || 0)}</span>
//                     </div>
//                   </div>
//                   {isTop3 && (
//                     <div className={`tic-item-badge ${index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'}`}>
//                       {index === 0 ? '🏆' : index === 1 ? '⭐' : '🌟'}
//                     </div>
//                   )}
//                 </div>
//               );
//             })
//           )
//         )}
//       </div>

//       {hasData && filteredItems.length > 0 && (
//         <div className="tic-footer">
//           <span className="tic-footer-text">
//             Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong> items
//           </span>
//           <span className="tic-footer-hint">
//             {activeTab === 'transaction' && '📊 Sorted by quantity sold'}
//             {activeTab === 'revenue' && '💰 Sorted by revenue'}
//             {activeTab === 'frequency' && '🔥 Sorted by frequency'}
//           </span>
//         </div>
//       )}
//     </div>
//   );
// };

// export default TopItemsCard;

//----------------------------------------------end1

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './TopItemsCard.css';

const TopItemsCard = ({ 
  companyId,
  companyName,
  fiscalYearJson,
  isLoading: externalLoading = false,
  onRefresh: externalRefresh = null
}) => {
  const [activeTab, setActiveTab] = useState('transaction');
  const [items, setItems] = useState([]);
  const [sortBy, setSortBy] = useState('rank');
  const [filterText, setFilterText] = useState('');
  
  // ✅ Internal state for data
  const [topItemsByTransaction, setTopItemsByTransaction] = useState([]);
  const [topItemsByRevenue, setTopItemsByRevenue] = useState([]);
  const [topItemsByFrequency, setTopItemsByFrequency] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const abortControllerRef = useRef(null);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142';
  const hasFetchedRef = useRef(false);

  // ✅ Fetch top items data independently
  const fetchTopItems = useCallback(async () => {
    // ✅ Don't fetch if no companyId
    if (!companyId) {
      console.log('⏳ TopItemsCard: No companyId, skipping fetch');
      return;
    }

    // ✅ Prevent duplicate concurrent fetches
    if (isLoading) {
      console.log('⏳ TopItemsCard: Already fetching, skipping');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('companyId', companyId);
      if (companyName) params.append('companyName', companyName);
      if (fiscalYearJson) params.append('fiscalYearJson', fiscalYearJson);

      const url = `${API_BASE_URL}/api/retailer/retailerDashboard/indexv1?${params.toString()}`;

      console.log('📊 TopItemsCard: Fetching data for company:', companyId);

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        withCredentials: true,
        signal: abortControllerRef.current.signal
      });

      if (response.data.success) {
        const dashboardData = response.data.data;
        
        setTopItemsByTransaction(dashboardData.topItemsByTransaction || []);
        setTopItemsByRevenue(dashboardData.topItemsByRevenue || []);
        setTopItemsByFrequency(dashboardData.topItemsByFrequency || []);
        hasFetchedRef.current = true;
        
        console.log('✅ TopItemsCard: Data fetched successfully');
      } else {
        throw new Error(response.data.error || 'Failed to load top items');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('⛔ TopItemsCard: Fetch aborted');
        return;
      }
      console.error('❌ TopItemsCard: Error fetching data:', error);
      setError(error.response?.data?.error || error.message);
      hasFetchedRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, companyName, fiscalYearJson, API_BASE_URL, isLoading]);

  // ✅ Auto-fetch when companyId becomes available
  useEffect(() => {
    // ✅ Reset fetch flag when companyId changes
    if (companyId) {
      console.log('🔄 TopItemsCard: companyId changed or available:', companyId);
      // Only fetch if we haven't fetched or if companyId changed
      if (!hasFetchedRef.current) {
        console.log('🔄 TopItemsCard: Triggering initial fetch');
        fetchTopItems();
      }
    } else {
      // Reset when companyId is removed
      hasFetchedRef.current = false;
    }
  }, [companyId, fetchTopItems]); // ✅ Add fetchTopItems as dependency

  // ✅ Handle refresh - either internal or external
  const handleRefresh = useCallback(() => {
    console.log('🔄 TopItemsCard: Manual refresh triggered');
    if (externalRefresh) {
      externalRefresh();
    } else if (companyId) {
      hasFetchedRef.current = false;
      fetchTopItems();
    }
  }, [externalRefresh, fetchTopItems, companyId]);

  // ✅ Update items when tab changes or data updates
  useEffect(() => {
    let data = [];
    switch (activeTab) {
      case 'transaction':
        data = [...topItemsByTransaction];
        break;
      case 'revenue':
        data = [...topItemsByRevenue];
        break;
      case 'frequency':
        data = [...topItemsByFrequency];
        break;
      default:
        data = [...topItemsByTransaction];
    }
    setItems(data);
  }, [activeTab, topItemsByTransaction, topItemsByRevenue, topItemsByFrequency]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const getRankBadge = (index) => {
    switch (index) {
      case 0: return { label: '🥇', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      case 1: return { label: '🥈', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.15)' };
      case 2: return { label: '🥉', color: '#CD7F32', bg: 'rgba(205, 127, 50, 0.15)' };
      default: return { label: `#${index + 1}`, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.08)' };
    }
  };

  const getTabIcon = (tab) => {
    switch (tab) {
      case 'transaction': return '📦';
      case 'revenue': return '💰';
      case 'frequency': return '🔥';
      default: return '📦';
    }
  };

  const getTabLabel = (tab) => {
    switch (tab) {
      case 'transaction': return 'Top Selling';
      case 'revenue': return 'Top Revenue';
      case 'frequency': return 'Most Frequent';
      default: return 'Top Selling';
    }
  };

  const getTabDescription = (tab) => {
    switch (tab) {
      case 'transaction': return 'Highest quantity sold';
      case 'revenue': return 'Highest revenue generated';
      case 'frequency': return 'Most frequently purchased';
      default: return 'Highest quantity sold';
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return 'Rs.0.00';
    
    const formatted = amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return 'Rs.' + formatted;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(1);
  };

  const filteredItems = items.filter(item => 
    item.itemName?.toLowerCase().includes(filterText.toLowerCase()) || false
  );

  const sortedItems = [...filteredItems];
  if (sortBy === 'rank') {
    // Keep original order
  } else if (sortBy === 'name') {
    sortedItems.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || ''));
  } else if (sortBy === 'value') {
    sortedItems.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
  } else if (sortBy === 'quantity') {
    sortedItems.sort((a, b) => (b.totalQuantity || 0) - (a.totalQuantity || 0));
  }

  const loading = externalLoading || isLoading;

  // ✅ Show loading state if we have no data and are loading
  if (loading && !hasFetchedRef.current && items.length === 0) {
    return (
      <div className="tic-card">
        <div className="tic-loading">
          <div className="tic-spinner">
            <div className="tic-spinner-ring"></div>
          </div>
          <p className="tic-loading-text">Loading top items...</p>
        </div>
      </div>
    );
  }

  if (error && !hasFetchedRef.current) {
    return (
      <div className="tic-card">
        <div className="tic-error">
          <div className="tic-error-icon">⚠️</div>
          <p className="tic-error-title">Error loading items</p>
          <p className="tic-error-subtitle">{error}</p>
          <button className="tic-error-retry" onClick={handleRefresh}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasData = items.length > 0;

  return (
    <div className="tic-card">
      <div className="tic-glow-line"></div>
      <div className="tic-glow-spot"></div>

      <div className="tic-header">
        <div className="tic-header-left">
          <div className="tic-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div>
            <h3 className="tic-title">Top Items</h3>
            <span className="tic-subtitle">{getTabDescription(activeTab)}</span>
          </div>
        </div>
        <div className="tic-header-right">
          <span className="tic-badge">
            <span className="tic-badge-dot"></span>
            {items.length}
          </span>
          <button className="tic-refresh" onClick={handleRefresh} disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'tic-spinning' : ''}>
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>

      <div className="tic-tabs">
        {['transaction', 'revenue', 'frequency'].map((tab) => (
          <button
            key={tab}
            className={`tic-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="tic-tab-icon">{getTabIcon(tab)}</span>
            <span className="tic-tab-label">{getTabLabel(tab)}</span>
          </button>
        ))}
      </div>

      <div className="tic-filters">
        <div className="tic-search">
          <svg className="tic-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search items..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="tic-search-input"
          />
          {filterText && (
            <button className="tic-search-clear" onClick={() => setFilterText('')}>
              ✕
            </button>
          )}
        </div>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          className="tic-sort"
        >
          <option value="rank">Rank</option>
          <option value="name">Name</option>
          <option value="value">Value</option>
          <option value="quantity">Quantity</option>
        </select>
      </div>

      <div className="tic-list">
        {!hasData ? (
          <div className="tic-empty">
            <div className="tic-empty-icon">📦</div>
            <p className="tic-empty-title">No items data</p>
            <p className="tic-empty-subtitle">Start selling to see your top items</p>
          </div>
        ) : (
          filteredItems.length === 0 ? (
            <div className="tic-empty">
              <div className="tic-empty-icon">🔍</div>
              <p className="tic-empty-title">No matches found</p>
              <p className="tic-empty-subtitle">Try adjusting your search</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const rank = getRankBadge(index);
              const isTop3 = index < 3;
              return (
                <div key={item.itemId || index} className={`tic-item ${isTop3 ? 'top' : ''}`}>
                  <div className="tic-item-rank" style={{ background: rank.bg }}>
                    <span className="tic-item-rank-label" style={{ color: rank.color }}>
                      {rank.label}
                    </span>
                  </div>
                  <div className="tic-item-info">
                    <div className="tic-item-name">{item.itemName || 'Unknown Item'}</div>
                    <div className="tic-item-meta">
                      <span className="tic-item-unit">{item.unitName || 'Unit'}</span>
                      <span className="tic-item-dot">•</span>
                      <span className="tic-item-count">
                        {item.transactionCount || 0} {item.transactionCount === 1 ? 'sale' : 'sales'}
                      </span>
                    </div>
                  </div>
                  <div className="tic-item-stats">
                    <div className="tic-stat">
                      <span className="tic-stat-label">Qty</span>
                      <span className="tic-stat-value">{formatNumber(item.totalQuantity || 0)}</span>
                    </div>
                    <div className="tic-stat">
                      <span className="tic-stat-label">Revenue</span>
                      <span className="tic-stat-value highlight">{formatCurrency(item.totalAmount || 0)}</span>
                    </div>
                    <div className="tic-stat">
                      <span className="tic-stat-label">Price</span>
                      <span className="tic-stat-value">{formatCurrency(item.latestPrice || 0)}</span>
                    </div>
                  </div>
                  {isTop3 && (
                    <div className={`tic-item-badge ${index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'}`}>
                      {index === 0 ? '🏆' : index === 1 ? '⭐' : '🌟'}
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>

      {hasData && filteredItems.length > 0 && (
        <div className="tic-footer">
          <span className="tic-footer-text">
            Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong>
          </span>
          <span className="tic-footer-hint">
            {activeTab === 'transaction' && 'Quantity sold'}
            {activeTab === 'revenue' && 'Revenue generated'}
            {activeTab === 'frequency' && 'Purchase frequency'}
          </span>
        </div>
      )}
    </div>
  );
};

export default TopItemsCard;