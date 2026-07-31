// class LocationService {
//     constructor() {
//         this.watchId = null;
//         this.callbacks = [];
//         this.currentLocation = null;
//         this.permissionStatus = null;
//         this.isWatching = false;
//         this.locationRetries = 0;
//         this.maxLocationRetries = 3;
//     }

//     // Request location permission
//     async requestPermission() {
//         if (!navigator.geolocation) {
//             throw new Error('Geolocation is not supported by your browser');
//         }

//         return new Promise((resolve) => {
//             navigator.geolocation.getCurrentPosition(
//                 (position) => {
//                     this.permissionStatus = 'granted';
//                     const location = this._formatLocation(position);
//                     this.currentLocation = location;
//                     resolve('granted');
//                 },
//                 (error) => {
//                     if (error.code === error.TIMEOUT) {
//                         this.permissionStatus = 'timeout';
//                         resolve('timeout');
//                     } else if (error.code === error.PERMISSION_DENIED) {
//                         this.permissionStatus = 'denied';
//                         resolve('denied');
//                     } else {
//                         this.permissionStatus = 'error';
//                         resolve('error');
//                     }
//                 },
//                 { 
//                     enableHighAccuracy: false,
//                     timeout: 5000,
//                     maximumAge: 60000 
//                 }
//             );
//         });
//     }

//     // Get current location once with retry
//     async getCurrentLocation(options = {}) {
//         if (!navigator.geolocation) {
//             throw new Error('Geolocation is not supported by your browser');
//         }

//         const defaultOptions = {
//             enableHighAccuracy: false,
//             timeout: 5000,
//             maximumAge: 60000
//         };

//         // If we have a cached location that's fresh, return it immediately
//         if (this.currentLocation && !this._isLocationStale(30000)) {
//             console.log('📦 Returning cached location');
//             return this.currentLocation;
//         }

//         // Try to get fresh location with retry
//         let lastError = null;
//         for (let attempt = 0; attempt < this.maxLocationRetries; attempt++) {
//             try {
//                 console.log(`📍 Getting location attempt ${attempt + 1}/${this.maxLocationRetries}`);
//                 const location = await this._getCurrentLocationPromise({ 
//                     ...defaultOptions, 
//                     ...options,
//                     timeout: Math.min(5000 + (attempt * 2000), 15000)
//                 });
                
//                 // Check if location is valid
//                 if (location && location.lat !== undefined && location.lng !== undefined) {
//                     this.currentLocation = location;
//                     this.locationRetries = 0;
//                     console.log('✅ Location obtained successfully, lat:', location.lat, 'lng:', location.lng);
//                     return location;
//                 } else {
//                     console.log('⚠️ Location object is invalid:', location);
//                 }
//             } catch (error) {
//                 console.log(`⚠️ Location attempt ${attempt + 1} failed:`, error.message);
//                 lastError = error;
//                 if (attempt < this.maxLocationRetries - 1) {
//                     await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
//                 }
//             }
//         }

//         throw lastError || new Error('Failed to get location after multiple attempts');
//     }

//     // Internal method to get current location as promise
//     _getCurrentLocationPromise(options) {
//         return new Promise((resolve, reject) => {
//             navigator.geolocation.getCurrentPosition(
//                 (position) => {
//                     console.log('📍 Raw position received:', {
//                         lat: position.coords.latitude,
//                         lng: position.coords.longitude,
//                         accuracy: position.coords.accuracy
//                     });
//                     const location = this._formatLocation(position);
//                     resolve(location);
//                 },
//                 (error) => {
//                     reject(this.getErrorMessage(error));
//                 },
//                 options
//             );
//         });
//     }

//     // Start watching location continuously
//     startWatching(callback, options = {}) {
//         if (this.watchId !== null) {
//             this.stopWatching();
//         }

//         const defaultOptions = {
//             enableHighAccuracy: false,
//             maximumAge: 30000,
//             timeout: 5000,
//         };

//         this.watchId = navigator.geolocation.watchPosition(
//             (position) => {
//                 const location = this._formatLocation(position);
//                 if (location) {
//                     this.currentLocation = location;
                    
//                     this.callbacks.forEach(cb => {
//                         if (typeof cb === 'function') {
//                             cb(location);
//                         }
//                     });
                    
//                     if (callback && typeof callback === 'function') {
//                         callback(location);
//                     }
//                 }
//             },
//             (error) => {
//                 console.error('Location watch error:', error);
//                 this.callbacks.forEach(cb => {
//                     if (typeof cb === 'function') {
//                         cb({ 
//                             type: 'error', 
//                             error: this.getErrorMessage(error) 
//                         });
//                     }
//                 });
//             },
//             { ...defaultOptions, ...options }
//         );

//         if (callback && typeof callback === 'function') {
//             this.callbacks.push(callback);
//         }

//         this.isWatching = true;
//         return this.watchId;
//     }

//     // Stop watching location
//     stopWatching() {
//         if (this.watchId !== null) {
//             navigator.geolocation.clearWatch(this.watchId);
//             this.watchId = null;
//         }
//         this.isWatching = false;
//         this.callbacks = [];
//     }

//     // Subscribe to location updates
//     subscribe(callback) {
//         if (typeof callback !== 'function') {
//             console.error('Callback must be a function');
//             return () => {};
//         }
        
//         this.callbacks.push(callback);
        
//         if (!this.isWatching) {
//             this.startWatching();
//         }
        
//         if (this.currentLocation) {
//             callback(this.currentLocation);
//         }
        
//         return () => {
//             this.callbacks = this.callbacks.filter(cb => cb !== callback);
//             if (this.callbacks.length === 0 && this.isWatching) {
//                 this.stopWatching();
//             }
//         };
//     }

//     // Get last known location
//     getLastKnownLocation() {
//         return this.currentLocation;
//     }

//     // Check permission status
//     getPermissionStatus() {
//         return this.permissionStatus;
//     }

//     // Check if location services are available
//     isAvailable() {
//         return !!navigator.geolocation;
//     }

//     // Calculate distance between two coordinates
//     calculateDistance(lat1, lon1, lat2, lon2) {
//         if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
//             return Infinity;
//         }

//         const R = 6371e3;
//         const φ1 = lat1 * Math.PI / 180;
//         const φ2 = lat2 * Math.PI / 180;
//         const Δφ = (lat2 - lat1) * Math.PI / 180;
//         const Δλ = (lon2 - lon1) * Math.PI / 180;

//         const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//                   Math.cos(φ1) * Math.cos(φ2) *
//                   Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//         const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//         return R * c;
//     }

//     // Check if location is within office radius
//     isWithinOfficeRadius(userLocation, officeLocation, radius = 100) {
//         if (!userLocation || !officeLocation) return false;
        
//         const distance = this.calculateDistance(
//             userLocation.lat,
//             userLocation.lng,
//             officeLocation.lat,
//             officeLocation.lng
//         );
        
//         return distance <= radius;
//     }

//     // Find nearest office location
//     findNearestOffice(userLocation, officeLocations) {
//         if (!userLocation || !officeLocations?.length) return null;
        
//         let nearest = null;
//         let minDistance = Infinity;
        
//         officeLocations.forEach(office => {
//             if (!office.isActive) return;
            
//             const distance = this.calculateDistance(
//                 userLocation.lat,
//                 userLocation.lng,
//                 office.coordinates.lat,
//                 office.coordinates.lng
//             );
            
//             if (distance < minDistance) {
//                 minDistance = distance;
//                 nearest = { ...office, distance };
//             }
//         });
        
//         return nearest;
//     }

//     // Check if location is stale
//     _isLocationStale(maxAge = 60000) {
//         if (!this.currentLocation) return true;
//         const age = Date.now() - (this.currentLocation.timestamp || 0);
//         return age > maxAge;
//     }

//     // Format location from position object - ALWAYS returns an object
//     _formatLocation(position) {
//         if (!position || !position.coords) {
//             console.log('⚠️ Invalid position object');
//             // Return a default location instead of null
//             return {
//                 lat: 0,
//                 lng: 0,
//                 accuracy: 0,
//                 timestamp: Date.now()
//             };
//         }
        
//         const location = {
//             lat: position.coords.latitude,
//             lng: position.coords.longitude,
//             accuracy: position.coords.accuracy || 0,
//             timestamp: position.timestamp || Date.now()
//         };
        
