
import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import { FaMapMarkerAlt, FaShieldAlt, FaCompressAlt } from 'react-icons/fa';
import locationService from '../services/locationService';
import '../../stylesheet/attendance/LocationPermissionWrapper.css';

const LocationPermissionWrapper = ({ children, onLocationUpdate, required = true }) => {
    const [permissionStatus, setPermissionStatus] = useState('checking');
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [accuracy, setAccuracy] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        initializeLocation();
        
        return () => {
            locationService.stopWatching();
        };
    }, []);

    const initializeLocation = async () => {
        try {
            // Check if geolocation is available
            if (!locationService.isAvailable()) {
                setPermissionStatus('unsupported');
                setError('Geolocation is not supported by your browser');
                setIsInitialized(true);
                return;
            }

            // Request permission
            try {
                const status = await locationService.requestPermission();
                setPermissionStatus(status);
                
                if (status === 'granted' || status === 'timeout') {
                    // Start watching location
                    const unsubscribe = locationService.subscribe((update) => {
                        if (update && update.type === 'error') {
                            setError(update.error);
                        } else if (update && update.lat) {
                            // It's a location update
                            setLocation(update);
                            setAccuracy(update.accuracy);
                            if (onLocationUpdate) {
                                onLocationUpdate(update);
                            }
                        }
                    });

                    // Try to get initial location, but don't fail if it times out
                    try {
                        const initialLocation = await locationService.getCurrentLocation({
                            timeout: 10000,
                            maximumAge: 60000
                        });
                        setLocation(initialLocation);
                        setAccuracy(initialLocation.accuracy);
                        if (onLocationUpdate) {
                            onLocationUpdate(initialLocation);
                        }
                    } catch (locationError) {
                        console.log('Initial location fetch failed:', locationError);
                        // This is okay, we'll continue watching
                    }
                } else if (status === 'prompt') {
                    setShowModal(true);
                } else if (status === 'denied') {
                    setError('Location permission denied. Please enable location access in browser settings.');
                }
            } catch (permissionError) {
                console.error('Permission error:', permissionError);
                setPermissionStatus('error');
                setError('Failed to request location permission.');
            }
            
        } catch (err) {
            console.error('Location initialization error:', err);
            setPermissionStatus('error');
            setError(err.message || 'Failed to initialize location services');
        } finally {
            setIsInitialized(true);
        }
    };

    const handleAllowLocation = async () => {
        try {
            const status = await locationService.requestPermission();
            setPermissionStatus(status);
            setShowModal(false);
            
            if (status === 'granted' || status === 'timeout') {
                // Start watching
                const unsubscribe = locationService.subscribe((update) => {
                    if (update && update.type === 'error') {
                        setError(update.error);
                    } else if (update && update.lat) {
                        setLocation(update);
                        setAccuracy(update.accuracy);
                        if (onLocationUpdate) {
                            onLocationUpdate(update);
                        }
                    }
                });
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleManualLocation = () => {
        setPermissionStatus('manual');
        setShowModal(false);
        setError('Location access not enabled. Attendance may be limited.');
    };

    const handleSkipLocation = () => {
        setPermissionStatus('skipped');
        setShowModal(false);
    };

    const renderPermissionModal = () => (
        <Modal show={showModal} centered backdrop="static">
            <Modal.Header className="bg-primary text-white">
                <Modal.Title>
                    <FaMapMarkerAlt className="me-2" />
                    Location Access Required
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="text-center mb-4">
                    <div className="location-icon mb-3">
                        <FaCompressAlt size={48} className="text-primary" />
                    </div>
                    <h5>Enable Location Access</h5>
                    <p className="text-muted">
                        This feature requires access to your location to verify you are at the office.
                    </p>
                </div>

                <div className="permission-reasons mb-4">
                    <div className="d-flex align-items-start mb-3">
                        <FaShieldAlt className="text-success me-2 mt-1" />
                        <div>
                            <h6>Secure Attendance</h6>
                            <p className="small text-muted mb-0">
                                Ensures attendance is only marked when you're physically at the office
                            </p>
                        </div>
                    </div>
                    <div className="d-flex align-items-start mb-3">
                        <FaMapMarkerAlt className="text-primary me-2 mt-1" />
                        <div>
                            <h6>Precise Tracking</h6>
                            <p className="small text-muted mb-0">
                                Accurate location verification for payroll and compliance
                            </p>
                        </div>
                    </div>
                </div>

                <Alert variant="info" className="small">
                    <strong>Note:</strong> Your location data is only used for attendance verification
                    and is not shared with third parties.
                </Alert>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="outline-secondary" onClick={handleSkipLocation}>
                    Skip for Now
                </Button>
                <Button variant="primary" onClick={handleAllowLocation}>
                    Allow Location Access
                </Button>
            </Modal.Footer>
        </Modal>
    );

    const renderContent = () => {
        if (!isInitialized) {
            return (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Initializing location services...</p>
                </div>
            );
        }

        if (permissionStatus === 'unsupported') {
            return (
                <Alert variant="warning" className="text-center">
                    <h5>Location Not Supported</h5>
                    <p>Your browser doesn't support geolocation. Please use a modern browser or contact support.</p>
                    {!required && children}
                </Alert>
            );
        }

        if (permissionStatus === 'denied' || permissionStatus === 'error') {
            return (
                <Alert variant="danger" className="text-center">
                    <h5>Location Access Denied</h5>
                    <p>{error || 'Please enable location access in your browser settings to use attendance features.'}</p>
                    <div className="mt-3">
                        <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={initializeLocation}
                            className="me-2"
                        >
                            Retry
                        </Button>
                        <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={handleManualLocation}
                        >
                            Continue Without Location
                        </Button>
                    </div>
                    {!required && children}
                </Alert>
            );
        }

        if (permissionStatus === 'manual' || permissionStatus === 'skipped') {
            return (
                <Alert variant="info">
                    <h5>Location Access Limited</h5>
                    <p>{permissionStatus === 'manual' 
                        ? 'Location access not enabled. Some features may be limited.'
                        : 'Location access skipped. You can enable it later in settings.'}</p>
                    {children}
                </Alert>
            );
        }

        if (permissionStatus === 'timeout') {
            return (
                <Alert variant="warning">
                    <h5>Location Service Timeout</h5>
                    <p>Getting your location is taking longer than expected. Please ensure location services are enabled on your device.</p>
                    <Button 
                        variant="outline-warning" 
                        size="sm"
                        onClick={initializeLocation}
                    >
                        Retry Location
                    </Button>
                    {children}
                </Alert>
            );
        }

        if (!location && (permissionStatus === 'granted' || permissionStatus === 'checking')) {
            return (
                <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="mt-2 small">Getting your location...</p>
                    <p className="text-muted small">This may take a moment</p>
                </div>
            );
        }

        return children;
    };

    return (
        <div className="location-permission-wrapper">
            {renderPermissionModal()}
            {renderContent()}
            
            {location && (permissionStatus === 'granted' || permissionStatus === 'timeout') && (
                <div className="location-status-bar">
                    <small className="text-muted">
                        <FaMapMarkerAlt size={12} className="me-1" />
                        Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        {accuracy && (
                            <span className="ms-2">
                                (Accuracy: {Math.round(accuracy)}m)
                            </span>
                        )}
                    </small>
                    <Button 
                        variant="outline-light" 
                        size="sm"
                        onClick={() => initializeLocation()}
                    >
                        Refresh
                    </Button>
                </div>
            )}
        </div>
    );
};

export default LocationPermissionWrapper;