// import React, { useState, useEffect } from 'react';
// import './TopCustomersCard.css';

// const TopCustomersCard = ({
//   topByPurchase = [],
//   topByFrequency = [],
//   topByAverageValue = [],
//   topByOutstanding = [],
//   isLoading = false,
//   onRefresh = null
// }) => {
//   const [activeTab, setActiveTab] = useState('purchase');
//   const [items, setItems] = useState([]);
//   const [sortBy, setSortBy] = useState('rank');
//   const [filterText, setFilterText] = useState('');

//   useEffect(() => {
//     let data = [];
//     switch (activeTab) {
//       case 'purchase':
//         data = [...topByPurchase];
//         break;
//       case 'frequency':
//         data = [...topByFrequency];
//         break;
//       case 'average':
//         data = [...topByAverageValue];
//         break;
//       case 'outstanding':
//         data = [...topByOutstanding];
//         break;
//       default:
//         data = [...topByPurchase];
//     }
//     setItems(data);
//   }, [activeTab, topByPurchase, topByFrequency, topByAverageValue, topByOutstanding]);

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
//       case 'purchase': return '🏷️';
//       case 'frequency': return '🔄';
//       case 'average': return '📊';
//       case 'outstanding': return '💰';
//       default: return '🏷️';
//     }
//   };

//   const getTabLabel = (tab) => {
//     switch (tab) {
//       case 'purchase': return 'Top Spenders';
//       case 'frequency': return 'Most Frequent';
//       case 'average': return 'High Value';
//       case 'outstanding': return 'Outstanding';
//       default: return 'Top Spenders';
//     }
//   };

//   const getTabDescription = (tab) => {
//     switch (tab) {
//       case 'purchase': return 'Customers with highest total purchases';
//       case 'frequency': return 'Customers who buy most frequently';
//       case 'average': return 'Customers with highest average order value';
//       case 'outstanding': return 'Customers with highest outstanding balance';
//       default: return 'Customers with highest total purchases';
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
//     item.accountName?.toLowerCase().includes(filterText.toLowerCase()) ||
//     item.accountPhone?.includes(filterText) ||
//     false
//   );

//   const sortedItems = [...filteredItems];
//   if (sortBy === 'rank') {
//     // Keep original order
//   } else if (sortBy === 'name') {
//     sortedItems.sort((a, b) => (a.accountName || '').localeCompare(b.accountName || ''));
//   } else if (sortBy === 'purchase') {
//     sortedItems.sort((a, b) => (b.totalPurchaseAmount || 0) - (a.totalPurchaseAmount || 0));
//   } else if (sortBy === 'frequency') {
//     sortedItems.sort((a, b) => (b.transactionCount || 0) - (a.transactionCount || 0));
//   }

//   if (isLoading) {
//     return (
//       <div className="tcc-card">
//         <div className="tcc-loading">
//           <div className="tcc-spinner">
//             <div className="tcc-spinner-ring"></div>
//           </div>
//           <p className="tcc-loading-text">Loading top customers...</p>
//         </div>
//       </div>
//     );
//   }

//   const hasData = items.length > 0;

//   return (
//     <div className="tcc-card">
//       {/* Header */}
//       <div className="tcc-header">
//         <div className="tcc-header-left">
//           <div className="tcc-icon">
//             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//               <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
//               <circle cx="9" cy="7" r="4" />
//               <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
//               <path d="M16 3.13a4 4 0 0 1 0 7.75" />
//             </svg>
//           </div>
//           <div>
//             <h3 className="tcc-title">Top Customers</h3>
//             <span className="tcc-subtitle">{getTabDescription(activeTab)}</span>
//           </div>
//         </div>
//         <div className="tcc-header-right">
//           <span className="tcc-badge">
//             <span className="tcc-badge-dot"></span>
//             {items.length} customers
//           </span>
//           {onRefresh && (
//             <button className="tcc-refresh" onClick={onRefresh} disabled={isLoading}>
//               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isLoading ? 'tcc-spinning' : ''}>
//                 <polyline points="23 4 23 10 17 10" />
//                 <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
//               </svg>
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Tabs */}
//       <div className="tcc-tabs">
//         {['purchase', 'frequency', 'average', 'outstanding'].map((tab) => (
//           <button
//             key={tab}
//             className={`tcc-tab ${activeTab === tab ? 'active' : ''}`}
//             onClick={() => setActiveTab(tab)}
//           >
//             <span className="tcc-tab-icon">{getTabIcon(tab)}</span>
//             <span>{getTabLabel(tab)}</span>
//           </button>
//         ))}
//       </div>

