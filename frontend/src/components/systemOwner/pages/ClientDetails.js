// import React, { useState, useEffect } from 'react';
// import {
//   Container,
//   Card,
//   Row,
//   Col,
//   Button,
//   Badge,
//   Spinner,
//   Alert,
//   Nav,
//   Tab,
//   Table,
//   ListGroup,
//   ProgressBar,
//   OverlayTrigger,
//   Tooltip,
//   Modal,
//   Form
// } from 'react-bootstrap';
// import {
//   ArrowLeft,
//   Building,
//   Envelope,
//   Phone,
//   Calendar,
//   GeoAlt,
//   People,
//   GraphUp,
//   Gear,
//   FileText,
//   ClockHistory,
//   CheckCircle,
//   ExclamationCircle,
//   InfoCircle,
//   Pencil,
//   Trash,
//   Printer,
//   Download,
//   Share,
//   Copy,
//   ArrowRepeat
// } from 'react-bootstrap-icons';
// import { useNavigate, useParams } from 'react-router-dom';
// import axios from 'axios';
// import { format } from 'date-fns';

// const ClientDetails = () => {
//   const navigate = useNavigate();
//   const { id } = useParams();
  
//   const [client, setClient] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [activeTab, setActiveTab] = useState('overview');
//   const [isExporting, setIsExporting] = useState(false);
  
//   // Renewal modal state
//   const [showRenewalModal, setShowRenewalModal] = useState(false);
//   const [renewalMonths, setRenewalMonths] = useState(12);
//   const [customRenewalDate, setCustomRenewalDate] = useState('');
//   const [isRenewing, setIsRenewing] = useState(false);
//   const [useCustomDate, setUseCustomDate] = useState(false);
//   const [showSuccessToast, setShowSuccessToast] = useState(false);
//   const [toastMessage, setToastMessage] = useState('');

//   useEffect(() => {
//     fetchClientDetails();
//   }, [id]);

//   const showToast = (message, type = 'success') => {
//     setToastMessage(message);
//     setShowSuccessToast(true);
//     setTimeout(() => setShowSuccessToast(false), 3000);
//   };

//   const fetchClientDetails = async () => {
//     try {
//       setLoading(true);
//       const token = localStorage.getItem('token');
      
//       if (!token) {
//         setError('Authentication token not found. Please login again.');
//         return;
//       }

//       const response = await axios.get(`/api/client/clients/${id}/details`, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Accept': 'application/json'
//         }
//       });

//       if (response.data.success) {
//         setClient(response.data.data);
//         setError('');
//       } else {
//         setError(response.data.message || 'Failed to fetch client details');
//       }
//     } catch (err) {
//       console.error('Error fetching client details:', err);
//       if (err.response?.status === 401) {
//         setError('Session expired. Please login again.');
//         setTimeout(() => navigate('/login'), 2000);
//       } else if (err.response?.status === 404) {
//         setError('Client not found');
//       } else {
//         setError(err.response?.data?.message || 'Network error. Please try again.');
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleRenew = async () => {
//     setIsRenewing(true);
//     try {
//       const token = localStorage.getItem('token');
      
//       const payload = {
//         monthsToAdd: renewalMonths
//       };
      
//       if (useCustomDate && customRenewalDate) {
//         payload.newRenewalDate = customRenewalDate;
//       }

//       const response = await axios.post(
//         `/api/client/clients/${id}/renew`,
//         payload,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       );

//       if (response.data.success) {
//         showToast(response.data.message, 'success');
//         setShowRenewalModal(false);
//         // Refresh client details
//         await fetchClientDetails();
//         // Reset form
//         setRenewalMonths(12);
//         setCustomRenewalDate('');
//         setUseCustomDate(false);
//       } else {
//         showToast(response.data.message || 'Failed to renew subscription', 'error');
//       }
//     } catch (err) {
//       console.error('Error renewing client:', err);
//       showToast(err.response?.data?.message || 'Network error. Please try again.', 'error');
//     } finally {
//       setIsRenewing(false);
//     }
//   };

//   const getStatusBadge = (status) => {
//     const badges = {
//       active: { bg: 'success', icon: <CheckCircle size={14} className="me-1" />, text: 'Active' },
//       inactive: { bg: 'danger', icon: <ExclamationCircle size={14} className="me-1" />, text: 'Inactive' },
//       demo: { bg: 'info', icon: <InfoCircle size={14} className="me-1" />, text: 'Demo' },
//       expiring_soon: { bg: 'warning', icon: <ClockHistory size={14} className="me-1" />, text: 'Expiring Soon' }
//     };
    
//     const config = badges[status] || badges.active;
//     return (
//       <Badge 
//         bg={config.bg} 
//         className="px-3 py-2 rounded-pill d-inline-flex align-items-center"
//         style={{ fontSize: '0.8rem', fontWeight: '500' }}
//       >
//         {config.icon}
//         {config.text}
//       </Badge>
//     );
//   };

//   const getRenewalProgress = (renewalDate) => {
//     if (!renewalDate) return null;
//     const today = new Date();
//     const renewal = new Date(renewalDate);
//     const totalDays = 365;
//     const daysLeft = Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));
//     const progress = ((totalDays - daysLeft) / totalDays) * 100;
//     return Math.min(Math.max(progress, 0), 100);
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return 'N/A';
//     try {
//       return format(new Date(dateString), 'MMM dd, yyyy');
//     } catch {
//       return dateString;
//     }
//   };

//   const handleExport = async () => {
//     setIsExporting(true);
//     try {
//       const exportData = {
//         client: {
//           name: client.name,
//           email: client.email,
//           phone: client.phone,
//           address: `${client.address}, ${client.city}, ${client.state}, ${client.country}`,
//           pan: client.pan,
//           tradeType: client.tradeType,
//           renewalDate: client.renewalDate,
//           status: client.status,
//           createdAt: client.createdAt
//         },
//         owner: client.owner,
//         stats: client.stats,
//         exportedAt: new Date().toISOString()
//       };

//       const jsonStr = JSON.stringify(exportData, null, 2);
//       const blob = new Blob([jsonStr], { type: 'application/json' });
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = `client_${client.name}_details_${new Date().toISOString().split('T')[0]}.json`;
//       a.click();
//       URL.revokeObjectURL(url);
//       showToast('Client details exported successfully', 'success');
//     } catch (err) {
//       console.error('Error exporting client details:', err);
//       showToast('Failed to export client details', 'error');
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   const handlePrint = () => {
//     const printWindow = window.open('', '_blank');
//     printWindow.document.write(`
//       <html>
//         <head>
//           <title>Client Details - ${client?.name}</title>
//           <style>
//             body { font-family: Arial, sans-serif; margin: 20px; }
//             .header { text-align: center; margin-bottom: 30px; }
//             .section { margin-bottom: 20px; }
//             .section-title { background-color: #f2f2f2; padding: 10px; margin-bottom: 15px; }
//             table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
//             th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
//             th { background-color: #f2f2f2; }
//             .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
//           </style>
//         </head>
//         <body>
//           <div class="header">
//             <h1>Client Details Report</h1>
//             <p>Generated on: ${new Date().toLocaleString()}</p>
//           </div>
          
//           <div class="section">
//             <h2 class="section-title">Basic Information</h2>
//             <table>
//               <tr><th>Client Name</th><td>${client.name}</td>
//               <tr><th>Email</th><td>${client.email || 'N/A'}</td>
//               <tr><th>Phone</th><td>${client.phone || 'N/A'}</td>
//               <tr><th>PAN</th><td>${client.pan || 'N/A'}</td>
//               <tr><th>Trade Type</th><td>${client.tradeType}</td>
//               <tr><th>Status</th><td>${client.status}</td>
//               <tr><th>Renewal Date</th><td>${client.renewalDate || 'N/A'}</td>
//             </table>
//           </div>
          
//           <div class="section">
//             <h2 class="section-title">Address Information</h2>
//             <p>${client.address}, ${client.city}, ${client.state}, ${client.country}</p>
//           </div>
          
//           ${client.owner ? `
//           <div class="section">
//             <h2 class="section-title">Owner Information</h2>
//             <table>
//               <tr><th>Name</th><td>${client.owner.name}</td>
//               <tr><th>Email</th><td>${client.owner.email || 'N/A'}</td>
//               <tr><th>Phone</th><td>${client.owner.phone || 'N/A'}</td>
//             </table>
//           </div>
//           ` : ''}
          
//           <div class="section">
//             <h2 class="section-title">Statistics</h2>
//             <table>
//               <tr><th>Total Users</th><td>${client.stats.totalUsers}</td>
//               <tr><th>Total Fiscal Years</th><td>${client.stats.totalFiscalYears}</td>
//               <tr><th>Total Account Groups</th><td>${client.stats.totalAccountGroups}</td>
//             </table>
//           </div>
          
//           <div class="footer">
//             <p>This report was generated from the Client Management System</p>
//           </div>
//         </body>
//       </html>
//     `);
//     printWindow.document.close();
//     printWindow.print();
//     showToast('Print job sent', 'success');
//   };

//   const copyToClipboard = (text, field) => {
//     navigator.clipboard.writeText(text);
//     showToast(`${field} copied to clipboard`, 'success');
//   };

//   if (loading) {
//     return (
//       <Container fluid className="py-5">
//         <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
//           <div className="text-center">
//             <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
//             <h4 className="mt-3 text-primary">Loading Client Details...</h4>
//             <p className="text-muted">Fetching client information</p>
//           </div>
//         </div>
//       </Container>
//     );
//   }

//   if (error) {
//     return (
//       <Container fluid className="py-5">
//         <Alert variant="danger" className="shadow-lg">
//           <Alert.Heading>Error Loading Client Details</Alert.Heading>
//           <p>{error}</p>
//           <hr />
//           <div className="d-flex justify-content-end gap-2">
//             <Button variant="outline-secondary" onClick={() => navigate('/system-owner/clients')}>
//               Back to Clients
//             </Button>
//             <Button variant="danger" onClick={fetchClientDetails}>
//               Retry
//             </Button>
//           </div>
//         </Alert>
//       </Container>
//     );
//   }

//   if (!client) {
//     return (
//       <Container fluid className="py-5">
//         <Alert variant="warning" className="shadow-lg">
//           <Alert.Heading>Client Not Found</Alert.Heading>
//           <p>The client you're looking for doesn't exist or has been removed.</p>
//           <hr />
//           <Button variant="primary" onClick={() => navigate('/system-owner/clients')}>
//             Back to Clients
//           </Button>
//         </Alert>
//       </Container>
//     );
//   }

//   const renewalProgress = getRenewalProgress(client.renewalDate);

//   return (
//     <Container fluid className="client-details-container py-4">
//       {/* Success Toast */}
//       {showSuccessToast && (
//         <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1050 }}>
//           <Alert variant="success" onClose={() => setShowSuccessToast(false)} dismissible>
//             {toastMessage}
//           </Alert>
//         </div>
//       )}

//       {/* Header Section */}
//       <div className="d-flex justify-content-between align-items-start mb-4">
//         <div className="d-flex align-items-center gap-3">
//           <Button
//             variant="outline-secondary"
//             onClick={() => navigate('/system-owner/clients')}
//             className="d-flex align-items-center gap-2"
//           >
//             <ArrowLeft size={18} />
//             Back
//           </Button>
          
//           <div>
//             <h1 className="mb-1 display-6">{client.name}</h1>
//             <div className="d-flex align-items-center gap-3">
//               {getStatusBadge(client.status)}
//               <span className="text-muted">
//                 <Building size={14} className="me-1" />
//                 {client.tradeType}
//               </span>
//               <span className="text-muted">
//                 <ClockHistory size={14} className="me-1" />
//                 Joined {formatDate(client.createdAt)}
//               </span>
//             </div>
//           </div>
//         </div>
        
//         <div className="d-flex gap-2">
//           <OverlayTrigger placement="top" overlay={<Tooltip>Renew Subscription</Tooltip>}>
//             <Button
//               variant="success"
//               onClick={() => setShowRenewalModal(true)}
//             >
//               <ArrowRepeat size={16} className="me-1" />
//               Renew
//             </Button>
//           </OverlayTrigger>
          
//           <OverlayTrigger placement="top" overlay={<Tooltip>Edit Client</Tooltip>}>
//             <Button
//               variant="outline-primary"
//               onClick={() => navigate(`/system-owner/clients/${client.id}/edit`)}
//             >
//               <Pencil size={16} className="me-1" />
//               Edit
//             </Button>
//           </OverlayTrigger>
          
//           <OverlayTrigger placement="top" overlay={<Tooltip>Export Details</Tooltip>}>
//             <Button
//               variant="outline-secondary"
//               onClick={handleExport}
//               disabled={isExporting}
//             >
//               <Download size={16} className="me-1" />
//               {isExporting ? 'Exporting...' : 'Export'}
//             </Button>
//           </OverlayTrigger>
          
//           <OverlayTrigger placement="top" overlay={<Tooltip>Print Report</Tooltip>}>
//             <Button variant="outline-secondary" onClick={handlePrint}>
//               <Printer size={16} />
//             </Button>
//           </OverlayTrigger>
//         </div>
//       </div>

//       {/* Renewal Progress Bar */}
//       {client.renewalDate && renewalProgress !== null && (
//         <Card className="mb-4 border-0 shadow-sm">
//           <Card.Body>
//             <div className="d-flex justify-content-between align-items-center mb-2">
//               <div className="d-flex align-items-center gap-2">
//                 <Calendar size={18} className="text-primary" />
//                 <strong>Renewal Progress</strong>
//               </div>
//               <span className="text-muted">
//                 Renewal Date: {client.renewalDate}
//               </span>
//             </div>
//             <ProgressBar
//               now={renewalProgress}
//               variant={renewalProgress > 90 ? 'danger' : renewalProgress > 75 ? 'warning' : 'success'}
//               className="renewal-progress-bar"
//               style={{ height: '8px', borderRadius: '4px' }}
//             />
//             <div className="d-flex justify-content-between mt-2">
//               <small className="text-muted">Started</small>
//               <small className="text-muted">
//                 {Math.round(100 - renewalProgress)}% remaining
//               </small>
//               <small className="text-muted">Renewal</small>
//             </div>
//           </Card.Body>
//         </Card>
//       )}

//       {/* Statistics Cards */}
//       <Row className="g-4 mb-4">
//         <Col md={3}>
//           <Card className="border-0 shadow-sm h-100">
//             <Card.Body>
//               <div className="d-flex justify-content-between align-items-center">
//                 <div>
//                   <h6 className="text-muted mb-1">Total Users</h6>
//                   <h2 className="mb-0">{client.stats?.totalUsers || 0}</h2>
//                 </div>
//                 <div className="stats-icon bg-primary bg-opacity-10 p-3 rounded-circle">
//                   <People size={24} className="text-primary" />
//                 </div>
//               </div>
//             </Card.Body>
//           </Card>
//         </Col>
//         <Col md={3}>
//           <Card className="border-0 shadow-sm h-100">
//             <Card.Body>
//               <div className="d-flex justify-content-between align-items-center">
//                 <div>
//                   <h6 className="text-muted mb-1">Fiscal Years</h6>
//                   <h2 className="mb-0">{client.stats?.totalFiscalYears || 0}</h2>
//                 </div>
//                 <div className="stats-icon bg-success bg-opacity-10 p-3 rounded-circle">
//                   <Calendar size={24} className="text-success" />
//                 </div>
//               </div>
//             </Card.Body>
//           </Card>
//         </Col>
//         <Col md={3}>
//           <Card className="border-0 shadow-sm h-100">
//             <Card.Body>
//               <div className="d-flex justify-content-between align-items-center">
//                 <div>
//                   <h6 className="text-muted mb-1">Account Groups</h6>
//                   <h2 className="mb-0">{client.stats?.totalAccountGroups || 0}</h2>
//                 </div>
//                 <div className="stats-icon bg-info bg-opacity-10 p-3 rounded-circle">
//                   <GraphUp size={24} className="text-info" />
//                 </div>
//               </div>
//             </Card.Body>
//           </Card>
//         </Col>
//         <Col md={3}>
//           <Card className="border-0 shadow-sm h-100">
//             <Card.Body>
//               <div className="d-flex justify-content-between align-items-center">
//                 <div>
//                   <h6 className="text-muted mb-1">Settings</h6>
//                   <h2 className="mb-0">{client.stats?.totalSettings || 0}</h2>
//                 </div>
//                 <div className="stats-icon bg-warning bg-opacity-10 p-3 rounded-circle">
//                   <Gear size={24} className="text-warning" />
//                 </div>
//               </div>
//             </Card.Body>
//           </Card>
//         </Col>
//       </Row>

//       {/* Main Content Tabs */}
//       <Card className="border-0 shadow-sm">
//         <Card.Header className="bg-white border-0 p-0">
//           <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="px-3 pt-2">
//             <Nav.Item>
//               <Nav.Link eventKey="overview" className="d-flex align-items-center gap-2">
//                 <Building size={16} />
//                 Overview
//               </Nav.Link>
//             </Nav.Item>
//             <Nav.Item>
//               <Nav.Link eventKey="owner" className="d-flex align-items-center gap-2">
//                 <People size={16} />
//                 Owner Info
//               </Nav.Link>
//             </Nav.Item>
//             <Nav.Item>
//               <Nav.Link eventKey="fiscal-years" className="d-flex align-items-center gap-2">
//                 <Calendar size={16} />
//                 Fiscal Years
//               </Nav.Link>
//             </Nav.Item>
//             <Nav.Item>
//               <Nav.Link eventKey="attendance" className="d-flex align-items-center gap-2">
//                 <ClockHistory size={16} />
//                 Attendance Settings
//               </Nav.Link>
//             </Nav.Item>
//             <Nav.Item>
//               <Nav.Link eventKey="users" className="d-flex align-items-center gap-2">
//                 <People size={16} />
//                 Users
//               </Nav.Link>
//             </Nav.Item>
//             <Nav.Item>
//               <Nav.Link eventKey="settings" className="d-flex align-items-center gap-2">
//                 <Gear size={16} />
//                 Settings
//               </Nav.Link>
//             </Nav.Item>
//           </Nav>
//         </Card.Header>
        
//         <Card.Body className="p-4">
//           <Tab.Content>
//             {/* Overview Tab - Same as before */}
//             <Tab.Pane eventKey="overview" active={activeTab === 'overview'}>
//               <Row>
//                 <Col md={6}>
//                   <h5 className="mb-3">Basic Information</h5>
//                   <ListGroup variant="flush" className="border rounded">
//                     <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                       <span className="text-muted">Company Name</span>
//                       <strong>{client.name}</strong>
//                     </ListGroup.Item>
//                     <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                       <span className="text-muted">Email Address</span>
//                       <div>
//                         <a href={`mailto:${client.email}`} className="text-decoration-none me-2">
//                           {client.email || 'N/A'}
//                         </a>
//                         {client.email && (
//                           <OverlayTrigger placement="top" overlay={<Tooltip>Copy Email</Tooltip>}>
//                             <Button
//                               variant="link"
//                               size="sm"
//                               className="p-0"
//                               onClick={() => copyToClipboard(client.email, 'Email')}
//                             >
//                               <Copy size={14} />
//                             </Button>
//                           </OverlayTrigger>
//                         )}
//                       </div>
//                     </ListGroup.Item>
//                     <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                       <span className="text-muted">Phone Number</span>
//                       <div>
//                         <a href={`tel:${client.phone}`} className="text-decoration-none me-2">
//                           {client.phone || 'N/A'}
//                         </a>
//                         {client.phone && (
//                           <OverlayTrigger placement="top" overlay={<Tooltip>Copy Phone</Tooltip>}>
//                             <Button
//                               variant="link"
//                               size="sm"
//                               className="p-0"
//                               onClick={() => copyToClipboard(client.phone, 'Phone')}
//                             >
//                               <Copy size={14} />
//                             </Button>
//                           </OverlayTrigger>
//                         )}
//                       </div>
//                     </ListGroup.Item>
//                     <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                       <span className="text-muted">PAN Number</span>
//                       <div>
//                         <span className="me-2">{client.pan || 'N/A'}</span>
//                         {client.pan && (
//                           <OverlayTrigger placement="top" overlay={<Tooltip>Copy PAN</Tooltip>}>
//                             <Button
//                               variant="link"
//                               size="sm"
//                               className="p-0"
//                               onClick={() => copyToClipboard(client.pan, 'PAN')}
//                             >
//                               <Copy size={14} />
//                             </Button>
//                           </OverlayTrigger>
//                         )}
//                       </div>
//                     </ListGroup.Item>
//                     <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                       <span className="text-muted">Ward Number</span>
//                       <strong>{client.ward || 'N/A'}</strong>
//                     </ListGroup.Item>
//                   </ListGroup>
//                 </Col>
                
//                 <Col md={6}>
//                   <h5 className="mb-3">Address Information</h5>
//                   <ListGroup variant="flush" className="border rounded">
//                     <ListGroup.Item>
//                       <GeoAlt size={16} className="text-muted me-2" />
//                       {client.address && (
//                         <div>{client.address}</div>
//                       )}
//                       <div className="mt-1">
//                         {client.city && <span>{client.city}, </span>}
//                         {client.state && <span>{client.state}, </span>}
//                         {client.country && <span>{client.country}</span>}
//                       </div>
//                     </ListGroup.Item>
//                   </ListGroup>
                  
//                   <h5 className="mb-3 mt-4">Business Features</h5>
//                   <ListGroup variant="flush" className="border rounded">
//                     <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                       <span>VAT Enabled</span>
//                       <Badge bg={client.vatEnabled ? 'success' : 'secondary'}>
//                         {client.vatEnabled ? 'Yes' : 'No'}
//                       </Badge>
//                     </ListGroup.Item>
//                     <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                       <span>Store Management</span>
//                       <Badge bg={client.storeManagement ? 'success' : 'secondary'}>
//                         {client.storeManagement ? 'Enabled' : 'Disabled'}
//                       </Badge>
//                     </ListGroup.Item>
//                     <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                       <span>Date Format</span>
//                       <strong>{client.dateFormat}</strong>
//                     </ListGroup.Item>
//                     <ListGroup.Item>
//                       <span>Notification Emails</span>
//                       <div className="mt-2">
//                         {client.notificationEmails?.length > 0 ? (
//                           client.notificationEmails.map((email, idx) => (
//                             <div key={idx} className="small mb-1">
//                               <Envelope size={12} className="me-1" />
//                               {email}
//                             </div>
//                           ))
//                         ) : (
//                           <span className="text-muted">No notification emails configured</span>
//                         )}
//                       </div>
//                     </ListGroup.Item>
//                   </ListGroup>
//                 </Col>
//               </Row>
//             </Tab.Pane>
            
//             {/* Owner Info Tab */}
//             <Tab.Pane eventKey="owner" active={activeTab === 'owner'}>
//               {client.owner ? (
//                 <Row>
//                   <Col md={6}>
//                     <ListGroup variant="flush" className="border rounded">
//                       <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                         <span className="text-muted">Owner Name</span>
//                         <strong>{client.owner.name}</strong>
//                       </ListGroup.Item>
//                       <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                         <span className="text-muted">Email</span>
//                         <a href={`mailto:${client.owner.email}`} className="text-decoration-none">
//                           {client.owner.email || 'N/A'}
//                         </a>
//                       </ListGroup.Item>
//                       <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                         <span className="text-muted">Phone</span>
//                         <a href={`tel:${client.owner.phone}`} className="text-decoration-none">
//                           {client.owner.phone || 'N/A'}
//                         </a>
//                       </ListGroup.Item>
//                     </ListGroup>
//                   </Col>
//                 </Row>
//               ) : (
//                 <Alert variant="info">No owner information available</Alert>
//               )}
//             </Tab.Pane>
            
//             {/* Rest of the tabs remain the same */}
//             <Tab.Pane eventKey="fiscal-years" active={activeTab === 'fiscal-years'}>
//               {client.fiscalYears?.length > 0 ? (
//                 <Table responsive striped hover>
//                   <thead>
//                     <tr>
//                       <th>Name</th>
//                       <th>Start Date</th>
//                       <th>End Date</th>
//                       <th>Status</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {client.fiscalYears.map((fy) => (
//                       <tr key={fy.id}>
//                         <td><strong>{fy.name}</strong></td>
//                         <td>{fy.startDate ? formatDate(fy.startDate) : 'N/A'}</td>
//                         <td>{fy.endDate ? formatDate(fy.endDate) : 'N/A'}</td>
//                         <td>
//                           {fy.isActive ? (
//                             <Badge bg="success">Active</Badge>
//                           ) : (
//                             <Badge bg="secondary">Inactive</Badge>
//                           )}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </Table>
//               ) : (
//                 <Alert variant="info">No fiscal years configured</Alert>
//               )}
//             </Tab.Pane>
            
//             {/* Attendance Settings Tab */}
//             <Tab.Pane eventKey="attendance" active={activeTab === 'attendance'}>
//               <Row>
//                 <Col md={6}>
//                   <h5 className="mb-3">General Settings</h5>
//                   <ListGroup variant="flush" className="border rounded mb-4">
//                     <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                       <span>Geo-fencing Enabled</span>
//                       <Badge bg={client.attendanceSettings?.geoFencingEnabled ? 'success' : 'secondary'}>
//                         {client.attendanceSettings?.geoFencingEnabled ? 'Yes' : 'No'}
//                       </Badge>
//                     </ListGroup.Item>
//                   </ListGroup>
                  
//                   <h5 className="mb-3">Working Hours</h5>
//                   <ListGroup variant="flush" className="border rounded mb-4">
//                     <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                       <span>Start Time</span>
//                       <strong>{client.attendanceSettings?.workingHours?.startTime || '09:00'}</strong>
//                     </ListGroup.Item>
//                     <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                       <span>End Time</span>
//                       <strong>{client.attendanceSettings?.workingHours?.endTime || '17:00'}</strong>
//                     </ListGroup.Item>
//                     <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                       <span>Grace Period</span>
//                       <strong>{client.attendanceSettings?.workingHours?.gracePeriod || 15} minutes</strong>
//                     </ListGroup.Item>
//                   </ListGroup>
                  
//                   <h5 className="mb-3">Auto Clock-out</h5>
//                   <ListGroup variant="flush" className="border rounded">
//                     <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                       <span>Enabled</span>
//                       <Badge bg={client.attendanceSettings?.autoClockOut?.enabled ? 'success' : 'secondary'}>
//                         {client.attendanceSettings?.autoClockOut?.enabled ? 'Yes' : 'No'}
//                       </Badge>
//                     </ListGroup.Item>
//                     {client.attendanceSettings?.autoClockOut?.enabled && (
//                       <ListGroup.Item className="d-flex justify-content-between align-items-center">
//                         <span>Auto Clock-out Time</span>
//                         <strong>{client.attendanceSettings.autoClockOut.time}</strong>
//                       </ListGroup.Item>
//                     )}
//                   </ListGroup>
//                 </Col>
                
//                 <Col md={6}>
//                   <h5 className="mb-3">Office Locations</h5>
//                   {client.attendanceSettings?.officeLocations?.length > 0 ? (
//                     client.attendanceSettings.officeLocations.map((location, idx) => (
//                       <Card key={idx} className="mb-3 border">
//                         <Card.Body>
//                           <div className="d-flex justify-content-between align-items-start mb-2">
//                             <h6 className="mb-0">{location.name}</h6>
//                             <Badge bg={location.isActive ? 'success' : 'secondary'}>
//                               {location.isActive ? 'Active' : 'Inactive'}
//                             </Badge>
//                           </div>
//                           <div className="small text-muted">
//                             <p className="mb-1">Address: {location.address}</p>
//                             <p className="mb-1">Radius: {location.radius} meters</p>
//                             <p className="mb-0">
//                               Coordinates: {location.coordinates?.lat}, {location.coordinates?.lng}
//                             </p>
//                           </div>
//                         </Card.Body>
//                       </Card>
//                     ))
//                   ) : (
//                     <Alert variant="info">No office locations configured</Alert>
//                   )}
//                 </Col>
//               </Row>
//             </Tab.Pane>
            
//             {/* Users Tab */}
//             <Tab.Pane eventKey="users" active={activeTab === 'users'}>
//               {client.users?.length > 0 ? (
//                 <Table responsive striped hover>
//                   <thead>
//                     <tr>
//                       <th>Name</th>
//                       <th>Email</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {client.users.map((user) => (
//                       <tr key={user.id}>
//                         <td><strong>{user.name}</strong></td>
//                         <td><a href={`mailto:${user.email}`}>{user.email}</a></td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </Table>
//               ) : (
//                 <Alert variant="info">No additional users have access to this client</Alert>
//               )}
//             </Tab.Pane>
            
//             {/* Settings Tab */}
//             <Tab.Pane eventKey="settings" active={activeTab === 'settings'}>
//               {client.settings?.length > 0 ? (
//                 <Table responsive striped hover>
//                   <thead>
//                     <tr>
//                       <th>Key</th>
//                       <th>Value</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {client.settings.map((setting, idx) => (
//                       <tr key={idx}>
//                         <td><code>{setting.key}</code></td>
//                         <td>{setting.value}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </Table>
//               ) : (
//                 <Alert variant="info">No custom settings configured</Alert>
//               )}
//             </Tab.Pane>
//           </Tab.Content>
//         </Card.Body>
//       </Card>

//       {/* Renewal Modal */}
//       <Modal show={showRenewalModal} onHide={() => setShowRenewalModal(false)} centered size="lg">
//         <Modal.Header closeButton>
//           <Modal.Title>
//             <ArrowRepeat className="me-2" size={20} />
//             Renew Subscription - {client.name}
//           </Modal.Title>
//         </Modal.Header>
//         <Modal.Body>
//           <Alert variant="info">
//             <InfoCircle className="me-2" size={16} />
//             Current renewal date: <strong>{client.renewalDate || 'Not set'}</strong>
//           </Alert>
          
//           <Form>
//             <Form.Group className="mb-4">
//               <Form.Label className="fw-bold">Renewal Type</Form.Label>
//               <div className="d-flex gap-3">
//                 <Form.Check
//                   type="radio"
//                   label="Add months to current date"
//                   name="renewalType"
//                   id="addMonths"
//                   checked={!useCustomDate}
//                   onChange={() => setUseCustomDate(false)}
//                 />
//                 <Form.Check
//                   type="radio"
//                   label="Set custom renewal date"
//                   name="renewalType"
//                   id="customDate"
//                   checked={useCustomDate}
//                   onChange={() => setUseCustomDate(true)}
//                 />
//               </div>
//             </Form.Group>

//             {!useCustomDate ? (
//               <Form.Group className="mb-3">
//                 <Form.Label className="fw-bold">Add Months</Form.Label>
//                 <Form.Select 
//                   value={renewalMonths} 
//                   onChange={(e) => setRenewalMonths(parseInt(e.target.value))}
//                 >
//                   <option value={3}>3 months</option>
//                   <option value={6}>6 months</option>
//                   <option value={12}>12 months (1 year)</option>
//                   <option value={18}>18 months</option>
//                   <option value={24}>24 months (2 years)</option>
//                   <option value={36}>36 months (3 years)</option>
//                 </Form.Select>
//                 <Form.Text className="text-muted">
//                   Subscription will be extended by {renewalMonths} months from current date
//                 </Form.Text>
//               </Form.Group>
//             ) : (
//               <Form.Group className="mb-3">
//                 <Form.Label className="fw-bold">Custom Renewal Date</Form.Label>
//                 <Form.Control
//                   type="date"
//                   value={customRenewalDate}
//                   onChange={(e) => setCustomRenewalDate(e.target.value)}
//                   placeholder="YYYY-MM-DD"
//                 />
//                 <Form.Text className="text-muted">
//                   Enter the new renewal date (format: YYYY-MM-DD)
//                 </Form.Text>
//               </Form.Group>
//             )}

//             <Alert variant="warning" className="mt-3">
//               <ExclamationCircle className="me-2" size={16} />
//               <strong>Note:</strong> Renewing the subscription will update the renewal date and affect the client's status calculation.
//             </Alert>
//           </Form>
//         </Modal.Body>
//         <Modal.Footer>
//           <Button variant="secondary" onClick={() => setShowRenewalModal(false)}>
//             Cancel
//           </Button>
//           <Button 
//             variant="success" 
//             onClick={handleRenew}
//             disabled={isRenewing || (useCustomDate && !customRenewalDate)}
//           >
//             {isRenewing ? (
//               <>
//                 <Spinner as="span" animation="border" size="sm" className="me-2" />
//                 Processing...
//               </>
//             ) : (
//               <>
//                 <ArrowRepeat className="me-2" size={16} />
//                 Confirm Renewal
//               </>
//             )}
//           </Button>
//         </Modal.Footer>
//       </Modal>
//     </Container>
//   );
// };

// export default ClientDetails;

//-------------------------------------------------------------end

import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  Row,
  Col,
  Button,
  Badge,
  Spinner,
  Alert,
  Nav,
  Tab,
  Table,
  ListGroup,
  ProgressBar,
  OverlayTrigger,
  Tooltip,
  Modal,
  Form
} from 'react-bootstrap';
import {
  ArrowLeft,
  Building,
  Envelope,
  Phone,
  Calendar,
  GeoAlt,
  People,
  GraphUp,
  Gear,
  FileText,
  ClockHistory,
  CheckCircle,
  ExclamationCircle,
  InfoCircle,
  Pencil,
  Trash,
  Printer,
  Download,
  Share,
  Copy,
  ArrowRepeat
} from 'react-bootstrap-icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
// import NepaliDate from 'nepali-date-converter';
import NepaliDate from 'nepali-datetime';

const ClientDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);
  
  // Renewal modal state
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalMonths, setRenewalMonths] = useState(12);
  const [customRenewalDate, setCustomRenewalDate] = useState('');
  const [isRenewing, setIsRenewing] = useState(false);
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchClientDetails();
  }, [id]);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please login again.');
        return;
      }

      const response = await axios.get(`/api/client/clients/${id}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        setClient(response.data.data);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch client details');
      }
    } catch (err) {
      console.error('Error fetching client details:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 404) {
        setError('Client not found');
      } else {
        setError(err.response?.data?.message || 'Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to add months to Nepali date (similar to your AddPurchase component)
  const addMonthsToNepaliDate = (nepaliDateStr, months) => {
    try {
      // Parse the Nepali date string (format: YYYY-MM-DD)
      const [year, month, day] = nepaliDateStr.split('-').map(Number);
      
      // Create Nepali date object (month is 0-indexed in the library)
      const nepaliDate = new NepaliDate(year, month - 1, day);
      
      // Get current values
      let currentYear = nepaliDate.getYear();
      let currentMonth = nepaliDate.getMonth(); // 0-indexed
      let currentDay = nepaliDate.getDate();
      
      // Calculate new month and year
      let newMonth = currentMonth + months;
      let newYear = currentYear;
      
      while (newMonth >= 12) {
        newMonth -= 12;
        newYear++;
      }
      
      // Create new date with new year and month
      let newNepaliDate = new NepaliDate(newYear, newMonth, currentDay);
      
      // Check if the date is valid (if day exceeds days in month)
      // If invalid, set to last day of the month
      if (newNepaliDate.getDate() !== currentDay) {
        // Set to last day of the month by going to next month and subtracting a day
        newNepaliDate = new NepaliDate(newYear, newMonth + 1, 0);
      }
      
      // Format as YYYY-MM-DD (month needs to be 1-indexed for output)
      const formattedDate = `${newNepaliDate.getYear()}-${String(newNepaliDate.getMonth() + 1).padStart(2, '0')}-${String(newNepaliDate.getDate()).padStart(2, '0')}`;
      
      console.log(`Nepali date calculation: ${nepaliDateStr} + ${months} months = ${formattedDate}`);
      return formattedDate;
    } catch (error) {
      console.error('Error adding months to Nepali date:', error);
      return nepaliDateStr;
    }
  };

  // Helper function to get current Nepali date
  const getCurrentNepaliDate = () => {
    const today = new NepaliDate();
    const formattedDate = `${today.getYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return formattedDate;
  };

  const handleRenew = async () => {
    setIsRenewing(true);
    try {
      const token = localStorage.getItem('token');
      
      let newRenewalDate;
      
      if (useCustomDate && customRenewalDate) {
        // Use custom date (should be in the company's date format)
        newRenewalDate = customRenewalDate;
        console.log('Using custom renewal date:', newRenewalDate);
      } else {
        // Calculate new renewal date based on company's date format
        if (client?.dateFormat === 'Nepali' || client?.dateFormat === 'nepali') {
          // Get current renewal date or current date in Nepali
          let currentNepaliDate;
          
          // Check if there's an existing renewal date
          if (client.renewalDate && client.renewalDate !== 'N/A' && client.renewalDate !== '') {
            // If renewal date exists and is in Nepali format (YYYY-MM-DD and year > 2000)
            if (/^\d{4}-\d{2}-\d{2}$/.test(client.renewalDate) && parseInt(client.renewalDate.split('-')[0]) > 2000) {
              currentNepaliDate = client.renewalDate;
              console.log('Using existing Nepali renewal date:', currentNepaliDate);
            } else {
              currentNepaliDate = getCurrentNepaliDate();
              console.log('Using current Nepali date (existing date invalid):', currentNepaliDate);
            }
          } else {
            currentNepaliDate = getCurrentNepaliDate();
            console.log('Using current Nepali date (no existing date):', currentNepaliDate);
          }
          
          // Add months to Nepali date
          newRenewalDate = addMonthsToNepaliDate(currentNepaliDate, renewalMonths);
          console.log(`Calculated new Nepali renewal date: ${currentNepaliDate} + ${renewalMonths} months = ${newRenewalDate}`);
        } else {
          // English date format
          let currentDate;
          
          if (client.renewalDate && client.renewalDate !== 'N/A' && client.renewalDate !== '') {
            currentDate = new Date(client.renewalDate);
            console.log('Using existing English renewal date:', currentDate);
          } else {
            currentDate = new Date();
            console.log('Using current English date:', currentDate);
          }
          
          const newDate = new Date(currentDate);
          newDate.setMonth(newDate.getMonth() + renewalMonths);
          newRenewalDate = newDate.toISOString().split('T')[0];
          console.log(`Calculated new English renewal date: ${newRenewalDate}`);
        }
      }
      
      const payload = {
        monthsToAdd: renewalMonths,
        newRenewalDate: newRenewalDate
      };

      console.log('Sending renewal payload:', payload);

      const response = await axios.post(
        `/api/client/clients/${id}/renew`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        showToast(response.data.message, 'success');
        setShowRenewalModal(false);
        // Refresh client details
        await fetchClientDetails();
        // Reset form
        setRenewalMonths(12);
        setCustomRenewalDate('');
        setUseCustomDate(false);
      } else {
        showToast(response.data.message || 'Failed to renew subscription', 'error');
      }
    } catch (err) {
      console.error('Error renewing client:', err);
      showToast(err.response?.data?.message || 'Network error. Please try again.', 'error');
    } finally {
      setIsRenewing(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'success', icon: <CheckCircle size={14} className="me-1" />, text: 'Active' },
      inactive: { bg: 'danger', icon: <ExclamationCircle size={14} className="me-1" />, text: 'Inactive' },
      demo: { bg: 'info', icon: <InfoCircle size={14} className="me-1" />, text: 'Demo' },
      expiring_soon: { bg: 'warning', icon: <ClockHistory size={14} className="me-1" />, text: 'Expiring Soon' }
    };
    
    const config = badges[status] || badges.active;
    return (
      <Badge 
        bg={config.bg} 
        className="px-3 py-2 rounded-pill d-inline-flex align-items-center"
        style={{ fontSize: '0.8rem', fontWeight: '500' }}
      >
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString || dateString === 'N/A' || dateString === '') return 'Not set';
    
    try {
      // Check if it's Nepali date (format: YYYY-MM-DD with year > 2000)
      if (client?.dateFormat === 'Nepali' || client?.dateFormat === 'nepali') {
        const [year, month, day] = dateString.split('-').map(Number);
        const nepaliDate = new NepaliDate(year, month - 1, day);
        const monthNames = ['Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
        return `${year} ${monthNames[month - 1]} ${day}`;
      } else {
        return new Date(dateString).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
    } catch {
      return dateString;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = {
        client: {
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: `${client.address}, ${client.city}, ${client.state}, ${client.country}`,
          pan: client.pan,
          tradeType: client.tradeType,
          renewalDate: client.renewalDate,
          status: client.status,
          createdAt: client.createdAt
        },
        owner: client.owner,
        stats: client.stats,
        exportedAt: new Date().toISOString()
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `client_${client.name}_details_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Client details exported successfully', 'success');
    } catch (err) {
      console.error('Error exporting client details:', err);
      showToast('Failed to export client details', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Client Details - ${client?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section-title { background-color: #f2f2f2; padding: 10px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Client Details Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="section">
            <h2 class="section-title">Basic Information</h2>
            <table>
              <tr><th>Client Name</th><td>${client.name}</td>
              <tr><th>Email</th><td>${client.email || 'N/A'}</td>
              <tr><th>Phone</th><td>${client.phone || 'N/A'}</td>
              <tr><th>PAN</th><td>${client.pan || 'N/A'}</td>
              <tr><th>Trade Type</th><td>${client.tradeType}</td>
              <tr><th>Status</th><td>${client.status}</td>
              <tr><th>Renewal Date</th><td>${client.renewalDate || 'N/A'}</td>
            </table>
          </div>
          
          <div class="section">
            <h2 class="section-title">Address Information</h2>
            <p>${client.address}, ${client.city}, ${client.state}, ${client.country}</p>
          </div>
          
          ${client.owner ? `
          <div class="section">
            <h2 class="section-title">Owner Information</h2>
            <table>
              <tr><th>Name</th><td>${client.owner.name}</td>
              <tr><th>Email</th><td>${client.owner.email || 'N/A'}</td>
              <tr><th>Phone</th><td>${client.owner.phone || 'N/A'}</td>
            </table>
          </div>
          ` : ''}
          
          <div class="section">
            <h2 class="section-title">Statistics</h2>
            <tr>
              <tr><th>Total Users</th><td>${client.stats.totalUsers}</td>
              <tr><th>Total Fiscal Years</th><td>${client.stats.totalFiscalYears}</td>
              <tr><th>Total Account Groups</th><td>${client.stats.totalAccountGroups}</td>
            </table>
          </div>
          
          <div class="footer">
            <p>This report was generated from the Client Management System</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    showToast('Print job sent', 'success');
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    showToast(`${field} copied to clipboard`, 'success');
  };

  if (loading) {
    return (
      <Container fluid className="py-5">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
            <h4 className="mt-3 text-primary">Loading Client Details...</h4>
            <p className="text-muted">Fetching client information</p>
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="py-5">
        <Alert variant="danger" className="shadow-lg">
          <Alert.Heading>Error Loading Client Details</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end gap-2">
            <Button variant="outline-secondary" onClick={() => navigate('/system-owner/clients')}>
              Back to Clients
            </Button>
            <Button variant="danger" onClick={fetchClientDetails}>
              Retry
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!client) {
    return (
      <Container fluid className="py-5">
        <Alert variant="warning" className="shadow-lg">
          <Alert.Heading>Client Not Found</Alert.Heading>
          <p>The client you're looking for doesn't exist or has been removed.</p>
          <hr />
          <Button variant="primary" onClick={() => navigate('/system-owner/clients')}>
            Back to Clients
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="client-details-container py-4">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1050 }}>
          <Alert variant="success" onClose={() => setShowSuccessToast(false)} dismissible>
            {toastMessage}
          </Alert>
        </div>
      )}

      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div className="d-flex align-items-center gap-3">
          <Button
            variant="outline-secondary"
            onClick={() => navigate('/system-owner/clients')}
            className="d-flex align-items-center gap-2"
          >
            <ArrowLeft size={18} />
            Back
          </Button>
          
          <div>
            <h1 className="mb-1 display-6">{client.name}</h1>
            <div className="d-flex align-items-center gap-3">
              {getStatusBadge(client.status)}
              <span className="text-muted">
                <Building size={14} className="me-1" />
                {client.tradeType}
              </span>
              <span className="text-muted">
                <ClockHistory size={14} className="me-1" />
                Joined {formatDate(client.createdAt)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="d-flex gap-2">
          <OverlayTrigger placement="top" overlay={<Tooltip>Renew Subscription</Tooltip>}>
            <Button
              variant="success"
              onClick={() => setShowRenewalModal(true)}
            >
              <ArrowRepeat size={16} className="me-1" />
              Renew
            </Button>
          </OverlayTrigger>
          
          <OverlayTrigger placement="top" overlay={<Tooltip>Edit Client</Tooltip>}>
            <Button
              variant="outline-primary"
              onClick={() => navigate(`/system-owner/clients/${client.id}/edit`)}
            >
              <Pencil size={16} className="me-1" />
              Edit
            </Button>
          </OverlayTrigger>
          
          <OverlayTrigger placement="top" overlay={<Tooltip>Export Details</Tooltip>}>
            <Button
              variant="outline-secondary"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download size={16} className="me-1" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </OverlayTrigger>
          
          <OverlayTrigger placement="top" overlay={<Tooltip>Print Report</Tooltip>}>
            <Button variant="outline-secondary" onClick={handlePrint}>
              <Printer size={16} />
            </Button>
          </OverlayTrigger>
        </div>
      </div>

      {/* Renewal Info Card */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <Calendar size={24} className="text-primary" />
              <div>
                <div className="text-muted small">Current Renewal Date</div>
                <h4 className="mb-0">{formatDisplayDate(client.renewalDate)}</h4>
              </div>
            </div>
            <Badge bg={client.status === 'active' ? 'success' : client.status === 'expiring_soon' ? 'warning' : 'danger'} className="px-3 py-2">
              {client.status === 'active' ? 'Active' : client.status === 'expiring_soon' ? 'Expiring Soon' : 'Expired'}
            </Badge>
          </div>
        </Card.Body>
      </Card>

      {/* Main Content Tabs (keeping the same as before) */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0 p-0">
          <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="px-3 pt-2">
            <Nav.Item>
              <Nav.Link eventKey="overview" className="d-flex align-items-center gap-2">
                <Building size={16} />
                Overview
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="owner" className="d-flex align-items-center gap-2">
                <People size={16} />
                Owner Info
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="fiscal-years" className="d-flex align-items-center gap-2">
                <Calendar size={16} />
                Fiscal Years
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="attendance" className="d-flex align-items-center gap-2">
                <ClockHistory size={16} />
                Attendance Settings
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="users" className="d-flex align-items-center gap-2">
                <People size={16} />
                Users
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="settings" className="d-flex align-items-center gap-2">
                <Gear size={16} />
                Settings
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Header>
        
        <Card.Body className="p-4">
          <Tab.Content>
            {/* Overview Tab - Keep as before */}
            <Tab.Pane eventKey="overview" active={activeTab === 'overview'}>
              <Row>
                <Col md={6}>
                  <h5 className="mb-3">Basic Information</h5>
                  <ListGroup variant="flush" className="border rounded">
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">Company Name</span>
                      <strong>{client.name}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">Email Address</span>
                      <div>
                        <a href={`mailto:${client.email}`} className="text-decoration-none me-2">
                          {client.email || 'N/A'}
                        </a>
                        {client.email && (
                          <OverlayTrigger placement="top" overlay={<Tooltip>Copy Email</Tooltip>}>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0"
                              onClick={() => copyToClipboard(client.email, 'Email')}
                            >
                              <Copy size={14} />
                            </Button>
                          </OverlayTrigger>
                        )}
                      </div>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">Phone Number</span>
                      <div>
                        <a href={`tel:${client.phone}`} className="text-decoration-none me-2">
                          {client.phone || 'N/A'}
                        </a>
                        {client.phone && (
                          <OverlayTrigger placement="top" overlay={<Tooltip>Copy Phone</Tooltip>}>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0"
                              onClick={() => copyToClipboard(client.phone, 'Phone')}
                            >
                              <Copy size={14} />
                            </Button>
                          </OverlayTrigger>
                        )}
                      </div>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">PAN Number</span>
                      <div>
                        <span className="me-2">{client.pan || 'N/A'}</span>
                        {client.pan && (
                          <OverlayTrigger placement="top" overlay={<Tooltip>Copy PAN</Tooltip>}>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0"
                              onClick={() => copyToClipboard(client.pan, 'PAN')}
                            >
                              <Copy size={14} />
                            </Button>
                          </OverlayTrigger>
                        )}
                      </div>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">Ward Number</span>
                      <strong>{client.ward || 'N/A'}</strong>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
                
                <Col md={6}>
                  <h5 className="mb-3">Address Information</h5>
                  <ListGroup variant="flush" className="border rounded">
                    <ListGroup.Item>
                      <GeoAlt size={16} className="text-muted me-2" />
                      {client.address && (
                        <div>{client.address}</div>
                      )}
                      <div className="mt-1">
                        {client.city && <span>{client.city}, </span>}
                        {client.state && <span>{client.state}, </span>}
                        {client.country && <span>{client.country}</span>}
                      </div>
                    </ListGroup.Item>
                  </ListGroup>
                  
                  <h5 className="mb-3 mt-4">Business Features</h5>
                  <ListGroup variant="flush" className="border rounded">
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>VAT Enabled</span>
                      <Badge bg={client.vatEnabled ? 'success' : 'secondary'}>
                        {client.vatEnabled ? 'Yes' : 'No'}
                      </Badge>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>Store Management</span>
                      <Badge bg={client.storeManagement ? 'success' : 'secondary'}>
                        {client.storeManagement ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>Date Format</span>
                      <strong>{client.dateFormat}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <span>Notification Emails</span>
                      <div className="mt-2">
                        {client.notificationEmails?.length > 0 ? (
                          client.notificationEmails.map((email, idx) => (
                            <div key={idx} className="small mb-1">
                              <Envelope size={12} className="me-1" />
                              {email}
                            </div>
                          ))
                        ) : (
                          <span className="text-muted">No notification emails configured</span>
                        )}
                      </div>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
              </Row>
            </Tab.Pane>
            
            {/* Owner Info Tab */}
            <Tab.Pane eventKey="owner" active={activeTab === 'owner'}>
              {client.owner ? (
                <Row>
                  <Col md={6}>
                    <ListGroup variant="flush" className="border rounded">
                      <ListGroup.Item className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">Owner Name</span>
                        <strong>{client.owner.name}</strong>
                      </ListGroup.Item>
                      <ListGroup.Item className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">Email</span>
                        <a href={`mailto:${client.owner.email}`} className="text-decoration-none">
                          {client.owner.email || 'N/A'}
                        </a>
                      </ListGroup.Item>
                      <ListGroup.Item className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">Phone</span>
                        <a href={`tel:${client.owner.phone}`} className="text-decoration-none">
                          {client.owner.phone || 'N/A'}
                        </a>
                      </ListGroup.Item>
                    </ListGroup>
                  </Col>
                </Row>
              ) : (
                <Alert variant="info">No owner information available</Alert>
              )}
            </Tab.Pane>
            
            {/* Fiscal Years Tab */}
            <Tab.Pane eventKey="fiscal-years" active={activeTab === 'fiscal-years'}>
              {client.fiscalYears?.length > 0 ? (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.fiscalYears.map((fy) => (
                      <tr key={fy.id}>
                        <td><strong>{fy.name}</strong></td>
                        <td>{fy.startDate ? formatDate(fy.startDate) : 'N/A'}</td>
                        <td>{fy.endDate ? formatDate(fy.endDate) : 'N/A'}</td>
                        <td>
                          {fy.isActive ? (
                            <Badge bg="success">Active</Badge>
                          ) : (
                            <Badge bg="secondary">Inactive</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info">No fiscal years configured</Alert>
              )}
            </Tab.Pane>
            
            {/* Attendance Settings Tab - Simplified */}
            <Tab.Pane eventKey="attendance" active={activeTab === 'attendance'}>
              <Row>
                <Col md={6}>
                  <h5 className="mb-3">General Settings</h5>
                  <ListGroup variant="flush" className="border rounded mb-4">
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>Geo-fencing Enabled</span>
                      <Badge bg={client.attendanceSettings?.geoFencingEnabled ? 'success' : 'secondary'}>
                        {client.attendanceSettings?.geoFencingEnabled ? 'Yes' : 'No'}
                      </Badge>
                    </ListGroup.Item>
                  </ListGroup>
                  
                  <h5 className="mb-3">Working Hours</h5>
                  <ListGroup variant="flush" className="border rounded mb-4">
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>Start Time</span>
                      <strong>{client.attendanceSettings?.workingHours?.startTime || '09:00'}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>End Time</span>
                      <strong>{client.attendanceSettings?.workingHours?.endTime || '17:00'}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>Grace Period</span>
                      <strong>{client.attendanceSettings?.workingHours?.gracePeriod || 15} minutes</strong>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
                
                <Col md={6}>
                  <h5 className="mb-3">Auto Clock-out</h5>
                  <ListGroup variant="flush" className="border rounded">
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>Enabled</span>
                      <Badge bg={client.attendanceSettings?.autoClockOut?.enabled ? 'success' : 'secondary'}>
                        {client.attendanceSettings?.autoClockOut?.enabled ? 'Yes' : 'No'}
                      </Badge>
                    </ListGroup.Item>
                    {client.attendanceSettings?.autoClockOut?.enabled && (
                      <ListGroup.Item className="d-flex justify-content-between align-items-center">
                        <span>Auto Clock-out Time</span>
                        <strong>{client.attendanceSettings.autoClockOut.time}</strong>
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                </Col>
              </Row>
            </Tab.Pane>
            
            {/* Users Tab */}
            <Tab.Pane eventKey="users" active={activeTab === 'users'}>
              {client.users?.length > 0 ? (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.users.map((user) => (
                      <tr key={user.id}>
                        <td><strong>{user.name}</strong></td>
                        <td><a href={`mailto:${user.email}`}>{user.email}</a></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info">No additional users have access to this client</Alert>
              )}
            </Tab.Pane>
            
            {/* Settings Tab */}
            <Tab.Pane eventKey="settings" active={activeTab === 'settings'}>
              {client.settings?.length > 0 ? (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.settings.map((setting, idx) => (
                      <tr key={idx}>
                        <td><code>{setting.key}</code></td>
                        <td>{setting.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info">No custom settings configured</Alert>
              )}
            </Tab.Pane>
          </Tab.Content>
        </Card.Body>
      </Card>

      {/* Renewal Modal */}
      <Modal show={showRenewalModal} onHide={() => setShowRenewalModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <ArrowRepeat className="me-2" size={20} />
            Renew Subscription - {client.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <InfoCircle className="me-2" size={16} />
            Current renewal date: <strong>{formatDisplayDate(client.renewalDate)}</strong>
            {client.dateFormat === 'Nepali' && (
              <div className="mt-1 small text-muted">
                (Nepali Calendar - Format: YYYY-MM-DD)
              </div>
            )}
          </Alert>
          
          <Form>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">Renewal Type</Form.Label>
              <div className="d-flex gap-3">
                <Form.Check
                  type="radio"
                  label="Add months to current date"
                  name="renewalType"
                  id="addMonths"
                  checked={!useCustomDate}
                  onChange={() => setUseCustomDate(false)}
                />
                <Form.Check
                  type="radio"
                  label="Set custom renewal date"
                  name="renewalType"
                  id="customDate"
                  checked={useCustomDate}
                  onChange={() => setUseCustomDate(true)}
                />
              </div>
            </Form.Group>

            {!useCustomDate ? (
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Add Months</Form.Label>
                <Form.Select 
                  value={renewalMonths} 
                  onChange={(e) => setRenewalMonths(parseInt(e.target.value))}
                >
                  <option value={3}>3 months</option>
                  <option value={6}>6 months</option>
                  <option value={12}>12 months (1 year)</option>
                  <option value={18}>18 months</option>
                  <option value={24}>24 months (2 years)</option>
                  <option value={36}>36 months (3 years)</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Subscription will be extended by {renewalMonths} months from current {client.dateFormat === 'Nepali' ? 'Nepali' : 'English'} date
                </Form.Text>
              </Form.Group>
            ) : (
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  Custom Renewal Date ({client.dateFormat === 'Nepali' ? 'Nepali Calendar' : 'English Calendar'})
                </Form.Label>
                <Form.Control
                  type={client.dateFormat === 'Nepali' ? 'text' : 'date'}
                  value={customRenewalDate}
                  onChange={(e) => setCustomRenewalDate(e.target.value)}
                  placeholder={client.dateFormat === 'Nepali' ? 'YYYY-MM-DD (e.g., 2084-04-12)' : 'YYYY-MM-DD'}
                />
                <Form.Text className="text-muted">
                  {client.dateFormat === 'Nepali' 
                    ? 'Enter the new renewal date in Nepali calendar format (YYYY-MM-DD). Example: 2084-04-12' 
                    : 'Enter the new renewal date in English calendar format (YYYY-MM-DD)'}
                </Form.Text>
              </Form.Group>
            )}

            <Alert variant="warning" className="mt-3">
              <ExclamationCircle className="me-2" size={16} />
              <strong>Note:</strong> Renewing the subscription will update the renewal date and affect the client's status calculation.
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRenewalModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleRenew}
            disabled={isRenewing || (useCustomDate && !customRenewalDate)}
          >
            {isRenewing ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <ArrowRepeat className="me-2" size={16} />
                Confirm Renewal
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ClientDetails;