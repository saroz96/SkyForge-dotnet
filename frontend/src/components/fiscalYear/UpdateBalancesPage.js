// // UpdateBalancesPage.jsx
// import React, { useState, useEffect } from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { 
//     Container, Row, Col, Card, Table, Form, Button, 
//     Alert, Spinner, Badge, Modal, ProgressBar
// } from 'react-bootstrap';
// import { 
//     FaEdit, FaSave, FaTimes, FaCheck, FaInfoCircle, 
//     FaExchangeAlt, FaArrowLeft, FaPlus, FaTrash,
//     FaExclamationTriangle, FaClipboardList, FaMoneyBillWave,
//     FaWarehouse, FaShoppingCart, FaDollarSign
// } from 'react-icons/fa';
// import Header from '../retailer/Header';
// import NotificationToast from '../NotificationToast';
// import api from '../services/api';

// const UpdateBalancesPage = () => {
//     const navigate = useNavigate();
//     const location = useLocation();
//     const { sourceFiscalYearId, targetFiscalYearId, carryType } = location.state || {};

//     const [loading, setLoading] = useState(true);
//     const [saving, setSaving] = useState(false);
//     const [data, setData] = useState(null);
//     const [accountBalances, setAccountBalances] = useState([]);
//     const [itemStocks, setItemStocks] = useState([]);
//     const [showConfirmModal, setShowConfirmModal] = useState(false);
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success',
//         duration: 3000
//     });
//     const [editingAccount, setEditingAccount] = useState(null);
//     const [editingItem, setEditingItem] = useState(null);
//     const [progress, setProgress] = useState(0);
//     const [filterType, setFilterType] = useState('all'); // all, new, changed
//     const [totalStockValue, setTotalStockValue] = useState(0);

//     useEffect(() => {
//         if (!sourceFiscalYearId || !targetFiscalYearId || !carryType) {
//             setNotification({
//                 show: true,
//                 message: 'Missing required parameters. Please try again.',
//                 type: 'error',
//                 duration: 5000
//             });
//             setTimeout(() => navigate('/list-of-existing/fiscalYears'), 2000);
//             return;
//         }
//         fetchUpdateableBalances();
//     }, [sourceFiscalYearId, targetFiscalYearId, carryType]);

//     const fetchUpdateableBalances = async () => {
//         try {
//             setLoading(true);
//             const response = await api.get('/api/FiscalYears/get-updateable-balances', {
//                 params: {
//                     sourceFiscalYearId,
//                     targetFiscalYearId,
//                     carryType
//                 }
//             });

//             if (response.data.success) {
//                 const responseData = response.data.data;
//                 setData(responseData);
//                 setAccountBalances(responseData.accountBalances || []);
//                 setItemStocks(responseData.itemStocks || []);

//                 // Calculate total stock value
//                 const totalStock = (responseData.itemStocks || []).reduce(
//                     (sum, item) => sum + (item.openingStockValue || 0), 0
//                 );
//                 setTotalStockValue(totalStock);
//             } else {
//                 throw new Error(response.data.message || 'Failed to fetch balances');
//             }
//         } catch (err) {
//             console.error('Error fetching balances:', err);
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.message || err.message || 'Failed to fetch balances',
//                 type: 'error',
//                 duration: 5000
//             });
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Check if account is Stock in Hand
//     const isStockInHandAccount = (account) => {
//         return account.accountGroupName === "Stock in Hand" || 
//                account.accountName === "Stock in Hand";
//     };

//     const handleAccountBalanceChange = (accountId, newBalance) => {
//         setAccountBalances(prev => prev.map(acc => {
//             // Don't allow manual editing of Stock in Hand account
//             if (isStockInHandAccount(acc)) {
//                 return acc;
//             }
//             return acc.accountId === accountId 
//                 ? { ...acc, updatedBalance: parseFloat(newBalance) || 0 }
//                 : acc;
//         }));
//     };

//     const handleItemStockChange = (itemId, field, value) => {
//         const newValue = parseFloat(value) || 0;

//         setItemStocks(prev => {
//             const updated = prev.map(item => {
//                 if (item.itemId === itemId) {
//                     const updatedItem = { ...item, [field]: newValue };

//                     // If opening stock or opening stock value changes, auto-calculate the other
//                     if (field === 'openingStock' && item.averagePurchaseRate > 0) {
//                         updatedItem.openingStockValue = newValue * item.averagePurchaseRate;
//                     } else if (field === 'openingStockValue' && item.averagePurchaseRate > 0) {
//                         updatedItem.openingStock = newValue / item.averagePurchaseRate;
//                     }

//                     return updatedItem;
//                 }
//                 return item;
//             });

//             // Recalculate total stock value
//             const newTotalStock = updated.reduce(
//                 (sum, item) => sum + (item.isSelected ? item.openingStockValue : 0), 0
//             );
//             setTotalStockValue(newTotalStock);

//             // Update Stock in Hand account balance
//             setAccountBalances(prevAccounts => 
//                 prevAccounts.map(acc => {
//                     if (isStockInHandAccount(acc)) {
//                         return { 
//                             ...acc, 
//                             updatedBalance: newTotalStock,
//                             currentBalance: newTotalStock,
//                             isSelected: true
//                         };
//                     }
//                     return acc;
//                 })
//             );

//             return updated;
//         });
//     };

//     const toggleAccountSelection = (accountId) => {
//         setAccountBalances(prev => prev.map(acc => {
//             // Don't allow deselecting Stock in Hand account
//             if (isStockInHandAccount(acc)) {
//                 return acc;
//             }
//             return acc.accountId === accountId 
//                 ? { ...acc, isSelected: !acc.isSelected }
//                 : acc;
//         }));
//     };

//     const toggleItemSelection = (itemId) => {
//         setItemStocks(prev => {
//             const updated = prev.map(item => 
//                 item.itemId === itemId 
//                     ? { ...item, isSelected: !item.isSelected }
//                     : item
//             );

//             // Recalculate total stock value
//             const newTotalStock = updated.reduce(
//                 (sum, item) => sum + (item.isSelected ? item.openingStockValue : 0), 0
//             );
//             setTotalStockValue(newTotalStock);

//             // Update Stock in Hand account balance
//             setAccountBalances(prevAccounts => 
//                 prevAccounts.map(acc => {
//                     if (isStockInHandAccount(acc)) {
//                         return { 
//                             ...acc, 
//                             updatedBalance: newTotalStock,
//                             currentBalance: newTotalStock,
//                             isSelected: true
//                         };
//                     }
//                     return acc;
//                 })
//             );

//             return updated;
//         });
//     };

//     const selectAllAccounts = (selected) => {
//         setAccountBalances(prev => prev.map(acc => {
//             // Keep Stock in Hand always selected
//             if (isStockInHandAccount(acc)) {
//                 return { ...acc, isSelected: true };
//             }
//             return { ...acc, isSelected: selected };
//         }));
//     };

//     const selectAllItems = (selected) => {
//         setItemStocks(prev => {
//             const updated = prev.map(item => ({ ...item, isSelected: selected }));

//             // Recalculate total stock value
//             const newTotalStock = updated.reduce(
//                 (sum, item) => sum + (item.isSelected ? item.openingStockValue : 0), 0
//             );
//             setTotalStockValue(newTotalStock);

//             // Update Stock in Hand account balance
//             setAccountBalances(prevAccounts => 
//                 prevAccounts.map(acc => {
//                     if (isStockInHandAccount(acc)) {
//                         return { 
//                             ...acc, 
//                             updatedBalance: newTotalStock,
//                             currentBalance: newTotalStock,
//                             isSelected: true
//                         };
//                     }
//                     return acc;
//                 })
//             );

//             return updated;
//         });
//     };

//     const getFilteredAccounts = () => {
//         if (filterType === 'all') return accountBalances;
//         if (filterType === 'new') return accountBalances.filter(a => a.isNew);
//         if (filterType === 'changed') return accountBalances.filter(a => a.isChanged);
//         return accountBalances;
//     };

//     const getFilteredItems = () => {
//         if (filterType === 'all') return itemStocks;
//         if (filterType === 'new') return itemStocks.filter(i => i.isNew);
//         if (filterType === 'changed') return itemStocks.filter(i => i.isChanged);
//         return itemStocks;
//     };

//     const handleSaveAndFinalize = async () => {
//         // Validate that stock in hand balance matches total stock value
//         const stockInHandAccount = accountBalances.find(a => isStockInHandAccount(a));
//         if (stockInHandAccount && Math.abs(stockInHandAccount.updatedBalance - totalStockValue) > 0.01) {
//             setNotification({
//                 show: true,
//                 message: 'Stock in Hand balance does not match total stock value. Please check your entries.',
//                 type: 'error',
//                 duration: 5000
//             });
//             return;
//         }
//         setShowConfirmModal(true);
//     };

//     const confirmFinalize = async () => {
//         setShowConfirmModal(false);
//         setSaving(true);
//         setProgress(0);

//         try {
//             const progressInterval = setInterval(() => {
//                 setProgress(prev => Math.min(prev + 10, 90));
//             }, 300);

//             const requestData = {
//                 sourceFiscalYearId,
//                 targetFiscalYearId,
//                 carryType,
//                 updatedAccounts: accountBalances.map(acc => ({
//                     accountId: acc.accountId,
//                     newBalance: isStockInHandAccount(acc) ? totalStockValue : acc.updatedBalance,
//                     balanceType: isStockInHandAccount(acc) ? 'Dr' : acc.balanceType,
//                     isSelected: isStockInHandAccount(acc) ? true : acc.isSelected
//                 })),
//                 updatedItems: itemStocks.map(item => ({
//                     itemId: item.itemId,
//                     openingStock: item.openingStock,
//                     openingStockValue: item.openingStockValue,
//                     isSelected: item.isSelected
//                 })),
//                 transferDate: new Date().toISOString().split('T')[0],
//                 transferDateNepali: new Date().toLocaleDateString('ne-NP'),
//                 finalizeTransfer: true
//             };

//             const response = await api.post('/api/FiscalYears/update-and-finalize', requestData);

//             clearInterval(progressInterval);
//             setProgress(100);

//             if (response.data.success) {
//                 setNotification({
//                     show: true,
//                     message: 'Balances updated and finalized successfully!',
//                     type: 'success',
//                     duration: 5000
//                 });

//                 setTimeout(() => {
//                     navigate('/list-of-existing/fiscalYears');
//                 }, 3000);
//             } else {
//                 throw new Error(response.data.message || 'Failed to finalize balances');
//             }
//         } catch (err) {
//             console.error('Error finalizing:', err);
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.message || err.message || 'Failed to finalize balances',
//                 type: 'error',
//                 duration: 5000
//             });
//         } finally {
//             setSaving(false);
//             setTimeout(() => setProgress(0), 500);
//         }
//     };

//     if (loading) {
//         return (
//             <>
//                 <Header />
//                 <Container className="mt-5 text-center">
//                     <Spinner animation="border" variant="primary" />
//                     <p className="mt-3">Loading balances...</p>
//                 </Container>
//             </>
//         );
//     }

//     const filteredAccounts = getFilteredAccounts();
//     const filteredItems = getFilteredItems();
//     const totalSelectedAccounts = filteredAccounts.filter(a => a.isSelected).length;
//     const totalSelectedItems = filteredItems.filter(i => i.isSelected).length;

//     return (
//         <div className="container-fluid">
//             <Header />

//             {/* Confirm Modal */}
//             <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered size="lg">
//                 <Modal.Header closeButton className="bg-warning text-dark border-0">
//                     <Modal.Title className="d-flex align-items-center">
//                         <FaExclamationTriangle className="me-2" />
//                         Confirm Finalize
//                     </Modal.Title>
//                 </Modal.Header>
//                 <Modal.Body className="p-4">
//                     <Alert variant="info">
//                         <FaInfoCircle className="me-2" />
//                         <strong>You are about to finalize the fiscal year transition.</strong>
//                     </Alert>

//                     <p>This will:</p>
//                     <ul>
//                         <li>Update opening balances for <strong>{totalSelectedAccounts}</strong> accounts</li>
//                         <li>Update opening stocks for <strong>{totalSelectedItems}</strong> items</li>
//                         <li>Create opening balance transaction</li>
//                         <li>Activate the new fiscal year: <strong>{data?.targetFiscalYearName}</strong></li>
//                     </ul>

//                     <Alert variant="warning" className="py-1 small">
//                         <FaExclamationTriangle className="me-1" />
//                         This action cannot be undone. Please review all balances carefully.
//                     </Alert>
//                 </Modal.Body>
//                 <Modal.Footer className="border-0">
//                     <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
//                         Cancel
//                     </Button>
//                     <Button variant="primary" onClick={confirmFinalize} disabled={saving}>
//                         {saving ? (
//                             <>
//                                 <Spinner size="sm" className="me-2" />
//                                 Processing...
//                             </>
//                         ) : (
//                             <>
//                                 <FaSave className="me-2" />
//                                 Finalize
//                             </>
//                         )}
//                     </Button>
//                 </Modal.Footer>
//             </Modal>

//             {/* Progress Bar */}
//             {saving && (
//                 <div className="mb-3">
//                     <ProgressBar 
//                         now={progress} 
//                         label={`${progress}%`}
//                         animated={progress < 100}
//                         variant={progress === 100 ? 'success' : 'primary'}
//                         style={{ height: '25px' }}
//                     />
//                     <p className="text-muted small text-center mt-1">
//                         {progress < 100 ? 'Updating balances...' : 'Complete!'}
//                     </p>
//                 </div>
//             )}

