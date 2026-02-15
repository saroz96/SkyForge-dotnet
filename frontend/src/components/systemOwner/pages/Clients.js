import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Card, 
  Table, 
  Button, 
  Badge, 
  Dropdown, 
  Form, 
  InputGroup,
  Spinner,
  Alert,
  Modal,
  Row,
  Col
} from 'react-bootstrap';
import { 
  People, 
  Plus, 
  Eye, 
  Edit, 
  Sync, 
  Trash, 
  Search, 
  Filter,
  ChevronDown,
  Building,
  Envelope,
  Calendar,
  Phone,
  Download,
  ThreeDotsVertical
} from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../../stylesheet/systemOwner/pages/Clients.css';

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Fetch clients from API
  useEffect(() => {
    fetchClients();
  }, []);

  // Apply filters when search or status changes
  useEffect(() => {
    let filtered = clients;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => getClientStatus(client) === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setFilteredClients(filtered);
  }, [clients, searchTerm, statusFilter, sortConfig]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/clients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        setClients(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch clients');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const getClientStatus = (client) => {
    if (!client.renewalDate) return 'demo';
    const renewalDate = new Date(client.renewalDate);
    const today = new Date();
    return renewalDate > today ? 'active' : 'inactive';
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active':
        return <Badge bg="success" className="px-3 py-2 rounded-pill">Active</Badge>;
      case 'inactive':
        return <Badge bg="warning" className="px-3 py-2 rounded-pill text-dark">Inactive</Badge>;
      case 'demo':
        return <Badge bg="info" className="px-3 py-2 rounded-pill">Demo</Badge>;
      default:
        return <Badge bg="secondary" className="px-3 py-2 rounded-pill">{status}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDeleteClick = (client) => {
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`/api/admin/clients/${selectedClient._id}`);
      setClients(clients.filter(c => c._id !== selectedClient._id));
      setShowDeleteModal(false);
      setSelectedClient(null);
    } catch (err) {
      console.error('Error deleting client:', err);
      alert('Failed to delete client');
    }
  };

  const handleExport = () => {
    // Export functionality
    const csvContent = filteredClients.map(client => 
      `${client.name},${client.email},${getClientStatus(client)},${formatDate(client.renewalDate)}`
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients.csv';
    a.click();
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClients = filteredClients.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  if (loading) {
    return (
      <Container fluid className="py-5">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
            <h4 className="mt-3 text-primary">Loading Clients...</h4>
            <p className="text-muted">Fetching your client data</p>
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="py-5">
        <Alert variant="danger" className="shadow">
          <Alert.Heading>Error Loading Clients</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={fetchClients}>
              Retry
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 text-primary mb-1">
            <People className="me-3" size={28} />
            Client Management
          </h1>
          <p className="text-muted">
            Manage all your clients in one place
            <span className="badge bg-primary ms-2">{filteredClients.length} Clients</span>
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={handleExport}>
            <Download className="me-2" />
            Export
          </Button>
          <Button variant="primary" onClick={() => navigate('/admin/clients/add')}>
            <Plus className="me-2" />
            Add New Client
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-sm mb-4 border-0">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text className="bg-white border-end-0">
                  <Search />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search clients by name, email, or contact person..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-start-0"
                />
                <Button variant="outline-secondary">
                  <Filter />
                </Button>
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="demo">Demo</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">
                  <ThreeDotsVertical className="me-2" />
                  More Actions
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item>Bulk Actions</Dropdown.Item>
                  <Dropdown.Item>Send Email</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item>View Analytics</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Clients Table */}
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {currentClients.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-4">
                <People size={64} className="text-muted opacity-25" />
              </div>
              <h4 className="text-muted mb-2">No clients found</h4>
              <p className="text-muted mb-4">Try adjusting your search or add a new client</p>
              <Button 
                variant="primary" 
                onClick={() => navigate('/admin/clients/add')}
                className="px-4"
              >
                <Plus className="me-2" />
                Add First Client
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th 
                      className="cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="d-flex align-items-center">
                        Client
                        <ChevronDown 
                          className={`ms-1 ${sortConfig.key === 'name' ? '' : 'opacity-25'}`}
                          style={{ 
                            transform: sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none' 
                          }}
                        />
                      </div>
                    </th>
                    <th>Contact Info</th>
                    <th>Date Format</th>
                    <th>Status</th>
                    <th>Renewal Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClients.map(client => (
                    <tr key={client._id} className="align-middle">
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                            <Building className="text-primary" />
                          </div>
                          <div>
                            <div className="fw-bold">
                              <a 
                                href={`/admin/clients/${client._id}`}
                                className="text-decoration-none text-dark"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/admin/clients/${client._id}`);
                                }}
                              >
                                {client.name}
                              </a>
                            </div>
                            <small className="text-muted">
                              ID: #{client._id}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <div className="d-flex align-items-center mb-1">
                            <Envelope size={14} className="me-2 text-muted" />
                            <a href={`mailto:${client.email}`} className="text-decoration-none">
                              {client.email}
                            </a>
                          </div>
                          {client.phone && (
                            <div className="d-flex align-items-center">
                              <Phone size={14} className="me-2 text-muted" />
                              <span className="text-muted">{client.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {client.dateFormat || 'Default'}
                        </span>
                      </td>
                      <td>{getStatusBadge(getClientStatus(client))}</td>
                      <td>
                        {client.renewalDate ? (
                          <div className="d-flex align-items-center">
                            <Calendar className="me-2 text-muted" size={14} />
                            {formatDate(client.renewalDate)}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="btn-group" role="group">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="rounded-start"
                            onClick={() => navigate(`/admin/clients/${client._id}`)}
                            title="View"
                          >
                            <Eye />
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => navigate(`/admin/clients/${client._id}/edit`)}
                            title="Edit"
                          >
                          </Button>
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => navigate(`/admin/clients/${client._id}/renew`)}
                            title="Renew"
                          >
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="rounded-end"
                            onClick={() => handleDeleteClick(client)}
                            title="Delete"
                          >
                            <Trash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
        
        {/* Pagination */}
        {filteredClients.length > itemsPerPage && (
          <Card.Footer className="bg-white border-top">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredClients.length)} of {filteredClients.length} clients
              </div>
              <div className="d-flex gap-1">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Previous
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i + 1}
                    variant={currentPage === i + 1 ? "primary" : "outline-secondary"}
                    size="sm"
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Stats Cards */}
      <Row className="mt-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-primary bg-opacity-10">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-25 rounded-circle p-3 me-3">
                  <Building className="text-primary" size={24} />
                </div>
                <div>
                  <h5 className="mb-0">{clients.filter(c => getClientStatus(c) === 'active').length}</h5>
                  <small className="text-muted">Active Clients</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div>
                  <h5 className="mb-0">{clients.filter(c => getClientStatus(c) === 'inactive').length}</h5>
                  <small className="text-muted">Inactive Clients</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-info bg-opacity-10">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-info bg-opacity-25 rounded-circle p-3 me-3">
                  <People className="text-info" size={24} />
                </div>
                <div>
                  <h5 className="mb-0">{clients.filter(c => getClientStatus(c) === 'demo').length}</h5>
                  <small className="text-muted">Demo Clients</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-success bg-opacity-10">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-25 rounded-circle p-3 me-3">
                  <Calendar className="text-success" size={24} />
                </div>
                <div>
                  <h5 className="mb-0">
                    {clients.filter(c => {
                      if (!c.renewalDate) return false;
                      const renewalDate = new Date(c.renewalDate);
                      const thirtyDaysFromNow = new Date();
                      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                      return renewalDate <= thirtyDaysFromNow && renewalDate > new Date();
                    }).length}
                  </h5>
                  <small className="text-muted">Renewing Soon</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="text-danger">
            <Trash className="me-2" />
            Delete Client
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-4">
            <div className="bg-danger bg-opacity-10 rounded-circle p-4 d-inline-block mb-3">
              <Trash size={32} className="text-danger" />
            </div>
            <h5>Are you sure you want to delete this client?</h5>
            <p className="text-muted">
              This will permanently delete <strong>{selectedClient?.name}</strong> and all associated data.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            Yes, Delete Client
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Clients;