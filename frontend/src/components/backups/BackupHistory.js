// // import React, { useState, useEffect, useMemo } from 'react';
// // import { useNavigate } from 'react-router-dom';
// // import axios from 'axios';
// // import NotificationToast from '../NotificationToast';

// // const BackupHistory = () => {
// //     const navigate = useNavigate();
    
// //     const [backupHistory, setBackupHistory] = useState([]);
// //     const [filteredHistory, setFilteredHistory] = useState([]);
// //     const [searchQuery, setSearchQuery] = useState('');
// //     const [currentPage, setCurrentPage] = useState(1);
// //     const [itemsPerPage, setItemsPerPage] = useState(10);
// //     const [sortConfig, setSortConfig] = useState({ key: 'backupDate', direction: 'descending' });
// //     const [isLoading, setIsLoading] = useState(true);
// //     const [notification, setNotification] = useState({
// //         show: false,
// //         message: '',
// //         type: 'success',
// //         duration: 3000
// //     });

// //     const api = useMemo(() => {
// //         const instance = axios.create({
// //             baseURL: process.env.REACT_APP_API_BASE_URL,
// //             withCredentials: true,
// //         });
// //         instance.interceptors.request.use(
// //             (config) => {
// //                 const token = localStorage.getItem('token');
// //                 if (token) config.headers.Authorization = `Bearer ${token}`;
// //                 return config;
// //             },
// //             (error) => Promise.reject(error)
// //         );
// //         return instance;
// //     }, []);

// //     useEffect(() => {
// //         fetchBackupHistory();
// //     }, []);

// //     useEffect(() => {
// //         let filtered = [...backupHistory];
// //         if (searchQuery) {
// //             filtered = filtered.filter(backup => 
// //                 backup.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
// //                 backup.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
// //             );
// //         }
// //         if (sortConfig.key) {
// //             filtered.sort((a, b) => {
// //                 let aVal = a[sortConfig.key];
// //                 let bVal = b[sortConfig.key];
// //                 if (sortConfig.key === 'backupDate') {
// //                     aVal = new Date(aVal);
// //                     bVal = new Date(bVal);
// //                 }
// //                 if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
// //                 if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
// //                 return 0;
// //             });
// //         }
// //         setFilteredHistory(filtered);
// //         setCurrentPage(1);
// //     }, [backupHistory, searchQuery, sortConfig]);

// //     const fetchBackupHistory = async () => {
// //         setIsLoading(true);
// //         try {
// //             const response = await api.get('/api/drivebackup/history');
// //             if (response.data.success) {
// //                 setBackupHistory(response.data.backups);
// //             } else {
// //                 setNotification({
// //                     show: true,
// //                     message: 'Failed to fetch backup history',
// //                     type: 'error',
// //                     duration: 3000
// //                 });
// //             }
// //         } catch (error) {
// //             console.error('Error fetching backup history:', error);
// //             setNotification({
// //                 show: true,
// //                 message: error.response?.data?.error || 'Error fetching backup history',
// //                 type: 'error',
// //                 duration: 3000
// //             });
// //         } finally {
// //             setIsLoading(false);
// //         }
// //     };

// //     const formatDate = (dateString) => {
// //         if (!dateString) return 'N/A';
// //         const date = new Date(dateString);
// //         return date.toLocaleString();
// //     };

// //     const formatFileSize = (bytes) => {
// //         if (!bytes) return '0 B';
// //         const sizes = ['B', 'KB', 'MB', 'GB'];
// //         const i = Math.floor(Math.log(bytes) / Math.log(1024));
// //         return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
// //     };

// //     const getFormatIcon = (fileName) => {
// //         if (fileName?.endsWith('.json.gz')) return '🗜️';
// //         if (fileName?.endsWith('.dump')) return '🗄️';
// //         if (fileName?.endsWith('.csv')) return '📊';
// //         return '📁';
// //     };

// //     const getFormatBadge = (fileName) => {
// //         if (fileName?.endsWith('.json.gz')) return <span className="badge bg-secondary" style={{ fontSize: '0.65rem', padding: '3px 6px' }}>Compressed</span>;
// //         if (fileName?.endsWith('.dump')) return <span className="badge bg-primary" style={{ fontSize: '0.65rem', padding: '3px 6px' }}>SQL</span>;
// //         if (fileName?.endsWith('.csv')) return <span className="badge bg-success" style={{ fontSize: '0.65rem', padding: '3px 6px' }}>CSV</span>;
// //         return <span className="badge bg-secondary" style={{ fontSize: '0.65rem', padding: '3px 6px' }}>Unknown</span>;
// //     };

// //     const sortItems = (key) => {
// //         setSortConfig(prev => ({
// //             key,
// //             direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
// //         }));
// //     };

// //     const getSortIndicator = (key) => {
// //         return sortConfig.key === key ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : '';
// //     };

// //     // Pagination
// //     const totalPages = Math.ceil(filteredHistory.length / (itemsPerPage === 'all' ? 1 : itemsPerPage));
// //     const currentPageItems = filteredHistory.slice(
// //         itemsPerPage === 'all' ? 0 : (currentPage - 1) * itemsPerPage,
// //         itemsPerPage === 'all' ? filteredHistory.length : currentPage * itemsPerPage
// //     );

// //     const handlePageChange = (newPage) => {
// //         if (itemsPerPage === 'all') return;
// //         if (newPage >= 1 && newPage <= totalPages) {
// //             setCurrentPage(newPage);
// //             window.scrollTo({ top: 0, behavior: 'smooth' });
// //         }
// //     };

// //     const exportToCSV = () => {
// //         const headers = ['Date', 'Company Name', 'File Name', 'File Size', 'Format', 'Status', 'Drive Link'];
// //         const rows = filteredHistory.map(backup => [
// //             formatDate(backup.backupDate),
// //             backup.companyName,
// //             backup.fileName,
// //             formatFileSize(backup.fileSize),
// //             backup.fileName?.endsWith('.json.gz') ? 'Compressed' : (backup.fileName?.endsWith('.dump') ? 'SQL' : (backup.fileName?.endsWith('.csv') ? 'CSV' : 'Unknown')),
// //             backup.isSuccess ? 'Success' : 'Failed',
// //             backup.googleDriveFileId ? `https://drive.google.com/file/d/${backup.googleDriveFileId}/view` : ''
// //         ]);

