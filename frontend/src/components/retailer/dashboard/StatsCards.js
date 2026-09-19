// import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
// import axios from 'axios';
// import { useAuth } from '../../../context/AuthContext';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import DailyCashSummary from '../DailyCashSummary';
// import DailySalesSummary from '../DailySalesSummary';
// import DailyBankSummary from '../DailyBankSummary';
// import DailyInventorySummary from '../DailyInventorySummary';

// const StatsCards = forwardRef(({ 
//     companyId, 
//     companyName, 
//     fiscalYearJson,
//     onDataLoaded,
//     onRefreshComplete
// }, ref) => {
//     const { statsCardDraftSave, setStatsCardDraftSave } = usePageNotRefreshContext();

//     const [showCashModal, setShowCashModal] = useState(false);
//     const [showSalesModal, setShowSalesModal] = useState(false);
//     const [showBankModal, setShowBankModal] = useState(false);
//     const [showInventoryModal, setShowInventoryModal] = useState(false);
//     const [selectedAccountId, setSelectedAccountId] = useState(null);

//     const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142';

//     const [company] = useState({
//         dateFormat: 'nepali',
//         vatEnabled: true,
//         fiscalYear: {}
//     });
//     const [stats, setStats] = useState({
//         cashBalance: statsCardDraftSave?.cashBalance || 0,
//         netSales: statsCardDraftSave?.netSales || 0,
//         bankBalance: statsCardDraftSave?.bankBalance || 0,
//         totalStock: statsCardDraftSave?.totalStock || 0,
//         error: null,
//         isFresh: false
//     });

//     const [isFetching, setIsFetching] = useState(false);
//     const abortControllerRef = useRef(null);
//     const { currentCompany } = useAuth();

//     // Professional card styles
//     const styles = {
//         grid: {
//             display: 'grid',
//             gridTemplateColumns: 'repeat(4, 1fr)',
//             gap: '20px',
//         },
//         card: {
//             backgroundColor: '#ffffff',
//             borderRadius: '12px',
//             padding: '20px 24px',
//             boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
//             border: '1px solid #e8ecf1',
//             cursor: 'pointer',
//             transition: 'all 0.2s ease',
//             minHeight: '110px',
//             display: 'flex',
//             flexDirection: 'column',
//             justifyContent: 'center',
//         },
//         cardHover: {
//             transform: 'translateY(-2px)',
//             boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
//             borderColor: '#2563eb',
//         },
//         cardHeader: {
//             display: 'flex',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             marginBottom: '8px',
//         },
//         cardLabel: {
//             fontSize: '13px',
//             fontWeight: '500',
//             color: '#6b7280',
//             margin: 0,
//         },
//         cardIcon: {
//             width: '40px',
//             height: '40px',
//             borderRadius: '10px',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             fontSize: '18px',
//         },
//         cardValue: {
//             fontSize: '24px',
//             fontWeight: '600',
//             color: '#1a202c',
//             margin: 0,
//             lineHeight: '1.2',
//         },
//         cardSubtext: {
//             fontSize: '12px',
//             color: '#6b7280',
//             marginTop: '4px',
//         },
//         '@media (max-width: 992px)': {
//             grid: {
//                 gridTemplateColumns: 'repeat(2, 1fr)',
//             },
//         },
//         '@media (max-width: 576px)': {
//             grid: {
//                 gridTemplateColumns: '1fr',
//             },
//             card: {
//                 padding: '16px 20px',
//                 minHeight: '90px',
//             },
//             cardValue: {
//                 fontSize: '20px',
//             },
//         },
//     };

//     const api = useCallback(() => {
//         const instance = axios.create({
//             baseURL: API_BASE_URL,
//             withCredentials: true,
//         });

//         instance.interceptors.request.use(
//             (config) => {
//                 const token = localStorage.getItem('token');
//                 if (token) {
//                     config.headers.Authorization = `Bearer ${token}`;
//                 }
//                 return config;
//             },
//             (error) => Promise.reject(error)
//         );

//         return instance;
//     }, []);

//     const getDynamicFontSize = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         const numString = Math.abs(Math.round(number)).toString();
//         const integerDigits = numString.length;

//         if (integerDigits >= 13) return '1.1rem';
//         if (integerDigits >= 11) return '1.2rem';
//         if (integerDigits >= 9) return '1.3rem';
//         if (integerDigits >= 7) return '1.4rem';
//         if (integerDigits >= 5) return '1.6rem';
//         if (integerDigits >= 4) return '1.8rem';
//         return '2.2rem';
//     };

//     const formatCurrency = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         if (company.dateFormat === 'nepali') {
//             return number.toLocaleString('en-IN', {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2
//             });
//         }
//         return number.toLocaleString('en-US', {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         });
//     };

//     // ✅ Main fetch function - no auto-refresh
//     const fetchFreshData = useCallback(async (isBackground = false) => {
//         if (isFetching) return;

//         if (abortControllerRef.current) {
//             abortControllerRef.current.abort();
//         }

//         abortControllerRef.current = new AbortController();
//         setIsFetching(true);

//         try {
//             const params = new URLSearchParams();
//             params.append('companyId', companyId);
//             if (companyName) params.append('companyName', companyName);
//             if (fiscalYearJson) params.append('fiscalYearJson', fiscalYearJson);

//             const url = `${API_BASE_URL}/api/retailer/retailerDashboard/indexv1?${params.toString()}`;

//             const response = await axios.get(url, {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${localStorage.getItem('token')}`
//                 },
//                 withCredentials: true,
//                 signal: abortControllerRef.current.signal
//             });

//             if (response.data.success) {
//                 const dashboardData = response.data.data;
//                 const { financialSummary } = dashboardData;

//                 // Extract all data
//                 const freshData = {
//                     cashBalance: financialSummary.cashBalance,
//                     netSales: financialSummary.netSales,
//                     bankBalance: financialSummary.bankBalance,
//                     totalStock: financialSummary.totalStockValue,
//                     error: null,
//                     isFresh: true
//                 };

//                 setStats(freshData);
//                 setStatsCardDraftSave({
//                     cashBalance: financialSummary.cashBalance,
//                     netSales: financialSummary.netSales,
//                     bankBalance: financialSummary.bankBalance,
//                     totalStock: financialSummary.totalStockValue,
//                     lastUpdated: new Date().toISOString()
//                 });

//                 // ✅ Call the callback with ALL dashboard data
//                 if (onDataLoaded) {
//                     console.log('📤 StatsCards calling onDataLoaded with all data:', {
//                         topItemsByTransaction: dashboardData.topItemsByTransaction,
//                         topItemsByRevenue: dashboardData.topItemsByRevenue,
//                         topItemsByFrequency: dashboardData.topItemsByFrequency,
//                         topCustomersByPurchase: dashboardData.topCustomersByPurchase,
//                         topCustomersByFrequency: dashboardData.topCustomersByFrequency,
//                         topCustomersByAverageValue: dashboardData.topCustomersByAverageValue,
//                         topCustomersByOutstanding: dashboardData.topCustomersByOutstanding
//                     });

//                     // Pass ALL data to parent
//                     onDataLoaded({
//                         // Top Items
//                         topItemsByTransaction: dashboardData.topItemsByTransaction || [],
//                         topItemsByRevenue: dashboardData.topItemsByRevenue || [],
//                         topItemsByFrequency: dashboardData.topItemsByFrequency || [],
//                         // Top Customers
//                         topCustomersByPurchase: dashboardData.topCustomersByPurchase || [],
//                         topCustomersByFrequency: dashboardData.topCustomersByFrequency || [],
//                         topCustomersByAverageValue: dashboardData.topCustomersByAverageValue || [],
//                         topCustomersByOutstanding: dashboardData.topCustomersByOutstanding || []
//                     });
//                 }

//                 // ✅ Call refresh complete callback if provided
//                 if (onRefreshComplete) {
//                     onRefreshComplete();
//                 }

//             } else {
//                 throw new Error(response.data.error || 'Failed to load dashboard data');
//             }
//         } catch (error) {
//             if (error.name === 'AbortError') {
//                 return;
//             }

//             console.error('Failed to fetch data:', error);
//             if (!statsCardDraftSave) {
//                 setStats(prev => ({
//                     ...prev,
//                     error: error.response?.data?.error || error.message,
//                     isFresh: false
//                 }));
//             }
//         } finally {
//             setIsFetching(false);
//         }
//     }, [companyId, companyName, fiscalYearJson, statsCardDraftSave, setStatsCardDraftSave, API_BASE_URL, isFetching, onDataLoaded, onRefreshComplete]);

//     // ✅ Expose fetch function via ref for parent component
//     const refreshData = useCallback(() => {
//         return fetchFreshData(false);
//     }, [fetchFreshData]);

//     // ✅ Use ref to expose methods to parent
//     useImperativeHandle(ref, () => ({
//         refreshData,
//         isFetching
//     }));

//     // ✅ Only fetch on mount and when companyId changes - NO AUTO-REFRESH
//     useEffect(() => {
//         if (!companyId) return;

//         // Initial fetch only - no interval
//         if (statsCardDraftSave) {
//             fetchFreshData(true);
//         } else {
//             fetchFreshData(false);
//         }

//         // ✅ Cleanup: abort any pending requests on unmount
//         return () => {
//             if (abortControllerRef.current) {
//                 abortControllerRef.current.abort();
//             }
//         };
//     }, [companyId]); // ✅ Only runs when companyId changes

//     const displayData = stats.isFresh ? stats : statsCardDraftSave || stats;

//     const cardConfigs = [
//         {
//             key: 'cash',
//             label: 'Cash Balance',
//             value: displayData.cashBalance,
//             icon: 'bi-cash-coin',
//             iconColor: '#059669',
//             iconBg: '#ecfdf5',
//             borderColor: '#059669',
//             onClick: () => { setSelectedAccountId(null); setShowCashModal(true); },
//             subtext: 'Available cash'
//         },
//         {
//             key: 'sales',
//             label: 'Net Sales',
//             value: displayData.netSales,
//             icon: 'bi-graph-up-arrow',
//             iconColor: '#2563eb',
//             iconBg: '#eff6ff',
//             borderColor: '#2563eb',
//             onClick: () => { setSelectedAccountId(null); setShowSalesModal(true); },
//             subtext: "Today's sales"
//         },
//         {
//             key: 'bank',
//             label: 'Bank Balance',
//             value: displayData.bankBalance,
//             icon: 'bi-bank',
//             iconColor: '#7c3aed',
//             iconBg: '#f5f3ff',
//             borderColor: '#7c3aed',
//             onClick: () => { setShowBankModal(true); },
//             subtext: 'Total in bank'
//         },
//         {
//             key: 'inventory',
//             label: 'Inventory Value',
//             value: displayData.totalStock,
//             icon: 'bi-box-seam',
//             iconColor: '#d97706',
//             iconBg: '#fffbeb',
//             borderColor: '#d97706',
//             onClick: () => { setShowInventoryModal(true); },
//             subtext: 'Stock value'
//         }
//     ];

//     return (
//         <>
//             <div style={styles.grid}>
//                 {cardConfigs.map((config) => (
//                     <div
//                         key={config.key}
//                         style={styles.card}
//                         onClick={config.onClick}
//                         onMouseEnter={(e) => {
//                             Object.assign(e.currentTarget.style, styles.cardHover);
//                         }}
//                         onMouseLeave={(e) => {
//                             e.currentTarget.style.transform = 'translateY(0)';
//                             e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
//                             e.currentTarget.style.borderColor = '#e8ecf1';
//                         }}
//                     >
//                         <div style={styles.cardHeader}>
//                             <p style={styles.cardLabel}>{config.label}</p>
//                             <div style={{ ...styles.cardIcon, backgroundColor: config.iconBg }}>
//                                 <i className={`bi ${config.icon}`} style={{ color: config.iconColor }}></i>
//                             </div>
//                         </div>
//                         <div>
//                             <p style={styles.cardValue}>
//                                 {formatCurrency(config.value)}
//                             </p>
//                             <p style={styles.cardSubtext}>
//                                 <i className="bi bi-arrow-right me-1"></i>
//                                 {config.subtext}
//                             </p>
//                         </div>
//                     </div>
//                 ))}
//             </div>

//             {/* Modals */}
//             <DailyCashSummary
//                 show={showCashModal}
//                 onClose={() => setShowCashModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//             <DailyInventorySummary
//                 show={showInventoryModal}
//                 onClose={() => setShowInventoryModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//             <DailySalesSummary
//                 show={showSalesModal}
//                 onClose={() => setShowSalesModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//             <DailyBankSummary
//                 show={showBankModal}
//                 onClose={() => setShowBankModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//         </>
//     );
// });

// StatsCards.displayName = 'StatsCards';

// export default StatsCards;

//-----------------------------------------end1

// import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
// import axios from 'axios';
// import { useAuth } from '../../../context/AuthContext';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import DailyCashSummary from '../DailyCashSummary';
// import DailySalesSummary from '../DailySalesSummary';
// import DailyBankSummary from '../DailyBankSummary';
// import DailyInventorySummary from '../DailyInventorySummary';
// import './StatsCards.css';

// const StatsCards = forwardRef(({
//     companyId,
//     companyName,
//     fiscalYearJson,
//     onDataLoaded,
//     onRefreshComplete
// }, ref) => {
//     const { statsCardDraftSave, setStatsCardDraftSave } = usePageNotRefreshContext();

//     const [showCashModal, setShowCashModal] = useState(false);
//     const [showSalesModal, setShowSalesModal] = useState(false);
//     const [showBankModal, setShowBankModal] = useState(false);
//     const [showInventoryModal, setShowInventoryModal] = useState(false);
//     const [selectedAccountId, setSelectedAccountId] = useState(null);

//     const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142';

//     const [company] = useState({
//         dateFormat: 'nepali',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     const [stats, setStats] = useState({
//         cashBalance: statsCardDraftSave?.cashBalance || 0,
//         netSales: statsCardDraftSave?.netSales || 0,
//         bankBalance: statsCardDraftSave?.bankBalance || 0,
//         totalStock: statsCardDraftSave?.totalStock || 0,
//         error: null,
//         isFresh: false
//     });

//     const [isFetching, setIsFetching] = useState(false);
//     const abortControllerRef = useRef(null);
//     const { currentCompany } = useAuth();

//     const getDynamicFontSize = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         const numString = Math.abs(Math.round(number)).toString();
//         const integerDigits = numString.length;

//         if (integerDigits >= 13) return '1.1rem';
//         if (integerDigits >= 11) return '1.2rem';
//         if (integerDigits >= 9) return '1.3rem';
//         if (integerDigits >= 7) return '1.4rem';
//         if (integerDigits >= 5) return '1.6rem';
//         if (integerDigits >= 4) return '1.8rem';
//         return '2.2rem';
//     };

//     const formatCurrency = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         if (company.dateFormat === 'nepali') {
//             return number.toLocaleString('en-IN', {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2
//             });
//         }
//         return number.toLocaleString('en-US', {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         });
//     };

//     // ✅ Main fetch function - no auto-refresh
//     const fetchFreshData = useCallback(async (isBackground = false) => {
//         if (isFetching) return;

//         if (abortControllerRef.current) {
//             abortControllerRef.current.abort();
//         }

//         abortControllerRef.current = new AbortController();
//         setIsFetching(true);

//         try {
//             const params = new URLSearchParams();
//             params.append('companyId', companyId);
//             if (companyName) params.append('companyName', companyName);
//             if (fiscalYearJson) params.append('fiscalYearJson', fiscalYearJson);

//             const url = `${API_BASE_URL}/api/retailer/retailerDashboard/indexv1?${params.toString()}`;

//             const response = await axios.get(url, {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${localStorage.getItem('token')}`
//                 },
//                 withCredentials: true,
//                 signal: abortControllerRef.current.signal
//             });

//             if (response.data.success) {
//                 const dashboardData = response.data.data;
//                 const { financialSummary } = dashboardData;

//                 const freshData = {
//                     cashBalance: financialSummary.cashBalance,
//                     netSales: financialSummary.netSales,
//                     bankBalance: financialSummary.bankBalance,
//                     totalStock: financialSummary.totalStockValue,
//                     error: null,
//                     isFresh: true
//                 };

//                 setStats(freshData);
//                 setStatsCardDraftSave({
//                     cashBalance: financialSummary.cashBalance,
//                     netSales: financialSummary.netSales,
//                     bankBalance: financialSummary.bankBalance,
//                     totalStock: financialSummary.totalStockValue,
//                     lastUpdated: new Date().toISOString()
//                 });

//                 if (onDataLoaded) {
//                     onDataLoaded({
//                         topItemsByTransaction: dashboardData.topItemsByTransaction || [],
//                         topItemsByRevenue: dashboardData.topItemsByRevenue || [],
//                         topItemsByFrequency: dashboardData.topItemsByFrequency || [],
//                         topCustomersByPurchase: dashboardData.topCustomersByPurchase || [],
//                         topCustomersByFrequency: dashboardData.topCustomersByFrequency || [],
//                         topCustomersByAverageValue: dashboardData.topCustomersByAverageValue || [],
//                         topCustomersByOutstanding: dashboardData.topCustomersByOutstanding || []
//                     });
//                 }

//                 if (onRefreshComplete) {
//                     onRefreshComplete();
//                 }

//             } else {
//                 throw new Error(response.data.error || 'Failed to load dashboard data');
//             }
//         } catch (error) {
//             if (error.name === 'AbortError') {
//                 return;
//             }

//             console.error('Failed to fetch data:', error);
//             if (!statsCardDraftSave) {
//                 setStats(prev => ({
//                     ...prev,
//                     error: error.response?.data?.error || error.message,
//                     isFresh: false
//                 }));
//             }
//         } finally {
//             setIsFetching(false);
//         }
//     }, [companyId, companyName, fiscalYearJson, statsCardDraftSave, setStatsCardDraftSave, API_BASE_URL, isFetching, onDataLoaded, onRefreshComplete]);

//     const refreshData = useCallback(() => {
//         return fetchFreshData(false);
//     }, [fetchFreshData]);

//     useImperativeHandle(ref, () => ({
//         refreshData,
//         isFetching
//     }));

//     useEffect(() => {
//         if (!companyId) return;

//         if (statsCardDraftSave) {
//             fetchFreshData(true);
//         } else {
//             fetchFreshData(false);
//         }

//         return () => {
//             if (abortControllerRef.current) {
//                 abortControllerRef.current.abort();
//             }
//         };
//     }, [companyId]);

//     const displayData = stats.isFresh ? stats : statsCardDraftSave || stats;

//     const cardConfigs = [
//         {
//             key: 'cash',
//             label: 'Cash Balance',
//             value: displayData.cashBalance,
//             icon: 'bi-cash-coin',
//             cardClass: 'sc-card--cash',
//             onClick: () => { setSelectedAccountId(null); setShowCashModal(true); },
//             subtext: 'Available cash'
//         },
//         {
//             key: 'sales',
//             label: 'Net Sales',
//             value: displayData.netSales,
//             icon: 'bi-graph-up-arrow',
//             cardClass: 'sc-card--sales',
//             onClick: () => { setSelectedAccountId(null); setShowSalesModal(true); },
//             subtext: "Today's sales"
//         },
//         {
//             key: 'bank',
//             label: 'Bank Balance',
//             value: displayData.bankBalance,
//             icon: 'bi-bank',
//             cardClass: 'sc-card--bank',
//             onClick: () => { setShowBankModal(true); },
//             subtext: 'Total in bank'
//         },
//         {
//             key: 'inventory',
//             label: 'Inventory Value',
//             value: displayData.totalStock,
//             icon: 'bi-box-seam',
//             cardClass: 'sc-card--inventory',
//             onClick: () => { setShowInventoryModal(true); },
//             subtext: 'Stock value'
//         }
//     ];

//     return (
//         <>
//             <div className="sc-grid">
//                 {cardConfigs.map((config) => (
//                     <div
//                         key={config.key}
//                         className={`sc-card ${config.cardClass}`}
//                         onClick={config.onClick}
//                     >
//                         <div className="sc-card-header">
//                             <span className="sc-card-label">{config.label}</span>
//                             <div className="sc-card-icon">
//                                 <i className={`bi ${config.icon}`}></i>
//                             </div>
//                         </div>
//                         <div className="sc-card-body">
//                             <p
//                                 className="sc-card-value"
//                                 style={{ fontSize: getDynamicFontSize(config.value) }}
//                             >
//                                 {formatCurrency(config.value)}
//                             </p>
//                             <p className="sc-card-subtext">
//                                 <i className="bi bi-arrow-right me-1"></i>
//                                 {config.subtext}
//                             </p>
//                         </div>
//                     </div>
//                 ))}
//             </div>

//             {/* Modals */}
//             <DailyCashSummary
//                 show={showCashModal}
//                 onClose={() => setShowCashModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//             <DailyInventorySummary
//                 show={showInventoryModal}
//                 onClose={() => setShowInventoryModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//             <DailySalesSummary
//                 show={showSalesModal}
//                 onClose={() => setShowSalesModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//             <DailyBankSummary
//                 show={showBankModal}
//                 onClose={() => setShowBankModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//         </>
//     );
// });

// StatsCards.displayName = 'StatsCards';

// export default StatsCards;

//----------------------------------------------end2

// import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
// import axios from 'axios';
// import { useAuth } from '../../../context/AuthContext';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import DailyCashSummary from '../DailyCashSummary';
// import DailySalesSummary from '../DailySalesSummary';
// import DailyBankSummary from '../DailyBankSummary';
// import DailyInventorySummary from '../DailyInventorySummary';
// import './StatsCards.css';

// const StatsCards = forwardRef(({
//     companyId,
//     companyName,
//     fiscalYearJson,
//     onDataLoaded,
//     onRefreshComplete
// }, ref) => {
//     const { statsCardDraftSave, setStatsCardDraftSave } = usePageNotRefreshContext();

//     const [showCashModal, setShowCashModal] = useState(false);
//     const [showSalesModal, setShowSalesModal] = useState(false);
//     const [showBankModal, setShowBankModal] = useState(false);
//     const [showInventoryModal, setShowInventoryModal] = useState(false);
//     const [selectedAccountId, setSelectedAccountId] = useState(null);

//     const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142';

//     const [company] = useState({
//         dateFormat: 'nepali',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     const [stats, setStats] = useState({
//         cashBalance: statsCardDraftSave?.cashBalance || 0,
//         netSales: statsCardDraftSave?.netSales || 0,
//         bankBalance: statsCardDraftSave?.bankBalance || 0,
//         totalStock: statsCardDraftSave?.totalStock || 0,
//         error: null,
//         isFresh: false
//     });

//     const [isFetching, setIsFetching] = useState(false);
//     const abortControllerRef = useRef(null);
//     const { currentCompany } = useAuth();

//     // ✅ Slightly reduced font sizes for a cleaner, more compact look
//     const getDynamicFontSize = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         const numString = Math.abs(Math.round(number)).toString();
//         const integerDigits = numString.length;

//         if (integerDigits >= 13) return '0.95rem';
//         if (integerDigits >= 11) return '1.05rem';
//         if (integerDigits >= 9) return '1.15rem';
//         if (integerDigits >= 7) return '1.3rem';
//         if (integerDigits >= 5) return '1.5rem';
//         if (integerDigits >= 4) return '1.7rem';
//         return '2rem';
//     };

//     const formatCurrency = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         if (company.dateFormat === 'nepali') {
//             return number.toLocaleString('en-IN', {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2
//             });
//         }
//         return number.toLocaleString('en-US', {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         });
//     };

//     // ✅ Helper to detect negative values
//     const isNegative = (value) => {
//         const number = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value) || 0;
//         return number < 0;
//     };

//     const fetchFreshData = useCallback(async (isBackground = false) => {
//         if (isFetching) return;

//         if (abortControllerRef.current) {
//             abortControllerRef.current.abort();
//         }

//         abortControllerRef.current = new AbortController();
//         setIsFetching(true);

//         try {
//             const params = new URLSearchParams();
//             params.append('companyId', companyId);
//             if (companyName) params.append('companyName', companyName);
//             if (fiscalYearJson) params.append('fiscalYearJson', fiscalYearJson);

//             const url = `${API_BASE_URL}/api/retailer/retailerDashboard/indexv1?${params.toString()}`;

//             const response = await axios.get(url, {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${localStorage.getItem('token')}`
//                 },
//                 withCredentials: true,
//                 signal: abortControllerRef.current.signal
//             });

//             if (response.data.success) {
//                 const dashboardData = response.data.data;
//                 const { financialSummary } = dashboardData;

//                 const freshData = {
//                     cashBalance: financialSummary.cashBalance,
//                     netSales: financialSummary.netSales,
//                     bankBalance: financialSummary.bankBalance,
//                     totalStock: financialSummary.totalStockValue,
//                     error: null,
//                     isFresh: true
//                 };

//                 setStats(freshData);
//                 setStatsCardDraftSave({
//                     cashBalance: financialSummary.cashBalance,
//                     netSales: financialSummary.netSales,
//                     bankBalance: financialSummary.bankBalance,
//                     totalStock: financialSummary.totalStockValue,
//                     lastUpdated: new Date().toISOString()
//                 });

//                 if (onDataLoaded) {
//                     onDataLoaded({
//                         topItemsByTransaction: dashboardData.topItemsByTransaction || [],
//                         topItemsByRevenue: dashboardData.topItemsByRevenue || [],
//                         topItemsByFrequency: dashboardData.topItemsByFrequency || [],
//                         topCustomersByPurchase: dashboardData.topCustomersByPurchase || [],
//                         topCustomersByFrequency: dashboardData.topCustomersByFrequency || [],
//                         topCustomersByAverageValue: dashboardData.topCustomersByAverageValue || [],
//                         topCustomersByOutstanding: dashboardData.topCustomersByOutstanding || []
//                     });
//                 }

//                 if (onRefreshComplete) {
//                     onRefreshComplete();
//                 }

//             } else {
//                 throw new Error(response.data.error || 'Failed to load dashboard data');
//             }
//         } catch (error) {
//             if (error.name === 'AbortError') {
//                 return;
//             }

//             console.error('Failed to fetch data:', error);
//             if (!statsCardDraftSave) {
//                 setStats(prev => ({
//                     ...prev,
//                     error: error.response?.data?.error || error.message,
//                     isFresh: false
//                 }));
//             }
//         } finally {
//             setIsFetching(false);
//         }
//     }, [companyId, companyName, fiscalYearJson, statsCardDraftSave, setStatsCardDraftSave, API_BASE_URL, isFetching, onDataLoaded, onRefreshComplete]);

//     const refreshData = useCallback(() => {
//         return fetchFreshData(false);
//     }, [fetchFreshData]);

//     useImperativeHandle(ref, () => ({
//         refreshData,
//         isFetching
//     }));

//     useEffect(() => {
//         if (!companyId) return;

//         if (statsCardDraftSave) {
//             fetchFreshData(true);
//         } else {
//             fetchFreshData(false);
//         }

//         return () => {
//             if (abortControllerRef.current) {
//                 abortControllerRef.current.abort();
//             }
//         };
//     }, [companyId]);

//     const displayData = stats.isFresh ? stats : statsCardDraftSave || stats;

//     const cardConfigs = [
//         {
//             key: 'cash',
//             label: 'Cash Balance',
//             value: displayData.cashBalance,
//             icon: 'bi-cash-coin',
//             cardClass: 'sc-card--cash',
//             onClick: () => { setSelectedAccountId(null); setShowCashModal(true); },
//             subtext: 'Available cash'
//         },
//         {
//             key: 'sales',
//             label: 'Net Sales',
//             value: displayData.netSales,
//             icon: 'bi-graph-up-arrow',
//             cardClass: 'sc-card--sales',
//             onClick: () => { setSelectedAccountId(null); setShowSalesModal(true); },
//             subtext: "Today's sales"
//         },
//         {
//             key: 'bank',
//             label: 'Bank Balance',
//             value: displayData.bankBalance,
//             icon: 'bi-bank',
//             cardClass: 'sc-card--bank',
//             onClick: () => { setShowBankModal(true); },
//             subtext: 'Total in bank'
//         },
//         {
//             key: 'inventory',
//             label: 'Inventory Value',
//             value: displayData.totalStock,
//             icon: 'bi-box-seam',
//             cardClass: 'sc-card--inventory',
//             onClick: () => { setShowInventoryModal(true); },
//             subtext: 'Stock value'
//         }
//     ];

//     return (
//         <>
//             <div className="sc-grid">
//                 {cardConfigs.map((config) => {
//                     const negative = isNegative(config.value);
//                     return (
//                         <div
//                             key={config.key}
//                             className={`sc-card ${config.cardClass} ${negative ? 'sc-card--negative' : ''}`}
//                             onClick={config.onClick}
//                         >
//                             <div className="sc-card-header">
//                                 <span className="sc-card-label">{config.label}</span>
//                                 <div className="sc-card-icon">
//                                     <i className={`bi ${config.icon}`}></i>
//                                 </div>
//                             </div>
//                             <div className="sc-card-body">
//                                 <p
//                                     className="sc-card-value"
//                                     style={{ fontSize: getDynamicFontSize(config.value) }}
//                                 >
//                                     {formatCurrency(config.value)}
//                                 </p>
//                                 <p className="sc-card-subtext">
//                                     <i className="bi bi-arrow-right me-1"></i>
//                                     {config.subtext}
//                                 </p>
//                             </div>
//                             {negative && (
//                                 <span className="sc-card-negative-indicator" aria-hidden="true">
//                                     <i className="bi bi-exclamation-triangle-fill"></i>
//                                 </span>
//                             )}
//                         </div>
//                     );
//                 })}
//             </div>

//             {/* Modals */}
//             <DailyCashSummary
//                 show={showCashModal}
//                 onClose={() => setShowCashModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//             <DailyInventorySummary
//                 show={showInventoryModal}
//                 onClose={() => setShowInventoryModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//             <DailySalesSummary
//                 show={showSalesModal}
//                 onClose={() => setShowSalesModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//             <DailyBankSummary
//                 show={showBankModal}
//                 onClose={() => setShowBankModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//         </>
//     );
// });

// StatsCards.displayName = 'StatsCards';

// export default StatsCards;

//---------------------------------------------end3

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import DailyCashSummary from '../DailyCashSummary';
import DailySalesSummary from '../DailySalesSummary';
import DailyBankSummary from '../DailyBankSummary';
import DailyInventorySummary from '../DailyInventorySummary';
import './StatsCards.css';

const StatsCards = forwardRef(({
    companyId,
    companyName,
    fiscalYearJson,
    onDataLoaded,
    onRefreshComplete
}, ref) => {
    const { statsCardDraftSave, setStatsCardDraftSave } = usePageNotRefreshContext();

    const [showCashModal, setShowCashModal] = useState(false);
    const [showSalesModal, setShowSalesModal] = useState(false);
    const [showBankModal, setShowBankModal] = useState(false);
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState(null);

    // ✅ Per-card visibility state — all hidden by default
    // const [visibleCards, setVisibleCards] = useState({
    //     cash: false,
    //     sales: false,
    //     bank: false,
    //     inventory: false
    // });

    // ✅ Per-card visibility state — loaded from localStorage so it persists across refreshes
    const [visibleCards, setVisibleCards] = useState(() => {
        try {
            const saved = localStorage.getItem('statsCardVisibility');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Ensure all keys exist (safe fallback if new keys are added later)
                return {
                    cash: parsed.cash ?? false,
                    sales: parsed.sales ?? false,
                    bank: parsed.bank ?? false,
                    inventory: parsed.inventory ?? false
                };
            }
        } catch (e) {
            console.error('Failed to load stats card visibility:', e);
        }
        return {
            cash: false,
            sales: false,
            bank: false,
            inventory: false
        };
    });
    
    // ✅ Persist visibility to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('statsCardVisibility', JSON.stringify(visibleCards));
        } catch (e) {
            console.error('Failed to save stats card visibility:', e);
        }
    }, [visibleCards]);

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142';

    const [company] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });

    const [stats, setStats] = useState({
        cashBalance: statsCardDraftSave?.cashBalance || 0,
        netSales: statsCardDraftSave?.netSales || 0,
        bankBalance: statsCardDraftSave?.bankBalance || 0,
        totalStock: statsCardDraftSave?.totalStock || 0,
        error: null,
        isFresh: false
    });

    const [isFetching, setIsFetching] = useState(false);
    const abortControllerRef = useRef(null);
    const { currentCompany } = useAuth();

    const getDynamicFontSize = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        const numString = Math.abs(Math.round(number)).toString();
        const integerDigits = numString.length;

        if (integerDigits >= 13) return '0.95rem';
        if (integerDigits >= 11) return '1.05rem';
        if (integerDigits >= 9) return '1.15rem';
        if (integerDigits >= 7) return '1.3rem';
        if (integerDigits >= 5) return '1.5rem';
        if (integerDigits >= 4) return '1.7rem';
        return '2rem';
    };

    const formatCurrency = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        if (company.dateFormat === 'nepali') {
            return number.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        return number.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const isNegative = (value) => {
        const number = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value) || 0;
        return number < 0;
    };

    // ✅ Toggle visibility of a specific card
    const toggleVisibility = (key, e) => {
        e.stopPropagation(); // prevent card's onClick from firing
        setVisibleCards(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const fetchFreshData = useCallback(async (isBackground = false) => {
        if (isFetching) return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        setIsFetching(true);

        try {
            const params = new URLSearchParams();
            params.append('companyId', companyId);
            if (companyName) params.append('companyName', companyName);
            if (fiscalYearJson) params.append('fiscalYearJson', fiscalYearJson);

            const url = `${API_BASE_URL}/api/retailer/retailerDashboard/indexv1?${params.toString()}`;

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
                const { financialSummary } = dashboardData;

                const freshData = {
                    cashBalance: financialSummary.cashBalance,
                    netSales: financialSummary.netSales,
                    bankBalance: financialSummary.bankBalance,
                    totalStock: financialSummary.totalStockValue,
                    error: null,
                    isFresh: true
                };

                setStats(freshData);
                setStatsCardDraftSave({
                    cashBalance: financialSummary.cashBalance,
                    netSales: financialSummary.netSales,
                    bankBalance: financialSummary.bankBalance,
                    totalStock: financialSummary.totalStockValue,
                    lastUpdated: new Date().toISOString()
                });

                if (onDataLoaded) {
                    onDataLoaded({
                        topItemsByTransaction: dashboardData.topItemsByTransaction || [],
                        topItemsByRevenue: dashboardData.topItemsByRevenue || [],
                        topItemsByFrequency: dashboardData.topItemsByFrequency || [],
                        topCustomersByPurchase: dashboardData.topCustomersByPurchase || [],
                        topCustomersByFrequency: dashboardData.topCustomersByFrequency || [],
                        topCustomersByAverageValue: dashboardData.topCustomersByAverageValue || [],
                        topCustomersByOutstanding: dashboardData.topCustomersByOutstanding || []
                    });
                }

                if (onRefreshComplete) {
                    onRefreshComplete();
                }

            } else {
                throw new Error(response.data.error || 'Failed to load dashboard data');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }

            console.error('Failed to fetch data:', error);
            if (!statsCardDraftSave) {
                setStats(prev => ({
                    ...prev,
                    error: error.response?.data?.error || error.message,
                    isFresh: false
                }));
            }
        } finally {
            setIsFetching(false);
        }
    }, [companyId, companyName, fiscalYearJson, statsCardDraftSave, setStatsCardDraftSave, API_BASE_URL, isFetching, onDataLoaded, onRefreshComplete]);

    const refreshData = useCallback(() => {
        return fetchFreshData(false);
    }, [fetchFreshData]);

    useImperativeHandle(ref, () => ({
        refreshData,
        isFetching
    }));

    useEffect(() => {
        if (!companyId) return;

        if (statsCardDraftSave) {
            fetchFreshData(true);
        } else {
            fetchFreshData(false);
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [companyId]);

    const displayData = stats.isFresh ? stats : statsCardDraftSave || stats;

    const cardConfigs = [
        {
            key: 'cash',
            label: 'Cash Balance',
            value: displayData.cashBalance,
            icon: 'bi-cash-coin',
            cardClass: 'sc-card--cash',
            onClick: () => { setSelectedAccountId(null); setShowCashModal(true); },
            subtext: 'Available cash'
        },
        {
            key: 'sales',
            label: 'Net Sales',
            value: displayData.netSales,
            icon: 'bi-graph-up-arrow',
            cardClass: 'sc-card--sales',
            onClick: () => { setSelectedAccountId(null); setShowSalesModal(true); },
            subtext: "Today's sales"
        },
        {
            key: 'bank',
            label: 'Bank Balance',
            value: displayData.bankBalance,
            icon: 'bi-bank',
            cardClass: 'sc-card--bank',
            onClick: () => { setShowBankModal(true); },
            subtext: 'Total in bank'
        },
        {
            key: 'inventory',
            label: 'Inventory Value',
            value: displayData.totalStock,
            icon: 'bi-box-seam',
            cardClass: 'sc-card--inventory',
            onClick: () => { setShowInventoryModal(true); },
            subtext: 'Stock value'
        }
    ];

    return (
        <>
            <div className="sc-grid">
                {cardConfigs.map((config) => {
                    const negative = isNegative(config.value);
                    const isVisible = visibleCards[config.key];

                    return (
                        <div
                            key={config.key}
                            className={`sc-card ${config.cardClass} ${negative ? 'sc-card--negative' : ''}`}
                            onClick={config.onClick}
                        >
                            <div className="sc-card-header">
                                <span className="sc-card-label">{config.label}</span>
                                <div className="sc-card-icon">
                                    <i className={`bi ${config.icon}`}></i>
                                </div>
                            </div>

                            <div className="sc-card-body">
                                {/* ✅ Amount + eye toggle */}
                                <div className="sc-card-value-row">
                                    <p
                                        className={`sc-card-value ${!isVisible ? 'sc-card-value--hidden' : ''}`}
                                        style={{ fontSize: isVisible ? getDynamicFontSize(config.value) : '1.4rem' }}
                                    >
                                        {isVisible ? formatCurrency(config.value) : '••••••'}
                                    </p>

                                    <button
                                        type="button"
                                        className="sc-card-eye-btn"
                                        onClick={(e) => toggleVisibility(config.key, e)}
                                        title={isVisible ? 'Hide amount' : 'Show amount'}
                                        aria-label={isVisible ? 'Hide amount' : 'Show amount'}
                                    >
                                        <i className={`bi ${isVisible ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                    </button>
                                </div>

                                <p className="sc-card-subtext">
                                    <i className="bi bi-arrow-right me-1"></i>
                                    {config.subtext}
                                </p>
                            </div>

                            {negative && isVisible && (
                                <span className="sc-card-negative-indicator" aria-hidden="true">
                                    <i className="bi bi-exclamation-triangle-fill"></i>
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modals */}
            <DailyCashSummary
                show={showCashModal}
                onClose={() => setShowCashModal(false)}
                companyId={companyId}
                accountId={selectedAccountId}
            />
            <DailyInventorySummary
                show={showInventoryModal}
                onClose={() => setShowInventoryModal(false)}
                companyId={companyId}
                accountId={selectedAccountId}
            />
            <DailySalesSummary
                show={showSalesModal}
                onClose={() => setShowSalesModal(false)}
                companyId={companyId}
                accountId={selectedAccountId}
            />
            <DailyBankSummary
                show={showBankModal}
                onClose={() => setShowBankModal(false)}
                companyId={companyId}
                accountId={selectedAccountId}
            />
        </>
    );
});

StatsCards.displayName = 'StatsCards';

export default StatsCards;