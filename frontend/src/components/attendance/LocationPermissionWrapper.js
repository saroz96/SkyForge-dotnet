import React, { useState, useEffect, useRef } from 'react';
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
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const isMounted = useRef(true);
    const locationSent = useRef(false);
    const initAttempted = useRef(false);

    useEffect(() => {
        return () => {
            isMounted.current = false;
            locationService.stopWatching();
        };
    }, []);

    // Function to send location to parent
    const sendLocationToParent = (loc) => {
        console.log('📤 sendLocationToParent called with:', loc);
        if (onLocationUpdate && typeof onLocationUpdate === 'function') {
            if (!locationSent.current) {
                locationSent.current = true;
                console.log('✅ Calling onLocationUpdate with location:', loc);
                onLocationUpdate(loc);
            } else {
                console.log('⚠️ Location already sent, skipping');
            }
        } else {
            console.warn('⚠️ onLocationUpdate is not a function:', onLocationUpdate);
        }
    };

    useEffect(() => {
        const initialize = async () => {
            // Prevent multiple initialization attempts
            if (isInitialized || initAttempted.current) {
                console.log('⏭️ Already initialized or attempting, skipping');
                return;
            }
            initAttempted.current = true;

            console.log('🚀 Initializing LocationPermissionWrapper');

            // Check if geolocation is available
            if (!locationService.isAvailable()) {
                console.log('❌ Geolocation not available');
                setPermissionStatus('unsupported');
                setError('Geolocation is not supported by your browser');
                setIsInitialized(true);
                sendLocationToParent(null);
                return;
            }

            try {
                // Check permission state
                if (navigator.permissions && navigator.permissions.query) {
                    const permission = await navigator.permissions.query({ name: 'geolocation' });
                    console.log('📍 Permission state:', permission.state);
                    
                    if (permission.state === 'denied') {
                        setPermissionStatus('denied');
                        setError('Location permission denied. Please enable location access.');
                        setIsInitialized(true);
                        sendLocationToParent(null);
                        return;
                    }
                    
                    if (permission.state === 'granted') {
                        console.log('✅ Permission granted, getting location...');
                        setPermissionStatus('granted');
                        setIsGettingLocation(true);
                        
                        try {
                            const loc = await locationService.getCurrentLocation({
                                timeout: 15000,
                                maximumAge: 60000,
                                enableHighAccuracy: false
                            });
                            
                            console.log('📍 Location service returned:', loc);
                            setIsGettingLocation(false);
                            
                            if (loc && loc.lat !== undefined && loc.lng !== undefined && 
                                !isNaN(loc.lat) && !isNaN(loc.lng) &&
                                loc.lat !== 0 && loc.lng !== 0) {
                                console.log('✅ Valid location obtained:', loc);
                                setLocation(loc);
                                setAccuracy(loc.accuracy || 0);
                                // Send location to parent
                                sendLocationToParent(loc);
                            } else {
                                console.warn('⚠️ Invalid location object:', loc);
                                setError('Could not get valid location. Please check your GPS.');
                                sendLocationToParent(null);
                            }
                        } catch (err) {
                            console.error('❌ Location fetch error:', err);
                            setIsGettingLocation(false);
                            setError(err.message || 'Failed to get location');
                            sendLocationToParent(null);
                        }
                        
                        setIsInitialized(true);
                        return;
                    }
                }

                // Permission state is 'prompt' or unknown - show modal
                console.log('📱 Showing permission modal');
                setShowModal(true);

            } catch (err) {
                console.error('❌ Init error:', err);
                setPermissionStatus('error');
                setError('Failed to initialize location services.');
                setIsInitialized(true);
                sendLocationToParent(null);
            }
        };

        initialize();
    }, []); // Empty dependency array to run once

    const handleAllowLocation = async () => {
        console.log('🔓 User clicked Allow Location');
        setShowModal(false);
        setIsGettingLocation(true);
        
        try {
            const status = await locationService.requestPermission();
            console.log('📊 Permission request result:', status);
            setPermissionStatus(status);
            
            if (status === 'granted') {
                try {
                    const loc = await locationService.getCurrentLocation({
                        timeout: 15000,
                        maximumAge: 60000,
                        enableHighAccuracy: false
                    });
                    
                    console.log('📍 Location after permission:', loc);
                    setIsGettingLocation(false);
                    
                    if (loc && loc.lat !== undefined && loc.lng !== undefined && 
                        !isNaN(loc.lat) && !isNaN(loc.lng) &&
                        loc.lat !== 0 && loc.lng !== 0) {
                        console.log('✅ Valid location after permission:', loc);
                        setLocation(loc);
                        setAccuracy(loc.accuracy || 0);
                        // Reset locationSent to allow sending
                        locationSent.current = false;
                        sendLocationToParent(loc);
                    } else {
                        console.warn('⚠️ Invalid location after permission:', loc);
                        setError('Could not get valid location. Please try again.');
                        sendLocationToParent(null);
                    }
                } catch (err) {
                    console.error('❌ Location fetch after permission error:', err);
                    setIsGettingLocation(false);
                    setError(err.message || 'Failed to get location');
                    sendLocationToParent(null);
                }
            } else if (status === 'denied') {
                setIsGettingLocation(false);
                setError('Location permission denied.');
                sendLocationToParent(null);
            } else {
                setIsGettingLocation(false);
                sendLocationToParent(null);
            }
            setIsInitialized(true);
        } catch (err) {
            console.error('❌ Permission error:', err);
            setIsGettingLocation(false);
            setError('Failed to get location permission.');
            setPermissionStatus('error');
            setIsInitialized(true);
            sendLocationToParent(null);
        }
    };

    const handleSkipLocation = () => {
        console.log('⏭️ User skipped location');
        setPermissionStatus('skipped');
        setShowModal(false);
        setIsInitialized(true);
        setError('Location access skipped. Some features may be limited.');
        sendLocationToParent(null);
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
        if (!isInitialized || isGettingLocation) {
            return (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">{isGettingLocation ? 'Getting your location...' : 'Initializing location services...'}</p>
                    <p className="text-muted small">This may take a moment</p>
                </div>
            );
        }

        if (permissionStatus === 'unsupported') {
            return (
                <Alert variant="warning" className="text-center">
                    <h5>Location Not Supported</h5>
                    <p>Your browser doesn't support geolocation.</p>
                    {!required && children}
                </Alert>
            );
        }

        if (permissionStatus === 'denied' || permissionStatus === 'error') {
            return (
                <Alert variant="danger" className="text-center">
                    <h5>Location Access Denied</h5>
                    <p>{error || 'Please enable location access in your browser settings.'}</p>
                    <div className="mt-3">
                        <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => { window.location.reload(); }}
                            className="me-2"
                        >
                            Retry
                        </Button>
                        <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={handleSkipLocation}
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
                    <p>{error || 'Location request timed out. You can continue without location.'}</p>
                    <div className="mt-3">
                        <Button 
                            variant="outline-warning" 
                            size="sm"
                            onClick={() => { window.location.reload(); }}
                            className="me-2"
                        >
                            Retry Location
                        </Button>
                        <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={handleSkipLocation}
                        >
                            Continue Without Location
                        </Button>
                    </div>
                    {children}
                </Alert>
            );
        }

        if (!location && (permissionStatus === 'granted')) {
            return (
                <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="mt-2 small">Getting your location...</p>
                    <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => {
                            console.log('🔄 Manual location retry');
                            setIsGettingLocation(true);
                            locationService.getCurrentLocation({ timeout: 15000 })
                                .then(loc => {
                                    setIsGettingLocation(false);
                                    if (loc && loc.lat && loc.lng && loc.lat !== 0 && loc.lng !== 0) {
                                        console.log('✅ Manual retry location:', loc);
                                        setLocation(loc);
                                        setAccuracy(loc.accuracy || 0);
                                        // Reset locationSent to allow sending
                                        locationSent.current = false;
                                        sendLocationToParent(loc);
                                    } else {
                                        console.warn('⚠️ Manual retry invalid location:', loc);
                                        setError('Could not get valid location');
                                    }
                                })
                                .catch(err => {
                                    console.error('❌ Manual retry error:', err);
                                    setIsGettingLocation(false);
                                    setError(err.message);
                                });
                        }}
                        className="mt-2"
                        disabled={isGettingLocation}
                    >
                        {isGettingLocation ? 'Getting location...' : 'Retry Getting Location'}
                    </Button>
                </div>
            );
        }

        // Location is valid - render children
        console.log('✅ Rendering children with location:', location);
        return children;
    };

    return (
        <div className="location-permission-wrapper">
            {renderPermissionModal()}
            {renderContent()}
            
            {/* {location && location.lat !== 0 && location.lng !== 0 && 
             (permissionStatus === 'granted') && (
                <div className="location-status-bar">
                    <small className="text-muted">
                        <FaMapMarkerAlt size={12} className="me-1" />
                        Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        {accuracy !== null && accuracy !== undefined && (
                            <span className="ms-2">
                                (Accuracy: {Math.round(accuracy)}m)
                            </span>
                        )}
                    </small>
                    <Button 
                        variant="outline-light" 
                        size="sm"
                        onClick={() => {
                            console.log('🔄 Refresh location');
                            setIsGettingLocation(true);
                            locationService.getCurrentLocation({ timeout: 15000 })
                                .then(loc => {
                                    setIsGettingLocation(false);
                                    if (loc && loc.lat && loc.lng && loc.lat !== 0 && loc.lng !== 0) {
                                        console.log('✅ Refreshed location:', loc);
                                        setLocation(loc);
                                        setAccuracy(loc.accuracy || 0);
                                        // Reset locationSent to allow sending
                                        locationSent.current = false;
                                        sendLocationToParent(loc);
                                    }
                                })
                                .catch(err => {
                                    setIsGettingLocation(false);
                                    console.error('❌ Refresh error:', err);
                                });
                        }}
                        className="ms-2"
                        disabled={isGettingLocation}
                    >
                        {isGettingLocation ? 'Updating...' : 'Refresh'}
                    </Button>
                </div>
            )} */}
        </div>
    );
};

export default LocationPermissionWrapper;