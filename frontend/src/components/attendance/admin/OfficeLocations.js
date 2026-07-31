import React, { useState, useEffect } from 'react';
import { Container, Card, Alert, Spinner } from 'react-bootstrap';
import { FaBuilding, FaMapMarkerAlt } from 'react-icons/fa';
import axios from 'axios';
import OfficeLocationManager from '../../components/attendance/OfficeLocationManager';
import Header from '../retailer/Header';

// Create axios instance with auth interceptor (matching your existing pattern)
const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

const OfficeLocationsPage = () => {
    const [company, setCompany] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Helper to get user from token
    const getUserFromToken = () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;

            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const decoded = JSON.parse(jsonPayload);
            
            return {
                id: decoded.userId || decoded.sub || decoded.nameid,
                name: decoded.name || decoded.unique_name || 'User',
                email: decoded.email || decoded.Email,
                role: decoded.role || decoded.Role || 'User',
                isAdmin: decoded.isAdmin === 'true' || decoded.isAdmin === true,
                currentCompany: decoded.currentCompany || decoded.companyId,
                currentCompanyName: decoded.currentCompanyName || decoded.companyName
            };
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    };

    // Helper to get company from token
    const getCompanyFromToken = () => {
        try {
            const userData = getUserFromToken();
            if (userData?.currentCompany) {
                return {
                    id: userData.currentCompany,
                    _id: userData.currentCompany,
                    name: userData.currentCompanyName || 'Company',
                    attendanceSettings: {
                        geoFencingEnabled: false,
                        officeLocations: [],
                        workingHours: { startTime: '09:00', endTime: '17:00', gracePeriod: 15 }
                    }
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting company from token:', error);
            return null;
        }
    };

    const fetchUserAndCompany = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get user from token first
            const userData = getUserFromToken();
            if (userData) {
                setUser(userData);
                
                // Get company from token
                const companyData = getCompanyFromToken();
                if (companyData) {
                    setCompany(companyData);
                    // Try to fetch full company data with attendance settings
                    await fetchCompanyData(companyData.id);
                } else {
                    // Try to fetch from API
                    await fetchCompanyDataFromAPI();
                }
            } else {
                setError('Please login to access office locations');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanyData = async (companyId) => {
        if (!companyId) return;

        try {
            const response = await api.get('/api/attendance/company-data');
            
            if (response.data.success) {
                const companyData = response.data.data;
                setCompany({
                    id: companyData._id || companyData.id,
                    _id: companyData._id || companyData.id,
                    name: companyData.name,
                    attendanceSettings: companyData.attendanceSettings || {
                        geoFencingEnabled: false,
                        officeLocations: [],
                        workingHours: { startTime: '09:00', endTime: '17:00', gracePeriod: 15 }
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching company data:', error);
            // Keep the company from token as fallback
        }
    };

    const fetchCompanyDataFromAPI = async () => {
        try {
            const response = await api.get('/api/attendance/company-data');
            
            if (response.data.success) {
                const companyData = response.data.data;
                setCompany({
                    id: companyData._id || companyData.id,
                    _id: companyData._id || companyData.id,
                    name: companyData.name,
                    attendanceSettings: companyData.attendanceSettings || {
                        geoFencingEnabled: false,
                        officeLocations: [],
                        workingHours: { startTime: '09:00', endTime: '17:00', gracePeriod: 15 }
                    }
                });
            } else {
                setError('Failed to load company data');
            }
        } catch (error) {
            console.error('Error fetching company data from API:', error);
            // Try fallback
            try {
                const fallbackResponse = await api.get('/api/Companies/user-companies');
                if (fallbackResponse.data && fallbackResponse.data.length > 0) {
                    const firstCompany = fallbackResponse.data[0];
                    setCompany({
                        id: firstCompany.id || firstCompany.Id || firstCompany._id,
                        _id: firstCompany.id || firstCompany.Id || firstCompany._id,
                        name: firstCompany.name,
                        attendanceSettings: {
                            geoFencingEnabled: false,
                            officeLocations: [],
                            workingHours: { startTime: '09:00', endTime: '17:00', gracePeriod: 15 }
                        }
                    });
                } else {
                    setError('No companies found. Please create a company first.');
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                setError('Failed to load company information');
            }
        }
    };

    useEffect(() => {
        fetchUserAndCompany();
    }, []);

    if (loading) {
        return (
            <Container className="py-4 text-center">
                <Spinner animation="border" variant="primary" size="sm" />
                <p className="mt-2 text-muted" style={{ fontSize: '0.85rem' }}>Loading office locations...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="py-4">
                <Alert variant="danger" className="py-2" style={{ fontSize: '0.85rem' }}>
                    {error}
                </Alert>
            </Container>
        );
    }

    if (!company) {
        return (
            <Container className="py-4 text-center">
                <FaBuilding size={40} className="text-muted mb-2" />
                <h6 className="mb-1">No Company Selected</h6>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Please select a company first</p>
                <button 
                    className="btn btn-primary btn-sm mt-2"
                    onClick={() => window.location.href = '/select-company'}
                    style={{ fontSize: '0.8rem', padding: '4px 16px' }}
                >
                    Select Company
                </button>
            </Container>
        );
    }

    return (
        <>
            <Header />
            <Container className="py-2" style={{ maxWidth: '1400px' }}>
                <Card className="shadow-sm border-0">
                    <Card.Header className="bg-primary text-white py-1 px-3 d-flex align-items-center" style={{ minHeight: '40px' }}>
                        <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '0.9rem' }}>
                            <FaMapMarkerAlt className="me-2" size={16} />
                            Office Locations Management
                        </h6>
                        {company?.name && (
                            <span className="ms-3 text-light" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                <FaBuilding className="me-1" size={12} />
                                {company.name}
                            </span>
                        )}
                    </Card.Header>
                    <Card.Body className="p-2">
                        <OfficeLocationManager
                            company={company}
                            user={user}
                            onUpdate={() => {
                                fetchCompanyData(company.id);
                            }}
                        />
                    </Card.Body>
                </Card>
            </Container>
        </>
    );
};

export default OfficeLocationsPage;