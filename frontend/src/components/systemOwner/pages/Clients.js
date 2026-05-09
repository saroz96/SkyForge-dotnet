import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Col,
  OverlayTrigger,
  Tooltip,
  ProgressBar,
  Pagination,
  Toast,
  ToastContainer
} from 'react-bootstrap';
import { 
  People, 
  Plus, 
  Eye, 
  Pencil,
  ArrowRepeat,
  Trash, 
  Search, 
  Funnel,
  ChevronDown,
  Building,
  Envelope,
  Calendar,
  Phone,
  Download,
  ThreeDotsVertical,
  CheckCircle,
  ExclamationCircle,
  InfoCircle,
  Grid,
  List,
  SortUp,
  SortDown,
  ClockHistory,
  ShieldCheck,
  GraphUp,
  Printer,
  Share,
  List as ListIcon
} from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../layout/Sidebar';
import Header from '../layout/Header'; // Import the Header component
import '../../../stylesheet/systemOwner/pages/Clients.css';

const Clients = () => {
  const navigate = useNavigate();
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Clients state
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tradeTypeFilter, setTradeTypeFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [viewMode, setViewMode] = useState('table');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setSidebarVisible(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch clients from API
  useEffect(() => {
    fetchClients();
  }, []);

  // Auto-hide bulk actions when no clients selected
  useEffect(() => {
    setShowBulkActions(selectedClients.length > 0);
  }, [selectedClients]);

  // Apply filters when dependencies change
  useEffect(() => {
    let filtered = [...clients];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contactPerson?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm) ||
        client.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => getClientStatus(client) === statusFilter);
    }

    // Trade type filter
    if (tradeTypeFilter !== 'all') {
      filtered = filtered.filter(client => client.tradeType === tradeTypeFilter);
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(client => {
        if (!client.createdAt) return false;
        const createdDate = new Date(client.createdAt);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return createdDate >= startDate && createdDate <= endDate;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'name') {
        aValue = a.name;
        bValue = b.name;
      } else if (sortConfig.key === 'createdAt') {
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
      } else if (sortConfig.key === 'renewalDate') {
        aValue = a.renewalDate ? new Date(a.renewalDate) : new Date(0);
        bValue = b.renewalDate ? new Date(b.renewalDate) : new Date(0);
      } else if (sortConfig.key === 'status') {
        aValue = getClientStatus(a);
        bValue = getClientStatus(b);
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredClients(filtered);
    setCurrentPage(1);
  }, [clients, searchTerm, statusFilter, tradeTypeFilter, sortConfig, dateRange]);

  // Sidebar handlers
  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarVisible(!sidebarVisible);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleMenuClick = () => {
    if (isMobile) {
      setSidebarVisible(true);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please login again.');
        return;
      }

      const response = await axios.get('/api/client/clients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        setClients(response.data.data);
        setError('');
        showToast('Clients loaded successfully', 'success');
      } else {
        setError(response.data.message || 'Failed to fetch clients');
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(err.response?.data?.message || 'Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchClients();
    setIsRefreshing(false);
    showToast('Data refreshed successfully', 'success');
  };

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const getClientStatus = (client) => {
    if (!client.renewalDate) return 'demo';
    const renewalDate = new Date(client.renewalDate);
    const today = new Date();
    const daysUntilRenewal = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));
    
    if (renewalDate > today) {
      if (daysUntilRenewal <= 30) return 'expiring_soon';
      return 'active';
    } else {
      return 'inactive';
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'success', icon: <CheckCircle size={12} className="me-1" />, text: 'Active' },
      inactive: { bg: 'danger', icon: <ExclamationCircle size={12} className="me-1" />, text: 'Inactive' },
      demo: { bg: 'info', icon: <InfoCircle size={12} className="me-1" />, text: 'Demo' },
      expiring_soon: { bg: 'warning', icon: <ClockHistory size={12} className="me-1" />, text: 'Expiring Soon' }
    };
    
    const config = badges[status] || badges.active;
    return (
      <Badge 
        bg={config.bg} 
        className="px-2 py-1 rounded-pill d-inline-flex align-items-center"
        style={{ fontSize: '0.7rem', fontWeight: '500' }}
      >
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  const getRenewalProgress = (renewalDate) => {
    if (!renewalDate) return null;
    const today = new Date();
    const renewal = new Date(renewalDate);
    const totalDays = 365;
    const daysLeft = Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));
    const progress = ((totalDays - daysLeft) / totalDays) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const formatDate = (dateString, format = 'short') => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (format === 'short') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (format === 'relative') {
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return formatDate(dateString, 'short');
    }
    return date.toLocaleDateString();
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = () => {
    if (selectedClients.length === currentClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(currentClients.map(c => c.id));
    }
  };

  const handleSelectClient = (clientId) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleExport = (format = 'csv') => {
    const exportData = filteredClients.map(client => ({
      'Client ID': client.id,
      'Name': client.name,
      'Email': client.email,
      'Phone': client.phone,
      'Address': client.address,
      'City': client.city,
      'State': client.state,
      'Postal Code': client.postalCode,
      'Country': client.country,
      'Trade Type': client.tradeType,
      'Status': getClientStatus(client),
      'Renewal Date': client.renewalDate || 'N/A',
      'Created At': formatDate(client.createdAt, 'short'),
      'Last Updated': formatDate(client.updatedAt, 'short'),
      'Contact Person': client.contactPerson?.name || 'N/A',
      'Contact Email': client.contactPerson?.email || 'N/A',
      'Contact Phone': client.contactPerson?.phone || 'N/A'
    }));

    if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => 
            `"${(row[header] || '').toString().replace(/"/g, '""')}"`
          ).join(',')
        )
      ].join('\n');
      
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${exportData.length} clients to CSV`, 'success');
    } else if (format === 'json') {
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${exportData.length} clients to JSON`, 'success');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Clients Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { color: #333; }
            .header { margin-bottom: 20px; }
            .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Clients Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Total Clients: ${filteredClients.length}</p>
          </div>
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Renewal Date</th></tr>
            </thead>
            <tbody>
              ${filteredClients.map(client => `
                <tr>
                  <td>${client.name}</td>
                  <td>${client.email || 'N/A'}</td>
                  <td>${client.phone || 'N/A'}</td>
                  <td>${getClientStatus(client)}</td>
                  <td>${client.renewalDate ? formatDate(client.renewalDate) : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>This report was generated from the Client Management System</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getTradeTypes = useMemo(() => {
    const types = new Set(clients.map(c => c.tradeType).filter(Boolean));
    return ['all', ...Array.from(types)];
  }, [clients]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClients = filteredClients.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ChevronDown size={12} className="opacity-25" />;
    return sortConfig.direction === 'asc' ? <SortUp size={12} /> : <SortDown size={12} />;
  };

  if (loading && !isRefreshing) {
    return (
      <>
        <Header onMenuClick={handleMenuClick} />
        <div className="app-container">
          <Sidebar 
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            onClose={closeSidebar}
            show={sidebarVisible}
          />
          <div className={`main-content ${!sidebarCollapsed && !isMobile ? 'with-sidebar' : ''} ${isMobile ? 'mobile-view' : ''}`}>
            <Container fluid className="py-5">
              <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <div className="text-center">
                  <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
                  <h4 className="mt-3 text-primary">Loading Clients...</h4>
                  <p className="text-muted">Fetching your client data</p>
                </div>
              </div>
            </Container>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header onMenuClick={handleMenuClick} />
        <div className="app-container">
          <Sidebar 
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            onClose={closeSidebar}
            show={sidebarVisible}
          />
          <div className={`main-content ${!sidebarCollapsed && !isMobile ? 'with-sidebar' : ''} ${isMobile ? 'mobile-view' : ''}`}>
            <Container fluid className="py-5">
              <Alert variant="danger" className="shadow-lg">
                <Alert.Heading>Error Loading Clients</Alert.Heading>
                <p>{error}</p>
                <hr />
                <div className="d-flex justify-content-end gap-2">
                  <Button variant="outline-danger" onClick={() => navigate('/login')}>
                    Go to Login
                  </Button>
                  <Button variant="danger" onClick={fetchClients}>
                    Retry
                  </Button>
                </div>
              </Alert>
            </Container>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header onMenuClick={handleMenuClick} />
      <div className="app-container">
        <Sidebar 
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          onClose={closeSidebar}
          show={sidebarVisible}
        />
        
        <div className={`main-content ${!sidebarCollapsed && !isMobile ? 'with-sidebar' : ''} ${isMobile ? 'mobile-view' : ''}`}>
          <Container fluid className="clients-container p-4">
            <ToastContainer position="top-end" className="p-3">
              <Toast 
                show={showSuccessToast} 
                onClose={() => setShowSuccessToast(false)} 
                delay={3000} 
                autohide
                className="shadow-lg"
              >
                <Toast.Header closeButton={false}>
                  <strong className="me-auto">Success</strong>
                  <small>just now</small>
                </Toast.Header>
                <Toast.Body>{toastMessage}</Toast.Body>
              </Toast>
            </ToastContainer>

            {/* Page Title and Action Buttons */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="mb-1">Client Management</h2>
                <p className="text-muted mb-0">Manage and monitor all your client accounts</p>
              </div>
              <div className="d-flex gap-2">
                <OverlayTrigger placement="bottom" overlay={<Tooltip>Refresh Data</Tooltip>}>
                  <Button 
                    variant="outline-primary" 
                    onClick={refreshData}
                    disabled={isRefreshing}
                    className="action-btn"
                  >
                    <ArrowRepeat className={`me-1 ${isRefreshing ? 'spin' : ''}`} size={16} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </OverlayTrigger>
                
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" className="action-btn">
                    <Download size={16} className="me-1" />
                    Export
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleExport('csv')}>
                      <Download size={14} className="me-2" /> Export as CSV
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleExport('json')}>
                      <Download size={14} className="me-2" /> Export as JSON
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handlePrint}>
                      <Printer size={14} className="me-2" /> Print Report
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>

            {/* Filters and Actions Bar */}
            <Card className="shadow-sm mb-4 border-0">
              <Card.Body className="p-3">
                <Row className="g-3 align-items-center">
                  <Col lg={5}>
                    <InputGroup>
                      <InputGroup.Text className="bg-white border-end-0">
                        <Search size={18} />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Search clients by name, email, phone, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border-start-0"
                      />
                      {searchTerm && (
                        <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                          Clear
                        </Button>
                      )}
                    </InputGroup>
                  </Col>
                  
                  <Col lg={2}>
                    <Form.Select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="demo">Demo</option>
                      <option value="expiring_soon">Expiring Soon</option>
                    </Form.Select>
                  </Col>
                  
                  <Col lg={2}>
                    <Form.Select 
                      value={tradeTypeFilter} 
                      onChange={(e) => setTradeTypeFilter(e.target.value)}
                    >
                      {getTradeTypes.map(type => (
                        <option key={type} value={type}>
                          {type === 'all' ? 'All Trade Types' : type}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  
                  <Col lg={3} className="d-flex gap-2">
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      active={showAdvancedFilters}
                    >
                      <Funnel size={16} className="me-1" />
                      Advanced
                    </Button>
                    
                    <div className="btn-group">
                      <Button 
                        variant={viewMode === 'table' ? 'primary' : 'outline-secondary'}
                        onClick={() => setViewMode('table')}
                      >
                        <List size={16} />
                      </Button>
                      <Button 
                        variant={viewMode === 'grid' ? 'primary' : 'outline-secondary'}
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid size={16} />
                      </Button>
                    </div>
                  </Col>
                </Row>
                
                {showAdvancedFilters && (
                  <Row className="mt-3 pt-3 border-top">
                    <Col md={4}>
                      <Form.Label className="small text-muted">Date Range</Form.Label>
                      <div className="d-flex gap-2">
                        <Form.Control
                          type="date"
                          placeholder="Start Date"
                          value={dateRange.start}
                          onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                          size="sm"
                        />
                        <Form.Control
                          type="date"
                          placeholder="End Date"
                          value={dateRange.end}
                          onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                          size="sm"
                        />
                      </div>
                    </Col>
                    <Col md={8} className="d-flex align-items-end justify-content-end">
                      <Button 
                        variant="link" 
                        size="sm"
                        onClick={() => {
                          setDateRange({ start: '', end: '' });
                          setStatusFilter('all');
                          setTradeTypeFilter('all');
                        }}
                      >
                        Clear All Filters
                      </Button>
                    </Col>
                  </Row>
                )}
              </Card.Body>
            </Card>

            {/* Main Content - Table View */}
            {viewMode === 'table' && (
              <Card className="shadow-sm border-0">
                <Card.Body className="p-0">
                  {currentClients.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="empty-state">
                        <People size={64} className="text-muted opacity-25 mb-3" />
                        <h4 className="text-muted">No clients found</h4>
                        <p className="text-muted">Try adjusting your search or add a new client</p>
                        <Button 
                          variant="primary" 
                          onClick={() => navigate('/system-owner/clients/add')}
                        >
                          <Plus className="me-1" size={16} />
                          Add First Client
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table hover className="mb-0 clients-table">
                        <thead className="bg-light">
                          <tr>
                            <th style={{ width: '40px' }}>
                              <Form.Check
                                type="checkbox"
                                checked={selectedClients.length === currentClients.length && currentClients.length > 0}
                                onChange={handleSelectAll}
                              />
                            </th>
                            <th onClick={() => handleSort('name')} className="sortable-header">
                              <div className="d-flex align-items-center">
                                Client
                                <SortIcon column="name" />
                              </div>
                            </th>
                            <th onClick={() => handleSort('tradeType')} className="sortable-header">
                              <div className="d-flex align-items-center">
                                Trade Type
                                <SortIcon column="tradeType" />
                              </div>
                            </th>
                            <th onClick={() => handleSort('status')} className="sortable-header">
                              <div className="d-flex align-items-center">
                                Status
                                <SortIcon column="status" />
                              </div>
                            </th>
                            <th onClick={() => handleSort('renewalDate')} className="sortable-header">
                              <div className="d-flex align-items-center">
                                Renewal
                                <SortIcon column="renewalDate" />
                              </div>
                            </th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentClients.map(client => {
                            const status = getClientStatus(client);
                            const renewalProgress = getRenewalProgress(client.renewalDate);
                            
                            return (
                              <tr key={client.id} className="client-row">
                                <td>
                                  <Form.Check
                                    type="checkbox"
                                    checked={selectedClients.includes(client.id)}
                                    onChange={() => handleSelectClient(client.id)}
                                  />
                                </td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <div className="client-avatar me-3">
                                      <span className="avatar-initials">
                                        {client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="fw-bold client-name">
                                        <a 
                                          href={`/system-owner/clients/${client.id}`}
                                          className="text-decoration-none"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            navigate(`/system-owner/clients/${client.id}`);
                                          }}
                                        >
                                          {client.name}
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                               
                                <td>
                                  <Badge bg="secondary" className="px-2 py-1">
                                    {client.tradeType || 'Retailer'}
                                  </Badge>
                                </td>
                                <td>{getStatusBadge(status)}</td>
                                <td>
                                  {client.renewalDate && (
                                    <div>
                                      <div className="d-flex align-items-center mb-1">
                                        <Calendar size={12} className="me-1 text-muted" />
                                        <span className="small">{formatDate(client.renewalDate)}</span>
                                      </div>
                                      {renewalProgress && (
                                        <ProgressBar 
                                          now={renewalProgress} 
                                          variant={renewalProgress > 90 ? 'danger' : renewalProgress > 75 ? 'warning' : 'success'}
                                          style={{ height: '3px' }}
                                          className="mt-1"
                                        />
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="text-end">
                                  <div className="action-buttons">
                                    <OverlayTrigger placement="top" overlay={<Tooltip>View Details</Tooltip>}>
                                      <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => navigate(`/system-owner/clients/${client.id}`)}
                                        className="action-icon"
                                      >
                                        <Eye size={16} />
                                      </Button>
                                    </OverlayTrigger>
                                    <OverlayTrigger placement="top" overlay={<Tooltip>Edit Client</Tooltip>}>
                                      <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => navigate(`/system-owner/clients/${client.id}/edit`)}
                                        className="action-icon"
                                      >
                                        <Pencil size={16} />
                                      </Button>
                                    </OverlayTrigger>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
                
                {/* Pagination */}
                {filteredClients.length > itemsPerPage && (
                  <Card.Footer className="bg-white border-top">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                      <div className="text-muted small">
                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredClients.length)} of {filteredClients.length} clients
                      </div>
                      <Pagination size="sm" className="mb-0">
                        <Pagination.First 
                          onClick={() => setCurrentPage(1)} 
                          disabled={currentPage === 1}
                        />
                        <Pagination.Prev 
                          onClick={() => setCurrentPage(prev => prev - 1)} 
                          disabled={currentPage === 1}
                        />
                        
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => {
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
                              active={currentPage === pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Pagination.Item>
                          );
                        })}
                        
                        <Pagination.Next 
                          onClick={() => setCurrentPage(prev => prev + 1)} 
                          disabled={currentPage === totalPages}
                        />
                        <Pagination.Last 
                          onClick={() => setCurrentPage(totalPages)} 
                          disabled={currentPage === totalPages}
                        />
                      </Pagination>
                    </div>
                  </Card.Footer>
                )}
              </Card>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
              <Row className="g-4">
                {currentClients.map(client => {
                  const status = getClientStatus(client);
                  return (
                    <Col key={client.id} lg={4} md={6}>
                      <Card className="client-grid-card h-100 shadow-sm border-0">
                        <Card.Body className="p-4">
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div className="client-avatar-lg">
                              <span className="avatar-initials-lg">
                                {client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <Dropdown align="end">
                              <Dropdown.Toggle as={Button} variant="link" className="text-muted p-0">
                                <ThreeDotsVertical size={18} />
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item onClick={() => navigate(`/system-owner/clients/${client.id}`)}>
                                  <Eye size={14} className="me-2" /> View Details
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => navigate(`/system-owner/clients/${client.id}/edit`)}>
                                  <Pencil size={14} className="me-2" /> Edit Client
                                </Dropdown.Item>
                                <Dropdown.Divider />
                              </Dropdown.Menu>
                            </Dropdown>
                          </div>
                          
                          <h5 className="mb-1">{client.name}</h5>
                          <p className="text-muted small mb-3">{client.tradeType || 'Retailer'}</p>
                          
                          <div className="client-info mb-3">
                            {client.email && (
                              <div className="mb-2">
                                <Envelope size={14} className="me-2 text-muted" />
                                <small>{client.email}</small>
                              </div>
                            )}
                            {client.phone && (
                              <div className="mb-2">
                                <Phone size={14} className="me-2 text-muted" />
                                <small>{client.phone}</small>
                              </div>
                            )}
                            {client.renewalDate && (
                              <div>
                                <Calendar size={14} className="me-2 text-muted" />
                                <small>Renews: {formatDate(client.renewalDate)}</small>
                              </div>
                            )}
                          </div>
                          
                          <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                            {getStatusBadge(status)}
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => navigate(`/system-owner/clients/${client.id}`)}
                            >
                              View Profile
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Container>
        </div>
      </div>
    </>
  );
};

export default Clients;