//             {/* Header */}
//             <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
//                 <div>
//                     <h4 className="mb-0">
//                         <FaEdit className="me-2 text-primary" />
//                         Update Fiscal Year Balances
//                     </h4>
//                     <small className="text-muted">
//                         <FaExchangeAlt className="me-1" />
//                         {data?.sourceFiscalYearName} → {data?.targetFiscalYearName}
//                         <Badge bg="info" className="ms-2">
//                             {carryType === 'All' ? 'All Masters' : 'New & Changed'}
//                         </Badge>
//                     </small>
//                 </div>
//                 <div>
//                     <Button 
//                         variant="outline-secondary" 
//                         onClick={() => navigate('/list-of-existing/fiscalYears')}
//                         className="me-2"
//                     >
//                         <FaArrowLeft className="me-2" />
//                         Back
//                     </Button>
//                 </div>
//             </div>

//             {/* Summary Cards */}
//             <Row className="mb-3">
//                 <Col md={3}>
//                     <Card className="text-center">
//                         <Card.Body className="py-2">
//                             <h6 className="mb-0">Total Accounts</h6>
//                             <h3 className="mb-0">{data?.summary?.totalAccounts || 0}</h3>
//                             <small className="text-muted">
//                                 Selected: {totalSelectedAccounts}
//                             </small>
//                         </Card.Body>
//                     </Card>
//                 </Col>
//                 <Col md={3}>
//                     <Card className="text-center">
//                         <Card.Body className="py-2">
//                             <h6 className="mb-0">Total Items</h6>
//                             <h3 className="mb-0">{data?.summary?.totalItems || 0}</h3>
//                             <small className="text-muted">
//                                 Selected: {totalSelectedItems}
//                             </small>
//                         </Card.Body>
//                     </Card>
//                 </Col>
//                 <Col md={3}>
//                     <Card className="text-center">
//                         <Card.Body className="py-2">
//                             <h6 className="mb-0">Total Stock Value</h6>
//                             <h3 className="mb-0 text-primary">Rs. {totalStockValue.toLocaleString()}</h3>
//                             <small className="text-muted">
//                                 Auto-calculated from items
//                             </small>
//                         </Card.Body>
//                     </Card>
//                 </Col>
//                 <Col md={3}>
//                     <Card className="text-center">
//                         <Card.Body className="py-2">
//                             <h6 className="mb-0">Total Balance</h6>
//                             <h3 className="mb-0 text-success">Rs. {(data?.summary?.totalDebitBalance || 0).toLocaleString()}</h3>
//                             <small className="text-muted">
//                                 Including Stock in Hand
//                             </small>
//                         </Card.Body>
//                     </Card>
//                 </Col>
//             </Row>

//             {/* Filter Controls */}
//             <Row className="mb-3">
//                 <Col md={4}>
//                     <Form.Group>
//                         <Form.Label className="small fw-bold">Filter Type</Form.Label>
//                         <Form.Select 
//                             value={filterType} 
//                             onChange={(e) => setFilterType(e.target.value)}
//                             size="sm"
//                         >
//                             <option value="all">All Items</option>
//                             <option value="new">New Items</option>
//                             <option value="changed">Changed Items</option>
//                         </Form.Select>
//                     </Form.Group>
//                 </Col>
//                 <Col md={8} className="d-flex align-items-end">
//                     <div className="d-flex gap-2 flex-wrap">
//                         <Button 
//                             size="sm" 
//                             variant="outline-success"
//                             onClick={() => selectAllAccounts(true)}
//                         >
//                             Select All Accounts
//                         </Button>
//                         <Button 
//                             size="sm" 
//                             variant="outline-danger"
//                             onClick={() => selectAllAccounts(false)}
//                         >
//                             Deselect All
//                         </Button>
//                         <Button 
//                             size="sm" 
//                             variant="outline-info"
//                             onClick={() => selectAllItems(true)}
//                         >
//                             Select All Items
//                         </Button>
//                         <Button 
//                             size="sm" 
//                             variant="outline-secondary"
//                             onClick={() => selectAllItems(false)}
//                         >
//                             Deselect All Items
//                         </Button>
//                     </div>
//                 </Col>
//             </Row>

//             {/* Account Balances Table */}
//             <Card className="mb-3">
//                 <Card.Header className="bg-primary text-white py-1">
//                     <h6 className="mb-0">
//                         <FaMoneyBillWave className="me-2" />
//                         Account Balances
//                         <Badge bg="light" text="dark" className="ms-2">
//                             {filteredAccounts.length} accounts
//                         </Badge>
//                     </h6>
//                 </Card.Header>
//                 <Card.Body className="p-0">
//                     <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
//                         <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.8rem' }}>
//                             <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
//                                 <tr>
//                                     <th style={{ width: '40px' }}>#</th>
//                                     <th style={{ width: '50px' }}>Select</th>
//                                     <th>Account Name</th>
//                                     <th>Group</th>
//                                     <th style={{ width: '120px' }}>Current Balance</th>
//                                     <th style={{ width: '120px' }}>Opening Balance</th>
//                                     <th style={{ width: '60px' }}>Dr/Cr</th>
//                                     <th style={{ width: '80px' }}>Status</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {filteredAccounts.length > 0 ? (
//                                     filteredAccounts.map((account, index) => {
//                                         const isStockInHand = isStockInHandAccount(account);
//                                         return (
//                                             <tr 
//                                                 key={account.accountId} 
//                                                 className={`${!account.isSelected ? 'opacity-50' : ''} ${isStockInHand ? 'table-info' : ''}`}
//                                             >
//                                                 <td>{index + 1}</td>
//                                                 <td>
//                                                     <Form.Check
//                                                         type="checkbox"
//                                                         checked={account.isSelected}
//                                                         onChange={() => toggleAccountSelection(account.accountId)}
//                                                         disabled={isStockInHand}
//                                                         title={isStockInHand ? "Stock in Hand is mandatory" : ""}
//                                                     />
//                                                 </td>
//                                                 <td>
//                                                     <strong>{account.accountName}</strong>
//                                                     {isStockInHand && (
//                                                         <Badge bg="info" className="ms-1" style={{ fontSize: '0.6rem' }}>
//                                                             <FaWarehouse className="me-1" /> Stock Account
//                                                         </Badge>
//                                                     )}
//                                                     {account.isNew && !isStockInHand && (
//                                                         <Badge bg="success" className="ms-1" style={{ fontSize: '0.6rem' }}>
//                                                             New
//                                                         </Badge>
//                                                     )}
//                                                     {account.isChanged && !isStockInHand && (
//                                                         <Badge bg="warning" className="ms-1" style={{ fontSize: '0.6rem' }}>
//                                                             Changed
//                                                         </Badge>
//                                                     )}
//                                                 </td>
//                                                 <td>{account.accountGroupName}</td>
//                                                 <td>
//                                                     {isStockInHand ? (
//                                                         <span className="fw-bold text-primary">
//                                                             Rs. {totalStockValue.toLocaleString()}
//                                                         </span>
//                                                     ) : (
//                                                         `Rs. ${account.currentBalance.toLocaleString()}`
//                                                     )}
//                                                 </td>
//                                                 <td>
//                                                     {isStockInHand ? (
//                                                         <span className="fw-bold text-primary">
//                                                             Rs. {totalStockValue.toLocaleString()}
//                                                             <small className="d-block text-muted" style={{ fontSize: '0.6rem' }}>
//                                                                 Auto-calculated
//                                                             </small>
//                                                         </span>
//                                                     ) : (
//                                                         <Form.Control
//                                                             type="number"
//                                                             size="sm"
//                                                             value={account.updatedBalance}
//                                                             onChange={(e) => handleAccountBalanceChange(account.accountId, e.target.value)}
//                                                             disabled={!account.isSelected}
//                                                             style={{ width: '120px' }}
//                                                         />
//                                                     )}
//                                                 </td>
//                                                 <td>
//                                                     <Badge bg={account.balanceType === 'Dr' ? 'success' : 'danger'}>
//                                                         {account.balanceType}
//                                                     </Badge>
//                                                 </td>
//                                                 <td>
//                                                     {isStockInHand && <Badge bg="info">Stock</Badge>}
//                                                     {account.isNew && !isStockInHand && <Badge bg="success" className="me-1">New</Badge>}
//                                                     {account.isChanged && !isStockInHand && <Badge bg="warning">Changed</Badge>}
//                                                     {!account.isNew && !account.isChanged && !isStockInHand && <Badge bg="secondary">Existing</Badge>}
//                                                 </td>
//                                             </tr>
//                                         );
//                                     })
//                                 ) : (
//                                     <tr>
//                                         <td colSpan="8" className="text-center py-3 text-muted">
//                                             No accounts found for the selected filter
//                                         </td>
//                                     </tr>
//                                 )}
//                             </tbody>
//                         </table>
//                     </div>
//                 </Card.Body>
//             </Card>

//             {/* Item Stocks Table - Updated with Purchase and Sales Prices */}
//             <Card className="mb-3">
//                 <Card.Header className="bg-success text-white py-1">
//                     <h6 className="mb-0">
//                         <FaClipboardList className="me-2" />
//                         Item Opening Stocks
//                         <Badge bg="light" text="dark" className="ms-2">
//                             {filteredItems.length} items
//                         </Badge>
//                         <Badge bg="info" text="dark" className="ms-2">
//                             Total Value: Rs. {totalStockValue.toLocaleString()}
//                         </Badge>
//                     </h6>
//                 </Card.Header>
//                 <Card.Body className="p-0">
//                     <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
//                         <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.8rem' }}>
//                             <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
//                                 <tr>
//                                     <th style={{ width: '35px' }}>#</th>
//                                     <th style={{ width: '45px' }}>Select</th>
//                                     <th>Item Name</th>
//                                     <th>Category</th>
//                                     <th style={{ width: '90px' }}>Closing Stock</th>
//                                     <th style={{ width: '110px' }}>Opening Stock</th>
//                                     <th style={{ width: '100px' }}>Purchase Price</th>
//                                     <th style={{ width: '100px' }}>Sales Price</th>
//                                     <th style={{ width: '110px' }}>Stock Value</th>
//                                     <th style={{ width: '80px' }}>Status</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {filteredItems.length > 0 ? (
//                                     filteredItems.map((item, index) => {
//                                         // Calculate stock value based on opening stock and purchase price
//                                         const calculatedValue = item.openingStock * (item.averagePurchaseRate || 0);
//                                         const displayValue = item.openingStockValue || calculatedValue;

//                                         return (
//                                             <tr key={item.itemId} className={!item.isSelected ? 'opacity-50' : ''}>
//                                                 <td>{index + 1}</td>
//                                                 <td>
//                                                     <Form.Check
//                                                         type="checkbox"
//                                                         checked={item.isSelected}
//                                                         onChange={() => toggleItemSelection(item.itemId)}
//                                                     />
//                                                 </td>
//                                                 <td>
//                                                     <strong>{item.itemName}</strong>
//                                                     {item.isNew && (
//                                                         <Badge bg="success" className="ms-1" style={{ fontSize: '0.6rem' }}>
//                                                             New
//                                                         </Badge>
//                                                     )}
//                                                     {item.isChanged && (
//                                                         <Badge bg="warning" className="ms-1" style={{ fontSize: '0.6rem' }}>
//                                                             Changed
//                                                         </Badge>
//                                                     )}
//                                                 </td>
//                                                 <td>{item.categoryName}</td>
//                                                 <td>{item.closingStock}</td>
//                                                 <td>
//                                                     <Form.Control
//                                                         type="number"
//                                                         size="sm"
//                                                         value={item.openingStock}
//                                                         onChange={(e) => {
//                                                             const newStock = parseFloat(e.target.value) || 0;
//                                                             // Auto-calculate stock value using purchase price
//                                                             const newValue = newStock * (item.averagePurchaseRate || 0);
//                                                             handleItemStockChange(item.itemId, 'openingStock', e.target.value);
//                                                             handleItemStockChange(item.itemId, 'openingStockValue', newValue);
//                                                         }}
//                                                         disabled={!item.isSelected}
//                                                         style={{ width: '100px' }}
//                                                     />
//                                                 </td>
//                                                 <td>
//                                                     <span className="fw-bold text-primary">
//                                                         Rs. {(item.averagePurchaseRate || 0).toFixed(2)}
//                                                     </span>
//                                                     <small className="d-block text-muted" style={{ fontSize: '0.6rem' }}>
//                                                         <FaDollarSign className="me-1" />
//                                                         Avg. Purchase
//                                                     </small>
//                                                 </td>
//                                                 <td>
//                                                     <span className="fw-bold text-success">
//                                                         Rs. {(item.averageSalesRate || 0).toFixed(2)}
//                                                     </span>
//                                                     <small className="d-block text-muted" style={{ fontSize: '0.6rem' }}>
//                                                         <FaShoppingCart className="me-1" />
//                                                         Avg. Sales
//                                                     </small>
//                                                 </td>
//                                                 <td>
//                                                     <Form.Control
//                                                         type="number"
//                                                         size="sm"
//                                                         value={displayValue}
//                                                         onChange={(e) => {
//                                                             const newValue = parseFloat(e.target.value) || 0;
//                                                             handleItemStockChange(item.itemId, 'openingStockValue', e.target.value);
//                                                             // Auto-calculate stock quantity using purchase price
//                                                             const newStock = item.averagePurchaseRate > 0 ? newValue / item.averagePurchaseRate : 0;
//                                                             handleItemStockChange(item.itemId, 'openingStock', newStock);
//                                                         }}
//                                                         disabled={!item.isSelected}
//                                                         style={{ width: '100px' }}
//                                                     />
//                                                 </td>
//                                                 <td>
//                                                     {item.isNew && <Badge bg="success" className="me-1">New</Badge>}
//                                                     {item.isChanged && <Badge bg="warning">Changed</Badge>}
//                                                     {!item.isNew && !item.isChanged && <Badge bg="secondary">Existing</Badge>}
//                                                 </td>
//                                             </tr>
//                                         );
//                                     })
//                                 ) : (
//                                     <tr>
//                                         <td colSpan="10" className="text-center py-3 text-muted">
//                                             No items found for the selected filter
//                                         </td>
//                                     </tr>
//                                 )}
//                             </tbody>
//                         </table>
//                     </div>
//                 </Card.Body>
//             </Card>

//             {/* Action Buttons */}
//             <div className="d-flex justify-content-end gap-2 mb-4">
//                 <Button 
//                     variant="secondary"
//                     onClick={() => navigate('/list-of-existing/fiscalYears')}
//                     disabled={saving}
//                 >
//                     <FaTimes className="me-2" />
//                     Cancel
//                 </Button>
//                 <Button 
//                     variant="success"
//                     onClick={handleSaveAndFinalize}
//                     disabled={saving || (filteredAccounts.filter(a => a.isSelected).length === 0 && filteredItems.filter(i => i.isSelected).length === 0)}
//                 >
//                     <FaSave className="me-2" />
//                     Save & Finalize
//                 </Button>
//             </div>

//             <NotificationToast
//                 show={notification.show}
//                 message={notification.message}
//                 type={notification.type}
//                 duration={notification.duration}
//                 onClose={() => setNotification({ ...notification, show: false })}
//             />
//         </div>
//     );
// };

// export default UpdateBalancesPage;

//-----------------------------------------------end1

// UpdateBalancesPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Container, Row, Col, Card, Table, Form, Button,
    Alert, Spinner, Badge, Modal, ProgressBar
} from 'react-bootstrap';
import {
    FaEdit, FaSave, FaTimes, FaCheck, FaInfoCircle,
    FaExchangeAlt, FaArrowLeft, FaPlus, FaTrash,
    FaExclamationTriangle, FaClipboardList, FaMoneyBillWave,
    FaWarehouse, FaShoppingCart, FaDollarSign
} from 'react-icons/fa';
import Header from '../retailer/Header';
import NotificationToast from '../NotificationToast';
import api from '../services/api';

const UpdateBalancesPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { sourceFiscalYearId, targetFiscalYearId, carryType } = location.state || {};

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [accountBalances, setAccountBalances] = useState([]);
    const [itemStocks, setItemStocks] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });
    const [editingAccount, setEditingAccount] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [progress, setProgress] = useState(0);
    const [filterType, setFilterType] = useState('all'); // all, new, changed
    const [totalStockValue, setTotalStockValue] = useState(0);

    useEffect(() => {
        if (!sourceFiscalYearId || !targetFiscalYearId || !carryType) {
            setNotification({
                show: true,
                message: 'Missing required parameters. Please try again.',
                type: 'error',
                duration: 5000
            });
            setTimeout(() => navigate('/list-of-existing/fiscalYears'), 2000);
            return;
        }
        fetchUpdateableBalances();
    }, [sourceFiscalYearId, targetFiscalYearId, carryType]);

    const fetchUpdateableBalances = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/FiscalYears/get-updateable-balances', {
                params: {
                    sourceFiscalYearId,
                    targetFiscalYearId,
                    carryType
                }
            });

            if (response.data.success) {
                const responseData = response.data.data;
                setData(responseData);
                setAccountBalances(responseData.accountBalances || []);
                setItemStocks(responseData.itemStocks || []);

                // Calculate total stock value from selected items only
                const totalStock = (responseData.itemStocks || [])
                    .filter(item => item.isSelected)
                    .reduce((sum, item) => sum + (item.openingStockValue || 0), 0);
                setTotalStockValue(totalStock);
            } else {
                throw new Error(response.data.message || 'Failed to fetch balances');
            }
        } catch (err) {
            console.error('Error fetching balances:', err);
            setNotification({
                show: true,
                message: err.response?.data?.message || err.message || 'Failed to fetch balances',
                type: 'error',
                duration: 5000
            });
        } finally {
            setLoading(false);
        }
    };

    // Check if account is Stock in Hand
    const isStockInHandAccount = (account) => {
        return account.accountGroupName === "Stock in Hand" ||
            account.accountName === "Stock in Hand";
    };

    const handleAccountBalanceChange = (accountId, newBalance) => {
        setAccountBalances(prev => prev.map(acc => {
            // Don't allow manual editing of Stock in Hand account
            if (isStockInHandAccount(acc)) {
                return acc;
            }
            return acc.accountId === accountId
                ? { ...acc, updatedBalance: parseFloat(newBalance) || 0 }
                : acc;
        }));
    };

    const handleItemStockChange = (itemId, field, value) => {
        const newValue = parseFloat(value) || 0;

        setItemStocks(prev => {
            const updated = prev.map(item => {
                if (item.itemId === itemId) {
                    const updatedItem = { ...item, [field]: newValue };

                    // If opening stock or opening stock value changes, auto-calculate the other
                    if (field === 'openingStock' && item.averagePurchaseRate > 0) {
                        updatedItem.openingStockValue = newValue * item.averagePurchaseRate;
                    } else if (field === 'openingStockValue' && item.averagePurchaseRate > 0) {
                        updatedItem.openingStock = newValue / item.averagePurchaseRate;
                    }

                    return updatedItem;
                }
                return item;
            });

            // Recalculate total stock value from selected items only
            const newTotalStock = updated
                .filter(item => item.isSelected)
                .reduce((sum, item) => sum + (item.openingStockValue || 0), 0);
            setTotalStockValue(newTotalStock);

            // Update Stock in Hand account balance
            setAccountBalances(prevAccounts =>
                prevAccounts.map(acc => {
                    if (isStockInHandAccount(acc)) {
                        return {
                            ...acc,
                            updatedBalance: newTotalStock,
                            currentBalance: newTotalStock,
                            isSelected: true
                        };
                    }
                    return acc;
                })
            );

            return updated;
        });
    };

    const toggleAccountSelection = (accountId) => {
        setAccountBalances(prev => prev.map(acc => {
            // Don't allow deselecting Stock in Hand account
            if (isStockInHandAccount(acc)) {
                return acc;
            }
            return acc.accountId === accountId
                ? { ...acc, isSelected: !acc.isSelected }
                : acc;
        }));
    };

    const toggleItemSelection = (itemId) => {
        setItemStocks(prev => {
            const updated = prev.map(item =>
                item.itemId === itemId
                    ? { ...item, isSelected: !item.isSelected }
                    : item
            );

            // Recalculate total stock value from selected items only
            const newTotalStock = updated
                .filter(item => item.isSelected)
                .reduce((sum, item) => sum + (item.openingStockValue || 0), 0);
            setTotalStockValue(newTotalStock);

            // Update Stock in Hand account balance
            setAccountBalances(prevAccounts =>
                prevAccounts.map(acc => {
                    if (isStockInHandAccount(acc)) {
                        return {
                            ...acc,
                            updatedBalance: newTotalStock,
                            currentBalance: newTotalStock,
                            isSelected: true
                        };
                    }
                    return acc;
                })
            );

            return updated;
        });
    };

    const selectAllAccounts = (selected) => {
        setAccountBalances(prev => prev.map(acc => {
            // Keep Stock in Hand always selected
            if (isStockInHandAccount(acc)) {
                return { ...acc, isSelected: true };
            }
            return { ...acc, isSelected: selected };
        }));
    };

    const selectAllItems = (selected) => {
        setItemStocks(prev => {
            const updated = prev.map(item => ({ ...item, isSelected: selected }));

            // Recalculate total stock value from selected items only
            const newTotalStock = updated
                .filter(item => item.isSelected)
                .reduce((sum, item) => sum + (item.openingStockValue || 0), 0);
            setTotalStockValue(newTotalStock);

            // Update Stock in Hand account balance
            setAccountBalances(prevAccounts =>
                prevAccounts.map(acc => {
                    if (isStockInHandAccount(acc)) {
                        return {
                            ...acc,
                            updatedBalance: newTotalStock,
                            currentBalance: newTotalStock,
                            isSelected: true
                        };
                    }
                    return acc;
                })
            );

            return updated;
        });
    };

    const getFilteredAccounts = () => {
        if (filterType === 'all') return accountBalances;
        if (filterType === 'new') return accountBalances.filter(a => a.isNew);
        if (filterType === 'changed') return accountBalances.filter(a => a.isChanged);
        return accountBalances;
    };

    const getFilteredItems = () => {
        if (filterType === 'all') return itemStocks;
        if (filterType === 'new') return itemStocks.filter(i => i.isNew);
        if (filterType === 'changed') return itemStocks.filter(i => i.isChanged);
        return itemStocks;
    };

    const handleSaveAndFinalize = async () => {
        // Validate that stock in hand balance matches total stock value
        const stockInHandAccount = accountBalances.find(a => isStockInHandAccount(a));
        if (stockInHandAccount && Math.abs(stockInHandAccount.updatedBalance - totalStockValue) > 0.01) {
            setNotification({
                show: true,
                message: 'Stock in Hand balance does not match total stock value. Please check your entries.',
                type: 'error',
                duration: 5000
            });
            return;
        }
        setShowConfirmModal(true);
    };

    // const confirmFinalize = async () => {
    //     setShowConfirmModal(false);
    //     setSaving(true);
    //     setProgress(0);

    //     try {
    //         const progressInterval = setInterval(() => {
    //             setProgress(prev => Math.min(prev + 10, 90));
    //         }, 300);

    //         const requestData = {
    //             sourceFiscalYearId,
    //             targetFiscalYearId,
    //             carryType,
    //             updatedAccounts: accountBalances.map(acc => ({
    //                 accountId: acc.accountId,
    //                 newBalance: isStockInHandAccount(acc) ? totalStockValue : acc.updatedBalance,
    //                 balanceType: isStockInHandAccount(acc) ? 'Dr' : acc.balanceType,
    //                 isSelected: isStockInHandAccount(acc) ? true : acc.isSelected
    //             })),
    //             updatedItems: itemStocks.map(item => ({
    //                 itemId: item.itemId,
    //                 openingStock: item.openingStock,
    //                 openingStockValue: item.openingStockValue,
    //                 isSelected: item.isSelected
    //             })),
    //             transferDate: new Date().toISOString().split('T')[0],
    //             transferDateNepali: new Date().toLocaleDateString('ne-NP'),
    //             finalizeTransfer: true
    //         };

    //         const response = await api.post('/api/FiscalYears/update-and-finalize', requestData);

    //         clearInterval(progressInterval);
    //         setProgress(100);

    //         if (response.data.success) {
    //             setNotification({
    //                 show: true,
    //                 message: 'Balances updated and finalized successfully!',
    //                 type: 'success',
    //                 duration: 5000
    //             });

    //             setTimeout(() => {
    //                 navigate('/list-of-existing/fiscalYears');
    //             }, 3000);
    //         } else {
    //             throw new Error(response.data.message || 'Failed to finalize balances');
    //         }
    //     } catch (err) {
    //         console.error('Error finalizing:', err);
    //         setNotification({
    //             show: true,
    //             message: err.response?.data?.message || err.message || 'Failed to finalize balances',
    //             type: 'error',
    //             duration: 5000
    //         });
    //     } finally {
    //         setSaving(false);
    //         setTimeout(() => setProgress(0), 500);
    //     }
    // };

    const confirmFinalize = async () => {
        setShowConfirmModal(false);
        setSaving(true);
        setProgress(0);

        try {
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 300);

            const requestData = {
                sourceFiscalYearId,
                targetFiscalYearId,
                carryType,
                updatedAccounts: accountBalances.map(acc => ({
                    accountId: acc.accountId,
                    newBalance: isStockInHandAccount(acc) ? totalStockValue : acc.updatedBalance,
                    balanceType: isStockInHandAccount(acc) ? 'Dr' : acc.balanceType,
                    isSelected: isStockInHandAccount(acc) ? true : acc.isSelected
                })),
                updatedItems: itemStocks.map(item => ({
                    itemId: item.itemId,
                    openingStock: item.openingStock,
                    openingStockValue: item.openingStockValue,
                    purchasePrice: item.averagePurchaseRate || 0,  // ✅ Send purchase price
                    salesPrice: item.averageSalesRate || 0,        // ✅ Send sales price
                    isSelected: item.isSelected
                })),
                transferDate: new Date().toISOString().split('T')[0],
                transferDateNepali: new Date().toLocaleDateString('ne-NP'),
                finalizeTransfer: true
            };

            const response = await api.post('/api/FiscalYears/update-and-finalize', requestData);

            clearInterval(progressInterval);
            setProgress(100);

            if (response.data.success) {
                setNotification({
                    show: true,
                    message: 'Balances updated and finalized successfully!',
                    type: 'success',
                    duration: 5000
                });

                setTimeout(() => {
                    navigate('/list-of-existing/fiscalYears');
                }, 3000);
            } else {
                throw new Error(response.data.message || 'Failed to finalize balances');
            }
        } catch (err) {
            console.error('Error finalizing:', err);
            setNotification({
                show: true,
                message: err.response?.data?.message || err.message || 'Failed to finalize balances',
                type: 'error',
                duration: 5000
            });
        } finally {
            setSaving(false);
            setTimeout(() => setProgress(0), 500);
        }
    };

    if (loading) {
        return (
            <>
                <Header />
                <Container className="mt-5 text-center">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Loading balances...</p>
                </Container>
            </>
        );
    }

    const filteredAccounts = getFilteredAccounts();
    const filteredItems = getFilteredItems();
    const totalSelectedAccounts = filteredAccounts.filter(a => a.isSelected).length;
    const totalSelectedItems = filteredItems.filter(i => i.isSelected).length;

    return (
        <div className="container-fluid">
            <Header />

            {/* Confirm Modal */}
            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered size="lg">
                <Modal.Header closeButton className="bg-warning text-dark border-0">
                    <Modal.Title className="d-flex align-items-center">
                        <FaExclamationTriangle className="me-2" />
                        Confirm Finalize
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Alert variant="info">
                        <FaInfoCircle className="me-2" />
                        <strong>You are about to finalize the fiscal year transition.</strong>
                    </Alert>

                    <p>This will:</p>
                    <ul>
                        <li>Update opening balances for <strong>{totalSelectedAccounts}</strong> accounts</li>
                        <li>Update opening stocks for <strong>{totalSelectedItems}</strong> items</li>
                        <li>Create opening balance transaction</li>
                        <li>Activate the new fiscal year: <strong>{data?.targetFiscalYearName}</strong></li>
                    </ul>

                    <Alert variant="warning" className="py-1 small">
                        <FaExclamationTriangle className="me-1" />
                        This action cannot be undone. Please review all balances carefully.
                    </Alert>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={confirmFinalize} disabled={saving}>
                        {saving ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <FaSave className="me-2" />
                                Finalize
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Progress Bar */}
            {saving && (
                <div className="mb-3">
                    <ProgressBar
                        now={progress}
                        label={`${progress}%`}
                        animated={progress < 100}
                        variant={progress === 100 ? 'success' : 'primary'}
                        style={{ height: '25px' }}
                    />
                    <p className="text-muted small text-center mt-1">
                        {progress < 100 ? 'Updating balances...' : 'Complete!'}
                    </p>
                </div>
            )}

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                <div>
                    <h4 className="mb-0">
                        <FaEdit className="me-2 text-primary" />
                        Update Fiscal Year Balances
                    </h4>
                    <small className="text-muted">
                        <FaExchangeAlt className="me-1" />
                        {data?.sourceFiscalYearName} → {data?.targetFiscalYearName}
                        <Badge bg="info" className="ms-2">
                            {carryType === 'All' ? 'All Masters' : 'New & Changed'}
                        </Badge>
                    </small>
                </div>
                <div>
                    <Button
                        variant="outline-secondary"
                        onClick={() => navigate('/list-of-existing/fiscalYears')}
                        className="me-2"
                    >
                        <FaArrowLeft className="me-2" />
                        Back
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <Row className="mb-3">
                <Col md={3}>
                    <Card className="text-center">
                        <Card.Body className="py-2">
                            <h6 className="mb-0">Total Accounts</h6>
                            <h3 className="mb-0">{data?.summary?.totalAccounts || 0}</h3>
                            <small className="text-muted">
                                Selected: {totalSelectedAccounts}
                            </small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center">
                        <Card.Body className="py-2">
                            <h6 className="mb-0">Total Items</h6>
                            <h3 className="mb-0">{data?.summary?.totalItems || 0}</h3>
                            <small className="text-muted">
                                Selected: {totalSelectedItems}
                            </small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center">
                        <Card.Body className="py-2">
                            <h6 className="mb-0">Total Stock Value</h6>
                            <h3 className="mb-0 text-primary">Rs. {totalStockValue.toLocaleString()}</h3>
                            <small className="text-muted">
                                Auto-calculated from selected items
                            </small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center">
                        <Card.Body className="py-2">
                            <h6 className="mb-0">Total Balance</h6>
                            <h3 className="mb-0 text-success">Rs. {(data?.summary?.totalDebitBalance || 0).toLocaleString()}</h3>
                            <small className="text-muted">
                                Including Stock in Hand
                            </small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Filter Controls */}
            <Row className="mb-3">
                <Col md={4}>
                    <Form.Group>
                        <Form.Label className="small fw-bold">Filter Type</Form.Label>
                        <Form.Select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            size="sm"
                        >
                            <option value="all">All Items</option>
                            <option value="new">New Items</option>
                            <option value="changed">Changed Items</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={8} className="d-flex align-items-end">
                    <div className="d-flex gap-2 flex-wrap">
                        <Button
                            size="sm"
                            variant="outline-success"
                            onClick={() => selectAllAccounts(true)}
                        >
                            Select All Accounts
                        </Button>
                        <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => selectAllAccounts(false)}
                        >
                            Deselect All
                        </Button>
                        <Button
                            size="sm"
                            variant="outline-info"
                            onClick={() => selectAllItems(true)}
                        >
                            Select All Items
                        </Button>
                        <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => selectAllItems(false)}
                        >
                            Deselect All Items
                        </Button>
                    </div>
                </Col>
            </Row>

            {/* Account Balances Table */}
            <Card className="mb-3">
                <Card.Header className="bg-primary text-white py-1">
                    <h6 className="mb-0">
                        <FaMoneyBillWave className="me-2" />
                        Account Balances
                        <Badge bg="light" text="dark" className="ms-2">
                            {filteredAccounts.length} accounts
                        </Badge>
                    </h6>
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
                        <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.8rem' }}>
                            <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={{ width: '40px' }}>#</th>
                                    <th style={{ width: '50px' }}>Select</th>
                                    <th>Account Name</th>
                                    <th>Group</th>
                                    <th style={{ width: '120px' }}>Current Balance</th>
                                    <th style={{ width: '120px' }}>Opening Balance</th>
                                    <th style={{ width: '60px' }}>Dr/Cr</th>
                                    <th style={{ width: '80px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAccounts.length > 0 ? (
                                    filteredAccounts.map((account, index) => {
                                        const isStockInHand = isStockInHandAccount(account);
                                        return (
                                            <tr
                                                key={account.accountId}
                                                className={`${!account.isSelected ? 'opacity-50' : ''} ${isStockInHand ? 'table-info' : ''}`}
                                            >
                                                <td>{index + 1}</td>
                                                <td>
                                                    <Form.Check
                                                        type="checkbox"
                                                        checked={account.isSelected}
                                                        onChange={() => toggleAccountSelection(account.accountId)}
                                                        disabled={isStockInHand}
                                                        title={isStockInHand ? "Stock in Hand is mandatory" : ""}
                                                    />
                                                </td>
                                                <td>
                                                    <strong>{account.accountName}</strong>
                                                    {isStockInHand && (
                                                        <Badge bg="info" className="ms-1" style={{ fontSize: '0.6rem' }}>
                                                            <FaWarehouse className="me-1" /> Stock Account
                                                        </Badge>
                                                    )}
                                                    {account.isNew && !isStockInHand && (
                                                        <Badge bg="success" className="ms-1" style={{ fontSize: '0.6rem' }}>
                                                            New
                                                        </Badge>
                                                    )}
                                                    {account.isChanged && !isStockInHand && (
                                                        <Badge bg="warning" className="ms-1" style={{ fontSize: '0.6rem' }}>
                                                            Changed
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td>{account.accountGroupName}</td>
                                                <td>
                                                    {isStockInHand ? (
                                                        <span className="fw-bold text-primary">
                                                            Rs. {totalStockValue.toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        `Rs. ${account.currentBalance.toLocaleString()}`
                                                    )}
                                                </td>
                                                <td>
                                                    {isStockInHand ? (
                                                        <span className="fw-bold text-primary">
                                                            Rs. {totalStockValue.toLocaleString()}
                                                            <small className="d-block text-muted" style={{ fontSize: '0.6rem' }}>
                                                                Auto-calculated
                                                            </small>
                                                        </span>
                                                    ) : (
                                                        <Form.Control
                                                            type="number"
                                                            size="sm"
                                                            value={account.updatedBalance}
                                                            onChange={(e) => handleAccountBalanceChange(account.accountId, e.target.value)}
                                                            disabled={!account.isSelected}
                                                            style={{ width: '120px' }}
                                                        />
                                                    )}
                                                </td>
                                                <td>
                                                    <Badge bg={account.balanceType === 'Dr' ? 'success' : 'danger'}>
                                                        {account.balanceType}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    {isStockInHand && <Badge bg="info">Stock</Badge>}
                                                    {account.isNew && !isStockInHand && <Badge bg="success" className="me-1">New</Badge>}
                                                    {account.isChanged && !isStockInHand && <Badge bg="warning">Changed</Badge>}
                                                    {!account.isNew && !account.isChanged && !isStockInHand && <Badge bg="secondary">Existing</Badge>}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="text-center py-3 text-muted">
                                            No accounts found for the selected filter
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card.Body>
            </Card>

            {/* Item Stocks Table - Only shows when there are items */}
            {filteredItems.length > 0 && (
                <Card className="mb-3">
                    <Card.Header className="bg-success text-white py-1">
                        <h6 className="mb-0">
                            <FaClipboardList className="me-2" />
                            Item Opening Stocks
                            <Badge bg="light" text="dark" className="ms-2">
                                {filteredItems.length} items
                            </Badge>
                            <Badge bg="info" text="dark" className="ms-2">
                                Total Value: Rs. {totalStockValue.toLocaleString()}
                            </Badge>
                            {/* Show summary of new/changed items */}
                            {carryType === 'NewAndChanged' && (
                                <>
                                    <Badge bg="success" text="dark" className="ms-2">
                                        New: {filteredItems.filter(i => i.isNew).length}
                                    </Badge>
                                    <Badge bg="warning" text="dark" className="ms-2">
                                        Changed: {filteredItems.filter(i => i.isChanged).length}
                                    </Badge>
                                </>
                            )}
                        </h6>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
                            <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.8rem' }}>
                                <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                    <tr>
                                        <th style={{ width: '35px' }}>#</th>
                                        <th style={{ width: '45px' }}>Select</th>
                                        <th>Item Name</th>
                                        <th>Category</th>
                                        <th style={{ width: '90px' }}>Closing Stock</th>
                                        <th style={{ width: '110px' }}>Opening Stock</th>
                                        <th style={{ width: '100px' }}>Purchase Price</th>
                                        <th style={{ width: '100px' }}>Sales Price</th>
                                        <th style={{ width: '110px' }}>Stock Value</th>
                                        <th style={{ width: '80px' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item, index) => {
                                        // Calculate stock value based on opening stock and purchase price
                                        const calculatedValue = item.openingStock * (item.averagePurchaseRate || 0);
                                        const displayValue = item.openingStockValue || calculatedValue;

                                        return (
                                            <tr
                                                key={item.itemId}
                                                className={`${!item.isSelected ? 'opacity-50' : ''} ${item.isChanged ? 'table-warning' : ''} ${item.isNew ? 'table-success' : ''}`}
                                            >
                                                <td>{index + 1}</td>
                                                <td>
                                                    <Form.Check
                                                        type="checkbox"
                                                        checked={item.isSelected}
                                                        onChange={() => toggleItemSelection(item.itemId)}
                                                    />
                                                </td>
                                                <td>
                                                    <strong>{item.itemName}</strong>
                                                    {item.isNew && (
                                                        <Badge bg="success" className="ms-1" style={{ fontSize: '0.6rem' }}>
                                                            New
                                                        </Badge>
                                                    )}
                                                    {item.isChanged && (
                                                        <Badge bg="warning" className="ms-1" style={{ fontSize: '0.6rem' }}>
                                                            Changed
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td>{item.categoryName}</td>
                                                <td>{item.closingStock}</td>
                                                <td>
                                                    <Form.Control
                                                        type="number"
                                                        size="sm"
                                                        value={item.openingStock}
                                                        onChange={(e) => {
                                                            const newStock = parseFloat(e.target.value) || 0;
                                                            // Auto-calculate stock value using purchase price
                                                            const newValue = newStock * (item.averagePurchaseRate || 0);
                                                            handleItemStockChange(item.itemId, 'openingStock', e.target.value);
                                                            handleItemStockChange(item.itemId, 'openingStockValue', newValue);
                                                        }}
                                                        disabled={!item.isSelected}
                                                        style={{ width: '100px' }}
                                                    />
                                                </td>
                                                <td>
                                                    <span className="fw-bold text-primary">
                                                        Rs. {(item.averagePurchaseRate || 0).toFixed(2)}
                                                    </span>
                                                    <small className="d-block text-muted" style={{ fontSize: '0.6rem' }}>
                                                        <FaDollarSign className="me-1" />
                                                        Avg. Purchase
                                                    </small>
                                                </td>
                                                <td>
                                                    <span className="fw-bold text-success">
                                                        Rs. {(item.averageSalesRate || 0).toFixed(2)}
                                                    </span>
                                                    <small className="d-block text-muted" style={{ fontSize: '0.6rem' }}>
                                                        <FaShoppingCart className="me-1" />
                                                        Avg. Sales
                                                    </small>
                                                </td>
                                                <td>
                                                    <Form.Control
                                                        type="number"
                                                        size="sm"
                                                        value={displayValue}
                                                        onChange={(e) => {
                                                            const newValue = parseFloat(e.target.value) || 0;
                                                            handleItemStockChange(item.itemId, 'openingStockValue', e.target.value);
                                                            // Auto-calculate stock quantity using purchase price
                                                            const newStock = item.averagePurchaseRate > 0 ? newValue / item.averagePurchaseRate : 0;
                                                            handleItemStockChange(item.itemId, 'openingStock', newStock);
                                                        }}
                                                        disabled={!item.isSelected}
                                                        style={{ width: '100px' }}
                                                    />
                                                </td>
                                                <td>
                                                    {item.isNew && <Badge bg="success" className="me-1">New</Badge>}
                                                    {item.isChanged && <Badge bg="warning">Changed</Badge>}
                                                    {!item.isNew && !item.isChanged && <Badge bg="secondary">Existing</Badge>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* Show message when no items to update in NewAndChanged mode */}
            {carryType === 'NewAndChanged' && filteredItems.length === 0 && (
                <Alert variant="info" className="mb-3">
                    <FaInfoCircle className="me-2" />
                    No items have been added or changed in this fiscal year. Only accounts with changes are shown.
                </Alert>
            )}

            {/* Action Buttons */}
            <div className="d-flex justify-content-end gap-2 mb-4">
                <Button
                    variant="secondary"
                    onClick={() => navigate('/list-of-existing/fiscalYears')}
                    disabled={saving}
                >
                    <FaTimes className="me-2" />
                    Cancel
                </Button>
                <Button
                    variant="success"
                    onClick={handleSaveAndFinalize}
                    disabled={saving || (filteredAccounts.filter(a => a.isSelected).length === 0 && filteredItems.filter(i => i.isSelected).length === 0)}
                >
                    <FaSave className="me-2" />
                    Save & Finalize
                </Button>
            </div>

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                duration={notification.duration}
                onClose={() => setNotification({ ...notification, show: false })}
            />
        </div>
    );
};

export default UpdateBalancesPage;