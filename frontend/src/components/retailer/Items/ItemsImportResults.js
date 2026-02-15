// import React from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import '../../../stylesheet/retailer/Items/ItemsImportResults.css';

// const ItemsImportResults = () => {
//     const location = useLocation();
//     const navigate = useNavigate();
//     const results = location.state?.results;

//     if (!results) {
//         return (
//             <div className="results-container">
//                 <div className="error-state">
//                     <h2>No import results found</h2>
//                     <p>Please go back and try importing again.</p>
//                     <button onClick={() => navigate('/retailer/items-import')} className="back-btn">
//                         Back to Import
//                     </button>
//                 </div>
//             </div>
//         );
//     }

//     const { success, total, errors = [] } = results;
//     const successRate = total > 0 ? (success / total) * 100 : 0;
//     const hasErrors = errors.length > 0;

//     const downloadErrorCSV = () => {
//         const csvContent = "data:text/csv;charset=utf-8," 
//             + "Row,Error Message,Data\n" 
//             + errors.map(e => `${e.row},"${e.message}","${JSON.stringify(e.data || '')}"`).join("\n");

//         const encodedUri = encodeURI(csvContent);
//         const link = document.createElement("a");
//         link.setAttribute("href", encodedUri);
//         link.setAttribute("download", "import_errors.csv");
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//     };

//     return (
//         <div className="results-container">
//             <div className="results-header">
//                 <h1>📊 Import Results</h1>
//             </div>

//             <div className="summary-card">
//                 <div className="summary-header">
//                     <div className="status-icon">
//                         {hasErrors ? (
//                             <span className="icon-warning">⚠️</span>
//                         ) : (
//                             <span className="icon-success">✅</span>
//                         )}
//                     </div>
//                     <div className="summary-text">
//                         <h2>{success} / {total} items imported successfully</h2>
//                         <p className="summary-subtitle">
//                             Process completed with {errors.length} error{errors.length !== 1 ? 's' : ''}
//                         </p>
//                     </div>
//                 </div>

//                 <div className="progress-container">
//                     <div 
//                         className={`progress-bar ${hasErrors ? 'progress-warning' : 'progress-success'}`}
//                         style={{ width: `${successRate}%` }}
//                     ></div>
//                 </div>

//                 {hasErrors ? (
//                     <div className="error-section">
//                         <div className="error-header">
//                             <h3>❌ Error Details ({errors.length})</h3>
//                             <button onClick={downloadErrorCSV} className="download-errors-btn">
//                                 📥 Download Error Report
//                             </button>
//                         </div>

//                         <div className="error-list">
//                             {errors.map((error, index) => (
//                                 <div key={index} className="error-item">
//                                     <div className="error-header-row">
//                                         <strong className="error-row">Row {error.row}</strong>
//                                         <small className="error-date">
//                                             {new Date().toLocaleDateString()}
//                                         </small>
//                                     </div>
//                                     <p className="error-message">{error.message}</p>
//                                     {error.data && (
//                                         <div className="error-data">
//                                             <strong>Data:</strong> {JSON.stringify(error.data)}
//                                         </div>
//                                     )}
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 ) : (
//                     <div className="success-section">
//                         <div className="success-icon">🎉</div>
//                         <h3>Perfect import!</h3>
//                         <p>All items were successfully imported without any errors.</p>
//                     </div>
//                 )}
//             </div>

//             <div className="action-buttons">
//                 <button onClick={() => navigate('/retailer/items-import')} className="back-btn">
//                     ← Back to Import
//                 </button>
//             </div>
//         </div>
//     );
// };

// export default ItemsImportResults;

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

    if (!results) {
        return (
            <div className="results-container">
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

    const { success, total, errors = [], processed, skipped, successRate } = results.results || results;
    const hasErrors = errors && errors.length > 0;
    const allFailed = success === 0 && hasErrors;
    const allSkipped = success === 0 && (!errors || errors.length === 0) && skipped > 0;
    const noData = total === 0;

    const downloadErrorCSV = () => {
        if (!errors || errors.length === 0) return;

        const headers = ['Row', 'Error Message', 'Item Name', 'Company', 'Category', 'Main Unit', 'Unit'];
        const csvRows = errors.map(error => [
            error.row,
            `"${error.message}"`,
            `"${error.data?.name || 'N/A'}"`,
            `"${error.data?.company || 'N/A'}"`,
            `"${error.data?.category || 'N/A'}"`,
            `"${error.data?.mainunit || 'N/A'}"`,
            `"${error.data?.unit || 'N/A'}"`
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
        if (hasErrors) return `${success} items imported, ${errors.length} items failed.`;
        return `All ${success} items were imported successfully!`;
    };

    return (
        <div>
            <Header />
            <div className="results-container">
                <div className="results-header">
                    <h1>📊 Import Results</h1>
                    <p className="results-subtitle">Import process completed</p>
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
                                {errors.slice(0, 50).map((error, index) => ( // Limit to first 50 errors
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
                                                            <span className="data-label">Item:</span>
                                                            <span className="data-value">{error.data.name}</span>
                                                        </div>
                                                    )}
                                                    {error.data.company && (
                                                        <div className="data-item">
                                                            <span className="data-label">Company:</span>
                                                            <span className="data-value">{error.data.company}</span>
                                                        </div>
                                                    )}
                                                    {error.data.category && (
                                                        <div className="data-item">
                                                            <span className="data-label">Category:</span>
                                                            <span className="data-value">{error.data.category}</span>
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
                            <p>All {success} items have been imported without any errors.</p>
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
                    {!isError && success > 0 && (
                        <button onClick={() => navigate('/retailer/items')} className="view-items-btn primary">
                            View Items in Inventory →
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
                        <strong>Company:</strong> {results.summary?.company || 'N/A'}
                    </div>
                    <div className="info-item">
                        <strong>Fiscal Year:</strong> {results.summary?.fiscalYear || 'N/A'}
                    </div>
                    <div className="info-item">
                        <strong>File:</strong> {results.summary?.fileName || 'N/A'}
                    </div>
                    <div className="info-item">
                        <strong>Import Date:</strong> {new Date(results.summary?.importDate || Date.now()).toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemsImportResults;