// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { useAuth } from '../../../context/AuthContext';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';

// const StatsCards = ({ companyId, companyName, fiscalYearJson }) => {
//     const { statsCardDraftSave, setStatsCardDraftSave } = usePageNotRefreshContext();
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

//     useEffect(() => {
//         if (!companyId) return;

//         const fetchFreshData = async () => {
//             try {
//                 // Build query parameters
//                 const params = new URLSearchParams();
//                 params.append('companyId', companyId);
//                 if (companyName) params.append('companyName', companyName);
//                 if (fiscalYearJson) params.append('fiscalYearJson', fiscalYearJson);

//                 const response = await axios.get(`/api/retailer/retailerDashboard/indexv1?${params.toString()}`, {
//                     headers: { 
//                         'Content-Type': 'application/json',
//                         'Authorization': `Bearer ${localStorage.getItem('token')}`
//                     },
//                     withCredentials: true
//                 });

//                 if (response.data.success) {
//                     const { financialSummary } = response.data.data;
//                     const freshData = {
//                         cashBalance: financialSummary.cashBalance,
//                         netSales: financialSummary.netSales,
//                         bankBalance: financialSummary.bankBalance,
//                         totalStock: financialSummary.totalStockValue,
//                         error: null,
//                         isFresh: true
//                     };

//                     setStats(freshData);
//                     setStatsCardDraftSave({
//                         cashBalance: financialSummary.cashBalance,
//                         netSales: financialSummary.netSales,
//                         bankBalance: financialSummary.bankBalance,
//                         totalStock: financialSummary.totalStockValue
//                     });
//                 } else {
//                     throw new Error(response.data.error || 'Failed to load dashboard data');
//                 }
//             } catch (error) {
//                 console.error('Background refresh failed:', error);
//                 if (!statsCardDraftSave) {
//                     setStats(prev => ({
//                         ...prev,
//                         error: error.response?.data?.error || error.message,
//                         isFresh: false
//                     }));
//                 }
//             }
//         };

//         if (statsCardDraftSave) {
//             fetchFreshData().catch(e => console.log('Background update failed:', e));
//         } else {
//             fetchFreshData();
//         }

//         const interval = setInterval(fetchFreshData, 300000);
//         return () => clearInterval(interval);
//     }, [companyId, statsCardDraftSave, setStatsCardDraftSave, companyName, fiscalYearJson]);

//     if (stats.error && !statsCardDraftSave) {
//         return (
//             <div className="alert alert-danger">
//                 <i className="bi bi-exclamation-triangle-fill me-2"></i>
//                 {stats.error}
//                 <button
//                     className="btn btn-sm btn-outline-danger ms-3"
//                     onClick={() => setStats(prev => ({ ...prev, error: null }))}
//                 >
//                     Retry
//                 </button>
//             </div>
//         );
//     }

//     const displayData = stats.isFresh ? stats : statsCardDraftSave || stats;

