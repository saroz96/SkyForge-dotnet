import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaInfoCircle } from 'react-icons/fa';
import '../../../stylesheet/retailer/accounts/AccountsImport.css';
import Header from '../Header';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';

const AccountsImport = () => {
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
                const response = await api.get('/api/retailer/accounts-import');

                if (response.data.success) {
                    setPageData(response.data.data);
                    
                    // Save to draft context
                    setDraftSave({
                        ...draftSave,
                        accountsImportData: {
                            company: response.data.data.company,
                            currentFiscalYear: response.data.data.currentFiscalYear,
                            companyGroups: response.data.data.companyGroups
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
            const response = await api.post('/api/retailer/accounts-import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            setImportProgress(100);

            if (response.data.success) {
                navigate('/retailer/accounts-import-results', {
                    state: {
                        results: response.data.data,
                        message: response.data.message,
                        warning: response.data.warning,
                        code: response.data.code
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
                    navigate('/retailer/accounts-import-results', {
                        state: {
                            results: errorData.data,
                            message: errorData.message,
                            error: errorData.error,
                            code: errorData.code,
                            isError: true
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
            const response = await api.get('/api/retailer/accounts-import-template', {
                responseType: 'blob',
            });

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'Accounts-Import-Template.xlsx';
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
                                    <span className="me-2">📥</span> Import Accounts
                                </h4>
                                <small className="text-muted">
                                    Upload Excel file to import accounts in bulk
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
                            <li>Required columns: <strong>Account Name</strong> and <strong>Group Name</strong></li>
                            <li>Account groups must already exist in the system</li>
                            <li>Opening balance type must be <strong>Dr</strong> or <strong>Cr</strong></li>
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

                {/* Available Groups */}
                {pageData?.companyGroups && pageData.companyGroups.length > 0 && (
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h6 className="fw-bold mb-3">Available Account Groups</h6>
                            <div className="d-flex flex-wrap gap-2">
                                {pageData.companyGroups.map(group => (
                                    <span key={group.id} className="badge bg-secondary bg-opacity-10 text-secondary p-2">
                                        {group.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountsImport;