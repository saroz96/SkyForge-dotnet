import React, { useState, useEffect } from 'react';
import {
    Modal,
    Button,
    Form,
    Card,
    Row,
    Col,
    Alert,
    Badge,
    Spinner,
    ListGroup,
    InputGroup
} from 'react-bootstrap';
import {
    FaMapMarkerAlt,
    FaEdit,
    FaTrash,
    FaPlus,
    FaCheckCircle,
    FaTimesCircle,
    FaMap,
    FaRuler,
    FaHome
} from 'react-icons/fa';
import axios from 'axios';

const OfficeLocationManager = ({ company, onUpdate }) => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        coordinates: { lat: '', lng: '' },
        radius: 100,
        address: '',
        isActive: true
    });
    const [currentLocation, setCurrentLocation] = useState(null);
    const [mapLoading, setMapLoading] = useState(false);

    // Fetch office locations on component mount
    useEffect(() => {
        if (company) {
            fetchOfficeLocations();
        }
    }, [company]);

    // const fetchOfficeLocations = async () => {
    //     if (!company) return;

    //     setLoading(true);
    //     try {
    //         const token = localStorage.getItem('token');
    //         const response = await axios.get('/api/attendance/company', {
    //             params: { companyId: company._id },
    //             headers: { Authorization: `Bearer ${token}` }
    //         });

    //         if (response.data.success) {
    //             const officeLocations = response.data.company?.attendanceSettings?.officeLocations || [];
    //             setLocations(officeLocations);
    //         }
    //     } catch (error) {
    //         console.error('Error fetching office locations:', error);
    //         setError('Failed to load office locations');
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const fetchOfficeLocations = async () => {
        if (!company) return;

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/attendance/office-locations', {
                params: {
                    companyId: company._id
                },
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Office locations response:', response.data);

            if (response.data.success) {
                const officeLocations = response.data.data.officeLocations || [];
                setLocations(officeLocations);

                // You can also access other data if needed:
                // const geoFencingEnabled = response.data.data.geoFencingEnabled;
                // const companyData = response.data.data.company;
            } else {
                setError(response.data.message || 'Failed to fetch office locations');
            }
        } catch (error) {
            console.error('Error fetching office locations:', error);

            if (error.response?.status === 404) {
                setError('Office locations endpoint not found. Please check backend routes.');
            } else if (error.response?.status === 403) {
                setError('Access denied. You need admin privileges to view office locations.');
            } else if (error.response?.status === 401) {
                setError('Session expired. Please login again.');
            } else {
                setError(error.response?.data?.message || 'Failed to load office locations');
            }
        } finally {
            setLoading(false);
        }
    };

    const getCurrentLocation = () => {
        setMapLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setCurrentLocation({ lat: latitude, lng: longitude });
                    setFormData(prev => ({
                        ...prev,
                        coordinates: {
                            lat: latitude.toString(),
                            lng: longitude.toString()
                        }
                    }));
                    setMapLoading(false);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    setError('Unable to get your current location');
                    setMapLoading(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            setError('Geolocation is not supported by your browser');
            setMapLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name.startsWith('coordinates.')) {
            const coordField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                coordinates: {
                    ...prev.coordinates,
                    [coordField]: value
                }
            }));
        } else if (name === 'radius') {
            setFormData(prev => ({
                ...prev,
                [name]: parseInt(value) || 100
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            return 'Office name is required';
        }

        if (!formData.coordinates.lat || !formData.coordinates.lng) {
            return 'Coordinates are required';
        }

        const lat = parseFloat(formData.coordinates.lat);
        const lng = parseFloat(formData.coordinates.lng);

        if (isNaN(lat) || lat < -90 || lat > 90) {
            return 'Latitude must be between -90 and 90';
        }

        if (isNaN(lng) || lng < -180 || lng > 180) {
            return 'Longitude must be between -180 and 180';
        }

        if (!formData.radius || formData.radius < 10 || formData.radius > 1000) {
            return 'Radius must be between 10 and 1000 meters';
        }

        return null;
    };

    const handleAddLocation = async () => {
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/attendance/office-location', {
                companyId: company._id,
                name: formData.name,
                coordinates: {
                    lat: parseFloat(formData.coordinates.lat),
                    lng: parseFloat(formData.coordinates.lng)
                },
                radius: formData.radius,
                address: formData.address
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setLocations(prev => [...prev, {
                    _id: response.data.data.locationId,
                    ...formData,
                    coordinates: {
                        lat: parseFloat(formData.coordinates.lat),
                        lng: parseFloat(formData.coordinates.lng)
                    }
                }]);

                setShowAddModal(false);
                resetForm();
                setError(null);

                // Notify parent component
                if (onUpdate) {
                    onUpdate();
                }

                // Show success message
                alert('Office location added successfully!');
            }
        } catch (error) {
            console.error('Error adding office location:', error);
            setError(error.response?.data?.message || 'Failed to add office location');
        } finally {
            setLoading(false);
        }
    };

    const handleEditLocation = (location) => {
        setSelectedLocation(location);
        setFormData({
            name: location.name,
            coordinates: {
                lat: location.coordinates.lat.toString(),
                lng: location.coordinates.lng.toString()
            },
            radius: location.radius,
            address: location.address || '',
            isActive: location.isActive
        });
        setShowEditModal(true);
    };

    const handleUpdateLocation = async () => {
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`/api/attendance/office-location/${selectedLocation._id}`, {
                companyId: company._id,
                updates: {
                    name: formData.name,
                    coordinates: {
                        lat: parseFloat(formData.coordinates.lat),
                        lng: parseFloat(formData.coordinates.lng)
                    },
                    radius: formData.radius,
                    address: formData.address,
                    isActive: formData.isActive
                }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setLocations(prev => prev.map(loc =>
                    loc._id === selectedLocation._id ? response.data.data : loc
                ));

                setShowEditModal(false);
                resetForm();
                setError(null);

                if (onUpdate) {
                    onUpdate();
                }

                alert('Office location updated successfully!');
            }
        } catch (error) {
            console.error('Error updating office location:', error);
            setError(error.response?.data?.message || 'Failed to update office location');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLocation = async (locationId) => {
        if (!window.confirm('Are you sure you want to delete this office location?')) {
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(`/api/attendance/office-location/${locationId}`, {
                params: { companyId: company._id },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setLocations(prev => prev.filter(loc => loc._id !== locationId));
                setError(null);

                if (onUpdate) {
                    onUpdate();
                }

                alert('Office location deleted successfully!');
            }
        } catch (error) {
            console.error('Error deleting office location:', error);
            setError(error.response?.data?.message || 'Failed to delete office location');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            coordinates: { lat: '', lng: '' },
            radius: 100,
            address: '',
            isActive: true
        });
        setCurrentLocation(null);
        setError(null);
    };

    const openInMaps = (location) => {
        const { lat, lng } = location.coordinates;
        const url = `https://www.google.com/maps?q=${lat},${lng}`;
        window.open(url, '_blank');
    };

    const renderLocationCard = (location) => (
        <Card key={location._id} className="mb-3 shadow-sm">
            <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <h6 className="mb-1">
                            <FaMapMarkerAlt className="me-2 text-primary" />
                            {location.name}
                        </h6>
                        <p className="text-muted small mb-2">{location.address}</p>
                    </div>
                    <div>
                        <Badge bg={location.isActive ? "success" : "secondary"} className="me-2">
                            {location.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge bg="info">
                            <FaRuler className="me-1" />
                            {location.radius}m
                        </Badge>
                    </div>
                </div>

                <div className="location-details">
                    <Row>
                        <Col md={6}>
                            <div className="mb-2">
                                <small className="text-muted">Coordinates:</small>
                                <div className="font-monospace small">
                                    {location.coordinates.lat.toFixed(6)}, {location.coordinates.lng.toFixed(6)}
                                </div>
                            </div>
                        </Col>
                        <Col md={6}>
                            <div className="mb-2">
                                <small className="text-muted">Status:</small>
                                <div>
                                    {location.isActive ? (
                                        <span className="text-success">
                                            <FaCheckCircle className="me-1" />
                                            Active for attendance
                                        </span>
                                    ) : (
                                        <span className="text-secondary">
                                            <FaTimesCircle className="me-1" />
                                            Inactive
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>

                <div className="d-flex justify-content-end mt-3">
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        className="me-2"
                        onClick={() => openInMaps(location)}
                    >
                        <FaMap className="me-1" />
                        View Map
                    </Button>
                    <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleEditLocation(location)}
                    >
                        <FaEdit className="me-1" />
                        Edit
                    </Button>
                    <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteLocation(location._id)}
                    >
                        <FaTrash className="me-1" />
                        Delete
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );

    const renderAddEditModal = (isEdit = false) => (
        <Modal show={isEdit ? showEditModal : showAddModal} onHide={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)} size="lg">
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>
                    <FaMapMarkerAlt className="me-2" />
                    {isEdit ? 'Edit Office Location' : 'Add New Office Location'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && (
                    <Alert variant="danger" onClose={() => setError(null)} dismissible>
                        {error}
                    </Alert>
                )}

                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>Office Name *</Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="e.g., Main Office, Branch Office, Warehouse"
                            required
                        />
                        <Form.Text className="text-muted">
                            A descriptive name for this location
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Address</Form.Label>
                        <Form.Control
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Full address of the office"
                        />
                    </Form.Group>

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Latitude *</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="number"
                                        step="0.000001"
                                        name="coordinates.lat"
                                        value={formData.coordinates.lat}
                                        onChange={handleInputChange}
                                        placeholder="e.g., 28.459497"
                                        required
                                    />
                                    <Button
                                        variant="outline-secondary"
                                        onClick={getCurrentLocation}
                                        disabled={mapLoading}
                                    >
                                        {mapLoading ? <Spinner size="sm" /> : 'Use Current'}
                                    </Button>
                                </InputGroup>
                                <Form.Text className="text-muted">
                                    Example: 28.459497
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Longitude *</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.000001"
                                    name="coordinates.lng"
                                    value={formData.coordinates.lng}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 77.026634"
                                    required
                                />
                                <Form.Text className="text-muted">
                                    Example: 77.026634
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Attendance Radius (meters) *</Form.Label>
                        <div className="d-flex align-items-center">
                            <Form.Range
                                min="10"
                                max="1000"
                                step="10"
                                name="radius"
                                value={formData.radius}
                                onChange={handleInputChange}
                                className="me-3"
                            />
                            <Form.Control
                                type="number"
                                min="10"
                                max="1000"
                                name="radius"
                                value={formData.radius}
                                onChange={handleInputChange}
                                style={{ width: '100px' }}
                            />
                            <span className="ms-2">m</span>
                        </div>
                        <Form.Text className="text-muted">
                            Users must be within this radius to mark attendance (Recommended: 50-200m)
                        </Form.Text>
                    </Form.Group>

                    {isEdit && (
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                label="Active for attendance"
                                checked={formData.isActive}
                                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                            />
                        </Form.Group>
                    )}

                    {currentLocation && (
                        <Alert variant="info" className="small">
                            <FaMapMarkerAlt className="me-2" />
                            Using your current location: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                        </Alert>
                    )}
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}>
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={isEdit ? handleUpdateLocation : handleAddLocation}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            {isEdit ? 'Updating...' : 'Adding...'}
                        </>
                    ) : (
                        <>
                            <FaCheckCircle className="me-2" />
                            {isEdit ? 'Update Location' : 'Add Location'}
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );

    return (
        <div className="office-location-manager">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5>
                        <FaHome className="me-2" />
                        Office Locations
                    </h5>
                    <p className="text-muted mb-0">
                        Configure locations where employees can mark attendance
                    </p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => setShowAddModal(true)}
                >
                    <FaPlus className="me-2" />
                    Add Office Location
                </Button>
            </div>

            {error && !loading && (
                <Alert variant="danger" className="mb-3">
                    {error}
                </Alert>
            )}

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Loading office locations...</p>
                </div>
            ) : locations.length === 0 ? (
                <Card className="text-center py-5">
                    <Card.Body>
                        <FaMapMarkerAlt size={48} className="text-muted mb-3" />
                        <h5>No Office Locations Configured</h5>
                        <p className="text-muted mb-4">
                            Add office locations to enable geo-fenced attendance tracking
                        </p>
                        <Button
                            variant="primary"
                            onClick={() => setShowAddModal(true)}
                        >
                            <FaPlus className="me-2" />
                            Add Your First Office
                        </Button>
                    </Card.Body>
                </Card>
            ) : (
                <>
                    <Alert variant="info" className="mb-4">
                        <div className="d-flex align-items-center">
                            <FaMapMarkerAlt className="me-2" />
                            <div>
                                <strong>{locations.length} Office Location{locations.length !== 1 ? 's' : ''} Configured</strong>
                                <div className="small">
                                    Employees can mark attendance when within the specified radius of any active location
                                </div>
                            </div>
                        </div>
                    </Alert>

                    <div className="office-locations-list">
                        {locations.map(renderLocationCard)}
                    </div>
                </>
            )}

            {renderAddEditModal(false)}
            {renderAddEditModal(true)}
        </div>
    );
};

export default OfficeLocationManager;