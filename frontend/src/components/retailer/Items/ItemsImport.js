

// import React, { useState, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import '../../../stylesheet/retailer/Items/ItemsImport.css';

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
//     const fileInputRef = useRef(null);
//     const navigate = useNavigate();

//     const handleFileSelect = (file) => {
//         if (file && file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
//             setSelectedFile(file);
//         } else {
//             alert('Please select a valid Excel file (.xlsx)');
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

//         if (!selectedFile) {
//             alert('Please select a file to upload');
//             return;
//         }

//         if (selectedFile.size > 5 * 1024 * 1024) {
//             alert('File size must be less than 5MB');
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
//             });

//             if (response.data.success) {
//                 navigate('/retailer/import-results', { state: { results: response.data.data } });
//             } else {
//                 alert(response.data.error || 'Import failed');
//             }
//         } catch (error) {
//             console.error('Upload error:', error);
//             alert('Upload failed. Please try again.');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const downloadTemplate = async () => {
//         setIsDownloading(true);

//         try {
//             // Method 1: Using your axios instance to construct the full URL
//             const fullUrl = api.defaults.baseURL + '/api/retailer/import-template';
//             console.log('Download URL:', fullUrl);
//             window.open(fullUrl, '_blank');

//         } catch (error) {
//             console.error('Download error:', error);
//             alert('Download failed. Please try again.');
//         } finally {
//             setIsDownloading(false);
//         }
//     };

//     // Alternative method using axios blob download (more controlled)
//     const downloadTemplateWithAxios = async () => {
//         setIsDownloading(true);

//         try {
//             const response = await api.get('/api/retailer/import-template', {
//                 responseType: 'blob', // Important for file downloads
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

//             console.log('Template downloaded successfully');

//         } catch (error) {
//             console.error('Download error:', error);
//             alert('Download failed. Please try again.');
//         } finally {
//             setIsDownloading(false);
//         }
//     };

//     return (
//         <div className="import-container">
//             <div className="import-card">
//                 <h1>📥 Import Inventory From Excel</h1>

//                 <div className="instructions">
//                     <p>Upload an Excel (.xlsx) file to import items into your inventory. Ensure your file follows these guidelines:</p>
//                     <ul>
//                         <li>Use the provided template format</li>
//                         <li>Maximum file size: 5MB</li>
//                         <li>Supported columns: Item Name, HSCode, Category, Main Unit, Unit, Vat Status, Fiscal Year, Company</li>
//                     </ul>
//                 </div>

//                 <form onSubmit={handleSubmit} className="import-form">
//                     <div className="upload-section">
//                         <div 
//                             className={`file-drop-zone ${dragActive ? 'drag-active' : ''}`}
//                             onDragEnter={handleDrag}
//                             onDragLeave={handleDrag}
//                             onDragOver={handleDrag}
//                             onDrop={handleDrop}
//                             onClick={() => fileInputRef.current?.click()}
//                         >
//                             <input 
//                                 ref={fileInputRef}
//                                 type="file" 
//                                 accept=".xlsx" 
//                                 onChange={handleFileChange}
//                                 style={{ display: 'none' }}
//                             />
//                             <div className="file-upload-content">
//                                 <div className="upload-icon">📁</div>
//                                 <p className="upload-text">
//                                     {selectedFile ? selectedFile.name : 'Choose file or drag and drop here'}
//                                 </p>
//                                 <span className="file-hint">Excel .xlsx files only (Max 5MB)</span>
//                             </div>
//                         </div>

//                         <button 
//                             type="submit" 
//                             className="submit-btn"
//                             disabled={isLoading || !selectedFile}
//                         >
//                             {isLoading ? (
//                                 <>
//                                     <span className="spinner"></span>
//                                     Processing...
//                                 </>
//                             ) : (
//                                 'Start Import ➤'
//                             )}
//                         </button>
//                     </div>
//                 </form>

//                 <div className="template-section">
//                     <div className="template-card">
//                         <h5>📑 Download Import Template</h5>
//                         <p>Ensure successful imports by using our pre-formatted template</p>

//                         {/* Simple window.open method */}
//                         <button 
//                             onClick={downloadTemplate} 
//                             className="template-btn"
//                             disabled={isDownloading}
//                         >
//                             {isDownloading ? '⏳ Downloading...' : '📥 Download Excel Template'}
//                         </button>

//                         {/* Optional: Advanced Axios download method */}
//                         {/* <button 
//                             onClick={downloadTemplateWithAxios} 
//                             className="template-btn"
//                             disabled={isDownloading}
//                             style={{ marginTop: '10px', backgroundColor: '#27ae60' }}
//                         >
//                             {isDownloading ? '⏳ Downloading...' : '📥 Download (Axios)'}
//                         </button> */}

//                         <div className="template-info">
//                             <span>File format: .xlsx (Excel) | Size: ~13KB</span>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default ItemsImport;

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../../stylesheet/retailer/Items/ItemsImport.css';
import Header from '../Header';

// Create axios instance with your base URL
const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
});

const ItemsImport = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const handleFileSelect = (file) => {
        setUploadError(null); // Clear previous errors
        setUploadSuccess(null); // Clear previous success

        if (file) {
            const validTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel'
            ];

            if (validTypes.includes(file.type)) {
                setSelectedFile(file);
            } else {
                setUploadError('Please select a valid Excel file (.xlsx)');
                setSelectedFile(null);
            }
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
        setUploadError(null);
        setUploadSuccess(null);

        if (!selectedFile) {
            setUploadError('Please select a file to upload');
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            setUploadError('File size must be less than 5MB');
            return;
        }

        setIsLoading(true);

        const formData = new FormData();
        formData.append('excelFile', selectedFile);

        try {
            const response = await api.post('/api/retailer/items-import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 30000, // 30 seconds timeout
            });

            // Handle different response scenarios
            if (response.data.success) {
                // Successful import (full or partial)
                navigate('/retailer/import-results', {
                    state: {
                        results: response.data.data,
                        message: response.data.message,
                        warning: response.data.warning,
                        code: response.data.code
                    }
                });
            } else {
                // Failed import - show error message
                setUploadError(response.data.message || 'Import failed');
            }
        } catch (error) {
            console.error('Upload error:', error);

            // Handle different error responses
            if (error.response && error.response.data) {
                const errorData = error.response.data;

                // If it's an import error with data, navigate to results page
                if (errorData.data && errorData.data.results) {
                    navigate('/retailer/import-results', {
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

                // Show error message to user
                setUploadError(errorData.message || errorData.error || 'Upload failed. Please try again.');
            } else if (error.code === 'ECONNABORTED') {
                setUploadError('Request timeout. Please try again with a smaller file.');
            } else if (error.message === 'Network Error') {
                setUploadError('Network error. Please check your connection and try again.');
            } else {
                setUploadError('Upload failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const downloadTemplate = async () => {
        setIsDownloading(true);
        setUploadError(null);

        try {
            const response = await api.get('/api/retailer/import-template', {
                responseType: 'blob',
            });

            // Create blob from response
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'Inventory-Import-Template.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Download error:', error);

            if (error.response && error.response.data) {
                setUploadError('Download failed: ' + (error.response.data.message || 'Unknown error'));
            } else {
                setUploadError('Download failed. Please try again.');
            }
        } finally {
            setIsDownloading(false);
        }
    };

    const clearFile = () => {
        setSelectedFile(null);
        setUploadError(null);
        setUploadSuccess(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div>
            <Header />

            <div className="import-container">
                <div className="import-card">
                    <h1>📥 Import Inventory From Excel</h1>

                    <div className="instructions">
                        <p>Upload an Excel (.xlsx) file to import items into your inventory. Ensure your file follows these guidelines:</p>
                        <ul>
                            <li>Use the provided template format</li>
                            <li>Maximum file size: 5MB</li>
                            <li>Required columns: Name, HSCode, ItemsCompany, Category, MainUnit, Unit, VatStatus, Company</li>
                            <li>Make sure reference data (categories, units, companies) exists in the system</li>
                        </ul>
                    </div>

                    {/* Error Alert */}
                    {uploadError && (
                        <div className="alert alert-error">
                            <div className="alert-icon">❌</div>
                            <div className="alert-content">
                                <strong>Error:</strong> {uploadError}
                            </div>
                            <button className="alert-close" onClick={() => setUploadError(null)}>×</button>
                        </div>
                    )}

                    {/* Success Alert */}
                    {uploadSuccess && (
                        <div className="alert alert-success">
                            <div className="alert-icon">✅</div>
                            <div className="alert-content">
                                <strong>Success:</strong> {uploadSuccess}
                            </div>
                            <button className="alert-close" onClick={() => setUploadSuccess(null)}>×</button>
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
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
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
                                    {selectedFile && (
                                        <button
                                            type="button"
                                            className="clear-file-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                clearFile();
                                            }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className={`submit-btn ${isLoading ? 'loading' : ''}`}
                                disabled={isLoading || !selectedFile}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Processing...
                                    </>
                                ) : (
                                    'Start Import ➤'
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="template-section">
                        <div className="template-card">
                            <h5>📑 Download Import Template</h5>
                            <p>Ensure successful imports by using our pre-formatted template with all required columns and sample data.</p>

                            <button
                                onClick={downloadTemplate}
                                className="template-btn"
                                disabled={isDownloading}
                            >
                                {isDownloading ? (
                                    <>
                                        <span className="spinner small"></span>
                                        Downloading...
                                    </>
                                ) : (
                                    '📥 Download Excel Template'
                                )}
                            </button>

                            <div className="template-info">
                                <span>File format: .xlsx (Excel) | Size: ~13KB | Includes instructions</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemsImport;