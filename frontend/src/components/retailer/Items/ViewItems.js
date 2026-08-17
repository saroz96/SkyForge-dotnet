// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { Container, Card, Row, Col, ListGroup, Button, Badge, Alert } from 'react-bootstrap';
// import { FaArrowLeft, FaBarcode, FaEdit, FaBoxOpen, FaBox, FaCalendarAlt, FaTag, FaBuilding } from 'react-icons/fa';
// import axios from 'axios';
// import NotificationToast from '../../NotificationToast';

// const ViewItems = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [item, setItem] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
//     const [hasStockAvailable, setHasStockAvailable] = useState(false);
//     const [stockInfo, setStockInfo] = useState({
//         openingStock: 0,
//         openingStockValue: 0,
//         salesPrice: 0,
//         purchasePrice: 0
//     });
//     const [stockEntries, setStockEntries] = useState([]);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: false,
//     });

//     api.interceptors.request.use(config => {
//         const token = localStorage.getItem('token');
//         if (token) config.headers.Authorization = `Bearer ${token}`;
//         return config;
//     });

//     useEffect(() => {
//         const fetchItemData = async () => {
//             try {
//                 setLoading(true);
//                 const response = await api.get(`/api/retailer/items/${id}`);

//                 console.log('Full API Response:', response.data);

//                 if (!response.data.success) {
//                     throw new Error(response.data.error || 'Failed to fetch item');
//                 }

//                 const { data } = response.data;
//                 const { item: itemData, stockInfo: stockInfoData, hasStockAvailable: hasStockAvailableData, stockEntries: stockEntriesData } = data;

//                 console.log('Stock Info from API:', stockInfoData);
//                 console.log('Has Stock Available:', hasStockAvailableData);
//                 console.log('Stock Entries:', stockEntriesData);

//                 const processedItem = {
//                     _id: itemData.id,
//                     id: itemData.id,
//                     name: itemData.name || '',
//                     hscode: itemData.hscode || '',
//                     vatStatus: itemData.vatStatus || '',
//                     status: itemData.status || 'active',
//                     price: itemData.price || 0,
//                     puPrice: itemData.puPrice || 0,
//                     mainUnitName: itemData.mainUnitName,
//                     wsUnit: itemData.wsUnit || 0,
//                     unitName: itemData.unitName,
//                     openingStock: itemData.openingStock || 0,
//                     reorderLevel: itemData.reorderLevel || 0,
//                     uniqueNumber: itemData.uniqueNumber || '',
//                     barcodeNumber: itemData.barcodeNumber || '',
//                     categoryName: itemData.categoryName,
//                     itemsCompanyName: itemData.itemsCompanyName,
//                     createdAt: itemData.createdAt,
//                     updatedAt: itemData.updatedAt,
//                     compositions: itemData.compositions || [],
//                     stockEntries: itemData.stockEntries || []
//                 };

//                 setItem(processedItem);

//                 setStockInfo({
//                     openingStock: stockInfoData?.openingStock || 0,
//                     openingStockValue: stockInfoData?.openingStockValue || 0,
//                     salesPrice: stockInfoData?.salesPrice || 0,
//                     purchasePrice: stockInfoData?.purchasePrice || 0
//                 });

//                 setStockEntries(stockEntriesData || []);
//                 setHasStockAvailable(hasStockAvailableData || false);

//                 console.log('Processed Stock Info:', {
//                     openingStock: stockInfoData?.openingStock,
//                     openingStockValue: stockInfoData?.openingStockValue,
//                     salesPrice: stockInfoData?.salesPrice,
//                     purchasePrice: stockInfoData?.purchasePrice,
//                     hasStockAvailable: hasStockAvailableData,
//                     stockEntriesCount: stockEntriesData?.length || 0
//                 });

//             } catch (err) {
//                 console.error('Error fetching item:', err);
//                 setError(err.response?.data?.error || err.message || 'Failed to fetch item details');
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchItemData();
//     }, [id]);

//     const toggleItemStatus = async () => {
//         try {
//             const newStatus = item.status === 'active' ? 'inactive' : 'active';
            
//             // Check if trying to deactivate and stock is available
//             if (newStatus === 'inactive' && hasStockAvailable) {
//                 setToast({
//                     show: true,
//                     message: `Cannot deactivate item - stock is available (${stockInfo.openingStock} units). Please remove all stock first.`,
//                     type: 'warning'
//                 });
//                 return;
//             }

//             const response = await api.put(`/api/retailer/items/${item._id}`, {
//                 status: newStatus
//             });

//             if (response.data.success) {
//                 setItem(prev => ({ ...prev, status: newStatus }));
//                 setToast({
//                     show: true,
//                     message: `Item status updated to ${newStatus}`,
//                     type: 'success'
//                 });
//             } else {
//                 throw new Error(response.data.error || 'Failed to update status');
//             }
//         } catch (err) {
//             setToast({
//                 show: true,
//                 message: err.response?.data?.error || err.message || 'Failed to update status',
//                 type: 'error'
//             });
//         }
//     };

//     const handlePrintBarcode = (entry) => {
//         const printWindow = window.open('', '_blank');
//         printWindow.document.write(`
//             <html>
//             <head>
//                 <title>Barcode - ${item.name}</title>
//                 <style>
//                     @page { size: A4; margin: 0; }
//                     body { display: flex; justify-content: center; align-items: center; height: 100vh; }
//                     .barcode-container { text-align: center; padding: 20px; }
//                     .item-info { margin-top: 10px; font-size: 14px; }
//                 </style>
//             </head>
//             <body>
//                 <div class="barcode-container">
//                     <img src="/item/${item._id}/barcode/${entry.id}/70/40/code128" alt="Barcode">
//                     <div class="item-info">
//                         <div><strong>${item.name}</strong></div>
//                         <div>Batch: ${entry.batchNumber || ''}</div>
//                         <div>MRP: ${(entry.mrp || 0).toFixed(2)}</div>
//                         <div>Exp: ${entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : ''}</div>
//                     </div>
//                 </div>
//                 <script>
//                     window.onload = function() {
//                         window.print();
//                         setTimeout(() => window.close(), 500);
//                     };
//                 <\/script>
//             </body>
//             </html>
//         `);
//         printWindow.document.close();
//     };

//     // Calculate total stock from stock entries
//     const calculateTotalStock = () => {
//         if (!stockEntries || stockEntries.length === 0) return 0;
//         return stockEntries.reduce((total, entry) => total + (entry.quantity || 0), 0);
//     };

//     const totalStock = calculateTotalStock();

//     if (loading) return (
//         <Container className="mt-4">
//             <div className="text-center">
//                 <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
//                 <p className="mt-2 small">Loading item details...</p>
//             </div>
//         </Container>
//     );

//     if (error) return (
//         <Container className="mt-4">
//             <Alert variant="danger" className="small p-2">
//                 {error}
//             </Alert>
//             <Button size="sm" variant="outline-primary" onClick={() => navigate(-1)}>
//                 <FaArrowLeft className="me-1" /> Back
//             </Button>
//         </Container>
//     );

//     if (!item) return (
//         <Container className="mt-4">
//             <Alert variant="warning" className="small p-2">Item not found</Alert>
//             <Button size="sm" variant="outline-primary" onClick={() => navigate(-1)}>
//                 <FaArrowLeft className="me-1" /> Back
//             </Button>
//         </Container>
//     );

//     return (
//         <Container className="mt-3">
//             <NotificationToast
//                 show={toast.show}
//                 message={toast.message}
//                 type={toast.type}
//                 onClose={() => setToast({ ...toast, show: false })}
//             />

//             <Card className="shadow-sm p-3">
//                 <Card.Header className="text-center py-2">
//                     <h5 className="mb-0 fw-bold">Item Details</h5>
//                 </Card.Header>

//                 <Card.Body className="p-2">
//                     <Row>
//                         <Col md={4}>
//                             <h6 className="fw-bold mb-2">Basic Information</h6>
//                             <ListGroup variant="flush" className="small">
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Name:</strong> <span className="ms-2">{item.name}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>HSN:</strong> <span className="ms-2">{item.hscode || ''}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2 d-flex align-items-center">
//                                     <strong>VAT:</strong>
//                                     <Badge bg={item.vatStatus === '13' ? 'success' : 'warning'} className="ms-2 py-1">
//                                        {item.vatStatus === '13' ? '13%' : 'Exempt'}
//                                     </Badge>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Main Unit:</strong> <span className="ms-2">{item.mainUnitName || ''}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>WS Unit:</strong> <span className="ms-2">{item.wsUnit || ''}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Unit:</strong> <span className="ms-2">{item.unitName || ''}</span>
//                                 </ListGroup.Item>
//                             </ListGroup>
//                         </Col>

//                         <Col md={4}>
//                             <h6 className="fw-bold mb-2">Pricing & Stock</h6>
//                             <ListGroup variant="flush" className="small">
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Sales Price:</strong>
//                                     <span className="ms-2 text-primary fw-bold">
//                                         {stockInfo.salesPrice?.toFixed(2) || '0.00'}
//                                     </span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Purchase Price:</strong>
//                                     <span className="ms-2 text-success fw-bold">
//                                         {stockInfo.purchasePrice?.toFixed(2) || '0.00'}
//                                     </span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Op. Stock:</strong>
//                                     <span className="ms-2 fw-bold">
//                                         {stockInfo.openingStock || 0}
//                                     </span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Op. Value:</strong>
//                                     <span className="ms-2 fw-bold">
//                                         {(stockInfo.openingStockValue || 0).toFixed(2)}
//                                     </span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Reorder Qty:</strong> <span className="ms-2">{item.reorderLevel || ''} {item.unitName || ''}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Category:</strong> <span className="ms-2">{item.categoryName || ''}</span>
//                                 </ListGroup.Item>
//                             </ListGroup>
//                         </Col>

//                         <Col md={4}>
//                             <h6 className="fw-bold mb-2">Identification</h6>
//                             <ListGroup variant="flush" className="small">
//                                 <ListGroup.Item className="py-1 px-2 d-flex align-items-center">
//                                     <strong>Status:</strong>
//                                     <Badge bg={item.status === 'active' ? 'success' : 'danger'} className="ms-2 py-1">
//                                         {item.status?.toUpperCase() || 'UNKNOWN'}
//                                     </Badge>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Barcode:</strong> <span className="ms-2">{item.barcodeNumber || ''}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Code:</strong> <span className="ms-2">{item.uniqueNumber || ''}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Company:</strong> <span className="ms-2">{item.itemsCompanyName || ''}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Created:</strong> <span className="ms-2">{new Date(item.createdAt).toLocaleDateString()}</span>
//                                 </ListGroup.Item>
//                             </ListGroup>
//                         </Col>
//                     </Row>

//                     <hr className="my-3" />

//                     <Row>
//                         {/* Left Column - Compositions and Status */}
//                         <Col md={7}>
//                             <Row className="mt-3">
//                                 <Col>
//                                     <h6 className="fw-bold mb-2">Compositions</h6>
//                                     <ListGroup variant="flush" className="small">
//                                         {item.compositions && item.compositions.length > 0 ? (
//                                             item.compositions.map(comp => (
//                                                 <ListGroup.Item key={comp.id || comp._id} className="py-1 px-2">
//                                                     <Badge bg="secondary" className="me-2 py-1">
//                                                         #{comp.uniqueNumber || ''}
//                                                     </Badge>
//                                                     {comp.name}
//                                                 </ListGroup.Item>
//                                             ))
//                                         ) : (
//                                             <ListGroup.Item className="py-1 px-2 text-muted">
//                                                 No compositions assigned
//                                             </ListGroup.Item>
//                                         )}
//                                     </ListGroup>
//                                 </Col>
//                             </Row>

//                             <Row className="mt-3">
//                                 <Col>
//                                     {/* Stock Status Banner */}
//                                     <Alert 
//                                         variant={hasStockAvailable ? 'warning' : 'success'} 
//                                         className="py-2 mb-0"
//                                     >
//                                         <div className="d-flex align-items-center">
//                                             <FaBoxOpen className="me-2" />
//                                             <span>
//                                                 {hasStockAvailable ? (
//                                                     <span className="text-warning ms-1">
//                                                         Stock available ({totalStock} {item.unitName || ''}) - Cannot deactivate item
//                                                     </span>
//                                                 ) : (
//                                                     <span className="text-success ms-1">
//                                                         No stock available - Item can be deactivated
//                                                     </span>
//                                                 )}
//                                             </span>
//                                         </div>
//                                     </Alert>
//                                 </Col>
//                             </Row>

//                             <Row className="mt-3">
//                                 <Col>
//                                     <div className="d-flex justify-content-between align-items-center mb-2">
//                                         <Button
//                                             size="sm"
//                                             variant={item.status === 'active' ? 'outline-danger' : 'outline-success'}
//                                             onClick={toggleItemStatus}
//                                             className="me-2"
//                                             disabled={item.status === 'active' && hasStockAvailable}
//                                             title={item.status === 'active' && hasStockAvailable ? `Cannot deactivate - stock is available (${totalStock} units)` : ""}
//                                         >
//                                             {item.status === 'active' ? 'Deactivate' : 'Activate'}
//                                         </Button>
//                                         <div>
//                                             <Button
//                                                 size="sm"
//                                                 variant="outline-primary"
//                                                 onClick={() => navigate(-1)}
//                                             >
//                                                 <FaArrowLeft className="me-1" /> Back
//                                             </Button>
//                                         </div>
//                                     </div>
                                    
//                                     {item.status === 'inactive' && hasStockAvailable && (
//                                         <small className="text-muted d-block mb-2 text-warning">
//                                             <i className="bi bi-exclamation-triangle me-1"></i>
//                                             Item is inactive but has stock ({totalStock} units). 
//                                             You can activate it anytime.
//                                         </small>
//                                     )}
                                    
//                                     {item.status === 'inactive' && !hasStockAvailable && (
//                                         <small className="text-muted d-block mb-2 text-info">
//                                             <i className="bi bi-check-circle me-1"></i>
//                                             Item is inactive and has no stock - can be activated anytime
//                                         </small>
//                                     )}
//                                 </Col>
//                             </Row>
//                         </Col>

//                         {/* Right Column - Stock Entries Card */}
//                         <Col md={5}>
//                             {stockEntries && stockEntries.length > 0 && (
//                                 <Card className="mt-3 border-0 shadow-sm" style={{ background: '#f8f9fa' }}>
//                                     <Card.Header className="bg-primary text-white py-2">
//                                         <div className="d-flex align-items-center justify-content-between">
//                                             <h6 className="mb-0 fw-bold">
//                                                 <FaBox className="me-2" />
//                                                 Stock Entries
//                                             </h6>
//                                             <Badge bg="light" text="dark" className="fw-bold">
//                                                 {stockEntries.length} entries
//                                             </Badge>
//                                         </div>
//                                     </Card.Header>
//                                     <Card.Body className="p-0">
//                                         <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
//                                             <table className="table table-sm table-hover mb-0">
//                                                 <thead className="table-light sticky-top">
//                                                     <tr>
//                                                         <th className="px-2 py-1">Batch</th>
//                                                         <th className="px-2 py-1 text-end">Qty</th>
//                                                         <th className="px-2 py-1 text-end">MRP</th>
//                                                         <th className="px-2 py-1">Expiry</th>
//                                                         <th className="px-2 py-1 text-center">Status</th>
//                                                         <th className="px-2 py-1 text-center">Action</th>
//                                                     </tr>
//                                                 </thead>
//                                                 <tbody>
//                                                     {stockEntries.map(entry => (
//                                                         <tr key={entry.id}>
//                                                             <td className="px-2 py-1">
//                                                                 <span className="badge bg-secondary">{entry.batchNumber || 'N/A'}</span>
//                                                             </td>
//                                                             <td className="px-2 py-1 text-end fw-bold">
//                                                                 {entry.quantity || 0}
//                                                             </td>
//                                                             <td className="px-2 py-1 text-end">
//                                                                 {(entry.mrp || 0).toFixed(2)}
//                                                             </td>
//                                                             <td className="px-2 py-1">
//                                                                 <small>
//                                                                     <FaCalendarAlt className="me-1 text-muted" />
//                                                                     {entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : 'N/A'}
//                                                                 </small>
//                                                             </td>
//                                                             <td className="px-2 py-1 text-center">
//                                                                 <Badge 
//                                                                     bg={entry.expiryStatus === 'safe' ? 'success' : 
//                                                                         entry.expiryStatus === 'warning' ? 'warning' : 
//                                                                         entry.expiryStatus === 'danger' ? 'danger' : 'secondary'}
//                                                                     className="px-2 py-1"
//                                                                     style={{ fontSize: '10px' }}
//                                                                 >
//                                                                     {entry.expiryStatus || 'Unknown'}
//                                                                 </Badge>
//                                                             </td>
//                                                             <td className="px-2 py-1 text-center">
//                                                                 <Button
//                                                                     size="sm"
//                                                                     variant="outline-secondary"
//                                                                     className="py-0 px-1"
//                                                                     style={{ fontSize: '10px' }}
//                                                                     onClick={() => handlePrintBarcode(entry)}
//                                                                 >
//                                                                     <FaBarcode className="me-1" /> Print
//                                                                 </Button>
//                                                             </td>
//                                                         </tr>
//                                                     ))}
//                                                 </tbody>
//                                                 <tfoot className="table-primary">
//                                                     <tr>
//                                                         <td className="px-2 py-1"><strong>Total</strong></td>
//                                                         <td className="px-2 py-1 text-end"><strong>{totalStock}</strong></td>
//                                                         <td colSpan="4" className="px-2 py-1"></td>
//                                                     </tr>
//                                                 </tfoot>
//                                             </table>
//                                         </div>
//                                     </Card.Body>
//                                     <Card.Footer className="bg-light py-1">
//                                         <small className="text-muted">
//                                             <FaTag className="me-1" />
//                                             Total Stock: {totalStock} {item.unitName || 'units'}
//                                         </small>
//                                     </Card.Footer>
//                                 </Card>
//                             )}
//                         </Col>
//                     </Row>
//                 </Card.Body>
//             </Card>
//         </Container>
//     );
// };

// export default ViewItems;

//-------------------------------------------------------------end1

// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { FaArrowLeft, FaBarcode, FaBoxOpen, FaBox, FaCalendarAlt, FaTag, FaBuilding, FaChevronDown, FaChevronUp, FaSearch, FaTimes, FaBoxes, FaRupeeSign, FaCube, FaPrint } from 'react-icons/fa';
// import axios from 'axios';
// import NotificationToast from '../../NotificationToast';
// import './ViewItems.css';
// import Header from '../Header';

// const ViewItems = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [item, setItem] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
//     const [hasStockAvailable, setHasStockAvailable] = useState(false);
//     const [stockInfo, setStockInfo] = useState({
//         openingStock: 0,
//         openingStockValue: 0,
//         salesPrice: 0,
//         purchasePrice: 0
//     });
//     const [stockEntries, setStockEntries] = useState([]);
//     const [expandedStock, setExpandedStock] = useState(false);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: false,
//     });

//     api.interceptors.request.use(config => {
//         const token = localStorage.getItem('token');
//         if (token) config.headers.Authorization = `Bearer ${token}`;
//         return config;
//     });

//     useEffect(() => {
//         const fetchItemData = async () => {
//             try {
//                 setLoading(true);
//                 const response = await api.get(`/api/retailer/items/${id}`);

//                 if (!response.data.success) {
//                     throw new Error(response.data.error || 'Failed to fetch item');
//                 }

//                 const { data } = response.data;
//                 const { item: itemData, stockInfo: stockInfoData, hasStockAvailable: hasStockAvailableData, stockEntries: stockEntriesData } = data;

//                 const processedItem = {
//                     _id: itemData.id,
//                     id: itemData.id,
//                     name: itemData.name || '',
//                     hscode: itemData.hscode || '',
//                     vatStatus: itemData.vatStatus || '',
//                     status: itemData.status || 'active',
//                     price: itemData.price || 0,
//                     puPrice: itemData.puPrice || 0,
//                     mainUnitName: itemData.mainUnitName,
//                     wsUnit: itemData.wsUnit || 0,
//                     unitName: itemData.unitName,
//                     openingStock: itemData.openingStock || 0,
//                     reorderLevel: itemData.reorderLevel || 0,
//                     uniqueNumber: itemData.uniqueNumber || '',
//                     barcodeNumber: itemData.barcodeNumber || '',
//                     categoryName: itemData.categoryName,
//                     itemsCompanyName: itemData.itemsCompanyName,
//                     createdAt: itemData.createdAt,
//                     updatedAt: itemData.updatedAt,
//                     compositions: itemData.compositions || [],
//                     stockEntries: itemData.stockEntries || []
//                 };

//                 setItem(processedItem);
//                 setStockInfo({
//                     openingStock: stockInfoData?.openingStock || 0,
//                     openingStockValue: stockInfoData?.openingStockValue || 0,
//                     salesPrice: stockInfoData?.salesPrice || 0,
//                     purchasePrice: stockInfoData?.purchasePrice || 0
//                 });
//                 setStockEntries(stockEntriesData || []);
//                 setHasStockAvailable(hasStockAvailableData || false);

//             } catch (err) {
//                 console.error('Error fetching item:', err);
//                 setError(err.response?.data?.error || err.message || 'Failed to fetch item details');
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchItemData();
//     }, [id]);

//     const toggleItemStatus = async () => {
//         try {
//             const newStatus = item.status === 'active' ? 'inactive' : 'active';
            
//             if (newStatus === 'inactive' && hasStockAvailable) {
//                 setToast({
//                     show: true,
//                     message: `Cannot deactivate item - stock is available (${stockInfo.openingStock} units). Please remove all stock first.`,
//                     type: 'warning'
//                 });
//                 return;
//             }

//             const response = await api.put(`/api/retailer/items/${item._id}`, {
//                 status: newStatus
//             });

//             if (response.data.success) {
//                 setItem(prev => ({ ...prev, status: newStatus }));
//                 setToast({
//                     show: true,
//                     message: `Item status updated to ${newStatus}`,
//                     type: 'success'
//                 });
//             } else {
//                 throw new Error(response.data.error || 'Failed to update status');
//             }
//         } catch (err) {
//             setToast({
//                 show: true,
//                 message: err.response?.data?.error || err.message || 'Failed to update status',
//                 type: 'error'
//             });
//         }
//     };

//     const handlePrintBarcode = (entry) => {
//         const printWindow = window.open('', '_blank');
//         printWindow.document.write(`
//             <html>
//             <head>
//                 <title>Barcode - ${item.name}</title>
//                 <style>
//                     @page { size: A4; margin: 0; }
//                     body { display: flex; justify-content: center; align-items: center; height: 100vh; }
//                     .barcode-container { text-align: center; padding: 20px; }
//                     .item-info { margin-top: 10px; font-size: 14px; }
//                 </style>
//             </head>
//             <body>
//                 <div class="barcode-container">
//                     <img src="/item/${item._id}/barcode/${entry.id}/70/40/code128" alt="Barcode">
//                     <div class="item-info">
//                         <div><strong>${item.name}</strong></div>
//                         <div>Batch: ${entry.batchNumber || ''}</div>
//                         <div>MRP: ${(entry.mrp || 0).toFixed(2)}</div>
//                         <div>Exp: ${entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : ''}</div>
//                     </div>
//                 </div>
//                 <script>
//                     window.onload = function() {
//                         window.print();
//                         setTimeout(() => window.close(), 500);
//                     };
//                 <\/script>
//             </body>
//             </html>
//         `);
//         printWindow.document.close();
//     };

//     const calculateTotalStock = () => {
//         if (!stockEntries || stockEntries.length === 0) return 0;
//         return stockEntries.reduce((total, entry) => total + (entry.quantity || 0), 0);
//     };

//     const totalStock = calculateTotalStock();

//     const getStockStatusBadge = () => {
//         if (totalStock === 0) return { bg: 'danger', label: 'Out of Stock' };
//         if (totalStock < 10) return { bg: 'warning', label: 'Low Stock' };
//         if (totalStock < 50) return { bg: 'info', label: 'Medium Stock' };
//         return { bg: 'success', label: 'In Stock' };
//     };

//     const getExpiryStatusBadge = (status) => {
//         const statusMap = {
//             'safe': { bg: 'success', label: 'Safe' },
//             'warning': { bg: 'warning', label: 'Expiring Soon' },
//             'danger': { bg: 'danger', label: 'Expiring' },
//             'expired': { bg: 'dark', label: 'Expired' }
//         };
//         return statusMap[status] || { bg: 'secondary', label: 'Unknown' };
//     };

//     const stockStatus = getStockStatusBadge();

//     if (loading) return (
//         <div className="vi-container">
//             <div className="vi-loading">
//                 <div className="vi-spinner"></div>
//                 <p className="vi-loading-text">Loading item details...</p>
//             </div>
//         </div>
//     );

//     if (error) return (
//         <div className="vi-container">
//             <div className="vi-error">
//                 <i className="bi bi-exclamation-triangle-fill vi-error-icon"></i>
//                 <p>{error}</p>
//                 <button className="vi-btn-secondary" onClick={() => navigate(-1)}>
//                     <FaArrowLeft className="me-1" /> Back
//                 </button>
//             </div>
//         </div>
//     );

//     if (!item) return (
//         <div className="vi-container">
//             <div className="vi-error">
//                 <i className="bi bi-inbox vi-error-icon"></i>
//                 <p>Item not found</p>
//                 <button className="vi-btn-secondary" onClick={() => navigate(-1)}>
//                     <FaArrowLeft className="me-1" /> Back
//                 </button>
//             </div>
//         </div>
//     );

//     return (
//         <div className="container-fluid">
//             <NotificationToast
//                 show={toast.show}
//                 message={toast.message}
//                 type={toast.type}
//                 onClose={() => setToast({ ...toast, show: false })}
//             />
// <Header/>
//             {/* Header */}
//                         <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//             <div className="vi-header">
//                 <div className="vi-header-left">
//                     <div className="vi-header-icon">
//                         <FaBox />
//                     </div>
//                     <div>
//                         <h5 className="vi-header-title">Item Details</h5>
//                         <small className="vi-header-subtitle">
//                             {item.name} • {item.uniqueNumber || 'No Code'}
//                         </small>
//                     </div>
//                 </div>
//                 <button className="vi-header-close" onClick={() => navigate(-1)}>
//                     <FaTimes />
//                 </button>
//             </div>

