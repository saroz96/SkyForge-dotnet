import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../../../stylesheet/retailer/accounts/AccountsImportResults.css';
import Header from '../Header';

const AccountsImportResults = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const results = location.state?.results;
    const message = location.state?.message;
    const error = location.state?.error;
    const warning = location.state?.warning;
    const isError = location.state?.isError;

    if (!results) {
        return (
            <div className="results-container">
                <div className="error-state">
                    <div className="error-icon-large">❌</div>
                    <h2>No import results found</h2>
                    <p>The import session has expired or no data was returned. Please try importing again.</p>
                    <button onClick={() => navigate('/retailer/accounts-import')} className="back-btn primary">
                        ← Back to Import
                    </button>
                </div>
            </div>
        );
    }

    const { success, total, errors = [], processed, skipped, successRate } = results.results || results;
    const importedAccounts = results.importedAccounts || [];
    const summary = results.summary || {};
    const hasErrors = errors && errors.length > 0;
    const allFailed = success === 0 && hasErrors;
    const allSkipped = success === 0 && (!errors || errors.length === 0) && skipped > 0;
    const noData = total === 0;

    const downloadErrorCSV = () => {
        if (!errors || errors.length === 0) return;

        const headers = ['Row', 'Error Message', 'Account Name', 'Company Group', 'Address', 'Phone', 'Email'];
        const csvRows = errors.map(error => [
            error.row,
            `"${error.message}"`,
            `"${error.data?.name || 'N/A'}"`,
            `"${error.data?.companyGroup || 'N/A'}"`,
            `"${error.data?.address || 'N/A'}"`,
            `"${error.data?.phone || 'N/A'}"`,
            `"${error.data?.email || 'N/A'}"`
        ]);

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `account_import_errors_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusIcon = () => {
        if (isError || allFailed || noData) return '❌';
        if (hasErrors) return '⚠️';
        return '✅';
    };

    const getStatusTitle = () => {
        if (noData) return 'No Data Found';
        if (isError || allFailed) return 'Import Failed';
        if (hasErrors) return 'Partial Success';
        return 'Import Successful';
    };

    const getStatusDescription = () => {
        if (noData) return 'The file contained no valid data to import.';
        if (allFailed) return 'All accounts failed to import. Please check the errors below.';
        if (isError) return message || error || 'The import process encountered an error.';
        if (hasErrors) return `${success} accounts imported, ${errors.length} accounts failed.`;
        return `All ${success} accounts were imported successfully!`;
    };

    return (
        <div><Header />
            <div className="results-container">
                <div className="results-header">
                    <h1>📊 Accounts Import Results</h1>
                    <p className="results-subtitle">Import process completed</p>

                    {/* Status Messages */}
                    {isError && (
                        <div className="error-banner">
                            <span className="error-icon">❌</span>
                            {message || error || 'Import failed'}
                        </div>
                    )}
                    {warning && (
                        <div className="warning-banner">
                            <span className="warning-icon">⚠️</span>
                            {message || warning}
                        </div>
                    )}
                    {!isError && !warning && message && (
                        <div className="success-banner">
                            <span className="success-icon">✅</span>
                            {message}
                        </div>
                    )}
                </div>

                <div className={`summary-card ${isError || allFailed ? 'status-error' : ''} ${hasErrors ? 'status-warning' : ''} ${!isError && !hasErrors ? 'status-success' : ''}`}>
                    <div className="summary-header">
                        <div className="status-icon-large">
                            {getStatusIcon()}
                        </div>
                        <div className="summary-text">
                            <h2>{getStatusTitle()}</h2>
                            <p className="summary-description">{getStatusDescription()}</p>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="stats-grid">
                        <div className="stat-item">
                            <div className="stat-value">{total}</div>
                            <div className="stat-label">Total Rows</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value success">{success}</div>
                            <div className="stat-label">Successful</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value error">{errors?.length || 0}</div>
                            <div className="stat-label">Errors</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value skipped">{skipped || 0}</div>
                            <div className="stat-label">Skipped</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {!noData && (
                        <div className="progress-section">
                            <div className="progress-header">
                                <span>Success Rate</span>
                                <span>{successRate || 0}%</span>
                            </div>
                            <div className="progress-container">
                                <div
                                    className={`progress-bar ${isError || allFailed ? 'error' : hasErrors ? 'warning' : 'success'}`}
                                    style={{ width: `${successRate || 0}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Imported Accounts Section */}
                    {importedAccounts.length > 0 && (
                        <div className="imported-section">
                            <div className="section-header">
                                <h3>✅ Imported Accounts ({importedAccounts.length})</h3>
                            </div>
                            <div className="accounts-table-container">
                                <table className="accounts-table">
                                    <thead>
                                        <tr>
                                            <th>Unique #</th>
                                            <th>Account Name</th>
                                            <th>Company Group</th>
                                            <th>Contact Info</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importedAccounts.slice(0, 10).map((account, index) => (
                                            <tr key={account.id || index}>
                                                <td className="unique-number">{account.uniqueNumber}</td>
                                                <td className="account-name">{account.name}</td>
                                                <td className="company-group">{account.companyGroup}</td>
                                                <td className="contact-info">
                                                    {account.phone && <div>📞 {account.phone}</div>}
                                                    {account.email && <div>✉️ {account.email}</div>}
                                                    {account.address && <div>📍 {account.address}</div>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {importedAccounts.length > 10 && (
                                    <div className="table-note">
                                        <p>Showing first 10 accounts. Total {importedAccounts.length} accounts imported.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Error Section */}
                    {hasErrors && (
                        <div className="error-section">
                            <div className="section-header">
                                <h3>❌ Import Errors ({errors.length})</h3>
                                <button onClick={downloadErrorCSV} className="download-errors-btn">
                                    📥 Download Error Report (CSV)
                                </button>
                            </div>

                            <div className="error-list">
                                {errors.slice(0, 50).map((error, index) => (
                                    <div key={index} className="error-item">
                                        <div className="error-header-row">
                                            <strong className="error-row">Row {error.row}</strong>
                                            <span className="error-badge">Error</span>
                                        </div>
                                        <p className="error-message">{error.message}</p>
                                        {error.data && (
                                            <div className="error-data">
                                                <div className="error-data-grid">
                                                    {error.data.name && (
                                                        <div className="data-item">
                                                            <span className="data-label">Account:</span>
                                                            <span className="data-value">{error.data.name}</span>
                                                        </div>
                                                    )}
                                                    {error.data.companyGroup && (
                                                        <div className="data-item">
                                                            <span className="data-label">Group:</span>
                                                            <span className="data-value">{error.data.companyGroup}</span>
                                                        </div>
                                                    )}
                                                    {error.data.phone && (
                                                        <div className="data-item">
                                                            <span className="data-label">Phone:</span>
                                                            <span className="data-value">{error.data.phone}</span>
                                                        </div>
                                                    )}
                                                    {error.data.email && (
                                                        <div className="data-item">
                                                            <span className="data-label">Email:</span>
                                                            <span className="data-value">{error.data.email}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {errors.length > 50 && (
                                    <div className="error-limit-note">
                                        <p>Showing first 50 errors. Download the full report to see all {errors.length} errors.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Success Section */}
                    {!hasErrors && !isError && success > 0 && (
                        <div className="success-section">
                            <div className="success-icon">🎉</div>
                            <h3>Import Completed Successfully!</h3>
                            <p>All {success} accounts have been imported without any errors.</p>
                        </div>
                    )}

                    {/* No Data Section */}
                    {noData && (
                        <div className="no-data-section">
                            <div className="no-data-icon">📄</div>
                            <h3>No Data Found</h3>
                            <p>The uploaded file doesn't contain any valid data to import. Please check the file format and try again.</p>
                        </div>
                    )}
                </div>

                {/* Available Groups Info */}
                {summary.availableGroups && summary.availableGroups.length > 0 && (
                    <div className="available-groups-info">
                        <h4>Available Company Groups</h4>
                        <div className="groups-tags">
                            {summary.availableGroups.map((group, index) => (
                                <span key={index} className="group-tag">
                                    {group}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="action-buttons">
                    <button onClick={() => navigate('/retailer/accounts-import')} className="back-btn secondary">
                        ← Import Another File
                    </button>
                    {!isError && success > 0 && (
                        <button onClick={() => navigate('/retailer/accounts')} className="view-accounts-btn primary">
                            View Accounts in System →
                        </button>
                    )}
                    {hasErrors && (
                        <button onClick={downloadErrorCSV} className="download-btn secondary">
                            📥 Download Error Report
                        </button>
                    )}
                </div>

                {/* Summary Info */}
                <div className="summary-info">
                    <div className="info-item">
                        <strong>Company:</strong> {summary?.company || 'N/A'}
                    </div>
                    <div className="info-item">
                        <strong>Fiscal Year:</strong> {summary?.fiscalYear || 'N/A'}
                    </div>
                    <div className="info-item">
                        <strong>File:</strong> {summary?.fileName || 'N/A'}
                    </div>
                    <div className="info-item">
                        <strong>Import Date:</strong> {new Date(summary?.importDate || Date.now()).toLocaleString()}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AccountsImportResults;