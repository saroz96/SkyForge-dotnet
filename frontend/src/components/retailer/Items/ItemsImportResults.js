import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../../../stylesheet/retailer/Items/ItemsImportResults.css';
import Header from '../Header';

const ItemsImportResults = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const results = location.state?.results;
    const message = location.state?.message;
    const error = location.state?.error;
    const warning = location.state?.warning;
    const isError = location.state?.isError;
    const importType = location.state?.importType || 'items';

    if (!results) {
        return (
            <div className="results-container">
                <Header />
                <div className="error-state">
                    <div className="error-icon-large">❌</div>
                    <h2>No import results found</h2>
                    <p>The import session has expired or no data was returned. Please try importing again.</p>
                    <button onClick={() => navigate('/retailer/items-import')} className="back-btn primary">
                        ← Back to Import
                    </button>
                </div>
            </div>
        );
    }

    // Extract data from backend response structure
    const data = results.data || results;
    const resultItems = data.results || [];
    const totalProcessed = data.totalProcessed || 0;
    const successCount = data.successCount || 0;
    const failedCount = data.failedCount || 0;
    const skippedCount = data.skippedCount || 0;
    const errors = data.errors || [];
    const warnings = data.warnings || [];

    // Calculate success rate
    const successRate = totalProcessed > 0 ? Math.round((successCount / totalProcessed) * 100) : 0;

    const hasErrors = failedCount > 0 || errors.length > 0;
    const allFailed = successCount === 0 && failedCount > 0;
    const allSkipped = successCount === 0 && skippedCount > 0 && failedCount === 0;
    const noData = totalProcessed === 0;
    const hasWarnings = warnings && warnings.length > 0;

    const downloadErrorCSV = () => {
        if (!resultItems || resultItems.length === 0) return;

        const failedItems = resultItems.filter(item => item.status === 'Failed' || item.status === 'Skipped');
        if (failedItems.length === 0) return;

        const headers = ['Row', 'Item Name', 'Status', 'Error Message'];
        const csvRows = failedItems.map(item => [
            item.rowNumber || item.RowNumber || 'N/A',
            `"${item.itemName || item.ItemName || 'N/A'}"`,
            item.status || item.Status || 'N/A',
            `"${item.errorMessage || item.ErrorMessage || 'N/A'}"`
        ]);

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `import_errors_${new Date().getTime()}.csv`);
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
        if (allFailed) return 'All items failed to import. Please check the errors below.';
        if (isError) return message || error || 'The import process encountered an error.';
        if (hasErrors) return `${successCount} items imported successfully, ${failedCount} items failed, ${skippedCount} items skipped.`;
        return `All ${successCount} items were imported successfully!`;
    };

    // Get failed items for display
    const failedItems = resultItems.filter(item => item.status === 'Failed' || item.status === 'Skipped');

    return (
        <div>
            <Header />
            <div className="results-container">
                <div className="results-header">
                    <h1>📊 {importType === 'items' ? 'Items' : 'Account'} Import Results</h1>
                    <p className="results-subtitle">Import process completed</p>
                </div>

                {/* Warning Alert */}
                {hasWarnings && (
                    <div className="alert alert-warning">
                        <div className="alert-icon">⚠️</div>
                        <div className="alert-content">
                            <strong>Warnings:</strong>
                            <ul className="warning-list">
                                {warnings.slice(0, 5).map((warning, index) => (
                                    <li key={index}>{warning}</li>
                                ))}
                                {warnings.length > 5 && (
                                    <li>+ {warnings.length - 5} more warnings</li>
                                )}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Message Alert */}
                {message && (
                    <div className={`alert ${isError ? 'alert-error' : 'alert-success'}`}>
                        <div className="alert-icon">{isError ? '❌' : '✅'}</div>
                        <div className="alert-content">
                            <strong>{isError ? 'Error:' : 'Success:'}</strong> {message}
                        </div>
                    </div>
                )}

                {/* Error Alert */}
                {error && (
                    <div className="alert alert-error">
                        <div className="alert-icon">❌</div>
                        <div className="alert-content">
                            <strong>Error:</strong> {error}
                        </div>
                    </div>
                )}

                <div className={`summary-card ${isError || allFailed ? 'status-error' : ''} ${hasErrors ? 'status-warning' : ''} ${!isError && !hasErrors ? 'status-success' : ''}`}>
                    <div className="summary-header">
                        <div className="status-icon-large">
                            {getStatusIcon()}
                        </div>
                        <div className="summary-text">
                            <h2>{getStatusTitle()}</h2>
                            <p className="summary-description">{getStatusDescription()}</p>
                            {warning && (
                                <p className="warning-text">⚠️ {warning}</p>
                            )}
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="stats-grid">
                        <div className="stat-item">
                            <div className="stat-value">{totalProcessed}</div>
                            <div className="stat-label">Total Processed</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value success">{successCount}</div>
                            <div className="stat-label">Successful</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value error">{failedCount}</div>
                            <div className="stat-label">Failed</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value skipped">{skippedCount}</div>
                            <div className="stat-label">Skipped</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {totalProcessed > 0 && (
                        <div className="progress-section">
                            <div className="progress-header">
                                <span>Success Rate</span>
                                <span>{successRate}%</span>
                            </div>
                            <div className="progress-container">
                                <div
                                    className={`progress-bar ${isError || allFailed ? 'error' : hasErrors ? 'warning' : 'success'}`}
                                    style={{ width: `${successRate}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Error Section - Show failed items */}
                    {failedItems.length > 0 && (
                        <div className="error-section">
                            <div className="section-header">
                                <h3>❌ Failed Items ({failedItems.length})</h3>
                                <button onClick={downloadErrorCSV} className="download-errors-btn">
                                    📥 Download Error Report (CSV)
                                </button>
                            </div>

                            <div className="error-list">
                                {failedItems.slice(0, 50).map((item, index) => (
                                    <div key={index} className="error-item">
                                        <div className="error-header-row">
                                            <strong className="error-row">Row {item.rowNumber || item.RowNumber || 'N/A'}</strong>
                                            <span className={`error-badge ${item.status === 'Skipped' ? 'skipped-badge' : ''}`}>
                                                {item.status || item.Status || 'Failed'}
                                            </span>
                                        </div>
                                        <p className="error-message">{item.errorMessage || item.ErrorMessage || 'Unknown error'}</p>
                                        <div className="error-data">
                                            <div className="error-data-grid">
                                                <div className="data-item">
                                                    <span className="data-label">Item:</span>
                                                    <span className="data-value">{item.itemName || item.ItemName || 'N/A'}</span>
                                                </div>
                                                {item.itemId && (
                                                    <div className="data-item">
                                                        <span className="data-label">ID:</span>
                                                        <span className="data-value">{item.itemId}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {failedItems.length > 50 && (
                                    <div className="error-limit-note">
                                        <p>Showing first 50 errors. Download the full report to see all {failedItems.length} errors.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Success Section */}
                    {!hasErrors && !isError && successCount > 0 && (
                        <div className="success-section">
                            <div className="success-icon">🎉</div>
                            <h3>Import Completed Successfully!</h3>
                            <p>All {successCount} items have been imported without any errors.</p>
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

                <div className="action-buttons">
                    <button onClick={() => navigate('/retailer/items-import')} className="back-btn secondary">
                        ← Import Another File
                    </button>
                    {!isError && successCount > 0 && (
                        <button onClick={() => navigate('/retailer/items')} className="view-items-btn primary">
                            View Items in Inventory →
                        </button>
                    )}
                    {failedItems.length > 0 && (
                        <button onClick={downloadErrorCSV} className="download-btn secondary">
                            📥 Download Error Report
                        </button>
                    )}
                </div>

                {/* Summary Info */}
                {data.summary && (
                    <div className="summary-info">
                        <div className="info-item">
                            <strong>Company:</strong> {data.summary.company || 'N/A'}
                        </div>
                        <div className="info-item">
                            <strong>Fiscal Year:</strong> {data.summary.fiscalYear || 'N/A'}
                        </div>
                        <div className="info-item">
                            <strong>Total Processed:</strong> {totalProcessed}
                        </div>
                        <div className="info-item">
                            <strong>Import Date:</strong> {new Date().toLocaleString()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ItemsImportResults;