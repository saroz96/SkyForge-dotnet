// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import {
//     Container,
//     Card,
//     Row,
//     Col,
//     ListGroup,
//     Button,
//     Badge,
//     Modal,
//     Form,
//     Alert
// } from 'react-bootstrap';
// import { FaBarcode, FaArrowLeft } from 'react-icons/fa';
// import axios from 'axios';
// import NotificationToast from '../../NotificationToast';
// import ItemBarcode from './ItemBarcode';

// const ViewItems = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [item, setItem] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [toast, setToast] = useState({
//         show: false,
//         message: '',
//         type: 'success' // 'success' or 'error'
//     });
//     const [printSettings, setPrintSettings] = useState({
//         labelWidth: 70,
//         labelHeight: 40,
//         labelsPerRow: 3,
//         barcodeType: 'code128',
//         quantity: 1,
//         saveSettings: false
//     });
//     const [showPrintModal, setShowPrintModal] = useState(false);
//     const [currentPrintEntry, setCurrentPrintEntry] = useState(null);
//     // const [statusMessage, setStatusMessage] = useState('');

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     useEffect(() => {
//         const fetchItemData = async () => {
//             try {
//                 const itemResponse = await api.get(`/api/retailer/items/${id}`);
//                 if (!itemResponse.data || !itemResponse.data.data) {
//                     throw new Error('Item data not found in response');
//                 }

//                 const { data: responseData } = itemResponse.data;
//                 const { item, stockInfo } = responseData;

//                 // Use the already-processed stockInfo from the API
//                 const processedItem = {
//                     ...item,
//                     name: item.name || 'N/A',
//                     hscode: item.hscode || 'N/A',
//                     vatStatus: item.vatStatus || 'N/A',
//                     status: item.status || 'active',
//                     currentOpeningStock: {
//                         openingStock: stockInfo.openingStock || 0,
//                         openingStockValue: stockInfo.openingStockValue || '0.00',
//                         salesPrice: stockInfo.salesPrice || 0,
//                         purchasePrice: stockInfo.purchasePrice.toFixed(2) || '0.00'
//                     },
//                     stockEntries: item.stockEntries || [],
//                     printPreferences: responseData.printPreferences || {
//                         labelWidth: 70,
//                         labelHeight: 40,
//                         labelsPerRow: 3,
//                         barcodeType: 'code128',
//                         defaultQuantity: 1
//                     }
//                 };

//                 setItem(processedItem);
//                 setPrintSettings(prev => ({
//                     ...prev,
//                     ...processedItem.printPreferences
//                 }));
//             } catch (err) {
//                 setError(err.message || 'Failed to fetch item details');
//                 console.error('Fetch error:', err);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchItemData();
//     }, [id]);


//     const toggleItemStatus = async () => {
//         try {
//             const newStatus = item.status === 'active' ? 'inactive' : 'active';
//             const response = await api.post(`/api/retailer/items/${item._id}/status`, {
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
//             // setError(err.response?.data?.error || err.message || 'Failed to update status');
//             // Show error toast
//             setToast({
//                 show: true,
//                 message: err.response?.data?.error || err.message || 'Failed to update status',
//                 type: 'error'
//             });
//         }
//     };

//     const handlePrintBarcode = (entry) => {
//         setCurrentPrintEntry(entry);
//         setShowPrintModal(true);
//     };

//     const confirmPrint = () => {
//         const { labelWidth, labelHeight, labelsPerRow, barcodeType, quantity } = printSettings;
//         const printWindow = window.open('', '_blank');

//         printWindow.document.write(`
//             <html>
//             <head>
//                 <title>Barcode Labels</title>
//                 <style>
//                     @page { size: A4; margin: 0; }
//                     .label-grid {
//                         display: grid;
//                         grid-template-columns: repeat(${labelsPerRow}, 1fr);
//                         gap: 0.1in;
//                         padding: 0.25in;
//                     }
//                     .barcode-container {
//                         display: flex;
//                         flex-direction: column;
//                         align-items: center;
//                         page-break-inside: avoid;
//                         height: ${labelHeight * 0.0393701}in;
//                         padding: 0.1in;
//                     }
//                     .barcode-image {
//                         width: 100%;
//                         height: 70%;
//                         object-fit: contain;
//                     }
//                 </style>
//             </head>
//             <body>
//                 <div class="label-grid">
//                     ${Array.from({ length: quantity }, (_, i) => `
//                         <div class="barcode-container">
//                             <img src="/api/item/${item._id}/barcode/${currentPrintEntry._id}/${labelWidth}/${labelHeight}/${barcodeType}"
//                                 class="barcode-image"
//                                 onload="window.imagesLoaded = (window.imagesLoaded || 0) + 1">
//                             <div>${item.name}</div>
//                             <div>Batch: ${currentPrintEntry.batchNumber}</div>
//                             <div>MRP: ${currentPrintEntry.mrp.toFixed(2)}</div>
//                             <div>Exp: ${new Date(currentPrintEntry.expiryDate).toLocaleDateString()}</div>
//                         </div>
//                     `).join('')}
//                 </div>
//                 <script>
//                     let checkInterval = setInterval(() => {
//                         if (window.imagesLoaded >= ${quantity}) {
//                             clearInterval(checkInterval);
//                             window.print();
//                             setTimeout(() => window.close(), 500);
//                         }
//                     }, 100);
//                 <\/script>
//             </body>
//             </html>
//         `);
//         printWindow.document.close();

//         if (printSettings.saveSettings) {
//             api.post('/api/retailer/user/print-preferences', printSettings);
//         }

//         setShowPrintModal(false);
//     };

//     if (loading) return (
//         <Container className="mt-4">
//             <div className="text-center">Loading item details...</div>
//         </Container>
//     );

//     if (error) return (
//         <Container className="mt-4">
//             <Alert variant="danger">{error}</Alert>
//             <Button variant="primary" onClick={() => navigate(-1)}>
//                 <FaArrowLeft /> Back
//             </Button>
//         </Container>
//     );

//     if (!item) return (
//         <Container className="mt-4">
//             <Alert variant="warning">Item not found</Alert>
//             <Button variant="primary" onClick={() => navigate(-1)}>
//                 <FaArrowLeft /> Back
//             </Button>
//         </Container>
//     );

//     return (
//         <Container className="mt-4">
//             <NotificationToast
//                 show={toast.show}
//                 message={toast.message}
//                 type={toast.type}
//                 onClose={() => setToast({ ...toast, show: false })}
//             />

//             <Card className="shadow-lg p-4">
//                 <Card.Header className="text-center">
//                     <h2 style={{ textDecoration: 'underline' }}>Item Details</h2>
//                 </Card.Header>

//                 <Card.Body>
//                     <Row>
//                         <Col md={4}>
//                             <h5 className="card-title">Details:</h5>
//                             <ListGroup variant="flush">
//                                 <ListGroup.Item>
//                                     <strong>Name:</strong> {item.name}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>HSN:</strong> {item.hscode || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>VAT Status:</strong> {item.vatStatus || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Main Unit:</strong> {item.mainUnit?.name || 'No Main Unit'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>WS Unit:</strong> {item.WSUnit || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Unit:</strong> {item.unit?.name || 'No Unit'}
//                                 </ListGroup.Item>
//                             </ListGroup>
//                         </Col>

//                         <Col md={4}>
//                             <h5 className="card-title">ID: {item._id}</h5>
//                             <ListGroup variant="flush">
//                                 <ListGroup.Item>
//                                     <strong>Sales Price:</strong> {item.currentOpeningStock?.salesPrice?.toFixed(2) || '0.00'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Purchase Price:</strong> {item.currentOpeningStock?.purchasePrice || '0.00'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Opening Stock:</strong> {item.currentOpeningStock?.openingStock || 0}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Opening Stock Value:</strong> {item.currentOpeningStock?.openingStockValue || '0.00'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Re-Order Level:</strong> {item.reorderLevel || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Category:</strong> {item.category?.name || 'No Category'}
//                                 </ListGroup.Item>
//                             </ListGroup>
//                         </Col>

//                         <Col md={4}>
//                             <Button
//                                 variant={item.status === 'active' ? 'danger' : 'success'}
//                                 onClick={toggleItemStatus}
//                                 className="status-btn mb-3"
//                             >
//                                 {item.status === 'active' ? 'Deactivate' : 'Activate'}
//                             </Button>

//                             <ListGroup variant="flush">
//                                 <ListGroup.Item>
//                                     <strong>Status:</strong>{' '}
//                                     <Badge bg={item.status === 'active' ? 'success' : 'danger'}>
//                                         {item.status?.toUpperCase() || 'UNKNOWN'}
//                                     </Badge>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Barcode:</strong> {item.barcodeNumber || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Unique ID:</strong> {item.uniqueNumber || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Created:</strong> {new Date(item.createdAt).toLocaleDateString()}
//                                 </ListGroup.Item>
//                             </ListGroup>
//                         </Col>
//                     </Row>

//                     <hr />

//                     <Row>
//                         <h5 className="card-title"><strong>Composition: </strong></h5>
//                         <ListGroup variant="flush">
//                             {item.composition?.length > 0 ? (
//                                 item.composition.map(comp => (
//                                     <ListGroup.Item key={comp._id}>
//                                         {comp.uniqueNumber} - {comp.name}
//                                     </ListGroup.Item>
//                                 ))
//                             ) : (
//                                 <ListGroup.Item>No Composition</ListGroup.Item>
//                             )}
//                         </ListGroup>
//                     </Row>
//                 </Card.Body>

//                 <Col className="mb-3">
//                     <Button variant="primary" onClick={() => navigate(-1)}>
//                         <FaArrowLeft /> Back
//                     </Button>
//                 </Col>
//             </Card>
//             <ItemBarcode />
//         </Container>
//     );
// };

// export default ViewItems;

// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import {
//     Container,
//     Card,
//     Row,
//     Col,
//     ListGroup,
//     Button,
//     Badge,
//     Modal,
//     Form,
//     Alert
// } from 'react-bootstrap';
// import { FaBarcode, FaArrowLeft } from 'react-icons/fa';
// import axios from 'axios';
// import NotificationToast from '../../NotificationToast';
// import ItemBarcode from './ItemBarcode';

// const ViewItems = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [item, setItem] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [toast, setToast] = useState({
//         show: false,
//         message: '',
//         type: 'success' // 'success' or 'error'
//     });
//     const [printSettings, setPrintSettings] = useState({
//         labelWidth: 70,
//         labelHeight: 40,
//         labelsPerRow: 3,
//         barcodeType: 'code128',
//         quantity: 1,
//         saveSettings: false
//     });
//     const [showPrintModal, setShowPrintModal] = useState(false);
//     const [currentPrintEntry, setCurrentPrintEntry] = useState(null);
//     const [hasTransactions, setHasTransactions] = useState(false);
//     const [stockInfo, setStockInfo] = useState({
//         openingStock: 0,
//         openingStockValue: 0,
//         salesPrice: 0,
//         purchasePrice: 0
//     });

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     useEffect(() => {
//         const fetchItemData = async () => {
//             try {
//                 setLoading(true);
//                 const itemResponse = await api.get(`/api/retailer/items/${id}`);
                
//                 // Check the response structure
//                 console.log('API Response:', itemResponse.data);
                
//                 if (!itemResponse.data || !itemResponse.data.success) {
//                     throw new Error(itemResponse.data?.error || 'Failed to fetch item');
//                 }

//                 const { data: responseData } = itemResponse.data;
//                 console.log('Response Data:', responseData);

//                 // Extract data from the nested structure
//                 const { item: itemData, stockInfo, hasTransactions, printPreferences } = responseData;

//                 // Map the data to match frontend expectations
//                 const processedItem = {
//                     _id: itemData.id,
//                     id: itemData.id,
//                     name: itemData.name || 'N/A',
//                     hscode: itemData.hscode || 'N/A',
//                     vatStatus: itemData.vatStatus || 'N/A',
//                     status: itemData.status || 'active',
//                     price: itemData.price || 0,
//                     puPrice: itemData.puPrice || 0,
//                     mainUnitPuPrice: itemData.mainUnitPuPrice || 0,
//                     mainUnitId: itemData.mainUnitId,
//                     mainUnitName: itemData.mainUnitName,
//                     wsUnit: itemData.wsUnit || 0,
//                     unitId: itemData.unitId,
//                     unitName: itemData.unitName,
//                     openingStock: itemData.openingStock || 0,
//                     reorderLevel: itemData.reorderLevel || 0,
//                     uniqueNumber: itemData.uniqueNumber || 'N/A',
//                     barcodeNumber: itemData.barcodeNumber || 'N/A',
//                     categoryId: itemData.categoryId,
//                     categoryName: itemData.categoryName,
//                     itemsCompanyId: itemData.itemsCompanyId,
//                     itemsCompanyName: itemData.itemsCompanyName,
//                     createdAt: itemData.createdAt,
//                     updatedAt: itemData.updatedAt,
//                     // Handle compositions - they should be in itemData.compositions
//                     compositions: itemData.compositions || [],
//                     // Handle stock entries - they should be in itemData.stockEntries
//                     stockEntries: itemData.stockEntries || [],
//                     // Handle opening stock by fiscal year
//                     openingStockByFiscalYear: itemData.openingStockByFiscalYear || []
//                 };

//                 setItem(processedItem);
//                 setStockInfo(stockInfo || {
//                     openingStock: 0,
//                     openingStockValue: 0,
//                     salesPrice: 0,
//                     purchasePrice: 0
//                 });
//                 setHasTransactions(hasTransactions || false);
                
//                 // Update print settings with preferences from API
//                 if (printPreferences) {
//                     setPrintSettings(prev => ({
//                         ...prev,
//                         ...printPreferences,
//                         quantity: printPreferences.defaultQuantity || 1
//                     }));
//                 }

//             } catch (err) {
//                 console.error('Fetch error:', err);
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
//         setCurrentPrintEntry(entry);
//         setShowPrintModal(true);
//     };

//     const confirmPrint = () => {
//         if (!currentPrintEntry || !item) return;

//         const { labelWidth, labelHeight, labelsPerRow, barcodeType, quantity } = printSettings;
//         const printWindow = window.open('', '_blank');

//         // Note: Update the barcode URL to match your backend
//         const barcodeUrl = `/item/${item._id}/barcode/${currentPrintEntry.id}/${labelWidth}/${labelHeight}/${barcodeType}`;
        
//         printWindow.document.write(`
//             <html>
//             <head>
//                 <title>Barcode Labels</title>
//                 <style>
//                     @page { size: A4; margin: 0; }
//                     .label-grid {
//                         display: grid;
//                         grid-template-columns: repeat(${labelsPerRow}, 1fr);
//                         gap: 0.1in;
//                         padding: 0.25in;
//                     }
//                     .barcode-container {
//                         display: flex;
//                         flex-direction: column;
//                         align-items: center;
//                         page-break-inside: avoid;
//                         height: ${labelHeight * 0.0393701}in;
//                         padding: 0.1in;
//                         border: 1px solid #ccc;
//                     }
//                     .barcode-image {
//                         width: 100%;
//                         height: 70%;
//                         object-fit: contain;
//                     }
//                     .item-info {
//                         font-size: 10px;
//                         text-align: center;
//                         margin-top: 5px;
//                     }
//                 </style>
//             </head>
//             <body>
//                 <div class="label-grid">
//                     ${Array.from({ length: quantity }, (_, i) => `
//                         <div class="barcode-container">
//                             <img src="${barcodeUrl}"
//                                 class="barcode-image"
//                                 onload="window.imagesLoaded = (window.imagesLoaded || 0) + 1"
//                                 alt="Barcode">
//                             <div class="item-info">
//                                 <div><strong>${item.name}</strong></div>
//                                 <div>Batch: ${currentPrintEntry.batchNumber || 'N/A'}</div>
//                                 <div>MRP: ${(currentPrintEntry.mrp || 0).toFixed(2)}</div>
//                                 <div>Exp: ${currentPrintEntry.expiryDate ? new Date(currentPrintEntry.expiryDate).toLocaleDateString() : 'N/A'}</div>
//                             </div>
//                         </div>
//                     `).join('')}
//                 </div>
//                 <script>
//                     let imagesLoaded = 0;
//                     const totalImages = ${quantity};
                    
//                     const checkImages = setInterval(() => {
//                         if (imagesLoaded >= totalImages) {
//                             clearInterval(checkImages);
//                             window.print();
//                             setTimeout(() => window.close(), 500);
//                         }
//                     }, 100);
                    
//                     // Count loaded images
//                     const images = document.getElementsByTagName('img');
//                     for (let img of images) {
//                         img.onload = () => {
//                             imagesLoaded++;
//                         };
//                         img.onerror = () => {
//                             imagesLoaded++; // Count errors too to avoid infinite loop
//                         };
//                     }
//                 <\/script>
//             </body>
//             </html>
//         `);
//         printWindow.document.close();

//         // Save print settings if enabled
//         if (printSettings.saveSettings) {
//             api.post('/api/retailer/user/print-preferences', printSettings)
//                 .catch(err => console.error('Failed to save print preferences:', err));
//         }

//         setShowPrintModal(false);
//     };

//     // Modal for print settings
//     const PrintSettingsModal = () => (
//         <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)}>
//             <Modal.Header closeButton>
//                 <Modal.Title>Print Barcode Labels</Modal.Title>
//             </Modal.Header>
//             <Modal.Body>
//                 <Form>
//                     <Form.Group className="mb-3">
//                         <Form.Label>Label Width (mm)</Form.Label>
//                         <Form.Control
//                             type="number"
//                             value={printSettings.labelWidth}
//                             onChange={(e) => setPrintSettings(prev => ({ ...prev, labelWidth: parseInt(e.target.value) }))}
//                             min="20"
//                             max="200"
//                         />
//                     </Form.Group>
//                     <Form.Group className="mb-3">
//                         <Form.Label>Label Height (mm)</Form.Label>
//                         <Form.Control
//                             type="number"
//                             value={printSettings.labelHeight}
//                             onChange={(e) => setPrintSettings(prev => ({ ...prev, labelHeight: parseInt(e.target.value) }))}
//                             min="20"
//                             max="200"
//                         />
//                     </Form.Group>
//                     <Form.Group className="mb-3">
//                         <Form.Label>Labels Per Row</Form.Label>
//                         <Form.Control
//                             type="number"
//                             value={printSettings.labelsPerRow}
//                             onChange={(e) => setPrintSettings(prev => ({ ...prev, labelsPerRow: parseInt(e.target.value) }))}
//                             min="1"
//                             max="6"
//                         />
//                     </Form.Group>
//                     <Form.Group className="mb-3">
//                         <Form.Label>Barcode Type</Form.Label>
//                         <Form.Select
//                             value={printSettings.barcodeType}
//                             onChange={(e) => setPrintSettings(prev => ({ ...prev, barcodeType: e.target.value }))}
//                         >
//                             <option value="code128">Code 128</option>
//                             <option value="code39">Code 39</option>
//                             <option value="qr">QR Code</option>
//                         </Form.Select>
//                     </Form.Group>
//                     <Form.Group className="mb-3">
//                         <Form.Label>Quantity</Form.Label>
//                         <Form.Control
//                             type="number"
//                             value={printSettings.quantity}
//                             onChange={(e) => setPrintSettings(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
//                             min="1"
//                             max="100"
//                         />
//                     </Form.Group>
//                     <Form.Check
//                         type="checkbox"
//                         label="Save these settings"
//                         checked={printSettings.saveSettings}
//                         onChange={(e) => setPrintSettings(prev => ({ ...prev, saveSettings: e.target.checked }))}
//                     />
//                 </Form>
//             </Modal.Body>
//             <Modal.Footer>
//                 <Button variant="secondary" onClick={() => setShowPrintModal(false)}>
//                     Cancel
//                 </Button>
//                 <Button variant="primary" onClick={confirmPrint}>
//                     Print
//                 </Button>
//             </Modal.Footer>
//         </Modal>
//     );

//     if (loading) return (
//         <Container className="mt-4">
//             <div className="text-center">
//                 <div className="spinner-border text-primary" role="status">
//                     <span className="visually-hidden">Loading...</span>
//                 </div>
//                 <p className="mt-2">Loading item details...</p>
//             </div>
//         </Container>
//     );

//     if (error) return (
//         <Container className="mt-4">
//             <Alert variant="danger">
//                 <Alert.Heading>Error</Alert.Heading>
//                 <p>{error}</p>
//             </Alert>
//             <Button variant="primary" onClick={() => navigate(-1)}>
//                 <FaArrowLeft /> Back
//             </Button>
//         </Container>
//     );

//     if (!item) return (
//         <Container className="mt-4">
//             <Alert variant="warning">Item not found</Alert>
//             <Button variant="primary" onClick={() => navigate(-1)}>
//                 <FaArrowLeft /> Back
//             </Button>
//         </Container>
//     );

//     return (
//         <Container className="mt-4">
//             <NotificationToast
//                 show={toast.show}
//                 message={toast.message}
//                 type={toast.type}
//                 onClose={() => setToast({ ...toast, show: false })}
//             />

//             <PrintSettingsModal />

//             <Card className="shadow-lg p-4 mb-4">
//                 <Card.Header className="text-center bg-primary text-white">
//                     <h2 style={{ textDecoration: 'underline' }}>Item Details</h2>
//                 </Card.Header>

//                 <Card.Body>
//                     <Row>
//                         <Col md={4}>
//                             <h5 className="card-title text-primary">Basic Information</h5>
//                             <ListGroup variant="flush">
//                                 <ListGroup.Item>
//                                     <strong>Name:</strong> {item.name}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>HSN Code:</strong> {item.hscode || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>VAT Status:</strong> {' '}
//                                     <Badge bg={item.vatStatus === 'vatable' ? 'success' : 'warning'}>
//                                         {item.vatStatus === 'vatable' ? '13%' : 'Exempt'}
//                                     </Badge>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Main Unit:</strong> {item.mainUnitName || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>WS Unit:</strong> {item.wsUnit || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Unit:</strong> {item.unitName || 'N/A'}
//                                 </ListGroup.Item>
//                             </ListGroup>
//                         </Col>

//                         <Col md={4}>
//                             <h5 className="card-title text-primary">Pricing & Stock</h5>
//                             <ListGroup variant="flush">
//                                 <ListGroup.Item>
//                                     <strong>Sales Price:</strong> {item.price?.toFixed(2) || '0.00'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Purchase Price:</strong> {item.puPrice?.toFixed(2) || '0.00'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Opening Stock:</strong> {stockInfo.openingStock || 0}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Opening Value:</strong> {(stockInfo.openingStockValue || 0).toFixed(2)}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Reorder Level:</strong> {item.reorderLevel || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Category:</strong> {item.categoryName || 'N/A'}
//                                 </ListGroup.Item>
//                             </ListGroup>
//                         </Col>

//                         <Col md={4}>
//                             <h5 className="card-title text-primary">Identification</h5>
//                             <div className="mb-3">
//                                 <Button
//                                     variant={item.status === 'active' ? 'danger' : 'success'}
//                                     onClick={toggleItemStatus}
//                                     className="w-100 mb-2"
//                                     disabled={hasTransactions}
//                                     title={hasTransactions ? "Cannot change status - item has transactions" : ""}
//                                 >
//                                     {item.status === 'active' ? 'Deactivate Item' : 'Activate Item'}
//                                 </Button>
//                                 {hasTransactions && (
//                                     <small className="text-muted d-block">
//                                         <i className="bi bi-info-circle"></i> Status cannot be changed because this item has transactions
//                                     </small>
//                                 )}
//                             </div>
//                             <ListGroup variant="flush">
//                                 <ListGroup.Item>
//                                     <strong>Status:</strong>{' '}
//                                     <Badge bg={item.status === 'active' ? 'success' : 'danger'}>
//                                         {item.status?.toUpperCase() || 'UNKNOWN'}
//                                     </Badge>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Barcode:</strong> {item.barcodeNumber || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Unique Number:</strong> {item.uniqueNumber || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Company:</strong> {item.itemsCompanyName || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Created:</strong> {new Date(item.createdAt).toLocaleDateString()}
//                                 </ListGroup.Item>
//                             </ListGroup>
//                         </Col>
//                     </Row>

//                     <hr />

//                     <Row className="mt-3">
//                         <Col>
//                             <h5 className="card-title text-primary">
//                                 <strong>Compositions</strong>
//                             </h5>
//                             <ListGroup variant="flush">
//                                 {item.compositions && item.compositions.length > 0 ? (
//                                     item.compositions.map(comp => (
//                                         <ListGroup.Item key={comp.id || comp._id}>
//                                             <Badge bg="secondary" className="me-2">
//                                                 #{comp.uniqueNumber || 'N/A'}
//                                             </Badge>
//                                             {comp.name}
//                                         </ListGroup.Item>
//                                     ))
//                                 ) : (
//                                     <ListGroup.Item className="text-muted">No compositions assigned</ListGroup.Item>
//                                 )}
//                             </ListGroup>
//                         </Col>
//                     </Row>

//                     <Row className="mt-3">
//                         <Col>
//                             <h5 className="card-title text-primary">
//                                 <strong>Stock Entries</strong>
//                                 <Button
//                                     variant="outline-primary"
//                                     size="sm"
//                                     className="ms-2"
//                                     onClick={() => navigate(`/retailer/items/${item._id}/stock-entries`)}
//                                 >
//                                     Manage Stock
//                                 </Button>
//                             </h5>
//                             {item.stockEntries && item.stockEntries.length > 0 ? (
//                                 <div className="table-responsive">
//                                     <table className="table table-sm table-hover">
//                                         <thead>
//                                             <tr>
//                                                 <th>Batch #</th>
//                                                 <th>Quantity</th>
//                                                 <th>Purchase Price</th>
//                                                 <th>MRP</th>
//                                                 <th>Expiry Date</th>
//                                                 <th>Actions</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {item.stockEntries.map(entry => (
//                                                 <tr key={entry.id || entry._id}>
//                                                     <td>{entry.batchNumber || 'N/A'}</td>
//                                                     <td>{entry.quantity || 0}</td>
//                                                     <td>{(entry.puPrice || 0).toFixed(2)}</td>
//                                                     <td>{(entry.mrp || 0).toFixed(2)}</td>
//                                                     <td>{entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : 'N/A'}</td>
//                                                     <td>
//                                                         <Button
//                                                             variant="outline-success"
//                                                             size="sm"
//                                                             onClick={() => handlePrintBarcode(entry)}
//                                                             title="Print Barcode"
//                                                         >
//                                                             <FaBarcode />
//                                                         </Button>
//                                                     </td>
//                                                 </tr>
//                                             ))}
//                                         </tbody>
//                                     </table>
//                                 </div>
//                             ) : (
//                                 <Alert variant="info">
//                                     No stock entries found. Add stock entries to track inventory.
//                                 </Alert>
//                             )}
//                         </Col>
//                     </Row>
//                 </Card.Body>

//                 <Card.Footer className="d-flex justify-content-between">
//                     <Button variant="primary" onClick={() => navigate(-1)}>
//                         <FaArrowLeft /> Back to Items
//                     </Button>
//                     <div>
//                         <Button 
//                             variant="warning" 
//                             onClick={() => navigate(`/retailer/items/${item._id}/edit`)}
//                             className="me-2"
//                         >
//                             Edit Item
//                         </Button>
//                         <Button 
//                             variant="info"
//                             onClick={() => navigate(`/retailer/items/${item._id}/stock-entries`)}
//                         >
//                             Manage Stock
//                         </Button>
//                     </div>
//                 </Card.Footer>
//             </Card>
            
//             <ItemBarcode itemId={item._id} />
//         </Container>
//     );
// };

// export default ViewItems;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, ListGroup, Button, Badge, Alert } from 'react-bootstrap';
import { FaArrowLeft, FaBarcode, FaEdit, FaBoxOpen } from 'react-icons/fa';
import axios from 'axios';
import NotificationToast from '../../NotificationToast';

const ViewItems = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [hasTransactions, setHasTransactions] = useState(false);
    const [stockInfo, setStockInfo] = useState({
        openingStock: 0,
        openingStockValue: 0,
        salesPrice: 0,
        purchasePrice: 0
    });

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
                const { item: itemData, stockInfo, hasTransactions } = data;

                const processedItem = {
                    _id: itemData.id,
                    id: itemData.id,
                    name: itemData.name || 'N/A',
                    hscode: itemData.hscode || 'N/A',
                    vatStatus: itemData.vatStatus || 'N/A',
                    status: itemData.status || 'active',
                    price: itemData.price || 0,
                    puPrice: itemData.puPrice || 0,
                    mainUnitName: itemData.mainUnitName,
                    wsUnit: itemData.wsUnit || 0,
                    unitName: itemData.unitName,
                    openingStock: itemData.openingStock || 0,
                    reorderLevel: itemData.reorderLevel || 0,
                    uniqueNumber: itemData.uniqueNumber || 'N/A',
                    barcodeNumber: itemData.barcodeNumber || 'N/A',
                    categoryName: itemData.categoryName,
                    itemsCompanyName: itemData.itemsCompanyName,
                    createdAt: itemData.createdAt,
                    updatedAt: itemData.updatedAt,
                    compositions: itemData.compositions || [],
                    stockEntries: itemData.stockEntries || []
                };

                setItem(processedItem);
                setStockInfo(stockInfo || {
                    openingStock: 0,
                    openingStockValue: 0,
                    salesPrice: 0,
                    purchasePrice: 0
                });
                setHasTransactions(hasTransactions || false);

            } catch (err) {
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
                        <div>Batch: ${entry.batchNumber || 'N/A'}</div>
                        <div>MRP: ${(entry.mrp || 0).toFixed(2)}</div>
                        <div>Exp: ${entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : 'N/A'}</div>
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
                                    <strong>HSN Code:</strong> <span className="ms-2">{item.hscode || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2 d-flex align-items-center">
                                    <strong>VAT Status:</strong>
                                    <Badge bg={item.vatStatus === 'vatable' ? 'success' : 'warning'} className="ms-2 py-1">
                                        {item.vatStatus === 'vatable' ? '13%' : 'Exempt'}
                                    </Badge>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Main Unit:</strong> <span className="ms-2">{item.mainUnitName || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>WS Unit:</strong> <span className="ms-2">{item.wsUnit || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Unit:</strong> <span className="ms-2">{item.unitName || 'N/A'}</span>
                                </ListGroup.Item>
                            </ListGroup>
                        </Col>

                        <Col md={4}>
                            <h6 className="fw-bold mb-2">Pricing & Stock</h6>
                            <ListGroup variant="flush" className="small">
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Sales Price:</strong> <span className="ms-2">{item.price?.toFixed(2) || '0.00'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Purchase Price:</strong> <span className="ms-2">{item.puPrice?.toFixed(2) || '0.00'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Opening Stock:</strong> <span className="ms-2">{stockInfo.openingStock || 0}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Opening Value:</strong> <span className="ms-2">{(stockInfo.openingStockValue || 0).toFixed(2)}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Reorder Level:</strong> <span className="ms-2">{item.reorderLevel || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Category:</strong> <span className="ms-2">{item.categoryName || 'N/A'}</span>
                                </ListGroup.Item>
                            </ListGroup>
                        </Col>

                        <Col md={4}>
                            <h6 className="fw-bold mb-2">Identification</h6>
                            <div className="mb-3">
                                <Button
                                    size="sm"
                                    variant={item.status === 'active' ? 'danger' : 'success'}
                                    onClick={toggleItemStatus}
                                    className="w-100 mb-2"
                                    disabled={hasTransactions}
                                    title={hasTransactions ? "Cannot change status - item has transactions" : ""}
                                >
                                    {item.status === 'active' ? 'Deactivate Item' : 'Activate Item'}
                                </Button>
                                {hasTransactions && (
                                    <small className="text-muted d-block">
                                        <i className="bi bi-info-circle me-1"></i>Status cannot be changed (has transactions)
                                    </small>
                                )}
                            </div>
                            <ListGroup variant="flush" className="small">
                                <ListGroup.Item className="py-1 px-2 d-flex align-items-center">
                                    <strong>Status:</strong>
                                    <Badge bg={item.status === 'active' ? 'success' : 'danger'} className="ms-2 py-1">
                                        {item.status?.toUpperCase() || 'UNKNOWN'}
                                    </Badge>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Barcode:</strong> <span className="ms-2">{item.barcodeNumber || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Unique Number:</strong> <span className="ms-2">{item.uniqueNumber || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Company:</strong> <span className="ms-2">{item.itemsCompanyName || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Created:</strong> <span className="ms-2">{new Date(item.createdAt).toLocaleDateString()}</span>
                                </ListGroup.Item>
                            </ListGroup>
                        </Col>
                    </Row>

                    <hr className="my-3" />

                    <Row className="mt-3">
                         <Button size="sm" variant="outline-primary" onClick={() => navigate(-1)} className="d-flex align-items-center">
                        <FaArrowLeft className="me-1" /> Back
                    </Button>
                        <Col>
                            <h6 className="fw-bold mb-2">Compositions</h6>
                            <ListGroup variant="flush" className="small">
                                {item.compositions && item.compositions.length > 0 ? (
                                    item.compositions.map(comp => (
                                        <ListGroup.Item key={comp.id || comp._id} className="py-1 px-2">
                                            <Badge bg="secondary" className="me-2 py-1">
                                                #{comp.uniqueNumber || 'N/A'}
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
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="fw-bold mb-0">Stock Entries</h6>
                            </div>
                            {item.stockEntries && item.stockEntries.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-sm table-hover mb-0">
                                        <thead>
                                            <tr>
                                                <th>Batch #</th>
                                                <th>Quantity</th>
                                                <th>Purchase Price</th>
                                                <th>MRP</th>
                                                <th>Expiry Date</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {item.stockEntries.map(entry => (
                                                <tr key={entry.id || entry._id}>
                                                    <td>{entry.batchNumber || 'N/A'}</td>
                                                    <td>{entry.quantity || 0}</td>
                                                    <td>{(entry.puPrice || 0).toFixed(2)}</td>
                                                    <td>{(entry.mrp || 0).toFixed(2)}</td>
                                                    <td>{entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : 'N/A'}</td>
                                                    <td>
                                                        <Button
                                                            size="sm"
                                                            variant="outline-success"
                                                            onClick={() => handlePrintBarcode(entry)}
                                                            title="Print Barcode"
                                                        >
                                                            <FaBarcode />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <Alert variant="info" className="small p-2">
                                    No stock entries found. Add stock entries to track inventory.
                                </Alert>
                            )}
                        </Col>
                    </Row>
                </Card.Body>

                {/* <Card.Footer className="p-2 d-flex justify-content-between">
                    <Button size="sm" variant="outline-primary" onClick={() => navigate(-1)} className="d-flex align-items-center">
                        <FaArrowLeft className="me-1" /> Back to Items
                    </Button>
                </Card.Footer> */}
            </Card>
        </Container>
    );
};

export default ViewItems;