// import React, { useState, useEffect } from 'react';
// import './TopItemsCard.css';

// const TopItemsCard = ({ 
//   topItemsByTransaction = [], 
//   topItemsByRevenue = [], 
//   topItemsByFrequency = [],
//   isLoading = false,
//   onRefresh = null
// }) => {
//   const [activeTab, setActiveTab] = useState('transaction');
//   const [items, setItems] = useState([]);
//   const [sortBy, setSortBy] = useState('rank');
//   const [filterText, setFilterText] = useState('');

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

//   const getRankColor = (index) => {
//     switch (index) {
//       case 0: return '#FFD700'; // Gold
//       case 1: return '#C0C0C0'; // Silver
//       case 2: return '#CD7F32'; // Bronze
//       default: return '#E5E7EB';
//     }
//   };

//   const getTabIcon = (tab) => {
//     switch (tab) {
//       case 'transaction': return '📊';
//       case 'revenue': return '💰';
//       case 'frequency': return '🔄';
//       default: return '📊';
//     }
//   };

//   const getTabLabel = (tab) => {
//     switch (tab) {
//       case 'transaction': return 'By Quantity';
//       case 'revenue': return 'By Revenue';
//       case 'frequency': return 'By Frequency';
//       default: return 'By Quantity';
//     }
//   };

//   const getTabDescription = (tab) => {
//     switch (tab) {
//       case 'transaction': return 'Items with highest total quantity sold';
//       case 'revenue': return 'Items with highest total revenue generated';
//       case 'frequency': return 'Most frequently sold items';
//       default: return 'Items with highest total quantity sold';
//     }
//   };

//   const formatCurrency = (amount) => {
//     if (amount >= 10000000) return 'Rs. ' + (amount / 10000000).toFixed(1) + 'Cr';
//     if (amount >= 100000) return 'Rs. ' + (amount / 100000).toFixed(1) + 'L';
//     if (amount >= 1000) return 'Rs. ' + (amount / 1000).toFixed(1) + 'K';
//     return 'Rs. ' + amount.toLocaleString();
//   };

//   const formatNumber = (num) => {
//     if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
//     if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
//     return num.toFixed(1);
//   };

//   const filteredItems = items.filter(item => 
//     item.itemName.toLowerCase().includes(filterText.toLowerCase())
//   );

//   const sortedItems = [...filteredItems];
//   if (sortBy === 'rank') {
//     // Keep original order
//   } else if (sortBy === 'name') {
//     sortedItems.sort((a, b) => a.itemName.localeCompare(b.itemName));
//   } else if (sortBy === 'value') {
//     sortedItems.sort((a, b) => b.totalAmount - a.totalAmount);
//   } else if (sortBy === 'quantity') {
//     sortedItems.sort((a, b) => b.totalQuantity - a.totalQuantity);
//   }

//   if (isLoading) {
//     return (
//       <div className="top-items-card">
//         <div className="top-items-loading">
//           <div className="top-items-spinner"></div>
//           <p>Loading top items...</p>
//         </div>
//       </div>
//     );
//   }

//   const hasData = items.length > 0;

//   return (
//     <div className="top-items-card">
//       {/* Header */}
//       <div className="top-items-header">
//         <div className="top-items-header-left">
//           <div className="top-items-icon">🏆</div>
//           <div>
//             <h3 className="top-items-title">Top Items</h3>
//             <span className="top-items-subtitle">{getTabDescription(activeTab)}</span>
//           </div>
//         </div>
//         {onRefresh && (
//           <button className="top-items-refresh" onClick={onRefresh}>
//             <i className="bi bi-arrow-clockwise"></i>
//           </button>
//         )}
//       </div>

//       {/* Tabs */}
//       <div className="top-items-tabs">
//         {['transaction', 'revenue', 'frequency'].map((tab) => (
//           <button
//             key={tab}
//             className={`top-items-tab ${activeTab === tab ? 'active' : ''}`}
//             onClick={() => setActiveTab(tab)}
//           >
//             <span className="tab-icon">{getTabIcon(tab)}</span>
//             <span className="tab-label">{getTabLabel(tab)}</span>
//           </button>
//         ))}
//       </div>

//       {/* Filters */}
//       <div className="top-items-filters">
//         <div className="top-items-search">
//           <input
//             type="text"
//             placeholder="Search items..."
//             value={filterText}
//             onChange={(e) => setFilterText(e.target.value)}
//             className="top-items-search-input"
//           />
//         </div>
//         <div className="top-items-sort">
//           <select 
//             value={sortBy} 
//             onChange={(e) => setSortBy(e.target.value)}
//             className="top-items-sort-select"
//           >
//             <option value="rank">Sort by Rank</option>
//             <option value="name">Sort by Name</option>
//             <option value="value">Sort by Value</option>
//             <option value="quantity">Sort by Quantity</option>
//           </select>
//         </div>
//       </div>

//       {/* Items List */}
//       <div className="top-items-list">
//         {!hasData ? (
//           <div className="top-items-empty">
//             <span className="empty-icon">📦</span>
//             <p>No items data available</p>
//           </div>
//         ) : (
//           filteredItems.length === 0 ? (
//             <div className="top-items-empty">
//               <span className="empty-icon">🔍</span>
//               <p>No items match your search</p>
//             </div>
//           ) : (
//             filteredItems.map((item, index) => (
//               <div key={item.itemId || index} className="top-items-item">
//                 <div className="item-rank" style={{ backgroundColor: getRankColor(index) }}>
//                   #{index + 1}
//                 </div>
//                 <div className="item-info">
//                   <div className="item-name">{item.itemName}</div>
//                   <div className="item-details">
//                     <span className="item-unit">{item.unitName || 'Unit'}</span>
//                     <span className="item-separator">•</span>
//                     <span className="item-transactions">
//                       {item.transactionCount} {item.transactionCount === 1 ? 'transaction' : 'transactions'}
//                     </span>
//                   </div>
//                 </div>
//                 <div className="item-stats">
//                   <div className="item-stat">
//                     <span className="stat-label">Qty</span>
//                     <span className="stat-value">{formatNumber(item.totalQuantity)}</span>
//                   </div>
//                   <div className="item-stat">
//                     <span className="stat-label">Revenue</span>
//                     <span className="stat-value highlight">{formatCurrency(item.totalAmount)}</span>
//                   </div>
//                   <div className="item-stat">
//                     <span className="stat-label">Price</span>
//                     <span className="stat-value">{formatCurrency(item.latestPrice)}</span>
//                   </div>
//                 </div>
//               </div>
//             ))
//           )
//         )}
//       </div>

//       {/* Footer */}
//       {hasData && (
//         <div className="top-items-footer">
//           <span className="footer-text">
//             Showing {filteredItems.length} of {items.length} items
//           </span>
//           {activeTab === 'transaction' && (
//             <span className="footer-hint">💡 Sorted by total quantity sold</span>
//           )}
//           {activeTab === 'revenue' && (
//             <span className="footer-hint">💡 Sorted by total revenue generated</span>
//           )}
//           {activeTab === 'frequency' && (
//             <span className="footer-hint">💡 Sorted by number of transactions</span>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default TopItemsCard;

//----------------------------------------------end1

import React, { useState, useEffect } from 'react';
import './TopItemsCard.css';

const TopItemsCard = ({ 
  topItemsByTransaction = [], 
  topItemsByRevenue = [], 
  topItemsByFrequency = [],
  isLoading = false,
  onRefresh = null
}) => {
  const [activeTab, setActiveTab] = useState('transaction');
  const [items, setItems] = useState([]);
  const [sortBy, setSortBy] = useState('rank');
  const [filterText, setFilterText] = useState('');

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

  const getRankBadge = (index) => {
    switch (index) {
      case 0: return { label: '🥇', color: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)' };
      case 1: return { label: '🥈', color: '#C0C0C0', bg: 'rgba(192, 192, 192, 0.15)' };
      case 2: return { label: '🥉', color: '#CD7F32', bg: 'rgba(205, 127, 50, 0.15)' };
      default: return { label: `#${index + 1}`, color: '#6b7280', bg: 'transparent' };
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
    if (amount >= 10000000) return 'Rs. ' + (amount / 10000000).toFixed(1) + 'Cr';
    if (amount >= 100000) return 'Rs. ' + (amount / 100000).toFixed(1) + 'L';
    if (amount >= 1000) return 'Rs. ' + (amount / 1000).toFixed(1) + 'K';
    return 'Rs. ' + amount.toLocaleString();
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

  if (isLoading) {
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

  const hasData = items.length > 0;

  return (
    <div className="tic-card">
      {/* Header */}
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
            {items.length} items
          </span>
          {onRefresh && (
            <button className="tic-refresh" onClick={onRefresh} disabled={isLoading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isLoading ? 'tic-spinning' : ''}>
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tic-tabs">
        {['transaction', 'revenue', 'frequency'].map((tab) => (
          <button
            key={tab}
            className={`tic-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="tic-tab-icon">{getTabIcon(tab)}</span>
            <span>{getTabLabel(tab)}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
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
        </div>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          className="tic-sort"
        >
          <option value="rank">Sort by Rank</option>
          <option value="name">Sort by Name</option>
          <option value="value">Sort by Value</option>
          <option value="quantity">Sort by Quantity</option>
        </select>
      </div>

      {/* Items List */}
      <div className="tic-list">
        {!hasData ? (
          <div className="tic-empty">
            <div className="tic-empty-icon">📦</div>
            <p className="tic-empty-title">No items data</p>
            <p className="tic-empty-subtitle">Start selling to see your top items here</p>
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

      {/* Footer */}
      {hasData && filteredItems.length > 0 && (
        <div className="tic-footer">
          <span className="tic-footer-text">
            Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong> items
          </span>
          <span className="tic-footer-hint">
            {activeTab === 'transaction' && '📊 Sorted by quantity sold'}
            {activeTab === 'revenue' && '💰 Sorted by revenue'}
            {activeTab === 'frequency' && '🔥 Sorted by frequency'}
          </span>
        </div>
      )}
    </div>
  );
};

export default TopItemsCard;