//     return (
//         <div className="row">
//             {/* Cash Card */}
//             <div className="col-lg-3 col-md-6 col-12 mb-4">
//                 <div className="card border-start border-primary border-4">
//                     <div className="card-body p-3">
//                         <div className="d-flex justify-content-between align-items-center">
//                             <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}>
//                                 <h6 className="text-muted mb-1 text-truncate small">Cash</h6>
//                                 <div
//                                     className="mb-0 text-truncate"
//                                     title={`Rs. ${formatCurrency(displayData.cashBalance)}`}
//                                     style={{
//                                         fontSize: getDynamicFontSize(displayData.cashBalance) * 0.9,
//                                         fontWeight: '200',
//                                         lineHeight: '1.1'
//                                     }}
//                                 >
//                                     {formatCurrency(displayData.cashBalance)}
//                                     <small className="text-muted" style={{ fontSize: '0.6em' }}> Rs.</small>
//                                 </div>
//                             </div>
//                             <div className="bg-primary bg-opacity-10 p-2 rounded flex-shrink-0">
//                                 <i className="bi bi-cash-coin fs-5 text-primary"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Sales Card */}
//             <div className="col-lg-3 col-md-6 col-12 mb-4">
//                 <div className="card border-start border-success border-4">
//                     <div className="card-body p-3">
//                         <div className="d-flex justify-content-between align-items-center">
//                             <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}>
//                                 <h6 className="text-muted mb-1 text-truncate small">Sales</h6>
//                                 <div
//                                     className="mb-0 text-truncate"
//                                     title={`Rs. ${formatCurrency(displayData.netSales)}`}
//                                     style={{
//                                         fontSize: getDynamicFontSize(displayData.netSales) * 0.9,
//                                         fontWeight: '200',
//                                         lineHeight: '1.1'
//                                     }}
//                                 >
//                                     {formatCurrency(displayData.netSales)}
//                                     <small className="text-muted" style={{ fontSize: '0.6em' }}> Rs.</small>
//                                 </div>
//                             </div>
//                             <div className="bg-success bg-opacity-10 p-2 rounded flex-shrink-0">
//                                 <i className="bi bi-graph-up fs-5 text-success"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Bank Card */}
//             <div className="col-lg-3 col-md-6 col-12 mb-4">
//                 <div className="card border-start border-info border-4">
//                     <div className="card-body p-3">
//                         <div className="d-flex justify-content-between align-items-center">
//                             <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}>
//                                 <h6 className="text-muted mb-1 text-truncate small">Bank</h6>
//                                 <div
//                                     className="mb-0 text-truncate"
//                                     title={`Rs. ${formatCurrency(displayData.bankBalance)}`}
//                                     style={{
//                                         fontSize: getDynamicFontSize(displayData.bankBalance) * 0.9,
//                                         fontWeight: '200',
//                                         lineHeight: '1.1'
//                                     }}
//                                 >
//                                     {formatCurrency(displayData.bankBalance)}
//                                     <small className="text-muted" style={{ fontSize: '0.6em' }}> Rs.</small>
//                                 </div>
//                             </div>
//                             <div className="bg-info bg-opacity-10 p-2 rounded flex-shrink-0">
//                                 <i className="bi bi-bank fs-5 text-info"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Inventory Card */}
//             <div className="col-lg-3 col-md-6 col-12 mb-4">
//                 <div className="card border-start border-warning border-4">
//                     <div className="card-body p-3">
//                         <div className="d-flex justify-content-between align-items-center">
//                             <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}>
//                                 <h6 className="text-muted mb-1 text-truncate small">Inventory</h6>
//                                 <div
//                                     className="mb-0 text-truncate"
//                                     title={`Rs. ${formatCurrency(displayData.totalStock)}`}
//                                     style={{
//                                         fontSize: getDynamicFontSize(displayData.totalStock)*0.9,
//                                         fontWeight: '200',
//                                         lineHeight: '1.1'
//                                     }}
//                                 >
//                                     {formatCurrency(displayData.totalStock)}
//                                     <small className="text-muted" style={{ fontSize: '0.6em' }}> Rs.</small>
//                                 </div>
//                             </div>
//                             <div className="bg-warning bg-opacity-10 p-2 rounded flex-shrink-0">
//                                 <i className="bi bi-box-seam fs-5 text-warning"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default StatsCards;

//---------------------------------------------------------------------end

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';

