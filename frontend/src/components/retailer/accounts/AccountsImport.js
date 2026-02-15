import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../../stylesheet/retailer/accounts/AccountsImport.css';
import Header from '../Header';

// Create axios instance with your base URL
const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
});

const AccountsImport = () => {
    const [pageData, setPageData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const navigate = useNavigate();

    // Fetch page data on component mount
    useEffect(() => {
        const fetchPageData = async () => {
            try {
                setIsLoading(true);
                const response = await api.get('/api/retailer/accounts-import');

                if (response.data.success) {
                    setPageData(response.data.data);
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

        const formData = new FormData();
        formData.append('excelFile', selectedFile);

        try {
            const response = await api.post('/api/retailer/accounts-import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

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
            if (error.response && error.response.data) {
                setError(error.response.data.message || 'Upload failed. Please try again.');

                // If it's an import error with data, navigate to results page
                if (error.response.data.data && error.response.data.data.results) {
                    navigate('/retailer/accounts-import-results', {
                        state: {
                            results: error.response.data.data,
                            message: error.response.data.message,
                            error: error.response.data.error,
                            code: error.response.data.code,
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

    if (isLoading) {
        return (
            <div className="import-container">
                <div className="import-card">
                    <div className="loading-state">
                        <div className="spinner large"></div>
                        <p>Loading import page...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !pageData) {
        return (
            <div className="import-container">
                <div className="import-card">
                    <div className="error-state">
                        <div className="error-icon">❌</div>
                        <h2>Failed to Load Page</h2>
                        <p>{error}</p>
                        <button onClick={() => window.location.reload()} className="retry-btn">
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Header />
            <div className="import-container">
                <div className="import-card">
                    <div className="page-header">
                        <h1>📥 Import Accounts</h1>
                        <div className="company-info">
                            <span className="company-name">{pageData?.currentCompany?.name}</span>
                            <span className="fiscal-year">{pageData?.currentFiscalYear?.name}</span>
                        </div>
                    </div>

                    <div className="instructions">
                        <p>Upload an Excel (.xlsx) file to import accounts into your system. Ensure your file follows these guidelines:</p>
                        <ul>
                            <li>Use the provided template format</li>
                            <li>Maximum file size: 5MB</li>
                            <li>Required columns: Account Name, Code, Type, Group, etc.</li>
                            <li>Make sure reference data (account groups, types) exists in the system</li>
                        </ul>
                    </div>

                    {/* System Information */}
                    <div className="system-info">
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Company:</label>
                                <span>{pageData?.currentCompany?.name}</span>
                            </div>
                            <div className="info-item">
                                <label>Fiscal Year:</label>
                                <span>{pageData?.currentFiscalYear?.name}</span>
                            </div>
                            <div className="info-item">
                                <label>Available Groups:</label>
                                <span>{pageData?.companyGroups?.length || 0} groups</span>
                            </div>
                        </div>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="alert alert-error">
                            <div className="alert-icon">❌</div>
                            <div className="alert-content">
                                <strong>Error:</strong> {error}
                            </div>
                            <button className="alert-close" onClick={() => setError(null)}>×</button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="import-form">
                        <div className="upload-section">
                            <div
                                className={`file-drop-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'file-selected' : ''}`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                    id="file-input"
                                />
                                <label htmlFor="file-input" className="file-input-label">
                                    <div className="file-upload-content">
                                        <div className="upload-icon">
                                            {selectedFile ? '📄' : '📁'}
                                        </div>
                                        <p className="upload-text">
                                            {selectedFile ? (
                                                <span className="file-name">{selectedFile.name}</span>
                                            ) : (
                                                'Choose file or drag and drop here'
                                            )}
                                        </p>
                                        <span className="file-hint">
                                            {selectedFile ?
                                                `Size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` :
                                                'Excel files only (.xlsx, .xls) - Max 5MB'
                                            }
                                        </span>
                                    </div>
                                </label>
                                {selectedFile && (
                                    <button
                                        type="button"
                                        className="clear-file-btn"
                                        onClick={() => setSelectedFile(null)}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>

                            <button
                                type="submit"
                                className={`submit-btn ${isUploading ? 'loading' : ''}`}
                                disabled={isUploading || !selectedFile}
                            >
                                {isUploading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Processing...
                                    </>
                                ) : (
                                    'Start Accounts Import ➤'
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="template-section">
                        <div className="template-card">
                            <h5>📑 Download Accounts Import Template</h5>
                            <p>Ensure successful imports by using our pre-formatted template with all required columns and sample data.</p>

                            <button
                                onClick={downloadTemplate}
                                className="template-btn"
                            >
                                📥 Download Excel Template
                            </button>

                            <div className="template-info">
                                <span>File format: .xlsx (Excel) | Size: ~13KB | Includes instructions</span>
                            </div>
                        </div>
                    </div>

                    {/* Available Groups List */}
                    {pageData?.companyGroups && pageData.companyGroups.length > 0 && (
                        <div className="available-groups">
                            <h5>Available Account Groups</h5>
                            <div className="groups-list">
                                {pageData.companyGroups.map(group => (
                                    <span key={group.id} className="group-tag">
                                        {group.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountsImport;