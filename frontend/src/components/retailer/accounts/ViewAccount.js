
// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import {
//     Container,
//     Card,
//     Row,
//     Col,
//     ListGroup,
//     Button,
//     Alert
// } from 'react-bootstrap';
// import { FaArrowLeft } from 'react-icons/fa';
// import axios from 'axios';

// const AccountDetails = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [account, setAccount] = useState(null);
//     const [company, setCompany] = useState(null);
//     const [companyGroups, setCompanyGroups] = useState([]);
//     const [currentOpeningBalance, setCurrentOpeningBalance] = useState(null);
//     const [currentFiscalYear, setCurrentFiscalYear] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [currentCompanyName, setCurrentCompanyName] = useState('');

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: false, // Set to true if using cookies, false for JWT
//     });

//     // Add Authorization header with JWT token
//     api.interceptors.request.use(config => {
//         const token = localStorage.getItem('token');
//         if (token) {
//             config.headers.Authorization = `Bearer ${token}`;
//         }
//         return config;
//     });

//     useEffect(() => {
//         const fetchAccountDetails = async () => {
//             try {
//                 const response = await api.get(`/api/retailer/companies/${id}`);

//                 if (!response.data.success) {
//                     throw new Error(response.data.error || 'Failed to fetch account details');
//                 }

//                 const { data } = response.data;

//                 // Update state with ASP.NET response structure
//                 setAccount(data.account);
//                 setCompany(data.company);
//                 setCompanyGroups(data.companyGroups);
//                 setCurrentOpeningBalance(data.financialInfo.currentOpeningBalance);
//                 setCurrentFiscalYear(data.financialInfo.fiscalYear);
//                 setCurrentCompanyName(data.currentCompanyName || '');

//             } catch (err) {
//                 setError(err.response?.data?.error || err.message || 'Failed to fetch account details');
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchAccountDetails();
//     }, [id]);

//     if (loading) {
//         return (
//             <Container className="mt-4">
//                 <div className="text-center">Loading account details...</div>
//             </Container>
//         );
//     }

//     if (error) {
//         return (
//             <Container className="mt-4">
//                 <Alert variant="danger">{error}</Alert>
//                 <Button variant="primary" onClick={() => navigate(-1)}>
//                     <FaArrowLeft /> Back
//                 </Button>
//             </Container>
//         );
//     }

//     if (!account) {
//         return (
//             <Container className="mt-4">
//                 <Alert variant="warning">Account not found</Alert>
//                 <Button variant="primary" onClick={() => navigate(-1)}>
//                     <FaArrowLeft /> Back
//                 </Button>
//             </Container>
//         );
//     }

//     // Helper function to get account group name
//     const getAccountGroupName = () => {
//         if (account.companyGroups && Array.isArray(account.companyGroups) && account.companyGroups.length > 0) {
//             return account.companyGroups[0].name;
//         }
//         return account.accountGroup?.name || 'No Group';
//     };

//     // Helper function to get opening balance display
//     const getOpeningBalanceDisplay = () => {
//         if (currentOpeningBalance) {
//             return `${currentOpeningBalance.amount} ${currentOpeningBalance.type}`;
//         }
        
//         // Fallback to account opening balance if current fiscal year balance not found
//         if (account.openingBalance) {
//             return `${account.openingBalance.amount || 0} ${account.openingBalanceType || 'Dr'}`;
//         }
        
//         return '0 Dr';
//     };

//     return (
//         <Container className="mt-4">
//             <Card className="shadow-lg p-4">
//                 <Card.Header className="text-center">
//                     <h2 style={{ textDecoration: 'underline' }}>A/c Details</h2>
//                 </Card.Header>

//                 <Card.Body>
//                     <Row>
//                         <Col md={6}>
//                             <h5 className="card-title">Account Information:</h5>
//                             <ListGroup variant="flush">
//                                 <ListGroup.Item>
//                                     <strong>Account Name:</strong> {account.name}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Account Group:</strong> {getAccountGroupName()}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Opening Balance:</strong> {getOpeningBalanceDisplay()}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Credit Limit:</strong> {account.creditLimit || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>PAN No.:</strong> {account.pan || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Status:</strong>
//                                     <span className={`badge ${account.isActive ? 'bg-success' : 'bg-danger'} ms-2`}>
//                                         {account.isActive ? 'Active' : 'Inactive'}
//                                     </span>
//                                 </ListGroup.Item>
//                                 {account.uniqueNumber && (
//                                     <ListGroup.Item>
//                                         <strong>Unique Number:</strong> {account.uniqueNumber}
//                                     </ListGroup.Item>
//                                 )}
//                             </ListGroup>
//                         </Col>

//                         <Col md={6}>
//                             <h5 className="card-title">Contact Information:</h5>
//                             <ListGroup variant="flush">
//                                 <ListGroup.Item>
//                                     <strong>Address:</strong> {account.address || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Ward No.:</strong> {account.ward || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Contact Person:</strong> {account.contactPerson || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Phone:</strong> {account.phone || 'N/A'}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Email:</strong> {account.email || 'N/A'}
//                                 </ListGroup.Item>
//                             </ListGroup>

//                             <h5 className="card-title mt-4">Additional Information:</h5>
//                             <ListGroup variant="flush">
//                                 <ListGroup.Item>
//                                     <strong>Created At:</strong> {new Date(account.createdAt).toLocaleDateString()}
//                                 </ListGroup.Item>
//                                 <ListGroup.Item>
//                                     <strong>Last Updated:</strong> {new Date(account.updatedAt).toLocaleDateString()}
//                                 </ListGroup.Item>
//                                 {account.defaultCashAccount && (
//                                     <ListGroup.Item>
//                                         <span className="badge bg-info">Default Cash Account</span>
//                                     </ListGroup.Item>
//                                 )}
//                                 {account.defaultVatAccount && (
//                                     <ListGroup.Item>
//                                         <span className="badge bg-info">Default VAT Account</span>
//                                     </ListGroup.Item>
//                                 )}
//                                 {account.isDefaultAccount && (
//                                     <ListGroup.Item>
//                                         <span className="badge bg-warning">Default Account</span>
//                                     </ListGroup.Item>
//                                 )}
//                             </ListGroup>
//                         </Col>
//                     </Row>
//                 </Card.Body>

