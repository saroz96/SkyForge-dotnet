// // components/CompanyManagement.js
// import React, { useState, useEffect, useCallback } from 'react';
// import {
//     Container,
//     Badge,
//     Card,
//     Button,
//     Row,
//     Col,
//     Alert,
//     InputGroup,
//     Form,
//     Spinner,
//     Placeholder
// } from 'react-bootstrap';
// import {
//     FaBuilding,
//     FaCodeBranch,
//     FaSearch,
//     FaFilter,
//     FaEnvelope,
//     FaPhone,
//     FaCalendar,
//     FaIdCard,
//     FaPlus,
//     FaSync
// } from 'react-icons/fa';
// import CompanySplitWizard from './CompanySplitWizard';
// import axios from 'axios';
// import DashboardLayout from './DashboardLayout';
// import { useSelector } from 'react-redux';

// const SplitCompany = () => {
//     const [companies, setCompanies] = useState([]);
//     const [fiscalYears, setFiscalYears] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [showSplitWizard, setShowSplitWizard] = useState(false);
//     const [filteredCompanies, setFilteredCompanies] = useState([]);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [filterTradeType, setFilterTradeType] = useState('all');
//     const [refreshing, setRefreshing] = useState(false);

//     // Get user info from Redux store (following your existing pattern)
//     const { userInfo } = useSelector((state) => state.auth);
//     const isAdminOrSupervisor = userInfo?.isAdmin || userInfo?.role === 'Supervisor';

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // Add authorization header to all requests (following your existing pattern)
//     api.interceptors.request.use(
//         (config) => {
//             const token = localStorage.getItem('token');
//             if (token) {
//                 config.headers.Authorization = `Bearer ${token}`;
//             }
//             return config;
//         },
//         (error) => {
//             return Promise.reject(error);
//         }
//     );

//     useEffect(() => {
//         fetchData();
//     }, []);

//     useEffect(() => {
//         filterCompanies();
//     }, [companies, searchTerm, filterTradeType]);

//     const fetchData = async () => {
//         try {
//             setLoading(true);
//             setError(null);

//             // Fetch companies
//             const companiesResponse = await api.get('/api/Companies/user-companies');
//             let companiesData = [];
//             if (Array.isArray(companiesResponse.data)) {
//                 companiesData = companiesResponse.data;
//             } else if (companiesResponse.data && companiesResponse.data.success) {
//                 companiesData = companiesResponse.data.data || [];
//             } else if (companiesResponse.data && companiesResponse.data.$values) {
//                 companiesData = companiesResponse.data.$values;
//             }
//             setCompanies(companiesData);

//             // Fetch fiscal years with proper company mapping
//             try {
//                 // Option 1: Fetch fiscal years for each company individually
//                 const allFiscalYears = [];
//                 for (const company of companiesData) {
//                     try {
//                         const fyResponse = await api.get(`/api/FiscalYears/company/${company.id || company._id}`);
//                         let fiscalYearsData = [];
//                         if (fyResponse.data && fyResponse.data.success) {
//                             fiscalYearsData = fyResponse.data.data || [];
//                         } else if (Array.isArray(fyResponse.data)) {
//                             fiscalYearsData = fyResponse.data;
//                         } else if (fyResponse.data && fyResponse.data.$values) {
//                             fiscalYearsData = fyResponse.data.$values;
//                         }

//                         // Add companyId to each fiscal year
//                         fiscalYearsData = fiscalYearsData.map(fy => ({
//                             ...fy,
//                             companyId: company.id || company._id
//                         }));

//                         allFiscalYears.push(...fiscalYearsData);
//                     } catch (fyErr) {
//                         console.warn(`Could not fetch fiscal years for company ${company.name}:`, fyErr);
//                     }
//                 }
//                 setFiscalYears(allFiscalYears);
//             } catch (fyErr) {
//                 console.warn('Could not fetch fiscal years:', fyErr);
//                 setFiscalYears([]);
//             }

//         } catch (err) {
//             console.error('Error fetching data:', err);
//             setError(`Failed to load data: ${err.response?.data?.message || err.message}`);
//         } finally {
//             setLoading(false);
//             setRefreshing(false);
//         }
//     };

//     const handleRefresh = () => {
//         setRefreshing(true);
//         fetchData();
//     };

//     const filterCompanies = () => {
//         let filtered = [...companies];

//         if (searchTerm) {
//             filtered = filtered.filter(company =>
//                 company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 company.phone?.includes(searchTerm)
//             );
//         }

//         if (filterTradeType !== 'all') {
//             filtered = filtered.filter(company =>
//                 company.tradeType?.toLowerCase() === filterTradeType.toLowerCase()
//             );
//         }

//         setFilteredCompanies(filtered);
//     };

//     const handleSplitSuccess = () => {
//         setShowSplitWizard(false);
//         fetchData();
//     };

//     const getTradeTypeVariant = (tradeType) => {
//         const variants = {
//             'retailer': 'success',
//             'pharmacy': 'info',
//             'other': 'secondary'
//         };
//         return variants[tradeType?.toLowerCase()] || 'primary';
//     };

//     const getUniqueTradeTypes = () => {
//         const tradeTypes = companies.map(company => company.tradeType?.toLowerCase());
//         return ['all', ...new Set(tradeTypes.filter(Boolean))];
//     };

//     const LoadingSkeleton = () => (
//         <Row>
//             {[1, 2, 3].map(item => (
//                 <Col md={6} lg={4} key={item} className="mb-4">
//                     <Card className="h-100">
//                         <Card.Header className="bg-light">
//                             <Placeholder as={Card.Title} animation="wave">
//                                 <Placeholder xs={8} />
//                             </Placeholder>
//                         </Card.Header>
//                         <Card.Body>
//                             <Placeholder as="p" animation="wave">
//                                 <Placeholder xs={12} />
//                             </Placeholder>
//                             <Placeholder as="p" animation="wave">
//                                 <Placeholder xs={10} />
//                             </Placeholder>
//                             <Placeholder as="p" animation="wave">
//                                 <Placeholder xs={6} />
//                             </Placeholder>
//                         </Card.Body>
//                     </Card>
//                 </Col>
//             ))}
//         </Row>
//     );

//     if (loading && !refreshing) {
//         return (
//             <DashboardLayout user={userInfo} isAdminOrSupervisor={isAdminOrSupervisor}>
//                 <Container className="py-4">
//                     <div className="text-center">
//                         <Spinner animation="border" role="status" className="text-primary">
//                             <span className="visually-hidden">Loading...</span>
//                         </Spinner>
//                         <p className="mt-2">Loading companies...</p>
//                     </div>
//                 </Container>
//             </DashboardLayout>
//         );
//     }

//     return (
//         <DashboardLayout user={userInfo} isAdminOrSupervisor={isAdminOrSupervisor}>
//             <Container className="py-4">
//                 {/* Header Section */}
//                 <Row className="mb-4 align-items-center">
//                     <Col>
//                         <div className="d-flex align-items-center">
//                             <div className="bg-primary rounded p-3 me-3">
//                                 <FaBuilding size={32} className="text-white" />
//                             </div>
//                             <div>
//                                 <h1 className="h2 mb-1">Company Management</h1>
//                                 <p className="text-muted mb-0">
//                                     Manage your companies and split them by fiscal year
//                                 </p>
//                             </div>
//                         </div>
//                     </Col>
//                     <Col xs="auto">
//                         <div className="d-flex gap-2">
//                             <Button
//                                 variant="outline-primary"
//                                 onClick={handleRefresh}
//                                 disabled={refreshing}
//                                 className="d-flex align-items-center"
//                             >
//                                 <FaSync className={`me-2 ${refreshing ? 'fa-spin' : ''}`} />
//                                 Refresh
//                             </Button>
//                             <Button
//                                 variant="primary"
//                                 onClick={() => setShowSplitWizard(true)}
//                                 className="d-flex align-items-center"
//                                 disabled={companies.length === 0}
//                             >
//                                 <FaCodeBranch className="me-2" />
//                                 Split Company
//                             </Button>
//                         </div>
//                     </Col>
//                 </Row>

//                 {error && (
//                     <Alert variant="danger" className="mb-4">
//                         <strong>Error:</strong> {error}
//                     </Alert>
//                 )}

//                 {/* Stats and Filters Section */}
//                 <Card className="mb-4">
//                     <Card.Body>
//                         <Row className="align-items-center">
//                             <Col md={4}>
//                                 <div className="d-flex align-items-center">
//                                     <div className="bg-light rounded p-2 me-3">
//                                         <FaBuilding className="text-primary" />
//                                     </div>
//                                     <div>
//                                         <h4 className="mb-0">{companies.length}</h4>
//                                         <small className="text-muted">Total Companies</small>
//                                     </div>
//                                 </div>
//                             </Col>
//                             <Col md={8}>
//                                 <Row className="g-2">
//                                     <Col md={6}>
//                                         <InputGroup>
//                                             <InputGroup.Text>
//                                                 <FaSearch />
//                                             </InputGroup.Text>
//                                             <Form.Control
//                                                 type="text"
//                                                 placeholder="Search companies..."
//                                                 value={searchTerm}
//                                                 onChange={(e) => setSearchTerm(e.target.value)}
//                                             />
//                                         </InputGroup>
//                                     </Col>
//                                     <Col md={6}>
//                                         <InputGroup>
//                                             <InputGroup.Text>
//                                                 <FaFilter />
//                                             </InputGroup.Text>
//                                             <Form.Select
//                                                 value={filterTradeType}
//                                                 onChange={(e) => setFilterTradeType(e.target.value)}
//                                             >
//                                                 <option value="all">All Types</option>
//                                                 {getUniqueTradeTypes()
//                                                     .filter(type => type !== 'all')
//                                                     .map(type => (
//                                                         <option key={type} value={type}>
//                                                             {type.charAt(0).toUpperCase() + type.slice(1)}
//                                                         </option>
//                                                     ))
//                                                 }
//                                             </Form.Select>
//                                         </InputGroup>
//                                     </Col>
//                                 </Row>
//                             </Col>
//                         </Row>
//                     </Card.Body>
//                 </Card>

//                 {/* Results Info */}
//                 {filteredCompanies.length !== companies.length && (
//                     <Alert variant="info" className="mb-4">
//                         Showing {filteredCompanies.length} of {companies.length} companies
//                         {searchTerm && ` matching "${searchTerm}"`}
//                         {filterTradeType !== 'all' && ` with type "${filterTradeType}"`}
//                     </Alert>
//                 )}

//                 {/* Companies Grid */}
//                 {refreshing ? (
//                     <LoadingSkeleton />
//                 ) : filteredCompanies.length === 0 ? (
//                     <Card className="text-center py-5">
//                         <Card.Body>
//                             <FaBuilding size={48} className="text-muted mb-3" />
//                             <h4>No Companies Found</h4>
//                             <p className="text-muted mb-3">
//                                 {companies.length === 0
//                                     ? "You don't have access to any companies yet."
//                                     : "No companies match your search criteria."
//                                 }
//                             </p>
//                         </Card.Body>
//                     </Card>
//                 ) : (
//                     <Row>
//                         {filteredCompanies.map(company => (
//                             <Col md={6} lg={4} key={company.id || company._id} className="mb-4">
//                                 <Card className="h-100 shadow-sm hover-shadow">
//                                     <Card.Header className="bg-light d-flex justify-content-between align-items-center border-0">
//                                         <h5 className="mb-0 text-truncate" title={company.name}>
//                                             {company.name}
//                                         </h5>
//                                         <Badge bg={getTradeTypeVariant(company.tradeType)}>
//                                             {company.tradeType || 'Unknown'}
//                                         </Badge>
//                                     </Card.Header>
//                                     <Card.Body>
//                                         <div className="d-flex align-items-center mb-3">
//                                             <FaEnvelope className="text-muted me-2" />
//                                             <span className="text-truncate" title={company.email}>
//                                                 {company.email || 'No email'}
//                                             </span>
//                                         </div>
//                                         <div className="d-flex align-items-center mb-3">
//                                             <FaPhone className="text-muted me-2" />
//                                             <span>{company.phone || 'No phone'}</span>
//                                         </div>
//                                         <div className="d-flex align-items-center mb-3">
//                                             <FaCalendar className="text-muted me-2" />
//                                             <span>Date Format: {company.dateFormat || 'N/A'}</span>
//                                         </div>
//                                         <div className="d-flex align-items-center">
//                                             <FaIdCard className="text-muted me-2" />
//                                             <small className="text-muted font-monospace">
//                                                 ID: {(company.id || company._id).substring(0, 8)}...
//                                             </small>
//                                         </div>
//                                     </Card.Body>
//                                     <Card.Footer className="bg-transparent border-0">
//                                         <div className="d-flex justify-content-between align-items-center">
//                                             <small className="text-muted">
//                                                 Created: {new Date(company.createdAt).toLocaleDateString()}
//                                             </small>
//                                             <Badge bg="outline-secondary" text="dark">
//                                                 {company.vatEnabled ? 'VAT Enabled' : 'VAT Disabled'}
//                                             </Badge>
//                                         </div>
//                                     </Card.Footer>
//                                 </Card>
//                             </Col>
//                         ))}
//                     </Row>
//                 )}

//                 {/* Company Split Wizard */}
//                 {companies.length > 0 && (
//                     <CompanySplitWizard
//                         show={showSplitWizard}
//                         onHide={() => setShowSplitWizard(false)}
//                         companies={companies}
//                         fiscalYears={fiscalYears}
//                         currentCompany={companies[0]}
//                         onSuccess={handleSplitSuccess}
//                     />
//                 )}
//             </Container>
//         </DashboardLayout>
//     );
// };

// export default SplitCompany;

//---------------------------------------------------------------------------end

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
    Table,
    Pagination,
    OverlayTrigger,
    Tooltip
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
    FaSync,
    FaEye,
    FaEdit,
    FaTrash,
    FaChevronLeft,
    FaChevronRight,
    FaChevronDown,
    FaChevronUp,
    FaSort,
    FaSortUp,
    FaSortDown,
    FaCheckCircle,
    FaTimesCircle,
    FaClock
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
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // Sorting state
    const [sortField, setSortField] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');

    // Get user info from Redux store
    const { userInfo } = useSelector((state) => state.auth);
    const isAdminOrSupervisor = userInfo?.isAdmin || userInfo?.role === 'Supervisor';

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    // Add authorization header to all requests
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
        filterAndSortCompanies();
    }, [companies, searchTerm, filterTradeType, sortField, sortDirection]);

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

    const filterAndSortCompanies = () => {
        let filtered = [...companies];

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(company =>
                company.name?.toLowerCase().includes(term) ||
                company.email?.toLowerCase().includes(term) ||
                company.phone?.includes(term) ||
                company.address?.toLowerCase().includes(term) ||
                company.pan?.toLowerCase().includes(term)
            );
        }

        // Apply trade type filter
        if (filterTradeType !== 'all') {
            filtered = filtered.filter(company =>
                company.tradeType?.toLowerCase() === filterTradeType.toLowerCase()
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aVal = a[sortField] || '';
            let bVal = b[sortField] || '';
            
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredCompanies(filtered);
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const handleSplitSuccess = () => {
        setShowSplitWizard(false);
        fetchData();
    };

    const getTradeTypeVariant = (tradeType) => {
        const variants = {
            'retailer': 'success',
            'pharmacy': 'info',
            'wholesaler': 'warning',
            'distributor': 'primary',
            'other': 'secondary'
        };
        return variants[tradeType?.toLowerCase()] || 'primary';
    };

    const getStatusVariant = (isActive) => {
        return isActive !== false ? 'success' : 'danger';
    };

    const getStatusText = (isActive) => {
        return isActive !== false ? 'Active' : 'Inactive';
    };

    const getUniqueTradeTypes = () => {
        const tradeTypes = companies.map(company => company.tradeType?.toLowerCase());
        return ['all', ...new Set(tradeTypes.filter(Boolean))];
    };

    // Pagination calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCompanies.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return <FaSort className="text-muted ms-1" />;
        return sortDirection === 'asc' ? 
            <FaSortUp className="text-primary ms-1" /> : 
            <FaSortDown className="text-primary ms-1" />;
    };

    const LoadingSkeleton = () => (
        <Card>
            <Card.Body>
                <Table hover>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Company Name</th>
                            <th>Trade Type</th>
                            <th>Contact</th>
                            <th>PAN</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[1, 2, 3, 4, 5].map(item => (
                            <tr key={item}>
                                <td><Spinner animation="border" size="sm" /></td>
                                <td><Spinner animation="border" size="sm" /></td>
                                <td><Spinner animation="border" size="sm" /></td>
                                <td><Spinner animation="border" size="sm" /></td>
                                <td><Spinner animation="border" size="sm" /></td>
                                <td><Spinner animation="border" size="sm" /></td>
                                <td><Spinner animation="border" size="sm" /></td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );

    if (loading && !refreshing) {
        return (
            <DashboardLayout user={userInfo} isAdminOrSupervisor={isAdminOrSupervisor}>
                <Container className="py-4">
                    <div className="text-center py-5">
                        <Spinner animation="border" role="status" className="text-primary" style={{ width: '3rem', height: '3rem' }}>
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                        <p className="mt-3 text-muted">Loading companies...</p>
                    </div>
                </Container>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout user={userInfo} isAdminOrSupervisor={isAdminOrSupervisor}>
            <Container fluid className="py-4">
                {/* Header Section */}
                <Row className="mb-4 align-items-center">
                    <Col lg={8}>
                        <div className="d-flex align-items-center">
                            <div className="bg-primary bg-opacity-10 rounded-3 p-3 me-3">
                                <FaBuilding size={32} className="text-primary" />
                            </div>
                            <div>
                                <h1 className="h2 mb-1 fw-bold">Company Management</h1>
                                <p className="text-muted mb-0">
                                    Manage your companies and split them by fiscal year
                                </p>
                            </div>
                        </div>
                    </Col>
                    <Col lg={4} className="mt-3 mt-lg-0">
                        <div className="d-flex gap-2 justify-content-lg-end">
                            <Button
                                variant="outline-secondary"
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
                    <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)}>
                        <strong>Error:</strong> {error}
                    </Alert>
                )}

                {/* Stats Cards */}
                {/* <Row className="mb-4">
                    <Col md={3} sm={6} className="mb-3">
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 rounded-3 p-3 me-3">
                                    <FaBuilding className="text-primary" size={24} />
                                </div>
                                <div>
                                    <h6 className="text-muted mb-0 small">Total Companies</h6>
                                    <h3 className="mb-0 fw-bold">{companies.length}</h3>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3} sm={6} className="mb-3">
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body className="d-flex align-items-center">
                                <div className="bg-success bg-opacity-10 rounded-3 p-3 me-3">
                                    <FaCheckCircle className="text-success" size={24} />
                                </div>
                                <div>
                                    <h6 className="text-muted mb-0 small">Active Companies</h6>
                                    <h3 className="mb-0 fw-bold">
                                        {companies.filter(c => c.isActive !== false).length}
                                    </h3>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3} sm={6} className="mb-3">
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body className="d-flex align-items-center">
                                <div className="bg-warning bg-opacity-10 rounded-3 p-3 me-3">
                                    <FaCalendar className="text-warning" size={24} />
                                </div>
                                <div>
                                    <h6 className="text-muted mb-0 small">Fiscal Years</h6>
                                    <h3 className="mb-0 fw-bold">{fiscalYears.length}</h3>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3} sm={6} className="mb-3">
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body className="d-flex align-items-center">
                                <div className="bg-info bg-opacity-10 rounded-3 p-3 me-3">
                                    <FaCodeBranch className="text-info" size={24} />
                                </div>
                                <div>
                                    <h6 className="text-muted mb-0 small">Trade Types</h6>
                                    <h3 className="mb-0 fw-bold">
                                        {new Set(companies.map(c => c.tradeType?.toLowerCase()).filter(Boolean)).size}
                                    </h3>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row> */}

                {/* Filters Section */}
                <Card className="mb-4 shadow-sm border-0">
                    <Card.Body>
                        <Row className="g-3 align-items-center">
                            <Col lg={5}>
                                <InputGroup>
                                    <InputGroup.Text className="bg-light border-end-0">
                                        <FaSearch className="text-muted" />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search by name, email, phone, PAN..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="border-start-0"
                                    />
                                    {searchTerm && (
                                        <Button
                                            variant="outline-secondary"
                                            onClick={() => {
                                                setSearchTerm('');
                                                setCurrentPage(1);
                                            }}
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </InputGroup>
                            </Col>
                            <Col lg={3}>
                                <InputGroup>
                                    <InputGroup.Text className="bg-light">
                                        <FaFilter className="text-muted" />
                                    </InputGroup.Text>
                                    <Form.Select
                                        value={filterTradeType}
                                        onChange={(e) => {
                                            setFilterTradeType(e.target.value);
                                            setCurrentPage(1);
                                        }}
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
                            <Col lg={2}>
                                <Form.Select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-light"
                                >
                                    <option value={5}>5 per page</option>
                                    <option value={10}>10 per page</option>
                                    <option value={25}>25 per page</option>
                                    <option value={50}>50 per page</option>
                                </Form.Select>
                            </Col>
                            <Col lg={2} className="text-end">
                                <small className="text-muted">
                                    {filteredCompanies.length} company{filteredCompanies.length !== 1 ? 'ies' : ''}
                                </small>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Companies Table */}
                {refreshing ? (
                    <LoadingSkeleton />
                ) : (
                    <Card className="shadow-sm border-0">
                        <Card.Body className="p-0">
                            <div className="table-responsive">
                                <Table hover className="mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th style={{ width: '60px' }}>#</th>
                                            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', minWidth: '180px' }}>
                                                Company Name {getSortIcon('name')}
                                            </th>
                                            <th onClick={() => handleSort('tradeType')} style={{ cursor: 'pointer', minWidth: '120px' }}>
                                                Trade Type {getSortIcon('tradeType')}
                                            </th>
                                            <th style={{ minWidth: '180px' }}>Contact</th>
                                            <th style={{ minWidth: '120px' }}>PAN</th>
                                            <th onClick={() => handleSort('isActive')} style={{ cursor: 'pointer', minWidth: '80px' }}>
                                                Status {getSortIcon('isActive')}
                                            </th>
                                            <th style={{ minWidth: '80px' }}>VAT</th>
                                            {/* <th style={{ minWidth: '150px' }} className="text-center">Actions</th> */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentItems.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="text-center py-5">
                                                    <FaBuilding size={32} className="text-muted mb-3" />
                                                    <h5 className="text-muted">No companies found</h5>
                                                    <p className="text-muted small">
                                                        {companies.length === 0
                                                            ? "You don't have access to any companies yet."
                                                            : "No companies match your search criteria."
                                                        }
                                                    </p>
                                                </td>
                                            </tr>
                                        ) : (
                                            currentItems.map((company, index) => (
                                                <tr key={company.id || company._id}>
                                                    <td className="text-muted">
                                                        {indexOfFirstItem + index + 1}
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div className="bg-primary bg-opacity-10 rounded p-2 me-2">
                                                                <FaBuilding className="text-primary" size={14} />
                                                            </div>
                                                            <div>
                                                                <strong>{company.name}</strong>
                                                                <div className="text-muted small">
                                                                    ID: {(company.id || company._id).substring(0, 8)}...
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <Badge bg={getTradeTypeVariant(company.tradeType)}>
                                                            {company.tradeType || 'Unknown'}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <div className="small">
                                                            {company.email && (
                                                                <div className="text-truncate" style={{ maxWidth: '160px' }}>
                                                                    <FaEnvelope className="text-muted me-1" size={12} />
                                                                    {company.email}
                                                                </div>
                                                            )}
                                                            {company.phone && (
                                                                <div>
                                                                    <FaPhone className="text-muted me-1" size={12} />
                                                                    {company.phone}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <code className="small">{company.pan || 'N/A'}</code>
                                                    </td>
                                                    <td>
                                                        <Badge bg={getStatusVariant(company.isActive)}>
                                                            {getStatusText(company.isActive)}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        {company.vatEnabled ? (
                                                            <Badge bg="info" className="d-flex align-items-center justify-content-center" style={{ fontSize: '0.7rem' }}>
                                                                <FaCheckCircle className="me-1" size={10} />
                                                                Enabled
                                                            </Badge>
                                                        ) : (
                                                            <Badge bg="secondary" className="d-flex align-items-center justify-content-center" style={{ fontSize: '0.7rem' }}>
                                                                <FaTimesCircle className="me-1" size={10} />
                                                                Disabled
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    {/* <td className="text-center">
                                                        <div className="d-flex justify-content-center gap-1">
                                                            <OverlayTrigger
                                                                placement="top"
                                                                overlay={<Tooltip>View Details</Tooltip>}
                                                            >
                                                                <Button
                                                                    variant="outline-info"
                                                                    size="sm"
                                                                    className="d-flex align-items-center"
                                                                >
                                                                    <FaEye size={12} />
                                                                </Button>
                                                            </OverlayTrigger>
                                                            <OverlayTrigger
                                                                placement="top"
                                                                overlay={<Tooltip>Edit Company</Tooltip>}
                                                            >
                                                                <Button
                                                                    variant="outline-primary"
                                                                    size="sm"
                                                                    className="d-flex align-items-center"
                                                                >
                                                                    <FaEdit size={12} />
                                                                </Button>
                                                            </OverlayTrigger>
                                                            <OverlayTrigger
                                                                placement="top"
                                                                overlay={<Tooltip>Split Company</Tooltip>}
                                                            >
                                                                <Button
                                                                    variant="outline-success"
                                                                    size="sm"
                                                                    className="d-flex align-items-center"
                                                                    onClick={() => setShowSplitWizard(true)}
                                                                >
                                                                    <FaCodeBranch size={12} />
                                                                </Button>
                                                            </OverlayTrigger>
                                                        </div>
                                                    </td> */}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                        {filteredCompanies.length > 0 && (
                            <Card.Footer className="bg-light border-0 d-flex justify-content-between align-items-center">
                                <div className="text-muted small">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCompanies.length)} of {filteredCompanies.length} entries
                                </div>
                                <Pagination className="mb-0" size="sm">
                                    <Pagination.First 
                                        onClick={() => handlePageChange(1)} 
                                        disabled={currentPage === 1}
                                    />
                                    <Pagination.Prev 
                                        onClick={() => handlePageChange(currentPage - 1)} 
                                        disabled={currentPage === 1}
                                    />
                                    
                                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        
                                        return (
                                            <Pagination.Item
                                                key={pageNum}
                                                active={pageNum === currentPage}
                                                onClick={() => handlePageChange(pageNum)}
                                            >
                                                {pageNum}
                                            </Pagination.Item>
                                        );
                                    })}
                                    
                                    <Pagination.Next 
                                        onClick={() => handlePageChange(currentPage + 1)} 
                                        disabled={currentPage === totalPages}
                                    />
                                    <Pagination.Last 
                                        onClick={() => handlePageChange(totalPages)} 
                                        disabled={currentPage === totalPages}
                                    />
                                </Pagination>
                            </Card.Footer>
                        )}
                    </Card>
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