// //         const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
// //         const blob = new Blob([csvContent], { type: 'text/csv' });
// //         const url = window.URL.createObjectURL(blob);
// //         const a = document.createElement('a');
// //         a.href = url;
// //         a.download = `backup_history_${new Date().toISOString().split('T')[0]}.csv`;
// //         document.body.appendChild(a);
// //         a.click();
// //         document.body.removeChild(a);
// //         window.URL.revokeObjectURL(url);

// //         setNotification({
// //             show: true,
// //             message: 'Export completed successfully!',
// //             type: 'success',
// //             duration: 3000
// //         });
// //     };

// //     if (isLoading) {
// //         return (
// //             <div className="container-fluid">
// //                 <div className="container mt-4 text-center">
// //                     <div className="spinner-border text-primary" role="status">
// //                         <span className="visually-hidden">Loading...</span>
// //                     </div>
// //                     <p className="mt-2">Loading backup history...</p>
// //                 </div>
// //             </div>
// //         );
// //     }

// //     return (
// //         <div className="container-fluid">
// //             <div className="container mt-4 wow-form">
// //                 <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp">
// //                     <div className="card-header">
// //                         <div className="d-flex justify-content-between align-items-center">
// //                             <h2 className="card-title mb-0">
// //                                 <i className="bi bi-clock-history me-2"></i>
// //                                 Backup History
// //                             </h2>
// //                             <button
// //                                 className="btn btn-outline-secondary"
// //                                 onClick={() => navigate(-1)}
// //                             >
// //                                 <i className="bi bi-arrow-left me-2"></i>
// //                                 Back
// //                             </button>
// //                         </div>
// //                     </div>

// //                     <div className="card-body p-2 p-md-3">
// //                         {/* Stats Section */}
// //                         <div className="row g-2 mb-4">
// //                             <div className="col-12 col-md-3">
// //                                 <div className="alert alert-info text-center mb-0">
// //                                     <h5 className="mb-0">{backupHistory.length}</h5>
// //                                     <small>Total Backups</small>
// //                                 </div>
// //                             </div>
// //                             <div className="col-12 col-md-3">
// //                                 <div className="alert alert-success text-center mb-0">
// //                                     <h5 className="mb-0">{backupHistory.filter(b => b.isSuccess).length}</h5>
// //                                     <small>Successful</small>
// //                                 </div>
// //                             </div>
// //                             <div className="col-12 col-md-3">
// //                                 <div className="alert alert-danger text-center mb-0">
// //                                     <h5 className="mb-0">{backupHistory.filter(b => !b.isSuccess).length}</h5>
// //                                     <small>Failed</small>
// //                                 </div>
// //                             </div>
// //                             <div className="col-12 col-md-3">
// //                                 <div className="alert alert-secondary text-center mb-0">
// //                                     <h5 className="mb-0">
// //                                         {(() => {
// //                                             const uniqueCompanies = new Set(backupHistory.map(b => b.companyName));
// //                                             return uniqueCompanies.size;
// //                                         })()}
// //                                     </h5>
// //                                     <small>Companies</small>
// //                                 </div>
// //                             </div>
// //                         </div>

// //                         {/* Search and Controls */}
// //                         <div className="row g-2 mb-3">
// //                             <div className="col-12 col-md-4">
// //                                 <div className="position-relative">
// //                                     <input
// //                                         type="text"
// //                                         className="form-control form-control-sm"
// //                                         placeholder=""
// //                                         value={searchQuery}
// //                                         onChange={(e) => setSearchQuery(e.target.value)}
// //                                         autoComplete="off"
// //                                         style={{
// //                                             height: '26px',
// //                                             fontSize: '0.875rem',
// //                                             paddingTop: '0.75rem',
// //                                             width: '100%'
// //                                         }}
// //                                     />
// //                                     <label
// //                                         className="position-absolute"
// //                                         style={{
// //                                             top: '-0.5rem',
// //                                             left: '0.75rem',
// //                                             fontSize: '0.75rem',
// //                                             backgroundColor: 'white',
// //                                             padding: '0 0.25rem',
// //                                             color: '#6c757d',
// //                                             fontWeight: '500'
// //                                         }}
// //                                     >
// //                                         Search by Company or File:
// //                                     </label>
// //                                 </div>
// //                             </div>

// //                             <div className="col-12 col-md-2">
// //                                 <div className="position-relative">
// //                                     <select
// //                                         className="form-control form-control-sm"
// //                                         value={itemsPerPage}
// //                                         onChange={(e) => { setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value)); setCurrentPage(1); }}
// //                                         style={{
// //                                             height: '26px',
// //                                             fontSize: '0.875rem',
// //                                             paddingTop: '0.25rem',
// //                                             width: '100%'
// //                                         }}
// //                                     >
// //                                         <option value="10">10 per page</option>
// //                                         <option value="25">25 per page</option>
// //                                         <option value="50">50 per page</option>
// //                                         <option value="100">100 per page</option>
// //                                         <option value="all">All</option>
// //                                     </select>
// //                                     <label
// //                                         className="position-absolute"
// //                                         style={{
// //                                             top: '-0.5rem',
// //                                             left: '0.75rem',
// //                                             fontSize: '0.75rem',
// //                                             backgroundColor: 'white',
// //                                             padding: '0 0.25rem',
// //                                             color: '#6c757d',
// //                                             fontWeight: '500'
// //                                         }}
// //                                     >
// //                                         Items:
// //                                     </label>
// //                                 </div>
// //                             </div>

// //                             <div className="col-12 col-md-3">
// //                                 <button 
// //                                     className="btn btn-outline-primary btn-sm w-100"
// //                                     onClick={fetchBackupHistory}
// //                                 >
// //                                     <i className="bi bi-arrow-repeat me-2"></i>
// //                                     Refresh
// //                                 </button>
// //                             </div>

// //                             <div className="col-12 col-md-3">
// //                                 <button 
// //                                     className="btn btn-outline-success btn-sm w-100"
// //                                     onClick={exportToCSV}
// //                                     disabled={filteredHistory.length === 0}
// //                                 >
// //                                     <i className="bi bi-download me-2"></i>
// //                                     Export to CSV
// //                                 </button>
// //                             </div>
// //                         </div>

// //                         {/* Table */}
// //                         {filteredHistory.length === 0 ? (
// //                             <div className="alert alert-secondary text-center">
// //                                 <i className="bi bi-info-circle me-2"></i>
// //                                 No backups found. Go to Google Drive Backup page to create your first backup.
// //                             </div>
// //                         ) : (
// //                             <>
// //                                 <div className="table-responsive">
// //                                     <table className="table table-sm table-bordered table-hover">
// //                                         <thead className="table-light">
// //                                             <tr>
// //                                                 <th className="sortable" onClick={() => sortItems('backupDate')} style={{ cursor: 'pointer', minWidth: '160px' }}>
// //                                                     Date {getSortIndicator('backupDate')}
// //                                                 </th>
// //                                                 <th className="sortable" onClick={() => sortItems('companyName')} style={{ cursor: 'pointer', minWidth: '150px' }}>
// //                                                     Company {getSortIndicator('companyName')}
// //                                                 </th>
// //                                                 <th className="sortable" onClick={() => sortItems('fileName')} style={{ cursor: 'pointer', minWidth: '250px' }}>
// //                                                     File Name {getSortIndicator('fileName')}
// //                                                 </th>
// //                                                 <th className="text-end sortable" onClick={() => sortItems('fileSize')} style={{ cursor: 'pointer', minWidth: '100px' }}>
// //                                                     Size {getSortIndicator('fileSize')}
// //                                                 </th>
// //                                                 <th className="text-center" style={{ minWidth: '100px' }}>Format</th>
// //                                                 <th className="text-center" style={{ minWidth: '80px' }}>Status</th>
// //                                                 <th className="text-center" style={{ minWidth: '120px' }}>Actions</th>
// //                                             </tr>
// //                                         </thead>
// //                                         <tbody>
// //                                             {currentPageItems.map((backup) => (
// //                                                 <tr key={backup.id}>
// //                                                     <td>{formatDate(backup.backupDate)}</td>
// //                                                     <td>
// //                                                         <strong>{backup.companyName}</strong>
// //                                                     </td>
// //                                                     <td>
// //                                                         <small>
// //                                                             {getFormatIcon(backup.fileName)} {backup.fileName}
// //                                                         </small>
// //                                                     </td>
// //                                                     <td className="text-end">{formatFileSize(backup.fileSize)}</td>
// //                                                     <td className="text-center">{getFormatBadge(backup.fileName)}</td>
// //                                                     <td className="text-center">
// //                                                         {backup.isSuccess ? (
// //                                                             <span className="badge bg-success">Success</span>
// //                                                         ) : (
// //                                                             <span className="badge bg-danger">Failed</span>
// //                                                         )}
// //                                                     </td>
// //                                                     <td className="text-center">
// //                                                         <div className="btn-group btn-group-sm">
// //                                                             {backup.googleDriveFileId && (
// //                                                                 <a
// //                                                                     href={`https://drive.google.com/file/d/${backup.googleDriveFileId}/view`}
// //                                                                     target="_blank"
// //                                                                     rel="noopener noreferrer"
// //                                                                     className="btn btn-outline-primary"
// //                                                                     title="View in Google Drive"
// //                                                                 >
// //                                                                     <i className="bi bi-eye"></i>
// //                                                                 </a>
// //                                                             )}

// //                                                         </div>
// //                                                     </td>
// //                                                 </tr>
// //                                             ))}
// //                                         </tbody>
// //                                     </table>
// //                                 </div>

// //                                 {/* Pagination */}
// //                                 {itemsPerPage !== 'all' && totalPages > 1 && (
// //                                     <div className="d-flex justify-content-center mt-3">
// //                                         <nav>
// //                                             <ul className="pagination pagination-sm">
// //                                                 <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
// //                                                     <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>
// //                                                         Previous
// //                                                     </button>
// //                                                 </li>
// //                                                 {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
// //                                                     let p = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
// //                                                     return (
// //                                                         <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
// //                                                             <button className="page-link" onClick={() => handlePageChange(p)}>
// //                                                                 {p}
// //                                                             </button>
// //                                                         </li>
// //                                                     );
// //                                                 })}
// //                                                 <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
// //                                                     <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>
// //                                                         Next
// //                                                     </button>
// //                                                 </li>
// //                                             </ul>
// //                                         </nav>
// //                                     </div>
// //                                 )}
// //                             </>
// //                         )}
// //                     </div>
// //                 </div>
// //             </div>

// //             <NotificationToast
// //                 show={notification.show}
// //                 message={notification.message}
// //                 type={notification.type}
// //                 duration={notification.duration}
// //                 onClose={() => setNotification({ ...notification, show: false })}
// //             />
// //         </div>
// //     );
// // };

// // export default BackupHistory;

// //------------------------------------------------------------------end

// import React, { useState, useEffect, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import axios from 'axios';
// import DashboardLayout from '../company/DashboardLayout';
// import NotificationToast from '../NotificationToast';

// const BackupHistory = () => {
//     const navigate = useNavigate();
    
//     const [backupHistory, setBackupHistory] = useState([]);
//     const [filteredHistory, setFilteredHistory] = useState([]);
//     const [searchQuery, setSearchQuery] = useState('');
//     const [currentPage, setCurrentPage] = useState(1);
//     const [itemsPerPage, setItemsPerPage] = useState(10);
//     const [sortConfig, setSortConfig] = useState({ key: 'backupDate', direction: 'descending' });
//     const [isLoading, setIsLoading] = useState(true);
//     const [user, setUser] = useState(null);
//     const [isAdminOrSupervisor, setIsAdminOrSupervisor] = useState(false);
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success',
//         duration: 3000
//     });