//         // Validate the location
//         if (isNaN(location.lat) || isNaN(location.lng)) {
//             console.log('⚠️ Invalid coordinates:', location);
//             return {
//                 lat: 0,
//                 lng: 0,
//                 accuracy: 0,
//                 timestamp: Date.now()
//             };
//         }
        
//         return location;
//     }

//     // Get error message from geolocation error
//     getErrorMessage(error) {
//         if (!error) return 'An unknown error occurred.';
        
//         switch (error.code) {
//             case 1:
//                 return 'Location permission denied. Please enable location access in browser settings.';
//             case 2:
//                 return 'Location information is unavailable. Please ensure GPS is enabled.';
//             case 3:
//                 return 'Location request timed out. Please try again.';
//             default:
//                 return error.message || 'An unknown error occurred while getting location.';
//         }
//     }

//     // Clean up all resources
//     cleanup() {
//         this.stopWatching();
//         this.callbacks = [];
//         this.currentLocation = null;
//         this.permissionStatus = null;
//         this.isWatching = false;
//         this.locationRetries = 0;
//     }
// }

// // Create singleton instance
// const locationService = new LocationService();
// export default locationService;


//--------------------------------------------------------end

class LocationService {
    constructor() {
        this.watchId = null;
        this.callbacks = [];
        this.currentLocation = null;
        this.permissionStatus = null;
        this.isWatching = false;
        this.locationRetries = 0;
        this.maxLocationRetries = 3;
        this.lastError = null;
    }

    // Request location permission
    async requestPermission() {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by your browser');
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('✅ Permission granted, position received');
                    this.permissionStatus = 'granted';
                    const location = this._formatLocation(position);
                    if (location) {
                        this.currentLocation = location;
                    }
                    resolve('granted');
                },
                (error) => {
                    console.error('❌ Permission error:', error);
                    this.lastError = error;
                    if (error.code === error.TIMEOUT) {
                        this.permissionStatus = 'timeout';
                        resolve('timeout');
                    } else if (error.code === error.PERMISSION_DENIED) {
                        this.permissionStatus = 'denied';
                        resolve('denied');
                    } else {
                        this.permissionStatus = 'error';
                        resolve('error');
                    }
                },
                { 
                    enableHighAccuracy: false,
                    timeout: 15000,
                    maximumAge: 60000 
                }
            );
        });
    }

    // Get current location once with retry
    async getCurrentLocation(options = {}) {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by your browser');
        }

        const defaultOptions = {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 60000
        };

        // If we have a cached location that's fresh, return it immediately
        if (this.currentLocation && !this._isLocationStale(60000)) {
            console.log('📦 Returning cached location:', this.currentLocation);
            return this.currentLocation;
        }

        // Try to get fresh location with retry
        let lastError = null;
        for (let attempt = 0; attempt < this.maxLocationRetries; attempt++) {
            try {
                console.log(`📍 Getting location attempt ${attempt + 1}/${this.maxLocationRetries}`);
                const location = await this._getCurrentLocationPromise({ 
                    ...defaultOptions, 
                    ...options,
                    timeout: Math.min(15000 + (attempt * 5000), 30000)
                });
                
                // Check if location is valid
                if (location && location.lat !== undefined && location.lng !== undefined &&
                    !isNaN(location.lat) && !isNaN(location.lng) &&
                    location.lat !== 0 && location.lng !== 0) {
                    this.currentLocation = location;
                    this.locationRetries = 0;
                    console.log('✅ Location obtained successfully:', location);
                    return location;
                } else {
                    console.warn('⚠️ Invalid location object:', location);
                }
            } catch (error) {
                console.warn(`⚠️ Location attempt ${attempt + 1} failed:`, error.message);
                lastError = error;
                if (attempt < this.maxLocationRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }

        // If all attempts fail, try one more time with low accuracy
        try {
            console.log('🔄 Trying one more time with low accuracy');
            const location = await this._getCurrentLocationPromise({
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 120000
            });
            
            if (location && location.lat !== 0 && location.lng !== 0) {
                this.currentLocation = location;
                return location;
            }
        } catch (error) {
            console.error('❌ Final location attempt failed:', error);
        }

        throw lastError || new Error('Failed to get location after multiple attempts');
    }

    // Internal method to get current location as promise
    _getCurrentLocationPromise(options) {
        return new Promise((resolve, reject) => {
            let resolved = false;
            
            // Set a timeout to prevent hanging
            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    reject(new Error('Location request timed out'));
                }
            }, options.timeout || 15000);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        console.log('📍 Raw position received:', {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        });
                        const location = this._formatLocation(position);
                        if (location) {
                            resolve(location);
                        } else {
                            reject(new Error('Invalid location data'));
                        }
                    }
                },
                (error) => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        reject(error);
                    }
                },
                {
                    enableHighAccuracy: options.enableHighAccuracy || false,
                    timeout: options.timeout || 15000,
                    maximumAge: options.maximumAge || 60000
                }
            );
        });
    }

    // Start watching location continuously
    startWatching(callback, options = {}) {
        if (this.watchId !== null) {
            this.stopWatching();
        }

        const defaultOptions = {
            enableHighAccuracy: false,
            maximumAge: 60000,
            timeout: 15000,
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const location = this._formatLocation(position);
                if (location) {
                    this.currentLocation = location;
                    
                    this.callbacks.forEach(cb => {
                        if (typeof cb === 'function') {
                            cb(location);
                        }
                    });
                    
                    if (callback && typeof callback === 'function') {
                        callback(location);
                    }
                }
            },
            (error) => {
                console.error('Location watch error:', error);
                this.lastError = error;
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

        if (callback && typeof callback === 'function') {
            this.callbacks.push(callback);
        }

        this.isWatching = true;
        return this.watchId;
    }

    // Stop watching location
    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.isWatching = false;
        this.callbacks = [];
    }

    // Subscribe to location updates
    subscribe(callback) {
        if (typeof callback !== 'function') {
            console.error('Callback must be a function');
            return () => {};
        }
        
        this.callbacks.push(callback);
        
        if (!this.isWatching) {
            this.startWatching();
        }
        
        if (this.currentLocation) {
            callback(this.currentLocation);
        }
        
        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
            if (this.callbacks.length === 0 && this.isWatching) {
                this.stopWatching();
            }
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

    // Check if location services are available
    isAvailable() {
        return !!navigator.geolocation;
    }

    // Calculate distance between two coordinates
    calculateDistance(lat1, lon1, lat2, lon2) {
        if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
            return Infinity;
        }

        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
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

    // Check if location is stale
    _isLocationStale(maxAge = 60000) {
        if (!this.currentLocation) return true;
        const age = Date.now() - (this.currentLocation.timestamp || 0);
        return age > maxAge;
    }

    // Format location from position object - Returns null for invalid locations
    _formatLocation(position) {
        if (!position || !position.coords) {
            console.log('⚠️ Invalid position object');
            return null;
        }
        
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy || 0;
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lng)) {
            console.log('⚠️ Invalid coordinates (NaN):', { lat, lng });
            return null;
        }
        
        // Check if coordinates are zero (default/error)
        if (lat === 0 && lng === 0) {
            console.log('⚠️ Zero coordinates received');
            return null;
        }
        
        // Check if coordinates are reasonable (within Earth bounds)
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            console.log('⚠️ Coordinates out of bounds:', { lat, lng });
            return null;
        }
        
        const location = {
            lat: lat,
            lng: lng,
            accuracy: accuracy,
            timestamp: position.timestamp || Date.now()
        };
        
        console.log('✅ Formatted location:', location);
        return location;
    }

    // Get error message from geolocation error
    getErrorMessage(error) {
        if (!error) return 'An unknown error occurred.';
        
        switch (error.code) {
            case 1:
                return 'Location permission denied. Please enable location access in browser settings.';
            case 2:
                return 'Location information is unavailable. Please ensure GPS is enabled.';
            case 3:
                return 'Location request timed out. Please try again.';
            default:
                return error.message || 'An unknown error occurred while getting location.';
        }
    }

    // Clean up all resources
    cleanup() {
        this.stopWatching();
        this.callbacks = [];
        this.currentLocation = null;
        this.permissionStatus = null;
        this.isWatching = false;
        this.locationRetries = 0;
        this.lastError = null;
    }
}

// Create singleton instance
const locationService = new LocationService();
export default locationService;