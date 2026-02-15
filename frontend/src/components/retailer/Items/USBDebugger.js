import React, { useState } from 'react';
import { Modal, Button, Table, Alert, Badge } from 'react-bootstrap';
import { FaUsb, FaSearch, FaPlug } from 'react-icons/fa';

const USBDebugger = ({ show, onHide }) => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);

    const scanUSBDevices = async () => {
        if (!navigator.usb) {
            setError('WebUSB API not available. Use Chrome 61+ on HTTPS/localhost.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Request access to all USB devices
            const device = await navigator.usb.requestDevice({
                filters: [] // Empty filters = show all devices
            });
            
            if (device) {
                setDevices([device]);
                setSelectedDevice(device);
            }
        } catch (err) {
            console.error('USB scan error:', err);
            setError(err.message || 'Failed to scan USB devices');
        } finally {
            setLoading(false);
        }
    };

    const getConnectedDevices = async () => {
        try {
            const connectedDevices = await navigator.usb.getDevices();
            setDevices(connectedDevices);
            if (connectedDevices.length > 0) {
                setSelectedDevice(connectedDevices[0]);
            }
        } catch (err) {
            console.error('Error getting devices:', err);
        }
    };

    const testDeviceConnection = async (device) => {
        try {
            await device.open();
            await device.selectConfiguration(1);
            await device.claimInterface(0);
            
            // Test ESC/POS commands
            const testCommands = new Uint8Array([
                0x1B, 0x40, // Initialize
                0x1B, 0x61, 0x01, // Center
                ...new TextEncoder().encode('USB Test OK\n'),
                0x0A, 0x0A
            ]);
            
            await device.transferOut(1, testCommands);
            await device.close();
            
            alert('Test print sent successfully!');
        } catch (err) {
            alert('Test failed: ' + err.message);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    <FaUsb className="me-2" />
                    USB Device Debugger
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="mb-4">
                    <h6>WebUSB Status:</h6>
                    <Badge bg={navigator.usb ? "success" : "danger"}>
                        {navigator.usb ? "Available" : "Not Available"}
                    </Badge>
                    
                    <div className="mt-3">
                        <Button
                            variant="primary"
                            onClick={scanUSBDevices}
                            disabled={loading || !navigator.usb}
                            className="me-2"
                        >
                            <FaSearch /> Scan for USB Devices
                        </Button>
                        
                        <Button
                            variant="secondary"
                            onClick={getConnectedDevices}
                            disabled={!navigator.usb}
                        >
                            <FaPlug /> Show Connected Devices
                        </Button>
                    </div>
                </div>

                {error && (
                    <Alert variant="danger">
                        <strong>Error:</strong> {error}
                    </Alert>
                )}

                {loading && (
                    <div className="text-center my-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Looking for USB devices... Check Chrome popup!</p>
                    </div>
                )}

                {devices.length > 0 && (
                    <div className="mt-4">
                        <h6>Found Devices ({devices.length}):</h6>
                        <Table striped bordered hover size="sm">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Vendor ID</th>
                                    <th>Product ID</th>
                                    <th>Manufacturer</th>
                                    <th>Product</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map((device, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td><code>0x{device.vendorId.toString(16).toUpperCase()}</code></td>
                                        <td><code>0x{device.productId.toString(16).toUpperCase()}</code></td>
                                        <td>{device.manufacturerName || 'N/A'}</td>
                                        <td>{device.productName || 'N/A'}</td>
                                        <td>
                                            <Button
                                                size="sm"
                                                variant="outline-primary"
                                                onClick={() => testDeviceConnection(device)}
                                            >
                                                Test
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}

                {selectedDevice && (
                    <div className="mt-4">
                        <h6>Selected Device Details:</h6>
                        <pre className="bg-light p-3 rounded" style={{ fontSize: '12px' }}>
                            {JSON.stringify({
                                vendorId: '0x' + selectedDevice.vendorId.toString(16),
                                productId: '0x' + selectedDevice.productId.toString(16),
                                manufacturer: selectedDevice.manufacturerName,
                                product: selectedDevice.productName,
                                serialNumber: selectedDevice.serialNumber,
                                opened: selectedDevice.opened
                            }, null, 2)}
                        </pre>
                    </div>
                )}

                <Alert variant="info" className="mt-4">
                    <h6>Troubleshooting Tips:</h6>
                    <ol className="mb-0">
                        <li>Use <strong>Chrome 61+</strong> browser</li>
                        <li>Ensure URL is <strong>HTTPS</strong> or <strong>localhost</strong></li>
                        <li>Check Chrome flags: <code>chrome://flags/#enable-experimental-web-platform-features</code></li>
                        <li>Try different USB cable and port</li>
                        <li>Restart Chrome after connecting printer</li>
                    </ol>
                </Alert>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
                <Button variant="success" onClick={scanUSBDevices} disabled={loading}>
                    Scan Again
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default USBDebugger;