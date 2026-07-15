// import React, { useState, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import '../../../stylesheet/retailer/Items/ItemsImport.css';
// import Header from '../Header';

// // Create axios instance with your base URL
// const api = axios.create({
//     baseURL: process.env.REACT_APP_API_BASE_URL,
//     withCredentials: true,
// });

// const ItemsImport = () => {
//     const [selectedFile, setSelectedFile] = useState(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const [isDownloading, setIsDownloading] = useState(false);
//     const [dragActive, setDragActive] = useState(false);
//     const [uploadError, setUploadError] = useState(null);
//     const [uploadSuccess, setUploadSuccess] = useState(null);
//     const fileInputRef = useRef(null);
//     const navigate = useNavigate();

//     const handleFileSelect = (file) => {
//         setUploadError(null); // Clear previous errors
//         setUploadSuccess(null); // Clear previous success

//         if (file) {
//             const validTypes = [
//                 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//                 'application/vnd.ms-excel'
//             ];

//             if (validTypes.includes(file.type)) {
//                 setSelectedFile(file);
//             } else {
//                 setUploadError('Please select a valid Excel file (.xlsx)');
//                 setSelectedFile(null);
//             }
//         }
//     };

//     const handleFileChange = (e) => {
//         if (e.target.files && e.target.files[0]) {
//             handleFileSelect(e.target.files[0]);
//         }
//     };

//     const handleDrag = (e) => {
//         e.preventDefault();
//         e.stopPropagation();
//         if (e.type === "dragenter" || e.type === "dragover") {
//             setDragActive(true);
//         } else if (e.type === "dragleave") {
//             setDragActive(false);
//         }
//     };

//     const handleDrop = (e) => {
//         e.preventDefault();
//         e.stopPropagation();
//         setDragActive(false);

//         if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//             handleFileSelect(e.dataTransfer.files[0]);
//         }
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setUploadError(null);
//         setUploadSuccess(null);

//         if (!selectedFile) {
//             setUploadError('Please select a file to upload');
//             return;
//         }

//         if (selectedFile.size > 5 * 1024 * 1024) {
//             setUploadError('File size must be less than 5MB');
//             return;
//         }

//         setIsLoading(true);

//         const formData = new FormData();
//         formData.append('excelFile', selectedFile);

//         try {
//             const response = await api.post('/api/retailer/items-import', formData, {
//                 headers: {
//                     'Content-Type': 'multipart/form-data',
//                 },
//                 timeout: 30000, // 30 seconds timeout
//             });

//             // Handle different response scenarios
//             if (response.data.success) {
//                 // Successful import (full or partial)
//                 navigate('/retailer/import-results', {
//                     state: {
//                         results: response.data.data,
//                         message: response.data.message,
//                         warning: response.data.warning,
//                         code: response.data.code
//                     }
//                 });
//             } else {
//                 // Failed import - show error message
//                 setUploadError(response.data.message || 'Import failed');
//             }
//         } catch (error) {
//             console.error('Upload error:', error);

//             // Handle different error responses
//             if (error.response && error.response.data) {
//                 const errorData = error.response.data;

//                 // If it's an import error with data, navigate to results page
//                 if (errorData.data && errorData.data.results) {
//                     navigate('/retailer/import-results', {
//                         state: {
//                             results: errorData.data,
//                             message: errorData.message,
//                             error: errorData.error,
//                             code: errorData.code,
//                             isError: true
//                         }
//                     });
//                     return;
//                 }

//                 // Show error message to user
//                 setUploadError(errorData.message || errorData.error || 'Upload failed. Please try again.');
//             } else if (error.code === 'ECONNABORTED') {
//                 setUploadError('Request timeout. Please try again with a smaller file.');
//             } else if (error.message === 'Network Error') {
//                 setUploadError('Network error. Please check your connection and try again.');
//             } else {
//                 setUploadError('Upload failed. Please try again.');
//             }
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const downloadTemplate = async () => {
//         setIsDownloading(true);
//         setUploadError(null);

//         try {
//             const response = await api.get('/api/retailer/import-template', {
//                 responseType: 'blob',
//             });

//             // Create blob from response
//             const blob = new Blob([response.data], {
//                 type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//             });

//             // Create download link
//             const url = window.URL.createObjectURL(blob);
//             const link = document.createElement('a');
//             link.href = url;
//             link.download = 'Inventory-Import-Template.xlsx';
//             document.body.appendChild(link);
//             link.click();
//             document.body.removeChild(link);
//             window.URL.revokeObjectURL(url);

//         } catch (error) {
//             console.error('Download error:', error);

//             if (error.response && error.response.data) {
//                 setUploadError('Download failed: ' + (error.response.data.message || 'Unknown error'));
//             } else {
//                 setUploadError('Download failed. Please try again.');
//             }
//         } finally {
//             setIsDownloading(false);
//         }
//     };

//     const clearFile = () => {
//         setSelectedFile(null);
//         setUploadError(null);
//         setUploadSuccess(null);
//         if (fileInputRef.current) {
//             fileInputRef.current.value = '';
//         }
//     };

//     return (
//         <div>
//             <Header />

//             <div className="import-container">
//                 <div className="import-card">
//                     <h1>📥 Import Inventory From Excel</h1>

//                     <div className="instructions">
//                         <p>Upload an Excel (.xlsx) file to import items into your inventory. Ensure your file follows these guidelines:</p>
//                         <ul>
//                             <li>Use the provided template format</li>
//                             <li>Maximum file size: 5MB</li>
//                             <li>Required columns: Name, HSCode, ItemsCompany, Category, MainUnit, Unit, VatStatus, Company</li>
//                             <li>Make sure reference data (categories, units, companies) exists in the system</li>
//                         </ul>
//                     </div>

//                     {/* Error Alert */}
//                     {uploadError && (
//                         <div className="alert alert-error">
//                             <div className="alert-icon">❌</div>
//                             <div className="alert-content">
//                                 <strong>Error:</strong> {uploadError}
//                             </div>
//                             <button className="alert-close" onClick={() => setUploadError(null)}>×</button>
//                         </div>
//                     )}

//                     {/* Success Alert */}
//                     {uploadSuccess && (
//                         <div className="alert alert-success">
//                             <div className="alert-icon">✅</div>
//                             <div className="alert-content">
//                                 <strong>Success:</strong> {uploadSuccess}
//                             </div>
//                             <button className="alert-close" onClick={() => setUploadSuccess(null)}>×</button>
//                         </div>
//                     )}

//                     <form onSubmit={handleSubmit} className="import-form">
//                         <div className="upload-section">
//                             <div
//                                 className={`file-drop-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'file-selected' : ''}`}
//                                 onDragEnter={handleDrag}
//                                 onDragLeave={handleDrag}
//                                 onDragOver={handleDrag}
//                                 onDrop={handleDrop}
//                                 onClick={() => fileInputRef.current?.click()}
//                             >
//                                 <input
//                                     ref={fileInputRef}
//                                     type="file"
//                                     accept=".xlsx,.xls"
//                                     onChange={handleFileChange}
//                                     style={{ display: 'none' }}
//                                 />
//                                 <div className="file-upload-content">
//                                     <div className="upload-icon">
//                                         {selectedFile ? '📄' : '📁'}
//                                     </div>
//                                     <p className="upload-text">
//                                         {selectedFile ? (
//                                             <span className="file-name">{selectedFile.name}</span>
//                                         ) : (
//                                             'Choose file or drag and drop here'
//                                         )}
//                                     </p>
//                                     <span className="file-hint">
//                                         {selectedFile ?
//                                             `Size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` :
//                                             'Excel files only (.xlsx, .xls) - Max 5MB'
//                                         }
//                                     </span>
//                                     {selectedFile && (
//                                         <button
//                                             type="button"
//                                             className="clear-file-btn"
//                                             onClick={(e) => {
//                                                 e.stopPropagation();
//                                                 clearFile();
//                                             }}
//                                         >
//                                             Remove
//                                         </button>
//                                     )}
//                                 </div>
//                             </div>

//                             <button
//                                 type="submit"
//                                 className={`submit-btn ${isLoading ? 'loading' : ''}`}
//                                 disabled={isLoading || !selectedFile}
//                             >
//                                 {isLoading ? (
//                                     <>
//                                         <span className="spinner"></span>
//                                         Processing...
//                                     </>
//                                 ) : (
//                                     'Start Import ➤'
//                                 )}
//                             </button>
//                         </div>
//                     </form>

//                     <div className="template-section">
//                         <div className="template-card">
//                             <h5>📑 Download Import Template</h5>
//                             <p>Ensure successful imports by using our pre-formatted template with all required columns and sample data.</p>

//                             <button
//                                 onClick={downloadTemplate}
//                                 className="template-btn"
//                                 disabled={isDownloading}
//                             >
//                                 {isDownloading ? (
//                                     <>
//                                         <span className="spinner small"></span>
//                                         Downloading...
//                                     </>
//                                 ) : (
//                                     '📥 Download Excel Template'
//                                 )}
//                             </button>

//                             <div className="template-info">
//                                 <span>File format: .xlsx (Excel) | Size: ~13KB | Includes instructions</span>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default ItemsImport;

//-------------------------------------------------------------end

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaInfoCircle } from 'react-icons/fa';
import '../../../stylesheet/retailer/Items/ItemsImport.css';
import Header from '../Header';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';

const ItemsImport = () => {
    const navigate = useNavigate();
    const { draftSave, setDraftSave } = usePageNotRefreshContext();
    
    const [pageData, setPageData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    
    const fileInputRef = useRef(null);

    // Create axios instance with JWT token
    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    // Add authorization header to all requests
    api.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Fetch page data on component mount
    useEffect(() => {
        const fetchPageData = async () => {
            try {
                setIsLoading(true);
                const response = await api.get('/api/retailer/items-import');

                if (response.data.success) {
                    setPageData(response.data.data);
                    
                    // Save to draft context
                    setDraftSave({
                        ...draftSave,
                        itemsImportData: {
                            company: response.data.data.company,
                            currentFiscalYear: response.data.data.currentFiscalYear,
                            categories: response.data.data.categories,
                            itemCompanies: response.data.data.itemCompanies,
                            units: response.data.data.units,
                            mainUnits: response.data.data.mainUnits
                        }
                    });
                } else {
                    setError(response.data.message || 'Failed to load page data');
                }
            } catch (error) {
                console.error('Error fetching page data:', error);
                if (error.response && error.response.data) {
                    setError(error.response.data.message || 'Failed to load import page');
                } else {
                    setError('Network error. Please try again.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchPageData();
    }, []);

    const handleFileSelect = (file) => {
        if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.type === 'application/vnd.ms-excel')) {
            setSelectedFile(file);
            setError(null);
            setImportProgress(0);
        } else {
            setError('Please select a valid Excel file (.xlsx)');
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            setError('Please select a file to upload');
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB');
            return;
        }

        setIsUploading(true);
        setError(null);
        setImportProgress(10);

        const formData = new FormData();
        formData.append('excelFile', selectedFile);

        try {
            setImportProgress(30);
            const response = await api.post('/api/retailer/items-import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            setImportProgress(100);

            if (response.data.success) {
                navigate('/retailer/import-results', {
                    state: {
                        results: response.data.data,
                        message: response.data.message,
                        warning: response.data.warning,
                        code: response.data.code,
                        importType: 'items'
                    }
                });
            } else {
                setError(response.data.message || 'Import failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            setImportProgress(0);
            
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                setError(errorData.message || 'Upload failed. Please try again.');

                // If it's an import error with data, navigate to results page
                if (errorData.data && errorData.data.results) {
                    navigate('/retailer/import-results', {
                        state: {
                            results: errorData.data,
                            message: errorData.message,
                            error: errorData.error,
                            code: errorData.code,
                            isError: true,
                            importType: 'items'
                        }
                    });
                    return;
                }
            } else {
                setError('Upload failed. Please try again.');
            }
        } finally {
            setIsUploading(false);
        }
    };

    const downloadTemplate = async () => {
        try {
            const response = await api.get('/api/retailer/items-import-template', {
                responseType: 'blob',
            });

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'Items-Import-Template.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Download error:', error);
            setError('Download failed. Please try again.');
        }
    };

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                const nextField = document.getElementById(nextFieldId);
                if (nextField) {
                    nextField.focus();
                }
            }
        }
    };

    // Reset file selection
    const handleClearFile = () => {
        setSelectedFile(null);
        setImportProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (isLoading) {
        return (
            <div className="container-fluid">
                <Header />
                <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
                    <div className="text-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-3 text-muted">Loading import page...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !pageData) {
        return (
            <div className="container-fluid">
                <Header />
                <div className="container py-5">
                    <div className="card shadow-sm">
                        <div className="card-body text-center py-5">
                            <div className="display-1 text-danger mb-3">❌</div>
                            <h3 className="mb-3">Failed to Load Page</h3>
                            <p className="text-muted">{error}</p>
                            <button 
                                onClick={() => window.location.reload()} 
                                className="btn btn-primary"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <Header />
            
            <div className="container py-3">
                {/* Page Header */}
                <div className="card shadow-sm border-0 mb-4">
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center flex-wrap">
                            <div>
                                <h4 className="mb-1 fw-bold">
                                    <span className="me-2">📥</span> Import Items
                                </h4>
                                <small className="text-muted">
                                    Upload Excel file to import items in bulk
                                </small>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                                <div className="text-end">
                                    <div className="small text-muted">Company</div>
                                    <div className="fw-semibold">{pageData?.currentCompany?.name || 'N/A'}</div>
                                </div>
                                <div className="text-end">
                                    <div className="small text-muted">Fiscal Year</div>
                                    <div className="fw-semibold">{pageData?.currentFiscalYear?.name || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="card shadow-sm border-0 mb-4">
                    <div className="card-body">
                        <h6 className="fw-bold mb-3">
                            <FaInfoCircle className="me-2 text-primary" />
                            Guidelines
                        </h6>
                        <ul className="small text-muted mb-0 ps-3">
                            <li>Use the provided template format for successful import</li>
                            <li>Maximum file size: <strong>5MB</strong></li>
                            <li>Required columns: <strong>Item Name*, Category Name*, Items Company Name*, Unit Name*, VAT Status*</strong></li>
                            <li>Reference data (categories, item companies, units) must already exist in the system</li>
                            <li>VAT Status must be: <strong>'vatable'</strong> or <strong>'vatExempt'</strong></li>
                            <li>Status must be: <strong>'active'</strong> or <strong>'inactive'</strong> (defaults to 'active')</li>
                        </ul>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                        <div className="d-flex align-items-start">
                            <span className="me-2">❌</span>
                            <div>
                                <strong>Error:</strong> {error}
                            </div>
                        </div>
                        <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                    </div>
                )}

                {/* Upload Section */}
                <div className="card shadow-sm border-0 mb-4">
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div
                                className={`border-2 border-dashed rounded-3 p-4 text-center ${dragActive ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'} ${selectedFile ? 'bg-success bg-opacity-10 border-success' : ''}`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                                
                                <div className="py-3">
                                    <div className="display-4 mb-2">
                                        {selectedFile ? '📄' : '📁'}
                                    </div>
                                    <h6 className="mb-2">
                                        {selectedFile ? (
                                            <span className="text-success">{selectedFile.name}</span>
                                        ) : (
                                            'Choose file or drag and drop here'
                                        )}
                                    </h6>
                                    <small className="text-muted">
                                        {selectedFile ? (
                                            `Size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                                        ) : (
                                            'Excel files only (.xlsx, .xls) - Max 5MB'
                                        )}
                                    </small>
                                    {selectedFile && (
                                        <div className="mt-2">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleClearFile();
                                                }}
                                            >
                                                Remove File
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Import Progress */}
                            {isUploading && (
                                <div className="mt-3">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <small className="text-muted">Processing...</small>
                                        <small className="text-muted">{importProgress}%</small>
                                    </div>
                                    <div className="progress" style={{ height: '8px' }}>
                                        <div 
                                            className="progress-bar progress-bar-striped progress-bar-animated" 
                                            role="progressbar" 
                                            style={{ width: `${importProgress}%` }}
                                            aria-valuenow={importProgress} 
                                            aria-valuemin="0" 
                                            aria-valuemax="100"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="d-flex gap-3 mt-4">
                                <button
                                    type="submit"
                                    className={`btn btn-primary ${isUploading ? 'disabled' : ''}`}
                                    disabled={isUploading || !selectedFile}
                                >
                                    {isUploading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Importing...
                                        </>
                                    ) : (
                                        'Start Import'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={downloadTemplate}
                                >
                                    📥 Download Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Available Reference Data */}
                {pageData && (
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h6 className="fw-bold mb-3">Available Reference Data</h6>
                            <div className="row">
                                {pageData.categories && pageData.categories.length > 0 && (
                                    <div className="col-md-3 mb-2">
                                        <small className="text-muted d-block">Categories</small>
                                        <div className="d-flex flex-wrap gap-1">
                                            {pageData.categories.slice(0, 5).map(cat => (
                                                <span key={cat.id} className="badge bg-secondary bg-opacity-10 text-secondary p-2">
                                                    {cat.name}
                                                </span>
                                            ))}
                                            {pageData.categories.length > 5 && (
                                                <span className="badge bg-secondary bg-opacity-10 text-secondary p-2">
                                                    +{pageData.categories.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {pageData.itemCompanies && pageData.itemCompanies.length > 0 && (
                                    <div className="col-md-3 mb-2">
                                        <small className="text-muted d-block">Item Companies</small>
                                        <div className="d-flex flex-wrap gap-1">
                                            {pageData.itemCompanies.slice(0, 5).map(ic => (
                                                <span key={ic.id} className="badge bg-secondary bg-opacity-10 text-secondary p-2">
                                                    {ic.name}
                                                </span>
                                            ))}
                                            {pageData.itemCompanies.length > 5 && (
                                                <span className="badge bg-secondary bg-opacity-10 text-secondary p-2">
                                                    +{pageData.itemCompanies.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {pageData.units && pageData.units.length > 0 && (
                                    <div className="col-md-3 mb-2">
                                        <small className="text-muted d-block">Units</small>
                                        <div className="d-flex flex-wrap gap-1">
                                            {pageData.units.slice(0, 5).map(unit => (
                                                <span key={unit.id} className="badge bg-secondary bg-opacity-10 text-secondary p-2">
                                                    {unit.name}
                                                </span>
                                            ))}
                                            {pageData.units.length > 5 && (
                                                <span className="badge bg-secondary bg-opacity-10 text-secondary p-2">
                                                    +{pageData.units.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {pageData.mainUnits && pageData.mainUnits.length > 0 && (
                                    <div className="col-md-3 mb-2">
                                        <small className="text-muted d-block">Main Units</small>
                                        <div className="d-flex flex-wrap gap-1">
                                            {pageData.mainUnits.slice(0, 5).map(mu => (
                                                <span key={mu.id} className="badge bg-secondary bg-opacity-10 text-secondary p-2">
                                                    {mu.name}
                                                </span>
                                            ))}
                                            {pageData.mainUnits.length > 5 && (
                                                <span className="badge bg-secondary bg-opacity-10 text-secondary p-2">
                                                    +{pageData.mainUnits.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ItemsImport;