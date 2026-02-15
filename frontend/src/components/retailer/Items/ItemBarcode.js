import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Card,
    Row,
    Col,
    ListGroup,
    Button,
    Badge,
    Modal,
    Form,
    Alert,
    Table
} from 'react-bootstrap';
import { FaBarcode, FaArrowLeft, FaPrint, FaDownload, FaCopy } from 'react-icons/fa';
import { FiSettings } from 'react-icons/fi';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import NotificationToast from '../../NotificationToast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const ItemBarcode = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showBatchSelectModal, setShowBatchSelectModal] = useState(false);
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [barcodePreferences, setBarcodePreferences] = useState({
        labelWidth: 70,
        labelHeight: 40,
        labelsPerRow: 3,
        barcodeType: 'code128',
        quantity: 1,
        includeItemName: true,
        includePrice: true,
        includeBatch: true,
        includeExpiry: true,
        fontSize: 12,
        border: true,
        saveSettings: false,
        paperSize: 'A4',
        orientation: 'portrait',
        margin: 10
    });
    const [previewLabels, setPreviewLabels] = useState([]);
    const barcodeCanvasRef = useRef(null);
    const labelPreviewRef = useRef(null);
    const [printMode, setPrintMode] = useState('single'); // 'single' or 'batch'
    const [currentPrintEntry, setCurrentPrintEntry] = useState(null);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    useEffect(() => {
        const fetchItemData = async () => {
            try {
                const itemResponse = await api.get(`/api/retailer/items/${id}`);
                if (!itemResponse.data || !itemResponse.data.data) {
                    throw new Error('Item data not found in response');
                }

                const { data: responseData } = itemResponse.data;
                const { item, stockInfo, printPreferences } = responseData;

                // Load saved preferences
                const savedPrefs = await loadSavedPreferences();
                
                setItem({
                    ...item,
                    name: item.name || 'N/A',
                    stockEntries: item.stockEntries || [],
                    barcodeNumber: item.barcodeNumber,
                    currentOpeningStock: stockInfo || {}
                });

                setBarcodePreferences(prev => ({
                    ...prev,
                    ...printPreferences,
                    ...savedPrefs
                }));

            } catch (err) {
                setError(err.message || 'Failed to fetch item details');
                console.error('Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchItemData();
    }, [id]);

    // Load saved preferences from localStorage
    const loadSavedPreferences = () => {
        try {
            const saved = localStorage.getItem('barcodePreferences');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading preferences:', error);
            return {};
        }
    };

    // Save preferences to localStorage
    const savePreferences = (prefs) => {
        try {
            localStorage.setItem('barcodePreferences', JSON.stringify(prefs));
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    };

    // Generate barcode image
    const generateBarcodeImage = (barcodeNumber, type = 'code128') => {
        const canvas = document.createElement('canvas');
        
        JsBarcode(canvas, barcodeNumber.toString(), {
            format: type,
            width: 2,
            height: 50,
            displayValue: false,
            margin: 10,
            background: '#ffffff',
            lineColor: '#000000'
        });
        
        return canvas.toDataURL('image/png');
    };

    // Generate QR code image
    const generateQRCodeImage = (data) => {
        const canvas = document.createElement('canvas');
        const qrCode = new QRCodeSVG({
            value: data,
            size: 128,
            level: 'H',
            includeMargin: true
        });
        // Convert QRCodeSVG to canvas (simplified)
        return qrCode.toString();
    };

    // Create label data for preview
    const createLabelData = (entry, index) => {
        const barcodeData = `${item.name}|${item.barcodeNumber}|${entry.batchNumber || 'N/A'}|${entry.mrp || 0}|${entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : 'N/A'}`;
        
        return {
            id: `${entry._id}_${index}`,
            itemName: item.name,
            barcodeNumber: item.barcodeNumber,
            batchNumber: entry.batchNumber || 'N/A',
            mrp: entry.mrp || 0,
            expiryDate: entry.expiryDate,
            wsUnit: entry.WSUnit || 1,
            barcodeImage: barcodePreferences.barcodeType === 'qr' 
                ? generateQRCodeImage(barcodeData)
                : generateBarcodeImage(item.barcodeNumber, barcodePreferences.barcodeType),
            barcodeData
        };
    };

    // Generate preview labels
    const generatePreview = () => {
        if (!item || !currentPrintEntry) return;

        const labels = [];
        const totalLabels = barcodePreferences.quantity;
        
        for (let i = 0; i < totalLabels; i++) {
            labels.push(createLabelData(currentPrintEntry, i));
        }
        
        setPreviewLabels(labels);
    };

    // Batch selection handler
    const handleBatchSelection = (entry) => {
        setSelectedBatches(prev => {
            const exists = prev.find(b => b._id === entry._id);
            if (exists) {
                return prev.filter(b => b._id !== entry._id);
            } else {
                return [...prev, entry];
            }
        });
    };

    // Select all batches
    const selectAllBatches = () => {
        if (selectedBatches.length === item.stockEntries.length) {
            setSelectedBatches([]);
        } else {
            setSelectedBatches([...item.stockEntries]);
        }
    };

    // Print single batch
    const handlePrintSingle = (entry) => {
        setCurrentPrintEntry(entry);
        setPrintMode('single');
        generatePreview();
        setShowPrintModal(true);
    };

    // Print multiple batches
    const handlePrintMultiple = () => {
        if (selectedBatches.length === 0) {
            setToast({
                show: true,
                message: 'Please select at least one batch',
                type: 'error'
            });
            return;
        }
        
        setPrintMode('batch');
        // Generate preview for all selected batches
        const allLabels = [];
        selectedBatches.forEach((entry, entryIndex) => {
            for (let i = 0; i < barcodePreferences.quantity; i++) {
                allLabels.push(createLabelData(entry, `${entryIndex}_${i}`));
            }
        });
        setPreviewLabels(allLabels);
        setShowPrintModal(true);
    };

    // Export labels as PDF
    const exportAsPDF = async () => {
        const pdf = new jsPDF({
            orientation: barcodePreferences.orientation,
            unit: 'mm',
            format: barcodePreferences.paperSize.toLowerCase()
        });

        const margin = barcodePreferences.margin;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const usableWidth = pageWidth - (2 * margin);
        const usableHeight = pageHeight - (2 * margin);
        
        const labelWidth = barcodePreferences.labelWidth;
        const labelHeight = barcodePreferences.labelHeight;
        const labelsPerRow = barcodePreferences.labelsPerRow;
        
        const cols = labelsPerRow;
        const rows = Math.floor(usableHeight / (labelHeight + 2));
        
        let currentRow = 0;
        let currentCol = 0;
        let currentPage = 1;

        for (let i = 0; i < previewLabels.length; i++) {
            if (currentRow >= rows) {
                pdf.addPage();
                currentPage++;
                currentRow = 0;
                currentCol = 0;
            }

            const x = margin + (currentCol * (labelWidth + 2));
            const y = margin + (currentRow * (labelHeight + 2));
            
            // Create label container
            pdf.rect(x, y, labelWidth, labelHeight);
            
            // Add barcode image
            const barcodeImg = new Image();
            barcodeImg.src = previewLabels[i].barcodeImage;
            
            await new Promise(resolve => {
                barcodeImg.onload = () => {
                    pdf.addImage(
                        barcodeImg,
                        'PNG',
                        x + 5,
                        y + 5,
                        labelWidth - 10,
                        20
                    );
                    resolve();
                };
            });

            // Add text data
            let textY = y + 30;
            const fontSize = barcodePreferences.fontSize;
            
            if (barcodePreferences.includeItemName) {
                pdf.setFontSize(fontSize - 2);
                pdf.text(previewLabels[i].itemName.substring(0, 20), x + 5, textY);
                textY += 5;
            }
            
            if (barcodePreferences.includeBatch) {
                pdf.setFontSize(fontSize - 2);
                pdf.text(`Batch: ${previewLabels[i].batchNumber}`, x + 5, textY);
                textY += 5;
            }
            
            if (barcodePreferences.includePrice) {
                pdf.setFontSize(fontSize);
                pdf.text(`MRP: ₹${previewLabels[i].mrp.toFixed(2)}`, x + 5, textY);
                textY += 5;
            }
            
            if (barcodePreferences.includeExpiry && previewLabels[i].expiryDate) {
                pdf.setFontSize(fontSize - 2);
                pdf.text(`Exp: ${new Date(previewLabels[i].expiryDate).toLocaleDateString()}`, x + 5, textY);
            }

            currentCol++;
            if (currentCol >= cols) {
                currentCol = 0;
                currentRow++;
            }
        }

        pdf.save(`barcode-labels-${item.name}-${new Date().toISOString().slice(0,10)}.pdf`);
    };

    // Print directly
    const printDirectly = () => {
        const printContent = document.getElementById('print-content');
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Barcode Labels</title>
                <style>
                    @page {
                        size: ${barcodePreferences.paperSize} ${barcodePreferences.orientation};
                        margin: ${barcodePreferences.margin}mm;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: Arial, sans-serif;
                    }
                    .label-grid {
                        display: grid;
                        grid-template-columns: repeat(${barcodePreferences.labelsPerRow}, ${barcodePreferences.labelWidth}mm);
                        grid-gap: 2mm;
                        width: 100%;
                    }
                    .label {
                        width: ${barcodePreferences.labelWidth}mm;
                        height: ${barcodePreferences.labelHeight}mm;
                        border: ${barcodePreferences.border ? '1px solid #000' : 'none'};
                        padding: 2mm;
                        box-sizing: border-box;
                        page-break-inside: avoid;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                    }
                    .barcode-img {
                        max-width: 100%;
                        height: auto;
                        margin-bottom: 2mm;
                    }
                    .label-text {
                        font-size: ${barcodePreferences.fontSize}px;
                        line-height: 1.2;
                    }
                    @media print {
                        .no-print {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="label-grid">
                    ${previewLabels.map(label => `
                        <div class="label">
                            <img src="${label.barcodeImage}" class="barcode-img" alt="Barcode">
                            ${barcodePreferences.includeItemName ? `<div class="label-text"><strong>${label.itemName.substring(0, 20)}</strong></div>` : ''}
                            ${barcodePreferences.includeBatch ? `<div class="label-text">Batch: ${label.batchNumber}</div>` : ''}
                            ${barcodePreferences.includePrice ? `<div class="label-text">MRP: ₹${label.mrp.toFixed(2)}</div>` : ''}
                            ${barcodePreferences.includeExpiry && label.expiryDate ? `<div class="label-text">Exp: ${new Date(label.expiryDate).toLocaleDateString()}</div>` : ''}
                            <div class="label-text" style="font-size: ${barcodePreferences.fontSize - 2}px;">${label.barcodeNumber}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="no-print">
                    <button onclick="window.print()">Print</button>
                    <button onclick="window.close()">Close</button>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => {
                            window.close();
                        }, 500);
                    };
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Copy barcode data
    const copyBarcodeData = (label) => {
        navigator.clipboard.writeText(label.barcodeData)
            .then(() => {
                setToast({
                    show: true,
                    message: 'Barcode data copied to clipboard',
                    type: 'success'
                });
            })
            .catch(err => {
                console.error('Copy failed:', err);
            });
    };

    // Save settings
    const handleSaveSettings = () => {
        if (barcodePreferences.saveSettings) {
            savePreferences(barcodePreferences);
            setToast({
                show: true,
                message: 'Settings saved successfully',
                type: 'success'
            });
        }
    };

    if (loading) return (
        <Container className="mt-4">
            <div className="text-center">Loading item details...</div>
        </Container>
    );

    if (error) return (
        <Container className="mt-4">
            <Alert variant="danger">{error}</Alert>
            <Button variant="primary" onClick={() => navigate(-1)}>
                <FaArrowLeft /> Back
            </Button>
        </Container>
    );

    if (!item) return (
        <Container className="mt-4">
            <Alert variant="warning">Item not found</Alert>
            <Button variant="primary" onClick={() => navigate(-1)}>
                <FaArrowLeft /> Back
            </Button>
        </Container>
    );

    return (
        <Container className="mt-4">
            <NotificationToast
                show={toast.show}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, show: false })}
            />

            <Card className="shadow-lg p-4 mb-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">{item.name}</h4>
                    <Badge bg="info">Barcode: {item.barcodeNumber}</Badge>
                </Card.Header>
                
                <Card.Body>
                    <Row>
                        <Col md={8}>
                            <h5>Stock Entries</h5>
                            <Table striped bordered hover size="sm">
                                <thead>
                                    <tr>
                                        <th>
                                            <Form.Check
                                                checked={selectedBatches.length === item.stockEntries.length}
                                                onChange={selectAllBatches}
                                            />
                                        </th>
                                        <th>Batch</th>
                                        <th>Expiry</th>
                                        <th>MRP</th>
                                        <th>Stock</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {item.stockEntries.map(entry => (
                                        <tr key={entry._id}>
                                            <td>
                                                <Form.Check
                                                    checked={selectedBatches.some(b => b._id === entry._id)}
                                                    onChange={() => handleBatchSelection(entry)}
                                                />
                                            </td>
                                            <td>{entry.batchNumber || 'N/A'}</td>
                                            <td>
                                                {entry.expiryDate 
                                                    ? new Date(entry.expiryDate).toLocaleDateString()
                                                    : 'N/A'}
                                            </td>
                                            <td>₹{entry.mrp?.toFixed(2) || '0.00'}</td>
                                            <td>{entry.quantity || 0}</td>
                                            <td>
                                                <Button
                                                    size="sm"
                                                    variant="outline-primary"
                                                    onClick={() => handlePrintSingle(entry)}
                                                >
                                                    <FaPrint /> Print
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Col>
                        
                        <Col md={4}>
                            <Card>
                                <Card.Header>
                                    <h6 className="mb-0">Barcode Actions</h6>
                                </Card.Header>
                                <Card.Body>
                                    <Button
                                        variant="primary"
                                        className="w-100 mb-2"
                                        onClick={() => setShowBatchSelectModal(true)}
                                    >
                                        <FaBarcode /> Select Batches to Print
                                    </Button>
                                    
                                    <Button
                                        variant="success"
                                        className="w-100 mb-2"
                                        onClick={handlePrintMultiple}
                                        disabled={selectedBatches.length === 0}
                                    >
                                        <FaPrint /> Print Selected ({selectedBatches.length})
                                    </Button>
                                    
                                    <Button
                                        variant="outline-secondary"
                                        className="w-100"
                                        onClick={() => setShowPrintModal(true)}
                                    >
                                        <FiSettings /> Print Settings
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Print Settings Modal */}
            <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {printMode === 'single' ? 'Print Barcode' : 'Print Multiple Barcodes'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={6}>
                            <Form>
                                <h6>Label Settings</h6>
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <Form.Label>Label Width (mm)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="20"
                                            max="100"
                                            value={barcodePreferences.labelWidth}
                                            onChange={(e) => setBarcodePreferences({...barcodePreferences, labelWidth: e.target.value})}
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <Form.Label>Label Height (mm)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="20"
                                            max="100"
                                            value={barcodePreferences.labelHeight}
                                            onChange={(e) => setBarcodePreferences({...barcodePreferences, labelHeight: e.target.value})}
                                        />
                                    </Col>
                                </Row>
                                
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <Form.Label>Labels per Row</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="1"
                                            max="8"
                                            value={barcodePreferences.labelsPerRow}
                                            onChange={(e) => setBarcodePreferences({...barcodePreferences, labelsPerRow: e.target.value})}
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <Form.Label>Quantity per Batch</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={barcodePreferences.quantity}
                                            onChange={(e) => setBarcodePreferences({...barcodePreferences, quantity: e.target.value})}
                                        />
                                    </Col>
                                </Row>
                                
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <Form.Label>Barcode Type</Form.Label>
                                        <Form.Select
                                            value={barcodePreferences.barcodeType}
                                            onChange={(e) => setBarcodePreferences({...barcodePreferences, barcodeType: e.target.value})}
                                        >
                                            <option value="code128">Code 128</option>
                                            <option value="code39">Code 39</option>
                                            <option value="qr">QR Code</option>
                                            <option value="ean13">EAN-13</option>
                                        </Form.Select>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Label>Font Size</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="8"
                                            max="24"
                                            value={barcodePreferences.fontSize}
                                            onChange={(e) => setBarcodePreferences({...barcodePreferences, fontSize: parseInt(e.target.value)})}
                                        />
                                    </Col>
                                </Row>
                                
                                <h6>Content Options</h6>
                                <Row className="mb-3">
                                    <Col>
                                        <Form.Check
                                            type="checkbox"
                                            label="Include Item Name"
                                            checked={barcodePreferences.includeItemName}
                                            onChange={(e) => setBarcodePreferences({...barcodePreferences, includeItemName: e.target.checked})}
                                        />
                                        <Form.Check
                                            type="checkbox"
                                            label="Include Price"
                                            checked={barcodePreferences.includePrice}
                                            onChange={(e) => setBarcodePreferences({...barcodePreferences, includePrice: e.target.checked})}
                                        />
                                        <Form.Check
                                            type="checkbox"
                                            label="Include Batch Number"
                                            checked={barcodePreferences.includeBatch}
                                            onChange={(e) => setBarcodePreferences({...barcodePreferences, includeBatch: e.target.checked})}
                                        />
                                        <Form.Check
                                            type="checkbox"
                                            label="Include Expiry Date"
                                            checked={barcodePreferences.includeExpiry}
                                            onChange={(e) => setBarcodePreferences({...barcodePreferences, includeExpiry: e.target.checked})}
                                        />
                                        <Form.Check
                                            type="checkbox"
                                            label="Show Border"
                                            checked={barcodePreferences.border}
                                            onChange={(e) => setBarcodePreferences({...barcodePreferences, border: e.target.checked})}
                                        />
                                    </Col>
                                </Row>
                                
                                <h6>Print Settings</h6>
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <Form.Label>Paper Size</Form.Label>
                                        <Form.Select
                                            value={barcodePreferences.paperSize}
                                            onChange={(e) => setBarcodePreferences({...barcodePreferences, paperSize: e.target.value})}
                                        >
                                            <option value="A4">A4</option>
                                            <option value="Letter">Letter</option>
                                            <option value="A5">A5</option>
                                        </Form.Select>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Label>Orientation</Form.Label>
                                        <Form.Select
                                            value={barcodePreferences.orientation}
                                            onChange={(e) => setBarcodePreferences({...barcodePreferences, orientation: e.target.value})}
                                        >
                                            <option value="portrait">Portrait</option>
                                            <option value="landscape">Landscape</option>
                                        </Form.Select>
                                    </Col>
                                </Row>
                                
                                <Form.Check
                                    type="checkbox"
                                    label="Save these settings as default"
                                    checked={barcodePreferences.saveSettings}
                                    onChange={(e) => setBarcodePreferences({...barcodePreferences, saveSettings: e.target.checked})}
                                />
                            </Form>
                        </Col>
                        
                        <Col md={6}>
                            <h6>Preview</h6>
                            <div 
                                ref={labelPreviewRef}
                                style={{
                                    border: '1px solid #ddd',
                                    padding: '10px',
                                    minHeight: '300px',
                                    backgroundColor: '#f8f9fa'
                                }}
                            >
                                {previewLabels.length > 0 ? (
                                    <div className="label-grid-preview">
                                        {previewLabels.slice(0, 4).map(label => (
                                            <div
                                                key={label.id}
                                                style={{
                                                    width: `${barcodePreferences.labelWidth}px`,
                                                    height: `${barcodePreferences.labelHeight}px`,
                                                    border: barcodePreferences.border ? '1px solid #000' : 'none',
                                                    padding: '5px',
                                                    margin: '5px',
                                                    display: 'inline-block',
                                                    backgroundColor: '#fff',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                <img 
                                                    src={label.barcodeImage} 
                                                    alt="Barcode"
                                                    style={{ maxWidth: '100%', height: '40px' }}
                                                />
                                                {barcodePreferences.includeItemName && (
                                                    <div style={{ fontSize: `${barcodePreferences.fontSize}px` }}>
                                                        {label.itemName.substring(0, 15)}
                                                    </div>
                                                )}
                                                {barcodePreferences.includeBatch && (
                                                    <div style={{ fontSize: `${barcodePreferences.fontSize - 2}px` }}>
                                                        Batch: {label.batchNumber}
                                                    </div>
                                                )}
                                                {barcodePreferences.includePrice && (
                                                    <div style={{ fontSize: `${barcodePreferences.fontSize}px`, fontWeight: 'bold' }}>
                                                        ₹{label.mrp.toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-muted">
                                        Click "Generate Preview" to see labels
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-3 text-center">
                                <Button
                                    variant="info"
                                    onClick={generatePreview}
                                    className="me-2"
                                >
                                    Generate Preview
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => copyBarcodeData(previewLabels[0])}
                                    disabled={previewLabels.length === 0}
                                >
                                    <FaCopy /> Copy Data
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPrintModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="outline-primary" onClick={handleSaveSettings}>
                        Save Settings
                    </Button>
                    <Button variant="outline-success" onClick={exportAsPDF} disabled={previewLabels.length === 0}>
                        <FaDownload /> Export PDF
                    </Button>
                    <Button variant="primary" onClick={printDirectly} disabled={previewLabels.length === 0}>
                        <FaPrint /> Print Now
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Batch Selection Modal */}
            <Modal show={showBatchSelectModal} onHide={() => setShowBatchSelectModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Select Batches to Print</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {item.stockEntries.map(entry => (
                        <div key={entry._id} className="mb-2">
                            <Form.Check
                                type="checkbox"
                                label={`${entry.batchNumber || 'No Batch'} - Exp: ${entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : 'N/A'} - MRP: ₹${entry.mrp?.toFixed(2)}`}
                                checked={selectedBatches.some(b => b._id === entry._id)}
                                onChange={() => handleBatchSelection(entry)}
                            />
                        </div>
                    ))}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowBatchSelectModal(false)}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={() => {
                        setShowBatchSelectModal(false);
                        if (selectedBatches.length > 0) {
                            handlePrintMultiple();
                        }
                    }}>
                        Print Selected
                    </Button>
                </Modal.Footer>
            </Modal>

            <div className="text-end">
                <Button variant="primary" onClick={() => navigate(-1)}>
                    <FaArrowLeft /> Back
                </Button>
            </div>

            {/* Hidden print content */}
            <div id="print-content" style={{ display: 'none' }}></div>
        </Container>
    );
};

export default ItemBarcode;

