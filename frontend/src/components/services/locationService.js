
class LocationService {
    constructor() {
        this.watchId = null;
        this.callbacks = [];
        this.currentLocation = null;
        this.permissionStatus = null;
        this.permissionObserver = null;
    }

    // Request location permission
    async requestPermission() {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by your browser');
        }

        try {
            // Check existing permission
            if (navigator.permissions && navigator.permissions.query) {
                const permission = await navigator.permissions.query({ name: 'geolocation' });
                this.permissionStatus = permission.state;
                
                // Create a bound function to avoid context issues
                const handlePermissionChange = () => {
                    this.permissionStatus = permission.state;
                    // Notify all callbacks about permission change
                    this.callbacks.forEach(callback => {
                        if (typeof callback === 'function') {
                            callback({
                                type: 'permission',
                                status: this.permissionStatus
                            });
                        }
                    });
                };
                
                // Store reference to cleanup later
                this.permissionObserver = handlePermissionChange;
                permission.onchange = handlePermissionChange;
            }

            // Request current location to trigger permission prompt
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        this.permissionStatus = 'granted';
                        resolve('granted');
                    },
                    (error) => {
                        // Don't reject for timeouts, just mark as error
                        if (error.code === error.TIMEOUT) {
                            this.permissionStatus = 'timeout';
                            resolve('timeout');
                        } else {
                            this.permissionStatus = 'denied';
                            reject(error);
                        }
                    },
                    { 
                        enableHighAccuracy: true, 
                        timeout: 15000, // Increased timeout
                        maximumAge: 0 
                    }
                );
            });
        } catch (error) {
            console.error('Permission request error:', error);
            // Don't throw, just set status
            this.permissionStatus = 'error';
            throw error;
        }
    }

    // Get current location once
    async getCurrentLocation(options = {}) {
        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 15000, // Increased timeout
            maximumAge: 60000 // 1 minute cache for faster response
        };

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp || Date.now()
                    };
                    this.currentLocation = location;
                    resolve(location);
                },
                (error) => {
                    console.error('Get current location error:', error);
                    reject(this.getErrorMessage(error));
                },
                { ...defaultOptions, ...options }
            );
        });
    }

    // Start watching location continuously
    startWatching(callback, options = {}) {
        if (this.watchId !== null) {
            this.stopWatching();
        }

        const defaultOptions = {
            enableHighAccuracy: true,
            maximumAge: 30000, // 30 seconds cache
            timeout: 15000, // Increased timeout
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp || Date.now()
                };
                this.currentLocation = location;
                
                // Notify all callbacks
                this.callbacks.forEach(cb => {
                    if (typeof cb === 'function') {
                        cb(location);
                    }
                });
                
                // Call specific callback if provided
                if (callback && typeof callback === 'function') {
                    callback(location);
                }
            },
            (error) => {
                console.error('Location watch error:', error);
                // Notify about error
                this.callbacks.forEach(cb => {
                    if (typeof cb === 'function') {
                        cb({ 
                            type: 'error', 
                            error: this.getErrorMessage(error) 
                        });
                    }
                });
            },
            { ...defaultOptions, ...options }
        );

        // Register callback
        if (callback && typeof callback === 'function') {
            this.callbacks.push(callback);
        }

        return this.watchId;
    }

    // Stop watching location
    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        // Clear permission observer
        if (this.permissionObserver && navigator.permissions) {
            // Try to remove the listener
            this.permissionObserver = null;
        }
        
        this.callbacks = [];
    }

    // Subscribe to location updates
    subscribe(callback) {
        if (typeof callback !== 'function') {
            console.error('Callback must be a function');
            return () => {};
        }
        
        this.callbacks.push(callback);
        
        // Return unsubscribe function
        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
        };
    }

    // Get last known location
    getLastKnownLocation() {
        return this.currentLocation;
    }

    // Check permission status
    getPermissionStatus() {
        return this.permissionStatus;
    }

    // Calculate distance between two coordinates
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }

    // Check if location is within office radius
    isWithinOfficeRadius(userLocation, officeLocation, radius = 100) {
        if (!userLocation || !officeLocation) return false;
        
        const distance = this.calculateDistance(
            userLocation.lat,
            userLocation.lng,
            officeLocation.lat,
            officeLocation.lng
        );
        
        return distance <= radius;
    }

    // Find nearest office location
    findNearestOffice(userLocation, officeLocations) {
        if (!userLocation || !officeLocations?.length) return null;
        
        let nearest = null;
        let minDistance = Infinity;
        
        officeLocations.forEach(office => {
            if (!office.isActive) return;
            
            const distance = this.calculateDistance(
                userLocation.lat,
                userLocation.lng,
                office.coordinates.lat,
                office.coordinates.lng
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = { ...office, distance };
            }
        });
        
        return nearest;
    }

    // Get error message from geolocation error
    getErrorMessage(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return 'Location permission denied. Please enable location access in browser settings.';
            case error.POSITION_UNAVAILABLE:
                return 'Location information is unavailable.';
            case error.TIMEOUT:
                return 'Location request timed out. Please try again.';
            default:
                return 'An unknown error occurred while getting location.';
        }
    }

    // Check if location services are available
    isAvailable() {
        return !!navigator.geolocation;
    }

    // Clean up all resources
    cleanup() {
        this.stopWatching();
        this.callbacks = [];
        this.currentLocation = null;
        this.permissionStatus = null;
        this.permissionObserver = null;
    }
}

// Create singleton instance
const locationService = new LocationService();
export default locationService;