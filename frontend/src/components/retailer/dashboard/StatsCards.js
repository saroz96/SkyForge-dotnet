// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { useAuth } from '../../../context/AuthContext';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';

// const StatsCards = () => {
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

//     // Dynamic font size based on number length
//     const getDynamicFontSize = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         const numString = Math.abs(Math.round(number)).toString();

//         // Count digits before decimal
//         const integerDigits = numString.length;

//         if (integerDigits >= 13) return '1.1rem'; // Trillions (13+ digits)
//         if (integerDigits >= 11) return '1.2rem'; // 100+ billions (11-12 digits)
//         if (integerDigits >= 9) return '1.3rem'; // 100+ millions (9-10 digits)
//         if (integerDigits >= 7) return '1.4rem'; // 1+ millions (7-8 digits)
//         if (integerDigits >= 5) return '1.6rem'; // 10,000+ (5-6 digits)
//         if (integerDigits >= 4) return '1.8rem'; // 1,000+ (4 digits)
//         return '2.2rem'; // Less than 1000
//     };

//     // Original currency formatter
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

//     // Alternative compact formatter for extremely large numbers (optional fallback)
//     const formatCompactIfTooLarge = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         const absNumber = Math.abs(number);

//         if (absNumber >= 1e12) { // Trillions
//             return (number / 1e12).toFixed(1) + 'T';
//         }
//         if (absNumber >= 1e9) { // Billions
//             return (number / 1e9).toFixed(1) + 'B';
//         }
//         if (absNumber >= 1e6) { // Millions
//             return (number / 1e6).toFixed(1) + 'M';
//         }
//         // Return regular formatted number
//         return formatCurrency(number);
//     };

//     // Check if number is extremely large (optional - for decision making)
//     const isExtremelyLarge = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         return Math.abs(number) >= 1e9; // 1 billion or more
//     };

//     useEffect(() => {
//         if (!currentCompany) return;

//         const fetchFreshData = async () => {
//             try {
//                 const response = await axios.get('/api/retailer/retailerDashboard/indexv1', {
//                     headers: { 'Content-Type': 'application/json' },
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
//     }, [currentCompany, statsCardDraftSave, setStatsCardDraftSave]);

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
//             {/* <div className="col-lg-3 col-md-6 col-12 mb-4">
//                 <div className="card border-start border-primary border-4">
//                     <div className="card-body">
//                         <div className="d-flex justify-content-between align-items-center">
//                             <div className="flex-grow-1 me-3" style={{ minWidth: 0 }}>
//                                 <h6 className="text-muted mb-1 text-truncate">Cash Balance</h6>
//                                 <div
//                                     className="mb-0 text-truncate"
//                                     title={`Rs. ${formatCurrency(displayData.cashBalance)}`}
//                                     style={{ 
//                                         fontSize: getDynamicFontSize(displayData.cashBalance),
//                                         fontWeight: '200',
//                                         lineHeight: '1.2'
//                                     }}
//                                 >
//                                     {formatCurrency(displayData.cashBalance)}
//                                     <small className="text-muted" style={{ fontSize: '0.7em' }}> Rs.</small>
//                                 </div>
//                             </div>
//                             <div className="bg-primary bg-opacity-10 p-3 rounded flex-shrink-0">
//                                 <i className="bi bi-cash-coin fs-4 text-primary"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div> */}

//             <div className="col-lg-3 col-md-6 col-12 mb-4">
//                 <div className="card border-start border-primary border-4">
//                     <div className="card-body p-3"> {/* Reduced padding */}
//                         <div className="d-flex justify-content-between align-items-center">
//                             <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}> {/* Reduced margin */}
//                                 <h6 className="text-muted mb-1 text-truncate small">Cash</h6> {/* Smaller font */}
//                                 <div
//                                     className="mb-0 text-truncate"
//                                     title={`Rs. ${formatCurrency(displayData.cashBalance)}`}
//                                     style={{
//                                         fontSize: getDynamicFontSize(displayData.cashBalance) * 0.9, // 90% of original
//                                         fontWeight: '200',
//                                         lineHeight: '1.1' // Tighter line height
//                                     }}
//                                 >
//                                     {formatCurrency(displayData.cashBalance)}
//                                     <small className="text-muted" style={{ fontSize: '0.6em' }}> Rs.</small>
//                                 </div>
//                             </div>
//                             <div className="bg-primary bg-opacity-10 p-2 rounded flex-shrink-0"> {/* Reduced padding */}
//                                 <i className="bi bi-cash-coin fs-5 text-primary"></i> {/* Smaller icon */}
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

//-----------------------------------------------------------------end

import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        if (!companyId) return;

        const fetchFreshData = async () => {
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
                    withCredentials: true
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
                        totalStock: financialSummary.totalStockValue
                    });
                } else {
                    throw new Error(response.data.error || 'Failed to load dashboard data');
                }
            } catch (error) {
                console.error('Background refresh failed:', error);
                if (!statsCardDraftSave) {
                    setStats(prev => ({
                        ...prev,
                        error: error.response?.data?.error || error.message,
                        isFresh: false
                    }));
                }
            }
        };

        if (statsCardDraftSave) {
            fetchFreshData().catch(e => console.log('Background update failed:', e));
        } else {
            fetchFreshData();
        }

        const interval = setInterval(fetchFreshData, 300000);
        return () => clearInterval(interval);
    }, [companyId, statsCardDraftSave, setStatsCardDraftSave, companyName, fiscalYearJson]);

    if (stats.error && !statsCardDraftSave) {
        return (
            <div className="alert alert-danger">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {stats.error}
                <button
                    className="btn btn-sm btn-outline-danger ms-3"
                    onClick={() => setStats(prev => ({ ...prev, error: null }))}
                >
                    Retry
                </button>
            </div>
        );
    }

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