//     const currentUser = useSelector((state) => state.auth.userInfo);

//     const api = useMemo(() => {
//         const instance = axios.create({
//             baseURL: process.env.REACT_APP_API_BASE_URL,
//             withCredentials: true,
//         });
//         instance.interceptors.request.use(
//             (config) => {
//                 const token = localStorage.getItem('token');
//                 if (token) config.headers.Authorization = `Bearer ${token}`;
//                 return config;
//             },
//             (error) => Promise.reject(error)
//         );
//         return instance;
//     }, []);

//     useEffect(() => {
//         const initializeComponent = async () => {
//             try {
//                 if (currentUser) {
//                     setUser(currentUser);
//                     setIsAdminOrSupervisor(currentUser.isAdmin || currentUser.role === 'Supervisor');
//                 } else {
//                     const userRes = await api.get('/api/User/current');
//                     setUser(userRes.data.user);
//                     setIsAdminOrSupervisor(userRes.data.user.isAdmin || userRes.data.user.role === 'Supervisor');
//                 }
                
//                 await fetchBackupHistory();
//             } catch (error) {
//                 console.error('Error initializing component:', error);
//                 if (error.response?.status === 401) {
//                     setNotification({
//                         show: true,
//                         message: 'Session expired. Please login again.',
//                         type: 'error',
//                         duration: 3000
//                     });
//                     setTimeout(() => navigate('/auth/login'), 2000);
//                 }
//             }
//         };
        
//         initializeComponent();
//     }, [currentUser, navigate]);

//     useEffect(() => {
//         let filtered = [...backupHistory];
//         if (searchQuery) {
//             filtered = filtered.filter(backup => 
//                 backup.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                 backup.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
//             );
//         }
//         if (sortConfig.key) {
//             filtered.sort((a, b) => {
//                 let aVal = a[sortConfig.key];
//                 let bVal = b[sortConfig.key];
//                 if (sortConfig.key === 'backupDate') {
//                     aVal = new Date(aVal);
//                     bVal = new Date(bVal);
//                 }
//                 if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
//                 if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
//                 return 0;
//             });
//         }
//         setFilteredHistory(filtered);
//         setCurrentPage(1);
//     }, [backupHistory, searchQuery, sortConfig]);

//     const fetchBackupHistory = async () => {
//         setIsLoading(true);
//         try {
//             const response = await api.get('/api/drivebackup/history');
//             if (response.data.success) {
//                 setBackupHistory(response.data.backups);
//             } else {
//                 setNotification({
//                     show: true,
//                     message: 'Failed to fetch backup history',
//                     type: 'error',
//                     duration: 3000
//                 });
//             }
//         } catch (error) {
//             console.error('Error fetching backup history:', error);
//             setNotification({
//                 show: true,
//                 message: error.response?.data?.error || 'Error fetching backup history',
//                 type: 'error',
//                 duration: 3000
//             });
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const formatDate = (dateString) => {
//         if (!dateString) return 'N/A';
//         const date = new Date(dateString);
//         return date.toLocaleString();
//     };

//     const formatFileSize = (bytes) => {
//         if (!bytes) return '0 B';
//         const sizes = ['B', 'KB', 'MB', 'GB'];
//         const i = Math.floor(Math.log(bytes) / Math.log(1024));
//         return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
//     };

//     const getFormatIcon = (fileName) => {
//         if (fileName?.endsWith('.json.gz')) return '🗜️';
//         if (fileName?.endsWith('.dump')) return '🗄️';
//         if (fileName?.endsWith('.csv')) return '📊';
//         return '📁';
//     };

//     const getFormatBadge = (fileName) => {
//         if (fileName?.endsWith('.json.gz')) return <span className="badge bg-secondary" style={{ fontSize: '0.65rem', padding: '3px 6px' }}>Compressed</span>;
//         if (fileName?.endsWith('.dump')) return <span className="badge bg-primary" style={{ fontSize: '0.65rem', padding: '3px 6px' }}>SQL</span>;
//         if (fileName?.endsWith('.csv')) return <span className="badge bg-success" style={{ fontSize: '0.65rem', padding: '3px 6px' }}>CSV</span>;
//         return <span className="badge bg-secondary" style={{ fontSize: '0.65rem', padding: '3px 6px' }}>Unknown</span>;
//     };

//     const sortItems = (key) => {
//         setSortConfig(prev => ({
//             key,
//             direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
//         }));
//     };

//     const getSortIndicator = (key) => {
//         return sortConfig.key === key ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : '';
//     };

//     // Pagination
//     const totalPages = Math.ceil(filteredHistory.length / (itemsPerPage === 'all' ? 1 : itemsPerPage));
//     const currentPageItems = filteredHistory.slice(
//         itemsPerPage === 'all' ? 0 : (currentPage - 1) * itemsPerPage,
//         itemsPerPage === 'all' ? filteredHistory.length : currentPage * itemsPerPage
//     );

//     const handlePageChange = (newPage) => {
//         if (itemsPerPage === 'all') return;
//         if (newPage >= 1 && newPage <= totalPages) {
//             setCurrentPage(newPage);
//             window.scrollTo({ top: 0, behavior: 'smooth' });
//         }
//     };

//     const exportToCSV = () => {
//         const headers = ['Date', 'Company Name', 'File Name', 'File Size', 'Format', 'Status', 'Drive Link'];
//         const rows = filteredHistory.map(backup => [
//             formatDate(backup.backupDate),
//             backup.companyName,
//             backup.fileName,
//             formatFileSize(backup.fileSize),
//             backup.fileName?.endsWith('.json.gz') ? 'Compressed' : (backup.fileName?.endsWith('.dump') ? 'SQL' : (backup.fileName?.endsWith('.csv') ? 'CSV' : 'Unknown')),
//             backup.isSuccess ? 'Success' : 'Failed',
//             backup.googleDriveFileId ? `https://drive.google.com/file/d/${backup.googleDriveFileId}/view` : ''
//         ]);

//         const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
//         const blob = new Blob([csvContent], { type: 'text/csv' });
//         const url = window.URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = `backup_history_${new Date().toISOString().split('T')[0]}.csv`;
//         document.body.appendChild(a);
//         a.click();
//         document.body.removeChild(a);
//         window.URL.revokeObjectURL(url);

//         setNotification({
//             show: true,
//             message: 'Export completed successfully!',
//             type: 'success',
//             duration: 3000
//         });
//     };

//     if (isLoading) {
//         return (
//             <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
//                 <div className="container-fluid">
//                     <div className="container mt-4 text-center">
//                         <div className="spinner-border text-primary" role="status">
//                             <span className="visually-hidden">Loading...</span>
//                         </div>
//                         <p className="mt-2">Loading backup history...</p>
//                     </div>
//                 </div>
//             </DashboardLayout>
//         );
//     }

//     return (
//         <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
//             <div className="container-fluid">
//                 <div className="container mt-4 wow-form">
//                     <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp">
//                         <div className="card-header">
//                             <div className="d-flex justify-content-between align-items-center">
//                                 <h2 className="card-title mb-0">
//                                     <i className="bi bi-clock-history me-2"></i>
//                                     Backup History
//                                 </h2>
//                                 <button
//                                     className="btn btn-outline-secondary"
//                                     onClick={() => navigate(-1)}
//                                 >
//                                     <i className="bi bi-arrow-left me-2"></i>
//                                     Back
//                                 </button>
//                             </div>
//                         </div>

//                         <div className="card-body p-2 p-md-3">
//                             {/* Stats Section */}
//                             <div className="row g-2 mb-4">
//                                 <div className="col-12 col-md-3">
//                                     <div className="alert alert-info text-center mb-0">
//                                         <h5 className="mb-0">{backupHistory.length}</h5>
//                                         <small>Total Backups</small>
//                                     </div>
//                                 </div>
//                                 <div className="col-12 col-md-3">
//                                     <div className="alert alert-success text-center mb-0">
//                                         <h5 className="mb-0">{backupHistory.filter(b => b.isSuccess).length}</h5>
//                                         <small>Successful</small>
//                                     </div>
//                                 </div>
//                                 <div className="col-12 col-md-3">
//                                     <div className="alert alert-danger text-center mb-0">
//                                         <h5 className="mb-0">{backupHistory.filter(b => !b.isSuccess).length}</h5>
//                                         <small>Failed</small>
//                                     </div>
//                                 </div>
//                                 <div className="col-12 col-md-3">
//                                     <div className="alert alert-secondary text-center mb-0">
//                                         <h5 className="mb-0">
//                                             {(() => {
//                                                 const uniqueCompanies = new Set(backupHistory.map(b => b.companyName));
//                                                 return uniqueCompanies.size;
//                                             })()}
//                                         </h5>
//                                         <small>Companies</small>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Search and Controls */}
//                             <div className="row g-2 mb-3">
//                                 <div className="col-12 col-md-4">
//                                     <div className="position-relative">
//                                         <input
//                                             type="text"
//                                             className="form-control form-control-sm"
//                                             placeholder=""
//                                             value={searchQuery}
//                                             onChange={(e) => setSearchQuery(e.target.value)}
//                                             autoComplete="off"
//                                             style={{
//                                                 height: '26px',
//                                                 fontSize: '0.875rem',
//                                                 paddingTop: '0.75rem',
//                                                 width: '100%'
//                                             }}
//                                         />
//                                         <label
//                                             className="position-absolute"
//                                             style={{
//                                                 top: '-0.5rem',
//                                                 left: '0.75rem',
//                                                 fontSize: '0.75rem',
//                                                 backgroundColor: 'white',
//                                                 padding: '0 0.25rem',
//                                                 color: '#6c757d',
//                                                 fontWeight: '500'
//                                             }}
//                                         >
//                                             Search by Company or File:
//                                         </label>
//                                     </div>
//                                 </div>

//                                 <div className="col-12 col-md-2">
//                                     <div className="position-relative">
//                                         <select
//                                             className="form-control form-control-sm"
//                                             value={itemsPerPage}
//                                             onChange={(e) => { setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value)); setCurrentPage(1); }}
//                                             style={{
//                                                 height: '26px',
//                                                 fontSize: '0.875rem',
//                                                 paddingTop: '0.25rem',
//                                                 width: '100%'
//                                             }}
//                                         >
//                                             <option value="10">10 per page</option>
//                                             <option value="25">25 per page</option>
//                                             <option value="50">50 per page</option>
//                                             <option value="100">100 per page</option>
//                                             <option value="all">All</option>
//                                         </select>
//                                         <label
//                                             className="position-absolute"
//                                             style={{
//                                                 top: '-0.5rem',
//                                                 left: '0.75rem',
//                                                 fontSize: '0.75rem',
//                                                 backgroundColor: 'white',
//                                                 padding: '0 0.25rem',
//                                                 color: '#6c757d',
//                                                 fontWeight: '500'
//                                             }}
//                                         >
//                                             Items:
//                                         </label>
//                                     </div>
//                                 </div>

//                                 <div className="col-12 col-md-3">
//                                     <button 
//                                         className="btn btn-outline-primary btn-sm w-100"
//                                         onClick={fetchBackupHistory}
//                                     >
//                                         <i className="bi bi-arrow-repeat me-2"></i>
//                                         Refresh
//                                     </button>
//                                 </div>

//                                 <div className="col-12 col-md-3">
//                                     <button 
//                                         className="btn btn-outline-success btn-sm w-100"
//                                         onClick={exportToCSV}
//                                         disabled={filteredHistory.length === 0}
//                                     >
//                                         <i className="bi bi-download me-2"></i>
//                                         Export to CSV
//                                     </button>
//                                 </div>
//                             </div>

//                             {/* Table */}
//                             {filteredHistory.length === 0 ? (
//                                 <div className="alert alert-secondary text-center">
//                                     <i className="bi bi-info-circle me-2"></i>
//                                     No backups found. Go to Google Drive Backup page to create your first backup.
//                                 </div>
//                             ) : (
//                                 <>
//                                     <div className="table-responsive">
//                                         <table className="table table-sm table-bordered table-hover">
//                                             <thead className="table-light">
//                                                 <tr>
//                                                     <th className="sortable" onClick={() => sortItems('backupDate')} style={{ cursor: 'pointer', minWidth: '160px' }}>
//                                                         Date {getSortIndicator('backupDate')}
//                                                     </th>
//                                                     <th className="sortable" onClick={() => sortItems('companyName')} style={{ cursor: 'pointer', minWidth: '150px' }}>
//                                                         Company {getSortIndicator('companyName')}
//                                                     </th>
//                                                     <th className="sortable" onClick={() => sortItems('fileName')} style={{ cursor: 'pointer', minWidth: '250px' }}>
//                                                         File Name {getSortIndicator('fileName')}
//                                                     </th>
//                                                     <th className="text-end sortable" onClick={() => sortItems('fileSize')} style={{ cursor: 'pointer', minWidth: '100px' }}>
//                                                         Size {getSortIndicator('fileSize')}
//                                                     </th>
//                                                     <th className="text-center" style={{ minWidth: '100px' }}>Format</th>
//                                                     <th className="text-center" style={{ minWidth: '80px' }}>Status</th>
//                                                     <th className="text-center" style={{ minWidth: '120px' }}>Actions</th>
//                                                 </tr>
//                                             </thead>
//                                             <tbody>
//                                                 {currentPageItems.map((backup) => (
//                                                     <tr key={backup.id}>
//                                                         <td>{formatDate(backup.backupDate)}</td>
//                                                         <td>
//                                                             <strong>{backup.companyName}</strong>
//                                                         </td>
//                                                         <td>
//                                                             <small>
//                                                                 {getFormatIcon(backup.fileName)} {backup.fileName}
//                                                             </small>
//                                                         </td>
//                                                         <td className="text-end">{formatFileSize(backup.fileSize)}</td>
//                                                         <td className="text-center">{getFormatBadge(backup.fileName)}</td>
//                                                         <td className="text-center">
//                                                             {backup.isSuccess ? (
//                                                                 <span className="badge bg-success">Success</span>
//                                                             ) : (
//                                                                 <span className="badge bg-danger">Failed</span>
//                                                             )}
//                                                         </td>
//                                                         <td className="text-center">
//                                                             <div className="btn-group btn-group-sm">
//                                                                 {backup.googleDriveFileId && (
//                                                                     <a
//                                                                         href={`https://drive.google.com/file/d/${backup.googleDriveFileId}/view`}
//                                                                         target="_blank"
//                                                                         rel="noopener noreferrer"
//                                                                         className="btn btn-outline-primary"
//                                                                         title="View in Google Drive"
//                                                                     >
//                                                                         <i className="bi bi-eye"></i>
//                                                                     </a>
//                                                                 )}
//                                                                 {backup.googleDriveFileId && (
//                                                                     <a
//                                                                         href={`https://drive.google.com/uc?export=download&id=${backup.googleDriveFileId}`}
//                                                                         target="_blank"
//                                                                         rel="noopener noreferrer"
//                                                                         className="btn btn-outline-success"
//                                                                         title="Download"
//                                                                     >
//                                                                         <i className="bi bi-download"></i>
//                                                                     </a>
//                                                                 )}
//                                                             </div>
//                                                         </td>
//                                                     </tr>
//                                                 ))}
//                                             </tbody>
//                                         </table>
//                                     </div>

//                                     {/* Pagination */}
//                                     {itemsPerPage !== 'all' && totalPages > 1 && (
//                                         <div className="d-flex justify-content-center mt-3">
//                                             <nav>
//                                                 <ul className="pagination pagination-sm">
//                                                     <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
//                                                         <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>
//                                                             Previous
//                                                         </button>
//                                                     </li>
//                                                     {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
//                                                         let p = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
//                                                         return (
//                                                             <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
//                                                                 <button className="page-link" onClick={() => handlePageChange(p)}>
//                                                                     {p}
//                                                                 </button>
//                                                             </li>
//                                                         );
//                                                     })}
//                                                     <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
//                                                         <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>
//                                                             Next
//                                                         </button>
//                                                     </li>
//                                                 </ul>
//                                             </nav>
//                                         </div>
//                                     )}
//                                 </>
//                             )}
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             <NotificationToast
//                 show={notification.show}
//                 message={notification.message}
//                 type={notification.type}
//                 duration={notification.duration}
//                 onClose={() => setNotification({ ...notification, show: false })}
//             />
//         </DashboardLayout>
//     );
// };

// export default BackupHistory;

//------------------------------------------------------------------end

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import DashboardLayout from '../company/DashboardLayout';
import NotificationToast from '../NotificationToast';

const BackupHistory = () => {
    const navigate = useNavigate();
    
    const [backupHistory, setBackupHistory] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'backupDate', direction: 'descending' });
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isAdminOrSupervisor, setIsAdminOrSupervisor] = useState(false);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

    const currentUser = useSelector((state) => state.auth.userInfo);

    const api = useMemo(() => {
        const instance = axios.create({
            baseURL: process.env.REACT_APP_API_BASE_URL,
            withCredentials: true,
        });
        instance.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) config.headers.Authorization = `Bearer ${token}`;
                return config;
            },
            (error) => Promise.reject(error)
        );
        return instance;
    }, []);

    useEffect(() => {
        const initializeComponent = async () => {
            try {
                if (currentUser) {
                    setUser(currentUser);
                    setIsAdminOrSupervisor(currentUser.isAdmin || currentUser.role === 'Supervisor');
                } else {
                    const userRes = await api.get('/api/User/current');
                    setUser(userRes.data.user);
                    setIsAdminOrSupervisor(userRes.data.user.isAdmin || userRes.data.user.role === 'Supervisor');
                }
                
                await fetchBackupHistory();
            } catch (error) {
                console.error('Error initializing component:', error);
                if (error.response?.status === 401) {
                    setNotification({
                        show: true,
                        message: 'Session expired. Please login again.',
                        type: 'error',
                        duration: 3000
                    });
                    setTimeout(() => navigate('/auth/login'), 2000);
                }
            }
        };
        
        initializeComponent();
    }, [currentUser, navigate]);

    useEffect(() => {
        let filtered = [...backupHistory];
        if (searchQuery) {
            filtered = filtered.filter(backup => 
                backup.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                backup.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (sortConfig.key === 'backupDate') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                }
                if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        setFilteredHistory(filtered);
        setCurrentPage(1);
    }, [backupHistory, searchQuery, sortConfig]);

    const fetchBackupHistory = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/drivebackup/history');
            if (response.data.success) {
                setBackupHistory(response.data.backups);
            } else {
                setNotification({
                    show: true,
                    message: 'Failed to fetch backup history',
                    type: 'error',
                    duration: 3000
                });
            }
        } catch (error) {
            console.error('Error fetching backup history:', error);
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Error fetching backup history',
                type: 'error',
                duration: 3000
            });
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    const getFormatIcon = (fileName) => {
        if (fileName?.endsWith('.json.gz')) return '🗜️';
        if (fileName?.endsWith('.dump')) return '🗄️';
        if (fileName?.endsWith('.csv')) return '📊';
        return '📁';
    };

    const getFormatBadge = (fileName) => {
        if (fileName?.endsWith('.json.gz')) return <span className="badge bg-secondary" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>Compressed</span>;
        if (fileName?.endsWith('.dump')) return <span className="badge bg-primary" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>SQL</span>;
        if (fileName?.endsWith('.csv')) return <span className="badge bg-success" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>CSV</span>;
        return <span className="badge bg-secondary" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>Unknown</span>;
    };

    const sortItems = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
        }));
    };

    const getSortIndicator = (key) => {
        return sortConfig.key === key ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : '';
    };

    // Pagination
    const totalPages = Math.ceil(filteredHistory.length / (itemsPerPage === 'all' ? 1 : itemsPerPage));
    const currentPageItems = filteredHistory.slice(
        itemsPerPage === 'all' ? 0 : (currentPage - 1) * itemsPerPage,
        itemsPerPage === 'all' ? filteredHistory.length : currentPage * itemsPerPage
    );

    const handlePageChange = (newPage) => {
        if (itemsPerPage === 'all') return;
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Company Name', 'File Name', 'File Size', 'Format', 'Status', 'Drive Link'];
        const rows = filteredHistory.map(backup => [
            formatDate(backup.backupDate),
            backup.companyName,
            backup.fileName,
            formatFileSize(backup.fileSize),
            backup.fileName?.endsWith('.json.gz') ? 'Compressed' : (backup.fileName?.endsWith('.dump') ? 'SQL' : (backup.fileName?.endsWith('.csv') ? 'CSV' : 'Unknown')),
            backup.isSuccess ? 'Success' : 'Failed',
            backup.googleDriveFileId ? `https://drive.google.com/file/d/${backup.googleDriveFileId}/view` : ''
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_history_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setNotification({
            show: true,
            message: 'Export completed successfully!',
            type: 'success',
            duration: 3000
        });
    };

    if (isLoading) {
        return (
            <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
                <div className="container-fluid">
                    <div className="container mt-4 text-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2" style={{ fontSize: '0.8rem' }}>Loading backup history...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout user={user} isAdminOrSupervisor={isAdminOrSupervisor}>
            <div className="container-fluid">
                <div className="container mt-4 wow-form">
                    <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp">
                        <div className="card-header py-2">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="card-title mb-0" style={{ fontSize: '0.95rem' }}>
                                    <i className="bi bi-clock-history me-2"></i>
                                    Backup History
                                </h5>
                                <button
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => navigate(-1)}
                                    style={{ fontSize: '0.75rem' }}
                                >
                                    <i className="bi bi-arrow-left me-1"></i>
                                    Back
                                </button>
                            </div>
                        </div>

                        <div className="card-body p-2 p-md-3">
                            {/* Stats Section */}
                            <div className="row g-2 mb-3">
                                <div className="col-12 col-md-3">
                                    <div className="alert alert-info text-center mb-0" style={{ fontSize: '0.75rem', padding: '8px' }}>
                                        <h6 className="mb-0" style={{ fontSize: '0.9rem' }}>{backupHistory.length}</h6>
                                        <small style={{ fontSize: '0.7rem' }}>Total Backups</small>
                                    </div>
                                </div>
                                <div className="col-12 col-md-3">
                                    <div className="alert alert-success text-center mb-0" style={{ fontSize: '0.75rem', padding: '8px' }}>
                                        <h6 className="mb-0" style={{ fontSize: '0.9rem' }}>{backupHistory.filter(b => b.isSuccess).length}</h6>
                                        <small style={{ fontSize: '0.7rem' }}>Successful</small>
                                    </div>
                                </div>
                                <div className="col-12 col-md-3">
                                    <div className="alert alert-danger text-center mb-0" style={{ fontSize: '0.75rem', padding: '8px' }}>
                                        <h6 className="mb-0" style={{ fontSize: '0.9rem' }}>{backupHistory.filter(b => !b.isSuccess).length}</h6>
                                        <small style={{ fontSize: '0.7rem' }}>Failed</small>
                                    </div>
                                </div>
                                <div className="col-12 col-md-3">
                                    <div className="alert alert-secondary text-center mb-0" style={{ fontSize: '0.75rem', padding: '8px' }}>
                                        <h6 className="mb-0" style={{ fontSize: '0.9rem' }}>
                                            {(() => {
                                                const uniqueCompanies = new Set(backupHistory.map(b => b.companyName));
                                                return uniqueCompanies.size;
                                            })()}
                                        </h6>
                                        <small style={{ fontSize: '0.7rem' }}>Companies</small>
                                    </div>
                                </div>
                            </div>

                            {/* Search and Controls */}
                            <div className="row g-2 mb-3">
                                <div className="col-12 col-md-4">
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder=""
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            autoComplete="off"
                                            style={{
                                                height: '24px',
                                                fontSize: '0.75rem',
                                                paddingTop: '0.5rem',
                                                width: '100%'
                                            }}
                                        />
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.7rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Search by Company or File:
                                        </label>
                                    </div>
                                </div>

                                <div className="col-12 col-md-2">
                                    <div className="position-relative">
                                        <select
                                            className="form-control form-control-sm"
                                            value={itemsPerPage}
                                            onChange={(e) => { setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value)); setCurrentPage(1); }}
                                            style={{
                                                height: '24px',
                                                fontSize: '0.75rem',
                                                paddingTop: '0.2rem',
                                                width: '100%'
                                            }}
                                        >
                                            <option value="10">10 per page</option>
                                            <option value="25">25 per page</option>
                                            <option value="50">50 per page</option>
                                            <option value="100">100 per page</option>
                                            <option value="all">All</option>
                                        </select>
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.7rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Items:
                                        </label>
                                    </div>
                                </div>

                                <div className="col-12 col-md-3">
                                    <button 
                                        className="btn btn-outline-primary btn-sm w-100"
                                        onClick={fetchBackupHistory}
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        <i className="bi bi-arrow-repeat me-1"></i>
                                        Refresh
                                    </button>
                                </div>

                                <div className="col-12 col-md-3">
                                    <button 
                                        className="btn btn-outline-success btn-sm w-100"
                                        onClick={exportToCSV}
                                        disabled={filteredHistory.length === 0}
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        <i className="bi bi-download me-1"></i>
                                        Export to CSV
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            {filteredHistory.length === 0 ? (
                                <div className="alert alert-secondary text-center" style={{ fontSize: '0.75rem', padding: '8px' }}>
                                    <i className="bi bi-info-circle me-2"></i>
                                    No backups found. Go to Google Drive Backup page to create your first backup.
                                </div>
                            ) : (
                                <>
                                    <div className="table-responsive">
                                        <table className="table table-sm table-bordered table-hover" style={{ fontSize: '0.7rem' }}>
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="sortable" onClick={() => sortItems('backupDate')} style={{ cursor: 'pointer', minWidth: '140px', fontSize: '0.7rem' }}>
                                                        Date {getSortIndicator('backupDate')}
                                                    </th>
                                                    <th className="sortable" onClick={() => sortItems('companyName')} style={{ cursor: 'pointer', minWidth: '130px', fontSize: '0.7rem' }}>
                                                        Company {getSortIndicator('companyName')}
                                                    </th>
                                                    <th className="sortable" onClick={() => sortItems('fileName')} style={{ cursor: 'pointer', minWidth: '200px', fontSize: '0.7rem' }}>
                                                        File Name {getSortIndicator('fileName')}
                                                    </th>
                                                    <th className="text-end sortable" onClick={() => sortItems('fileSize')} style={{ cursor: 'pointer', minWidth: '80px', fontSize: '0.7rem' }}>
                                                        Size {getSortIndicator('fileSize')}
                                                    </th>
                                                    <th className="text-center" style={{ minWidth: '80px', fontSize: '0.7rem' }}>Format</th>
                                                    <th className="text-center" style={{ minWidth: '70px', fontSize: '0.7rem' }}>Status</th>
                                                    <th className="text-center" style={{ minWidth: '80px', fontSize: '0.7rem' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentPageItems.map((backup) => (
                                                    <tr key={backup.id}>
                                                        <td style={{ fontSize: '0.7rem' }}>{formatDate(backup.backupDate)}</td>
                                                        <td style={{ fontSize: '0.7rem' }}>
                                                            <strong>{backup.companyName}</strong>
                                                        </td>
                                                        <td style={{ fontSize: '0.7rem' }}>
                                                            <small style={{ fontSize: '0.65rem' }}>
                                                                {getFormatIcon(backup.fileName)} {backup.fileName}
                                                            </small>
                                                        </td>
                                                        <td className="text-end" style={{ fontSize: '0.7rem' }}>{formatFileSize(backup.fileSize)}</td>
                                                        <td className="text-center">{getFormatBadge(backup.fileName)}</td>
                                                        <td className="text-center">
                                                            {backup.isSuccess ? (
                                                                <span className="badge bg-success" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>Success</span>
                                                            ) : (
                                                                <span className="badge bg-danger" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>Failed</span>
                                                            )}
                                                        </td>
                                                        <td className="text-center">
                                                            <div className="btn-group btn-group-sm">
                                                                {backup.googleDriveFileId && (
                                                                    <a
                                                                        href={`https://drive.google.com/file/d/${backup.googleDriveFileId}/view`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="btn btn-outline-primary"
                                                                        title="View in Google Drive"
                                                                        style={{ padding: '2px 5px', fontSize: '0.65rem' }}
                                                                    >
                                                                        <i className="bi bi-eye"></i>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {itemsPerPage !== 'all' && totalPages > 1 && (
                                        <div className="d-flex justify-content-center mt-3">
                                            <nav>
                                                <ul className="pagination pagination-sm" style={{ fontSize: '0.7rem' }}>
                                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                        <button className="page-link" onClick={() => handlePageChange(currentPage - 1)} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                                                            Previous
                                                        </button>
                                                    </li>
                                                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                                        let p = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
                                                        return (
                                                            <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                                                                <button className="page-link" onClick={() => handlePageChange(p)} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                                                                    {p}
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                        <button className="page-link" onClick={() => handlePageChange(currentPage + 1)} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                                                            Next
                                                        </button>
                                                    </li>
                                                </ul>
                                            </nav>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                duration={notification.duration}
                onClose={() => setNotification({ ...notification, show: false })}
            />
        </DashboardLayout>
    );
};

export default BackupHistory;