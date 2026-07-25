// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import axios from 'axios';
// import { useAuth } from '../../../context/AuthContext';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import DailyCashSummary from '../DailyCashSummary';
// import DailySalesSummary from '../DailySalesSummary';
// import DailyBankSummary from '../DailyBankSummary';
// import DailyInventorySummary from '../DailyInventorySummary';

// const StatsCards = ({ companyId, companyName, fiscalYearJson }) => {
//     const { statsCardDraftSave, setStatsCardDraftSave } = usePageNotRefreshContext();

//     // Add state for Cash Modal
//     const [showCashModal, setShowCashModal] = useState(false);
//     const [showSalesModal, setShowSalesModal] = useState(false);
//     const [showBankModal, setShowBankModal] = useState(false);
//     const [showInventoryModal, setShowInventoryModal] = useState(false);
//     const [selectedAccountId, setSelectedAccountId] = useState(null);

//     // Get API base URL from environment variable
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
//     const intervalRef = useRef(null);
//     const abortControllerRef = useRef(null);
//     const { currentCompany } = useAuth();

//     // Create axios instance with base URL
//     const api = useCallback(() => {
//         const instance = axios.create({
//             baseURL: API_BASE_URL,
//             withCredentials: true,
//         });

//         // Add request interceptor for token
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
//                 const { financialSummary } = response.data.data;
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
//             } else {
//                 throw new Error(response.data.error || 'Failed to load dashboard data');
//             }
//         } catch (error) {
//             if (error.name === 'AbortError') {
//                 console.log('Fetch aborted');
//                 return;
//             }

//             console.error('Background refresh failed:', error);
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
//     }, [companyId, companyName, fiscalYearJson, statsCardDraftSave, setStatsCardDraftSave, API_BASE_URL, isFetching]);

//     useEffect(() => {
//         if (!companyId) return;

//         if (statsCardDraftSave) {
//             fetchFreshData(true).catch(e => console.log('Background update failed:', e));
//         } else {
//             fetchFreshData(false);
//         }

//         intervalRef.current = setInterval(() => {
//             fetchFreshData(true);
//         }, 300000);

//         return () => {
//             if (intervalRef.current) {
//                 clearInterval(intervalRef.current);
//             }
//             if (abortControllerRef.current) {
//                 abortControllerRef.current.abort();
//             }
//         };
//     }, [companyId]);

//     const displayData = stats.isFresh ? stats : statsCardDraftSave || stats;

//     // Handle Cash Card click
//     const handleCashCardClick = () => {
//         // You can set the accountId if needed (e.g., Cash in Hand account ID)
//         setSelectedAccountId(null); // Set to null to show all cash transactions
//         setShowCashModal(true);
//     };

//     // Handle Sales Card click
//     const handleSalesCardClick = () => {
//         // You can set the accountId if needed (e.g., Sales account ID)
//         setSelectedAccountId(null); // Set to null to show all sales transactions
//         setShowSalesModal(true);
//     };

//     // Handle Bank Card click
//     const handleBankCardClick = () => {
//         setShowBankModal(true);
//     };

//     const handleInventoryCardClick = () => {
//         setShowInventoryModal(true);
//     }

//     return (
//         <>
//             <div className="row">
//                 {/* Cash Card - Made clickable */}
//                 <div className="col-lg-3 col-md-6 col-12 mb-4">
//                     <div
//                         className="card border-start border-primary border-4 cursor-pointer"
//                         onClick={handleCashCardClick}
//                         style={{ cursor: 'pointer', transition: 'transform 0.2s',minHeight: '120px' }}
//                         onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
//                         onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
//                     >
//                         <div className="card-body p-3">
//                             <div className="d-flex justify-content-between align-items-center">
//                                 <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}>
//                                     <h6 className="text-muted mb-1 text-truncate small">
//                                         Cash <i className="bi bi-info-circle text-primary" style={{ fontSize: '0.7rem' }}></i>
//                                     </h6>
//                                     <div
//                                         className="mb-0 text-truncate"
//                                         title={`Rs. ${formatCurrency(displayData.cashBalance)}`}
//                                         style={{
//                                             fontSize: getDynamicFontSize(displayData.cashBalance) * 0.9,
//                                             fontWeight: '200',
//                                             lineHeight: '1.1'
//                                         }}
//                                     >
//                                         {formatCurrency(displayData.cashBalance)}
//                                         <small className="text-muted" style={{ fontSize: '0.6em' }}> Rs.</small>
//                                     </div>
//                                 </div>
//                                 <div className="bg-primary bg-opacity-10 p-2 rounded flex-shrink-0">
//                                     <i className="bi bi-cash-coin fs-5 text-primary" title="Click to view details"></i>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Sales Card */}
//                 <div className="col-lg-3 col-md-6 col-12 mb-4">
//                     <div className="card border-start border-success border-4 cursor-pointer"
//                         onClick={handleSalesCardClick}
//                         style={{ cursor: 'pointer', transition: 'transform 0.2s' ,minHeight: '120px'}}
//                         onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
//                         onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
//                     >
//                         <div className="card-body p-3">
//                             <div className="d-flex justify-content-between align-items-center">
//                                 <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}>
//                                     <h6 className="text-muted mb-1 text-truncate small">Sales</h6>
//                                     <div
//                                         className="mb-0 text-truncate"
//                                         title={`Rs. ${formatCurrency(displayData.netSales)}`}
//                                         style={{
//                                             fontSize: getDynamicFontSize(displayData.netSales) * 0.9,
//                                             fontWeight: '200',
//                                             lineHeight: '1.1'
//                                         }}
//                                     >
//                                         {formatCurrency(displayData.netSales)}
//                                         <small className="text-muted" style={{ fontSize: '0.6em' }}> Rs.</small>
//                                     </div>
//                                 </div>
//                                 <div className="bg-success bg-opacity-10 p-2 rounded flex-shrink-0">
//                                     <i className="bi bi-graph-up fs-5 text-success"></i>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Bank Card */}
//                 <div className="col-lg-3 col-md-6 col-12 mb-4">
//                     <div className="card border-start border-success border-4 cursor-pointer"
//                         onClick={handleBankCardClick}
//                         style={{ cursor: 'pointer', transition: 'transform 0.2s' ,minHeight: '120px'}}
//                         onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
//                         onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
//                     >
//                         <div className="card-body p-3">
//                             <div className="d-flex justify-content-between align-items-center">
//                                 <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}>
//                                     <h6 className="text-muted mb-1 text-truncate small">Bank</h6>
//                                     <div
//                                         className="mb-0 text-truncate"
//                                         title={`Rs. ${formatCurrency(displayData.bankBalance)}`}
//                                         style={{
//                                             fontSize: getDynamicFontSize(displayData.bankBalance) * 0.9,
//                                             fontWeight: '200',
//                                             lineHeight: '1.1'
//                                         }}
//                                     >
//                                         {formatCurrency(displayData.bankBalance)}
//                                         <small className="text-muted" style={{ fontSize: '0.6em' }}> Rs.</small>
//                                     </div>
//                                 </div>
//                                 <div className="bg-info bg-opacity-10 p-2 rounded flex-shrink-0">
//                                     <i className="bi bi-bank fs-5 text-info"></i>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Inventory Card */}
//                 <div className="col-lg-3 col-md-6 col-12 mb-4">
//                     <div className="card border-start border-success border-4 cursor-pointer"
//                         onClick={handleInventoryCardClick}
//                         style={{ cursor: 'pointer', transition: 'transform 0.2s',minHeight: '120px' }}
//                         onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
//                         onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
//                     >
//                         <div className="card-body p-3">
//                             <div className="d-flex justify-content-between align-items-center">
//                                 <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}>
//                                     <h6 className="text-muted mb-1 text-truncate small">Inventory</h6>
//                                     <div
//                                         className="mb-0 text-truncate"
//                                         title={`Rs. ${formatCurrency(displayData.totalStock)}`}
//                                         style={{
//                                             fontSize: getDynamicFontSize(displayData.totalStock) * 0.9,
//                                             fontWeight: '200',
//                                             lineHeight: '1.1'
//                                         }}
//                                     >
//                                         {formatCurrency(displayData.totalStock)}
//                                         <small className="text-muted" style={{ fontSize: '0.6em' }}> Rs.</small>
//                                     </div>
//                                 </div>
//                                 <div className="bg-warning bg-opacity-10 p-2 rounded flex-shrink-0">
//                                     <i className="bi bi-box-seam fs-5 text-warning"></i>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Daily Cash Summary */}
//             <DailyCashSummary
//                 show={showCashModal}
//                 onClose={() => setShowCashModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//             {/* Daily Inventory Summary */}
//             <DailyInventorySummary
//                 show={showInventoryModal}
//                 onClose={() => setShowInventoryModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//             {/* Daily Sales Summary */}
//             <DailySalesSummary
//                 show={showSalesModal}
//                 onClose={() => setShowSalesModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//             {/* Daily Bank Summary */}
//             <DailyBankSummary
//                 show={showBankModal}
//                 onClose={() => setShowBankModal(false)}
//                 companyId={companyId}
//                 accountId={selectedAccountId}
//             />
//         </>
//     );
// };

// export default StatsCards;

//-----------------------------------------------------end

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import DailyCashSummary from '../DailyCashSummary';
import DailySalesSummary from '../DailySalesSummary';
import DailyBankSummary from '../DailyBankSummary';
import DailyInventorySummary from '../DailyInventorySummary';

const StatsCards = ({ companyId, companyName, fiscalYearJson }) => {
    const { statsCardDraftSave, setStatsCardDraftSave } = usePageNotRefreshContext();

    const [showCashModal, setShowCashModal] = useState(false);
    const [showSalesModal, setShowSalesModal] = useState(false);
    const [showBankModal, setShowBankModal] = useState(false);
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState(null);

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
    const intervalRef = useRef(null);
    const abortControllerRef = useRef(null);
    const { currentCompany } = useAuth();

    // Professional card styles
    const styles = {
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
        },
        card: {
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #e8ecf1',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minHeight: '110px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
        },
        cardHover: {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            borderColor: '#2563eb',
        },
        cardHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
        },
        cardLabel: {
            fontSize: '13px',
            fontWeight: '500',
            color: '#6b7280',
            margin: 0,
        },
        cardIcon: {
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
        },
        cardValue: {
            fontSize: '24px',
            fontWeight: '600',
            color: '#1a202c',
            margin: 0,
            lineHeight: '1.2',
        },
        cardSubtext: {
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '4px',
        },
        '@media (max-width: 992px)': {
            grid: {
                gridTemplateColumns: 'repeat(2, 1fr)',
            },
        },
        '@media (max-width: 576px)': {
            grid: {
                gridTemplateColumns: '1fr',
            },
            card: {
                padding: '16px 20px',
                minHeight: '90px',
            },
            cardValue: {
                fontSize: '20px',
            },
        },
    };

    const api = useCallback(() => {
        const instance = axios.create({
            baseURL: API_BASE_URL,
            withCredentials: true,
        });

        instance.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        return instance;
    }, []);

    const getDynamicFontSize = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        const numString = Math.abs(Math.round(number)).toString();
        const integerDigits = numString.length;

        if (integerDigits >= 13) return '1.1rem';
        if (integerDigits >= 11) return '1.2rem';
        if (integerDigits >= 9) return '1.3rem';
        if (integerDigits >= 7) return '1.4rem';
        if (integerDigits >= 5) return '1.6rem';
        if (integerDigits >= 4) return '1.8rem';
        return '2.2rem';
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
                const { financialSummary } = response.data.data;
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
            } else {
                throw new Error(response.data.error || 'Failed to load dashboard data');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }

            console.error('Background refresh failed:', error);
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
    }, [companyId, companyName, fiscalYearJson, statsCardDraftSave, setStatsCardDraftSave, API_BASE_URL, isFetching]);

    useEffect(() => {
        if (!companyId) return;

        if (statsCardDraftSave) {
            fetchFreshData(true);
        } else {
            fetchFreshData(false);
        }

        intervalRef.current = setInterval(() => {
            fetchFreshData(true);
        }, 300000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
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
            iconColor: '#059669',
            iconBg: '#ecfdf5',
            borderColor: '#059669',
            onClick: () => { setSelectedAccountId(null); setShowCashModal(true); },
            subtext: 'Available cash'
        },
        {
            key: 'sales',
            label: 'Net Sales',
            value: displayData.netSales,
            icon: 'bi-graph-up-arrow',
            iconColor: '#2563eb',
            iconBg: '#eff6ff',
            borderColor: '#2563eb',
            onClick: () => { setSelectedAccountId(null); setShowSalesModal(true); },
            subtext: 'Today\'s sales'
        },
        {
            key: 'bank',
            label: 'Bank Balance',
            value: displayData.bankBalance,
            icon: 'bi-bank',
            iconColor: '#7c3aed',
            iconBg: '#f5f3ff',
            borderColor: '#7c3aed',
            onClick: () => { setShowBankModal(true); },
            subtext: 'Total in bank'
        },
        {
            key: 'inventory',
            label: 'Inventory Value',
            value: displayData.totalStock,
            icon: 'bi-box-seam',
            iconColor: '#d97706',
            iconBg: '#fffbeb',
            borderColor: '#d97706',
            onClick: () => { setShowInventoryModal(true); },
            subtext: 'Stock value'
        }
    ];

    return (
        <>
            <div style={styles.grid}>
                {cardConfigs.map((config) => (
                    <div
                        key={config.key}
                        style={styles.card}
                        onClick={config.onClick}
                        onMouseEnter={(e) => {
                            Object.assign(e.currentTarget.style, styles.cardHover);
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                            e.currentTarget.style.borderColor = '#e8ecf1';
                        }}
                    >
                        <div style={styles.cardHeader}>
                            <p style={styles.cardLabel}>{config.label}</p>
                            <div style={{ ...styles.cardIcon, backgroundColor: config.iconBg }}>
                                <i className={`bi ${config.icon}`} style={{ color: config.iconColor }}></i>
                            </div>
                        </div>
                        <div>
                            <p style={styles.cardValue}>
                                {formatCurrency(config.value)}
                            </p>
                            <p style={styles.cardSubtext}>
                                <i className="bi bi-arrow-right me-1"></i>
                                {config.subtext}
                            </p>
                        </div>
                    </div>
                ))}
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
};

export default StatsCards;