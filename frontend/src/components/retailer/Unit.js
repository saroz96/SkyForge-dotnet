// import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// const Units = () => {
//     const [exporting, setExporting] = useState(false);
//     const navigate = useNavigate();
//     const [data, setData] = useState({
//         units: [],
//         company: null,
//         currentFiscalYear: null,
//         companyId: '',
//         currentCompanyName: '',
//         user: null,
//         theme: 'light',
//         isAdminOrSupervisor: false
//     });
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [currentUnit, setCurrentUnit] = useState(null);
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

//     const showNotificationMessage = (message, type) => {
//         setNotificationMessage(message);
//         setNotificationType(type);
//         setShowNotification(true);
//     };

//     useEffect(() => {
//         fetchUnits();
//     }, []);

//     // Save/load column widths
//     useEffect(() => {
//         const savedWidths = localStorage.getItem('unitsTableColumnWidths');
//         if (savedWidths) {
//             try {
//                 setColumnWidths(JSON.parse(savedWidths));
//             } catch (e) {
//                 console.error('Failed to load column widths:', e);
//             }
//         }
//     }, []);

//     useEffect(() => {
//         localStorage.setItem('unitsTableColumnWidths', JSON.stringify(columnWidths));
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

//     // Filtered units with memoization
//     const filteredUnits = useMemo(() => {
//         return (data.units || [])
//             .filter(unit =>
//                 unit?.name?.toLowerCase().includes(searchTerm.toLowerCase())
//             )
//             .sort((a, b) => a.name.localeCompare(b.name));
//     }, [data.units, searchTerm]);

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

//                 {/* Unit Name */}
//                 <div
//                     className="d-flex align-items-center ps-2 border-end border-white position-relative"
//                     style={{
//                         width: `${columnWidths.name}px`,
//                         flexShrink: 0,
//                         minWidth: '100px'
//                     }}
//                 >
//                     <strong style={{ fontSize: '0.8rem' }}>Unit Name</strong>
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
//         const { units, isAdminOrSupervisor } = data;
//         const unit = units[index];

//         const handleEditClick = useCallback(() => unit && handleEdit(unit), [unit]);
//         const handleDeleteClick = useCallback(() => unit?._id && handleDelete(unit._id), [unit?._id]);
//         const handleSelect = useCallback(() => unit && handleSelectUnit(unit), [unit]);

//         if (!unit) return null;

//         const unitName = unit.name || 'N/A';
//         const isActive = unit.status === 'active';
//         const isBaseUnit = unit.isBaseUnit;

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

//                 {/* Unit Name */}
//                 <div
//                     className="d-flex align-items-center ps-2 border-end"
//                     style={{
//                         width: `${columnWidths.name}px`,
//                         flexShrink: 0,
//                         height: '100%',
//                         overflow: 'hidden'
//                     }}
//                     title={`${unitName}`}
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
//                                 {unitName}
//                             </span>
//                             {isBaseUnit && (
//                                 <Badge bg="info" className="ms-2" style={{
//                                     fontSize: '0.6rem',
//                                     padding: '1px 4px'
//                                 }}>
//                                     Base Unit
//                                 </Badge>
//                             )}
//                             {isActive && (
//                                 <Badge bg="success" className="ms-2" style={{
//                                     fontSize: '0.6rem',
//                                     padding: '1px 4px'
//                                 }}>
//                                     Active
//                                 </Badge>
//                             )}
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
//                                 title={`Edit ${unitName}`}
//                                 disabled={!!currentUnit}
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
//                                 title={`Delete ${unitName}`}
//                                 disabled={!!currentUnit || isBaseUnit}
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
//                         title={`Select ${unitName}`}
//                     >
//                         <FiCheck size={12} />
//                     </Button>
//                 </div>
//             </div>
//         );
//     }, (prevProps, nextProps) => {
//         if (prevProps.index !== nextProps.index) return false;
//         if (prevProps.style !== nextProps.style) return false;

//         const prevUnit = prevProps.data.units[prevProps.index];
//         const nextUnit = nextProps.data.units[nextProps.index];

//         return (
//             shallowEqual(prevUnit, nextUnit) &&
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

//     const fetchUnits = async () => {
//         try {
//             setLoading(true);
//             setError(null);
//             const response = await api.get('/api/retailer/units');

//             if (response.data.redirectTo) {
//                 navigate(response.data.redirectTo);
//                 return;
//             }

//             if (response.data.success) {
//                 setData({
//                     units: response.data.data.units || [],
//                     company: response.data.data.company,
//                     currentFiscalYear: response.data.data.currentFiscalYear,
//                     companyId: response.data.data.companyId,
//                     currentCompanyName: response.data.data.currentCompanyName,
//                     user: response.data.data.user,
//                     theme: response.data.data.theme,
//                     isAdminOrSupervisor: response.data.data.isAdminOrSupervisor
//                 });
//             } else {
//                 throw new Error(response.data.error || 'Failed to fetch units');
//             }
//         } catch (err) {
//             setError(err.message);
//             handleApiError(err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleApiError = (error) => {
//         let errorMessage = 'An error occurred';

//         if (error.response) {
//             switch (error.response.status) {
//                 case 400:
//                     if (error.response.data.error === 'No fiscal year found in session or company.') {
//                         navigate('/select-fiscal-year');
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
//                 case 409:
//                     errorMessage = error.response.data.error || 'Unit already exists';
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

//     const handleEdit = (unit) => {
//         setCurrentUnit(unit);
//         setFormData({
//             name: unit.name,
//         });
//     };

//     const handleSelectUnit = (unit) => {
//         setFormData({
//             name: unit.name,
//         });
//     };

//     const handleCancel = () => {
//         setCurrentUnit(null);
//         setFormData({
//             name: '',
//         });
//     };

//     const handleDelete = async (id) => {
//         if (window.confirm('Are you sure you want to delete this unit?')) {
//             try {
//                 const response = await api.delete(`/api/retailer/units/${id}`);

//                 if (response.data.success) {
//                     showNotificationMessage('Unit deleted successfully', 'success');
//                     fetchUnits();
//                 } else {
//                     showNotificationMessage(response.data.error || 'Failed to delete unit', 'error');
//                 }
//             } catch (err) {
//                 if (err.response && err.response.status === 409) {
//                     showNotificationMessage(err.response.data.error || 'Unit cannot be deleted as it is being used by items', 'error');
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

//     const handleSubmit = async (e) => {
//         if (e) {
//             e.preventDefault();
//         }
//         setIsSaving(true);
//         try {
//             if (currentUnit) {
//                 await api.put(`/api/retailer/units/${currentUnit._id}`, formData);
//                 showNotificationMessage('Unit updated successfully!', 'success');
//                 handleCancel();
//             } else {
//                 await api.post('/api/retailer/units', formData);
//                 showNotificationMessage('Unit created successfully!', 'success');
//                 setFormData({ name: '' });
//             }
//             fetchUnits();
//         } catch (err) {
//             handleApiError(err);
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const printUnits = () => {
//         const unitsToPrint = printOption === 'all'
//             ? data.units
//             : data.units.filter(unit => unit.status === 'active');

//         if (unitsToPrint.length === 0) {
//             alert("No units to print");
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
//                 .badge-success { 
//                     background-color: #28a745; 
//                     color: white; 
//                 }
//                 .badge-danger { 
//                     background-color: #dc3545; 
//                     color: white; 
//                 }
//                 .badge-info { 
//                     background-color: #17a2b8; 
//                     color: white; 
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
            
//             <div class="report-title">Units Report</div>
            
//             <div class="header-info">
//                 <strong>Fiscal Year:</strong> ${data.currentFiscalYear?.name || 'N/A'} | 
//                 <strong>Total Units:</strong> ${unitsToPrint.length}
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
//                         <th class="nowrap">Unit Name</th>
//                         <th class="nowrap">Status</th>
//                         <th class="nowrap">Type</th>
//                         <th class="nowrap">Item Count</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//         `;

//         unitsToPrint.forEach((unit, index) => {
//             const isBaseUnit = unit.isBaseUnit;
//             tableContent += `
//                 <tr>
//                     <td class="nowrap">${index + 1}</td>
//                     <td class="nowrap">${unit.name || 'N/A'}</td>
//                     <td class="nowrap">
//                         <span class="nowrap badge ${unit.status === 'active' ? 'badge-success' : 'badge-danger'}">
//                             ${unit.status || 'N/A'}
//                         </span>
//                     </td>
//                     <td class="nowrap">
//                         <span class="nowrap badge ${isBaseUnit ? 'badge-info' : ''}">
//                             ${isBaseUnit ? 'Base Unit' : 'Regular'}
//                         </span>
//                     </td>
//                     <td class="nowrap">
//                         <span class="nowrap">
//                             ${unit.itemCount || 0}
//                         </span>
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
//                     <title>Units Report - ${data.company?.companyName || data.currentCompanyName || 'Units Report'}</title>
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
//             const unitsToExport = exportAll ? data.units : filteredUnits;

//             if (unitsToExport.length === 0) {
//                 showNotificationMessage('No units to export', 'warning');
//                 return;
//             }

//             const excelData = unitsToExport.map((unit, index) => {
//                 return {
//                     'S.N.': index + 1,
//                     'Unit Name': unit.name || 'N/A',
//                     'Status': unit.status || 'N/A',
//                     'Type': unit.isBaseUnit ? 'Base Unit' : 'Regular',
//                     'Total Items': unit.itemCount || 0,
//                     'Created': unit.createdAt ? new Date(unit.createdAt).toLocaleDateString() : '',
//                     'Last Updated': unit.updatedAt ? new Date(unit.updatedAt).toLocaleDateString() : ''
//                 };
//             });

//             const summaryData = [
//                 {},
//                 {
//                     'S.N.': 'SUMMARY',
//                     'Unit Name': 'Total Units:',
//                     'Status': unitsToExport.length
//                 },
//                 {
//                     'S.N.': '',
//                     'Unit Name': 'Active Units:',
//                     'Status': unitsToExport.filter(unit => unit.status === 'active').length
//                 },
//                 {
//                     'S.N.': '',
//                     'Unit Name': 'Base Units:',
//                     'Status': unitsToExport.filter(unit => unit.isBaseUnit).length
//                 }
//             ];

//             const wb = XLSX.utils.book_new();
//             const ws = XLSX.utils.json_to_sheet(excelData);

//             ws['!cols'] = [
//                 { wch: 6 },
//                 { wch: Math.min(unitsToExport.reduce((w, r) => Math.max(w, r['Unit Name']?.length || 0), 10), 50) },
//                 { wch: 10 },
//                 { wch: 10 },
//                 { wch: 12 },
//                 { wch: 12 },
//                 { wch: 12 }
//             ];

//             XLSX.utils.book_append_sheet(wb, ws, 'Units');

//             const wsSummary = XLSX.utils.json_to_sheet(summaryData);
//             XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

//             const date = new Date().toISOString().split('T')[0];
//             const filterInfo = exportAll ? 'All' : 'Filtered';
//             const fileName = `Units_Report_${filterInfo}_${date}.xlsx`;

//             XLSX.writeFile(wb, fileName);

//             showNotificationMessage(
//                 `${exportAll ? 'All' : 'Filtered'} units (${unitsToExport.length}) exported successfully!`,
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
            
//             {error ? (
//                 <div className="alert alert-danger mt-2">
//                     Error loading units: {error}
//                     <Button variant="secondary" onClick={fetchUnits} className="ms-3">
//                         Retry
//                     </Button>
//                 </div>
//             ) : (
//                 <div className="card mt-2">
//                     <div className="row g-3">
//                         {/* Left Column - Add Unit Form */}
//                         <div className="col-lg-6">
//                             <div className="card h-100 shadow-lg">
//                                 <div className="card-body">
//                                     <h3 className="text-center" style={{ textDecoration: 'underline' }}>
//                                         {currentUnit ? `Edit Unit: ${currentUnit.name}` : 'Create Unit'}
//                                     </h3>
//                                     <Form onSubmit={handleSubmit} id="addUnitForm" style={{ marginTop: '5px' }}>
//                                         <Form.Group style={{ marginBottom: '12px' }}>
//                                             <div className="position-relative">
//                                                 <Form.Control
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
//                                                     Unit Name <span className="text-danger">*</span>
//                                                 </label>
//                                             </div>
//                                         </Form.Group>

//                                         <div className="d-flex justify-content-between align-items-center">
//                                             {currentUnit ? (
//                                                 <Button
//                                                     variant="secondary"
//                                                     onClick={handleCancel}
//                                                     disabled={isSaving}
//                                                     className="d-flex align-items-center"
//                                                     style={{
//                                                         height: '28px',
//                                                         padding: '0 12px',
//                                                         fontSize: '0.8rem',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     <FiX className="me-1" size={14} />
//                                                     Cancel
//                                                 </Button>
//                                             ) : (
//                                                 <div></div>
//                                             )}
//                                             <div className="d-flex align-items-center">
//                                                 <Button
//                                                     variant="primary"
//                                                     type="submit"
//                                                     disabled={isSaving}
//                                                     className="d-flex align-items-center"
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             handleSubmit(e);
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '28px',
//                                                         padding: '0 16px',
//                                                         fontSize: '0.8rem',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     {isSaving ? (
//                                                         <>
//                                                             <Spinner
//                                                                 as="span"
//                                                                 animation="border"
//                                                                 size="sm"
//                                                                 role="status"
//                                                                 aria-hidden="true"
//                                                                 className="me-2"
//                                                             />
//                                                             Saving...
//                                                         </>
//                                                     ) : currentUnit ? (
//                                                         <>
//                                                             <FiCheck className="me-1" size={14} />
//                                                             Save Changes
//                                                         </>
//                                                     ) : (
//                                                         'Add Unit'
//                                                     )}
//                                                 </Button>
//                                                 <small className="ms-2 text-muted" style={{ fontSize: '0.7rem' }}>
//                                                     Alt+S to Save
//                                                 </small>
//                                             </div>
//                                         </div>
//                                     </Form>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Right Column - Existing Units */}
//                         <div className="col-lg-6">
//                             <div className="card h-100 shadow-lg">
//                                 <div className="card-body">
//                                     <h3 className="text-center" style={{ textDecoration: 'underline' }}>Existing Units</h3>

//                                     <div className="row g-1 mb-2 align-items-center">
//                                         <div className="col-auto">
//                                             <Button
//                                                 variant="primary"
//                                                 onClick={() => navigate(-1)}
//                                                 className="d-flex align-items-center p-1"
//                                                 title="Go back"
//                                                 style={{
//                                                     height: '24px',
//                                                     minWidth: '24px',
//                                                     fontSize: '0.7rem'
//                                                 }}
//                                             >
//                                                 <FiArrowLeft size={10} />
//                                                 <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Back</span>
//                                             </Button>
//                                         </div>
//                                         <div className="col-auto">
//                                             <Button
//                                                 variant="primary"
//                                                 onClick={() => setShowPrintModal(true)}
//                                                 className="d-flex align-items-center p-1"
//                                                 title="Print report"
//                                                 style={{
//                                                     height: '24px',
//                                                     minWidth: '24px',
//                                                     fontSize: '0.7rem'
//                                                 }}
//                                             >
//                                                 <FiPrinter size={10} />
//                                                 <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Print</span>
//                                             </Button>
//                                         </div>
//                                         <div className="col-auto">
//                                             <Button
//                                                 variant="success"
//                                                 onClick={() => exportToExcel(true)}
//                                                 disabled={exporting || (data.units || []).length === 0}
//                                                 title="Export all units to Excel"
//                                                 className="d-flex align-items-center p-1"
//                                                 style={{
//                                                     height: '24px',
//                                                     minWidth: '24px',
//                                                     fontSize: '0.7rem'
//                                                 }}
//                                             >
//                                                 {exporting ? (
//                                                     <Spinner animation="border" size="sm" className="me-1" style={{ width: '10px', height: '10px' }} />
//                                                 ) : (
//                                                     <i className="fas fa-file-excel" style={{ fontSize: '0.7rem' }}></i>
//                                                 )}
//                                                 <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Export</span>
//                                             </Button>
//                                         </div>
//                                         <div className="col">
//                                             <div style={{ position: 'relative' }}>
//                                                 <Form.Control
//                                                     type="text"
//                                                     placeholder=" "
//                                                     value={searchTerm}
//                                                     onChange={handleSearch}
//                                                     className="w-100"
//                                                     style={{
//                                                         height: '24px',
//                                                         fontSize: '0.75rem',
//                                                         paddingTop: '0.6rem',
//                                                         paddingLeft: '0.5rem'
//                                                     }}
//                                                 />
//                                                 <label
//                                                     className="position-absolute"
//                                                     style={{
//                                                         top: '-6px',
//                                                         left: '0.5rem',
//                                                         fontSize: '0.65rem',
//                                                         backgroundColor: 'white',
//                                                         padding: '0 0.25rem',
//                                                         color: '#6c757d',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     Search units...
//                                                 </label>
//                                             </div>
//                                         </div>
//                                         <div className="col-auto">
//                                             <Button
//                                                 variant="outline-secondary"
//                                                 size="sm"
//                                                 onClick={resetColumnWidths}
//                                                 title="Reset column widths to default"
//                                                 className="d-flex align-items-center p-1"
//                                                 style={{
//                                                     height: '24px',
//                                                     minWidth: '24px',
//                                                     fontSize: '0.7rem'
//                                                 }}
//                                             >
//                                                 <FiRefreshCw size={10} />
//                                                 <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Reset</span>
//                                             </Button>
//                                         </div>
//                                     </div>
//                                     <div style={{ height: 'calc(100vh - 300px)', width: '100%' }}>
//                                         {loading ? (
//                                             <div className="d-flex flex-column justify-content-center align-items-center h-100">
//                                                 <Spinner
//                                                     animation="border"
//                                                     variant="primary"
//                                                     size="sm"
//                                                     style={{ width: '1.5rem', height: '1.5rem' }}
//                                                 />
//                                                 <p className="mt-2 small text-muted" style={{ fontSize: '0.8rem' }}>
//                                                     Loading units...
//                                                 </p>
//                                             </div>
//                                         ) : filteredUnits.length === 0 ? (
//                                             <div className="d-flex flex-column justify-content-center align-items-center h-100">
//                                                 <i className="bi bi-rulers text-muted" style={{ fontSize: '1.5rem' }}></i>
//                                                 <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
//                                                     No units found
//                                                 </h6>
//                                                 <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
//                                                     {searchTerm ? 'Try a different search term' : 'Create your first unit using the form'}
//                                                 </p>
//                                             </div>
//                                         ) : (
//                                             <AutoSizer>
//                                                 {({ height, width }) => {
//                                                     const totalWidth = 50 + columnWidths.name + columnWidths.actions;

//                                                     return (
//                                                         <div style={{
//                                                             position: 'relative',
//                                                             height: height,
//                                                             width: Math.max(width, totalWidth),
//                                                             overflowX: 'auto'
//                                                         }}>
//                                                             <TableHeader />
//                                                             <List
//                                                                 height={height - 60}
//                                                                 itemCount={filteredUnits.length}
//                                                                 itemSize={26}
//                                                                 width={Math.max(width, totalWidth)}
//                                                                 itemData={{
//                                                                     units: filteredUnits,
//                                                                     isAdminOrSupervisor: data.isAdminOrSupervisor
//                                                                 }}
//                                                             >
//                                                                 {TableRow}
//                                                             </List>
//                                                             <div className="mt-2 text-muted small">
//                                                                 Showing {filteredUnits.length} of {(data.units || []).length} units
//                                                                 {searchTerm && ` (filtered)`}
//                                                             </div>
//                                                         </div>
//                                                     );
//                                                 }}
//                                             </AutoSizer>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

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
//                             <span className="fw-bold fs-6">Print Units Report</span>
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
//                                 All Units
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
//                                     <div className="text-muted small">Total Units</div>
//                                     <div className="fw-bold h5">{(data.units || []).length}</div>
//                                 </div>
//                                 <div className="col-4">
//                                     <div className="text-muted small">Active</div>
//                                     <div className="fw-bold h5 text-success">
//                                         {(data.units || []).filter(unit => unit.status === 'active').length}
//                                     </div>
//                                 </div>
//                                 <div className="col-4">
//                                     <div className="text-muted small">Base Units</div>
//                                     <div className="fw-bold h5 text-info">
//                                         {(data.units || []).filter(unit => unit.isBaseUnit).length}
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
//                                             ? 'Active units only'
//                                             : 'All units'
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
//                                     printUnits();
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
//                     <p>Are you sure you want to save this unit?</p>
//                     {currentUnit && (
//                         <div className="alert alert-warning small">
//                             <i className="bi bi-exclamation-triangle me-1"></i>
//                             This will update the existing unit: <strong>{currentUnit.name}</strong>
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
//                         {currentUnit ? 'Update Unit' : 'Create Unit'}
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

// export default Units;

//-------------------------------------------------------------------------------end

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiPrinter, FiArrowLeft, FiX, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Badge from 'react-bootstrap/Badge';
import Spinner from 'react-bootstrap/Spinner';
import Modal from 'react-bootstrap/Modal';
import Header from '../retailer/Header';
import NotificationToast from '../NotificationToast';
import ProductModal from './dashboard/modals/ProductModal';
import * as XLSX from 'xlsx';

const Units = () => {
    const [exporting, setExporting] = useState(false);
    const navigate = useNavigate();
    const [data, setData] = useState({
        units: [],
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
    const [currentUnit, setCurrentUnit] = useState(null);
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

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        name: 200,
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

    const showNotificationMessage = (message, type) => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    useEffect(() => {
        fetchUnits();
    }, []);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('unitsTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('unitsTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                setShowSaveConfirmModal(true);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const form = e.target.form;
                if (form) {
                    const index = Array.prototype.indexOf.call(form, e.target);
                    if (index < form.length - 1) {
                        form.elements[index + 1].focus();
                    }
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Shallow equal function for memoization
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

    // Filtered units with memoization
    const filteredUnits = useMemo(() => {
        return (data.units || [])
            .filter(unit =>
                unit?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [data.units, searchTerm]);

    // Resizable Table Header Component
    const TableHeader = React.memo(() => {
        const totalWidth = 50 + columnWidths.name + columnWidths.actions;

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="d-flex bg-primary text-white sticky-top align-items-center position-relative"
                style={{
                    zIndex: 2,
                    height: '26px',
                    minWidth: `${totalWidth}px`,
                    userSelect: isResizing ? 'none' : 'auto'
                }}
                onMouseMove={(e) => {
                    if (isResizing && resizingColumn) {
                        const diff = e.clientX - startX;
                        const newWidth = Math.max(100, startWidth + diff);
                        setColumnWidths(prev => ({
                            ...prev,
                            [resizingColumn]: newWidth
                        }));
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
                {/* S.N. */}
                <div
                    className="d-flex align-items-center justify-content-center px-2 border-end border-white"
                    style={{
                        width: '50px',
                        flexShrink: 0
                    }}
                >
                    <strong style={{ fontSize: '0.8rem' }}>S.N.</strong>
                </div>

                {/* Unit Name */}
                <div
                    className="d-flex align-items-center ps-2 border-end border-white position-relative"
                    style={{
                        width: `${columnWidths.name}px`,
                        flexShrink: 0,
                        minWidth: '100px'
                    }}
                >
                    <strong style={{ fontSize: '0.8rem' }}>Unit Name</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.name - 2}
                        columnName="name"
                    />
                </div>

                {/* Actions */}
                <div
                    className="d-flex align-items-center justify-content-end px-2"
                    style={{
                        width: `${columnWidths.actions}px`,
                        flexShrink: 0,
                        minWidth: '120px'
                    }}
                >
                    <strong style={{ fontSize: '0.8rem' }}>Actions</strong>
                </div>

                {/* Resizing indicator overlay */}
                {isResizing && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1000,
                            cursor: 'col-resize'
                        }}
                    />
                )}
            </div>
        );
    });

    // Table Row Component
    const TableRow = React.memo(({ index, style, data }) => {
        const { units, isAdminOrSupervisor } = data;
        const unit = units[index];

        const handleEditClick = useCallback(() => unit && handleEdit(unit), [unit]);
        const handleDeleteClick = useCallback(() => {
            // Use id instead of _id for ASP.NET
            const unitId = unit.id || unit._id;
            if (unitId) handleDelete(unitId);
        }, [unit]);
        const handleSelect = useCallback(() => unit && handleSelectUnit(unit), [unit]);

        if (!unit) return null;

        // Use id instead of _id for ASP.NET
        const unitId = unit.id || unit._id;
        const unitName = unit.name || 'N/A';
        const isActive = unit.status === 'active';

        return (
            <div
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    height: '26px',
                    minHeight: '26px',
                    padding: '0',
                    borderBottom: '1px solid #dee2e6',
                    cursor: 'pointer',
                }}
                className={index % 1 === 0 ? 'bg-light' : 'bg-white'}
            >
                {/* S.N. */}
                <div
                    className="d-flex align-items-center justify-content-center px-0 border-end"
                    style={{
                        width: '50px',
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {index + 1}
                    </span>
                </div>

                {/* Unit Name */}
                <div
                    className="d-flex align-items-center ps-2 border-end"
                    style={{
                        width: `${columnWidths.name}px`,
                        flexShrink: 0,
                        height: '100%',
                        overflow: 'hidden'
                    }}
                    title={`${unitName}`}
                >
                    <div className="d-flex flex-column justify-content-center" style={{ height: '100%', minWidth: 0 }}>
                        <div className="d-flex align-items-center">
                            <span
                                style={{
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: 'block',
                                    maxWidth: '100%'
                                }}
                            >
                                {unitName}
                            </span>
                            {isActive && (
                                <Badge bg="success" className="ms-2" style={{
                                    fontSize: '0.6rem',
                                    padding: '1px 4px'
                                }}>
                                    Active
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div
                    className="px-2 d-flex align-items-center justify-content-end gap-1"
                    style={{
                        width: `${columnWidths.actions}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    {isAdminOrSupervisor && (
                        <>
                            <Button
                                variant="outline-warning"
                                size="sm"
                                className="p-0 d-flex align-items-center justify-content-center"
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    minWidth: '24px'
                                }}
                                onClick={handleEditClick}
                                title={`Edit ${unitName}`}
                                disabled={!!currentUnit}
                            >
                                <FiEdit2 size={12} />
                            </Button>
                            <Button
                                variant="outline-danger"
                                size="sm"
                                className="p-0 d-flex align-items-center justify-content-center"
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    minWidth: '24px'
                                }}
                                onClick={handleDeleteClick}
                                title={`Delete ${unitName}`}
                                disabled={!!currentUnit}
                            >
                                <FiTrash2 size={12} />
                            </Button>
                        </>
                    )}

                    <Button
                        variant="outline-success"
                        size="sm"
                        className="p-0 d-flex align-items-center justify-content-center"
                        style={{
                            width: '24px',
                            height: '24px',
                            minWidth: '24px'
                        }}
                        onClick={handleSelect}
                        title={`Select ${unitName}`}
                    >
                        <FiCheck size={12} />
                    </Button>
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
        if (prevProps.style !== nextProps.style) return false;

        const prevUnit = prevProps.data.units[prevProps.index];
        const nextUnit = nextProps.data.units[nextProps.index];

        return (
            shallowEqual(prevUnit, nextUnit) &&
            prevProps.data.isAdminOrSupervisor === nextProps.data.isAdminOrSupervisor
        );
    });

    // Resize Handle Component
    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => {
        return (
            <div
                className="resize-handle"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: `${left}px`,
                    width: '5px',
                    height: '100%',
                    cursor: 'col-resize',
                    backgroundColor: 'transparent',
                    zIndex: 10,
                    userSelect: 'none'
                }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    onResizeStart(e, columnName);
                }}
            />
        );
    });

    // Reset column widths
    const resetColumnWidths = () => {
        setColumnWidths({
            name: 200,
            actions: 140
        });
        showNotificationMessage('Column widths reset to default', 'success');
    };

    const fetchUnits = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/retailer/units');

            if (response.data.redirectTo) {
                navigate(response.data.redirectTo);
                return;
            }

            if (response.data.success) {
                const apiData = response.data.data;
                setData({
                    units: apiData.units || [],
                    company: apiData.company || null,
                    currentFiscalYear: apiData.currentFiscalYear || null,
                    companyId: apiData.companyId || '',
                    currentCompanyName: apiData.currentCompanyName || '',
                    user: apiData.user || null,
                    theme: apiData.theme || 'light',
                    isAdminOrSupervisor: apiData.isAdminOrSupervisor || false
                });
            } else {
                throw new Error(response.data.error || 'Failed to fetch units');
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
            console.log('Error response:', error.response);
            switch (error.response.status) {
                case 400:
                    if (error.response.data.error === 'No fiscal year found for company') {
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
                    errorMessage = error.response.data.error || 'Unit already exists or cannot be deleted';
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

    const handleEdit = (unit) => {
        setCurrentUnit(unit);
        setFormData({
            name: unit.name,
        });
    };

    const handleSelectUnit = (unit) => {
        setFormData({
            name: unit.name,
        });
    };

    const handleCancel = () => {
        setCurrentUnit(null);
        setFormData({
            name: '',
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this unit?')) {
            try {
                const response = await api.delete(`/api/retailer/units/${id}`);

                if (response.data.success) {
                    showNotificationMessage('Unit deleted successfully', 'success');
                    fetchUnits();
                } else {
                    showNotificationMessage(response.data.error || 'Failed to delete unit', 'error');
                }
            } catch (err) {
                if (err.response && err.response.status === 409) {
                    showNotificationMessage(err.response.data.error || 'Unit cannot be deleted as it is being used by items', 'error');
                } else {
                    handleApiError(err);
                }
            }
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (name === 'name') {
            setSearchTerm(value.toLowerCase());
        }
    };

    const handleEnterKey = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission

            // Get the submit button reference
            const submitButton = document.getElementById('submitUnitButton');

            // If button exists, focus on it
            if (submitButton) {
                submitButton.focus();
            }
        }
    };

    const handleSubmit = async (e) => {
        if (e) {
            e.preventDefault();
        }

        // Validate form
        if (!formData.name.trim()) {
            showNotificationMessage('Unit name is required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            if (currentUnit) {
                // Update existing unit
                const updateData = {
                    name: formData.name
                };
                const response = await api.put(`/api/retailer/units/${currentUnit.id || currentUnit._id}`, updateData);

                if (response.data.success) {
                    showNotificationMessage('Unit updated successfully!', 'success');
                    handleCancel();
                } else {
                    throw new Error(response.data.error || 'Failed to update unit');
                }
            } else {
                // Create new unit
                const response = await api.post('/api/retailer/units', { name: formData.name });

                if (response.data.success) {
                    showNotificationMessage('Unit created successfully!', 'success');
                    setFormData({
                        name: '',
                    });
                } else {
                    throw new Error(response.data.error || 'Failed to create unit');
                }
            }
            fetchUnits();
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsSaving(false);
        }
    };

    const printUnits = () => {
        const unitsToPrint = printOption === 'all'
            ? data.units
            : data.units.filter(unit => unit.status === 'active');

        if (unitsToPrint.length === 0) {
            alert("No units to print");
            return;
        }

        const printWindow = window.open("", "_blank");

        const printHeader = `
            <div class="print-header">
                <h1>${data.company?.companyName || data.currentCompanyName || 'Company Name'}</h1>
                <hr>
            </div>
        `;

        let tableContent = `
            <style>
                @page {
                    size: A4 landscape;
                    margin: 10mm;
                }
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 10px; 
                    margin: 0;
                    padding: 10mm;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    page-break-inside: auto;
                }
                tr { 
                    page-break-inside: avoid; 
                    page-break-after: auto; 
                }
                th, td { 
                    border: 1px solid #000; 
                    padding: 4px; 
                    text-align: left; 
                    white-space: nowrap;
                }
                th { 
                    background-color: #f2f2f2 !important; 
                    -webkit-print-color-adjust: exact; 
                }
                .print-header { 
                    text-align: center; 
                    margin-bottom: 15px; 
                }
                .nowrap {
                    white-space: nowrap;
                }
                .badge { 
                    padding: 3px 6px; 
                    border-radius: 3px; 
                    font-size: 10px; 
                    display: inline-block;
                }
                .badge-success { 
                    background-color: #28a745; 
                    color: white; 
                }
                .footer-note {
                    margin-top: 20px; 
                    font-size: 0.9em; 
                    color: #666;
                    text-align: center;
                }
                .header-info {
                    text-align: center;
                    margin-bottom: 10px;
                    font-size: 11px;
                }
                .report-title {
                    text-align: center;
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 5px;
                    text-decoration: underline;
                }
                .filter-info {
                    text-align: center;
                    font-size: 11px;
                    margin-bottom: 15px;
                    color: #666;
                }
            </style>
            ${printHeader}
            
            <div class="report-title">Units Report</div>
            
            <div class="header-info">
                <strong>Fiscal Year:</strong> ${data.currentFiscalYear?.name || 'N/A'} | 
                <strong>Total Units:</strong> ${unitsToPrint.length}
            </div>
            
            <div class="filter-info">
                ${printOption !== 'all' ?
                `<strong>Filter:</strong> ${printOption.charAt(0).toUpperCase() + printOption.slice(1)} | ` : ''
            }
                <strong>Printed on:</strong> ${new Date().toLocaleDateString()}
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th class="nowrap">S.N.</th>
                        <th class="nowrap">Unit Name</th>
                        <th class="nowrap">Status</th>
                        <th class="nowrap">Unique Number</th>
                        <th class="nowrap">Created Date</th>
                    </tr>
                </thead>
                <tbody>
        `;

        unitsToPrint.forEach((unit, index) => {
            tableContent += `
                <tr>
                    <td class="nowrap">${index + 1}</td>
                    <td class="nowrap">${unit.name || 'N/A'}</td>
                    <td class="nowrap">
                        <span class="nowrap badge ${unit.status === 'active' ? 'badge-success' : ''}">
                            ${unit.status || 'N/A'}
                        </span>
                    </td>
                    <td class="nowrap">
                        ${unit.uniqueNumber || 'N/A'}
                    </td>
                    <td class="nowrap">
                        ${unit.createdAt ? new Date(unit.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                </tr>
            `;
        });

        tableContent += `
                </tbody>
            </table>
            
            <div class="footer-note">
                <br>
                ${data.company?.companyName ? `© ${new Date().getFullYear()} ${data.company.companyName}` : ''}
            </div>
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Units Report - ${data.company?.companyName || data.currentCompanyName || 'Units Report'}</title>
                </head>
                <body>
                    ${tableContent}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.onafterprint = function() {
                                    window.close();
                                };
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
            const unitsToExport = exportAll ? data.units : filteredUnits;

            if (unitsToExport.length === 0) {
                showNotificationMessage('No units to export', 'warning');
                return;
            }

            const excelData = unitsToExport.map((unit, index) => {
                return {
                    'S.N.': index + 1,
                    'Unit Name': unit.name || 'N/A',
                    'Status': unit.status || 'N/A',
                    'Unique Number': unit.uniqueNumber || '',
                    'Created': unit.createdAt ? new Date(unit.createdAt).toLocaleDateString() : '',
                    'Last Updated': unit.updatedAt ? new Date(unit.updatedAt).toLocaleDateString() : ''
                };
            });

            const summaryData = [
                {},
                {
                    'S.N.': 'SUMMARY',
                    'Unit Name': 'Total Units:',
                    'Status': unitsToExport.length
                },
                {
                    'S.N.': '',
                    'Unit Name': 'Active Units:',
                    'Status': unitsToExport.filter(unit => unit.status === 'active').length
                }
            ];

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);

            ws['!cols'] = [
                { wch: 6 },
                { wch: Math.min(unitsToExport.reduce((w, r) => Math.max(w, r['Unit Name']?.length || 0), 10), 50) },
                { wch: 10 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Units');

            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            const date = new Date().toISOString().split('T')[0];
            const filterInfo = exportAll ? 'All' : 'Filtered';
            const fileName = `Units_Report_${filterInfo}_${date}.xlsx`;

            XLSX.writeFile(wb, fileName);

            showNotificationMessage(
                `${exportAll ? 'All' : 'Filtered'} units (${unitsToExport.length}) exported successfully!`,
                'success'
            );

        } catch (err) {
            console.error('Error exporting to Excel:', err);
            showNotificationMessage('Failed to export to Excel', 'error');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="container-fluid">
            <Header />
            <NotificationToast
                message={notificationMessage}
                type={notificationType}
                show={showNotification}
                onClose={() => setShowNotification(false)}
            />
            
            <div className="card mt-2">
                <div className="row g-3">
                    {/* Left Column - Add Unit Form */}
                    <div className="col-lg-6">
                        <div className="card h-100 shadow-lg">
                            <div className="card-body">
                                <h3 className="text-center" style={{ textDecoration: 'underline' }}>
                                    {currentUnit ? `Edit Unit: ${currentUnit.name}` : 'Create Unit'}
                                </h3>
                                <Form onSubmit={handleSubmit} id="addUnitForm" style={{ marginTop: '5px' }}>
                                    <Form.Group style={{ marginBottom: '12px' }}>
                                        <div className="position-relative">
                                            <Form.Control
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleFormChange}
                                                onKeyDown={handleEnterKey}
                                                placeholder=" "
                                                required
                                                autoFocus
                                                autoComplete="off"
                                                style={{
                                                    height: '30px',
                                                    fontSize: '0.875rem',
                                                    paddingTop: '0.75rem'
                                                }}
                                            />
                                            <label
                                                className="position-absolute"
                                                style={{
                                                    top: '-8px',
                                                    left: '0.75rem',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: 'white',
                                                    padding: '0 0.25rem',
                                                    color: '#6c757d',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Unit Name <span className="text-danger">*</span>
                                            </label>
                                        </div>
                                    </Form.Group>

                                    <div className="d-flex justify-content-between align-items-center">
                                        {currentUnit ? (
                                            <Button
                                                variant="secondary"
                                                onClick={handleCancel}
                                                disabled={isSaving}
                                                className="d-flex align-items-center"
                                                style={{
                                                    height: '28px',
                                                    padding: '0 12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                <FiX className="me-1" size={14} />
                                                Cancel
                                            </Button>
                                        ) : (
                                            <div></div>
                                        )}
                                        <div className="d-flex align-items-center">
                                            <Button
                                                id="submitUnitButton"
                                                variant="primary"
                                                type="submit"
                                                disabled={isSaving}
                                                className="d-flex align-items-center"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleSubmit(e);
                                                    }
                                                }}
                                                style={{
                                                    height: '28px',
                                                    padding: '0 16px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <Spinner
                                                            as="span"
                                                            animation="border"
                                                            size="sm"
                                                            role="status"
                                                            aria-hidden="true"
                                                            className="me-2"
                                                        />
                                                        Saving...
                                                    </>
                                                ) : currentUnit ? (
                                                    <>
                                                        <FiCheck className="me-1" size={14} />
                                                        Save Changes
                                                    </>
                                                ) : (
                                                    'Add Unit'
                                                )}
                                            </Button>
                                            <small className="ms-2 text-muted" style={{ fontSize: '0.7rem' }}>
                                                Alt+S to Save
                                            </small>
                                        </div>
                                    </div>
                                </Form>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Existing Units */}
                    <div className="col-lg-6">
                        <div className="card h-100 shadow-lg">
                            <div className="card-body">
                                <h3 className="text-center" style={{ textDecoration: 'underline' }}>Existing Units</h3>

                                <div className="row g-1 mb-2 align-items-center">
                                    <div className="col-auto">
                                        <Button
                                            variant="primary"
                                            onClick={() => navigate(-1)}
                                            className="d-flex align-items-center p-1"
                                            title="Go back"
                                            style={{
                                                height: '24px',
                                                minWidth: '24px',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            <FiArrowLeft size={10} />
                                            <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Back</span>
                                        </Button>
                                    </div>
                                    <div className="col-auto">
                                        <Button
                                            variant="primary"
                                            onClick={() => setShowPrintModal(true)}
                                            className="d-flex align-items-center p-1"
                                            title="Print report"
                                            style={{
                                                height: '24px',
                                                minWidth: '24px',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            <FiPrinter size={10} />
                                            <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Print</span>
                                        </Button>
                                    </div>
                                    <div className="col-auto">
                                        <Button
                                            variant="success"
                                            onClick={() => exportToExcel(true)}
                                            disabled={exporting || (data.units || []).length === 0}
                                            title="Export all units to Excel"
                                            className="d-flex align-items-center p-1"
                                            style={{
                                                height: '24px',
                                                minWidth: '24px',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            {exporting ? (
                                                <Spinner animation="border" size="sm" className="me-1" style={{ width: '10px', height: '10px' }} />
                                            ) : (
                                                <i className="fas fa-file-excel" style={{ fontSize: '0.7rem' }}></i>
                                            )}
                                            <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Export</span>
                                        </Button>
                                    </div>
                                    <div className="col">
                                        <div style={{ position: 'relative' }}>
                                            <Form.Control
                                                type="text"
                                                placeholder=" "
                                                value={searchTerm}
                                                onChange={handleSearch}
                                                className="w-100"
                                                style={{
                                                    height: '24px',
                                                    fontSize: '0.75rem',
                                                    paddingTop: '0.6rem',
                                                    paddingLeft: '0.5rem'
                                                }}
                                            />
                                            <label
                                                className="position-absolute"
                                                style={{
                                                    top: '-6px',
                                                    left: '0.5rem',
                                                    fontSize: '0.65rem',
                                                    backgroundColor: 'white',
                                                    padding: '0 0.25rem',
                                                    color: '#6c757d',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Search units...
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-auto">
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            onClick={resetColumnWidths}
                                            title="Reset column widths to default"
                                            className="d-flex align-items-center p-1"
                                            style={{
                                                height: '24px',
                                                minWidth: '24px',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            <FiRefreshCw size={10} />
                                            <span className="ms-1 d-none d-sm-inline" style={{ fontSize: '0.7rem' }}>Reset</span>
                                        </Button>
                                    </div>
                                </div>
                                <div style={{ height: 'calc(100vh - 300px)', width: '100%' }}>
                                    {loading ? (
                                        <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                            <Spinner
                                                animation="border"
                                                variant="primary"
                                                size="sm"
                                                style={{ width: '1.5rem', height: '1.5rem' }}
                                            />
                                            <p className="mt-2 small text-muted" style={{ fontSize: '0.8rem' }}>
                                                Loading units...
                                            </p>
                                        </div>
                                    ) : filteredUnits.length === 0 ? (
                                        <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                            <i className="bi bi-rulers text-muted" style={{ fontSize: '1.5rem' }}></i>
                                            <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
                                                No units found
                                            </h6>
                                            <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                                {searchTerm ? 'Try a different search term' : 'Create your first unit using the form'}
                                            </p>
                                        </div>
                                    ) : (
                                        <AutoSizer>
                                            {({ height, width }) => {
                                                const totalWidth = 50 + columnWidths.name + columnWidths.actions;

                                                return (
                                                    <div style={{
                                                        position: 'relative',
                                                        height: height,
                                                        width: Math.max(width, totalWidth),
                                                        overflowX: 'auto'
                                                    }}>
                                                        <TableHeader />
                                                        <List
                                                            height={height - 60}
                                                            itemCount={filteredUnits.length}
                                                            itemSize={26}
                                                            width={Math.max(width, totalWidth)}
                                                            itemData={{
                                                                units: filteredUnits,
                                                                isAdminOrSupervisor: data.isAdminOrSupervisor
                                                            }}
                                                        >
                                                            {TableRow}
                                                        </List>
                                                        <div className="mt-2 text-muted small">
                                                            Showing {filteredUnits.length} of {(data.units || []).length} units
                                                            {searchTerm && ` (filtered)`}
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        </AutoSizer>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Options Modal */}
            <Modal
                show={showPrintModal}
                onHide={() => setShowPrintModal(false)}
                centered
                size="md"
            >
                <Modal.Header closeButton className="bg-primary text-white py-2">
                    <Modal.Title className="d-flex align-items-center">
                        <FiPrinter className="me-2" size={20} />
                        <div className="d-flex flex-column">
                            <span className="fw-bold fs-6">Print Units Report</span>
                            <small className="opacity-75">Select filter options</small>
                        </div>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-3">
                    <div className="mb-3">
                        <h6 className="fw-bold mb-2 text-primary">Filter Options</h6>
                        <div className="d-flex gap-2 mb-3">
                            <Button
                                variant={printOption === 'all' ? 'primary' : 'outline-primary'}
                                onClick={() => setPrintOption('all')}
                                size="sm"
                            >
                                All Units
                            </Button>
                            <Button
                                variant={printOption === 'active' ? 'success' : 'outline-success'}
                                onClick={() => setPrintOption('active')}
                                size="sm"
                            >
                                Active Only
                            </Button>
                        </div>

                        <div className="border-top pt-3 mt-3">
                            <h6 className="fw-bold mb-2 text-primary">Report Summary</h6>
                            <div className="row text-center">
                                <div className="col-4">
                                    <div className="text-muted small">Total Units</div>
                                    <div className="fw-bold h5">{(data.units || []).length}</div>
                                </div>
                                <div className="col-4">
                                    <div className="text-muted small">Active</div>
                                    <div className="fw-bold h5 text-success">
                                        {(data.units || []).filter(unit => unit.status === 'active').length}
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-muted small">Unique Numbers</div>
                                    <div className="fw-bold h5 text-info">
                                        {(data.units || []).filter(unit => unit.uniqueNumber).length}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {printOption !== 'all' && (
                            <div className="alert alert-info border small mt-3 py-2">
                                <i className="bi bi-info-circle me-2"></i>
                                <span>
                                    Filtering by: <strong>{
                                        printOption === 'active'
                                            ? 'Active units only'
                                            : 'All units'
                                    }</strong>
                                </span>
                            </div>
                        )}
                    </div>
                </Modal.Body>
                <Modal.Footer className="py-2 border-top">
                    <div className="d-flex justify-content-between w-100 align-items-center">
                        <Button
                            variant="outline-secondary"
                            onClick={() => setShowPrintModal(false)}
                            size="sm"
                            className="px-3"
                        >
                            Cancel
                        </Button>
                        <div className="d-flex gap-2">
                            <Button
                                variant="outline-primary"
                                onClick={() => {
                                    setPrintOption('all');
                                }}
                                size="sm"
                                disabled={printOption === 'all'}
                            >
                                Reset
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    printUnits();
                                    setShowPrintModal(false);
                                }}
                                size="sm"
                                className="px-4"
                            >
                                <FiPrinter className="me-1" />
                                Print Report
                            </Button>
                        </div>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Save Confirmation Modal */}
            <Modal show={showSaveConfirmModal} onHide={() => setShowSaveConfirmModal(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>Confirm Save</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to save this unit?</p>
                    {currentUnit && (
                        <div className="alert alert-warning small">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            This will update the existing unit: <strong>{currentUnit.name}</strong>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSaveConfirmModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={() => {
                        handleSubmit();
                        setShowSaveConfirmModal(false);
                    }}>
                        {currentUnit ? 'Update Unit' : 'Create Unit'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Product Modal */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}
        </div>
    );
};

export default Units;