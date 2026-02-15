// components/TrialBalance/OpeningTrialBalance.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../../stylesheet/retailer/TrialBalance/OpeningtrialBalance.css';

const OpeningTrialBalance = () => {
    const [trialBalanceData, setTrialBalanceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTrialBalance();
    }, []);

    const fetchTrialBalance = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/retailer/opening-trial-balance/alphabetical');

            if (response.data.success) {
                setTrialBalanceData(response.data.data);
            } else {
                setError(response.data.error || 'Failed to fetch trial balance');
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to fetch trial balance');
            console.error('Error fetching trial balance:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        // Implement PDF export functionality
        alert('PDF export functionality to be implemented');
    };

    // Format currency with commas
    const formatCurrency = (amount) => {
        if (!amount) return '0.00';
        return parseFloat(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    if (loading) {
        return (
            <div className="trial-balance-container bg-light">
                <div className="d-flex flex-column align-items-center justify-content-center py-5">
                    <div className="spinner mb-3"></div>
                    <p className="text-muted">Loading Opening Trial Balance...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="trial-balance-container bg-light">
                <div className="d-flex flex-column align-items-center justify-content-center py-5">
                    <div className="error-message p-4 rounded text-center">
                        <h3 className="text-danger mb-3">Error</h3>
                        <p className="mb-3">{error}</p>
                        <button onClick={fetchTrialBalance} className="btn btn-primary">
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!trialBalanceData || !trialBalanceData.trialBalance || trialBalanceData.trialBalance.length === 0) {
        return (
            <div className="trial-balance-container bg-light">
                <div className="d-flex flex-column align-items-center justify-content-center py-5">
                    <div className="no-data p-4 rounded text-center">
                        <p className="mb-3">No trial balance data available for the selected fiscal year</p>
                        <button onClick={fetchTrialBalance} className="btn btn-primary">
                            Refresh
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="trial-balance-container bg-light p-4">
            {/* Header with Action Buttons */}
            <div className="page-header mb-3">
                <div className="header-actions d-flex gap-2">
                    <button onClick={handlePrint} className="btn btn-primary">
                        <i className="fas fa-print me-2"></i>Print
                    </button>
                    <button onClick={handleExportPDF} className="btn btn-secondary">
                        <i className="fas fa-file-pdf me-2"></i>Export PDF
                    </button>
                    <button onClick={fetchTrialBalance} className="btn btn-outline-primary">
                        <i className="fas fa-sync-alt me-2"></i>Refresh
                    </button>
                </div>
            </div>

            {/* Trial Balance Report */}
            <div className="trial-balance-report bg-white p-4">
                {/* Company Header */}
                <div className="company-header text-center mb-4 pb-3">
                    <h1 className="mb-2">{trialBalanceData.company.name}</h1>
                    <p className="mb-0">{trialBalanceData.company.address}</p>
                </div>

                {/* Report Title */}
                <div className="report-title text-center mb-4">
                    <h2 className="mb-2">OPENING TRIAL BALANCE</h2>
                    <p className="mb-1">(As on {trialBalanceData.asOnDate})</p>
                    <p className="mb-1">Fiscal Year: {trialBalanceData.fiscalYear}</p>
                    <p className="mb-0">All Accounts</p>
                </div>

                {/* Trial Balance Table */}
                <div className="table-container">
                    <table className="trial-balance-table table table-bordered">
                        <thead>
                            <tr>
                                <th className="text-center" width="5%">S.No.</th>
                                <th width="65%">Account</th>
                                <th className="text-end" width="15%">Debit Bal. (Rs.)</th>
                                <th className="text-end" width="15%">Credit Bal. (Rs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trialBalanceData.trialBalance.map((item, index) => (
                                <tr key={index}>
                                    <td className="text-center">{item.sNo}</td>
                                    <td className="account-name">{item.account}</td>
                                    <td className="text-end debit-amount">
                                        {item.debitBal ? formatCurrency(item.debitBal) : ''}
                                    </td>
                                    <td className="text-end credit-amount">
                                        {item.creditBal ? formatCurrency(item.creditBal) : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            {/* Totals Row */}
                            <tr className="totals-row">
                                <td colSpan="2" className="text-end"><strong>Totals</strong></td>
                                <td className="text-end total-debit">
                                    <strong>{formatCurrency(trialBalanceData.totals.totalDebit)}</strong>
                                </td>
                                <td className="text-end total-credit">
                                    <strong>{formatCurrency(trialBalanceData.totals.totalCredit)}</strong>
                                </td>
                            </tr>
                            {/* Grand Total Row */}
                            <tr className="grand-total-row">
                                <td colSpan="2" className="text-end"><strong>Grand Total</strong></td>
                                <td className="text-end grand-total-debit">
                                    <strong>{formatCurrency(trialBalanceData.grandTotal.debit)}</strong>
                                </td>
                                <td className="text-end grand-total-credit">
                                    <strong>{formatCurrency(trialBalanceData.grandTotal.credit)}</strong>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Validation Message */}
                <div className="validation-message mt-4">
                    {parseFloat(trialBalanceData.totals.totalDebit) === parseFloat(trialBalanceData.totals.totalCredit) ? (
                        <div className="balance-success p-3 rounded text-center">
                            <i className="fas fa-check-circle me-2"></i>
                            Trial Balance is balanced - Debit Total equals Credit Total
                        </div>
                    ) : (
                        <div className="balance-error p-3 rounded text-center">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            Trial Balance is not balanced - Debit and Credit totals don't match
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OpeningTrialBalance;