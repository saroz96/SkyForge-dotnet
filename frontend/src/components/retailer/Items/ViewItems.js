// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { Container, Card, Row, Col, ListGroup, Button, Badge, Alert } from 'react-bootstrap';
// import { FaArrowLeft, FaBarcode, FaEdit, FaBoxOpen } from 'react-icons/fa';
// import axios from 'axios';
// import NotificationToast from '../../NotificationToast';

// const ViewItems = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [item, setItem] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
//     const [hasTransactions, setHasTransactions] = useState(false);
//     const [stockInfo, setStockInfo] = useState({
//         openingStock: 0,
//         openingStockValue: 0,
//         salesPrice: 0,
//         purchasePrice: 0
//     });

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
//                 const { item: itemData, stockInfo: stockInfoData, hasTransactions: hasTransactionsData } = data;

//                 console.log('Stock Info from API:', stockInfoData);

//                 const processedItem = {
//                     _id: itemData.id,
//                     id: itemData.id,
//                     name: itemData.name || 'N/A',
//                     hscode: itemData.hscode || 'N/A',
//                     vatStatus: itemData.vatStatus || 'N/A',
//                     status: itemData.status || 'active',
//                     price: itemData.price || 0,
//                     puPrice: itemData.puPrice || 0,
//                     mainUnitName: itemData.mainUnitName,
//                     wsUnit: itemData.wsUnit || 0,
//                     unitName: itemData.unitName,
//                     openingStock: itemData.openingStock || 0,
//                     reorderLevel: itemData.reorderLevel || 0,
//                     uniqueNumber: itemData.uniqueNumber || 'N/A',
//                     barcodeNumber: itemData.barcodeNumber || 'N/A',
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

//                 setHasTransactions(hasTransactionsData || false);

//                 console.log('Processed Stock Info:', {
//                     openingStock: stockInfoData?.openingStock,
//                     openingStockValue: stockInfoData?.openingStockValue,
//                     salesPrice: stockInfoData?.salesPrice,
//                     purchasePrice: stockInfoData?.purchasePrice
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
//                         <div>Batch: ${entry.batchNumber || 'N/A'}</div>
//                         <div>MRP: ${(entry.mrp || 0).toFixed(2)}</div>
//                         <div>Exp: ${entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : 'N/A'}</div>
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
//                                     <strong>HSN Code:</strong> <span className="ms-2">{item.hscode || 'N/A'}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2 d-flex align-items-center">
//                                     <strong>VAT Status:</strong>
//                                     <Badge bg={item.vatStatus === '13' ? 'success' : 'warning'} className="ms-2 py-1">
//                                        {item.vatStatus === '13' ? '13%' : 'Exempt'}
//                                     </Badge>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Main Unit:</strong> <span className="ms-2">{item.mainUnitName || 'N/A'}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>WS Unit:</strong> <span className="ms-2">{item.wsUnit || 'N/A'}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Unit:</strong> <span className="ms-2">{item.unitName || 'N/A'}</span>
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
//                                     <strong>Opening Stock:</strong>
//                                     <span className="ms-2 fw-bold">
//                                         {stockInfo.openingStock || 0}
//                                     </span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Opening Value:</strong>
//                                     <span className="ms-2 fw-bold">
//                                         {(stockInfo.openingStockValue || 0).toFixed(2)}
//                                     </span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Reorder Level:</strong> <span className="ms-2">{item.reorderLevel || 'N/A'}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Category:</strong> <span className="ms-2">{item.categoryName || 'N/A'}</span>
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
//                                     <strong>Barcode:</strong> <span className="ms-2">{item.barcodeNumber || 'N/A'}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Unique Number:</strong> <span className="ms-2">{item.uniqueNumber || 'N/A'}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Company:</strong> <span className="ms-2">{item.itemsCompanyName || 'N/A'}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Created:</strong> <span className="ms-2">{new Date(item.createdAt).toLocaleDateString()}</span>
//                                 </ListGroup.Item>
//                             </ListGroup>
//                         </Col>
//                     </Row>

//                     <hr className="my-3" />

//                     <Row className="mt-3">
//                         <Col>
//                             <h6 className="fw-bold mb-2">Compositions</h6>
//                             <ListGroup variant="flush" className="small">
//                                 {item.compositions && item.compositions.length > 0 ? (
//                                     item.compositions.map(comp => (
//                                         <ListGroup.Item key={comp.id || comp._id} className="py-1 px-2">
//                                             <Badge bg="secondary" className="me-2 py-1">
//                                                 #{comp.uniqueNumber || 'N/A'}
//                                             </Badge>
//                                             {comp.name}
//                                         </ListGroup.Item>
//                                     ))
//                                 ) : (
//                                     <ListGroup.Item className="py-1 px-2 text-muted">
//                                         No compositions assigned
//                                     </ListGroup.Item>
//                                 )}
//                             </ListGroup>
//                         </Col>
//                     </Row>

//                     <Row className="mt-3">
//                         <Col>
//                             <div className="d-flex justify-content-between align-items-center mb-2">
//                                 <Button
//                                     size="sm"
//                                     variant={item.status === 'active' ? 'outline-danger' : 'outline-success'}
//                                     onClick={toggleItemStatus}
//                                     className="me-2"
//                                     disabled={hasTransactions}
//                                     title={hasTransactions ? "Cannot change status - item has transactions" : ""}
//                                 >
//                                     {item.status === 'active' ? 'Deactivate' : 'Activate'}
//                                 </Button>
//                                 <div>
//                                     <Button
//                                         size="sm"
//                                         variant="outline-primary"
//                                         onClick={() => navigate(-1)}
//                                     >
//                                         <FaArrowLeft className="me-1" /> Back
//                                     </Button>
//                                 </div>
//                             </div>
//                             {hasTransactions && (
//                                 <small className="text-muted d-block mb-2">
//                                     <i className="bi bi-info-circle me-1"></i>Status cannot be changed (has transactions)
//                                 </small>
//                             )}
//                         </Col>
//                     </Row>
//                 </Card.Body>
//             </Card>
//         </Container>
//     );
// };

// export default ViewItems;

//---------------------------------------------------end1

// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { Container, Card, Row, Col, ListGroup, Button, Badge, Alert } from 'react-bootstrap';
// import { FaArrowLeft, FaBarcode, FaEdit, FaBoxOpen } from 'react-icons/fa';
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
//                                 {/* <ListGroup.Item className="py-1 px-2">
//                                     <strong>Total Stock Available:</strong>
//                                     <span className="ms-2 fw-bold text-primary">
//                                         {totalStock || 0}
//                                     </span>
//                                 </ListGroup.Item> */}
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

//                     <Row className="mt-3">
//                         <Col>
//                             <h6 className="fw-bold mb-2">Compositions</h6>
//                             <ListGroup variant="flush" className="small">
//                                 {item.compositions && item.compositions.length > 0 ? (
//                                     item.compositions.map(comp => (
//                                         <ListGroup.Item key={comp.id || comp._id} className="py-1 px-2">
//                                             <Badge bg="secondary" className="me-2 py-1">
//                                                 #{comp.uniqueNumber || ''}
//                                             </Badge>
//                                             {comp.name}
//                                         </ListGroup.Item>
//                                     ))
//                                 ) : (
//                                     <ListGroup.Item className="py-1 px-2 text-muted">
//                                         No compositions assigned
//                                     </ListGroup.Item>
//                                 )}
//                             </ListGroup>
//                         </Col>
//                     </Row>

//                     {/* Stock Status Banner */}
//                     <Row className="mt-3">
//                         <Col>
//                             <Alert 
//                                 variant={hasStockAvailable ? 'warning' : 'success'} 
//                                 className="py-2 mb-0"
//                             >
//                                 <div className="d-flex align-items-center">
//                                     <FaBoxOpen className="me-2" />
//                                     <span>
//                                         {/* <strong>Stock Status:</strong>  */}
//                                         {hasStockAvailable ? (
//                                             <span className="text-warning ms-1">
//                                                 Stock available ({totalStock} {item.unitName || ''}) - Cannot deactivate item
//                                             </span>
//                                         ) : (
//                                             <span className="text-success ms-1">
//                                                 No stock available - Item can be deactivated
//                                             </span>
//                                         )}
//                                     </span>
//                                 </div>
//                             </Alert>
//                         </Col>
//                     </Row>

//                     <Row className="mt-3">
//                         <Col>
//                             <div className="d-flex justify-content-between align-items-center mb-2">
//                                 <Button
//                                     size="sm"
//                                     variant={item.status === 'active' ? 'outline-danger' : 'outline-success'}
//                                     onClick={toggleItemStatus}
//                                     className="me-2"
//                                     disabled={item.status === 'active' && hasStockAvailable}
//                                     title={item.status === 'active' && hasStockAvailable ? `Cannot deactivate - stock is available (${totalStock} units)` : ""}
//                                 >
//                                     {item.status === 'active' ? 'Deactivate' : 'Activate'}
//                                 </Button>
//                                 <div>
//                                     <Button
//                                         size="sm"
//                                         variant="outline-primary"
//                                         onClick={() => navigate(-1)}
//                                     >
//                                         <FaArrowLeft className="me-1" /> Back
//                                     </Button>
//                                 </div>
//                             </div>
                            
//                             {item.status === 'inactive' && hasStockAvailable && (
//                                 <small className="text-muted d-block mb-2 text-warning">
//                                     <i className="bi bi-exclamation-triangle me-1"></i>
//                                     Item is inactive but has stock ({totalStock} units). 
//                                     You can activate it anytime.
//                                 </small>
//                             )}
                            
//                             {item.status === 'inactive' && !hasStockAvailable && (
//                                 <small className="text-muted d-block mb-2 text-info">
//                                     <i className="bi bi-check-circle me-1"></i>
//                                     Item is inactive and has no stock - can be activated anytime
//                                 </small>
//                             )}
//                         </Col>
//                     </Row>

//                     {/* Stock Entries Section */}
//                     {stockEntries && stockEntries.length > 0 && (
//                         <>
//                             <hr className="my-3" />
//                             <Row className="mt-3">
//                                 <Col>
//                                     <h6 className="fw-bold mb-2">
//                                         Stock Entries 
//                                         <Badge bg="primary" className="ms-2">
//                                             {stockEntries.length} entries
//                                         </Badge>
//                                     </h6>
//                                     <div className="table-responsive">
//                                         <table className="table table-sm table-striped">
//                                             <thead>
//                                                 <tr>
//                                                     <th>Batch</th>
//                                                     <th>Quantity</th>
//                                                     <th>MRP</th>
//                                                     <th>Expiry</th>
//                                                     <th>Status</th>
//                                                     <th>Action</th>
//                                                 </tr>
//                                             </thead>
//                                             <tbody>
//                                                 {stockEntries.map(entry => (
//                                                     <tr key={entry.id}>
//                                                         <td>{entry.batchNumber || ''}</td>
//                                                         <td>{entry.quantity || 0}</td>
//                                                         <td>{(entry.mrp || 0).toFixed(2)}</td>
//                                                         <td>{entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : ''}</td>
//                                                         <td>
//                                                             <Badge 
//                                                                 bg={entry.expiryStatus === 'safe' ? 'success' : 
//                                                                     entry.expiryStatus === 'warning' ? 'warning' : 
//                                                                     entry.expiryStatus === 'danger' ? 'danger' : 'secondary'}
//                                                             >
//                                                                 {entry.expiryStatus || 'Unknown'}
//                                                             </Badge>
//                                                         </td>
//                                                         <td>
//                                                             <Button
//                                                                 size="sm"
//                                                                 variant="outline-secondary"
//                                                                 onClick={() => handlePrintBarcode(entry)}
//                                                             >
//                                                                 <FaBarcode /> Print
//                                                             </Button>
//                                                         </td>
//                                                     </tr>
//                                                 ))}
//                                             </tbody>
//                                             <tfoot>
//                                                 <tr className="table-primary">
//                                                     <td><strong>Total</strong></td>
//                                                     <td><strong>{totalStock}</strong></td>
//                                                     <td colSpan="4"></td>
//                                                 </tr>
//                                             </tfoot>
//                                         </table>
//                                     </div>
//                                 </Col>
//                             </Row>
//                         </>
//                     )}
//                 </Card.Body>
//             </Card>
//         </Container>
//     );
// };

// export default ViewItems;

//---------------------------------------------------end2

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, ListGroup, Button, Badge, Alert } from 'react-bootstrap';
import { FaArrowLeft, FaBarcode, FaEdit, FaBoxOpen, FaBox, FaCalendarAlt, FaTag, FaBuilding } from 'react-icons/fa';
import axios from 'axios';
import NotificationToast from '../../NotificationToast';

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

                console.log('Full API Response:', response.data);

                if (!response.data.success) {
                    throw new Error(response.data.error || 'Failed to fetch item');
                }

                const { data } = response.data;
                const { item: itemData, stockInfo: stockInfoData, hasStockAvailable: hasStockAvailableData, stockEntries: stockEntriesData } = data;

                console.log('Stock Info from API:', stockInfoData);
                console.log('Has Stock Available:', hasStockAvailableData);
                console.log('Stock Entries:', stockEntriesData);

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

                console.log('Processed Stock Info:', {
                    openingStock: stockInfoData?.openingStock,
                    openingStockValue: stockInfoData?.openingStockValue,
                    salesPrice: stockInfoData?.salesPrice,
                    purchasePrice: stockInfoData?.purchasePrice,
                    hasStockAvailable: hasStockAvailableData,
                    stockEntriesCount: stockEntriesData?.length || 0
                });

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
            
            // Check if trying to deactivate and stock is available
            if (newStatus === 'inactive' && hasStockAvailable) {
                setToast({
                    show: true,
                    message: `Cannot deactivate item - stock is available (${stockInfo.openingStock} units). Please remove all stock first.`,
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

    // Calculate total stock from stock entries
    const calculateTotalStock = () => {
        if (!stockEntries || stockEntries.length === 0) return 0;
        return stockEntries.reduce((total, entry) => total + (entry.quantity || 0), 0);
    };

    const totalStock = calculateTotalStock();

    if (loading) return (
        <Container className="mt-4">
            <div className="text-center">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                <p className="mt-2 small">Loading item details...</p>
            </div>
        </Container>
    );

    if (error) return (
        <Container className="mt-4">
            <Alert variant="danger" className="small p-2">
                {error}
            </Alert>
            <Button size="sm" variant="outline-primary" onClick={() => navigate(-1)}>
                <FaArrowLeft className="me-1" /> Back
            </Button>
        </Container>
    );

    if (!item) return (
        <Container className="mt-4">
            <Alert variant="warning" className="small p-2">Item not found</Alert>
            <Button size="sm" variant="outline-primary" onClick={() => navigate(-1)}>
                <FaArrowLeft className="me-1" /> Back
            </Button>
        </Container>
    );

    return (
        <Container className="mt-3">
            <NotificationToast
                show={toast.show}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, show: false })}
            />

            <Card className="shadow-sm p-3">
                <Card.Header className="text-center py-2">
                    <h5 className="mb-0 fw-bold">Item Details</h5>
                </Card.Header>

                <Card.Body className="p-2">
                    <Row>
                        <Col md={4}>
                            <h6 className="fw-bold mb-2">Basic Information</h6>
                            <ListGroup variant="flush" className="small">
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Name:</strong> <span className="ms-2">{item.name}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>HSN:</strong> <span className="ms-2">{item.hscode || ''}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2 d-flex align-items-center">
                                    <strong>VAT:</strong>
                                    <Badge bg={item.vatStatus === '13' ? 'success' : 'warning'} className="ms-2 py-1">
                                       {item.vatStatus === '13' ? '13%' : 'Exempt'}
                                    </Badge>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Main Unit:</strong> <span className="ms-2">{item.mainUnitName || ''}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>WS Unit:</strong> <span className="ms-2">{item.wsUnit || ''}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Unit:</strong> <span className="ms-2">{item.unitName || ''}</span>
                                </ListGroup.Item>
                            </ListGroup>
                        </Col>

                        <Col md={4}>
                            <h6 className="fw-bold mb-2">Pricing & Stock</h6>
                            <ListGroup variant="flush" className="small">
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Sales Price:</strong>
                                    <span className="ms-2 text-primary fw-bold">
                                        {stockInfo.salesPrice?.toFixed(2) || '0.00'}
                                    </span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Purchase Price:</strong>
                                    <span className="ms-2 text-success fw-bold">
                                        {stockInfo.purchasePrice?.toFixed(2) || '0.00'}
                                    </span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Op. Stock:</strong>
                                    <span className="ms-2 fw-bold">
                                        {stockInfo.openingStock || 0}
                                    </span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Op. Value:</strong>
                                    <span className="ms-2 fw-bold">
                                        {(stockInfo.openingStockValue || 0).toFixed(2)}
                                    </span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Reorder Qty:</strong> <span className="ms-2">{item.reorderLevel || ''} {item.unitName || ''}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Category:</strong> <span className="ms-2">{item.categoryName || ''}</span>
                                </ListGroup.Item>
                            </ListGroup>
                        </Col>

                        <Col md={4}>
                            <h6 className="fw-bold mb-2">Identification</h6>
                            <ListGroup variant="flush" className="small">
                                <ListGroup.Item className="py-1 px-2 d-flex align-items-center">
                                    <strong>Status:</strong>
                                    <Badge bg={item.status === 'active' ? 'success' : 'danger'} className="ms-2 py-1">
                                        {item.status?.toUpperCase() || 'UNKNOWN'}
                                    </Badge>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Barcode:</strong> <span className="ms-2">{item.barcodeNumber || ''}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Code:</strong> <span className="ms-2">{item.uniqueNumber || ''}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Company:</strong> <span className="ms-2">{item.itemsCompanyName || ''}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Created:</strong> <span className="ms-2">{new Date(item.createdAt).toLocaleDateString()}</span>
                                </ListGroup.Item>
                            </ListGroup>
                        </Col>
                    </Row>

                    <hr className="my-3" />

                    <Row>
                        {/* Left Column - Compositions and Status */}
                        <Col md={7}>
                            <Row className="mt-3">
                                <Col>
                                    <h6 className="fw-bold mb-2">Compositions</h6>
                                    <ListGroup variant="flush" className="small">
                                        {item.compositions && item.compositions.length > 0 ? (
                                            item.compositions.map(comp => (
                                                <ListGroup.Item key={comp.id || comp._id} className="py-1 px-2">
                                                    <Badge bg="secondary" className="me-2 py-1">
                                                        #{comp.uniqueNumber || ''}
                                                    </Badge>
                                                    {comp.name}
                                                </ListGroup.Item>
                                            ))
                                        ) : (
                                            <ListGroup.Item className="py-1 px-2 text-muted">
                                                No compositions assigned
                                            </ListGroup.Item>
                                        )}
                                    </ListGroup>
                                </Col>
                            </Row>

                            <Row className="mt-3">
                                <Col>
                                    {/* Stock Status Banner */}
                                    <Alert 
                                        variant={hasStockAvailable ? 'warning' : 'success'} 
                                        className="py-2 mb-0"
                                    >
                                        <div className="d-flex align-items-center">
                                            <FaBoxOpen className="me-2" />
                                            <span>
                                                {hasStockAvailable ? (
                                                    <span className="text-warning ms-1">
                                                        Stock available ({totalStock} {item.unitName || ''}) - Cannot deactivate item
                                                    </span>
                                                ) : (
                                                    <span className="text-success ms-1">
                                                        No stock available - Item can be deactivated
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </Alert>
                                </Col>
                            </Row>

                            <Row className="mt-3">
                                <Col>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <Button
                                            size="sm"
                                            variant={item.status === 'active' ? 'outline-danger' : 'outline-success'}
                                            onClick={toggleItemStatus}
                                            className="me-2"
                                            disabled={item.status === 'active' && hasStockAvailable}
                                            title={item.status === 'active' && hasStockAvailable ? `Cannot deactivate - stock is available (${totalStock} units)` : ""}
                                        >
                                            {item.status === 'active' ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <div>
                                            <Button
                                                size="sm"
                                                variant="outline-primary"
                                                onClick={() => navigate(-1)}
                                            >
                                                <FaArrowLeft className="me-1" /> Back
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {item.status === 'inactive' && hasStockAvailable && (
                                        <small className="text-muted d-block mb-2 text-warning">
                                            <i className="bi bi-exclamation-triangle me-1"></i>
                                            Item is inactive but has stock ({totalStock} units). 
                                            You can activate it anytime.
                                        </small>
                                    )}
                                    
                                    {item.status === 'inactive' && !hasStockAvailable && (
                                        <small className="text-muted d-block mb-2 text-info">
                                            <i className="bi bi-check-circle me-1"></i>
                                            Item is inactive and has no stock - can be activated anytime
                                        </small>
                                    )}
                                </Col>
                            </Row>
                        </Col>

                        {/* Right Column - Stock Entries Card */}
                        <Col md={5}>
                            {stockEntries && stockEntries.length > 0 && (
                                <Card className="mt-3 border-0 shadow-sm" style={{ background: '#f8f9fa' }}>
                                    <Card.Header className="bg-primary text-white py-2">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <h6 className="mb-0 fw-bold">
                                                <FaBox className="me-2" />
                                                Stock Entries
                                            </h6>
                                            <Badge bg="light" text="dark" className="fw-bold">
                                                {stockEntries.length} entries
                                            </Badge>
                                        </div>
                                    </Card.Header>
                                    <Card.Body className="p-0">
                                        <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            <table className="table table-sm table-hover mb-0">
                                                <thead className="table-light sticky-top">
                                                    <tr>
                                                        <th className="px-2 py-1">Batch</th>
                                                        <th className="px-2 py-1 text-end">Qty</th>
                                                        <th className="px-2 py-1 text-end">MRP</th>
                                                        <th className="px-2 py-1">Expiry</th>
                                                        <th className="px-2 py-1 text-center">Status</th>
                                                        <th className="px-2 py-1 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {stockEntries.map(entry => (
                                                        <tr key={entry.id}>
                                                            <td className="px-2 py-1">
                                                                <span className="badge bg-secondary">{entry.batchNumber || 'N/A'}</span>
                                                            </td>
                                                            <td className="px-2 py-1 text-end fw-bold">
                                                                {entry.quantity || 0}
                                                            </td>
                                                            <td className="px-2 py-1 text-end">
                                                                {(entry.mrp || 0).toFixed(2)}
                                                            </td>
                                                            <td className="px-2 py-1">
                                                                <small>
                                                                    <FaCalendarAlt className="me-1 text-muted" />
                                                                    {entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : 'N/A'}
                                                                </small>
                                                            </td>
                                                            <td className="px-2 py-1 text-center">
                                                                <Badge 
                                                                    bg={entry.expiryStatus === 'safe' ? 'success' : 
                                                                        entry.expiryStatus === 'warning' ? 'warning' : 
                                                                        entry.expiryStatus === 'danger' ? 'danger' : 'secondary'}
                                                                    className="px-2 py-1"
                                                                    style={{ fontSize: '10px' }}
                                                                >
                                                                    {entry.expiryStatus || 'Unknown'}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-2 py-1 text-center">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline-secondary"
                                                                    className="py-0 px-1"
                                                                    style={{ fontSize: '10px' }}
                                                                    onClick={() => handlePrintBarcode(entry)}
                                                                >
                                                                    <FaBarcode className="me-1" /> Print
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="table-primary">
                                                    <tr>
                                                        <td className="px-2 py-1"><strong>Total</strong></td>
                                                        <td className="px-2 py-1 text-end"><strong>{totalStock}</strong></td>
                                                        <td colSpan="4" className="px-2 py-1"></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </Card.Body>
                                    <Card.Footer className="bg-light py-1">
                                        <small className="text-muted">
                                            <FaTag className="me-1" />
                                            Total Stock: {totalStock} {item.unitName || 'units'}
                                        </small>
                                    </Card.Footer>
                                </Card>
                            )}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default ViewItems;