//       {/* Filters */}
//       <div className="tcc-filters">
//         <div className="tcc-search">
//           <svg className="tcc-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <circle cx="11" cy="11" r="8" />
//             <line x1="21" y1="21" x2="16.65" y2="16.65" />
//           </svg>
//           <input
//             type="text"
//             placeholder="Search customers..."
//             value={filterText}
//             onChange={(e) => setFilterText(e.target.value)}
//             className="tcc-search-input"
//           />
//         </div>
//         <select
//           value={sortBy}
//           onChange={(e) => setSortBy(e.target.value)}
//           className="tcc-sort"
//         >
//           <option value="rank">Sort by Rank</option>
//           <option value="name">Sort by Name</option>
//           <option value="purchase">Sort by Purchase</option>
//           <option value="frequency">Sort by Frequency</option>
//         </select>
//       </div>

//       {/* Items List */}
//       <div className="tcc-list">
//         {!hasData ? (
//           <div className="tcc-empty">
//             <div className="tcc-empty-icon">👥</div>
//             <p className="tcc-empty-title">No customers data</p>
//             <p className="tcc-empty-subtitle">Start selling to see your top customers here</p>
//           </div>
//         ) : (
//           filteredItems.length === 0 ? (
//             <div className="tcc-empty">
//               <div className="tcc-empty-icon">🔍</div>
//               <p className="tcc-empty-title">No matches found</p>
//               <p className="tcc-empty-subtitle">Try adjusting your search</p>
//             </div>
//           ) : (
//             filteredItems.map((item, index) => {
//               const rank = getRankBadge(index);
//               const isTop3 = index < 3;
//               return (
//                 <div key={item.accountId || index} className={`tcc-item ${isTop3 ? 'top' : ''}`}>
//                   <div className="tcc-item-rank" style={{ background: rank.bg }}>
//                     <span className="tcc-item-rank-label" style={{ color: rank.color }}>
//                       {rank.label}
//                     </span>
//                   </div>
//                   <div className="tcc-item-info">
//                     <div className="tcc-item-name">{item.accountName || 'Unknown Customer'}</div>
//                     <div className="tcc-item-meta">
//                       {item.accountPhone && (
//                         <>
//                           <span className="tcc-item-phone">📞 {item.accountPhone}</span>
//                           <span className="tcc-item-dot">•</span>
//                         </>
//                       )}
//                       <span className="tcc-item-count">
//                         {item.transactionCount || 0} {item.transactionCount === 1 ? 'transaction' : 'transactions'}
//                       </span>
//                     </div>
//                   </div>
//                   <div className="tcc-item-stats">
//                     <div className="tcc-stat">
//                       <span className="tcc-stat-label">Total</span>
//                       <span className="tcc-stat-value highlight">{formatCurrency(item.totalPurchaseAmount || 0)}</span>
//                     </div>
//                     {activeTab === 'outstanding' && (
//                       <div className="tcc-stat">
//                         <span className="tcc-stat-label">Due</span>
//                         <span className={`tcc-stat-value ${(item.outstandingBalance || 0) > 0 ? 'text-danger' : ''}`}>
//                           {formatCurrency(item.outstandingBalance || 0)}
//                         </span>
//                       </div>
//                     )}
//                     {activeTab === 'average' && (
//                       <div className="tcc-stat">
//                         <span className="tcc-stat-label">Avg</span>
//                         <span className="tcc-stat-value">{formatCurrency(item.averageTransactionValue || 0)}</span>
//                       </div>
//                     )}
//                   </div>
//                   {isTop3 && (
//                     <div className={`tcc-item-badge ${index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'}`}>
//                       {index === 0 ? '👑' : index === 1 ? '⭐' : '🌟'}
//                     </div>
//                   )}
//                 </div>
//               );
//             })
//           )
//         )}
//       </div>

//       {/* Footer */}
//       {hasData && filteredItems.length > 0 && (
//         <div className="tcc-footer">
//           <span className="tcc-footer-text">
//             Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong> customers
//           </span>
//           <span className="tcc-footer-hint">
//             {activeTab === 'purchase' && '💰 Sorted by total purchases'}
//             {activeTab === 'frequency' && '🔄 Sorted by frequency'}
//             {activeTab === 'average' && '📊 Sorted by average order value'}
//             {activeTab === 'outstanding' && '💳 Sorted by outstanding balance'}
//           </span>
//         </div>
//       )}
//     </div>
//   );
// };

// export default TopCustomersCard;

//------------------------------------------end1

// TopCustomersCard.jsx
import React, { useState, useEffect } from 'react';
import './TopCustomersCard.css';

const TopCustomersCard = ({
  topByPurchase = [],
  topByFrequency = [],
  topByAverageValue = [],
  topByOutstanding = [],
  isLoading = false,
  onRefresh = null
}) => {
  const [activeTab, setActiveTab] = useState('purchase');
  const [items, setItems] = useState([]);
  const [sortBy, setSortBy] = useState('rank');
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    let data = [];
    switch (activeTab) {
      case 'purchase':
        data = [...topByPurchase];
        break;
      case 'frequency':
        data = [...topByFrequency];
        break;
      case 'average':
        data = [...topByAverageValue];
        break;
      case 'outstanding':
        data = [...topByOutstanding];
        break;
      default:
        data = [...topByPurchase];
    }
    setItems(data);
  }, [activeTab, topByPurchase, topByFrequency, topByAverageValue, topByOutstanding]);

  const getRankBadge = (index) => {
    switch (index) {
      case 0: return { label: '👑', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      case 1: return { label: '⭐', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.15)' };
      case 2: return { label: '🌟', color: '#D97706', bg: 'rgba(217, 119, 6, 0.15)' };
      default: return { label: `#${index + 1}`, color: '#6B7280', bg: 'rgba(107, 114, 128, 0.08)' };
    }
  };

  const getTabIcon = (tab) => {
    switch (tab) {
      case 'purchase': return '💎';
      case 'frequency': return '🔄';
      case 'average': return '📈';
      case 'outstanding': return '⚡';
      default: return '💎';
    }
  };

  const getTabLabel = (tab) => {
    switch (tab) {
      case 'purchase': return 'Top Spenders';
      case 'frequency': return 'Most Frequent';
      case 'average': return 'High Value';
      case 'outstanding': return 'Outstanding';
      default: return 'Top Spenders';
    }
  };

  const getTabDescription = (tab) => {
    switch (tab) {
      case 'purchase': return 'Highest total purchases';
      case 'frequency': return 'Most frequent buyers';
      case 'average': return 'Highest average order value';
      case 'outstanding': return 'Highest outstanding balance';
      default: return 'Highest total purchases';
    }
  };

  const formatCurrency = (amount) => {
    if (amount >= 10000000) return 'Rs.' + (amount / 10000000).toFixed(1) + 'Cr';
    if (amount >= 100000) return 'Rs.' + (amount / 100000).toFixed(1) + 'L';
    if (amount >= 1000) return 'Rs.' + (amount / 1000).toFixed(1) + 'K';
    return 'Rs.' + amount.toLocaleString();
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(1);
  };

  const filteredItems = items.filter(item =>
    item.accountName?.toLowerCase().includes(filterText.toLowerCase()) ||
    item.accountPhone?.includes(filterText) ||
    false
  );

  const sortedItems = [...filteredItems];
  if (sortBy === 'rank') {
    // Keep original order
  } else if (sortBy === 'name') {
    sortedItems.sort((a, b) => (a.accountName || '').localeCompare(b.accountName || ''));
  } else if (sortBy === 'purchase') {
    sortedItems.sort((a, b) => (b.totalPurchaseAmount || 0) - (a.totalPurchaseAmount || 0));
  } else if (sortBy === 'frequency') {
    sortedItems.sort((a, b) => (b.transactionCount || 0) - (a.transactionCount || 0));
  }

  if (isLoading) {
    return (
      <div className="tcc-card">
        <div className="tcc-loading">
          <div className="tcc-spinner">
            <div className="tcc-spinner-ring"></div>
            {/* <div className="tcc-spinner-ring tcc-spinner-ring-delay"></div> */}
          </div>
          <p className="tcc-loading-text"></p>
        </div>
      </div>
    );
  }

  const hasData = items.length > 0;

  return (
    <div className="tcc-card">
      {/* Decorative gradient line */}
      <div className="tcc-glow-line"></div>
      <div className="tcc-glow-spot"></div>

      {/* Header */}
      <div className="tcc-header">
        <div className="tcc-header-left">
          <div className="tcc-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h3 className="tcc-title">Top Customers</h3>
            <span className="tcc-subtitle">{getTabDescription(activeTab)}</span>
          </div>
        </div>
        <div className="tcc-header-right">
          <span className="tcc-badge">
            <span className="tcc-badge-dot"></span>
            {items.length} customers
          </span>
          {onRefresh && (
            <button className="tcc-refresh" onClick={onRefresh} disabled={isLoading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isLoading ? 'tcc-spinning' : ''}>
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tcc-tabs">
        {['purchase', 'frequency', 'average', 'outstanding'].map((tab) => (
          <button
            key={tab}
            className={`tcc-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="tcc-tab-icon">{getTabIcon(tab)}</span>
            <span className="tcc-tab-label">{getTabLabel(tab)}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="tcc-filters">
        <div className="tcc-search">
          <svg className="tcc-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search customers..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="tcc-search-input"
          />
          {filterText && (
            <button className="tcc-search-clear" onClick={() => setFilterText('')}>
              ✕
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="tcc-sort"
        >
          <option value="rank">Rank</option>
          <option value="name">Name</option>
          <option value="purchase">Purchase</option>
          <option value="frequency">Frequency</option>
        </select>
      </div>

      {/* Items List */}
      <div className="tcc-list">
        {!hasData ? (
          <div className="tcc-empty">
            <div className="tcc-empty-icon">✨</div>
            <p className="tcc-empty-title">No customers yet</p>
            <p className="tcc-empty-subtitle">Start selling to see your top customers here</p>
          </div>
        ) : (
          filteredItems.length === 0 ? (
            <div className="tcc-empty">
              <div className="tcc-empty-icon">🔍</div>
              <p className="tcc-empty-title">No matches found</p>
              <p className="tcc-empty-subtitle">Try adjusting your search</p>
            </div>
          ) : (
            sortedItems.map((item, index) => {
              const rank = getRankBadge(index);
              const isTop3 = index < 3;
              return (
                <div key={item.accountId || index} className={`tcc-item ${isTop3 ? 'top' : ''}`}>
                  <div className="tcc-item-rank" style={{ background: rank.bg }}>
                    <span className="tcc-item-rank-label" style={{ color: rank.color }}>
                      {rank.label}
                    </span>
                  </div>
                  <div className="tcc-item-info">
                    <div className="tcc-item-name">{item.accountName || 'Unknown Customer'}</div>
                    <div className="tcc-item-meta">
                      {item.accountPhone && (
                        <>
                          <span className="tcc-item-phone">📞 {item.accountPhone}</span>
                          <span className="tcc-item-dot">•</span>
                        </>
                      )}
                      <span className="tcc-item-count">
                        {item.transactionCount || 0} {item.transactionCount === 1 ? 'order' : 'orders'}
                      </span>
                    </div>
                  </div>
                  <div className="tcc-item-stats">
                    <div className="tcc-stat">
                      <span className="tcc-stat-label">Total</span>
                      <span className="tcc-stat-value highlight">{formatCurrency(item.totalPurchaseAmount || 0)}</span>
                    </div>
                    {activeTab === 'outstanding' && (
                      <div className="tcc-stat">
                        <span className="tcc-stat-label">Due</span>
                        <span className={`tcc-stat-value ${(item.outstandingBalance || 0) > 0 ? 'text-danger' : ''}`}>
                          {formatCurrency(item.outstandingBalance || 0)}
                        </span>
                      </div>
                    )}
                    {activeTab === 'average' && (
                      <div className="tcc-stat">
                        <span className="tcc-stat-label">Avg</span>
                        <span className="tcc-stat-value">{formatCurrency(item.averageTransactionValue || 0)}</span>
                      </div>
                    )}
                  </div>
                  {isTop3 && (
                    <div className={`tcc-item-badge ${index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'}`}>
                      {index === 0 ? '🏆' : index === 1 ? '🥈' : '🥉'}
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
        <div className="tcc-footer">
          <span className="tcc-footer-text">
            Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong> customers
          </span>
          <span className="tcc-footer-hint">
            {activeTab === 'purchase' && '💎 Total sales'}
            {activeTab === 'frequency' && '🔄 Order frequency'}
            {activeTab === 'average' && '📈 Average order value'}
            {activeTab === 'outstanding' && '⚡ Outstanding balance'}
          </span>
        </div>
      )}
    </div>
  );
};

export default TopCustomersCard;