// import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
// import { FiEdit2, FiTrash2, FiEye, FiCheck, FiPrinter, FiArrowLeft, FiRefreshCw, FiX } from 'react-icons/fi';
// import { FixedSizeList as List } from 'react-window';
// import AutoSizer from 'react-virtualized-auto-sizer';
// import Modal from 'react-bootstrap/Modal';
// import Button from 'react-bootstrap/Button';
// import Form from 'react-bootstrap/Form';
// import Badge from 'react-bootstrap/Badge';
// import Spinner from 'react-bootstrap/Spinner';
// import Header from '../Header';
// import NotificationToast from '../../NotificationToast';
// import ProductModal from '../dashboard/modals/ProductModal';
// import NepaliDate from 'nepali-datetime';

// import * as XLSX from 'xlsx';

// const Accounts = () => {
//     const navigate = useNavigate();
//     const [data, setData] = useState({
//         accounts: [],
//         accountGroups: [], // Changed from companyGroups
//         company: null,
//         currentFiscalYear: null,
//         isInitialFiscalYear: false,
//         companyId: '',
//         currentCompanyName: '',
//         companyDateFormat: 'english',
//         nepaliDate: '',
//         fiscalYear: '',
//         user: null,
//         theme: 'light',
//         isAdminOrSupervisor: false
//     });
//     const [showProductModal, setShowProductModal] = useState(false);
//     const [loading, setLoading] = useState(true);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [currentAccount, setCurrentAccount] = useState(null);
//     const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
//     const [isSaving, setIsSaving] = useState(false);
//     const [showNotification, setShowNotification] = useState(false);
//     const [notificationMessage, setNotificationMessage] = useState('');
//     const [notificationType, setNotificationType] = useState('');
//     const accountNameInputRef = useRef(null);
//     // Print modal states
//     const [showPrintModal, setShowPrintModal] = useState(false);
//     const [printOption, setPrintOption] = useState('all');
//     const [selectedAccountGroup, setSelectedAccountGroup] = useState(''); // Changed from selectedCompanyGroup

//     // Add these state variables for pagination
//     const [paginatedAccounts, setPaginatedAccounts] = useState([]);
//     const [currentPage, setCurrentPage] = useState(1);
//     const [hasMoreItems, setHasMoreItems] = useState(true);
//     const [isLoadingMore, setIsLoadingMore] = useState(false);
//     const [totalFilteredAccounts, setTotalFilteredAccounts] = useState(0);
//     const tableContainerRef = useRef(null);

//     // Excel export state
//     const [exporting, setExporting] = useState(false);

//     // Column resizing state
//     const [columnWidths, setColumnWidths] = useState({
//         name: 160,
//         group: 180,
//         actions: 120
//     });

//     const [isResizing, setIsResizing] = useState(false);
//     const [resizingColumn, setResizingColumn] = useState(null);
//     const [startX, setStartX] = useState(0);
//     const [startWidth, setStartWidth] = useState(0);

//     // Form state
//     const [formData, setFormData] = useState({
//         name: '',
//         address: '',
//         phone: '',
//         ward: '',
//         pan: '',
//         email: '',
//         creditLimit: '',
//         contactPerson: '',
//         accountGroups: '', // Changed from companyGroups
//         openingBalance: {
//             amount: 0,
//             type: 'Dr'
//         }
//     });

//     // Create axios instance with interceptors
//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142',
//         withCredentials: true,
//     });

//     // Add request interceptor to add token to EVERY request
//     api.interceptors.request.use(
//         config => {
//             const token = localStorage.getItem('token');
//             if (token) {
//                 config.headers.Authorization = `Bearer ${token}`;
//                 console.log('Adding Authorization header:', token.substring(0, 20) + '...');
//             } else {
//                 console.warn('No token found in localStorage');
//             }
//             return config;
//         },
//         error => {
//             console.error('Request interceptor error:', error);
//             return Promise.reject(error);
//         }
//     );

//     // Add response interceptor to handle 401 errors
//     api.interceptors.response.use(
//         response => {
//             console.log('Response received:', response.status, response.config.url);
//             return response;
//         },
//         error => {
//             console.error('Response error:', {
//                 status: error.response?.status,
//                 url: error.config?.url,
//                 message: error.message
//             });

//             if (error.response?.status === 401) {
//                 console.log('401 Unauthorized - Redirecting to login');
//                 // Token expired or invalid
//                 localStorage.removeItem('token');
//                 localStorage.removeItem('userInfo');
//                 localStorage.removeItem('currentCompany');
//                 localStorage.removeItem('currentCompanyId');
//                 localStorage.removeItem('userCompanies');
//                 window.location.href = '/auth/login';
//             }
//             return Promise.reject(error);
//         }
//     );

//     const showNotificationMessage = (message, type) => {
//         setNotificationMessage(message);
//         setNotificationType(type);
//         setShowNotification(true);
//     };

//     useEffect(() => {
//         const token = localStorage.getItem('token');
//         console.log('Accounts component mounted. Token exists:', !!token);
//         if (token) {
//             console.log('Token length:', token.length);
//             console.log('Token starts with:', token.substring(0, 20) + '...');
//         }
//         fetchAccounts();
//     }, []);

//     const fetchAccounts = async () => {
//         try {
//             setLoading(true);

//             // Check if token exists
//             const token = localStorage.getItem('token');
//             if (!token) {
//                 console.error('No token found, redirecting to login');
//                 navigate('/auth/login');
//                 return;
//             }

//             console.log('Fetching accounts from:', '/api/retailer/companies');
//             console.log('Using token:', token.substring(0, 20) + '...');

//             const response = await api.get('/api/retailer/companies');

//             console.log('API Response:', {
//                 status: response.status,
//                 success: response.data?.success,
//                 data: response.data?.data ? 'has data' : 'no data',
//                 redirectTo: response.data?.redirectTo
//             });

//             if (response.data.redirectTo) {
//                 console.log('Redirecting to:', response.data.redirectTo);
//                 navigate(response.data.redirectTo);
//                 return;
//             }

//             if (response.data.success) {
//                 console.log('Successfully fetched accounts data');
//                 const newData = {
//                     accounts: response.data.data.accounts || [],
//                     accountGroups: response.data.data.accountGroups || [], // Changed from companyGroups
//                     company: response.data.data.company,
//                     currentFiscalYear: response.data.data.currentFiscalYear,
//                     isInitialFiscalYear: response.data.data.isInitialFiscalYear || false,
//                     companyId: response.data.data.companyId || '',
//                     currentCompanyName: response.data.data.currentCompanyName || '',
//                     companyDateFormat: response.data.data.companyDateFormat || 'english',
//                     nepaliDate: response.data.data.nepaliDate || '',
//                     fiscalYear: response.data.data.fiscalYear || '',
//                     user: response.data.data.user,
//                     theme: response.data.data.theme || 'light',
//                     isAdminOrSupervisor: response.data.data.isAdminOrSupervisor || false
//                 };

//                 console.log('Setting data with accounts count:', newData.accounts.length);
//                 setData(newData);
//             } else {
//                 console.error('API returned success=false:', response.data.error);
//                 throw new Error(response.data.error || 'Failed to fetch accounts');
//             }
//         } catch (err) {
//             console.error('Error in fetchAccounts:', {
//                 message: err.message,
//                 response: err.response?.data,
//                 status: err.response?.status
//             });
//             handleApiError(err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Save/load column widths
//     useEffect(() => {
//         const savedWidths = localStorage.getItem('accountsTableColumnWidths');
//         if (savedWidths) {
//             try {
//                 setColumnWidths(JSON.parse(savedWidths));
//             } catch (e) {
//                 console.error('Failed to load column widths:', e);
//             }
//         }
//     }, []);

//     useEffect(() => {
//         localStorage.setItem('accountsTableColumnWidths', JSON.stringify(columnWidths));
//     }, [columnWidths]);

//     // F9 key handler for product modal
//     useEffect(() => {
//         const handleF9KeyDown = (e) => {
//             if (e.key === 'F9') {
//                 e.preventDefault();
//                 setShowProductModal(prev => !prev);
//             }
//         };
//         window.addEventListener('keydown', handleF9KeyDown);
//         return () => {
//             window.removeEventListener('keydown', handleF9KeyDown);
//         };
//     }, []);

//     // Keyboard shortcuts
//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (e.altKey && e.key.toLowerCase() === 's') {
//                 e.preventDefault();
//                 setShowSaveConfirmModal(true);
//             } else if (e.key === 'Enter') {
//                 e.preventDefault();
//                 const form = e.target.form;
//                 if (form) {
//                     const index = Array.prototype.indexOf.call(form, e.target);
//                     if (index < form.length - 1) {
//                         form.elements[index + 1].focus();
//                     }
//                 }
//             }
//         };
//         document.addEventListener('keydown', handleKeyDown);
//         return () => document.removeEventListener('keydown', handleKeyDown);
//     }, []);

//     // Pagination function - initially 15 items, then 25 on each load
//     const paginateAccounts = useCallback((accountsList, pageNum, itemsPerPage = 25) => {
//         const startIndex = 0; // Always start from beginning
//         // For first page, we want 15 items, not 25
//         const actualLimit = pageNum === 1 ? 15 : (pageNum - 1) * itemsPerPage + itemsPerPage;
//         const endIndex = actualLimit;
//         return accountsList.slice(startIndex, endIndex);
//     }, []);

//     // Filtered accounts with memoization
//     const filteredAccounts = useMemo(() => {
//         return data.accounts
//             .filter(account => {
//                 const searchTermLower = searchTerm.toLowerCase();
//                 const accountName = account.name || '';
//                 const groupName = account.accountGroups?.name || ''; // Changed from companyGroups
//                 const pan = account.pan || '';
//                 const phone = account.phone || '';
//                 const email = account.email || '';

//                 return (
//                     accountName.toLowerCase().includes(searchTermLower) ||
//                     groupName.toLowerCase().includes(searchTermLower) ||
//                     (pan && pan.toString().toLowerCase().includes(searchTermLower)) ||
//                     (phone && phone.toString().includes(searchTerm)) ||
//                     (email && email.toLowerCase().includes(searchTermLower))
//                 );
//             })
//             .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
//     }, [data.accounts, searchTerm]);


//     const processedFilteredAccounts = useMemo(() => {
//         return filteredAccounts.map(account => {
//             return {
//                 ...account,
//                 _id: account._id || account.id,
//                 accountGroups: account.accountGroups,
//                 openingBalance: account.openingBalance || { amount: 0, type: 'Dr' }
//             };
//         });
//     }, [filteredAccounts]);

//     // Load more items on scroll
//     const loadMoreItems = useCallback(() => {
//         if (!hasMoreItems || isLoadingMore) return;

//         setIsLoadingMore(true);

//         // Use setTimeout to prevent UI freezing
//         setTimeout(() => {
//             const nextPage = currentPage + 1;
//             const itemsPerPage = 25;
//             const newLimit = nextPage === 1 ? 15 : 15 + ((nextPage - 1) * itemsPerPage);
//             const newPaginatedAccounts = processedFilteredAccounts.slice(0, newLimit);

//             if (newPaginatedAccounts.length === paginatedAccounts.length) {
//                 setHasMoreItems(false);
//             } else {
//                 setPaginatedAccounts(newPaginatedAccounts);
//                 setCurrentPage(nextPage);
//             }

//             setIsLoadingMore(false);
//         }, 100);
//     }, [hasMoreItems, isLoadingMore, currentPage, processedFilteredAccounts, paginatedAccounts]);


//     // Handle scroll to load more items
//     useEffect(() => {
//         const handleScroll = () => {
//             if (!tableContainerRef.current) return;

//             const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;

//             // Load more when scrolled to 80% of the way down
//             const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

//             if (scrollPercentage > 0.8 && hasMoreItems && !isLoadingMore) {
//                 loadMoreItems();
//             }
//         };

//         const tableContainer = tableContainerRef.current;
//         if (tableContainer) {
//             tableContainer.addEventListener('scroll', handleScroll);
//             return () => tableContainer.removeEventListener('scroll', handleScroll);
//         }
//     }, [hasMoreItems, isLoadingMore, loadMoreItems]);

//     // Reset pagination when filtered items change
//     useEffect(() => {
//         const initialAccounts = paginateAccounts(processedFilteredAccounts, 1);
//         setPaginatedAccounts(initialAccounts);
//         setCurrentPage(1);
//         setHasMoreItems(processedFilteredAccounts.length > initialAccounts.length);
//         setTotalFilteredAccounts(processedFilteredAccounts.length);
//     }, [processedFilteredAccounts, paginateAccounts]);


//     // Shallow equal function for memoization
//     function shallowEqual(objA, objB) {
//         if (objA === objB) return true;

//         if (typeof objA !== 'object' || objA === null ||
//             typeof objB !== 'object' || objB === null) {
//             return false;
//         }

//         const keysA = Object.keys(objA);
//         const keysB = Object.keys(objB);

//         if (keysA.length !== keysB.length) return false;

//         for (let i = 0; i < keysA.length; i++) {
//             if (!objB.hasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
//                 return false;
//             }
//         }

//         return true;
//     }

//     // Resizable Table Header Component
//     const TableHeader = React.memo(() => {
//         const totalWidth = columnWidths.name + columnWidths.group + columnWidths.actions;

//         const handleResizeStart = (e, columnName) => {
//             setIsResizing(true);
//             setResizingColumn(columnName);
//             setStartX(e.clientX);
//             setStartWidth(columnWidths[columnName]);
//             e.preventDefault();
//         };

//         return (
//             <div
//                 className="d-flex bg-primary text-white sticky-top align-items-center position-relative"
//                 style={{
//                     zIndex: 2,
//                     height: '26px',
//                     minWidth: `${totalWidth}px`,
//                     userSelect: isResizing ? 'none' : 'auto'
//                 }}
//                 onMouseMove={(e) => {
//                     if (isResizing && resizingColumn) {
//                         const diff = e.clientX - startX;
//                         const newWidth = Math.max(100, startWidth + diff);
//                         setColumnWidths(prev => ({
//                             ...prev,
//                             [resizingColumn]: newWidth
//                         }));
//                     }
//                 }}
//                 onMouseUp={() => {
//                     if (isResizing) {
//                         setIsResizing(false);
//                         setResizingColumn(null);
//                     }
//                 }}
//                 onMouseLeave={() => {
//                     if (isResizing) {
//                         setIsResizing(false);
//                         setResizingColumn(null);
//                     }
//                 }}
//             >
//                 {/* S.N. */}
//                 <div
//                     className="d-flex align-items-center justify-content-center px-2 border-end border-white"
//                     style={{
//                         width: '50px',
//                         flexShrink: 0
//                     }}
//                 >
//                     <strong style={{ fontSize: '0.8rem' }}>S.N.</strong>
//                 </div>

//                 {/* Account Name */}
//                 <div
//                     className="d-flex align-items-center ps-2 border-end border-white position-relative"
//                     style={{
//                         width: `${columnWidths.name}px`,
//                         flexShrink: 0,
//                         minWidth: '100px'
//                     }}
//                 >
//                     <strong style={{ fontSize: '0.8rem' }}>Account Name</strong>
//                     <ResizeHandle
//                         onResizeStart={handleResizeStart}
//                         left={columnWidths.name - 2}
//                         columnName="name"
//                     />
//                 </div>

//                 {/* Account Group */}
//                 <div
//                     className="d-flex align-items-center px-2 border-end border-white position-relative"
//                     style={{
//                         width: `${columnWidths.group}px`,
//                         flexShrink: 0,
//                         minWidth: '100px'
//                     }}
//                 >
//                     <strong style={{ fontSize: '0.8rem' }}>Account Group</strong>
//                     <ResizeHandle
//                         onResizeStart={handleResizeStart}
//                         left={columnWidths.group - 2}
//                         columnName="group"
//                     />
//                 </div>

//                 {/* Actions */}
//                 <div
//                     className="d-flex align-items-center justify-content-end px-2"
//                     style={{
//                         width: `${columnWidths.actions}px`,
//                         flexShrink: 0,
//                         minWidth: '120px'
//                     }}
//                 >
//                     <strong style={{ fontSize: '0.8rem' }}>Actions</strong>
//                 </div>

//                 {/* Resizing indicator overlay */}
//                 {isResizing && (
//                     <div
//                         style={{
//                             position: 'fixed',
//                             top: 0,
//                             left: 0,
//                             right: 0,
//                             bottom: 0,
//                             zIndex: 1000,
//                             cursor: 'col-resize'
//                         }}
//                     />
//                 )}
//             </div>
//         );
//     });

//     // Table Row Component
//     const TableRow = React.memo(({ index, style, data }) => {
//         const { accounts, isAdminOrSupervisor } = data;
//         const account = accounts[index];

//         const handleView = useCallback(() => navigate(`/retailer/companies/${account?._id}`), [account?._id]);
//         const handleEditClick = useCallback(() => account && handleEdit(account), [account]);
//         const handleDeleteClick = useCallback(() => account?._id && handleDelete(account._id), [account?._id]);
//         const handleSelect = useCallback(() => account && handleSelectAccount(account), [account]);

//         if (!account) return null;

//         const accountName = account.name || 'N/A';
//         const groupName = account.accountGroups?.name || 'N/A'; // Changed from companyGroups

//         return (
//             <div
//                 style={{
//                     ...style,
//                     display: 'flex',
//                     alignItems: 'center',
//                     height: '26px',
//                     minHeight: '26px',
//                     padding: '0',
//                     borderBottom: '1px solid #dee2e6',
//                     cursor: 'pointer',
//                 }}
//                 className={index % 1 === 0 ? 'bg-light' : 'bg-white'}
//                 onDoubleClick={handleView}
//             >
//                 {/* S.N. */}
//                 <div
//                     className="d-flex align-items-center justify-content-center px-0 border-end"
//                     style={{
//                         width: '50px',
//                         flexShrink: 0,
//                         height: '100%'
//                     }}
//                 >
//                     <span className="text-muted" style={{ fontSize: '0.75rem' }}>
//                         {index + 1}
//                     </span>
//                 </div>

//                 {/* Account Name */}
//                 <div
//                     className="d-flex align-items-center ps-2 border-end"
//                     style={{
//                         width: `${columnWidths.name}px`,
//                         flexShrink: 0,
//                         height: '100%',
//                         overflow: 'hidden'
//                     }}
//                     title={`${accountName}${account.pan ? ` | PAN: ${account.pan}` : ''}${account.phone ? ` | Phone: ${account.phone}` : ''}`}
//                 >
//                     <div className="d-flex flex-column justify-content-center" style={{ height: '100%', minWidth: 0 }}>
//                         <div className="d-flex align-items-center">
//                             <span
//                                 style={{
//                                     fontSize: '0.8rem',
//                                     fontWeight: '500',
//                                     whiteSpace: 'nowrap',
//                                     overflow: 'hidden',
//                                     textOverflow: 'ellipsis',
//                                     display: 'block',
//                                     maxWidth: '100%'
//                                 }}
//                             >
//                                 {accountName}
//                             </span>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Account Group */}
//                 <div
//                     className="px-2 border-end d-flex flex-column justify-content-center"
//                     style={{
//                         width: `${columnWidths.group}px`,
//                         flexShrink: 0,
//                         height: '100%'
//                     }}
//                 >
//                     <span style={{ fontSize: '0.8rem' }}>
//                         {groupName}
//                     </span>
//                 </div>

//                 {/* Actions */}
//                 <div
//                     className="px-2 d-flex align-items-center justify-content-end gap-1"
//                     style={{
//                         width: `${columnWidths.actions}px`,
//                         flexShrink: 0,
//                         height: '100%'
//                     }}
//                 >
//                     <Button
//                         variant="outline-info"
//                         size="sm"
//                         className="p-0 d-flex align-items-center justify-content-center"
//                         style={{
//                             width: '24px',
//                             height: '24px',
//                             minWidth: '24px'
//                         }}
//                         onClick={handleView}
//                         title={`View ${accountName}`}
//                     >
//                         <FiEye size={12} />
//                     </Button>

//                     {isAdminOrSupervisor && (
//                         <>
//                             <Button
//                                 variant="outline-warning"
//                                 size="sm"
//                                 className="p-0 d-flex align-items-center justify-content-center"
//                                 style={{
//                                     width: '24px',
//                                     height: '24px',
//                                     minWidth: '24px'
//                                 }}
//                                 onClick={handleEditClick}
//                                 title={`Edit ${accountName}`}
//                                 disabled={!!currentAccount}
//                             >
//                                 <FiEdit2 size={12} />
//                             </Button>
//                             <Button
//                                 variant="outline-danger"
//                                 size="sm"
//                                 className="p-0 d-flex align-items-center justify-content-center"
//                                 style={{
//                                     width: '24px',
//                                     height: '24px',
//                                     minWidth: '24px'
//                                 }}
//                                 onClick={handleDeleteClick}
//                                 title={`Delete ${accountName}`}
//                                 disabled={!!currentAccount}
//                             >
//                                 <FiTrash2 size={12} />
//                             </Button>
//                         </>
//                     )}

//                     <Button
//                         variant="outline-success"
//                         size="sm"
//                         className="p-0 d-flex align-items-center justify-content-center"
//                         style={{
//                             width: '24px',
//                             height: '24px',
//                             minWidth: '24px'
//                         }}
//                         onClick={handleSelect}
//                         title={`Select ${accountName}`}
//                     >
//                         <FiCheck size={12} />
//                     </Button>
//                 </div>
//             </div>
//         );
//     }, (prevProps, nextProps) => {
//         if (prevProps.index !== nextProps.index) return false;
//         if (prevProps.style !== nextProps.style) return false;

//         const prevAccount = prevProps.data.accounts[prevProps.index];
//         const nextAccount = nextProps.data.accounts[nextProps.index];

//         return (
//             shallowEqual(prevAccount, nextAccount) &&
//             prevProps.data.isAdminOrSupervisor === nextProps.data.isAdminOrSupervisor
//         );
//     });

//     // Resize Handle Component
//     const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => {
//         return (
//             <div
//                 className="resize-handle"
//                 style={{
//                     position: 'absolute',
//                     top: 0,
//                     left: `${left}px`,
//                     width: '5px',
//                     height: '100%',
//                     cursor: 'col-resize',
//                     backgroundColor: 'transparent',
//                     zIndex: 10,
//                     userSelect: 'none'
//                 }}
//                 onMouseDown={(e) => {
//                     e.preventDefault();
//                     onResizeStart(e, columnName);
//                 }}
//             />
//         );
//     });

//     // Reset column widths
//     const resetColumnWidths = () => {
//         setColumnWidths({
//             name: 160,
//             group: 180,
//             actions: 120
//         });
//         showNotificationMessage('Column widths reset to default', 'success');
//     };

//     const resetForm = () => {
//         setFormData({
//             name: '',
//             address: '',
//             phone: '',
//             ward: '',
//             pan: '',
//             email: '',
//             creditLimit: '',
//             contactPerson: '',
//             accountGroups: '', // Changed from companyGroups
//             openingBalance: {
//                 amount: 0,
//                 type: 'Dr'
//             }
//         });
//         setCurrentAccount(null);
//     };

//     const handleApiError = (error) => {
//         console.error('API Error details:', {
//             message: error.message,
//             response: error.response?.data,
//             status: error.response?.status,
//             config: error.config
//         });

//         let errorMessage = 'An error occurred';

//         if (error.response) {
//             switch (error.response.status) {
//                 case 400:
//                     errorMessage = error.response.data.error || 'Invalid request';
//                     break;
//                 case 401:
//                     // This is handled by interceptor
//                     errorMessage = 'Session expired. Please login again.';
//                     navigate('/auth/login');
//                     return;
//                 case 403:
//                     // Check if it's a trade type error
//                     if (error.response.data.error && error.response.data.error.includes('trade type')) {
//                         errorMessage = 'Access denied for this trade type. Please select a Retailer company.';
//                         navigate('/user-dashboard');
//                     } else {
//                         errorMessage = error.response.data.error || 'Access denied';
//                         navigate('/user-dashboard');
//                     }
//                     break;
//                 case 409:
//                     errorMessage = error.response.data.error || 'Account already exists';
//                     break;
//                 default:
//                     errorMessage = error.response.data.message || 'Request failed';
//             }
//         } else if (error.request) {
//             errorMessage = 'No response from server. Please check your connection.';
//         } else {
//             errorMessage = error.message || 'An error occurred';
//         }

//         showNotificationMessage(errorMessage, 'error');
//     };

//     const handleSearch = (e) => {
//         setSearchTerm(e.target.value.toLowerCase());
//     };

//     const handleCancel = () => {
//         setCurrentAccount(null);
//         setFormData({
//             name: '',
//             address: '',
//             phone: '',
//             ward: '',
//             pan: '',
//             email: '',
//             creditLimit: '',
//             contactPerson: '',
//             accountGroups: '', // Changed from companyGroups
//             openingBalance: {
//                 amount: 0,
//                 type: 'Dr'
//             }
//         });
//     };

//     const handleEdit = (account) => {
//         setCurrentAccount(account);
//         setFormData({
//             name: account.name,
//             address: account.address || '',
//             phone: account.phone || '',
//             ward: account.ward || '',
//             pan: account.pan || '',
//             email: account.email || '',
//             creditLimit: account.creditLimit || '',
//             contactPerson: account.contactPerson || '',
//             accountGroups: account.accountGroups?._id || '', // Changed from companyGroups
//             openingBalance: {
//                 amount: account.openingBalance?.amount || 0,
//                 type: account.openingBalance?.type || 'Dr'
//             }
//         });
//     };

//     const handleDelete = async (id) => {
//         if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
//             try {
//                 const response = await api.delete(`/api/retailer/companies/${id}`);

//                 if (response.data.success) {
//                     showNotificationMessage('Account deleted successfully', 'success');
//                     fetchAccounts();
//                 } else {
//                     showNotificationMessage(response.data.error || 'Failed to delete account', 'error');
//                 }
//             } catch (err) {
//                 handleApiError(err);
//             }
//         }
//     };

//     const handleSelectAccount = (account) => {
//         setFormData({
//             name: account.name,
//             address: account.address || '',
//             phone: account.phone || '',
//             ward: account.ward || '',
//             pan: account.pan || '',
//             email: account.email || '',
//             creditLimit: account.creditLimit || '',
//             contactPerson: account.contactPerson || '',
//             accountGroups: account.accountGroups?._id || '', // Changed from companyGroups
//             openingBalance: {
//                 amount: account.openingBalance?.amount || 0,
//                 type: account.openingBalance?.type || 'Dr'
//             }
//         });
//     };

//     const handleFormChange = (e) => {
//         const { name, value } = e.target;

//         if (name.includes('openingBalance')) {
//             const field = name.split('.')[1];
//             setFormData(prev => ({
//                 ...prev,
//                 openingBalance: {
//                     ...prev.openingBalance,
//                     [field]: field === 'amount' ? parseFloat(value) || 0 : value
//                 }
//             }));
//         } else {
//             setFormData(prev => ({ ...prev, [name]: value }));

//             // Update search term when name field changes
//             if (name === 'name') {
//                 setSearchTerm(value.toLowerCase());
//             }
//         }
//     };

//     const handleSubmit = async (e) => {
//         if (e) {
//             e.preventDefault();
//         }

//         setIsSaving(true);

//         try {
//             // Prepare the data in the format expected by backend
//             const requestData = {
//                 name: formData.name.trim(),
//                 address: formData.address?.trim() || '',
//                 phone: formData.phone?.trim() || '',
//                 ward: formData.ward ? parseInt(formData.ward) : null,
//                 pan: formData.pan?.trim() || null, // Send null if empty
//                 email: formData.email?.trim()?.toLowerCase() || '',
//                 creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 0,
//                 contactPerson: formData.contactPerson?.trim() || '',
//                 accountGroups: formData.accountGroups, // Guid as string
//                 openingBalance: {
//                     amount: parseFloat(formData.openingBalance.amount) || 0,
//                     type: formData.openingBalance.type || 'Dr'
//                 },
//                 isActive: true
//             };

//             // Validate required fields
//             if (!requestData.name || !requestData.accountGroups) {
//                 showNotificationMessage('Account name and account group are required', 'error');
//                 setIsSaving(false);
//                 return;
//             }

//             console.log('=== SENDING DATA TO BACKEND ===');
//             console.log('Request Data:', JSON.stringify(requestData, null, 2));
//             console.log('===============================');

//             if (currentAccount) {
//                 // Update existing account
//                 await api.put(`/api/retailer/companies/${currentAccount._id}`, requestData);
//                 showNotificationMessage('Account updated successfully!', 'success');
//             } else {
//                 // Create new account
//                 await api.post('/api/retailer/companies', requestData);
//                 showNotificationMessage('Account created successfully!', 'success');
//                 resetForm();

//                 setTimeout(() => {
//                     if (accountNameInputRef.current) {
//                         accountNameInputRef.current.focus();
//                     }
//                 }, 50);
//             }
//             fetchAccounts();
//         } catch (err) {
//             console.error('=== SUBMIT ERROR DETAILS ===');
//             console.error('Error:', err);
//             console.error('Response:', err.response?.data);

//             if (err.response?.data?.errors) {
//                 console.error('Validation Errors:', err.response.data.errors);
//                 const validationErrors = Object.entries(err.response.data.errors)
//                     .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
//                     .join('; ');
//                 showNotificationMessage(`Validation errors: ${validationErrors}`, 'error');
//             } else {
//                 handleApiError(err);
//             }
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     // Print function
//     // const printAccounts = () => {
//     //     let accountsToPrint = [...data.accounts];

//     //     // Apply filters
//     //     if (printOption === 'group' && selectedAccountGroup) { // Changed from selectedCompanyGroup
//     //         accountsToPrint = accountsToPrint.filter(account =>
//     //             account.accountGroups?._id === selectedAccountGroup // Changed from companyGroups
//     //         );
//     //     }

//     //     if (accountsToPrint.length === 0) {
//     //         alert("No accounts to print");
//     //         return;
//     //     }

//     //     const printWindow = window.open("", "_blank");

//     //     const printHeader = `
//     //         <div class="print-header">
//     //             <h1>${data.company?.companyName || data.currentCompanyName || 'Company Name'}</h1>
//     //             <hr>
//     //         </div>
//     //     `;

//     //     let tableContent = `
//     //         <style>
//     //             @page {
//     //                 size: A4 landscape;
//     //                 margin: 10mm;
//     //             }
//     //             body { 
//     //                 font-family: Arial, sans-serif; 
//     //                 font-size: 10px; 
//     //                 margin: 0;
//     //                 padding: 10mm;
//     //             }
//     //             table { 
//     //                 width: 100%; 
//     //                 border-collapse: collapse; 
//     //                 page-break-inside: auto;
//     //             }
//     //             tr { 
//     //                 page-break-inside: avoid; 
//     //                 page-break-after: auto; 
//     //             }
//     //             th, td { 
//     //                 border: 1px solid #000; 
//     //                 padding: 4px; 
//     //                 text-align: left; 
//     //                 white-space: nowrap;
//     //             }
//     //             th { 
//     //                 background-color: #f2f2f2 !important; 
//     //                 -webkit-print-color-adjust: exact; 
//     //             }
//     //             .print-header { 
//     //                 text-align: center; 
//     //                 margin-bottom: 15px; 
//     //             }
//     //             .nowrap {
//     //                 white-space: nowrap;
//     //             }
//     //             .badge { 
//     //                 padding: 3px 6px; 
//     //                 border-radius: 3px; 
//     //                 font-size: 10px; 
//     //                 display: inline-block;
//     //             }
//     //             .badge-danger { 
//     //                 background-color: #dc3545; 
//     //                 color: white; 
//     //             }
//     //             .badge-success { 
//     //                 background-color: #28a745; 
//     //                 color: white; 
//     //             }
//     //             .badge-info { 
//     //                 background-color: #17a2b8; 
//     //                 color: white; 
//     //             }
//     //             .footer-note {
//     //                 margin-top: 20px; 
//     //                 font-size: 0.9em; 
//     //                 color: #666;
//     //                 text-align: center;
//     //             }
//     //             .header-info {
//     //                 text-align: center;
//     //                 margin-bottom: 10px;
//     //                 font-size: 11px;
//     //             }
//     //             .report-title {
//     //                 text-align: center;
//     //                 font-size: 16px;
//     //                 font-weight: bold;
//     //                 margin-bottom: 5px;
//     //                 text-decoration: underline;
//     //             }
//     //             .filter-info {
//     //                 text-align: center;
//     //                 font-size: 11px;
//     //                 margin-bottom: 15px;
//     //                 color: #666;
//     //             }
//     //             .summary-row {
//     //                 background-color: #f8f9fa;
//     //                 font-weight: bold;
//     //             }
//     //         </style>
//     //         ${printHeader}

//     //         <div class="report-title">Accounts Report</div>

//     //         <div class="header-info">
//     //             <strong>Fiscal Year:</strong> ${data.currentFiscalYear?.name || 'N/A'} | 
//     //             <strong>Total Accounts:</strong> ${accountsToPrint.length}
//     //         </div>

//     //         <div class="filter-info">
//     //             ${printOption !== 'all' && selectedAccountGroup ?
//     //             `<strong>Filter:</strong> Account Group: ${data.accountGroups.find(g => g._id === selectedAccountGroup)?.name || 'N/A'} | ` : ''
//     //         }
//     //             <strong>Printed on:</strong> ${data.companyDateFormat === 'nepali' ?
//     //             (data.nepaliDate || new NepaliDate().format('YYYY-MM-DD')) :
//     //             new Date().toLocaleDateString()}
//     //         </div>

//     //         <table>
//     //             <thead>
//     //                 <tr>
//     //                     <th class="nowrap">S.N.</th>
//     //                     <th class="nowrap">Account Name</th>
//     //                     <th class="nowrap">Account Group</th>
//     //                     <th class="nowrap">Opening Balance</th>
//     //                     <th class="nowrap">Credit Limit</th>
//     //                     <th class="nowrap">Phone</th>
//     //                     <th class="nowrap">Email</th>
//     //                 </tr>
//     //             </thead>
//     //             <tbody>
//     //     `;

//     //     // Calculate totals
//     //     let totalDr = 0;
//     //     let totalCr = 0;
//     //     let totalCreditLimit = 0;

//     //     accountsToPrint.forEach((account, index) => {
//     //         const balance = account.openingBalance?.amount || 0;
//     //         const balanceType = account.openingBalance?.type || 'Dr';
//     //         const creditLimit = parseFloat(account.creditLimit) || 0;

//     //         if (balanceType === 'Dr') {
//     //             totalDr += balance;
//     //         } else {
//     //             totalCr += balance;
//     //         }
//     //         totalCreditLimit += creditLimit;

//     //         tableContent += `
//     //             <tr>
//     //                 <td class="nowrap">${index + 1}</td>
//     //                 <td class="nowrap">${account.name || 'N/A'}</td>
//     //                 <td class="nowrap">${account.accountGroups?.name || 'N/A'}</td> <!-- Changed from companyGroups -->
//     //                 <td class="nowrap">
//     //                         ${balance.toFixed(2)} ${balanceType}
//     //                 </td>
//     //                 <td class="nowrap">${creditLimit.toFixed(2)}</td>
//     //                 <td class="nowrap">${account.phone || 'N/A'}</td>
//     //                 <td class="nowrap">${account.email || 'N/A'}</td>
//     //             </tr>
//     //         `;
//     //     });

//     //     // Add summary row
//     //     tableContent += `
//     //             </tbody>
//     //             <tfoot>
//     //                 <tr class="summary-row">
//     //                     <td colspan="3" class="nowrap"><strong>Summary</strong></td>
//     //                     <td class="nowrap">
//     //                         <strong>Dr: ${totalDr.toFixed(2)} | Cr: ${totalCr.toFixed(2)}</strong>
//     //                     </td>
//     //                     <td class="nowrap"><strong>Total Credit Limit: ${totalCreditLimit.toFixed(2)}</strong></td>
//     //                     <td colspan="2"></td>
//     //                 </tr>
//     //             </tfoot>
//     //         </table>

//     //         <div class="footer-note">
//     //             <br>
//     //             ${data.company?.companyName ? `© ${new Date().getFullYear()} ${data.company.companyName}` : ''}
//     //         </div>
//     //     `;

//     //     printWindow.document.write(`
//     //         <html>
//     //             <head>
//     //                 <title>Accounts Report - ${data.company?.companyName || data.currentCompanyName || 'Accounts Report'}</title>
//     //             </head>
//     //             <body>
//     //                 ${tableContent}
//     //                 <script>
//     //                     window.onload = function() {
//     //                         setTimeout(function() {
//     //                             window.print();
//     //                             window.onafterprint = function() {
//     //                                 window.close();
//     //                             };
//     //                         }, 200);
//     //                     };
//     //                 <\/script>
//     //             </body>
//     //         </html>
//     //     `);
//     //     printWindow.document.close();
//     // };

//     // Print function - Updated to match Items component style
//     const printAccounts = () => {
//         let accountsToPrint = [...data.accounts];

//         // Apply filters
//         if (printOption === 'group' && selectedAccountGroup) {
//             accountsToPrint = accountsToPrint.filter(account =>
//                 account.accountGroups?._id === selectedAccountGroup
//             );
//         }

//         if (accountsToPrint.length === 0) {
//             alert("No accounts to print");
//             return;
//         }

//         const printWindow = window.open("", "_blank");

//         const printHeader = `
//         <div class="print-header">
//             <h1 style="font-size: 14px; margin: 0;">${data.company?.companyName || data.currentCompanyName || 'Company Name'}</h1>
//             <p style="font-size: 8px; margin: 2px 0;">
//                 ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''},
//                 PAN: ${data.company?.pan || ''}<br>
//             </p>
//             <hr style="margin: 2px 0;">
//         </div>
//     `;

//         let tableContent = `
//         <style>
//             @page {
//                 margin: 3mm;
//             }
//             body { 
//                 font-family: Arial, sans-serif; 
//                 font-size: 7px; 
//                 margin: 0;
//                 padding: 2mm;
//             }
//             table { 
//                 width: 100%; 
//                 border-collapse: collapse; 
//                 page-break-inside: auto;
//                 font-size: 6px;
//             }
//             tr { 
//                 page-break-inside: avoid; 
//                 page-break-after: auto; 
//             }
//             th, td { 
//                 border: 1px solid #000; 
//                 padding: 2px 3px; 
//                 text-align: left; 
//                 white-space: nowrap;
//             }
//             th { 
//                 background-color: #f2f2f2 !important; 
//                 -webkit-print-color-adjust: exact;
//                 font-size: 10px;
//                 font-weight: bold;
//                 padding: 3px 3px;
//             }
//             td {
//                 font-size: 8px;
//                 padding: 2px 3px;
//             }
//             .print-header { 
//                 text-align: center; 
//                 margin-bottom: 5px; 
//             }
//             .nowrap {
//                 white-space: nowrap;
//             }
//             h1 {
//                 font-size: 14px;
//                 margin: 0;
//             }
//             .report-title {
//                 text-align: center;
//                 text-decoration: underline;
//                 font-size: 11px;
//                 font-weight: bold;
//                 margin: 3px 0;
//             }
//             .grand-total-row td {
//                 font-weight: bold;
//                 border-top: 2px solid #000;
//                 font-size: 7px;
//             }
//             .header-info {
//                 text-align: center;
//                 margin-bottom: 5px;
//                 font-size: 8px;
//             }
//             .filter-info {
//                 text-align: center;
//                 margin-bottom: 8px;
//                 font-size: 7px;
//                 color: #666;
//             }
//             .balance-dr {
//                 color: #dc3545;
//                 font-weight: bold;
//             }
//             .balance-cr {
//                 color: #28a745;
//                 font-weight: bold;
//             }
//             .summary-row {
//                 background-color: #f8f9fa;
//                 font-weight: bold;
//             }
//             .footer-note {
//                 margin-top: 10px;
//                 font-size: 7px;
//                 color: #666;
//                 text-align: center;
//             }
//         </style>
//         ${printHeader}
//         <div class="report-title">Accounts Report</div>
        
//         <div class="header-info">
//             <strong>Fiscal Year:</strong> ${data.currentFiscalYear?.name || 'N/A'} | 
//             <strong>Total Accounts:</strong> ${accountsToPrint.length}
//         </div>
        
//         <div class="filter-info">
//             ${printOption !== 'all' && selectedAccountGroup ?
//                 `<strong>Filter:</strong> Account Group: ${data.accountGroups.find(g => g._id === selectedAccountGroup)?.name || 'N/A'} | ` : ''
//             }
//             <strong>Printed on:</strong> ${data.companyDateFormat === 'nepali' ?
//                 (data.nepaliDate || new NepaliDate().format('YYYY-MM-DD')) :
//                 new Date().toLocaleDateString()}
//         </div>
        
//         <table>
//             <thead>
//                 <tr>
//                     <th class="nowrap">S.N.</th>
//                     <th class="nowrap">Account Name</th>
//                     <th class="nowrap">Account Group</th>
//                     <th class="nowrap">Opening Balance</th>
//                     <th class="nowrap">Credit Limit</th>
//                     <th class="nowrap">Phone</th>
//                     <th class="nowrap">Email</th>
//                     <th class="nowrap">PAN/VAT</th>
//                     <th class="nowrap">Address</th>
//                 </tr>
//             </thead>
//             <tbody>
//     `;

//         // Calculate totals
//         let totalDr = 0;
//         let totalCr = 0;
//         let totalCreditLimit = 0;

//         accountsToPrint.forEach((account, index) => {
//             const balance = account.openingBalance?.amount || 0;
//             const balanceType = account.openingBalance?.type || 'Dr';
//             const creditLimit = parseFloat(account.creditLimit) || 0;

//             if (balanceType === 'Dr') {
//                 totalDr += balance;
//             } else {
//                 totalCr += balance;
//             }
//             totalCreditLimit += creditLimit;

//             const balanceClass = balanceType === 'Dr' ? 'balance-dr' : 'balance-cr';

//             tableContent += `
//             <tr>
//                 <td class="nowrap">${index + 1}</td>
//                 <td class="nowrap">${escapeHtml(account.name || 'N/A')}</td>
//                 <td class="nowrap">${escapeHtml(account.accountGroups?.name || 'N/A')}</td>
//                 <td class="nowrap ${balanceClass}">
//                     ${balance.toFixed(2)} ${balanceType}
//                 </td>
//                 <td class="nowrap">${creditLimit.toFixed(2)}</td>
//                 <td class="nowrap">${escapeHtml(account.phone || 'N/A')}</td>
//                 <td class="nowrap">${escapeHtml(account.email || 'N/A')}</td>
//                 <td class="nowrap">${escapeHtml(account.pan || 'N/A')}</td>
//                 <td class="nowrap">${escapeHtml(account.address || 'N/A')}</td>
//             </tr>
//         `;
//         });

//         // Add summary row
//         tableContent += `
//             </tbody>
//             <tfoot>
//                 <tr class="summary-row grand-total-row">
//                     <td colspan="3" class="nowrap"><strong>Summary</strong></td>
//                     <td class="nowrap">
//                         <strong>Dr: ${totalDr.toFixed(2)} | Cr: ${totalCr.toFixed(2)}</strong>
//                     </td>
//                     <td class="nowrap"><strong>${totalCreditLimit.toFixed(2)}</strong></td>
//                     <td colspan="4"></td>
//                 </tr>
//             </tfoot>
//         </table>
        
//         <div class="footer-note">
//             ${data.company?.companyName ? `© ${new Date().getFullYear()} ${data.company.companyName}` : ''}
//         </div>
//     `;

//         printWindow.document.write(`
//         <!DOCTYPE html>
//         <html>
//             <head>
//                 <title>Accounts Report - ${data.company?.companyName || data.currentCompanyName || 'Accounts Report'}</title>
//                 <meta charset="UTF-8">
//             </head>
//             <body>
//                 ${tableContent}
//                 <script>
//                     window.onload = function() {
//                         setTimeout(function() {
//                             window.print();
//                             window.close();
//                         }, 200);
//                     };
//                 <\/script>
//             </body>
//         </html>
//     `);
//         printWindow.document.close();
//     };

//     // Helper function to escape HTML special characters (add this before the printAccounts function)
//     const escapeHtml = (text) => {
//         if (!text) return '';
//         const div = document.createElement('div');
//         div.textContent = text;
//         return div.innerHTML;
//     };

//     // Export to Excel function
//     const exportToExcel = async (exportAll = false) => {
//         setExporting(true);
//         try {
//             // Get accounts to export
//             const accountsToExport = exportAll ? data.accounts : filteredAccounts;

//             if (accountsToExport.length === 0) {
//                 showNotificationMessage('No accounts to export', 'warning');
//                 return;
//             }

//             // Prepare data for Excel
//             const excelData = accountsToExport.map((account, index) => {
//                 return {
//                     'S.N.': index + 1,
//                     'Account Name': account.name || 'N/A',
//                     'Account Group': account.accountGroups?.name || 'N/A', // Changed from companyGroups
//                     'Opening Balance': account.openingBalance?.amount || 0,
//                     'Balance Type': account.openingBalance?.type || 'Dr',
//                     'Credit Limit': account.creditLimit || 0,
//                     'Phone': account.phone || '',
//                     'Email': account.email || '',
//                     'Address': account.address || '',
//                     'Ward No.': account.ward || '',
//                     'PAN/VAT': account.pan || '',
//                     'Contact Person': account.contactPerson || '',
//                     'Created': account.createdAt ? new Date(account.createdAt).toLocaleDateString() : '',
//                     'Last Updated': account.updatedAt ? new Date(account.updatedAt).toLocaleDateString() : ''
//                 };
//             });

//             // Add summary statistics
//             const summaryData = [
//                 {},
//                 {
//                     'S.N.': 'SUMMARY',
//                     'Account Name': 'Total Accounts:',
//                     'Account Group': accountsToExport.length
//                 },
//                 {
//                     'S.N.': '',
//                     'Account Name': 'Total Dr Balance:',
//                     'Account Group': accountsToExport
//                         .filter(acc => acc.openingBalance?.type === 'Dr')
//                         .reduce((sum, acc) => sum + (parseFloat(acc.openingBalance?.amount) || 0), 0)
//                         .toFixed(2)
//                 },
//                 {
//                     'S.N.': '',
//                     'Account Name': 'Total Cr Balance:',
//                     'Account Group': accountsToExport
//                         .filter(acc => acc.openingBalance?.type === 'Cr')
//                         .reduce((sum, acc) => sum + (parseFloat(acc.openingBalance?.amount) || 0), 0)
//                         .toFixed(2)
//                 },
//                 {
//                     'S.N.': '',
//                     'Account Name': 'Total Credit Limit:',
//                     'Account Group': accountsToExport
//                         .reduce((sum, acc) => sum + (parseFloat(acc.creditLimit) || 0), 0)
//                         .toFixed(2)
//                 }
//             ];

//             // Create workbook
//             const wb = XLSX.utils.book_new();

//             // Main accounts sheet
//             const ws = XLSX.utils.json_to_sheet(excelData);

//             // Auto-size columns
//             ws['!cols'] = [
//                 { wch: 6 },   // S.N.
//                 { wch: 30 },  // Account Name
//                 { wch: 20 },  // Account Group
//                 { wch: 15 },  // Opening Balance
//                 { wch: 10 },  // Balance Type
//                 { wch: 15 },  // Credit Limit
//                 { wch: 15 },  // Phone
//                 { wch: 25 },  // Email
//                 { wch: 30 },  // Address
//                 { wch: 8 },   // Ward No.
//                 { wch: 12 },  // PAN/VAT
//                 { wch: 20 },  // Contact Person
//                 { wch: 12 },  // Created
//                 { wch: 12 }   // Last Updated
//             ];

//             XLSX.utils.book_append_sheet(wb, ws, 'Accounts');

//             // Summary sheet
//             const wsSummary = XLSX.utils.json_to_sheet(summaryData);
//             XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

//             // Generate filename
//             const date = new Date().toISOString().split('T')[0];
//             const filterInfo = exportAll ? 'All' : 'Filtered';
//             const fileName = `Accounts_Report_${filterInfo}_${date}.xlsx`;

//             // Save file
//             XLSX.writeFile(wb, fileName);

//             showNotificationMessage(
//                 `${exportAll ? 'All' : 'Filtered'} accounts (${accountsToExport.length}) exported successfully!`,
//                 'success'
//             );

//         } catch (err) {
//             console.error('Error exporting to Excel:', err);
//             showNotificationMessage('Failed to export to Excel', 'error');
//         } finally {
//             setExporting(false);
//         }
//     };

//     return (
//         <div className="container-fluid">
//             <Header />
//             <NotificationToast
//                 message={notificationMessage}
//                 type={notificationType}
//                 show={showNotification}
//                 onClose={() => setShowNotification(false)}
//             />

//             {/* Debug info - remove in production */}
//             <div className="debug-info" style={{ display: 'none' }}>
//                 <p>Token: {localStorage.getItem('token') ? 'Exists' : 'Missing'}</p>
//                 <p>Loading: {loading.toString()}</p>
//                 <p>Accounts count: {data.accounts.length}</p>
//             </div>

//             <div className="card mt-2">
//                 <div className="row g-3">
//                     {/* Left Column - Add Account Form */}
//                     <div className="col-lg-6">
//                         <div className="card h-100 shadow-lg">
//                             <div className="card-body">
//                                 <h3 className="text-center" style={{ textDecoration: 'underline' }}>
//                                     {currentAccount ? `Edit Account: ${currentAccount.name}` : 'Create Accounts'}
//                                 </h3>
//                                 <Form onSubmit={handleSubmit} id="addAccountForm" style={{ marginTop: '5px' }}>
//                                     <Form.Group className="row" style={{ marginBottom: '8px', gap: '5px 0' }}>
//                                         <div className="col-md-5">
//                                             <div className="position-relative">
//                                                 <Form.Control
//                                                     ref={accountNameInputRef}
//                                                     type="text"
//                                                     name="name"
//                                                     value={formData.name}
//                                                     onChange={handleFormChange}
//                                                     placeholder=" "
//                                                     required
//                                                     autoFocus
//                                                     autoComplete="off"
//                                                     style={{
//                                                         height: '30px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.75rem'
//                                                     }}
//                                                 />
//                                                 <label
//                                                     className="position-absolute"
//                                                     style={{
//                                                         top: '-8px',
//                                                         left: '0.75rem',
//                                                         fontSize: '0.75rem',
//                                                         backgroundColor: 'white',
//                                                         padding: '0 0.25rem',
//                                                         color: '#6c757d',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     Account Name <span className="text-danger">*</span>
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         <div className="col-md-4">
//                                             <div className="position-relative">
//                                                 <Form.Select
//                                                     name="accountGroups" // Changed from companyGroups
//                                                     value={formData.accountGroups} // Changed from companyGroups
//                                                     onChange={handleFormChange}
//                                                     required
//                                                     style={{
//                                                         height: '30px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.5rem',
//                                                         paddingBottom: '0'
//                                                     }}
//                                                 >
//                                                     <option value="" disabled>Select Group</option>
//                                                     {data.accountGroups.map(group => ( // Changed from companyGroups
//                                                         <option key={group._id} value={group._id}>
//                                                             {group.name}
//                                                         </option>
//                                                     ))}
//                                                 </Form.Select>
//                                                 <label
//                                                     className="position-absolute"
//                                                     style={{
//                                                         top: '-8px',
//                                                         left: '0.75rem',
//                                                         fontSize: '0.75rem',
//                                                         backgroundColor: 'white',
//                                                         padding: '0 0.25rem',
//                                                         color: '#6c757d',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     Account Group <span className="text-danger">*</span>
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         <div className="col-md-3">
//                                             <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
//                                                 <div className="position-relative">
//                                                     <div style={{ position: 'relative' }}>
//                                                         <Form.Control
//                                                             type="number"
//                                                             name="openingBalance.amount"
//                                                             value={formData.openingBalance.amount}
//                                                             onChange={handleFormChange}
//                                                             step="any"
//                                                             disabled={!data.isInitialFiscalYear}
//                                                             placeholder=" "
//                                                             style={{
//                                                                 height: '30px',
//                                                                 fontSize: '0.875rem',
//                                                                 paddingTop: '0.75rem',
//                                                                 paddingRight: '45px'
//                                                             }}
//                                                         />
//                                                         <div style={{
//                                                             position: 'absolute',
//                                                             top: '2px',
//                                                             right: '5px',
//                                                             width: '40px',
//                                                             height: '26px'
//                                                         }}>
//                                                             <Form.Select
//                                                                 name="openingBalance.type"
//                                                                 value={formData.openingBalance.type}
//                                                                 onChange={handleFormChange}
//                                                                 disabled={!data.isInitialFiscalYear}
//                                                                 style={{
//                                                                     height: '100%',
//                                                                     fontSize: '0.75rem',
//                                                                     padding: '0 4px',
//                                                                     border: 'none',
//                                                                     background: 'transparent',
//                                                                     appearance: 'none',
//                                                                     WebkitAppearance: 'none',
//                                                                     MozAppearance: 'none'
//                                                                 }}
//                                                             >
//                                                                 <option value="Dr">Dr.</option>
//                                                                 <option value="Cr">Cr.</option>
//                                                             </Form.Select>
//                                                         </div>
//                                                         <label
//                                                             className="position-absolute"
//                                                             style={{
//                                                                 top: '-8px',
//                                                                 left: '0.75rem',
//                                                                 fontSize: '0.75rem',
//                                                                 backgroundColor: 'white',
//                                                                 padding: '0 0.25rem',
//                                                                 color: '#6c757d',
//                                                                 fontWeight: '500'
//                                                             }}
//                                                         >
//                                                             Opening
//                                                         </label>
//                                                     </div>
//                                                 </div>

//                                                 {!data.isInitialFiscalYear && (
//                                                     <small className="text-muted" style={{ fontSize: '0.7rem' }}>
//                                                         Op. only set init. f.y
//                                                     </small>
//                                                 )}
//                                             </div>
//                                         </div>
//                                     </Form.Group>

//                                     <Form.Group className="row" style={{ marginBottom: '8px', gap: '5px 0' }}>
//                                         <div className="col">
//                                             <div className="position-relative">
//                                                 <Form.Control
//                                                     type="number"
//                                                     name="creditLimit"
//                                                     value={formData.creditLimit}
//                                                     onChange={handleFormChange}
//                                                     step="any"
//                                                     placeholder=" "
//                                                     style={{
//                                                         height: '30px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.75rem'
//                                                     }}
//                                                 />
//                                                 <label
//                                                     className="position-absolute"
//                                                     style={{
//                                                         top: '-8px',
//                                                         left: '0.75rem',
//                                                         fontSize: '0.75rem',
//                                                         backgroundColor: 'white',
//                                                         padding: '0 0.25rem',
//                                                         color: '#6c757d',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     Credit Limit
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         <div className="col">
//                                             <div className="position-relative">
//                                                 <Form.Control
//                                                     type="text"
//                                                     name="pan"
//                                                     value={formData.pan}
//                                                     onChange={handleFormChange}
//                                                     minLength="9"
//                                                     maxLength="9"
//                                                     placeholder=" "
//                                                     autoComplete="off"
//                                                     style={{
//                                                         height: '30px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.75rem'
//                                                     }}
//                                                 />
//                                                 <label
//                                                     className="position-absolute"
//                                                     style={{
//                                                         top: '-8px',
//                                                         left: '0.75rem',
//                                                         fontSize: '0.75rem',
//                                                         backgroundColor: 'white',
//                                                         padding: '0 0.25rem',
//                                                         color: '#6c757d',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     Pan No.
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         <div className="col">
//                                             <div className="position-relative">
//                                                 <Form.Control
//                                                     type="text"
//                                                     name="address"
//                                                     value={formData.address}
//                                                     onChange={handleFormChange}
//                                                     placeholder=" "
//                                                     autoComplete="off"
//                                                     style={{
//                                                         height: '30px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.75rem'
//                                                     }}
//                                                 />
//                                                 <label
//                                                     className="position-absolute"
//                                                     style={{
//                                                         top: '-8px',
//                                                         left: '0.75rem',
//                                                         fontSize: '0.75rem',
//                                                         backgroundColor: 'white',
//                                                         padding: '0 0.25rem',
//                                                         color: '#6c757d',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     Address
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         <div className="col">
//                                             <div className="position-relative">
//                                                 <Form.Control
//                                                     type="number"
//                                                     name="ward"
//                                                     value={formData.ward}
//                                                     onChange={handleFormChange}
//                                                     placeholder=" "
//                                                     autoComplete="off"
//                                                     style={{
//                                                         height: '30px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.75rem'
//                                                     }}
//                                                 />
//                                                 <label
//                                                     className="position-absolute"
//                                                     style={{
//                                                         top: '-8px',
//                                                         left: '0.75rem',
//                                                         fontSize: '0.75rem',
//                                                         backgroundColor: 'white',
//                                                         padding: '0 0.25rem',
//                                                         color: '#6c757d',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     Ward No.
//                                                 </label>
//                                             </div>
//                                         </div>
//                                     </Form.Group>

//                                     <Form.Group className="row" style={{ marginBottom: '12px', gap: '5px 0' }}>
//                                         <div className="col-md-4">
//                                             <div className="position-relative">
//                                                 <Form.Control
//                                                     type="text"
//                                                     name="phone"
//                                                     value={formData.phone}
//                                                     onChange={handleFormChange}
//                                                     placeholder=" "
//                                                     autoComplete="off"
//                                                     style={{
//                                                         height: '30px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.75rem'
//                                                     }}
//                                                 />
//                                                 <label
//                                                     className="position-absolute"
//                                                     style={{
//                                                         top: '-8px',
//                                                         left: '0.75rem',
//                                                         fontSize: '0.75rem',
//                                                         backgroundColor: 'white',
//                                                         padding: '0 0.25rem',
//                                                         color: '#6c757d',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     Phone
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         <div className="col-md-4">
//                                             <div className="position-relative">
//                                                 <Form.Control
//                                                     type="email"
//                                                     name="email"
//                                                     value={formData.email}
//                                                     onChange={handleFormChange}
//                                                     placeholder=" "
//                                                     autoComplete="off"
//                                                     style={{
//                                                         height: '30px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.75rem',
//                                                         textTransform: 'lowercase'
//                                                     }}
//                                                 />
//                                                 <label
//                                                     className="position-absolute"
//                                                     style={{
//                                                         top: '-8px',
//                                                         left: '0.75rem',
//                                                         fontSize: '0.75rem',
//                                                         backgroundColor: 'white',
//                                                         padding: '0 0.25rem',
//                                                         color: '#6c757d',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     Email
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         <div className="col-md-4">
//                                             <div className="position-relative">
//                                                 <Form.Control
//                                                     type="text"
//                                                     name="contactPerson"
//                                                     value={formData.contactPerson}
//                                                     onChange={handleFormChange}
//                                                     placeholder=" "
//                                                     autoComplete="off"
//                                                     style={{
//                                                         height: '30px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.75rem'
//                                                     }}
//                                                 />
//                                                 <label
//                                                     className="position-absolute"
//                                                     style={{
//                                                         top: '-8px',
//                                                         left: '0.75rem',
//                                                         fontSize: '0.75rem',
//                                                         backgroundColor: 'white',
//                                                         padding: '0 0.25rem',
//                                                         color: '#6c757d',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     Contact Person
//                                                 </label>
//                                             </div>
//                                         </div>
//                                     </Form.Group>
//                                     <div className="d-flex justify-content-between align-items-center">
//                                         {currentAccount ? (
//                                             <Button
//                                                 variant="secondary"
//                                                 onClick={handleCancel}
//                                                 disabled={isSaving}
//                                                 className="d-flex align-items-center"
//                                                 style={{
//                                                     height: '28px',
//                                                     padding: '0 12px',
//                                                     fontSize: '0.8rem',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 <FiX className="me-1" size={14} />
//                                                 Cancel
//                                             </Button>
//                                         ) : (
//                                             <div></div>
//                                         )}
//                                         <div className="d-flex align-items-center">
//                                             <Button
//                                                 variant="primary"
//                                                 type="submit"
//                                                 disabled={isSaving}
//                                                 className="d-flex align-items-center"
//                                                 onKeyDown={(e) => {
//                                                     if (e.key === 'Enter') {
//                                                         e.preventDefault();
//                                                         handleSubmit(e);
//                                                     }
//                                                 }}
//                                                 style={{
//                                                     height: '28px',
//                                                     padding: '0 16px',
//                                                     fontSize: '0.8rem',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 {isSaving ? (
//                                                     <>
//                                                         <Spinner
//                                                             as="span"
//                                                             animation="border"
//                                                             size="sm"
//                                                             role="status"
//                                                             aria-hidden="true"
//                                                             className="me-2"
//                                                         />
//                                                         Saving...
//                                                     </>
//                                                 ) : currentAccount ? (
//                                                     <>
//                                                         <FiCheck className="me-1" size={14} />
//                                                         Save Changes
//                                                     </>
//                                                 ) : (
//                                                     'Add Account'
//                                                 )}
//                                             </Button>
//                                             <small className="ms-2 text-muted" style={{ fontSize: '0.7rem' }}>
//                                                 Alt+S to Save
//                                             </small>
//                                         </div>
//                                     </div>
//                                 </Form>
//                             </div>
//                         </div>
//                     </div>
//                     <div className="col-lg-6">
//                         <div className="card h-100 shadow-lg">
//                             <div className="card-body">
//                                 <h3 className="text-center" style={{ textDecoration: 'underline' }}>Existing Accounts</h3>

//                                 <div className="row g-1 mb-2 align-items-center">
//                                     <div className="col-auto">
//                                         <Button
//                                             variant="primary"
//                                             onClick={() => navigate(-1)}
//                                             className="d-flex align-items-center p-1"
//                                             title="Go back"
//                                             style={{
//                                                 height: '24px',
//                                                 minWidth: '24px',
//                                                 fontSize: '0.7rem'
//                                             }}
//                                         >
//                                             <FiArrowLeft size={10} />
//                                             <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Back</span>
//                                         </Button>
//                                     </div>
//                                     <div className="col-auto">
//                                         <Button
//                                             variant="primary"
//                                             onClick={() => setShowPrintModal(true)}
//                                             className="d-flex align-items-center p-1"
//                                             title="Print report"
//                                             style={{
//                                                 height: '24px',
//                                                 minWidth: '24px',
//                                                 fontSize: '0.7rem'
//                                             }}
//                                         >
//                                             <FiPrinter size={10} />
//                                             <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Print</span>
//                                         </Button>
//                                     </div>
//                                     <div className="col-auto">
//                                         <Button
//                                             variant="success"
//                                             onClick={() => exportToExcel(true)}
//                                             disabled={exporting || data.accounts.length === 0}
//                                             title="Export all accounts to Excel"
//                                             className="d-flex align-items-center p-1"
//                                             style={{
//                                                 height: '24px',
//                                                 minWidth: '24px',
//                                                 fontSize: '0.7rem'
//                                             }}
//                                         >
//                                             {exporting ? (
//                                                 <Spinner animation="border" size="sm" className="me-1" style={{ width: '10px', height: '10px' }} />
//                                             ) : (
//                                                 <i className="fas fa-file-excel" style={{ fontSize: '0.7rem' }}></i>
//                                             )}
//                                             <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Export</span>
//                                         </Button>
//                                     </div>
//                                     <div className="col">
//                                         <div style={{ position: 'relative' }}>
//                                             <Form.Control
//                                                 type="text"
//                                                 placeholder=" "
//                                                 value={searchTerm}
//                                                 onChange={handleSearch}
//                                                 className="w-100"
//                                                 style={{
//                                                     height: '24px',
//                                                     fontSize: '0.75rem',
//                                                     paddingTop: '0.6rem',
//                                                     paddingLeft: '0.5rem'
//                                                 }}
//                                             />
//                                             <label
//                                                 className="position-absolute"
//                                                 style={{
//                                                     top: '-6px',
//                                                     left: '0.5rem',
//                                                     fontSize: '0.65rem',
//                                                     backgroundColor: 'white',
//                                                     padding: '0 0.25rem',
//                                                     color: '#6c757d',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 Search accounts...
//                                             </label>
//                                         </div>
//                                     </div>
//                                     <div className="col-auto">
//                                         <Button
//                                             variant="outline-secondary"
//                                             size="sm"
//                                             onClick={resetColumnWidths}
//                                             title="Reset column widths to default"
//                                             className="d-flex align-items-center p-1"
//                                             style={{
//                                                 height: '24px',
//                                                 minWidth: '24px',
//                                                 fontSize: '0.7rem'
//                                             }}
//                                         >
//                                             <FiRefreshCw size={10} />
//                                             <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Reset</span>
//                                         </Button>
//                                     </div>
//                                 </div>
//                                 {/* <div style={{ height: 'calc(100vh - 300px)', width: '100%' }}>
//                                     {loading ? (
//                                         <div className="d-flex flex-column justify-content-center align-items-center h-100">
//                                             <Spinner
//                                                 animation="border"
//                                                 variant="primary"
//                                                 size="sm"
//                                                 style={{ width: '1.5rem', height: '1.5rem' }}
//                                             />
//                                             <p className="mt-2 small text-muted" style={{ fontSize: '0.8rem' }}>
//                                                 Loading accounts...
//                                             </p>
//                                         </div>
//                                     ) : filteredAccounts.length === 0 ? (
//                                         <div className="d-flex flex-column justify-content-center align-items-center h-100">
//                                             <i className="bi bi-people text-muted" style={{ fontSize: '1.5rem' }}></i>
//                                             <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
//                                                 No accounts found
//                                             </h6>
//                                             <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
//                                                 {searchTerm ? 'Try a different search term' : 'Create your first account using the form'}
//                                             </p>
//                                         </div>
//                                     ) : (
//                                         <AutoSizer>
//                                             {({ height, width }) => {
//                                                 const totalWidth = 60 + columnWidths.name + columnWidths.group + columnWidths.actions;

//                                                 return (
//                                                     <div style={{
//                                                         position: 'relative',
//                                                         height: height,
//                                                         width: Math.max(width, totalWidth),
//                                                         overflowX: 'auto'
//                                                     }}>
//                                                         <TableHeader />
//                                                         <List
//                                                             height={height - 60}
//                                                             itemCount={filteredAccounts.length}
//                                                             itemSize={26}
//                                                             width={Math.max(width, totalWidth)}
//                                                             itemData={{
//                                                                 accounts: filteredAccounts,
//                                                                 isAdminOrSupervisor: data.isAdminOrSupervisor
//                                                             }}
//                                                         >
//                                                             {TableRow}
//                                                         </List>
//                                                         <div className="mt-2 text-muted small">
//                                                             Showing {filteredAccounts.length} of {data.accounts.length} accounts
//                                                             {searchTerm && ` (filtered)`}
//                                                         </div>
//                                                     </div>
//                                                 );
//                                             }}
//                                         </AutoSizer>
//                                     )}
//                                 </div> */}

//                                 <div style={{ height: 'calc(100vh - 300px)', width: '100%' }}>
//                                     {loading ? (
//                                         <div className="d-flex flex-column justify-content-center align-items-center h-100">
//                                             <Spinner
//                                                 animation="border"
//                                                 variant="primary"
//                                                 size="sm"
//                                                 style={{ width: '1.5rem', height: '1.5rem' }}
//                                             />
//                                             <p className="mt-2 small text-muted" style={{ fontSize: '0.8rem' }}>
//                                                 Loading accounts...
//                                             </p>
//                                         </div>
//                                     ) : paginatedAccounts.length === 0 ? (
//                                         <div className="d-flex flex-column justify-content-center align-items-center h-100">
//                                             <i className="bi bi-people text-muted" style={{ fontSize: '1.5rem' }}></i>
//                                             <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
//                                                 No accounts found
//                                             </h6>
//                                             <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
//                                                 {searchTerm ? 'Try a different search term' : 'Create your first account using the form'}
//                                             </p>
//                                         </div>
//                                     ) : (
//                                         <AutoSizer>
//                                             {({ height, width }) => {
//                                                 const totalWidth = 50 + columnWidths.name + columnWidths.group + columnWidths.actions;

//                                                 return (
//                                                     <div
//                                                         ref={tableContainerRef}
//                                                         style={{
//                                                             position: 'relative',
//                                                             height: height,
//                                                             width: Math.max(width, totalWidth),
//                                                             overflowX: 'auto',
//                                                             overflowY: 'auto'
//                                                         }}
//                                                     >
//                                                         <TableHeader />
//                                                         <List
//                                                             key={`accounts-list-${paginatedAccounts.length}-${currentPage}`}
//                                                             height={height - 60}
//                                                             itemCount={paginatedAccounts.length}
//                                                             itemSize={26}
//                                                             width={Math.max(width, totalWidth)}
//                                                             itemData={{
//                                                                 accounts: paginatedAccounts,
//                                                                 isAdminOrSupervisor: data.isAdminOrSupervisor
//                                                             }}
//                                                         >
//                                                             {TableRow}
//                                                         </List>

//                                                         {/* Loading More Indicator */}
//                                                         {isLoadingMore && (
//                                                             <div className="text-center py-2">
//                                                                 <Spinner animation="border" size="sm" className="me-2" />
//                                                                 <span className="text-muted" style={{ fontSize: '0.7rem' }}>Loading more accounts...</span>
//                                                             </div>
//                                                         )}

//                                                         {/* Footer with item count and load more button */}
//                                                         <div className="mt-2 text-muted small">
//                                                             Showing {paginatedAccounts.length} of {totalFilteredAccounts} accounts
//                                                             {searchTerm && ` (filtered)`}
//                                                             {hasMoreItems && paginatedAccounts.length < totalFilteredAccounts && (
//                                                                 <span className="ms-2">
//                                                                     <Button
//                                                                         variant="link"
//                                                                         size="sm"
//                                                                         className="p-0 ms-2"
//                                                                         onClick={loadMoreItems}
//                                                                         disabled={isLoadingMore}
//                                                                         style={{ fontSize: '0.7rem' }}
//                                                                     >
//                                                                         Load more...
//                                                                     </Button>
//                                                                 </span>
//                                                             )}
//                                                         </div>
//                                                     </div>
//                                                 );
//                                             }}
//                                         </AutoSizer>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//             </div>

//             {/* Print Options Modal */}
//             <Modal
//                 show={showPrintModal}
//                 onHide={() => setShowPrintModal(false)}
//                 centered
//                 size="md"
//             >
//                 <Modal.Header closeButton className="bg-primary text-white py-2">
//                     <Modal.Title className="d-flex align-items-center">
//                         <FiPrinter className="me-2" size={20} />
//                         <div className="d-flex flex-column">
//                             <span className="fw-bold fs-6">Print Accounts Report</span>
//                             <small className="opacity-75">Select filter options</small>
//                         </div>
//                     </Modal.Title>
//                 </Modal.Header>
//                 <Modal.Body className="p-3">
//                     <div className="mb-3">
//                         <h6 className="fw-bold mb-2 text-primary">Filter Options</h6>
//                         <div className="d-flex gap-2 mb-3">
//                             <Button
//                                 variant={printOption === 'all' ? 'primary' : 'outline-primary'}
//                                 onClick={() => setPrintOption('all')}
//                                 size="sm"
//                             >
//                                 All Accounts
//                             </Button>
//                             <Button
//                                 variant={printOption === 'group' ? 'info' : 'outline-info'}
//                                 onClick={() => setPrintOption('group')}
//                                 size="sm"
//                             >
//                                 By Account Group
//                             </Button>
//                         </div>

//                         {printOption === 'group' && (
//                             <div className="mt-3">
//                                 <Form.Label className="small fw-semibold">Select Account Group</Form.Label>
//                                 <Form.Select
//                                     size="sm"
//                                     value={selectedAccountGroup} // Changed from selectedCompanyGroup
//                                     onChange={(e) => setSelectedAccountGroup(e.target.value)} // Changed from selectedCompanyGroup
//                                     className="mb-2"
//                                 >
//                                     <option value="">All Groups</option>
//                                     {data.accountGroups.map(group => ( // Changed from companyGroups
//                                         <option key={group._id} value={group._id}>
//                                             {group.name}
//                                         </option>
//                                     ))}
//                                 </Form.Select>
//                             </div>
//                         )}

//                         <div className="border-top pt-3 mt-3">
//                             <h6 className="fw-bold mb-2 text-primary">Report Summary</h6>
//                             <div className="row text-center">
//                                 <div className="col-4">
//                                     <div className="text-muted small">Total Accounts</div>
//                                     <div className="fw-bold h5">{data.accounts.length}</div>
//                                 </div>
//                                 <div className="col-4">
//                                     <div className="text-muted small">Dr Accounts</div>
//                                     <div className="fw-bold h5 text-danger">
//                                         {data.accounts.filter(acc => acc.openingBalance?.type === 'Dr').length}
//                                     </div>
//                                 </div>
//                                 <div className="col-4">
//                                     <div className="text-muted small">Cr Accounts</div>
//                                     <div className="fw-bold h5 text-success">
//                                         {data.accounts.filter(acc => acc.openingBalance?.type === 'Cr').length}
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {printOption !== 'all' && selectedAccountGroup && ( // Changed from selectedCompanyGroup
//                             <div className="alert alert-info border small mt-3 py-2">
//                                 <i className="bi bi-info-circle me-2"></i>
//                                 <span>
//                                     Filtering by: <strong>{data.accountGroups.find(g => g._id === selectedAccountGroup)?.name}</strong> {/* Changed from companyGroups */}
//                                 </span>
//                             </div>
//                         )}
//                     </div>
//                 </Modal.Body>
//                 <Modal.Footer className="py-2 border-top">
//                     <div className="d-flex justify-content-between w-100 align-items-center">
//                         <Button
//                             variant="outline-secondary"
//                             onClick={() => setShowPrintModal(false)}
//                             size="sm"
//                             className="px-3"
//                         >
//                             Cancel
//                         </Button>
//                         <div className="d-flex gap-2">
//                             <Button
//                                 variant="outline-primary"
//                                 onClick={() => {
//                                     setPrintOption('all');
//                                     setSelectedAccountGroup(''); // Changed from selectedCompanyGroup
//                                 }}
//                                 size="sm"
//                             >
//                                 Reset
//                             </Button>
//                             <Button
//                                 variant="primary"
//                                 onClick={() => {
//                                     printAccounts();
//                                     setShowPrintModal(false);
//                                 }}
//                                 size="sm"
//                                 className="px-4"
//                             >
//                                 <FiPrinter className="me-1" />
//                                 Print Report
//                             </Button>
//                         </div>
//                     </div>
//                 </Modal.Footer>
//             </Modal>

//             {/* Save Confirmation Modal */}
//             <Modal show={showSaveConfirmModal} onHide={() => setShowSaveConfirmModal(false)} centered>
//                 <Modal.Header closeButton className="bg-primary text-white">
//                     <Modal.Title>Confirm Save</Modal.Title>
//                 </Modal.Header>
//                 <Modal.Body>
//                     <p>Are you sure you want to save this account?</p>
//                     {currentAccount && (
//                         <div className="alert alert-warning small">
//                             <i className="bi bi-exclamation-triangle me-1"></i>
//                             This will update the existing account: <strong>{currentAccount.name}</strong>
//                         </div>
//                     )}
//                 </Modal.Body>
//                 <Modal.Footer>
//                     <Button variant="secondary" onClick={() => setShowSaveConfirmModal(false)}>
//                         Cancel
//                     </Button>
//                     <Button variant="primary" onClick={() => {
//                         handleSubmit();
//                         setShowSaveConfirmModal(false);
//                     }}>
//                         {currentAccount ? 'Update Account' : 'Create Account'}
//                     </Button>
//                 </Modal.Footer>
//             </Modal>

//             {/* Product Modal */}
//             {showProductModal && (
//                 <ProductModal onClose={() => setShowProductModal(false)} />
//             )}
//         </div>
//     );
// };

// export default Accounts;

//-----------------------------------------------------end1

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    FiEdit2, 
    FiTrash2, 
    FiEye, 
    FiCheck, 
    FiPrinter, 
    FiArrowLeft, 
    FiRefreshCw, 
    FiX,
    FiSearch,
    FiGrid,
    FiUsers,
    FiDownload,
    FiSave
} from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Modal from 'react-bootstrap/Modal';
import Badge from 'react-bootstrap/Badge';
import Spinner from 'react-bootstrap/Spinner';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import ProductModal from '../dashboard/modals/ProductModal';
import NepaliDate from 'nepali-datetime';
import * as XLSX from 'xlsx';
import './Accounts.css';

const Accounts = () => {
    const navigate = useNavigate();
    const [data, setData] = useState({
        accounts: [],
        accountGroups: [],
        company: null,
        currentFiscalYear: null,
        isInitialFiscalYear: false,
        companyId: '',
        currentCompanyName: '',
        companyDateFormat: 'english',
        nepaliDate: '',
        fiscalYear: '',
        user: null,
        theme: 'light',
        isAdminOrSupervisor: false
    });
    const [showProductModal, setShowProductModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentAccount, setCurrentAccount] = useState(null);
    const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('');
    const accountNameInputRef = useRef(null);
    // Print modal states
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printOption, setPrintOption] = useState('all');
    const [selectedAccountGroup, setSelectedAccountGroup] = useState('');

    // Pagination state
    const [paginatedAccounts, setPaginatedAccounts] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreItems, setHasMoreItems] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalFilteredAccounts, setTotalFilteredAccounts] = useState(0);
    const tableContainerRef = useRef(null);

    // Excel export state
    const [exporting, setExporting] = useState(false);

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        name: 250,
        group: 180,
        balance: 120,
        actions: 140
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        ward: '',
        pan: '',
        email: '',
        creditLimit: '',
        contactPerson: '',
        accountGroups: '',
        openingBalance: {
            amount: 0,
            type: 'Dr'
        }
    });

    // Create axios instance with interceptors
    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142',
        withCredentials: true,
    });

    api.interceptors.request.use(
        config => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        error => Promise.reject(error)
    );

    api.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userInfo');
                localStorage.removeItem('currentCompany');
                localStorage.removeItem('currentCompanyId');
                localStorage.removeItem('userCompanies');
                window.location.href = '/auth/login';
            }
            return Promise.reject(error);
        }
    );

    const showNotificationMessage = (message, type) => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchAccounts();
        }
    }, []);

    const fetchAccounts = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/auth/login');
                return;
            }

            const response = await api.get('/api/retailer/companies');

            if (response.data.redirectTo) {
                navigate(response.data.redirectTo);
                return;
            }

            if (response.data.success) {
                const newData = {
                    accounts: response.data.data.accounts || [],
                    accountGroups: response.data.data.accountGroups || [],
                    company: response.data.data.company,
                    currentFiscalYear: response.data.data.currentFiscalYear,
                    isInitialFiscalYear: response.data.data.isInitialFiscalYear || false,
                    companyId: response.data.data.companyId || '',
                    currentCompanyName: response.data.data.currentCompanyName || '',
                    companyDateFormat: response.data.data.companyDateFormat || 'english',
                    nepaliDate: response.data.data.nepaliDate || '',
                    fiscalYear: response.data.data.fiscalYear || '',
                    user: response.data.data.user,
                    theme: response.data.data.theme || 'light',
                    isAdminOrSupervisor: response.data.data.isAdminOrSupervisor || false
                };

                setData(newData);
            } else {
                throw new Error(response.data.error || 'Failed to fetch accounts');
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
        }
    };

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('accountsTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('accountsTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // F9 key handler for product modal
    useEffect(() => {
        const handleF9KeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleF9KeyDown);
        return () => window.removeEventListener('keydown', handleF9KeyDown);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                setShowSaveConfirmModal(true);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Pagination function
    const paginateAccounts = useCallback((accountsList, pageNum, itemsPerPage = 25) => {
        const actualLimit = pageNum === 1 ? 15 : 15 + ((pageNum - 1) * itemsPerPage);
        return accountsList.slice(0, actualLimit);
    }, []);

    // Filtered accounts
    const filteredAccounts = useMemo(() => {
        return data.accounts
            .filter(account => {
                const searchTermLower = searchTerm.toLowerCase();
                const accountName = account.name || '';
                const groupName = account.accountGroups?.name || '';
                const pan = account.pan || '';
                const phone = account.phone || '';
                const email = account.email || '';

                return (
                    accountName.toLowerCase().includes(searchTermLower) ||
                    groupName.toLowerCase().includes(searchTermLower) ||
                    (pan && pan.toString().toLowerCase().includes(searchTermLower)) ||
                    (phone && phone.toString().includes(searchTerm)) ||
                    (email && email.toLowerCase().includes(searchTermLower))
                );
            })
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [data.accounts, searchTerm]);

    const processedFilteredAccounts = useMemo(() => {
        return filteredAccounts.map(account => ({
            ...account,
            _id: account._id || account.id,
            accountGroups: account.accountGroups,
            openingBalance: account.openingBalance || { amount: 0, type: 'Dr' }
        }));
    }, [filteredAccounts]);

    // Load more items
    const loadMoreItems = useCallback(() => {
        if (!hasMoreItems || isLoadingMore) return;
        setIsLoadingMore(true);

        setTimeout(() => {
            const nextPage = currentPage + 1;
            const itemsPerPage = 25;
            const newLimit = nextPage === 1 ? 15 : 15 + ((nextPage - 1) * itemsPerPage);
            const newPaginatedAccounts = processedFilteredAccounts.slice(0, newLimit);

            if (newPaginatedAccounts.length === paginatedAccounts.length) {
                setHasMoreItems(false);
            } else {
                setPaginatedAccounts(newPaginatedAccounts);
                setCurrentPage(nextPage);
            }
            setIsLoadingMore(false);
        }, 100);
    }, [hasMoreItems, isLoadingMore, currentPage, processedFilteredAccounts, paginatedAccounts]);

    // Handle scroll
    useEffect(() => {
        const handleScroll = () => {
            if (!tableContainerRef.current) return;
            const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
            if ((scrollTop + clientHeight) / scrollHeight > 0.8 && hasMoreItems && !isLoadingMore) {
                loadMoreItems();
            }
        };
        const tableContainer = tableContainerRef.current;
        if (tableContainer) {
            tableContainer.addEventListener('scroll', handleScroll);
            return () => tableContainer.removeEventListener('scroll', handleScroll);
        }
    }, [hasMoreItems, isLoadingMore, loadMoreItems]);

    // Reset pagination
    useEffect(() => {
        const initialAccounts = paginateAccounts(processedFilteredAccounts, 1);
        setPaginatedAccounts(initialAccounts);
        setCurrentPage(1);
        setHasMoreItems(processedFilteredAccounts.length > initialAccounts.length);
        setTotalFilteredAccounts(processedFilteredAccounts.length);
    }, [processedFilteredAccounts, paginateAccounts]);

    // Shallow equal function
    function shallowEqual(objA, objB) {
        if (objA === objB) return true;
        if (typeof objA !== 'object' || objA === null ||
            typeof objB !== 'object' || objB === null) {
            return false;
        }
        const keysA = Object.keys(objA);
        const keysB = Object.keys(objB);
        if (keysA.length !== keysB.length) return false;
        for (let i = 0; i < keysA.length; i++) {
            if (!objB.hasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
                return false;
            }
        }
        return true;
    }

    // Resizable Table Header
    const TableHeader = React.memo(() => {
        const totalWidth = 50 + columnWidths.name + columnWidths.group + columnWidths.balance + columnWidths.actions;

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="acc-header"
                style={{
                    width: Math.max(totalWidth, '100%'),
                    userSelect: isResizing ? 'none' : 'auto'
                }}
                onMouseMove={(e) => {
                    if (isResizing && resizingColumn) {
                        const diff = e.clientX - startX;
                        const newWidth = Math.max(80, startWidth + diff);
                        setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
                    }
                }}
                onMouseUp={() => {
                    if (isResizing) {
                        setIsResizing(false);
                        setResizingColumn(null);
                    }
                }}
                onMouseLeave={() => {
                    if (isResizing) {
                        setIsResizing(false);
                        setResizingColumn(null);
                    }
                }}
            >
                <div className="acc-header-cell acc-header-cell--sn">S.N.</div>
                <div className="acc-header-cell acc-header-cell--resizable" style={{ width: `${columnWidths.name}px`, minWidth: '100px' }}>
                    Account Name
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="name" />
                </div>
                <div className="acc-header-cell acc-header-cell--resizable" style={{ width: `${columnWidths.group}px`, minWidth: '80px' }}>
                    Account Group
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="group" />
                </div>
                <div className="acc-header-cell" style={{ width: `${columnWidths.actions}px`, minWidth: '120px', textAlign: 'center' }}>
                    Actions
                </div>

                {isResizing && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1000,
                        cursor: 'col-resize'
                    }} />
                )}
            </div>
        );
    });

    // Table Row Component
    const TableRow = React.memo(({ index, style, data }) => {
        const { accounts, isAdminOrSupervisor } = data;
        const account = accounts[index];

        if (!account) return null;

        const handleView = useCallback(() => navigate(`/retailer/companies/${account?._id}`), [account?._id]);
        const handleEditClick = useCallback(() => account && handleEdit(account), [account]);
        const handleDeleteClick = useCallback(() => account?._id && handleDelete(account._id), [account?._id]);
        const handleSelect = useCallback(() => account && handleSelectAccount(account), [account]);

        const accountName = account.name || 'N/A';
        const groupName = account.accountGroups?.name || 'N/A';
        const balance = account.openingBalance?.amount || 0;
        const balanceType = account.openingBalance?.type || 'Dr';
        const isDr = balanceType === 'Dr';

        return (
            <div
                style={{ ...style, display: 'flex', alignItems: 'center', height: '28px', minHeight: '28px', padding: '0', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                className={index % 2 === 0 ? 'acc-row-even' : 'acc-row-odd'}
                onDoubleClick={handleView}
            >
                <div className="acc-cell acc-cell--sn">{index + 1}</div>
                <div className="acc-cell acc-cell--name" style={{ width: `${columnWidths.name}px`, flexShrink: 0 }} title={accountName}>
                    <span className="acc-item-name">{accountName}</span>
                    {account.pan && <span className="acc-badge acc-badge--pan">PAN: {account.pan}</span>}
                </div>
                <div className="acc-cell acc-cell--group" style={{ width: `${columnWidths.group}px`, flexShrink: 0 }}>
                    <span className="acc-text-muted">{groupName}</span>
                </div>
                <div className="acc-cell acc-cell--actions" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>
                    <button className="acc-btn-action acc-btn-action--view" onClick={handleView} title="View">
                        <FiEye size={12} />
                    </button>
                    {isAdminOrSupervisor && (
                        <>
                            <button className="acc-btn-action acc-btn-action--edit" onClick={handleEditClick} title="Edit" disabled={!!currentAccount}>
                                <FiEdit2 size={12} />
                            </button>
                            <button className="acc-btn-action acc-btn-action--delete" onClick={handleDeleteClick} title="Delete" disabled={!!currentAccount}>
                                <FiTrash2 size={12} />
                            </button>
                        </>
                    )}
                    <button className="acc-btn-action acc-btn-action--select" onClick={handleSelect} title="Select">
                        <FiCheck size={12} />
                    </button>
                </div>
            </div>
        );
    });

    // Resize Handle Component
    const ResizeHandle = React.memo(({ onResizeStart, columnName }) => {
        return (
            <div
                className="acc-resize-handle"
                onMouseDown={(e) => {
                    e.preventDefault();
                    onResizeStart(e, columnName);
                }}
            />
        );
    });

    const resetColumnWidths = () => {
        setColumnWidths({
            name: 250,
            group: 180,
            balance: 120,
            actions: 140
        });
        showNotificationMessage('Column widths reset to default', 'success');
    };

    const resetForm = () => {
        setFormData({
            name: '',
            address: '',
            phone: '',
            ward: '',
            pan: '',
            email: '',
            creditLimit: '',
            contactPerson: '',
            accountGroups: '',
            openingBalance: {
                amount: 0,
                type: 'Dr'
            }
        });
        setCurrentAccount(null);
    };

    const handleApiError = (error) => {
        let errorMessage = 'An error occurred';

        if (error.response) {
            switch (error.response.status) {
                case 400:
                    errorMessage = error.response.data.error || 'Invalid request';
                    break;
                case 401:
                    errorMessage = 'Session expired. Please login again.';
                    navigate('/auth/login');
                    return;
                case 403:
                    if (error.response.data.error && error.response.data.error.includes('trade type')) {
                        errorMessage = 'Access denied for this trade type. Please select a Retailer company.';
                        navigate('/user-dashboard');
                    } else {
                        errorMessage = error.response.data.error || 'Access denied';
                        navigate('/user-dashboard');
                    }
                    break;
                case 409:
                    errorMessage = error.response.data.error || 'Account already exists';
                    break;
                default:
                    errorMessage = error.response.data.message || 'Request failed';
            }
        } else if (error.request) {
            errorMessage = 'No response from server. Please check your connection.';
        } else {
            errorMessage = error.message || 'An error occurred';
        }

        showNotificationMessage(errorMessage, 'error');
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value.toLowerCase());
    };

    const handleCancel = () => {
        setCurrentAccount(null);
        setFormData({
            name: '',
            address: '',
            phone: '',
            ward: '',
            pan: '',
            email: '',
            creditLimit: '',
            contactPerson: '',
            accountGroups: '',
            openingBalance: {
                amount: 0,
                type: 'Dr'
            }
        });
    };

    const handleEdit = (account) => {
        setCurrentAccount(account);
        setFormData({
            name: account.name,
            address: account.address || '',
            phone: account.phone || '',
            ward: account.ward || '',
            pan: account.pan || '',
            email: account.email || '',
            creditLimit: account.creditLimit || '',
            contactPerson: account.contactPerson || '',
            accountGroups: account.accountGroups?._id || '',
            openingBalance: {
                amount: account.openingBalance?.amount || 0,
                type: account.openingBalance?.type || 'Dr'
            }
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
            try {
                const response = await api.delete(`/api/retailer/companies/${id}`);

                if (response.data.success) {
                    showNotificationMessage('Account deleted successfully', 'success');
                    fetchAccounts();
                } else {
                    showNotificationMessage(response.data.error || 'Failed to delete account', 'error');
                }
            } catch (err) {
                handleApiError(err);
            }
        }
    };

    const handleSelectAccount = (account) => {
        setFormData({
            name: account.name,
            address: account.address || '',
            phone: account.phone || '',
            ward: account.ward || '',
            pan: account.pan || '',
            email: account.email || '',
            creditLimit: account.creditLimit || '',
            contactPerson: account.contactPerson || '',
            accountGroups: account.accountGroups?._id || '',
            openingBalance: {
                amount: account.openingBalance?.amount || 0,
                type: account.openingBalance?.type || 'Dr'
            }
        });
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;

        if (name.includes('openingBalance')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                openingBalance: {
                    ...prev.openingBalance,
                    [field]: field === 'amount' ? parseFloat(value) || 0 : value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
            if (name === 'name') {
                setSearchTerm(value.toLowerCase());
            }
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        setIsSaving(true);

        try {
            const requestData = {
                name: formData.name.trim(),
                address: formData.address?.trim() || '',
                phone: formData.phone?.trim() || '',
                ward: formData.ward ? parseInt(formData.ward) : null,
                pan: formData.pan?.trim() || null,
                email: formData.email?.trim()?.toLowerCase() || '',
                creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 0,
                contactPerson: formData.contactPerson?.trim() || '',
                accountGroups: formData.accountGroups,
                openingBalance: {
                    amount: parseFloat(formData.openingBalance.amount) || 0,
                    type: formData.openingBalance.type || 'Dr'
                },
                isActive: true
            };

            if (!requestData.name || !requestData.accountGroups) {
                showNotificationMessage('Account name and account group are required', 'error');
                setIsSaving(false);
                return;
            }

            if (currentAccount) {
                await api.put(`/api/retailer/companies/${currentAccount._id}`, requestData);
                showNotificationMessage('Account updated successfully!', 'success');
            } else {
                await api.post('/api/retailer/companies', requestData);
                showNotificationMessage('Account created successfully!', 'success');
                resetForm();

                setTimeout(() => {
                    if (accountNameInputRef.current) {
                        accountNameInputRef.current.focus();
                    }
                }, 50);
            }
            fetchAccounts();
        } catch (err) {
            if (err.response?.data?.errors) {
                const validationErrors = Object.entries(err.response.data.errors)
                    .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
                    .join('; ');
                showNotificationMessage(`Validation errors: ${validationErrors}`, 'error');
            } else {
                handleApiError(err);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const printAccounts = () => {
        let accountsToPrint = [...data.accounts];

        if (printOption === 'group' && selectedAccountGroup) {
            accountsToPrint = accountsToPrint.filter(account =>
                account.accountGroups?._id === selectedAccountGroup
            );
        }

        if (accountsToPrint.length === 0) {
            alert("No accounts to print");
            return;
        }

        const printWindow = window.open("", "_blank");

        const printHeader = `
        <div class="print-header">
            <h1 style="font-size: 14px; margin: 0;">${data.company?.companyName || data.currentCompanyName || 'Company Name'}</h1>
            <p style="font-size: 8px; margin: 2px 0;">
                ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''},
                PAN: ${data.company?.pan || ''}<br>
            </p>
            <hr style="margin: 2px 0;">
        </div>
    `;

        let tableContent = `
        <style>
            @page { margin: 3mm; }
            body { font-family: Arial, sans-serif; font-size: 7px; margin: 0; padding: 2mm; }
            table { width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 6px; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th, td { border: 1px solid #000; padding: 2px 3px; text-align: left; white-space: nowrap; }
            th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; font-size: 10px; font-weight: bold; padding: 3px 3px; }
            td { font-size: 8px; padding: 2px 3px; }
            .print-header { text-align: center; margin-bottom: 5px; }
            .nowrap { white-space: nowrap; }
            h1 { font-size: 14px; margin: 0; }
            .report-title { text-align: center; text-decoration: underline; font-size: 11px; font-weight: bold; margin: 3px 0; }
            .header-info { text-align: center; margin-bottom: 5px; font-size: 8px; }
            .filter-info { text-align: center; margin-bottom: 8px; font-size: 7px; color: #666; }
            .balance-dr { color: #dc3545; font-weight: bold; }
            .balance-cr { color: #28a745; font-weight: bold; }
            .summary-row { background-color: #f8f9fa; font-weight: bold; }
            .footer-note { margin-top: 10px; font-size: 7px; color: #666; text-align: center; }
        </style>
        ${printHeader}
        <div class="report-title">Accounts Report</div>
        <div class="header-info">
            <strong>Fiscal Year:</strong> ${data.currentFiscalYear?.name || 'N/A'} | 
            <strong>Total Accounts:</strong> ${accountsToPrint.length}
        </div>
        <div class="filter-info">
            ${printOption !== 'all' && selectedAccountGroup ?
                `<strong>Filter:</strong> Account Group: ${data.accountGroups.find(g => g._id === selectedAccountGroup)?.name || 'N/A'} | ` : ''
            }
            <strong>Printed on:</strong> ${data.companyDateFormat === 'nepali' ?
                (data.nepaliDate || new NepaliDate().format('YYYY-MM-DD')) :
                new Date().toLocaleDateString()}
        </div>
        <table>
            <thead>
                <tr>
                    <th class="nowrap">S.N.</th>
                    <th class="nowrap">Account Name</th>
                    <th class="nowrap">Account Group</th>
                    <th class="nowrap">Opening Balance</th>
                    <th class="nowrap">Credit Limit</th>
                    <th class="nowrap">Phone</th>
                    <th class="nowrap">PAN/VAT</th>
                </tr>
            </thead>
            <tbody>
    `;

        let totalDr = 0;
        let totalCr = 0;
        let totalCreditLimit = 0;

        accountsToPrint.forEach((account, index) => {
            const balance = account.openingBalance?.amount || 0;
            const balanceType = account.openingBalance?.type || 'Dr';
            const creditLimit = parseFloat(account.creditLimit) || 0;

            if (balanceType === 'Dr') {
                totalDr += balance;
            } else {
                totalCr += balance;
            }
            totalCreditLimit += creditLimit;

            const balanceClass = balanceType === 'Dr' ? 'balance-dr' : 'balance-cr';

            tableContent += `
            <tr>
                <td class="nowrap">${index + 1}</td>
                <td class="nowrap">${escapeHtml(account.name || 'N/A')}</td>
                <td class="nowrap">${escapeHtml(account.accountGroups?.name || 'N/A')}</td>
                <td class="nowrap ${balanceClass}">${balance.toFixed(2)} ${balanceType}</td>
                <td class="nowrap">${creditLimit.toFixed(2)}</td>
                <td class="nowrap">${escapeHtml(account.phone || 'N/A')}</td>
                <td class="nowrap">${escapeHtml(account.pan || 'N/A')}</td>
            </tr>
        `;
        });

        tableContent += `
            </tbody>
            <tfoot>
                <tr class="summary-row">
                    <td colspan="3" class="nowrap"><strong>Summary</strong></td>
                    <td class="nowrap"><strong>Dr: ${totalDr.toFixed(2)} | Cr: ${totalCr.toFixed(2)}</strong></td>
                    <td class="nowrap"><strong>${totalCreditLimit.toFixed(2)}</strong></td>
                    <td colspan="2"></td>
                </tr>
            </tfoot>
        </table>
        <div class="footer-note">
            ${data.company?.companyName ? `© ${new Date().getFullYear()} ${data.company.companyName}` : ''}
        </div>
    `;

        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Accounts Report - ${data.company?.companyName || data.currentCompanyName || 'Accounts Report'}</title>
                <meta charset="UTF-8">
            </head>
            <body>
                ${tableContent}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 200);
                    };
                <\/script>
            </body>
        </html>
    `);
        printWindow.document.close();
    };

    const exportToExcel = async (exportAll = false) => {
        setExporting(true);
        try {
            const accountsToExport = exportAll ? data.accounts : filteredAccounts;

            if (accountsToExport.length === 0) {
                showNotificationMessage('No accounts to export', 'warning');
                return;
            }

            const excelData = accountsToExport.map((account, index) => ({
                'S.N.': index + 1,
                'Account Name': account.name || 'N/A',
                'Account Group': account.accountGroups?.name || 'N/A',
                'Opening Balance': account.openingBalance?.amount || 0,
                'Balance Type': account.openingBalance?.type || 'Dr',
                'Credit Limit': account.creditLimit || 0,
                'Phone': account.phone || '',
                'Email': account.email || '',
                'Address': account.address || '',
                'PAN/VAT': account.pan || '',
                'Contact Person': account.contactPerson || '',
                'Created': account.createdAt ? new Date(account.createdAt).toLocaleDateString() : '',
                'Last Updated': account.updatedAt ? new Date(account.updatedAt).toLocaleDateString() : ''
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            XLSX.utils.book_append_sheet(wb, ws, 'Accounts');

            const date = new Date().toISOString().split('T')[0];
            const fileName = `Accounts_Report_${exportAll ? 'All' : 'Filtered'}_${date}.xlsx`;

            XLSX.writeFile(wb, fileName);
            showNotificationMessage(`${exportAll ? 'All' : 'Filtered'} accounts (${accountsToExport.length}) exported successfully!`, 'success');

        } catch (err) {
            console.error('Error exporting to Excel:', err);
            showNotificationMessage('Failed to export to Excel', 'error');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="acc-container">
            <Header />
            <NotificationToast
                message={notificationMessage}
                type={notificationType}
                show={showNotification}
                onClose={() => setShowNotification(false)}
            />

            <div className="acc-main">
                {/* Left Column - Add Account Form */}
                <div className="acc-form-section">
                    <div className="acc-card acc-card--form">
                        <div className="acc-card-header">
                            <div className="acc-card-header-left">
                                <div className="acc-card-header-icon acc-card-header-icon--form">
                                    <FiUsers />
                                </div>
                                <div>
                                    <h5 className="acc-card-title">{currentAccount ? `Edit Account: ${currentAccount.name}` : 'Create Accounts'}</h5>
                                    <small className="acc-card-subtitle">
                                        {currentAccount ? 'Update existing account' : 'Add new account'}
                                    </small>
                                </div>
                            </div>
                            {currentAccount && (
                                <button className="acc-btn-cancel" onClick={handleCancel} disabled={isSaving}>
                                    <FiX /> Cancel
                                </button>
                            )}
                        </div>

                        <div className="acc-card-body">
                            <form onSubmit={handleSubmit} id="addAccountForm">
                                <div className="acc-form-row">
                                    <div className="acc-form-group acc-form-group--half">
                                        <label className="acc-form-label">Account Name <span className="acc-required">*</span></label>
                                        <input
                                            ref={accountNameInputRef}
                                            type="text"
                                            name="name"
                                            className="acc-form-input"
                                            value={formData.name}
                                            onChange={handleFormChange}
                                            placeholder="Enter account name"
                                            required
                                            autoFocus
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const groupSelect = document.querySelector('select[name="accountGroups"]');
                                                    if (groupSelect) groupSelect.focus();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="acc-form-group acc-form-group--half">
                                        <label className="acc-form-label">Account Group <span className="acc-required">*</span></label>
                                        <select
                                            name="accountGroups"
                                            className="acc-form-select"
                                            value={formData.accountGroups}
                                            onChange={handleFormChange}
                                            required
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const creditLimitInput = document.querySelector('input[name="creditLimit"]');
                                                    if (creditLimitInput) creditLimitInput.focus();
                                                }
                                            }}
                                        >
                                            <option value="">Select Group</option>
                                            {data.accountGroups.map(group => (
                                                <option key={group._id} value={group._id}>
                                                    {group.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="acc-form-row">
                                    <div className="acc-form-group acc-form-group--third">
                                        <label className="acc-form-label">Opening Balance</label>
                                        <div className="acc-balance-input">
                                            <input
                                                type="number"
                                                name="openingBalance.amount"
                                                className="acc-form-input"
                                                value={formData.openingBalance.amount}
                                                onChange={handleFormChange}
                                                step="any"
                                                disabled={!data.isInitialFiscalYear}
                                                placeholder="0.00"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        const panInput = document.querySelector('input[name="pan"]');
                                                        if (panInput) panInput.focus();
                                                    }
                                                }}
                                            />
                                            <select
                                                name="openingBalance.type"
                                                className="acc-balance-type-select"
                                                value={formData.openingBalance.type}
                                                onChange={handleFormChange}
                                                disabled={!data.isInitialFiscalYear}
                                            >
                                                <option value="Dr">Dr.</option>
                                                <option value="Cr">Cr.</option>
                                            </select>
                                        </div>
                                        {!data.isInitialFiscalYear && (
                                            <small className="acc-form-hint">Opening balance can only be set in initial fiscal year</small>
                                        )}
                                    </div>

                                    <div className="acc-form-group acc-form-group--third">
                                        <label className="acc-form-label">Credit Limit</label>
                                        <input
                                            type="number"
                                            name="creditLimit"
                                            className="acc-form-input"
                                            value={formData.creditLimit}
                                            onChange={handleFormChange}
                                            step="any"
                                            placeholder="0.00"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const panInput = document.querySelector('input[name="pan"]');
                                                    if (panInput) panInput.focus();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="acc-form-group acc-form-group--third">
                                        <label className="acc-form-label">PAN/VAT</label>
                                        <input
                                            type="text"
                                            name="pan"
                                            className="acc-form-input"
                                            value={formData.pan}
                                            onChange={handleFormChange}
                                            minLength="9"
                                            maxLength="9"
                                            placeholder="PAN Number"
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const addressInput = document.querySelector('input[name="address"]');
                                                    if (addressInput) addressInput.focus();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="acc-form-row">
                                    <div className="acc-form-group acc-form-group--third">
                                        <label className="acc-form-label">Address</label>
                                        <input
                                            type="text"
                                            name="address"
                                            className="acc-form-input"
                                            value={formData.address}
                                            onChange={handleFormChange}
                                            placeholder="Enter address"
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const wardInput = document.querySelector('input[name="ward"]');
                                                    if (wardInput) wardInput.focus();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="acc-form-group acc-form-group--third">
                                        <label className="acc-form-label">Ward No.</label>
                                        <input
                                            type="number"
                                            name="ward"
                                            className="acc-form-input"
                                            value={formData.ward}
                                            onChange={handleFormChange}
                                            placeholder="Ward number"
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const phoneInput = document.querySelector('input[name="phone"]');
                                                    if (phoneInput) phoneInput.focus();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="acc-form-group acc-form-group--third">
                                        <label className="acc-form-label">Phone</label>
                                        <input
                                            type="text"
                                            name="phone"
                                            className="acc-form-input"
                                            value={formData.phone}
                                            onChange={handleFormChange}
                                            placeholder="Phone number"
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const emailInput = document.querySelector('input[name="email"]');
                                                    if (emailInput) emailInput.focus();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="acc-form-row">
                                    <div className="acc-form-group acc-form-group--half">
                                        <label className="acc-form-label">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            className="acc-form-input"
                                            value={formData.email}
                                            onChange={handleFormChange}
                                            placeholder="Email address"
                                            autoComplete="off"
                                            style={{ textTransform: 'lowercase' }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const contactPersonInput = document.querySelector('input[name="contactPerson"]');
                                                    if (contactPersonInput) contactPersonInput.focus();
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="acc-form-group acc-form-group--half">
                                        <label className="acc-form-label">Contact Person</label>
                                        <input
                                            type="text"
                                            name="contactPerson"
                                            className="acc-form-input"
                                            value={formData.contactPerson}
                                            onChange={handleFormChange}
                                            placeholder="Contact person name"
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const submitButton = document.getElementById('submitAccountButton');
                                                    if (submitButton) submitButton.focus();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="acc-form-row">
                                    <div className="acc-form-group acc-form-group--full">
                                        <div className="acc-form-actions acc-form-actions--right">
                                            <button
                                                id="submitAccountButton"
                                                type="submit"
                                                className="acc-btn-save"
                                                disabled={isSaving}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <span className="acc-spinner-small"></span>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiSave size={14} /> {currentAccount ? 'Update Account' : 'Add Account'}
                                                    </>
                                                )}
                                            </button>
                                            <small className="acc-shortcut-hint">Alt+S</small>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right Column - Existing Accounts */}
                <div className="acc-list-section">
                    <div className="acc-card acc-card--list">
                        <div className="acc-card-header acc-card-header--list">
                            <div className="acc-card-header-left">
                                <div className="acc-card-header-icon acc-card-header-icon--list">
                                    <FiGrid />
                                </div>
                                <div>
                                    <h5 className="acc-card-title">Existing Accounts</h5>
                                    <small className="acc-card-subtitle">
                                        {totalFilteredAccounts} accounts found
                                    </small>
                                </div>
                            </div>
                            <div className="acc-card-actions">
                                <button className="acc-btn-toolbar" onClick={() => navigate(-1)} title="Go back">
                                    <FiArrowLeft size={14} />
                                </button>
                                <button className="acc-btn-toolbar" onClick={() => setShowPrintModal(true)} title="Print report">
                                    <FiPrinter size={14} />
                                </button>
                                <button className="acc-btn-toolbar" onClick={() => exportToExcel(true)} disabled={exporting || data.accounts.length === 0} title="Export to Excel">
                                    {exporting ? <span className="acc-spinner-small"></span> : <FiDownload size={14} />}
                                </button>
                                <button className="acc-btn-toolbar" onClick={resetColumnWidths} title="Reset column widths">
                                    <FiRefreshCw size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="acc-search-bar">
                            <div className="acc-search-wrapper">
                                <FiSearch className="acc-search-icon" />
                                <input
                                    type="text"
                                    className="acc-search-input"
                                    placeholder="Search accounts by name, group, PAN, phone or email..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                                {searchTerm && (
                                    <button className="acc-search-clear" onClick={() => setSearchTerm('')}>
                                        <FiX size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="acc-table-wrapper" ref={tableContainerRef}>
                            {loading ? (
                                <div className="acc-loading">
                                    <div className="acc-spinner"></div>
                                    <p className="acc-loading-text">Loading accounts...</p>
                                </div>
                            ) : paginatedAccounts.length === 0 ? (
                                <div className="acc-empty">
                                    <FiUsers className="acc-empty-icon" size={32} />
                                    <h6 className="acc-empty-title">No accounts found</h6>
                                    <p className="acc-empty-text">
                                        {searchTerm ? 'Try a different search term' : 'Create your first account using the form'}
                                    </p>
                                </div>
                            ) : (
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth = 50 + columnWidths.name + columnWidths.group + columnWidths.balance + columnWidths.actions;
                                        return (
                                            <div style={{ height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List
                                                    key={`accounts-list-${paginatedAccounts.length}-${currentPage}`}
                                                    height={height - 30}
                                                    itemCount={paginatedAccounts.length}
                                                    itemSize={28}
                                                    width={Math.max(width, totalWidth)}
                                                    itemData={{
                                                        accounts: paginatedAccounts,
                                                        isAdminOrSupervisor: data.isAdminOrSupervisor
                                                    }}
                                                >
                                                    {TableRow}
                                                </List>
                                                {isLoadingMore && (
                                                    <div className="acc-loading-more">
                                                        <div className="acc-spinner-small"></div>
                                                        <span>Loading more accounts...</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            )}
                        </div>

                        <div className="acc-table-footer">
                            <span className="acc-footer-info">
                                Showing {paginatedAccounts.length} of {totalFilteredAccounts} accounts
                            </span>
                            {hasMoreItems && paginatedAccounts.length < totalFilteredAccounts && (
                                <button className="acc-btn-load-more" onClick={loadMoreItems} disabled={isLoadingMore}>
                                    Load more...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Options Modal */}
            <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} centered size="md">
                <Modal.Header closeButton className="acc-modal-header">
                    <div className="d-flex align-items-center">
                        <FiPrinter className="me-2" size={20} />
                        <div>
                            <span className="fw-bold fs-6">Print Accounts Report</span>
                            <small className="d-block opacity-75">Select filter options</small>
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body className="p-3">
                    <div className="acc-print-options">
                        <h6 className="acc-print-options-title">Filter Options</h6>
                        <div className="acc-print-options-grid">
                            <button className={`acc-print-option ${printOption === 'all' ? 'acc-print-option--active' : ''}`} onClick={() => setPrintOption('all')}>
                                All Accounts
                            </button>
                            <button className={`acc-print-option ${printOption === 'group' ? 'acc-print-option--active' : ''}`} onClick={() => setPrintOption('group')}>
                                By Account Group
                            </button>
                        </div>

                        {printOption === 'group' && (
                            <div className="acc-print-filter">
                                <label className="acc-form-label small fw-semibold">Select Account Group</label>
                                <select
                                    className="acc-form-select"
                                    value={selectedAccountGroup}
                                    onChange={(e) => setSelectedAccountGroup(e.target.value)}
                                >
                                    <option value="">All Groups</option>
                                    {data.accountGroups.map(group => (
                                        <option key={group._id} value={group._id}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="acc-print-summary">
                            <h6 className="acc-print-options-title">Report Summary</h6>
                            <div className="acc-print-stats">
                                <div className="acc-print-stat">
                                    <span className="acc-print-stat-label">Total Accounts</span>
                                    <span className="acc-print-stat-value">{data.accounts.length}</span>
                                </div>
                                <div className="acc-print-stat">
                                    <span className="acc-print-stat-label acc-print-stat-label--danger">Dr Accounts</span>
                                    <span className="acc-print-stat-value acc-print-stat-value--danger">
                                        {data.accounts.filter(acc => acc.openingBalance?.type === 'Dr').length}
                                    </span>
                                </div>
                                <div className="acc-print-stat">
                                    <span className="acc-print-stat-label acc-print-stat-label--success">Cr Accounts</span>
                                    <span className="acc-print-stat-value acc-print-stat-value--success">
                                        {data.accounts.filter(acc => acc.openingBalance?.type === 'Cr').length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="py-2">
                    <button className="acc-btn-secondary" onClick={() => setShowPrintModal(false)}>Cancel</button>
                    <button className="acc-btn-primary" onClick={() => { printAccounts(); setShowPrintModal(false); }}>
                        <FiPrinter className="me-1" /> Print Report
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Save Confirmation Modal */}
            <Modal show={showSaveConfirmModal} onHide={() => setShowSaveConfirmModal(false)} centered>
                <Modal.Header closeButton className="acc-modal-header">
                    <Modal.Title>Confirm Save</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to save this account?</p>
                    {currentAccount && (
                        <div className="alert alert-warning small">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            This will update the existing account: <strong>{currentAccount.name}</strong>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className="acc-btn-secondary" onClick={() => setShowSaveConfirmModal(false)}>Cancel</button>
                    <button className="acc-btn-primary" onClick={() => { handleSubmit(); setShowSaveConfirmModal(false); }}>
                        {currentAccount ? 'Update Account' : 'Create Account'}
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Product Modal */}
            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
        </div>
    );
};

export default Accounts;