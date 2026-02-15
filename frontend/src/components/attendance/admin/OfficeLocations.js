import React, { useState, useEffect } from 'react';
import { Container, Card, Alert, Spinner } from 'react-bootstrap';
import { FaBuilding, FaMapMarkerAlt } from 'react-icons/fa';
import OfficeLocationManager from '../../components/attendance/OfficeLocationManager';
import Header from '../retailer/Header';

const OfficeLocationsPage = () => {
    const [company, setCompany] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchUserAndCompany();
    }, []);

    const fetchUserAndCompany = async () => {
        try {
            // Fetch user data
            const userResponse = await axios.get('/api/auth/me', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setUser(userResponse.data.user);

            // Fetch company data
            const companyResponse = await axios.get('/api/my-company', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (companyResponse.data.success) {
                setCompany(companyResponse.data.company);
            }
        } catch (error) {
            setError('Failed to load data');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading office locations...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="py-5">
                <Alert variant="danger">{error}</Alert>
            </Container>
        );
    }

    if (!company) {
        return (
            <Container className="py-5 text-center">
                <FaBuilding size={48} className="text-muted mb-3" />
                <h5>No Company Selected</h5>
                <p className="text-muted">Please select a company first</p>
            </Container>
        );
    }

    return (
        <>
            <Container className="py-4">
                <Card className="shadow-sm">
                    <Card.Header className="bg-primary text-white">
                        <h5 className="mb-0">
                            <FaMapMarkerAlt className="me-2" />
                            Office Locations Management
                        </h5>
                    </Card.Header>
                    <Card.Body>
                        <OfficeLocationManager
                            company={company}
                            user={user}
                            onUpdate={() => {
                                // Refresh data if needed
                                fetchUserAndCompany();
                            }}
                        />
                    </Card.Body>
                </Card>
            </Container>
        </>
    );
};

export default OfficeLocationsPage;