//             <div className="vi-body">
//                 {/* Stats Cards */}
//                 <div className="vi-stats-row">
//                     <div className="vi-stat-card">
//                         <div className="vi-stat-card-body">
//                             <div>
//                                 <small className="vi-stat-label">Status</small>
//                                 <h5 className="vi-stat-value">
//                                     <span className={`vi-badge-status vi-badge-status--${item.status}`}>
//                                         {item.status?.toUpperCase() || 'UNKNOWN'}
//                                     </span>
//                                 </h5>
//                             </div>
//                             <div className={`vi-stat-icon vi-stat-icon--${item.status === 'active' ? 'success' : 'danger'}`}>
//                                 {item.status === 'active' ? '✓' : '✕'}
//                             </div>
//                         </div>
//                     </div>
//                     <div className="vi-stat-card">
//                         <div className="vi-stat-card-body">
//                             <div>
//                                 <small className="vi-stat-label">Total Stock</small>
//                                 <h5 className="vi-stat-value">{totalStock} {item.unitName || ''}</h5>
//                             </div>
//                             <div className="vi-stat-icon vi-stat-icon--purple">
//                                 <FaBoxes />
//                             </div>
//                         </div>
//                     </div>
//                     <div className="vi-stat-card">
//                         <div className="vi-stat-card-body">
//                             <div>
//                                 <small className="vi-stat-label">Stock Status</small>
//                                 <h5 className="vi-stat-value">
//                                     <span className={`vi-badge-stock vi-badge-stock--${stockStatus.bg}`}>
//                                         {stockStatus.label}
//                                     </span>
//                                 </h5>
//                             </div>
//                             <div className={`vi-stat-icon vi-stat-icon--${stockStatus.bg}`}>
//                                 <FaCube />
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Item Details Card */}
//                 <div className="vi-details-card">
//                     <div className="vi-details-grid">
//                         {/* Basic Information */}
//                         <div className="vi-details-section">
//                             <h6 className="vi-section-title">Basic Information</h6>
//                             <div className="vi-details-list">
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">Name</span>
//                                     <span className="vi-detail-value">{item.name}</span>
//                                 </div>
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">HSN</span>
//                                     <span className="vi-detail-value">{item.hscode || ''}</span>
//                                 </div>
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">VAT Status</span>
//                                     <span className="vi-detail-value">
//                                         <span className={`vi-badge-vat vi-badge-vat--${item.vatStatus === '13' ? 'taxable' : 'exempt'}`}>
//                                             {item.vatStatus === '13' ? '13%' : 'Exempt'}
//                                         </span>
//                                     </span>
//                                 </div>
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">Category</span>
//                                     <span className="vi-detail-value">{item.categoryName || 'N/A'}</span>
//                                 </div>
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">Company</span>
//                                     <span className="vi-detail-value">{item.itemsCompanyName || 'N/A'}</span>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Units & Pricing */}
//                         <div className="vi-details-section">
//                             <h6 className="vi-section-title">Units & Pricing</h6>
//                             <div className="vi-details-list">
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">Main Unit</span>
//                                     <span className="vi-detail-value">{item.mainUnitName || 'N/A'}</span>
//                                 </div>
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">WS Unit</span>
//                                     <span className="vi-detail-value">{item.wsUnit || 'N/A'}</span>
//                                 </div>
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">Unit</span>
//                                     <span className="vi-detail-value">{item.unitName || 'N/A'}</span>
//                                 </div>
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">Sales Price</span>
//                                     <span className="vi-detail-value vi-price">{stockInfo.salesPrice?.toFixed(2) || '0.00'}</span>
//                                 </div>
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">Purchase Price</span>
//                                     <span className="vi-detail-value vi-price">{stockInfo.purchasePrice?.toFixed(2) || '0.00'}</span>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Stock & Identification */}
//                         <div className="vi-details-section">
//                             <h6 className="vi-section-title">Stock & Identification</h6>
//                             <div className="vi-details-list">
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">Opening Stock</span>
//                                     <span className="vi-detail-value">{stockInfo.openingStock || 0}</span>
//                                 </div>
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">Stock Value</span>
//                                     <span className="vi-detail-value">{(stockInfo.openingStockValue || 0).toFixed(2)}</span>
//                                 </div>
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">Reorder Level</span>
//                                     <span className="vi-detail-value">{item.reorderLevel || 0}</span>
//                                 </div>
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">Barcode</span>
//                                     <span className="vi-detail-value vi-code">{item.barcodeNumber || 'N/A'}</span>
//                                 </div>
//                                 <div className="vi-detail-item">
//                                     <span className="vi-detail-label">Item Code</span>
//                                     <span className="vi-detail-value vi-code">{item.uniqueNumber || 'N/A'}</span>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Compositions */}
//                 {item.compositions && item.compositions.length > 0 && (
//                     <div className="vi-compositions-card">
//                         <h6 className="vi-section-title">Compositions</h6>
//                         <div className="vi-compositions-list">
//                             {item.compositions.map(comp => (
//                                 <span key={comp.id || comp._id} className="vi-composition-tag">
//                                     #{comp.uniqueNumber || ''} {comp.name}
//                                 </span>
//                             ))}
//                         </div>
//                     </div>
//                 )}

//                 {/* Stock Entries */}
//                 {stockEntries && stockEntries.length > 0 && (
//                     <div className="vi-stock-card">
//                         <div 
//                             className="vi-stock-header"
//                             onClick={() => setExpandedStock(!expandedStock)}
//                         >
//                             <div className="vi-stock-header-left">
//                                 <FaBox className="vi-stock-icon" />
//                                 <div>
//                                     <h6 className="vi-stock-title">Stock Entries</h6>
//                                     <small className="vi-stock-subtitle">
//                                         {stockEntries.length} entries • {totalStock} units total
//                                     </small>
//                                 </div>
//                             </div>
//                             <button className="vi-stock-toggle">
//                                 {expandedStock ? <FaChevronUp /> : <FaChevronDown />}
//                             </button>
//                         </div>
//                         {expandedStock && (
//                             <div className="vi-stock-body">
//                                 <div className="vi-table-wrap">
//                                     <table className="vi-table">
//                                         <thead>
//                                             <tr>
//                                                 <th>Batch</th>
//                                                 <th style={{ textAlign: 'right' }}>Qty</th>
//                                                 <th style={{ textAlign: 'right' }}>MRP</th>
//                                                 <th>Expiry</th>
//                                                 <th style={{ textAlign: 'center' }}>Status</th>
//                                                 <th style={{ textAlign: 'center' }}>Action</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {stockEntries.map(entry => {
//                                                 const expiryStatus = getExpiryStatusBadge(entry.expiryStatus);
//                                                 return (
//                                                     <tr key={entry.id}>
//                                                         <td>
//                                                             <span className="vi-batch-number">{entry.batchNumber || 'N/A'}</span>
//                                                         </td>
//                                                         <td style={{ textAlign: 'right', fontWeight: '600' }}>
//                                                             {entry.quantity || 0}
//                                                         </td>
//                                                         <td style={{ textAlign: 'right' }}>
//                                                             {(entry.mrp || 0).toFixed(2)}
//                                                         </td>
//                                                         <td>
//                                                             <small>
//                                                                 <FaCalendarAlt className="vi-calendar-icon" />
//                                                                 {entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : 'N/A'}
//                                                             </small>
//                                                         </td>
//                                                         <td style={{ textAlign: 'center' }}>
//                                                             <span className={`vi-badge-expiry vi-badge-expiry--${expiryStatus.bg}`}>
//                                                                 {expiryStatus.label}
//                                                             </span>
//                                                         </td>
//                                                         <td style={{ textAlign: 'center' }}>
//                                                             <button
//                                                                 className="vi-btn-print"
//                                                                 onClick={() => handlePrintBarcode(entry)}
//                                                             >
//                                                                 <FaPrint /> Print
//                                                             </button>
//                                                         </td>
//                                                     </tr>
//                                                 );
//                                             })}
//                                         </tbody>
//                                         <tfoot>
//                                             <tr>
//                                                 <td><strong>Total</strong></td>
//                                                 <td style={{ textAlign: 'right' }}><strong>{totalStock}</strong></td>
//                                                 <td colSpan="4"></td>
//                                             </tr>
//                                         </tfoot>
//                                     </table>
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 )}

//                 {/* Actions */}
//                 <div className="vi-actions">
//                     <div className="vi-actions-left">
//                         <button
//                             className={`vi-btn-status vi-btn-status--${item.status}`}
//                             onClick={toggleItemStatus}
//                             disabled={item.status === 'active' && hasStockAvailable}
//                             title={item.status === 'active' && hasStockAvailable ? `Cannot deactivate - stock is available (${totalStock} units)` : ""}
//                         >
//                             {item.status === 'active' ? 'Deactivate' : 'Activate'}
//                         </button>
//                         {item.status === 'inactive' && hasStockAvailable && (
//                             <small className="vi-status-hint vi-status-hint--warning">
//                                 <i className="bi bi-exclamation-triangle"></i>
//                                 Item is inactive but has stock ({totalStock} units). You can activate it anytime.
//                             </small>
//                         )}
//                         {item.status === 'inactive' && !hasStockAvailable && (
//                             <small className="vi-status-hint vi-status-hint--info">
//                                 <i className="bi bi-check-circle"></i>
//                                 Item is inactive and has no stock - can be activated anytime
//                             </small>
//                         )}
//                     </div>
//                     <button className="vi-btn-back" onClick={() => navigate(-1)}>
//                         <FaArrowLeft /> Back
//                     </button>
//                 </div>
//             </div>
//             </div>
//         </div>
//     );
// };

// export default ViewItems;

//----------------------------------------------------end2

// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { FaArrowLeft, FaBarcode, FaBoxOpen, FaBox, FaCalendarAlt, FaTag, FaBuilding, FaChevronDown, FaChevronUp, FaSearch, FaTimes, FaBoxes, FaRupeeSign, FaCube, FaPrint, FaTrash } from 'react-icons/fa';
// import axios from 'axios';
// import NotificationToast from '../../NotificationToast';
// import './ViewItems.css';
// import Header from '../Header';

// const ViewItems = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [item, setItem] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
//     const [hasStockAvailable, setHasStockAvailable] = useState(false);
//     const [stockInfo, setStockInfo] = useState({
//         openingStock: 0,
//         openingStockValue: 0,
//         salesPrice: 0,
//         purchasePrice: 0
//     });
//     const [stockEntries, setStockEntries] = useState([]);
//     const [expandedStock, setExpandedStock] = useState(false);
//     const [deletingEntryId, setDeletingEntryId] = useState(null);
//     const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
//     const [entryToDelete, setEntryToDelete] = useState(null);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: false,
//     });

//     api.interceptors.request.use(config => {
//         const token = localStorage.getItem('token');
//         if (token) config.headers.Authorization = `Bearer ${token}`;
//         return config;
//     });

//     useEffect(() => {
//         const fetchItemData = async () => {
//             try {
//                 setLoading(true);
//                 const response = await api.get(`/api/retailer/items/${id}`);

//                 if (!response.data.success) {
//                     throw new Error(response.data.error || 'Failed to fetch item');
//                 }

//                 const { data } = response.data;
//                 const { item: itemData, stockInfo: stockInfoData, hasStockAvailable: hasStockAvailableData, stockEntries: stockEntriesData } = data;

//                 const processedItem = {
//                     _id: itemData.id,
//                     id: itemData.id,
//                     name: itemData.name || '',
//                     hscode: itemData.hscode || '',
//                     vatStatus: itemData.vatStatus || '',
//                     status: itemData.status || 'active',
//                     price: itemData.price || 0,
//                     puPrice: itemData.puPrice || 0,
//                     mainUnitName: itemData.mainUnitName,
//                     wsUnit: itemData.wsUnit || 0,
//                     unitName: itemData.unitName,
//                     openingStock: itemData.openingStock || 0,
//                     reorderLevel: itemData.reorderLevel || 0,
//                     uniqueNumber: itemData.uniqueNumber || '',
//                     barcodeNumber: itemData.barcodeNumber || '',
//                     categoryName: itemData.categoryName,
//                     itemsCompanyName: itemData.itemsCompanyName,
//                     createdAt: itemData.createdAt,
//                     updatedAt: itemData.updatedAt,
//                     compositions: itemData.compositions || [],
//                     stockEntries: itemData.stockEntries || []
//                 };

//                 setItem(processedItem);
//                 setStockInfo({
//                     openingStock: stockInfoData?.openingStock || 0,
//                     openingStockValue: stockInfoData?.openingStockValue || 0,
//                     salesPrice: stockInfoData?.salesPrice || 0,
//                     purchasePrice: stockInfoData?.purchasePrice || 0
//                 });
//                 setStockEntries(stockEntriesData || []);
//                 setHasStockAvailable(hasStockAvailableData || false);