const StatsCards = ({ companyId, companyName, fiscalYearJson }) => {
    const { statsCardDraftSave, setStatsCardDraftSave } = usePageNotRefreshContext();
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
        // Prevent multiple simultaneous requests
        if (isFetching) return;
        
        // Cancel previous request if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        setIsFetching(true);
        
        try {
            // Build query parameters
            const params = new URLSearchParams();
            params.append('companyId', companyId);
            if (companyName) params.append('companyName', companyName);
            if (fiscalYearJson) params.append('fiscalYearJson', fiscalYearJson);

            const response = await axios.get(`/api/retailer/retailerDashboard/indexv1?${params.toString()}`, {
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
                    lastUpdated: new Date().toISOString() // Add timestamp
                });
            } else {
                throw new Error(response.data.error || 'Failed to load dashboard data');
            }
        } catch (error) {
            // Don't show error if request was aborted
            if (error.name === 'AbortError') {
                console.log('Fetch aborted');
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
    }, [companyId, companyName, fiscalYearJson, statsCardDraftSave, setStatsCardDraftSave]);

    useEffect(() => {
        // Don't fetch if no companyId
        if (!companyId) return;

        // Initial fetch
        if (statsCardDraftSave) {
            // Use cached data first, then fetch in background
            fetchFreshData(true).catch(e => console.log('Background update failed:', e));
        } else {
            fetchFreshData(false);
        }

        // Set up interval for auto-refresh (5 minutes)
        intervalRef.current = setInterval(() => {
            fetchFreshData(true); // Background refresh
        }, 300000); // 5 minutes

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [companyId]); // Only depend on companyId, not on statsCardDraftSave

    const displayData = stats.isFresh ? stats : statsCardDraftSave || stats;

    return (
        <div className="row">
            {/* Cash Card */}
            <div className="col-lg-3 col-md-6 col-12 mb-4">
                <div className="card border-start border-primary border-4">
                    <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}>
                                <h6 className="text-muted mb-1 text-truncate small">Cash</h6>
                                <div
                                    className="mb-0 text-truncate"
                                    title={`Rs. ${formatCurrency(displayData.cashBalance)}`}
                                    style={{
                                        fontSize: getDynamicFontSize(displayData.cashBalance) * 0.9,
                                        fontWeight: '200',
                                        lineHeight: '1.1'
                                    }}
                                >
                                    {formatCurrency(displayData.cashBalance)}
                                    <small className="text-muted" style={{ fontSize: '0.6em' }}> Rs.</small>
                                </div>
                            </div>
                            <div className="bg-primary bg-opacity-10 p-2 rounded flex-shrink-0">
                                <i className="bi bi-cash-coin fs-5 text-primary"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Card */}
            <div className="col-lg-3 col-md-6 col-12 mb-4">
                <div className="card border-start border-success border-4">
                    <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}>
                                <h6 className="text-muted mb-1 text-truncate small">Sales</h6>
                                <div
                                    className="mb-0 text-truncate"
                                    title={`Rs. ${formatCurrency(displayData.netSales)}`}
                                    style={{
                                        fontSize: getDynamicFontSize(displayData.netSales) * 0.9,
                                        fontWeight: '200',
                                        lineHeight: '1.1'
                                    }}
                                >
                                    {formatCurrency(displayData.netSales)}
                                    <small className="text-muted" style={{ fontSize: '0.6em' }}> Rs.</small>
                                </div>
                            </div>
                            <div className="bg-success bg-opacity-10 p-2 rounded flex-shrink-0">
                                <i className="bi bi-graph-up fs-5 text-success"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bank Card */}
            <div className="col-lg-3 col-md-6 col-12 mb-4">
                <div className="card border-start border-info border-4">
                    <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}>
                                <h6 className="text-muted mb-1 text-truncate small">Bank</h6>
                                <div
                                    className="mb-0 text-truncate"
                                    title={`Rs. ${formatCurrency(displayData.bankBalance)}`}
                                    style={{
                                        fontSize: getDynamicFontSize(displayData.bankBalance) * 0.9,
                                        fontWeight: '200',
                                        lineHeight: '1.1'
                                    }}
                                >
                                    {formatCurrency(displayData.bankBalance)}
                                    <small className="text-muted" style={{ fontSize: '0.6em' }}> Rs.</small>
                                </div>
                            </div>
                            <div className="bg-info bg-opacity-10 p-2 rounded flex-shrink-0">
                                <i className="bi bi-bank fs-5 text-info"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inventory Card */}
            <div className="col-lg-3 col-md-6 col-12 mb-4">
                <div className="card border-start border-warning border-4">
                    <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}>
                                <h6 className="text-muted mb-1 text-truncate small">Inventory</h6>
                                <div
                                    className="mb-0 text-truncate"
                                    title={`Rs. ${formatCurrency(displayData.totalStock)}`}
                                    style={{
                                        fontSize: getDynamicFontSize(displayData.totalStock)*0.9,
                                        fontWeight: '200',
                                        lineHeight: '1.1'
                                    }}
                                >
                                    {formatCurrency(displayData.totalStock)}
                                    <small className="text-muted" style={{ fontSize: '0.6em' }}> Rs.</small>
                                </div>
                            </div>
                            <div className="bg-warning bg-opacity-10 p-2 rounded flex-shrink-0">
                                <i className="bi bi-box-seam fs-5 text-warning"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsCards;