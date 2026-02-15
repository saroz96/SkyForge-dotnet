import React, { useState } from 'react';
import { Table, Button, Badge, Dropdown, Form } from 'react-bootstrap';
import { 
  ThreeDotsVertical,
  Eye,
  Pencil,
  Trash,
  Telephone,
  Envelope
} from 'react-bootstrap-icons';
import ClientCard from './ClientCard';

const ClientList = ({ filters }) => {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
  const [selectedClients, setSelectedClients] = useState([]);

  const clients = [
    {
      id: 1,
      name: 'John Smith',
      company: 'TechCorp Inc.',
      email: 'john@techcorp.com',
      phone: '+1 (555) 123-4567',
      status: 'active',
      joinDate: '2024-01-15',
      revenue: '$42,580',
      avatarColor: 'primary'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      company: 'Global Solutions',
      email: 'sarah@globalsolutions.com',
      phone: '+1 (555) 987-6543',
      status: 'active',
      joinDate: '2024-02-10',
      revenue: '$38,920',
      avatarColor: 'success'
    },
    {
      id: 3,
      name: 'Michael Chen',
      company: 'Innovate Labs',
      email: 'michael@innovatelabs.com',
      phone: '+1 (555) 456-7890',
      status: 'pending',
      joinDate: '2024-03-05',
      revenue: '$35,150',
      avatarColor: 'warning'
    },
    {
      id: 4,
      name: 'Emma Wilson',
      company: 'Digital Creations',
      email: 'emma@digitalcreations.com',
      phone: '+1 (555) 234-5678',
      status: 'inactive',
      joinDate: '2023-12-20',
      revenue: '$28,750',
      avatarColor: 'danger'
    },
    {
      id: 5,
      name: 'David Brown',
      company: 'Future Tech',
      email: 'david@futuretech.com',
      phone: '+1 (555) 345-6789',
      status: 'active',
      joinDate: '2024-01-30',
      revenue: '$31,420',
      avatarColor: 'info'
    }
  ];

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      pending: 'warning',
      inactive: 'secondary'
    };
    return <Badge bg={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedClients(clients.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (id) => {
    setSelectedClients(prev => 
      prev.includes(id) 
        ? prev.filter(clientId => clientId !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h5 className="card-title mb-0">All Clients ({clients.length})</h5>
          </div>
          <div className="d-flex gap-2">
            <div className="btn-group">
              <Button 
                variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table View
              </Button>
              <Button 
                variant={viewMode === 'card' ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={() => setViewMode('card')}
              >
                Card View
              </Button>
            </div>
            <Dropdown>
              <Dropdown.Toggle variant="light" size="sm">
                Actions
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item>Export Clients</Dropdown.Item>
                <Dropdown.Item>Send Email</Dropdown.Item>
                <Dropdown.Item>Bulk Update</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  <th>
                    <Form.Check
                      type="checkbox"
                      checked={selectedClients.length === clients.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Client</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Revenue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr key={client.id}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={selectedClients.includes(client.id)}
                        onChange={() => handleSelectClient(client.id)}
                      />
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className={`avatar avatar-sm bg-${client.avatarColor} text-white rounded-circle me-3`}>
                          {client.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <strong>{client.name}</strong>
                          <div className="text-muted small">Joined {client.joinDate}</div>
                        </div>
                      </div>
                    </td>
                    <td>{client.company}</td>
                    <td>
                      <div className="d-flex flex-column">
                        <small><Envelope size={12} className="me-1" /> {client.email}</small>
                        <small><Telephone size={12} className="me-1" /> {client.phone}</small>
                      </div>
                    </td>
                    <td>{getStatusBadge(client.status)}</td>
                    <td>
                      <strong>{client.revenue}</strong>
                      <div className="text-success small">+12.5%</div>
                    </td>
                    <td>
                      <Dropdown>
                        <Dropdown.Toggle variant="light" size="sm">
                          <ThreeDotsVertical />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item>
                            <Eye className="me-2" /> View Details
                          </Dropdown.Item>
                          <Dropdown.Item>
                            <Pencil className="me-2" /> Edit
                          </Dropdown.Item>
                          <Dropdown.Item className="text-danger">
                            <Trash className="me-2" /> Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <Row>
            {clients.map(client => (
              <Col md={6} lg={4} key={client.id} className="mb-3">
                <ClientCard client={client} />
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
};

export default ClientList;