//             } catch (err) {
//                 console.error('Error fetching item:', err);
//                 setError(err.response?.data?.error || err.message || 'Failed to fetch item details');
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchItemData();
//     }, [id]);

//     const toggleItemStatus = async () => {
//         try {
//             const newStatus = item.status === 'active' ? 'inactive' : 'active';
            
//             if (newStatus === 'inactive' && hasStockAvailable) {
//                 setToast({
//                     show: true,
//                     message: `Cannot deactivate item - stock is available (${totalStock} units). Please remove all stock first.`,
//                     type: 'warning'
//                 });
//                 return;
//             }

//             const response = await api.put(`/api/retailer/items/${item._id}`, {
//                 status: newStatus
//             });

//             if (response.data.success) {
//                 setItem(prev => ({ ...prev, status: newStatus }));
//                 setToast({
//                     show: true,
//                     message: `Item status updated to ${newStatus}`,
//                     type: 'success'
//                 });
//             } else {
//                 throw new Error(response.data.error || 'Failed to update status');
//             }
//         } catch (err) {
//             setToast({
//                 show: true,
//                 message: err.response?.data?.error || err.message || 'Failed to update status',
//                 type: 'error'
//             });
//         }
//     };

//     const handlePrintBarcode = (entry) => {
//         const printWindow = window.open('', '_blank');
//         printWindow.document.write(`
//             <html>
//             <head>
//                 <title>Barcode - ${item.name}</title>
//                 <style>
//                     @page { size: A4; margin: 0; }
//                     body { display: flex; justify-content: center; align-items: center; height: 100vh; }
//                     .barcode-container { text-align: center; padding: 20px; }
//                     .item-info { margin-top: 10px; font-size: 14px; }
//                 </style>
//             </head>
//             <body>
//                 <div class="barcode-container">
//                     <img src="/item/${item._id}/barcode/${entry.id}/70/40/code128" alt="Barcode">
//                     <div class="item-info">
//                         <div><strong>${item.name}</strong></div>
//                         <div>Batch: ${entry.batchNumber || ''}</div>
//                         <div>MRP: ${(entry.mrp || 0).toFixed(2)}</div>
//                         <div>Exp: ${entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : ''}</div>
//                     </div>
//                 </div>
//                 <script>
//                     window.onload = function() {
//                         window.print();
//                         setTimeout(() => window.close(), 500);
//                     };
//                 <\/script>
//             </body>
//             </html>
//         `);
//         printWindow.document.close();
//     };

//     const handleDeleteStockEntry = async () => {
//         if (!entryToDelete) return;

//         try {
//             setDeletingEntryId(entryToDelete.id);
            
//             const response = await api.delete(`/api/retailer/stock-entries/${entryToDelete.id}`);

//             if (response.data.success) {
//                 // Remove the deleted entry from state
//                 const updatedEntries = stockEntries.filter(entry => entry.id !== entryToDelete.id);
//                 setStockEntries(updatedEntries);
                
//                 // Update hasStockAvailable based on remaining entries
//                 const hasStock = updatedEntries.some(entry => entry.quantity > 0);
//                 setHasStockAvailable(hasStock);
                
//                 // Update stock info if needed
//                 if (updatedEntries.length === 0) {
//                     setStockInfo(prev => ({
//                         ...prev,
//                         openingStock: 0,
//                         openingStockValue: 0
//                     }));
//                 }

//                 setToast({
//                     show: true,
//                     message: `Stock entry deleted successfully`,
//                     type: 'success'
//                 });
//             } else {
//                 throw new Error(response.data.error || 'Failed to delete stock entry');
//             }
//         } catch (err) {
//             setToast({
//                 show: true,
//                 message: err.response?.data?.error || err.message || 'Failed to delete stock entry',
//                 type: 'error'
//             });
//         } finally {
//             setDeletingEntryId(null);
//             setShowDeleteConfirm(false);
//             setEntryToDelete(null);
//         }
//     };

//     const confirmDelete = (entry) => {
//         setEntryToDelete(entry);
//         setShowDeleteConfirm(true);
//     };

//     const calculateTotalStock = () => {
//         if (!stockEntries || stockEntries.length === 0) return 0;
//         return stockEntries.reduce((total, entry) => total + (entry.quantity || 0), 0);
//     };

//     const totalStock = calculateTotalStock();

//     const getStockStatusBadge = () => {
//         if (totalStock === 0) return { bg: 'danger', label: 'Out of Stock' };
//         if (totalStock < 10) return { bg: 'warning', label: 'Low Stock' };
//         if (totalStock < 50) return { bg: 'info', label: 'Medium Stock' };
//         return { bg: 'success', label: 'In Stock' };
//     };

//     const getExpiryStatusBadge = (status) => {
//         const statusMap = {
//             'safe': { bg: 'success', label: 'Safe' },
//             'warning': { bg: 'warning', label: 'Expiring Soon' },
//             'danger': { bg: 'danger', label: 'Expiring' },
//             'expired': { bg: 'dark', label: 'Expired' }
//         };
//         return statusMap[status] || { bg: 'secondary', label: 'Unknown' };
//     };

//     const stockStatus = getStockStatusBadge();

//     if (loading) return (
//         <div className="vi-container">
//             <div className="vi-loading">
//                 <div className="vi-spinner"></div>
//                 <p className="vi-loading-text">Loading item details...</p>
//             </div>
//         </div>
//     );

//     if (error) return (
//         <div className="vi-container">
//             <div className="vi-error">
//                 <i className="bi bi-exclamation-triangle-fill vi-error-icon"></i>
//                 <p>{error}</p>
//                 <button className="vi-btn-secondary" onClick={() => navigate(-1)}>
//                     <FaArrowLeft className="me-1" /> Back
//                 </button>
//             </div>
//         </div>
//     );

//     if (!item) return (
//         <div className="vi-container">
//             <div className="vi-error">
//                 <i className="bi bi-inbox vi-error-icon"></i>
//                 <p>Item not found</p>
//                 <button className="vi-btn-secondary" onClick={() => navigate(-1)}>
//                     <FaArrowLeft className="me-1" /> Back
//                 </button>
//             </div>
//         </div>
//     );

//     return (
//         <div className="container-fluid">
//             <NotificationToast
//                 show={toast.show}
//                 message={toast.message}
//                 type={toast.type}
//                 onClose={() => setToast({ ...toast, show: false })}
//             />
//             <Header/>

//             {/* Delete Confirmation Modal */}
//             {showDeleteConfirm && entryToDelete && (
//                 <div className="vi-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
//                     <div className="vi-modal" onClick={(e) => e.stopPropagation()}>
//                         <div className="vi-modal-header">
//                             <h6 className="vi-modal-title">Delete Stock Entry</h6>
//                             <button className="vi-modal-close" onClick={() => setShowDeleteConfirm(false)}>
//                                 <FaTimes />
//                             </button>
//                         </div>
//                         <div className="vi-modal-body">
//                             <div className="vi-modal-icon">
//                                 <FaTrash />
//                             </div>
//                             <p className="vi-modal-text">
//                                 Are you sure you want to delete this stock entry?
//                             </p>
//                             <div className="vi-modal-details">
//                                 <div className="vi-modal-detail-item">
//                                     <span className="vi-modal-detail-label">Batch:</span>
//                                     <span className="vi-modal-detail-value">{entryToDelete.batchNumber || 'N/A'}</span>
//                                 </div>
//                                 <div className="vi-modal-detail-item">
//                                     <span className="vi-modal-detail-label">Quantity:</span>
//                                     <span className="vi-modal-detail-value">{entryToDelete.quantity || 0}</span>
//                                 </div>
//                                 <div className="vi-modal-detail-item">
//                                     <span className="vi-modal-detail-label">MRP:</span>
//                                     <span className="vi-modal-detail-value">{(entryToDelete.mrp || 0).toFixed(2)}</span>
//                                 </div>
//                                 <div className="vi-modal-detail-item">
//                                     <span className="vi-modal-detail-label">Expiry:</span>
//                                     <span className="vi-modal-detail-value">
//                                         {entryToDelete.expiryDate ? new Date(entryToDelete.expiryDate).toLocaleDateString() : 'N/A'}
//                                     </span>
//                                 </div>
//                             </div>
//                             <p className="vi-modal-warning">
//                                 <i className="bi bi-exclamation-triangle"></i>
//                                 This action cannot be undone.
//                             </p>
//                         </div>
//                         <div className="vi-modal-footer">
//                             <button 
//                                 className="vi-btn-cancel" 
//                                 onClick={() => setShowDeleteConfirm(false)}
//                             >
//                                 Cancel
//                             </button>
//                             <button 
//                                 className="vi-btn-delete" 
//                                 onClick={handleDeleteStockEntry}
//                                 disabled={deletingEntryId === entryToDelete.id}
//                             >
//                                 {deletingEntryId === entryToDelete.id ? (
//                                     <>
//                                         <span className="vi-spinner-small"></span>
//                                         Deleting...
//                                     </>
//                                 ) : (
//                                     <>
//                                         <FaTrash /> Delete
//                                     </>
//                                 )}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Header */}
//             <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                 <div className="vi-header">
//                     <div className="vi-header-left">
//                         <div className="vi-header-icon">
//                             <FaBox />
//                         </div>
//                         <div>
//                             <h5 className="vi-header-title">Item Details</h5>
//                             <small className="vi-header-subtitle">
//                                 {item.name} • {item.uniqueNumber || 'No Code'}
//                             </small>
//                         </div>
//                     </div>
//                     <button className="vi-header-close" onClick={() => navigate(-1)}>
//                         <FaTimes />
//                     </button>
//                 </div>

//                 <div className="vi-body">
//                     {/* Stats Cards */}
//                     <div className="vi-stats-row">
//                         <div className="vi-stat-card">
//                             <div className="vi-stat-card-body">
//                                 <div>
//                                     <small className="vi-stat-label">Status</small>
//                                     <h5 className="vi-stat-value">
//                                         <span className={`vi-badge-status vi-badge-status--${item.status}`}>
//                                             {item.status?.toUpperCase() || 'UNKNOWN'}
//                                         </span>
//                                     </h5>
//                                 </div>
//                                 <div className={`vi-stat-icon vi-stat-icon--${item.status === 'active' ? 'success' : 'danger'}`}>
//                                     {item.status === 'active' ? '✓' : '✕'}
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="vi-stat-card">
//                             <div className="vi-stat-card-body">
//                                 <div>
//                                     <small className="vi-stat-label">Total Stock</small>
//                                     <h5 className="vi-stat-value">{totalStock} {item.unitName || ''}</h5>
//                                 </div>
//                                 <div className="vi-stat-icon vi-stat-icon--purple">
//                                     <FaBoxes />
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="vi-stat-card">
//                             <div className="vi-stat-card-body">
//                                 <div>
//                                     <small className="vi-stat-label">Stock Status</small>
//                                     <h5 className="vi-stat-value">
//                                         <span className={`vi-badge-stock vi-badge-stock--${stockStatus.bg}`}>
//                                             {stockStatus.label}
//                                         </span>
//                                     </h5>
//                                 </div>
//                                 <div className={`vi-stat-icon vi-stat-icon--${stockStatus.bg}`}>
//                                     <FaCube />
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Item Details Card */}
//                     <div className="vi-details-card">
//                         <div className="vi-details-grid">
//                             {/* Basic Information */}
//                             <div className="vi-details-section">
//                                 <h6 className="vi-section-title">Basic Information</h6>
//                                 <div className="vi-details-list">
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Name</span>
//                                         <span className="vi-detail-value">{item.name}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">HSN</span>
//                                         <span className="vi-detail-value">{item.hscode || ''}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">VAT Status</span>
//                                         <span className="vi-detail-value">
//                                             <span className={`vi-badge-vat vi-badge-vat--${item.vatStatus === '13' ? 'taxable' : 'exempt'}`}>
//                                                 {item.vatStatus === '13' ? '13%' : 'Exempt'}
//                                             </span>
//                                         </span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Category</span>
//                                         <span className="vi-detail-value">{item.categoryName || 'N/A'}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Company</span>
//                                         <span className="vi-detail-value">{item.itemsCompanyName || 'N/A'}</span>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Units & Pricing */}
//                             <div className="vi-details-section">
//                                 <h6 className="vi-section-title">Units & Pricing</h6>
//                                 <div className="vi-details-list">
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Main Unit</span>
//                                         <span className="vi-detail-value">{item.mainUnitName || 'N/A'}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">WS Unit</span>
//                                         <span className="vi-detail-value">{item.wsUnit || 'N/A'}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Unit</span>
//                                         <span className="vi-detail-value">{item.unitName || 'N/A'}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Sales Price</span>
//                                         <span className="vi-detail-value vi-price">{stockInfo.salesPrice?.toFixed(2) || '0.00'}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Purchase Price</span>
//                                         <span className="vi-detail-value vi-price">{stockInfo.purchasePrice?.toFixed(2) || '0.00'}</span>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Stock & Identification */}
//                             <div className="vi-details-section">
//                                 <h6 className="vi-section-title">Stock & Identification</h6>
//                                 <div className="vi-details-list">
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Opening Stock</span>
//                                         <span className="vi-detail-value">{stockInfo.openingStock || 0}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Stock Value</span>
//                                         <span className="vi-detail-value">{(stockInfo.openingStockValue || 0).toFixed(2)}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Reorder Level</span>
//                                         <span className="vi-detail-value">{item.reorderLevel || 0}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Barcode</span>
//                                         <span className="vi-detail-value vi-code">{item.barcodeNumber || 'N/A'}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Item Code</span>
//                                         <span className="vi-detail-value vi-code">{item.uniqueNumber || 'N/A'}</span>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Compositions */}
//                     {item.compositions && item.compositions.length > 0 && (
//                         <div className="vi-compositions-card">
//                             <h6 className="vi-section-title">Compositions</h6>
//                             <div className="vi-compositions-list">
//                                 {item.compositions.map(comp => (
//                                     <span key={comp.id || comp._id} className="vi-composition-tag">
//                                         #{comp.uniqueNumber || ''} {comp.name}
//                                     </span>
//                                 ))}
//                             </div>
//                         </div>
//                     )}

//                     {/* Stock Entries */}
//                     {stockEntries && stockEntries.length > 0 && (
//                         <div className="vi-stock-card">
//                             <div 
//                                 className="vi-stock-header"
//                                 onClick={() => setExpandedStock(!expandedStock)}
//                             >
//                                 <div className="vi-stock-header-left">
//                                     <FaBox className="vi-stock-icon" />
//                                     <div>
//                                         <h6 className="vi-stock-title">Stock Entries</h6>
//                                         <small className="vi-stock-subtitle">
//                                             {stockEntries.length} entries • {totalStock} units total
//                                         </small>
//                                     </div>
//                                 </div>
//                                 <button className="vi-stock-toggle">
//                                     {expandedStock ? <FaChevronUp /> : <FaChevronDown />}
//                                 </button>
//                             </div>
//                             {expandedStock && (
//                                 <div className="vi-stock-body">
//                                     <div className="vi-table-wrap">
//                                         <table className="vi-table">
//                                             <thead>
//                                                 <tr>
//                                                     <th>Batch</th>
//                                                     <th style={{ textAlign: 'right' }}>Qty</th>
//                                                     <th style={{ textAlign: 'right' }}>MRP</th>
//                                                     <th>Expiry</th>
//                                                     <th style={{ textAlign: 'center' }}>Status</th>
//                                                     <th style={{ textAlign: 'center' }}>Print</th>
//                                                     <th style={{ textAlign: 'center' }}>Action</th>
//                                                 </tr>
//                                             </thead>
//                                             <tbody>
//                                                 {stockEntries.map(entry => {
//                                                     const expiryStatus = getExpiryStatusBadge(entry.expiryStatus);
//                                                     const isDeleting = deletingEntryId === entry.id;
//                                                     return (
//                                                         <tr key={entry.id} className={isDeleting ? 'vi-row-deleting' : ''}>
//                                                             <td>
//                                                                 <span className="vi-batch-number">{entry.batchNumber || 'N/A'}</span>
//                                                             </td>
//                                                             <td style={{ textAlign: 'right', fontWeight: '600' }}>
//                                                                 {entry.quantity || 0}
//                                                             </td>
//                                                             <td style={{ textAlign: 'right' }}>
//                                                                 {(entry.mrp || 0).toFixed(2)}
//                                                             </td>
//                                                             <td>
//                                                                 <small>
//                                                                     <FaCalendarAlt className="vi-calendar-icon" />
//                                                                     {entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : 'N/A'}
//                                                                 </small>
//                                                             </td>
//                                                             <td style={{ textAlign: 'center' }}>
//                                                                 <span className={`vi-badge-expiry vi-badge-expiry--${expiryStatus.bg}`}>
//                                                                     {expiryStatus.label}
//                                                                 </span>
//                                                             </td>
//                                                             <td style={{ textAlign: 'center' }}>
//                                                                 <button
//                                                                     className="vi-btn-print"
//                                                                     onClick={() => handlePrintBarcode(entry)}
//                                                                 >
//                                                                     <FaPrint /> Print
//                                                                 </button>
//                                                             </td>
//                                                             <td style={{ textAlign: 'center' }}>
//                                                                 <button
//                                                                     className="vi-btn-delete-entry"
//                                                                     onClick={() => confirmDelete(entry)}
//                                                                     disabled={isDeleting}
//                                                                     title="Delete this stock entry"
//                                                                 >
//                                                                     {isDeleting ? (
//                                                                         <span className="vi-spinner-small"></span>
//                                                                     ) : (
//                                                                         <FaTrash />
//                                                                     )}
//                                                                 </button>
//                                                             </td>
//                                                         </tr>
//                                                     );
//                                                 })}
//                                             </tbody>
//                                             <tfoot>
//                                                 <tr>
//                                                     <td><strong>Total</strong></td>
//                                                     <td style={{ textAlign: 'right' }}><strong>{totalStock}</strong></td>
//                                                     <td colSpan="5"></td>
//                                                 </tr>
//                                             </tfoot>
//                                         </table>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     )}

//                     {/* Actions */}
//                     <div className="vi-actions">
//                         <div className="vi-actions-left">
//                             <button
//                                 className={`vi-btn-status vi-btn-status--${item.status}`}
//                                 onClick={toggleItemStatus}
//                                 disabled={item.status === 'active' && hasStockAvailable}
//                                 title={item.status === 'active' && hasStockAvailable ? `Cannot deactivate - stock is available (${totalStock} units)` : ""}
//                             >
//                                 {item.status === 'active' ? 'Deactivate' : 'Activate'}
//                             </button>
//                             {item.status === 'inactive' && hasStockAvailable && (
//                                 <small className="vi-status-hint vi-status-hint--warning">
//                                     <i className="bi bi-exclamation-triangle"></i>
//                                     Item is inactive but has stock ({totalStock} units). You can activate it anytime.
//                                 </small>
//                             )}
//                             {item.status === 'inactive' && !hasStockAvailable && (
//                                 <small className="vi-status-hint vi-status-hint--info">
//                                     <i className="bi bi-check-circle"></i>
//                                     Item is inactive and has no stock - can be activated anytime
//                                 </small>
//                             )}
//                         </div>
//                         <button className="vi-btn-back" onClick={() => navigate(-1)}>
//                             <FaArrowLeft /> Back
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default ViewItems;

//-------------------------------------------------end3

// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { FaArrowLeft, FaBarcode, FaBoxOpen, FaBox, FaCalendarAlt, FaTag, FaBuilding, FaChevronDown, FaChevronUp, FaSearch, FaTimes, FaBoxes, FaRupeeSign, FaCube, FaPrint, FaTrash } from 'react-icons/fa';
// import axios from 'axios';
// import NotificationToast from '../../NotificationToast';
// import './ViewItems.css';
// import Header from '../Header';

// const ViewItems = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [item, setItem] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
//     const [hasStockAvailable, setHasStockAvailable] = useState(false);
//     const [stockInfo, setStockInfo] = useState({
//         openingStock: 0,
//         openingStockValue: 0,
//         salesPrice: 0,
//         purchasePrice: 0
//     });
//     const [stockEntries, setStockEntries] = useState([]);
//     const [expandedStock, setExpandedStock] = useState(false);
//     const [deletingEntryId, setDeletingEntryId] = useState(null);
//     const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
//     const [entryToDelete, setEntryToDelete] = useState(null);
//     const [confirmItemName, setConfirmItemName] = useState('');

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: false,
//     });

//     api.interceptors.request.use(config => {
//         const token = localStorage.getItem('token');
//         if (token) config.headers.Authorization = `Bearer ${token}`;
//         return config;
//     });

//     useEffect(() => {
//         const fetchItemData = async () => {
//             try {
//                 setLoading(true);
//                 const response = await api.get(`/api/retailer/items/${id}`);

//                 if (!response.data.success) {
//                     throw new Error(response.data.error || 'Failed to fetch item');
//                 }

//                 const { data } = response.data;
//                 const { item: itemData, stockInfo: stockInfoData, hasStockAvailable: hasStockAvailableData, stockEntries: stockEntriesData } = data;

//                 const processedItem = {
//                     _id: itemData.id,
//                     id: itemData.id,
//                     name: itemData.name || '',
//                     hscode: itemData.hscode || '',
//                     vatStatus: itemData.vatStatus || '',
//                     status: itemData.status || 'active',
//                     price: itemData.price || 0,
//                     puPrice: itemData.puPrice || 0,
//                     mainUnitName: itemData.mainUnitName,
//                     wsUnit: itemData.wsUnit || 0,
//                     unitName: itemData.unitName,
//                     openingStock: itemData.openingStock || 0,
//                     reorderLevel: itemData.reorderLevel || 0,
//                     uniqueNumber: itemData.uniqueNumber || '',
//                     barcodeNumber: itemData.barcodeNumber || '',
//                     categoryName: itemData.categoryName,
//                     itemsCompanyName: itemData.itemsCompanyName,
//                     createdAt: itemData.createdAt,
//                     updatedAt: itemData.updatedAt,
//                     compositions: itemData.compositions || [],
//                     stockEntries: itemData.stockEntries || []
//                 };

//                 setItem(processedItem);
//                 setStockInfo({
//                     openingStock: stockInfoData?.openingStock || 0,
//                     openingStockValue: stockInfoData?.openingStockValue || 0,
//                     salesPrice: stockInfoData?.salesPrice || 0,
//                     purchasePrice: stockInfoData?.purchasePrice || 0
//                 });
//                 setStockEntries(stockEntriesData || []);
//                 setHasStockAvailable(hasStockAvailableData || false);

//             } catch (err) {
//                 console.error('Error fetching item:', err);
//                 setError(err.response?.data?.error || err.message || 'Failed to fetch item details');
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchItemData();
//     }, [id]);

//     const toggleItemStatus = async () => {
//         try {
//             const newStatus = item.status === 'active' ? 'inactive' : 'active';
            
//             if (newStatus === 'inactive' && hasStockAvailable) {
//                 setToast({
//                     show: true,
//                     message: `Cannot deactivate item - stock is available (${totalStock} units). Please remove all stock first.`,
//                     type: 'warning'
//                 });
//                 return;
//             }

//             const response = await api.put(`/api/retailer/items/${item._id}`, {
//                 status: newStatus
//             });

//             if (response.data.success) {
//                 setItem(prev => ({ ...prev, status: newStatus }));
//                 setToast({
//                     show: true,
//                     message: `Item status updated to ${newStatus}`,
//                     type: 'success'
//                 });
//             } else {
//                 throw new Error(response.data.error || 'Failed to update status');
//             }
//         } catch (err) {
//             setToast({
//                 show: true,
//                 message: err.response?.data?.error || err.message || 'Failed to update status',
//                 type: 'error'
//             });
//         }
//     };

//     const handlePrintBarcode = (entry) => {
//         const printWindow = window.open('', '_blank');
//         printWindow.document.write(`
//             <html>
//             <head>
//                 <title>Barcode - ${item.name}</title>
//                 <style>
//                     @page { size: A4; margin: 0; }
//                     body { display: flex; justify-content: center; align-items: center; height: 100vh; }
//                     .barcode-container { text-align: center; padding: 20px; }
//                     .item-info { margin-top: 10px; font-size: 14px; }
//                 </style>
//             </head>
//             <body>
//                 <div class="barcode-container">
//                     <img src="/item/${item._id}/barcode/${entry.id}/70/40/code128" alt="Barcode">
//                     <div class="item-info">
//                         <div><strong>${item.name}</strong></div>
//                         <div>Batch: ${entry.batchNumber || ''}</div>
//                         <div>MRP: ${(entry.mrp || 0).toFixed(2)}</div>
//                         <div>Exp: ${entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : ''}</div>
//                     </div>
//                 </div>
//                 <script>
//                     window.onload = function() {
//                         window.print();
//                         setTimeout(() => window.close(), 500);
//                     };
//                 <\/script>
//             </body>
//             </html>
//         `);
//         printWindow.document.close();
//     };

//     const handleDeleteStockEntry = async () => {
//         if (!entryToDelete) return;

//         try {
//             setDeletingEntryId(entryToDelete.id);
            
//             const response = await api.delete(`/api/retailer/stock-entries/${entryToDelete.id}`);

//             if (response.data.success) {
//                 // Remove the deleted entry from state
//                 const updatedEntries = stockEntries.filter(entry => entry.id !== entryToDelete.id);
//                 setStockEntries(updatedEntries);
                
//                 // Update hasStockAvailable based on remaining entries
//                 const hasStock = updatedEntries.some(entry => entry.quantity > 0);
//                 setHasStockAvailable(hasStock);
                
//                 // Update stock info if needed
//                 if (updatedEntries.length === 0) {
//                     setStockInfo(prev => ({
//                         ...prev,
//                         openingStock: 0,
//                         openingStockValue: 0
//                     }));
//                 }

