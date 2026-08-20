// import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
// import { FiEdit2, FiTrash2, FiPrinter, FiArrowLeft, FiX, FiCheck, FiRefreshCw } from 'react-icons/fi';
// import { FixedSizeList as List } from 'react-window';
// import AutoSizer from 'react-virtualized-auto-sizer';
// import Button from 'react-bootstrap/Button';
// import Form from 'react-bootstrap/Form';
// import Badge from 'react-bootstrap/Badge';
// import Spinner from 'react-bootstrap/Spinner';
// import Modal from 'react-bootstrap/Modal';
// import Header from '../retailer/Header';
// import NotificationToast from '../NotificationToast';
// import ProductModal from './dashboard/modals/ProductModal';
// import * as XLSX from 'xlsx';

// const MainUnits = () => {
//     const [exporting, setExporting] = useState(false);
//     const navigate = useNavigate();
//     const [data, setData] = useState({
//         mainUnits: [],
//         company: null,
//         currentFiscalYear: null,
//         companyId: '',
//         currentCompanyName: '',
//         user: null,
//         theme: 'light',
//         isAdminOrSupervisor: false
//     });
//     const [loading, setLoading] = useState(true);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [currentMainUnit, setCurrentMainUnit] = useState(null);
//     const [formData, setFormData] = useState({
//         name: '',
//     });
//     const [isSaving, setIsSaving] = useState(false);
//     const [showNotification, setShowNotification] = useState(false);
//     const [notificationMessage, setNotificationMessage] = useState('');
//     const [notificationType, setNotificationType] = useState('');
//     const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
//     const [showPrintModal, setShowPrintModal] = useState(false);
//     const [showProductModal, setShowProductModal] = useState(false);
//     const [printOption, setPrintOption] = useState('all');

//     const mainUnitNameRef = useRef(null);

//     // Add these state variables for pagination
//     const [paginatedMainUnits, setPaginatedMainUnits] = useState([]);
//     const [currentPage, setCurrentPage] = useState(1);
//     const [hasMoreItems, setHasMoreItems] = useState(true);
//     const [isLoadingMore, setIsLoadingMore] = useState(false);
//     const [totalFilteredMainUnits, setTotalFilteredMainUnits] = useState(0);
//     const tableContainerRef = useRef(null);

//     // Column resizing state
//     const [columnWidths, setColumnWidths] = useState({
//         name: 200,
//         actions: 140
//     });

//     const [isResizing, setIsResizing] = useState(false);
//     const [resizingColumn, setResizingColumn] = useState(null);
//     const [startX, setStartX] = useState(0);
//     const [startWidth, setStartWidth] = useState(0);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // Add authorization header to all requests
//     api.interceptors.request.use(
//         (config) => {
//             const token = localStorage.getItem('token');
//             if (token) {
//                 config.headers.Authorization = `Bearer ${token}`;
//             }
//             return config;
//         },
//         (error) => {
//             return Promise.reject(error);
//         }
//     );

//     const showNotificationMessage = (message, type) => {
//         setNotificationMessage(message);
//         setNotificationType(type);
//         setShowNotification(true);
//     };

//     useEffect(() => {
//         fetchMainUnits();
//     }, []);

//     // Save/load column widths
//     useEffect(() => {
//         const savedWidths = localStorage.getItem('mainUnitsTableColumnWidths');
//         if (savedWidths) {
//             try {
//                 setColumnWidths(JSON.parse(savedWidths));
//             } catch (e) {
//                 console.error('Failed to load column widths:', e);
//             }
//         }
//     }, []);

//     useEffect(() => {
//         localStorage.setItem('mainUnitsTableColumnWidths', JSON.stringify(columnWidths));
//     }, [columnWidths]);

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

//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (e.key === 'F9') {
//                 e.preventDefault();
//                 setShowProductModal(prev => !prev);
//             }
//         };
//         window.addEventListener('keydown', handleKeyDown);
//         return () => {
//             window.removeEventListener('keydown', handleKeyDown);
//         };
//     }, []);

//     // Pagination function - initially 15 items, then 25 on each load
//     const paginateMainUnits = useCallback((mainUnitsList, pageNum, itemsPerPage = 25) => {
//         const startIndex = 0; // Always start from beginning
//         // For first page, we want 15 items, not 25
//         const actualLimit = pageNum === 1 ? 15 : (pageNum - 1) * itemsPerPage + itemsPerPage;
//         const endIndex = actualLimit;
//         return mainUnitsList.slice(startIndex, endIndex);
//     }, []);

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

//     // Filtered main units with memoization
//     const filteredMainUnits = useMemo(() => {
//         return (data.mainUnits || [])
//             .filter(mainUnit =>
//                 mainUnit?.name?.toLowerCase().includes(searchTerm.toLowerCase())
//             )
//             .sort((a, b) => a.name.localeCompare(b.name));
//     }, [data.mainUnits, searchTerm]);

//     // Process filtered main units for display
//     const processedFilteredMainUnits = useMemo(() => {
//         return filteredMainUnits.map(mainUnit => {
//             return {
//                 ...mainUnit,
//                 _id: mainUnit.id || mainUnit._id
//             };
//         });
//     }, [filteredMainUnits]);

//     // Load more items on scroll
//     const loadMoreItems = useCallback(() => {
//         if (!hasMoreItems || isLoadingMore) return;

//         setIsLoadingMore(true);

//         // Use setTimeout to prevent UI freezing
//         setTimeout(() => {
//             const nextPage = currentPage + 1;
//             const itemsPerPage = 25;
//             const newLimit = nextPage === 1 ? 15 : 15 + ((nextPage - 1) * itemsPerPage);
//             const newPaginatedMainUnits = processedFilteredMainUnits.slice(0, newLimit);

//             if (newPaginatedMainUnits.length === paginatedMainUnits.length) {
//                 setHasMoreItems(false);
//             } else {
//                 setPaginatedMainUnits(newPaginatedMainUnits);
//                 setCurrentPage(nextPage);
//             }

//             setIsLoadingMore(false);
//         }, 100);
//     }, [hasMoreItems, isLoadingMore, currentPage, processedFilteredMainUnits, paginatedMainUnits]);

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
//         const initialMainUnits = paginateMainUnits(processedFilteredMainUnits, 1);
//         setPaginatedMainUnits(initialMainUnits);
//         setCurrentPage(1);
//         setHasMoreItems(processedFilteredMainUnits.length > initialMainUnits.length);
//         setTotalFilteredMainUnits(processedFilteredMainUnits.length);
//     }, [processedFilteredMainUnits, paginateMainUnits]);


//     // Resizable Table Header Component
//     const TableHeader = React.memo(() => {
//         const totalWidth = 50 + columnWidths.name + columnWidths.actions;

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

//                 {/* Main Unit Name */}
//                 <div
//                     className="d-flex align-items-center ps-2 border-end border-white position-relative"
//                     style={{
//                         width: `${columnWidths.name}px`,
//                         flexShrink: 0,
//                         minWidth: '100px'
//                     }}
//                 >
//                     <strong style={{ fontSize: '0.8rem' }}>Main Unit Name</strong>
//                     <ResizeHandle
//                         onResizeStart={handleResizeStart}
//                         left={columnWidths.name - 2}
//                         columnName="name"
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
//         const { mainUnits, isAdminOrSupervisor } = data;
//         const mainUnit = mainUnits[index];

//         const handleEditClick = useCallback(() => mainUnit && handleEdit(mainUnit), [mainUnit]);
//         const handleDeleteClick = useCallback(() => {
//             // Use id instead of _id for ASP.NET
//             const mainUnitId = mainUnit.id || mainUnit._id;
//             if (mainUnitId) handleDelete(mainUnitId);
//         }, [mainUnit]);
//         const handleSelect = useCallback(() => mainUnit && handleSelectMainUnit(mainUnit), [mainUnit]);

//         if (!mainUnit) return null;

//         const mainUnitId = mainUnit.id || mainUnit._id;
//         const mainUnitName = mainUnit.name || 'N/A';

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

//                 {/* Main Unit Name */}
//                 <div
//                     className="d-flex align-items-center ps-2 border-end"
//                     style={{
//                         width: `${columnWidths.name}px`,
//                         flexShrink: 0,
//                         height: '100%',
//                         overflow: 'hidden'
//                     }}
//                     title={`${mainUnitName}`}
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
//                                 {mainUnitName}
//                             </span>
//                         </div>
//                     </div>
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
//                                 title={`Edit ${mainUnitName}`}
//                                 disabled={!!currentMainUnit}
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
//                                 title={`Delete ${mainUnitName}`}
//                                 disabled={!!currentMainUnit}
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
//                         title={`Select ${mainUnitName}`}
//                     >
//                         <FiCheck size={12} />
//                     </Button>
//                 </div>
//             </div>
//         );
//     }, (prevProps, nextProps) => {
//         if (prevProps.index !== nextProps.index) return false;
//         if (prevProps.style !== nextProps.style) return false;

//         const prevMainUnit = prevProps.data.mainUnits[prevProps.index];
//         const nextMainUnit = nextProps.data.mainUnits[nextProps.index];

//         return (
//             shallowEqual(prevMainUnit, nextMainUnit) &&
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
//             name: 200,
//             actions: 140
//         });
//         showNotificationMessage('Column widths reset to default', 'success');
//     };

//     const fetchMainUnits = async () => {
//         try {
//             setLoading(true);
//             const response = await api.get('/api/retailer/mainUnits');

//             if (response.data.redirectTo) {
//                 navigate(response.data.redirectTo);
//                 return;
//             }

//             if (response.data.success) {
//                 const apiData = response.data.data;
//                 setData({
//                     mainUnits: apiData.mainUnits || [],
//                     company: apiData.company || null,
//                     currentFiscalYear: apiData.currentFiscalYear || null,
//                     companyId: apiData.companyId || '',
//                     currentCompanyName: apiData.currentCompanyName || '',
//                     user: apiData.user || null,
//                     theme: apiData.theme || 'light',
//                     isAdminOrSupervisor: apiData.isAdminOrSupervisor || false
//                 });
//             } else {
//                 throw new Error(response.data.error || 'Failed to fetch main units');
//             }
//         } catch (err) {
//             handleApiError(err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleApiError = (error) => {
//         let errorMessage = 'An error occurred';

//         if (error.response) {
//             console.log('Error response:', error.response);
//             switch (error.response.status) {
//                 case 400:
//                     if (error.response.data.error === 'No fiscal year found for this company') {
//                         navigate('/select-fiscal-year');
//                         return;
//                     }
//                     if (error.response.data.error === 'No company selected. Please select a company first.') {
//                         navigate('/user-dashboard');
//                         return;
//                     }
//                     errorMessage = error.response.data.error || 'Invalid request';
//                     break;
//                 case 401:
//                     navigate('/login');
//                     return;
//                 case 403:
//                     navigate('/dashboard');
//                     return;
//                 case 404:
//                     errorMessage = error.response.data.error || 'Resource not found';
//                     break;
//                 case 409:
//                     errorMessage = error.response.data.error || 'Main unit already exists or cannot be deleted';
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

//     const handleEdit = (mainUnit) => {
//         setCurrentMainUnit(mainUnit);
//         setFormData({
//             name: mainUnit.name,
//         });
//     };

//     const handleSelectMainUnit = (mainUnit) => {
//         setFormData({
//             name: mainUnit.name,
//         });
//     };

//     const handleCancel = () => {
//         setCurrentMainUnit(null);
//         setFormData({
//             name: '',
//         });
//     };

//     const handleDelete = async (id) => {
//         if (window.confirm('Are you sure you want to delete this main unit?')) {
//             try {
//                 const response = await api.delete(`/api/retailer/mainUnits/${id}`);

//                 if (response.data.success) {
//                     showNotificationMessage('Main unit deleted successfully', 'success');
//                     fetchMainUnits();
//                 } else {
//                     showNotificationMessage(response.data.error || 'Failed to delete main unit', 'error');
//                 }
//             } catch (err) {
//                 if (err.response && err.response.status === 409) {
//                     showNotificationMessage(err.response.data.error || 'Main unit cannot be deleted as it is being used', 'error');
//                 } else {
//                     handleApiError(err);
//                 }
//             }
//         }
//     };

//     const handleFormChange = (e) => {
//         const { name, value } = e.target;
//         setFormData(prev => ({
//             ...prev,
//             [name]: value
//         }));
//         if (name === 'name') {
//             setSearchTerm(value.toLowerCase());
//         }
//     };

//     const handleEnterKey = (e) => {
//         if (e.key === 'Enter') {
//             e.preventDefault(); // Prevent form submission

//             // Get the submit button reference
//             const submitButton = document.getElementById('submitMainUnitButton');

//             // If button exists, focus on it
//             if (submitButton) {
//                 submitButton.focus();
//             }
//         }
//     };

//     const handleSubmit = async (e) => {
//         if (e) {
//             e.preventDefault();
//         }

//         // Validate form
//         if (!formData.name.trim()) {
//             showNotificationMessage('Main unit name is required', 'error');
//             return;
//         }

//         setIsSaving(true);
//         try {
//             if (currentMainUnit) {
//                 // Update existing main unit
//                 const updateData = {
//                     name: formData.name
//                 };
//                 const response = await api.put(`/api/retailer/mainUnits/${currentMainUnit.id || currentMainUnit._id}`, updateData);

//                 if (response.data.success) {
//                     showNotificationMessage('Main unit updated successfully!', 'success');
//                     handleCancel();
//                 } else {
//                     throw new Error(response.data.error || 'Failed to update main unit');
//                 }
//             } else {
//                 // Create new main unit
//                 const response = await api.post('/api/retailer/mainUnits', { name: formData.name });

//                 if (response.data.success) {
//                     showNotificationMessage('Main unit created successfully!', 'success');
//                     setFormData({
//                         name: '',
//                     });
//                     setTimeout(() => {
//                         if (mainUnitNameRef.current) {
//                             mainUnitNameRef.current.focus();
//                         }
//                     }, 50);
//                 } else {
//                     throw new Error(response.data.error || 'Failed to create main unit');
//                 }
//             }
//             fetchMainUnits();
//         } catch (err) {
//             handleApiError(err);
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const printMainUnits = () => {
//         const mainUnitsToPrint = printOption === 'all'
//             ? data.mainUnits
//             : data.mainUnits.filter(mainUnit => mainUnit.status === 'active');

//         if (mainUnitsToPrint.length === 0) {
//             alert("No main units to print");
//             return;
//         }

//         const printWindow = window.open("", "_blank");

//         const printHeader = `
//             <div class="print-header">
//                 <h1>${data.company?.companyName || data.currentCompanyName || 'Company Name'}</h1>
//                 <hr>
//             </div>
//         `;

//         let tableContent = `
//             <style>
//                 @page {
//                     size: A4 landscape;
//                     margin: 10mm;
//                 }
//                 body { 
//                     font-family: Arial, sans-serif; 
//                     font-size: 10px; 
//                     margin: 0;
//                     padding: 10mm;
//                 }
//                 table { 
//                     width: 100%; 
//                     border-collapse: collapse; 
//                     page-break-inside: auto;
//                 }
//                 tr { 
//                     page-break-inside: avoid; 
//                     page-break-after: auto; 
//                 }
//                 th, td { 
//                     border: 1px solid #000; 
//                     padding: 4px; 
//                     text-align: left; 
//                     white-space: nowrap;
//                 }
//                 th { 
//                     background-color: #f2f2f2 !important; 
//                     -webkit-print-color-adjust: exact; 
//                 }
//                 .print-header { 
//                     text-align: center; 
//                     margin-bottom: 15px; 
//                 }
//                 .nowrap {
//                     white-space: nowrap;
//                 }
//                 .badge { 
//                     padding: 3px 6px; 
//                     border-radius: 3px; 
//                     font-size: 10px; 
//                     display: inline-block;
//                 }
//                 .footer-note {
//                     margin-top: 20px; 
//                     font-size: 0.9em; 
//                     color: #666;
//                     text-align: center;
//                 }
//                 .header-info {
//                     text-align: center;
//                     margin-bottom: 10px;
//                     font-size: 11px;
//                 }
//                 .report-title {
//                     text-align: center;
//                     font-size: 16px;
//                     font-weight: bold;
//                     margin-bottom: 5px;
//                     text-decoration: underline;
//                 }
//                 .filter-info {
//                     text-align: center;
//                     font-size: 11px;
//                     margin-bottom: 15px;
//                     color: #666;
//                 }
//             </style>
//             ${printHeader}
            
//             <div class="report-title">Main Units Report</div>
            
//             <div class="header-info">
//                 <strong>Fiscal Year:</strong> ${data.currentFiscalYear?.name || 'N/A'} | 
//                 <strong>Total Main Units:</strong> ${mainUnitsToPrint.length}
//             </div>
            
//             <div class="filter-info">
//                 ${printOption !== 'all' ?
//                 `<strong>Filter:</strong> ${printOption.charAt(0).toUpperCase() + printOption.slice(1)} | ` : ''
//             }
//                 <strong>Printed on:</strong> ${new Date().toLocaleDateString()}
//             </div>
            
//             <table>
//                 <thead>
//                     <tr>
//                         <th class="nowrap">S.N.</th>
//                         <th class="nowrap">Main Unit Name</th>
//                         <th class="nowrap">Unique Number</th>
//                         <th class="nowrap">Created Date</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//         `;

//         mainUnitsToPrint.forEach((mainUnit, index) => {
//             tableContent += `
//                 <tr>
//                     <td class="nowrap">${index + 1}</td>
//                     <td class="nowrap">${mainUnit.name || 'N/A'}</td>
//                     <td class="nowrap">
//                         ${mainUnit.uniqueNumber || 'N/A'}
//                     </td>
//                     <td class="nowrap">
//                         ${mainUnit.createdAt ? new Date(mainUnit.createdAt).toLocaleDateString() : 'N/A'}
//                     </td>
//                 </tr>
//             `;
//         });

//         tableContent += `
//                 </tbody>
//             </table>
            
//             <div class="footer-note">
//                 <br>
//                 ${data.company?.companyName ? `© ${new Date().getFullYear()} ${data.company.companyName}` : ''}
//             </div>
//         `;

//         printWindow.document.write(`
//             <html>
//                 <head>
//                     <title>Main Units Report - ${data.company?.companyName || data.currentCompanyName || 'Main Units Report'}</title>
//                 </head>
//                 <body>
//                     ${tableContent}
//                     <script>
//                         window.onload = function() {
//                             setTimeout(function() {
//                                 window.print();
//                                 window.onafterprint = function() {
//                                     window.close();
//                                 };
//                             }, 200);
//                         };
//                     <\/script>
//                 </body>
//             </html>
//         `);
//         printWindow.document.close();
//     };

//     const exportToExcel = async (exportAll = false) => {
//         setExporting(true);
//         try {
//             const mainUnitsToExport = exportAll ? data.mainUnits : filteredMainUnits;

//             if (mainUnitsToExport.length === 0) {
//                 showNotificationMessage('No main units to export', 'warning');
//                 return;
//             }

//             const excelData = mainUnitsToExport.map((mainUnit, index) => {
//                 return {
//                     'S.N.': index + 1,
//                     'Main Unit Name': mainUnit.name || 'N/A',
//                     'Unique Number': mainUnit.uniqueNumber || '',
//                     'Created': mainUnit.createdAt ? new Date(mainUnit.createdAt).toLocaleDateString() : '',
//                     'Last Updated': mainUnit.updatedAt ? new Date(mainUnit.updatedAt).toLocaleDateString() : ''
//                 };
//             });

//             const summaryData = [
//                 {},
//                 {
//                     'S.N.': 'SUMMARY',
//                     'Main Unit Name': 'Total Main Units:',
//                     'Unique Number': mainUnitsToExport.length
//                 },
//                 {
//                     'S.N.': '',
//                     'Main Unit Name': 'Units with Unique Numbers:',
//                     'Unique Number': mainUnitsToExport.filter(mainUnit => mainUnit.uniqueNumber).length
//                 }
//             ];

//             const wb = XLSX.utils.book_new();
//             const ws = XLSX.utils.json_to_sheet(excelData);

//             ws['!cols'] = [
//                 { wch: 6 },
//                 { wch: Math.min(mainUnitsToExport.reduce((w, r) => Math.max(w, r['Main Unit Name']?.length || 0), 10), 50) },
//                 { wch: 12 },
//                 { wch: 12 },
//                 { wch: 12 }
//             ];

//             XLSX.utils.book_append_sheet(wb, ws, 'Main Units');

//             const wsSummary = XLSX.utils.json_to_sheet(summaryData);
//             XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

//             const date = new Date().toISOString().split('T')[0];
//             const filterInfo = exportAll ? 'All' : 'Filtered';
//             const fileName = `Main_Units_Report_${filterInfo}_${date}.xlsx`;

//             XLSX.writeFile(wb, fileName);

//             showNotificationMessage(
//                 `${exportAll ? 'All' : 'Filtered'} main units (${mainUnitsToExport.length}) exported successfully!`,
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

//             <div className="card mt-2">
//                 <div className="row g-3">
//                     {/* Left Column - Add Main Unit Form */}
//                     <div className="col-lg-6">
//                         <div className="card h-100 shadow-lg">
//                             <div className="card-body">
//                                 <h3 className="text-center" style={{ textDecoration: 'underline' }}>
//                                     {currentMainUnit ? `Edit Main Unit: ${currentMainUnit.name}` : 'Create Main Unit'}
//                                 </h3>
//                                 <Form onSubmit={handleSubmit} id="addMainUnitForm" style={{ marginTop: '5px' }}>
//                                     <Form.Group style={{ marginBottom: '12px' }}>
//                                         <div className="position-relative">
//                                             <Form.Control
//                                                 ref={mainUnitNameRef}
//                                                 type="text"
//                                                 name="name"
//                                                 value={formData.name}
//                                                 onChange={handleFormChange}
//                                                 onKeyDown={handleEnterKey}
//                                                 placeholder=" "
//                                                 required
//                                                 autoFocus
//                                                 autoComplete="off"
//                                                 style={{
//                                                     height: '30px',
//                                                     fontSize: '0.875rem',
//                                                     paddingTop: '0.75rem'
//                                                 }}
//                                             />
//                                             <label
//                                                 className="position-absolute"
//                                                 style={{
//                                                     top: '-8px',
//                                                     left: '0.75rem',
//                                                     fontSize: '0.75rem',
//                                                     backgroundColor: 'white',
//                                                     padding: '0 0.25rem',
//                                                     color: '#6c757d',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 Main Unit Name <span className="text-danger">*</span>
//                                             </label>
//                                         </div>
//                                     </Form.Group>

//                                     <div className="d-flex justify-content-between align-items-center">
//                                         {currentMainUnit ? (
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
//                                                 id="submitMainUnitButton"
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
//                                                 ) : currentMainUnit ? (
//                                                     <>
//                                                         <FiCheck className="me-1" size={14} />
//                                                         Save Changes
//                                                     </>
//                                                 ) : (
//                                                     'Add Main Unit'
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

//                     {/* Right Column - Existing Main Units */}
//                     <div className="col-lg-6">
//                         <div className="card h-100 shadow-lg">
//                             <div className="card-body">
//                                 <h3 className="text-center" style={{ textDecoration: 'underline' }}>Existing Main Units</h3>

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
//                                             disabled={exporting || (data.mainUnits || []).length === 0}
//                                             title="Export all main units to Excel"
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
//                                                 Search main units...
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
//                                                 Loading main units...
//                                             </p>
//                                         </div>
//                                     ) : filteredMainUnits.length === 0 ? (
//                                         <div className="d-flex flex-column justify-content-center align-items-center h-100">
//                                             <i className="bi bi-rulers text-muted" style={{ fontSize: '1.5rem' }}></i>
//                                             <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
//                                                 No main units found
//                                             </h6>
//                                             <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
//                                                 {searchTerm ? 'Try a different search term' : 'Create your first main unit using the form'}
//                                             </p>
//                                         </div>
//                                     ) : (
//                                         <AutoSizer>
//                                             {({ height, width }) => {
//                                                 const totalWidth = 50 + columnWidths.name + columnWidths.actions;

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
//                                                             itemCount={filteredMainUnits.length}
//                                                             itemSize={26}
//                                                             width={Math.max(width, totalWidth)}
//                                                             itemData={{
//                                                                 mainUnits: filteredMainUnits,
//                                                                 isAdminOrSupervisor: data.isAdminOrSupervisor
//                                                             }}
//                                                         >
//                                                             {TableRow}
//                                                         </List>
//                                                         <div className="mt-2 text-muted small">
//                                                             Showing {filteredMainUnits.length} of {(data.mainUnits || []).length} main units
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
//                                                 Loading main units...
//                                             </p>
//                                         </div>
//                                     ) : paginatedMainUnits.length === 0 ? (
//                                         <div className="d-flex flex-column justify-content-center align-items-center h-100">
//                                             <i className="bi bi-rulers text-muted" style={{ fontSize: '1.5rem' }}></i>
//                                             <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
//                                                 No main units found
//                                             </h6>
//                                             <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
//                                                 {searchTerm ? 'Try a different search term' : 'Create your first main unit using the form'}
//                                             </p>
//                                         </div>
//                                     ) : (
//                                         <AutoSizer>
//                                             {({ height, width }) => {
//                                                 const totalWidth = 50 + columnWidths.name + columnWidths.actions;

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
//                                                             key={`mainunits-list-${paginatedMainUnits.length}-${currentPage}`}
//                                                             height={height - 60}
//                                                             itemCount={paginatedMainUnits.length}
//                                                             itemSize={26}
//                                                             width={Math.max(width, totalWidth)}
//                                                             itemData={{
//                                                                 mainUnits: paginatedMainUnits,
//                                                                 isAdminOrSupervisor: data.isAdminOrSupervisor
//                                                             }}
//                                                         >
//                                                             {TableRow}
//                                                         </List>

//                                                         {/* Loading More Indicator */}
//                                                         {isLoadingMore && (
//                                                             <div className="text-center py-2">
//                                                                 <Spinner animation="border" size="sm" className="me-2" />
//                                                                 <span className="text-muted" style={{ fontSize: '0.7rem' }}>Loading more main units...</span>
//                                                             </div>
//                                                         )}

//                                                         {/* Footer with item count and load more button */}
//                                                         <div className="mt-2 text-muted small">
//                                                             Showing {paginatedMainUnits.length} of {totalFilteredMainUnits} main units
//                                                             {searchTerm && ` (filtered)`}
//                                                             {hasMoreItems && paginatedMainUnits.length < totalFilteredMainUnits && (
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
//                             <span className="fw-bold fs-6">Print Main Units Report</span>
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
//                                 All Main Units
//                             </Button>
//                             <Button
//                                 variant={printOption === 'active' ? 'success' : 'outline-success'}
//                                 onClick={() => setPrintOption('active')}
//                                 size="sm"
//                             >
//                                 Active Only
//                             </Button>
//                         </div>

//                         <div className="border-top pt-3 mt-3">
//                             <h6 className="fw-bold mb-2 text-primary">Report Summary</h6>
//                             <div className="row text-center">
//                                 <div className="col-4">
//                                     <div className="text-muted small">Total Main Units</div>
//                                     <div className="fw-bold h5">{(data.mainUnits || []).length}</div>
//                                 </div>
//                                 <div className="col-4">
//                                     <div className="text-muted small">With Unique Numbers</div>
//                                     <div className="fw-bold h5 text-success">
//                                         {(data.mainUnits || []).filter(mainUnit => mainUnit.uniqueNumber).length}
//                                     </div>
//                                 </div>
//                                 <div className="col-4">
//                                     <div className="text-muted small">Recently Created</div>
//                                     <div className="fw-bold h5 text-info">
//                                         {(data.mainUnits || []).filter(mainUnit => {
//                                             const createdDate = new Date(mainUnit.createdAt);
//                                             const thirtyDaysAgo = new Date();
//                                             thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//                                             return createdDate > thirtyDaysAgo;
//                                         }).length}
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {printOption !== 'all' && (
//                             <div className="alert alert-info border small mt-3 py-2">
//                                 <i className="bi bi-info-circle me-2"></i>
//                                 <span>
//                                     Filtering by: <strong>{
//                                         printOption === 'active'
//                                             ? 'Active main units only'
//                                             : 'All main units'
//                                     }</strong>
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
//                                 }}
//                                 size="sm"
//                                 disabled={printOption === 'all'}
//                             >
//                                 Reset
//                             </Button>
//                             <Button
//                                 variant="primary"
//                                 onClick={() => {
//                                     printMainUnits();
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
//                     <p>Are you sure you want to save this main unit?</p>
//                     {currentMainUnit && (
//                         <div className="alert alert-warning small">
//                             <i className="bi bi-exclamation-triangle me-1"></i>
//                             This will update the existing main unit: <strong>{currentMainUnit.name}</strong>
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
//                         {currentMainUnit ? 'Update Main Unit' : 'Create Main Unit'}
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

// export default MainUnits;

//------------------------------------------------end1

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    FiEdit2, 
    FiTrash2, 
    FiPrinter, 
    FiArrowLeft, 
    FiX, 
    FiCheck, 
    FiRefreshCw, 
    FiSearch, 
    FiGrid, 
    FiHash, 
    FiDownload, 
    FiSave 
} from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Badge from 'react-bootstrap/Badge';
import Spinner from 'react-bootstrap/Spinner';
import Modal from 'react-bootstrap/Modal';
import Header from '../retailer/Header';
import NotificationToast from '../NotificationToast';
import ProductModal from './dashboard/modals/ProductModal';
import * as XLSX from 'xlsx';
import './MainUnits.css';

const MainUnits = () => {
    const [exporting, setExporting] = useState(false);
    const navigate = useNavigate();
    const [data, setData] = useState({
        mainUnits: [],
        company: null,
        currentFiscalYear: null,
        companyId: '',
        currentCompanyName: '',
        user: null,
        theme: 'light',
        isAdminOrSupervisor: false
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentMainUnit, setCurrentMainUnit] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('');
    const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [printOption, setPrintOption] = useState('all');

    const mainUnitNameRef = useRef(null);

    // Pagination state
    const [paginatedMainUnits, setPaginatedMainUnits] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreItems, setHasMoreItems] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalFilteredMainUnits, setTotalFilteredMainUnits] = useState(0);
    const tableContainerRef = useRef(null);

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        name: 350,
        status: 100,
        code: 100,
        actions: 140
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    api.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    const showNotificationMessage = (message, type) => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    useEffect(() => {
        fetchMainUnits();
    }, []);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('mainUnitsTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('mainUnitsTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                setShowSaveConfirmModal(true);
            }
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Filtered main units
    const filteredMainUnits = useMemo(() => {
        return (data.mainUnits || [])
            .filter(mainUnit =>
                mainUnit?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [data.mainUnits, searchTerm]);

    const processedFilteredMainUnits = useMemo(() => {
        return filteredMainUnits.map(mainUnit => ({
            ...mainUnit,
            _id: mainUnit.id || mainUnit._id
        }));
    }, [filteredMainUnits]);

    // Pagination
    const paginateMainUnits = useCallback((mainUnitsList, pageNum, itemsPerPage = 25) => {
        const actualLimit = pageNum === 1 ? 15 : 15 + ((pageNum - 1) * itemsPerPage);
        return mainUnitsList.slice(0, actualLimit);
    }, []);

    useEffect(() => {
        const initialMainUnits = paginateMainUnits(processedFilteredMainUnits, 1);
        setPaginatedMainUnits(initialMainUnits);
        setCurrentPage(1);
        setHasMoreItems(processedFilteredMainUnits.length > initialMainUnits.length);
        setTotalFilteredMainUnits(processedFilteredMainUnits.length);
    }, [processedFilteredMainUnits, paginateMainUnits]);

    const loadMoreItems = useCallback(() => {
        if (!hasMoreItems || isLoadingMore) return;
        setIsLoadingMore(true);

        setTimeout(() => {
            const nextPage = currentPage + 1;
            const itemsPerPage = 25;
            const newLimit = nextPage === 1 ? 15 : 15 + ((nextPage - 1) * itemsPerPage);
            const newPaginatedMainUnits = processedFilteredMainUnits.slice(0, newLimit);

            if (newPaginatedMainUnits.length === paginatedMainUnits.length) {
                setHasMoreItems(false);
            } else {
                setPaginatedMainUnits(newPaginatedMainUnits);
                setCurrentPage(nextPage);
            }
            setIsLoadingMore(false);
        }, 100);
    }, [hasMoreItems, isLoadingMore, currentPage, processedFilteredMainUnits, paginatedMainUnits]);

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

    // Resizable Table Header
    const TableHeader = React.memo(() => {
        const totalWidth = 50 + columnWidths.name + columnWidths.status + columnWidths.code + columnWidths.actions;

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="mu-header"
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
                <div className="mu-header-cell mu-header-cell--sn">S.N.</div>
                <div className="mu-header-cell mu-header-cell--resizable" style={{ width: `${columnWidths.name}px`, minWidth: '100px' }}>
                    Main Unit Name
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="name" />
                </div>
                {/* <div className="mu-header-cell mu-header-cell--resizable" style={{ width: `${columnWidths.status}px`, minWidth: '60px' }}>
                    Status
                    <ResizeHandle onResizeStart={handleResizeStart} columnName="status" />
                </div> */}
                <div className="mu-header-cell" style={{ width: `${columnWidths.actions}px`, minWidth: '120px', textAlign: 'center' }}>
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
        const { mainUnits, isAdminOrSupervisor } = data;
        const mainUnit = mainUnits[index];

        if (!mainUnit) return null;

        const handleEditClick = useCallback(() => mainUnit && handleEdit(mainUnit), [mainUnit]);
        const handleDeleteClick = useCallback(() => {
            const mainUnitId = mainUnit.id || mainUnit._id;
            if (mainUnitId) handleDelete(mainUnitId);
        }, [mainUnit]);
        const handleSelect = useCallback(() => mainUnit && handleSelectMainUnit(mainUnit), [mainUnit]);

        const mainUnitName = mainUnit.name || 'N/A';
        const isActive = mainUnit.status === 'active';

        return (
            <div
                style={{ ...style, display: 'flex', alignItems: 'center', height: '28px', minHeight: '28px', padding: '0', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                className={index % 2 === 0 ? 'mu-row-even' : 'mu-row-odd'}
            >
                <div className="mu-cell mu-cell--sn">{index + 1}</div>
                <div className="mu-cell mu-cell--name" style={{ width: `${columnWidths.name}px`, flexShrink: 0 }} title={mainUnitName}>
                    <span className="mu-item-name">{mainUnitName}</span>
                    {isActive && <span className="mu-badge mu-badge--active">Active</span>}
                </div>
                {/* <div className="mu-cell mu-cell--status" style={{ width: `${columnWidths.status}px`, flexShrink: 0 }}>
                    <span className={`mu-status-badge mu-status-badge--${isActive ? 'active' : 'inactive'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                </div> */}
                <div className="mu-cell mu-cell--actions" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>
                    {isAdminOrSupervisor && (
                        <>
                            <button className="mu-btn-action mu-btn-action--edit" onClick={handleEditClick} title="Edit" disabled={!!currentMainUnit}>
                                <FiEdit2 size={12} />
                            </button>
                            <button className="mu-btn-action mu-btn-action--delete" onClick={handleDeleteClick} title="Delete" disabled={!!currentMainUnit}>
                                <FiTrash2 size={12} />
                            </button>
                        </>
                    )}
                    <button className="mu-btn-action mu-btn-action--select" onClick={handleSelect} title="Select">
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
                className="mu-resize-handle"
                onMouseDown={(e) => {
                    e.preventDefault();
                    onResizeStart(e, columnName);
                }}
            />
        );
    });

    const resetColumnWidths = () => {
        setColumnWidths({
            name: 350,
            status: 100,
            code: 100,
            actions: 140
        });
        showNotificationMessage('Column widths reset to default', 'success');
    };

    const fetchMainUnits = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/retailer/mainUnits');

            if (response.data.redirectTo) {
                navigate(response.data.redirectTo);
                return;
            }

            if (response.data.success) {
                const apiData = response.data.data;
                setData({
                    mainUnits: apiData.mainUnits || [],
                    company: apiData.company || null,
                    currentFiscalYear: apiData.currentFiscalYear || null,
                    companyId: apiData.companyId || '',
                    currentCompanyName: apiData.currentCompanyName || '',
                    user: apiData.user || null,
                    theme: apiData.theme || 'light',
                    isAdminOrSupervisor: apiData.isAdminOrSupervisor || false
                });
            } else {
                throw new Error(response.data.error || 'Failed to fetch main units');
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApiError = (error) => {
        let errorMessage = 'An error occurred';

        if (error.response) {
            switch (error.response.status) {
                case 400:
                    if (error.response.data.error === 'No fiscal year found for this company') {
                        navigate('/select-fiscal-year');
                        return;
                    }
                    if (error.response.data.error === 'No company selected. Please select a company first.') {
                        navigate('/user-dashboard');
                        return;
                    }
                    errorMessage = error.response.data.error || 'Invalid request';
                    break;
                case 401:
                    navigate('/login');
                    return;
                case 403:
                    navigate('/dashboard');
                    return;
                case 404:
                    errorMessage = error.response.data.error || 'Resource not found';
                    break;
                case 409:
                    errorMessage = error.response.data.error || 'Main unit already exists or cannot be deleted';
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

    const handleEdit = (mainUnit) => {
        setCurrentMainUnit(mainUnit);
        setFormData({
            name: mainUnit.name,
        });
    };

    const handleSelectMainUnit = (mainUnit) => {
        setFormData({
            name: mainUnit.name,
        });
    };

    const handleCancel = () => {
        setCurrentMainUnit(null);
        setFormData({
            name: '',
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this main unit?')) {
            try {
                const response = await api.delete(`/api/retailer/mainUnits/${id}`);

                if (response.data.success) {
                    showNotificationMessage('Main unit deleted successfully', 'success');
                    fetchMainUnits();
                } else {
                    showNotificationMessage(response.data.error || 'Failed to delete main unit', 'error');
                }
            } catch (err) {
                if (err.response && err.response.status === 409) {
                    showNotificationMessage(err.response.data.error || 'Main unit cannot be deleted as it is being used', 'error');
                } else {
                    handleApiError(err);
                }
            }
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'name') {
            setSearchTerm(value.toLowerCase());
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!formData.name.trim()) {
            showNotificationMessage('Main unit name is required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            if (currentMainUnit) {
                const updateData = { name: formData.name };
                const response = await api.put(`/api/retailer/mainUnits/${currentMainUnit.id || currentMainUnit._id}`, updateData);

                if (response.data.success) {
                    showNotificationMessage('Main unit updated successfully!', 'success');
                    handleCancel();
                } else {
                    throw new Error(response.data.error || 'Failed to update main unit');
                }
            } else {
                const response = await api.post('/api/retailer/mainUnits', { name: formData.name });

                if (response.data.success) {
                    showNotificationMessage('Main unit created successfully!', 'success');
                    setFormData({
                        name: '',
                    });
                    setTimeout(() => {
                        if (mainUnitNameRef.current) {
                            mainUnitNameRef.current.focus();
                        }
                    }, 50);
                } else {
                    throw new Error(response.data.error || 'Failed to create main unit');
                }
            }
            fetchMainUnits();
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsSaving(false);
        }
    };

    const printMainUnits = () => {
        const mainUnitsToPrint = printOption === 'all'
            ? data.mainUnits
            : data.mainUnits.filter(mainUnit => mainUnit.status === 'active');

        if (mainUnitsToPrint.length === 0) {
            alert("No main units to print");
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
                .badge { padding: 2px 4px; border-radius: 3px; font-size: 7px; display: inline-block; }
                .badge-success { background-color: #28a745; color: white; }
                .badge-secondary { background-color: #6c757d; color: white; }
                .footer-note { margin-top: 10px; font-size: 7px; color: #666; text-align: center; }
            </style>
            ${printHeader}
            <div class="report-title">Main Units Report</div>
            <div class="header-info">
                <strong>Fiscal Year:</strong> ${data.currentFiscalYear?.name || 'N/A'} | 
                <strong>Total Main Units:</strong> ${mainUnitsToPrint.length}
            </div>
            <div class="filter-info">
                ${printOption !== 'all' ? `<strong>Filter:</strong> Active Only | ` : ''}
                <strong>Printed on:</strong> ${new Date().toLocaleDateString()}
            </div>
            <table>
                <thead>
                    <tr>
                        <th class="nowrap">S.N.</th>
                        <th class="nowrap">Main Unit Name</th>
                        <th class="nowrap">Status</th>
                        <th class="nowrap">Code</th>
                    </tr>
                </thead>
                <tbody>
        `;

        mainUnitsToPrint.forEach((mainUnit, index) => {
            const statusClass = mainUnit.status === 'active' ? 'badge-success' : 'badge-secondary';
            const statusText = mainUnit.status === 'active' ? 'Active' : (mainUnit.status || 'N/A');

            tableContent += `
                <tr>
                    <td class="nowrap">${index + 1}</td>
                    <td class="nowrap">${mainUnit.name || 'N/A'}</td>
                    <td class="nowrap"><span class="badge ${statusClass}">${statusText}</span></td>
                    <td class="nowrap">${mainUnit.uniqueNumber || 'N/A'}</td>
                </tr>
            `;
        });

        tableContent += `
                </tbody>
            </table>
            <div class="footer-note">
                ${data.company?.companyName ? `© ${new Date().getFullYear()} ${data.company.companyName}` : ''}
            </div>
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Main Units Report - ${data.company?.companyName || data.currentCompanyName || 'Main Units Report'}</title>
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
            const mainUnitsToExport = exportAll ? data.mainUnits : filteredMainUnits;

            if (mainUnitsToExport.length === 0) {
                showNotificationMessage('No main units to export', 'warning');
                return;
            }

            const excelData = mainUnitsToExport.map((mainUnit, index) => ({
                'S.N.': index + 1,
                'Main Unit Name': mainUnit.name || 'N/A',
                'Status': mainUnit.status || 'N/A',
                'Code': mainUnit.uniqueNumber || '',
                'Created': mainUnit.createdAt ? new Date(mainUnit.createdAt).toLocaleDateString() : '',
                'Last Updated': mainUnit.updatedAt ? new Date(mainUnit.updatedAt).toLocaleDateString() : ''
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            XLSX.utils.book_append_sheet(wb, ws, 'Main Units');

            const date = new Date().toISOString().split('T')[0];
            const fileName = `Main_Units_Report_${exportAll ? 'All' : 'Filtered'}_${date}.xlsx`;

            XLSX.writeFile(wb, fileName);
            showNotificationMessage(`${exportAll ? 'All' : 'Filtered'} main units (${mainUnitsToExport.length}) exported successfully!`, 'success');

        } catch (err) {
            console.error('Error exporting to Excel:', err);
            showNotificationMessage('Failed to export to Excel', 'error');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="mu-container">
            <Header />
            <NotificationToast
                message={notificationMessage}
                type={notificationType}
                show={showNotification}
                onClose={() => setShowNotification(false)}
            />

            <div className="mu-main">
                {/* Left Column - Add Main Unit Form */}
                <div className="mu-form-section">
                    <div className="mu-card mu-card--form">
                        <div className="mu-card-header">
                            <div className="mu-card-header-left">
                                <div className="mu-card-header-icon mu-card-header-icon--form">
                                    <FiHash />
                                </div>
                                <div>
                                    <h5 className="mu-card-title">{currentMainUnit ? `Edit Main Unit: ${currentMainUnit.name}` : 'Create Main Unit'}</h5>
                                    <small className="mu-card-subtitle">
                                        {currentMainUnit ? 'Update existing main unit' : 'Add new main unit'}
                                    </small>
                                </div>
                            </div>
                            {currentMainUnit && (
                                <button className="mu-btn-cancel" onClick={handleCancel} disabled={isSaving}>
                                    <FiX /> Cancel
                                </button>
                            )}
                        </div>

                        <div className="mu-card-body">
                            <form onSubmit={handleSubmit} id="addMainUnitForm">
                                <div className="mu-form-row">
                                    <div className="mu-form-group mu-form-group--full">
                                        <label className="mu-form-label">Main Unit Name <span className="mu-required">*</span></label>
                                        <input
                                            ref={mainUnitNameRef}
                                            type="text"
                                            name="name"
                                            className="mu-form-input"
                                            value={formData.name}
                                            onChange={handleFormChange}
                                            placeholder="Enter main unit name"
                                            required
                                            autoFocus
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const submitButton = document.getElementById('submitMainUnitButton');
                                                    if (submitButton) {
                                                        submitButton.focus();
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="mu-form-row">
                                    <div className="mu-form-group mu-form-group--full">
                                        <div className="mu-form-actions mu-form-actions--right">
                                            <button
                                                id="submitMainUnitButton"
                                                type="submit"
                                                className="mu-btn-save"
                                                disabled={isSaving}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <span className="mu-spinner-small"></span>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiSave size={14} /> {currentMainUnit ? 'Update Main Unit' : 'Add Main Unit'}
                                                    </>
                                                )}
                                            </button>
                                            <small className="mu-shortcut-hint">Alt+S</small>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right Column - Existing Main Units */}
                <div className="mu-list-section">
                    <div className="mu-card mu-card--list">
                        <div className="mu-card-header mu-card-header--list">
                            <div className="mu-card-header-left">
                                <div className="mu-card-header-icon mu-card-header-icon--list">
                                    <FiGrid />
                                </div>
                                <div>
                                    <h5 className="mu-card-title">Existing Main Units</h5>
                                    <small className="mu-card-subtitle">
                                        {totalFilteredMainUnits} units found
                                    </small>
                                </div>
                            </div>
                            <div className="mu-card-actions">
                                <button className="mu-btn-toolbar" onClick={() => navigate(-1)} title="Go back">
                                    <FiArrowLeft size={14} />
                                </button>
                                <button className="mu-btn-toolbar" onClick={() => setShowPrintModal(true)} title="Print report">
                                    <FiPrinter size={14} />
                                </button>
                                <button className="mu-btn-toolbar" onClick={() => exportToExcel(true)} disabled={exporting || (data.mainUnits || []).length === 0} title="Export to Excel">
                                    {exporting ? <span className="mu-spinner-small"></span> : <FiDownload size={14} />}
                                </button>
                                <button className="mu-btn-toolbar" onClick={resetColumnWidths} title="Reset column widths">
                                    <FiRefreshCw size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="mu-search-bar">
                            <div className="mu-search-wrapper">
                                <FiSearch className="mu-search-icon" />
                                <input
                                    type="text"
                                    className="mu-search-input"
                                    placeholder="Search main units by name..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                                {searchTerm && (
                                    <button className="mu-search-clear" onClick={() => setSearchTerm('')}>
                                        <FiX size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mu-table-wrapper" ref={tableContainerRef}>
                            {loading ? (
                                <div className="mu-loading">
                                    <div className="mu-spinner"></div>
                                    <p className="mu-loading-text">Loading main units...</p>
                                </div>
                            ) : paginatedMainUnits.length === 0 ? (
                                <div className="mu-empty">
                                    <FiHash className="mu-empty-icon" size={32} />
                                    <h6 className="mu-empty-title">No main units found</h6>
                                    <p className="mu-empty-text">
                                        {searchTerm ? 'Try a different search term' : 'Create your first main unit using the form'}
                                    </p>
                                </div>
                            ) : (
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth = 50 + columnWidths.name + columnWidths.status + columnWidths.code + columnWidths.actions;
                                        return (
                                            <div style={{ height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List
                                                    key={`mainunits-list-${paginatedMainUnits.length}-${currentPage}`}
                                                    height={height - 30}
                                                    itemCount={paginatedMainUnits.length}
                                                    itemSize={28}
                                                    width={Math.max(width, totalWidth)}
                                                    itemData={{
                                                        mainUnits: paginatedMainUnits,
                                                        isAdminOrSupervisor: data.isAdminOrSupervisor
                                                    }}
                                                >
                                                    {TableRow}
                                                </List>
                                                {isLoadingMore && (
                                                    <div className="mu-loading-more">
                                                        <div className="mu-spinner-small"></div>
                                                        <span>Loading more main units...</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            )}
                        </div>

                        <div className="mu-table-footer">
                            <span className="mu-footer-info">
                                Showing {paginatedMainUnits.length} of {totalFilteredMainUnits} main units
                            </span>
                            {hasMoreItems && paginatedMainUnits.length < totalFilteredMainUnits && (
                                <button className="mu-btn-load-more" onClick={loadMoreItems} disabled={isLoadingMore}>
                                    Load more...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Options Modal */}
            <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} centered size="md">
                <Modal.Header closeButton className="mu-modal-header">
                    <div className="d-flex align-items-center">
                        <FiPrinter className="me-2" size={20} />
                        <div>
                            <span className="fw-bold fs-6">Print Main Units Report</span>
                            <small className="d-block opacity-75">Select filter options</small>
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body className="p-3">
                    <div className="mu-print-options">
                        <h6 className="mu-print-options-title">Filter Options</h6>
                        <div className="mu-print-options-grid">
                            <button className={`mu-print-option ${printOption === 'all' ? 'mu-print-option--active' : ''}`} onClick={() => setPrintOption('all')}>
                                All Units
                            </button>
                            <button className={`mu-print-option ${printOption === 'active' ? 'mu-print-option--active' : ''}`} onClick={() => setPrintOption('active')}>
                                Active Only
                            </button>
                        </div>

                        <div className="mu-print-summary">
                            <h6 className="mu-print-options-title">Report Summary</h6>
                            <div className="mu-print-stats">
                                <div className="mu-print-stat">
                                    <span className="mu-print-stat-label">Total Units</span>
                                    <span className="mu-print-stat-value">{(data.mainUnits || []).length}</span>
                                </div>
                                <div className="mu-print-stat">
                                    <span className="mu-print-stat-label mu-print-stat-label--success">Active</span>
                                    <span className="mu-print-stat-value mu-print-stat-value--success">
                                        {(data.mainUnits || []).filter(mainUnit => mainUnit.status === 'active').length}
                                    </span>
                                </div>
                                <div className="mu-print-stat">
                                    <span className="mu-print-stat-label mu-print-stat-label--danger">Inactive</span>
                                    <span className="mu-print-stat-value mu-print-stat-value--danger">
                                        {(data.mainUnits || []).filter(mainUnit => mainUnit.status !== 'active').length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="py-2">
                    <button className="mu-btn-secondary" onClick={() => setShowPrintModal(false)}>Cancel</button>
                    <button className="mu-btn-primary" onClick={() => { printMainUnits(); setShowPrintModal(false); }}>
                        <FiPrinter className="me-1" /> Print Report
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Save Confirmation Modal */}
            <Modal show={showSaveConfirmModal} onHide={() => setShowSaveConfirmModal(false)} centered>
                <Modal.Header closeButton className="mu-modal-header">
                    <Modal.Title>Confirm Save</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to save this main unit?</p>
                    {currentMainUnit && (
                        <div className="alert alert-warning small">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            This will update the existing main unit: <strong>{currentMainUnit.name}</strong>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className="mu-btn-secondary" onClick={() => setShowSaveConfirmModal(false)}>Cancel</button>
                    <button className="mu-btn-primary" onClick={() => { handleSubmit(); setShowSaveConfirmModal(false); }}>
                        {currentMainUnit ? 'Update Main Unit' : 'Create Main Unit'}
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Product Modal */}
            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
        </div>
    );
};

export default MainUnits;