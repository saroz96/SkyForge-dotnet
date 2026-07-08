// components/CompanyManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Container,
    Badge,
    Card,
    Button,
    Row,
    Col,
    Alert,
    InputGroup,
    Form,
    Spinner,
    Placeholder
} from 'react-bootstrap';
import {
    FaBuilding,
    FaCodeBranch,
    FaSearch,
    FaFilter,
    FaEnvelope,
    FaPhone,
    FaCalendar,
    FaIdCard,
    FaPlus,
    FaSync
} from 'react-icons/fa';
import CompanySplitWizard from './CompanySplitWizard';
import axios from 'axios';
import DashboardLayout from './DashboardLayout';
import { useSelector } from 'react-redux';

const SplitCompany = () => {
    const [companies, setCompanies] = useState([]);
    const [fiscalYears, setFiscalYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSplitWizard, setShowSplitWizard] = useState(false);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTradeType, setFilterTradeType] = useState('all');
    const [refreshing, setRefreshing] = useState(false);

    // Get user info from Redux store (following your existing pattern)
    const { userInfo } = useSelector((state) => state.auth);
    const isAdminOrSupervisor = userInfo?.isAdmin || userInfo?.role === 'Supervisor';

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    // Add authorization header to all requests (following your existing pattern)
    api.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterCompanies();
    }, [companies, searchTerm, filterTradeType]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch companies
            const companiesResponse = await api.get('/api/Companies/user-companies');
            let companiesData = [];
            if (Array.isArray(companiesResponse.data)) {
                companiesData = companiesResponse.data;
            } else if (companiesResponse.data && companiesResponse.data.success) {
                companiesData = companiesResponse.data.data || [];
            } else if (companiesResponse.data && companiesResponse.data.$values) {
                companiesData = companiesResponse.data.$values;
            }
            setCompanies(companiesData);

            // Fetch fiscal years with proper company mapping
            try {
                // Option 1: Fetch fiscal years for each company individually
                const allFiscalYears = [];
                for (const company of companiesData) {
                    try {
                        const fyResponse = await api.get(`/api/FiscalYears/company/${company.id || company._id}`);
                        let fiscalYearsData = [];
                        if (fyResponse.data && fyResponse.data.success) {
                            fiscalYearsData = fyResponse.data.data || [];
                        } else if (Array.isArray(fyResponse.data)) {
                            fiscalYearsData = fyResponse.data;
                        } else if (fyResponse.data && fyResponse.data.$values) {
                            fiscalYearsData = fyResponse.data.$values;
                        }

                        // Add companyId to each fiscal year
                        fiscalYearsData = fiscalYearsData.map(fy => ({
                            ...fy,
                            companyId: company.id || company._id
                        }));

                        allFiscalYears.push(...fiscalYearsData);
                    } catch (fyErr) {
                        console.warn(`Could not fetch fiscal years for company ${company.name}:`, fyErr);
                    }
                }
                setFiscalYears(allFiscalYears);
            } catch (fyErr) {
                console.warn('Could not fetch fiscal years:', fyErr);
                setFiscalYears([]);
            }

        } catch (err) {
            console.error('Error fetching data:', err);
            setError(`Failed to load data: ${err.response?.data?.message || err.message}`);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const filterCompanies = () => {
        let filtered = [...companies];

        if (searchTerm) {
            filtered = filtered.filter(company =>
                company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.phone?.includes(searchTerm)
            );
        }

        if (filterTradeType !== 'all') {
            filtered = filtered.filter(company =>
                company.tradeType?.toLowerCase() === filterTradeType.toLowerCase()
            );
        }

        setFilteredCompanies(filtered);
    };

    const handleSplitSuccess = () => {
        setShowSplitWizard(false);
        fetchData();
    };

    const getTradeTypeVariant = (tradeType) => {
        const variants = {
            'retailer': 'success',
            'pharmacy': 'info',
            'other': 'secondary'
        };
        return variants[tradeType?.toLowerCase()] || 'primary';
    };

    const getUniqueTradeTypes = () => {
        const tradeTypes = companies.map(company => company.tradeType?.toLowerCase());
        return ['all', ...new Set(tradeTypes.filter(Boolean))];
    };

    const LoadingSkeleton = () => (
        <Row>
            {[1, 2, 3].map(item => (
                <Col md={6} lg={4} key={item} className="mb-4">
                    <Card className="h-100">
                        <Card.Header className="bg-light">
                            <Placeholder as={Card.Title} animation="wave">
                                <Placeholder xs={8} />
                            </Placeholder>
                        </Card.Header>
                        <Card.Body>
                            <Placeholder as="p" animation="wave">
                                <Placeholder xs={12} />
                            </Placeholder>
                            <Placeholder as="p" animation="wave">
                                <Placeholder xs={10} />
                            </Placeholder>
                            <Placeholder as="p" animation="wave">
                                <Placeholder xs={6} />
                            </Placeholder>
                        </Card.Body>
                    </Card>
                </Col>
            ))}
        </Row>
    );

    if (loading && !refreshing) {
        return (
            <DashboardLayout user={userInfo} isAdminOrSupervisor={isAdminOrSupervisor}>
                <Container className="py-4">
                    <div className="text-center">
                        <Spinner animation="border" role="status" className="text-primary">
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                        <p className="mt-2">Loading companies...</p>
                    </div>
                </Container>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout user={userInfo} isAdminOrSupervisor={isAdminOrSupervisor}>
            <Container className="py-4">
                {/* Header Section */}
                <Row className="mb-4 align-items-center">
                    <Col>
                        <div className="d-flex align-items-center">
                            <div className="bg-primary rounded p-3 me-3">
                                <FaBuilding size={32} className="text-white" />
                            </div>
                            <div>
                                <h1 className="h2 mb-1">Company Management</h1>
                                <p className="text-muted mb-0">
                                    Manage your companies and split them by fiscal year
                                </p>
                            </div>
                        </div>
                    </Col>
                    <Col xs="auto">
                        <div className="d-flex gap-2">
                            <Button
                                variant="outline-primary"
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="d-flex align-items-center"
                            >
                                <FaSync className={`me-2 ${refreshing ? 'fa-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => setShowSplitWizard(true)}
                                className="d-flex align-items-center"
                                disabled={companies.length === 0}
                            >
                                <FaCodeBranch className="me-2" />
                                Split Company
                            </Button>
                        </div>
                    </Col>
                </Row>

                {error && (
                    <Alert variant="danger" className="mb-4">
                        <strong>Error:</strong> {error}
                    </Alert>
                )}

                {/* Stats and Filters Section */}
                <Card className="mb-4">
                    <Card.Body>
                        <Row className="align-items-center">
                            <Col md={4}>
                                <div className="d-flex align-items-center">
                                    <div className="bg-light rounded p-2 me-3">
                                        <FaBuilding className="text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="mb-0">{companies.length}</h4>
                                        <small className="text-muted">Total Companies</small>
                                    </div>
                                </div>
                            </Col>
                            <Col md={8}>
                                <Row className="g-2">
                                    <Col md={6}>
                                        <InputGroup>
                                            <InputGroup.Text>
                                                <FaSearch />
                                            </InputGroup.Text>
                                            <Form.Control
                                                type="text"
                                                placeholder="Search companies..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </InputGroup>
                                    </Col>
                                    <Col md={6}>
                                        <InputGroup>
                                            <InputGroup.Text>
                                                <FaFilter />
                                            </InputGroup.Text>
                                            <Form.Select
                                                value={filterTradeType}
                                                onChange={(e) => setFilterTradeType(e.target.value)}
                                            >
                                                <option value="all">All Types</option>
                                                {getUniqueTradeTypes()
                                                    .filter(type => type !== 'all')
                                                    .map(type => (
                                                        <option key={type} value={type}>
                                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                                        </option>
                                                    ))
                                                }
                                            </Form.Select>
                                        </InputGroup>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Results Info */}
                {filteredCompanies.length !== companies.length && (
                    <Alert variant="info" className="mb-4">
                        Showing {filteredCompanies.length} of {companies.length} companies
                        {searchTerm && ` matching "${searchTerm}"`}
                        {filterTradeType !== 'all' && ` with type "${filterTradeType}"`}
                    </Alert>
                )}

                {/* Companies Grid */}
                {refreshing ? (
                    <LoadingSkeleton />
                ) : filteredCompanies.length === 0 ? (
                    <Card className="text-center py-5">
                        <Card.Body>
                            <FaBuilding size={48} className="text-muted mb-3" />
                            <h4>No Companies Found</h4>
                            <p className="text-muted mb-3">
                                {companies.length === 0
                                    ? "You don't have access to any companies yet."
                                    : "No companies match your search criteria."
                                }
                            </p>
                        </Card.Body>
                    </Card>
                ) : (
                    <Row>
                        {filteredCompanies.map(company => (
                            <Col md={6} lg={4} key={company.id || company._id} className="mb-4">
                                <Card className="h-100 shadow-sm hover-shadow">
                                    <Card.Header className="bg-light d-flex justify-content-between align-items-center border-0">
                                        <h5 className="mb-0 text-truncate" title={company.name}>
                                            {company.name}
                                        </h5>
                                        <Badge bg={getTradeTypeVariant(company.tradeType)}>
                                            {company.tradeType || 'Unknown'}
                                        </Badge>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="d-flex align-items-center mb-3">
                                            <FaEnvelope className="text-muted me-2" />
                                            <span className="text-truncate" title={company.email}>
                                                {company.email || 'No email'}
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center mb-3">
                                            <FaPhone className="text-muted me-2" />
                                            <span>{company.phone || 'No phone'}</span>
                                        </div>
                                        <div className="d-flex align-items-center mb-3">
                                            <FaCalendar className="text-muted me-2" />
                                            <span>Date Format: {company.dateFormat || 'N/A'}</span>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <FaIdCard className="text-muted me-2" />
                                            <small className="text-muted font-monospace">
                                                ID: {(company.id || company._id).substring(0, 8)}...
                                            </small>
                                        </div>
                                    </Card.Body>
                                    <Card.Footer className="bg-transparent border-0">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <small className="text-muted">
                                                Created: {new Date(company.createdAt).toLocaleDateString()}
                                            </small>
                                            <Badge bg="outline-secondary" text="dark">
                                                {company.vatEnabled ? 'VAT Enabled' : 'VAT Disabled'}
                                            </Badge>
                                        </div>
                                    </Card.Footer>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}

                {/* Company Split Wizard */}
                {companies.length > 0 && (
                    <CompanySplitWizard
                        show={showSplitWizard}
                        onHide={() => setShowSplitWizard(false)}
                        companies={companies}
                        fiscalYears={fiscalYears}
                        currentCompany={companies[0]}
                        onSuccess={handleSplitSuccess}
                    />
                )}
            </Container>
        </DashboardLayout>
    );
};

export default SplitCompany;