//                 setToast({
//                     show: true,
//                     message: `Stock entry deleted successfully`,
//                     type: 'success'
//                 });
//             } else {
//                 throw new Error(response.data.error || 'Failed to delete stock entry');
//             }
//         } catch (err) {
//             setToast({
//                 show: true,
//                 message: err.response?.data?.error || err.message || 'Failed to delete stock entry',
//                 type: 'error'
//             });
//         } finally {
//             setDeletingEntryId(null);
//             setShowDeleteConfirm(false);
//             setEntryToDelete(null);
//             setConfirmItemName('');
//         }
//     };

//     const confirmDelete = (entry) => {
//         setEntryToDelete(entry);
//         setShowDeleteConfirm(true);
//         setConfirmItemName('');
//     };

//     const handleCloseModal = () => {
//         setShowDeleteConfirm(false);
//         setEntryToDelete(null);
//         setConfirmItemName('');
//     };

//     const calculateTotalStock = () => {
//         if (!stockEntries || stockEntries.length === 0) return 0;
//         return stockEntries.reduce((total, entry) => total + (entry.quantity || 0), 0);
//     };

//     const totalStock = calculateTotalStock();

//     const getStockStatusBadge = () => {
//         if (totalStock === 0) return { bg: 'danger', label: 'Out of Stock' };
//         if (totalStock < 10) return { bg: 'warning', label: 'Low Stock' };
//         if (totalStock < 50) return { bg: 'info', label: 'Medium Stock' };
//         return { bg: 'success', label: 'In Stock' };
//     };

//     const getExpiryStatusBadge = (status) => {
//         const statusMap = {
//             'safe': { bg: 'success', label: 'Safe' },
//             'warning': { bg: 'warning', label: 'Expiring Soon' },
//             'danger': { bg: 'danger', label: 'Expiring' },
//             'expired': { bg: 'dark', label: 'Expired' }
//         };
//         return statusMap[status] || { bg: 'secondary', label: 'Unknown' };
//     };

//     const stockStatus = getStockStatusBadge();

//     // Check if the entered name matches the item name (case insensitive)
//     const isNameMatch = confirmItemName.trim().toLowerCase() === (item?.name || '').toLowerCase();

//     if (loading) return (
//         <div className="vi-container">
//             <div className="vi-loading">
//                 <div className="vi-spinner"></div>
//                 <p className="vi-loading-text">Loading item details...</p>
//             </div>
//         </div>
//     );

//     if (error) return (
//         <div className="vi-container">
//             <div className="vi-error">
//                 <i className="bi bi-exclamation-triangle-fill vi-error-icon"></i>
//                 <p>{error}</p>
//                 <button className="vi-btn-secondary" onClick={() => navigate(-1)}>
//                     <FaArrowLeft className="me-1" /> Back
//                 </button>
//             </div>
//         </div>
//     );

//     if (!item) return (
//         <div className="vi-container">
//             <div className="vi-error">
//                 <i className="bi bi-inbox vi-error-icon"></i>
//                 <p>Item not found</p>
//                 <button className="vi-btn-secondary" onClick={() => navigate(-1)}>
//                     <FaArrowLeft className="me-1" /> Back
//                 </button>
//             </div>
//         </div>
//     );

//     return (
//         <div className="container-fluid">
//             <NotificationToast
//                 show={toast.show}
//                 message={toast.message}
//                 type={toast.type}
//                 onClose={() => setToast({ ...toast, show: false })}
//             />
//             <Header/>

//             {/* Delete Confirmation Modal */}
//             {showDeleteConfirm && entryToDelete && (
//                 <div className="vi-modal-overlay" onClick={handleCloseModal}>
//                     <div className="vi-modal" onClick={(e) => e.stopPropagation()}>
//                         <div className="vi-modal-header">
//                             <h6 className="vi-modal-title">Delete Stock Entry</h6>
//                             <button className="vi-modal-close" onClick={handleCloseModal}>
//                                 <FaTimes />
//                             </button>
//                         </div>
//                         <div className="vi-modal-body">
//                             <div className="vi-modal-icon">
//                                 <FaTrash />
//                             </div>
//                             <p className="vi-modal-text">
//                                 Are you sure you want to delete this stock entry?
//                             </p>
                            
//                             <div className="vi-modal-details">
//                                 <div className="vi-modal-detail-item">
//                                     <span className="vi-modal-detail-label">Item:</span>
//                                     <span className="vi-modal-detail-value vi-modal-item-name">{item?.name}</span>
//                                 </div>
//                                 <div className="vi-modal-detail-item">
//                                     <span className="vi-modal-detail-label">Batch:</span>
//                                     <span className="vi-modal-detail-value">{entryToDelete.batchNumber || 'N/A'}</span>
//                                 </div>
//                                 <div className="vi-modal-detail-item">
//                                     <span className="vi-modal-detail-label">Quantity:</span>
//                                     <span className="vi-modal-detail-value">{entryToDelete.quantity || 0}</span>
//                                 </div>
//                                 <div className="vi-modal-detail-item">
//                                     <span className="vi-modal-detail-label">MRP:</span>
//                                     <span className="vi-modal-detail-value">{(entryToDelete.mrp || 0).toFixed(2)}</span>
//                                 </div>
//                                 <div className="vi-modal-detail-item">
//                                     <span className="vi-modal-detail-label">Expiry:</span>
//                                     <span className="vi-modal-detail-value">
//                                         {entryToDelete.expiryDate ? new Date(entryToDelete.expiryDate).toLocaleDateString() : 'N/A'}
//                                     </span>
//                                 </div>
//                             </div>

//                             <div className="vi-modal-confirm-input">
//                                 <label className="vi-modal-confirm-label">
//                                     Type <strong>"{item?.name}"</strong> to confirm deletion:
//                                 </label>
//                                 <input
//                                     type="text"
//                                     className={`vi-modal-confirm-field ${confirmItemName && !isNameMatch ? 'vi-modal-confirm-field--error' : ''}`}
//                                     placeholder={`Type "${item?.name}"`}
//                                     value={confirmItemName}
//                                     onChange={(e) => setConfirmItemName(e.target.value)}
//                                     autoFocus
//                                 />
//                                 {confirmItemName && !isNameMatch && (
//                                     <small className="vi-modal-confirm-error">
//                                         <i className="bi bi-exclamation-circle"></i>
//                                         Name does not match. Please type the exact item name.
//                                     </small>
//                                 )}
//                                 {isNameMatch && (
//                                     <small className="vi-modal-confirm-success">
//                                         <i className="bi bi-check-circle"></i>
//                                         Name matched! You can now delete.
//                                     </small>
//                                 )}
//                             </div>

//                             <p className="vi-modal-warning">
//                                 <i className="bi bi-exclamation-triangle"></i>
//                                 This action cannot be undone.
//                             </p>
//                         </div>
//                         <div className="vi-modal-footer">
//                             <button 
//                                 className="vi-btn-cancel" 
//                                 onClick={handleCloseModal}
//                             >
//                                 Cancel
//                             </button>
//                             <button 
//                                 className="vi-btn-delete" 
//                                 onClick={handleDeleteStockEntry}
//                                 disabled={deletingEntryId === entryToDelete.id || !isNameMatch}
//                             >
//                                 {deletingEntryId === entryToDelete.id ? (
//                                     <>
//                                         <span className="vi-spinner-small"></span>
//                                         Deleting...
//                                     </>
//                                 ) : (
//                                     <>
//                                         <FaTrash /> Delete
//                                     </>
//                                 )}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Header */}
//             <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                 <div className="vi-header">
//                     <div className="vi-header-left">
//                         <div className="vi-header-icon">
//                             <FaBox />
//                         </div>
//                         <div>
//                             <h5 className="vi-header-title">Item Details</h5>
//                             <small className="vi-header-subtitle">
//                                 {item.name} • {item.uniqueNumber || 'No Code'}
//                             </small>
//                         </div>
//                     </div>
//                     <button className="vi-header-close" onClick={() => navigate(-1)}>
//                         <FaTimes />
//                     </button>
//                 </div>

//                 <div className="vi-body">
//                     {/* Stats Cards */}
//                     <div className="vi-stats-row">
//                         <div className="vi-stat-card">
//                             <div className="vi-stat-card-body">
//                                 <div>
//                                     <small className="vi-stat-label">Status</small>
//                                     <h5 className="vi-stat-value">
//                                         <span className={`vi-badge-status vi-badge-status--${item.status}`}>
//                                             {item.status?.toUpperCase() || 'UNKNOWN'}
//                                         </span>
//                                     </h5>
//                                 </div>
//                                 <div className={`vi-stat-icon vi-stat-icon--${item.status === 'active' ? 'success' : 'danger'}`}>
//                                     {item.status === 'active' ? '✓' : '✕'}
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="vi-stat-card">
//                             <div className="vi-stat-card-body">
//                                 <div>
//                                     <small className="vi-stat-label">Total Stock</small>
//                                     <h5 className="vi-stat-value">{totalStock} {item.unitName || ''}</h5>
//                                 </div>
//                                 <div className="vi-stat-icon vi-stat-icon--purple">
//                                     <FaBoxes />
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="vi-stat-card">
//                             <div className="vi-stat-card-body">
//                                 <div>
//                                     <small className="vi-stat-label">Stock Status</small>
//                                     <h5 className="vi-stat-value">
//                                         <span className={`vi-badge-stock vi-badge-stock--${stockStatus.bg}`}>
//                                             {stockStatus.label}
//                                         </span>
//                                     </h5>
//                                 </div>
//                                 <div className={`vi-stat-icon vi-stat-icon--${stockStatus.bg}`}>
//                                     <FaCube />
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Item Details Card */}
//                     <div className="vi-details-card">
//                         <div className="vi-details-grid">
//                             {/* Basic Information */}
//                             <div className="vi-details-section">
//                                 <h6 className="vi-section-title">Basic Information</h6>
//                                 <div className="vi-details-list">
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Name</span>
//                                         <span className="vi-detail-value">{item.name}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">HSN</span>
//                                         <span className="vi-detail-value">{item.hscode || ''}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">VAT Status</span>
//                                         <span className="vi-detail-value">
//                                             <span className={`vi-badge-vat vi-badge-vat--${item.vatStatus === '13' ? 'taxable' : 'exempt'}`}>
//                                                 {item.vatStatus === '13' ? '13%' : 'Exempt'}
//                                             </span>
//                                         </span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Category</span>
//                                         <span className="vi-detail-value">{item.categoryName || 'N/A'}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Company</span>
//                                         <span className="vi-detail-value">{item.itemsCompanyName || 'N/A'}</span>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Units & Pricing */}
//                             <div className="vi-details-section">
//                                 <h6 className="vi-section-title">Units & Pricing</h6>
//                                 <div className="vi-details-list">
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Main Unit</span>
//                                         <span className="vi-detail-value">{item.mainUnitName || 'N/A'}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">WS Unit</span>
//                                         <span className="vi-detail-value">{item.wsUnit || 'N/A'}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Unit</span>
//                                         <span className="vi-detail-value">{item.unitName || 'N/A'}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Sales Price</span>
//                                         <span className="vi-detail-value vi-price">{stockInfo.salesPrice?.toFixed(2) || '0.00'}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Purchase Price</span>
//                                         <span className="vi-detail-value vi-price">{stockInfo.purchasePrice?.toFixed(2) || '0.00'}</span>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Stock & Identification */}
//                             <div className="vi-details-section">
//                                 <h6 className="vi-section-title">Stock & Identification</h6>
//                                 <div className="vi-details-list">
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Opening Stock</span>
//                                         <span className="vi-detail-value">{stockInfo.openingStock || 0}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Stock Value</span>
//                                         <span className="vi-detail-value">{(stockInfo.openingStockValue || 0).toFixed(2)}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Reorder Level</span>
//                                         <span className="vi-detail-value">{item.reorderLevel || 0}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Barcode</span>
//                                         <span className="vi-detail-value vi-code">{item.barcodeNumber || 'N/A'}</span>
//                                     </div>
//                                     <div className="vi-detail-item">
//                                         <span className="vi-detail-label">Item Code</span>
//                                         <span className="vi-detail-value vi-code">{item.uniqueNumber || 'N/A'}</span>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Compositions */}
//                     {item.compositions && item.compositions.length > 0 && (
//                         <div className="vi-compositions-card">
//                             <h6 className="vi-section-title">Compositions</h6>
//                             <div className="vi-compositions-list">
//                                 {item.compositions.map(comp => (
//                                     <span key={comp.id || comp._id} className="vi-composition-tag">
//                                         #{comp.uniqueNumber || ''} {comp.name}
//                                     </span>
//                                 ))}
//                             </div>
//                         </div>
//                     )}

//                     {/* Stock Entries */}
//                     {stockEntries && stockEntries.length > 0 && (
//                         <div className="vi-stock-card">
//                             <div 
//                                 className="vi-stock-header"
//                                 onClick={() => setExpandedStock(!expandedStock)}
//                             >
//                                 <div className="vi-stock-header-left">
//                                     <FaBox className="vi-stock-icon" />
//                                     <div>
//                                         <h6 className="vi-stock-title">Stock Entries</h6>
//                                         <small className="vi-stock-subtitle">
//                                             {stockEntries.length} entries • {totalStock} units total
//                                         </small>
//                                     </div>
//                                 </div>
//                                 <button className="vi-stock-toggle">
//                                     {expandedStock ? <FaChevronUp /> : <FaChevronDown />}
//                                 </button>
//                             </div>
//                             {expandedStock && (
//                                 <div className="vi-stock-body">
//                                     <div className="vi-table-wrap">
//                                         <table className="vi-table">
//                                             <thead>
//                                                 <tr>
//                                                     <th>Batch</th>
//                                                     <th style={{ textAlign: 'right' }}>Qty</th>
//                                                     <th style={{ textAlign: 'right' }}>MRP</th>
//                                                     <th>Expiry</th>
//                                                     <th style={{ textAlign: 'center' }}>Status</th>
//                                                     <th style={{ textAlign: 'center' }}>Print</th>
//                                                     <th style={{ textAlign: 'center' }}>Action</th>
//                                                 </tr>
//                                             </thead>
//                                             <tbody>
//                                                 {stockEntries.map(entry => {
//                                                     const expiryStatus = getExpiryStatusBadge(entry.expiryStatus);
//                                                     const isDeleting = deletingEntryId === entry.id;
//                                                     return (
//                                                         <tr key={entry.id} className={isDeleting ? 'vi-row-deleting' : ''}>
//                                                             <td>
//                                                                 <span className="vi-batch-number">{entry.batchNumber || 'N/A'}</span>
//                                                             </td>
//                                                             <td style={{ textAlign: 'right', fontWeight: '600' }}>
//                                                                 {entry.quantity || 0}
//                                                             </td>
//                                                             <td style={{ textAlign: 'right' }}>
//                                                                 {(entry.mrp || 0).toFixed(2)}
//                                                             </td>
//                                                             <td>
//                                                                 <small>
//                                                                     <FaCalendarAlt className="vi-calendar-icon" />
//                                                                     {entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : 'N/A'}
//                                                                 </small>
//                                                             </td>
//                                                             <td style={{ textAlign: 'center' }}>
//                                                                 <span className={`vi-badge-expiry vi-badge-expiry--${expiryStatus.bg}`}>
//                                                                     {expiryStatus.label}
//                                                                 </span>
//                                                             </td>
//                                                             <td style={{ textAlign: 'center' }}>
//                                                                 <button
//                                                                     className="vi-btn-print"
//                                                                     onClick={() => handlePrintBarcode(entry)}
//                                                                 >
//                                                                     <FaPrint /> Print
//                                                                 </button>
//                                                             </td>
//                                                             <td style={{ textAlign: 'center' }}>
//                                                                 <button
//                                                                     className="vi-btn-delete-entry"
//                                                                     onClick={() => confirmDelete(entry)}
//                                                                     disabled={isDeleting}
//                                                                     title="Delete this stock entry"
//                                                                 >
//                                                                     {isDeleting ? (
//                                                                         <span className="vi-spinner-small"></span>
//                                                                     ) : (
//                                                                         <FaTrash />
//                                                                     )}
//                                                                 </button>
//                                                             </td>
//                                                         </tr>
//                                                     );
//                                                 })}
//                                             </tbody>
//                                             <tfoot>
//                                                 <tr>
//                                                     <td><strong>Total</strong></td>
//                                                     <td style={{ textAlign: 'right' }}><strong>{totalStock}</strong></td>
//                                                     <td colSpan="5"></td>
//                                                 </tr>
//                                             </tfoot>
//                                         </table>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     )}

//                     {/* Actions */}
//                     <div className="vi-actions">
//                         <div className="vi-actions-left">
//                             <button
//                                 className={`vi-btn-status vi-btn-status--${item.status}`}
//                                 onClick={toggleItemStatus}
//                                 disabled={item.status === 'active' && hasStockAvailable}
//                                 title={item.status === 'active' && hasStockAvailable ? `Cannot deactivate - stock is available (${totalStock} units)` : ""}
//                             >
//                                 {item.status === 'active' ? 'Deactivate' : 'Activate'}
//                             </button>
//                             {item.status === 'inactive' && hasStockAvailable && (
//                                 <small className="vi-status-hint vi-status-hint--warning">
//                                     <i className="bi bi-exclamation-triangle"></i>
//                                     Item is inactive but has stock ({totalStock} units). You can activate it anytime.
//                                 </small>
//                             )}
//                             {item.status === 'inactive' && !hasStockAvailable && (
//                                 <small className="vi-status-hint vi-status-hint--info">
//                                     <i className="bi bi-check-circle"></i>
//                                     Item is inactive and has no stock - can be activated anytime
//                                 </small>
//                             )}
//                         </div>
//                         <button className="vi-btn-back" onClick={() => navigate(-1)}>
//                             <FaArrowLeft /> Back
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default ViewItems;

//-----------------------------------------------end4

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaBarcode, FaBoxOpen, FaBox, FaCalendarAlt, FaTag, FaBuilding, FaChevronDown, FaChevronUp, FaSearch, FaTimes, FaBoxes, FaRupeeSign, FaCube, FaPrint, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import NotificationToast from '../../NotificationToast';
import './ViewItems.css';
import Header from '../Header';

const ViewItems = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [hasStockAvailable, setHasStockAvailable] = useState(false);
    const [stockInfo, setStockInfo] = useState({
        openingStock: 0,
        openingStockValue: 0,
        salesPrice: 0,
        purchasePrice: 0
    });
    const [stockEntries, setStockEntries] = useState([]);
    const [expandedStock, setExpandedStock] = useState(false);
    const [deletingEntryId, setDeletingEntryId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState(null);
    const [confirmItemName, setConfirmItemName] = useState('');
    const confirmInputRef = useRef(null);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: false,
    });

    api.interceptors.request.use(config => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    useEffect(() => {
        const fetchItemData = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/api/retailer/items/${id}`);

                if (!response.data.success) {
                    throw new Error(response.data.error || 'Failed to fetch item');
                }

                const { data } = response.data;
                const { item: itemData, stockInfo: stockInfoData, hasStockAvailable: hasStockAvailableData, stockEntries: stockEntriesData } = data;

                const processedItem = {
                    _id: itemData.id,
                    id: itemData.id,
                    name: itemData.name || '',
                    hscode: itemData.hscode || '',
                    vatStatus: itemData.vatStatus || '',
                    status: itemData.status || 'active',
                    price: itemData.price || 0,
                    puPrice: itemData.puPrice || 0,
                    mainUnitName: itemData.mainUnitName,
                    wsUnit: itemData.wsUnit || 0,
                    unitName: itemData.unitName,
                    openingStock: itemData.openingStock || 0,
                    reorderLevel: itemData.reorderLevel || 0,
                    uniqueNumber: itemData.uniqueNumber || '',
                    barcodeNumber: itemData.barcodeNumber || '',
                    categoryName: itemData.categoryName,
                    itemsCompanyName: itemData.itemsCompanyName,
                    createdAt: itemData.createdAt,
                    updatedAt: itemData.updatedAt,
                    compositions: itemData.compositions || [],
                    stockEntries: itemData.stockEntries || []
                };

                setItem(processedItem);
                setStockInfo({
                    openingStock: stockInfoData?.openingStock || 0,
                    openingStockValue: stockInfoData?.openingStockValue || 0,
                    salesPrice: stockInfoData?.salesPrice || 0,
                    purchasePrice: stockInfoData?.purchasePrice || 0
                });
                setStockEntries(stockEntriesData || []);
                setHasStockAvailable(hasStockAvailableData || false);

            } catch (err) {
                console.error('Error fetching item:', err);
                setError(err.response?.data?.error || err.message || 'Failed to fetch item details');
            } finally {
                setLoading(false);
            }
        };

        fetchItemData();
    }, [id]);

    const toggleItemStatus = async () => {
        try {
            const newStatus = item.status === 'active' ? 'inactive' : 'active';
            
            if (newStatus === 'inactive' && hasStockAvailable) {
                setToast({
                    show: true,
                    message: `Cannot deactivate item - stock is available (${totalStock} units). Please remove all stock first.`,
                    type: 'warning'
                });
                return;
            }

            const response = await api.put(`/api/retailer/items/${item._id}`, {
                status: newStatus
            });

            if (response.data.success) {
                setItem(prev => ({ ...prev, status: newStatus }));
                setToast({
                    show: true,
                    message: `Item status updated to ${newStatus}`,
                    type: 'success'
                });
            } else {
                throw new Error(response.data.error || 'Failed to update status');
            }
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.error || err.message || 'Failed to update status',
                type: 'error'
            });
        }
    };

    const handlePrintBarcode = (entry) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Barcode - ${item.name}</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { display: flex; justify-content: center; align-items: center; height: 100vh; }
                    .barcode-container { text-align: center; padding: 20px; }
                    .item-info { margin-top: 10px; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="barcode-container">
                    <img src="/item/${item._id}/barcode/${entry.id}/70/40/code128" alt="Barcode">
                    <div class="item-info">
                        <div><strong>${item.name}</strong></div>
                        <div>Batch: ${entry.batchNumber || ''}</div>
                        <div>MRP: ${(entry.mrp || 0).toFixed(2)}</div>
                        <div>Exp: ${entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : ''}</div>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    };
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDeleteStockEntry = async () => {
        if (!entryToDelete) return;

        try {
            setDeletingEntryId(entryToDelete.id);
            
            const response = await api.delete(`/api/retailer/stock-entries/${entryToDelete.id}`);

            if (response.data.success) {
                // Remove the deleted entry from state
                const updatedEntries = stockEntries.filter(entry => entry.id !== entryToDelete.id);
                setStockEntries(updatedEntries);
                
                // Update hasStockAvailable based on remaining entries
                const hasStock = updatedEntries.some(entry => entry.quantity > 0);
                setHasStockAvailable(hasStock);
                
                // Update stock info if needed
                if (updatedEntries.length === 0) {
                    setStockInfo(prev => ({
                        ...prev,
                        openingStock: 0,
                        openingStockValue: 0
                    }));
                }

                setToast({
                    show: true,
                    message: `Stock entry deleted successfully`,
                    type: 'success'
                });
            } else {
                throw new Error(response.data.error || 'Failed to delete stock entry');
            }
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.error || err.message || 'Failed to delete stock entry',
                type: 'error'
            });
        } finally {
            setDeletingEntryId(null);
            setShowDeleteConfirm(false);
            setEntryToDelete(null);
            setConfirmItemName('');
        }
    };

    const confirmDelete = (entry) => {
        setEntryToDelete(entry);
        setShowDeleteConfirm(true);
        setConfirmItemName('');
        // Focus the input after modal renders
        setTimeout(() => {
            if (confirmInputRef.current) {
                confirmInputRef.current.focus();
            }
        }, 100);
    };

    const handleCloseModal = () => {
        setShowDeleteConfirm(false);
        setEntryToDelete(null);
        setConfirmItemName('');
    };

    // Prevent paste in the input field
    const handlePaste = (e) => {
        e.preventDefault();
        setToast({
            show: true,
            message: 'Pasting is not allowed. Please type.',
            type: 'warning'
        });
    };

    // Prevent right-click context menu (which can include paste)
    const handleContextMenu = (e) => {
        e.preventDefault();
        setToast({
            show: true,
            message: 'Right-click is disabled. Please type the item name manually.',
            type: 'warning'
        });
    };

    // Handle keydown to prevent Ctrl+V and other paste shortcuts
    const handleKeyDown = (e) => {
        // Check for Ctrl+V (Windows/Linux) or Cmd+V (Mac)
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            setToast({
                show: true,
                message: 'Pasting is not allowed. Please type.',
                type: 'warning'
            });
        }
    };

    const calculateTotalStock = () => {
        if (!stockEntries || stockEntries.length === 0) return 0;
        return stockEntries.reduce((total, entry) => total + (entry.quantity || 0), 0);
    };

    const totalStock = calculateTotalStock();

    const getStockStatusBadge = () => {
        if (totalStock === 0) return { bg: 'danger', label: 'Out of Stock' };
        if (totalStock < 10) return { bg: 'warning', label: 'Low Stock' };
        if (totalStock < 50) return { bg: 'info', label: 'Medium Stock' };
        return { bg: 'success', label: 'In Stock' };
    };

    const getExpiryStatusBadge = (status) => {
        const statusMap = {
            'safe': { bg: 'success', label: 'Safe' },
            'warning': { bg: 'warning', label: 'Expiring Soon' },
            'danger': { bg: 'danger', label: 'Expiring' },
            'expired': { bg: 'dark', label: 'Expired' }
        };
        return statusMap[status] || { bg: 'secondary', label: 'Unknown' };
    };

    const stockStatus = getStockStatusBadge();

    // Check if the entered name matches the item name (case insensitive)
    const isNameMatch = confirmItemName.trim().toLowerCase() === (item?.name || '').toLowerCase();

    if (loading) return (
        <div className="vi-container">
            <div className="vi-loading">
                <div className="vi-spinner"></div>
                {/* <p className="vi-loading-text">Loading item details...</p> */}
            </div>
        </div>
    );

    if (error) return (
        <div className="vi-container">
            <div className="vi-error">
                <i className="bi bi-exclamation-triangle-fill vi-error-icon"></i>
                <p>{error}</p>
                <button className="vi-btn-secondary" onClick={() => navigate(-1)}>
                    <FaArrowLeft className="me-1" /> Back
                </button>
            </div>
        </div>
    );

    if (!item) return (
        <div className="vi-container">
            <div className="vi-error">
                <i className="bi bi-inbox vi-error-icon"></i>
                <p>Item not found</p>
                <button className="vi-btn-secondary" onClick={() => navigate(-1)}>
                    <FaArrowLeft className="me-1" /> Back
                </button>
            </div>
        </div>
    );

    return (
        <div className="container-fluid">
            <NotificationToast
                show={toast.show}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, show: false })}
            />
            <Header/>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && entryToDelete && (
                <div className="vi-modal-overlay" onClick={handleCloseModal}>
                    <div className="vi-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="vi-modal-header">
                            <h6 className="vi-modal-title">Delete Stock Entry</h6>
                            <button className="vi-modal-close" onClick={handleCloseModal}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="vi-modal-body">
                            <div className="vi-modal-icon">
                                <FaTrash />
                            </div>
                            <p className="vi-modal-text">
                                Are you sure you want to delete this stock entry?
                            </p>
                            
                            <div className="vi-modal-details">
                                <div className="vi-modal-detail-item">
                                    <span className="vi-modal-detail-label">Item:</span>
                                    <span className="vi-modal-detail-value vi-modal-item-name">{item?.name}</span>
                                </div>
                                <div className="vi-modal-detail-item">
                                    <span className="vi-modal-detail-label">Batch:</span>
                                    <span className="vi-modal-detail-value">{entryToDelete.batchNumber || 'N/A'}</span>
                                </div>
                                <div className="vi-modal-detail-item">
                                    <span className="vi-modal-detail-label">Quantity:</span>
                                    <span className="vi-modal-detail-value">{entryToDelete.quantity || 0}</span>
                                </div>
                                <div className="vi-modal-detail-item">
                                    <span className="vi-modal-detail-label">MRP:</span>
                                    <span className="vi-modal-detail-value">{(entryToDelete.mrp || 0).toFixed(2)}</span>
                                </div>
                                <div className="vi-modal-detail-item">
                                    <span className="vi-modal-detail-label">Expiry:</span>
                                    <span className="vi-modal-detail-value">
                                        {entryToDelete.expiryDate ? new Date(entryToDelete.expiryDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="vi-modal-confirm-input">
                                <label className="vi-modal-confirm-label">
                                    Type <strong>"{item?.name}"</strong> to confirm deletion:
                                </label>
                                <input
                                    ref={confirmInputRef}
                                    type="text"
                                    className={`vi-modal-confirm-field ${confirmItemName && !isNameMatch ? 'vi-modal-confirm-field--error' : ''}`}
                                    placeholder={`Type "${item?.name}"`}
                                    value={confirmItemName}
                                    onChange={(e) => setConfirmItemName(e.target.value)}
                                    onPaste={handlePaste}
                                    onContextMenu={handleContextMenu}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                    autoComplete="off"
                                    spellCheck="false"
                                    aria-label="Type item name to confirm deletion"
                                />
                                {confirmItemName && !isNameMatch && (
                                    <small className="vi-modal-confirm-error">
                                        <i className="bi bi-exclamation-circle"></i>
                                        Name does not match. Please type the exact item name.
                                    </small>
                                )}
                                {isNameMatch && (
                                    <small className="vi-modal-confirm-success">
                                        <i className="bi bi-check-circle"></i>
                                        Name matched! You can now delete.
                                    </small>
                                )}
                            </div>

                            <p className="vi-modal-warning">
                                <i className="bi bi-exclamation-triangle"></i>
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="vi-modal-footer">
                            <button 
                                className="vi-btn-cancel" 
                                onClick={handleCloseModal}
                            >
                                Cancel
                            </button>
                            <button 
                                className="vi-btn-delete" 
                                onClick={handleDeleteStockEntry}
                                disabled={deletingEntryId === entryToDelete.id || !isNameMatch}
                            >
                                {deletingEntryId === entryToDelete.id ? (
                                    <>
                                        <span className="vi-spinner-small"></span>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <FaTrash /> Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="vi-header">
                    <div className="vi-header-left">
                        <div className="vi-header-icon">
                            <FaBox />
                        </div>
                        <div>
                            <h5 className="vi-header-title">Item Details</h5>
                            <small className="vi-header-subtitle">
                                {item.name} • {item.uniqueNumber || ''}
                            </small>
                        </div>
                    </div>
                    <button className="vi-header-close" onClick={() => navigate(-1)}>
                        <FaTimes />
                    </button>
                </div>

                <div className="vi-body">
                    {/* Stats Cards */}
                    <div className="vi-stats-row">
                        <div className="vi-stat-card">
                            <div className="vi-stat-card-body">
                                <div>
                                    <small className="vi-stat-label">Status</small>
                                    <h5 className="vi-stat-value">
                                        <span className={`vi-badge-status vi-badge-status--${item.status}`}>
                                            {item.status?.toUpperCase() || 'UNKNOWN'}
                                        </span>
                                    </h5>
                                </div>
                                <div className={`vi-stat-icon vi-stat-icon--${item.status === 'active' ? 'success' : 'danger'}`}>
                                    {item.status === 'active' ? '✓' : '✕'}
                                </div>
                            </div>
                        </div>
                        <div className="vi-stat-card">
                            <div className="vi-stat-card-body">
                                <div>
                                    <small className="vi-stat-label">Total Stock</small>
                                    <h5 className="vi-stat-value">{totalStock} {item.unitName || ''}</h5>
                                </div>
                                <div className="vi-stat-icon vi-stat-icon--purple">
                                    <FaBoxes />
                                </div>
                            </div>
                        </div>
                        <div className="vi-stat-card">
                            <div className="vi-stat-card-body">
                                <div>
                                    <small className="vi-stat-label">Stock Status</small>
                                    <h5 className="vi-stat-value">
                                        <span className={`vi-badge-stock vi-badge-stock--${stockStatus.bg}`}>
                                            {stockStatus.label}
                                        </span>
                                    </h5>
                                </div>
                                <div className={`vi-stat-icon vi-stat-icon--${stockStatus.bg}`}>
                                    <FaCube />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Item Details Card */}
                    <div className="vi-details-card">
                        <div className="vi-details-grid">
                            {/* Basic Information */}
                            <div className="vi-details-section">
                                <h6 className="vi-section-title">Basic Information</h6>
                                <div className="vi-details-list">
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">Name</span>
                                        <span className="vi-detail-value">{item.name}</span>
                                    </div>
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">HSN</span>
                                        <span className="vi-detail-value">{item.hscode || ''}</span>
                                    </div>
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">VAT</span>
                                        <span className="vi-detail-value">
                                            <span className={`vi-badge-vat vi-badge-vat--${item.vatStatus === '13' ? 'taxable' : 'exempt'}`}>
                                                {item.vatStatus === '13' ? '13%' : 'Exempt'}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">Category</span>
                                        <span className="vi-detail-value">{item.categoryName || 'N/A'}</span>
                                    </div>
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">Company</span>
                                        <span className="vi-detail-value">{item.itemsCompanyName || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Units & Pricing */}
                            <div className="vi-details-section">
                                <h6 className="vi-section-title">Units & Pricing</h6>
                                <div className="vi-details-list">
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">Main Unit</span>
                                        <span className="vi-detail-value">{item.mainUnitName || 'N/A'}</span>
                                    </div>
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">WS Unit</span>
                                        <span className="vi-detail-value">{item.wsUnit || 'N/A'}</span>
                                    </div>
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">Unit</span>
                                        <span className="vi-detail-value">{item.unitName || 'N/A'}</span>
                                    </div>
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">Sales Price</span>
                                        <span className="vi-detail-value vi-price">{stockInfo.salesPrice?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">Purchase Price</span>
                                        <span className="vi-detail-value vi-price">{stockInfo.purchasePrice?.toFixed(2) || '0.00'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stock & Identification */}
                            <div className="vi-details-section">
                                <h6 className="vi-section-title">Stock & Identification</h6>
                                <div className="vi-details-list">
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">Opening Stock</span>
                                        <span className="vi-detail-value">{stockInfo.openingStock || 0}</span>
                                    </div>
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">Stock Value</span>
                                        <span className="vi-detail-value">{(stockInfo.openingStockValue || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">Reorder Level</span>
                                        <span className="vi-detail-value">{item.reorderLevel || 0}</span>
                                    </div>
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">Barcode</span>
                                        <span className="vi-detail-value vi-code">{item.barcodeNumber || 'N/A'}</span>
                                    </div>
                                    <div className="vi-detail-item">
                                        <span className="vi-detail-label">Item Code</span>
                                        <span className="vi-detail-value vi-code">{item.uniqueNumber || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Compositions */}
                    {item.compositions && item.compositions.length > 0 && (
                        <div className="vi-compositions-card">
                            <h6 className="vi-section-title">Compositions</h6>
                            <div className="vi-compositions-list">
                                {item.compositions.map(comp => (
                                    <span key={comp.id || comp._id} className="vi-composition-tag">
                                        #{comp.uniqueNumber || ''} {comp.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Stock Entries */}
                    {stockEntries && stockEntries.length > 0 && (
                        <div className="vi-stock-card">
                            <div 
                                className="vi-stock-header"
                                onClick={() => setExpandedStock(!expandedStock)}
                            >
                                <div className="vi-stock-header-left">
                                    <FaBox className="vi-stock-icon" />
                                    <div>
                                        <h6 className="vi-stock-title">Stock Entries</h6>
                                        <small className="vi-stock-subtitle">
                                            {stockEntries.length} entries • {totalStock} units total
                                        </small>
                                    </div>
                                </div>
                                <button className="vi-stock-toggle">
                                    {expandedStock ? <FaChevronUp /> : <FaChevronDown />}
                                </button>
                            </div>
                            {expandedStock && (
                                <div className="vi-stock-body">
                                    <div className="vi-table-wrap">
                                        <table className="vi-table">
                                            <thead>
                                                <tr>
                                                    <th>Batch</th>
                                                    <th style={{ textAlign: 'right' }}>Qty</th>
                                                    <th style={{ textAlign: 'right' }}>MRP</th>
                                                    <th>Expiry</th>
                                                    <th style={{ textAlign: 'center' }}>Status</th>
                                                    <th style={{ textAlign: 'center' }}>Print</th>
                                                    <th style={{ textAlign: 'center' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stockEntries.map(entry => {
                                                    const expiryStatus = getExpiryStatusBadge(entry.expiryStatus);
                                                    const isDeleting = deletingEntryId === entry.id;
                                                    return (
                                                        <tr key={entry.id} className={isDeleting ? 'vi-row-deleting' : ''}>
                                                            <td>
                                                                <span className="vi-batch-number">{entry.batchNumber || 'N/A'}</span>
                                                            </td>
                                                            <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                                                {entry.quantity || 0}
                                                            </td>
                                                            <td style={{ textAlign: 'right' }}>
                                                                {(entry.mrp || 0).toFixed(2)}
                                                            </td>
                                                            <td>
                                                                <small>
                                                                    <FaCalendarAlt className="vi-calendar-icon" />
                                                                    {entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : 'N/A'}
                                                                </small>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <span className={`vi-badge-expiry vi-badge-expiry--${expiryStatus.bg}`}>
                                                                    {expiryStatus.label}
                                                                </span>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <button
                                                                    className="vi-btn-print"
                                                                    onClick={() => handlePrintBarcode(entry)}
                                                                >
                                                                    <FaPrint /> Print
                                                                </button>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <button
                                                                    className="vi-btn-delete-entry"
                                                                    onClick={() => confirmDelete(entry)}
                                                                    disabled={isDeleting}
                                                                    title="Delete this stock entry"
                                                                >
                                                                    {isDeleting ? (
                                                                        <span className="vi-spinner-small"></span>
                                                                    ) : (
                                                                        <FaTrash />
                                                                    )}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td><strong>Total</strong></td>
                                                    <td style={{ textAlign: 'right' }}><strong>{totalStock}</strong></td>
                                                    <td colSpan="5"></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="vi-actions">
                        <div className="vi-actions-left">
                            <button
                                className={`vi-btn-status vi-btn-status--${item.status}`}
                                onClick={toggleItemStatus}
                                disabled={item.status === 'active' && hasStockAvailable}
                                title={item.status === 'active' && hasStockAvailable ? `Cannot deactivate - stock is available (${totalStock} units)` : ""}
                            >
                                {item.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            {item.status === 'inactive' && hasStockAvailable && (
                                <small className="vi-status-hint vi-status-hint--warning">
                                    <i className="bi bi-exclamation-triangle"></i>
                                    Item is inactive but has stock ({totalStock} units). You can activate it anytime.
                                </small>
                            )}
                            {item.status === 'inactive' && !hasStockAvailable && (
                                <small className="vi-status-hint vi-status-hint--info">
                                    <i className="bi bi-check-circle"></i>
                                    Item is inactive and has no stock - can be activated anytime
                                </small>
                            )}
                        </div>
                        <button className="vi-btn-back" onClick={() => navigate(-1)}>
                            <FaArrowLeft /> Back
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewItems;