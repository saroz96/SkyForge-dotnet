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