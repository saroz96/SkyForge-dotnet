// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { Container, Card, Row, Col, ListGroup, Button, Alert } from 'react-bootstrap';
// import { FaArrowLeft } from 'react-icons/fa';
// import axios from 'axios';
// import api, { refreshToken } from '../../services/api';

// const AccountDetails = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [account, setAccount] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);

//     useEffect(() => {
//         const fetchAccountDetails = async () => {
//             try {
//                 const response = await api.get(`/api/retailer/companies/${id}`);
//                 if (!response.data.success) throw new Error(response.data.error || 'Failed to fetch account');
//                 const { data } = response.data;
//                 setAccount(data.account);
//             } catch (err) {
//                 setError(err.response?.data?.error || err.message || 'Failed to fetch account');
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchAccountDetails();
//     }, [id]);

//     if (loading) return <Container className="mt-4 text-center small">Loading account details...</Container>;
//     if (error) return <Container className="mt-4"><Alert variant="danger" className="small p-2">{error}</Alert><Button size="sm" variant="outline-primary" onClick={() => navigate(-1)}><FaArrowLeft className="me-1" /> Back</Button></Container>;
//     if (!account) return <Container className="mt-4"><Alert variant="warning" className="small p-2">Account not found</Alert><Button size="sm" variant="outline-primary" onClick={() => navigate(-1)}><FaArrowLeft className="me-1" /> Back</Button></Container>;

//     const getAccountGroupName = () => {
//         if (account.companyGroups?.length > 0) return account.companyGroups[0].name;
//         return account.accountGroup?.name || 'No Group';
//     };

//     const getOpeningBalance = () => {
//         if (account.openingBalance) return `${account.openingBalance.amount || 0} ${account.openingBalanceType || 'Dr'}`;
//         return '0 Dr';
//     };

//     const getClosingBalance = () => {
//         if (account.closingBalance) return `${account.closingBalance.amount || 0} ${account.closingBalanceType || 'Dr'}`;
//         return '0 Dr';
//     };

//     return (
//         <Container className="mt-3">
//             <Card className="shadow-sm p-3">
//                 <Card.Header className="text-center py-2">
//                     <h5 className="mb-0 fw-bold">Account Details</h5>
//                 </Card.Header>

//                 <Card.Body className="p-2">
//                     <Row>
//                         <Col md={6}>
//                             <h6 className="fw-bold mb-2">Account Information</h6>
//                             <ListGroup variant="flush" className="small">
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Name:</strong> <span className="ms-2">{account.name}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Group:</strong> <span className="ms-2">{getAccountGroupName()}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Open. Balance:</strong> <span className="ms-2">{getOpeningBalance()}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Clos. Balance:</strong> <span className="ms-2">{getClosingBalance()}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Credit Limit:</strong> <span className="ms-2">{account.creditLimit || 'N/A'}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>PAN:</strong> <span className="ms-2">{account.pan || 'N/A'}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2 d-flex align-items-center">
//                                     <strong>Status:</strong>
//                                     <span className={`badge ${account.isActive ? 'bg-success' : 'bg-danger'} ms-2 py-1`}>
//                                         {account.isActive ? 'Active' : 'Inactive'}
//                                     </span>
//                                 </ListGroup.Item>
//                                 {account.uniqueNumber && (
//                                     <ListGroup.Item className="py-1 px-2">
//                                         <strong>Unique No:</strong> <span className="ms-2">{account.uniqueNumber}</span>
//                                     </ListGroup.Item>
//                                 )}
//                             </ListGroup>
//                         </Col>

//                         <Col md={6}>
//                             <h6 className="fw-bold mb-2">Contact Information</h6>
//                             <ListGroup variant="flush" className="small">
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Address:</strong> <span className="ms-2">{account.address || 'N/A'}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Ward:</strong> <span className="ms-2">{account.ward || 'N/A'}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Contact Person:</strong> <span className="ms-2">{account.contactPerson || 'N/A'}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Phone:</strong> <span className="ms-2">{account.phone || 'N/A'}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Email:</strong> <span className="ms-2 text-break">{account.email || 'N/A'}</span>
//                                 </ListGroup.Item>
//                             </ListGroup>

//                             <h6 className="fw-bold mb-2 mt-3">Additional Info</h6>
//                             <ListGroup variant="flush" className="small">
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Created:</strong> <span className="ms-2">{new Date(account.createdAt).toLocaleDateString()}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     <strong>Updated:</strong> <span className="ms-2">{new Date(account.updatedAt).toLocaleDateString()}</span>
//                                 </ListGroup.Item>
//                                 <ListGroup.Item className="py-1 px-2">
//                                     {account.defaultCashAccount && <span className="badge bg-info me-1 py-1">Cash</span>}
//                                     {account.defaultVatAccount && <span className="badge bg-info me-1 py-1">VAT</span>}
//                                     {account.isDefaultAccount && <span className="badge bg-warning py-1">Default</span>}
//                                 </ListGroup.Item>
//                             </ListGroup>
//                         </Col>
//                     </Row>
//                 </Card.Body>

//                 <Card.Footer className="p-2">
//                     <Button
//                         size="sm"
//                         variant="outline-primary"
//                         onClick={() => navigate(-1)}
//                         className="d-flex align-items-center"
//                     >
//                         <FaArrowLeft className="me-1" /> Back
//                     </Button>
//                 </Card.Footer>
//             </Card>
//         </Container>
//     );
// };

// export default AccountDetails;

//-------------------------------------------------end1

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Card, Row, Col, ListGroup, Button, Alert,
    Modal, Form
} from 'react-bootstrap';
import { FaArrowLeft, FaEdit } from 'react-icons/fa';
import api from '../../services/api';

const AccountDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('opening'); // 'opening' | 'closing'
    const [formAmount, setFormAmount] = useState('');
    const [formType, setFormType] = useState('Dr');
    const [saving, setSaving] = useState(false);
    const [modalError, setModalError] = useState('');

    // ---------------- Fetch ----------------
    const fetchAccountDetails = async () => {
        try {
            setLoading(true);
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

    useEffect(() => {
        fetchAccountDetails();
    }, [id]);

    // ---------------- Modal open ----------------
    const openEditModal = (mode) => {
        setModalMode(mode);
        setModalError('');

        if (mode === 'opening') {
            setFormAmount(String(account?.openingBalance?.amount ?? 0));
            setFormType(account?.openingBalance?.type || account?.openingBalanceType || 'Dr');
        } else {
            setFormAmount(String(account?.closingBalance?.amount ?? 0));
            setFormType(account?.closingBalance?.type || account?.closingBalanceType || 'Dr');
        }
        setShowModal(true);
    };

    // ---------------- Save ----------------
    const handleSave = async () => {
        setModalError('');

        const amountNum = parseFloat(formAmount);
        if (isNaN(amountNum) || amountNum < 0) {
            setModalError('Amount must be a non-negative number.');
            return;
        }

        const endpoint = modalMode === 'opening'
            ? `/api/retailer/companies/${id}/opening-balance`
            : `/api/retailer/companies/${id}/closing-balance`;

        try {
            setSaving(true);
            const response = await api.put(endpoint, {
                amount: amountNum,
                type: formType
            });

            if (!response.data.success) {
                throw new Error(response.data.error || 'Update failed');
            }

            setShowModal(false);
            await fetchAccountDetails();
        } catch (err) {
            setModalError(err.response?.data?.error || err.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    // ---------------- Render guards ----------------
    if (loading) return <Container className="mt-4 text-center small">Loading account details...</Container>;

    if (error) return (
        <Container className="mt-4">
            <Alert variant="danger" className="small p-2">{error}</Alert>
            <Button size="sm" variant="outline-primary" onClick={() => navigate(-1)}>
                <FaArrowLeft className="me-1" /> Back
            </Button>
        </Container>
    );

    if (!account) return (
        <Container className="mt-4">
            <Alert variant="warning" className="small p-2">Account not found</Alert>
            <Button size="sm" variant="outline-primary" onClick={() => navigate(-1)}>
                <FaArrowLeft className="me-1" /> Back
            </Button>
        </Container>
    );

    const getAccountGroupName = () => {
        if (account.companyGroups?.length > 0) return account.companyGroups[0].name;
        return account.accountGroup?.name || 'No Group';
    };

    const getOpeningBalance = () => {
        if (account.openingBalance) {
            return `${account.openingBalance.amount || 0} ${account.openingBalance.type || account.openingBalanceType || 'Dr'}`;
        }
        return `0 ${account.openingBalanceType || 'Dr'}`;
    };

    const getClosingBalance = () => {
        if (account.closingBalance) {
            return `${account.closingBalance.amount || 0} ${account.closingBalance.type || account.closingBalanceType || 'Dr'}`;
        }
        return `0 ${account.closingBalanceType || 'Dr'}`;
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

                                {/* ✅ Opening Balance row with Edit */}
                                <ListGroup.Item className="py-1 px-2 d-flex justify-content-between align-items-center">
                                    <span>
                                        <strong>Open. Balance:</strong>
                                        <span className="ms-2">{getOpeningBalance()}</span>
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline-primary"
                                        className="py-0 px-2"
                                        title="Edit Opening Balance"
                                        onClick={() => openEditModal('opening')}
                                    >
                                        <FaEdit size={12} />
                                    </Button>
                                </ListGroup.Item>

                                {/* ✅ Closing Balance row with Edit */}
                                <ListGroup.Item className="py-1 px-2 d-flex justify-content-between align-items-center">
                                    <span>
                                        <strong>Clos. Balance:</strong>
                                        <span className="ms-2">{getClosingBalance()}</span>
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline-primary"
                                        className="py-0 px-2"
                                        title="Edit Closing Balance"
                                        onClick={() => openEditModal('closing')}
                                    >
                                        <FaEdit size={12} />
                                    </Button>
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

            {/* ---------------- Edit Modal ---------------- */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="sm">
                <Modal.Header closeButton>
                    <Modal.Title className="fs-6">
                        {modalMode === 'opening' ? 'Edit Opening Balance' : 'Edit Closing Balance'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {modalError && <Alert variant="danger" className="small p-2">{modalError}</Alert>}

                    <Form>
                        <Form.Group className="mb-2">
                            <Form.Label className="small mb-1">Amount</Form.Label>
                            <Form.Control
                                type="number"
                                min="0"
                                step="0.01"
                                size="sm"
                                value={formAmount}
                                onChange={(e) => setFormAmount(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group className="mb-2">
                            <Form.Label className="small mb-1">Type</Form.Label>
                            <Form.Select
                                size="sm"
                                value={formType}
                                onChange={(e) => setFormType(e.target.value)}
                            >
                                <option value="Dr">Dr (Debit)</option>
                                <option value="Cr">Cr (Credit)</option>
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="py-2">
                    <Button size="sm" variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AccountDetails;