//                 <Card.Footer className="d-flex justify-content-between">
//                     <Button
//                         variant="primary"
//                         onClick={() => navigate(-1)}
//                         style={{
//                             backgroundColor: '#007bff',
//                             color: 'white',
//                             border: 'none',
//                             padding: '10px 20px',
//                             fontSize: '16px',
//                             borderRadius: '5px',
//                             display: 'flex',
//                             alignItems: 'center',
//                             gap: '8px'
//                         }}
//                     >
//                         <FaArrowLeft style={{ fontSize: '20px' }} /> Back
//                     </Button>
//                 </Card.Footer>
//             </Card>
//         </Container>
//     );
// };

// export default AccountDetails;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, ListGroup, Button, Alert } from 'react-bootstrap';
import { FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';

const AccountDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: false,
    });

    api.interceptors.request.use(config => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    useEffect(() => {
        const fetchAccountDetails = async () => {
            try {
                const response = await api.get(`/api/retailer/companies/${id}`);
                if (!response.data.success) throw new Error(response.data.error || 'Failed to fetch account');
                const { data } = response.data;
                setAccount(data.account);
            } catch (err) {
                setError(err.response?.data?.error || err.message || 'Failed to fetch account');
            } finally {
                setLoading(false);
            }
        };
        fetchAccountDetails();
    }, [id]);

    if (loading) return <Container className="mt-4 text-center small">Loading account details...</Container>;
    if (error) return <Container className="mt-4"><Alert variant="danger" className="small p-2">{error}</Alert><Button size="sm" variant="outline-primary" onClick={() => navigate(-1)}><FaArrowLeft className="me-1" /> Back</Button></Container>;
    if (!account) return <Container className="mt-4"><Alert variant="warning" className="small p-2">Account not found</Alert><Button size="sm" variant="outline-primary" onClick={() => navigate(-1)}><FaArrowLeft className="me-1" /> Back</Button></Container>;

    const getAccountGroupName = () => {
        if (account.companyGroups?.length > 0) return account.companyGroups[0].name;
        return account.accountGroup?.name || 'No Group';
    };

    const getOpeningBalance = () => {
        if (account.openingBalance) return `${account.openingBalance.amount || 0} ${account.openingBalanceType || 'Dr'}`;
        return '0 Dr';
    };

    return (
        <Container className="mt-3">
            <Card className="shadow-sm p-3">
                <Card.Header className="text-center py-2">
                    <h5 className="mb-0 fw-bold">Account Details</h5>
                </Card.Header>

                <Card.Body className="p-2">
                    <Row>
                        <Col md={6}>
                            <h6 className="fw-bold mb-2">Account Information</h6>
                            <ListGroup variant="flush" className="small">
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Name:</strong> <span className="ms-2">{account.name}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Group:</strong> <span className="ms-2">{getAccountGroupName()}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Op. Balance:</strong> <span className="ms-2">{getOpeningBalance()}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Credit Limit:</strong> <span className="ms-2">{account.creditLimit || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>PAN:</strong> <span className="ms-2">{account.pan || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2 d-flex align-items-center">
                                    <strong>Status:</strong>
                                    <span className={`badge ${account.isActive ? 'bg-success' : 'bg-danger'} ms-2 py-1`}>
                                        {account.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </ListGroup.Item>
                                {account.uniqueNumber && (
                                    <ListGroup.Item className="py-1 px-2">
                                        <strong>Unique No:</strong> <span className="ms-2">{account.uniqueNumber}</span>
                                    </ListGroup.Item>
                                )}
                            </ListGroup>
                        </Col>

                        <Col md={6}>
                            <h6 className="fw-bold mb-2">Contact Information</h6>
                            <ListGroup variant="flush" className="small">
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Address:</strong> <span className="ms-2">{account.address || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Ward:</strong> <span className="ms-2">{account.ward || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Contact Person:</strong> <span className="ms-2">{account.contactPerson || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Phone:</strong> <span className="ms-2">{account.phone || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Email:</strong> <span className="ms-2 text-break">{account.email || 'N/A'}</span>
                                </ListGroup.Item>
                            </ListGroup>

                            <h6 className="fw-bold mb-2 mt-3">Additional Info</h6>
                            <ListGroup variant="flush" className="small">
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Created:</strong> <span className="ms-2">{new Date(account.createdAt).toLocaleDateString()}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    <strong>Updated:</strong> <span className="ms-2">{new Date(account.updatedAt).toLocaleDateString()}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="py-1 px-2">
                                    {account.defaultCashAccount && <span className="badge bg-info me-1 py-1">Cash</span>}
                                    {account.defaultVatAccount && <span className="badge bg-info me-1 py-1">VAT</span>}
                                    {account.isDefaultAccount && <span className="badge bg-warning py-1">Default</span>}
                                </ListGroup.Item>
                            </ListGroup>
                        </Col>
                    </Row>
                </Card.Body>

                <Card.Footer className="p-2">
                    <Button 
                        size="sm" 
                        variant="outline-primary" 
                        onClick={() => navigate(-1)}
                        className="d-flex align-items-center"
                    >
                        <FaArrowLeft className="me-1" /> Back
                    </Button>
                </Card.Footer>
            </Card>
        </Container>
    );
};

export default AccountDetails;