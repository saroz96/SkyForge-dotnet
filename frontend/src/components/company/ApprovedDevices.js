import React, { useState, useEffect, useCallback } from 'react';
import {
    Container,
    Card,
    Table,
    Badge,
    Button,
    Spinner,
    Alert,
    Modal,
    Form,
} from 'react-bootstrap';
import DashboardLayout from './DashboardLayout';
import { useSelector } from 'react-redux';
import api from '../services/api';

const ApprovedDevices = () => {
    const { userInfo } = useSelector((state) => state.auth);

    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Action modal state
    const [actionModal, setActionModal] = useState({
        show: false,
        deviceId: null,
        deviceInfo: null,
        action: null, // 'block' | 'revoke'
    });
    const [actionReason, setActionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // --------------------------------------------------------
    // Determine admin type
    // --------------------------------------------------------
    const isSystemAdmin = userInfo?.isSystemAdmin === true;
    const isClientAdmin = userInfo?.isClientAdmin === true && !isSystemAdmin;
    const isAnyAdmin =
        isSystemAdmin ||
        isClientAdmin ||
        userInfo?.isAdmin ||
        userInfo?.role === 'Admin' ||
        userInfo?.role === 'Administrator';

    // --------------------------------------------------------
    // Endpoint routing
    // --------------------------------------------------------
    const baseEndpoint = isSystemAdmin
        ? '/api/device/admin'
        : '/api/client-device';

    // --------------------------------------------------------
    // Fetch approved devices
    // --------------------------------------------------------
    const fetchApprovedDevices = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const endpoint = isSystemAdmin
                ? '/api/device/admin/all'
                : '/api/client-device/all';

            const response = await api.get(endpoint, {
                params: { status: 'Approved' },
            });

            if (response.data.success) {
                setDevices(response.data.devices || []);
            } else {
                throw new Error(response.data.error || 'Failed to fetch devices');
            }
        } catch (err) {
            console.error('Fetch approved devices error:', err);
            setError(err.response?.data?.error || err.message || 'Failed to load devices');
        } finally {
            setLoading(false);
        }
    }, [isSystemAdmin]);

    useEffect(() => {
        fetchApprovedDevices();
    }, [fetchApprovedDevices]);

    // --------------------------------------------------------
    // Toast auto-dismiss
    // --------------------------------------------------------
    useEffect(() => {
        if (toast.show) {
            const t = setTimeout(() => setToast({ ...toast, show: false }), 3500);
            return () => clearTimeout(t);
        }
    }, [toast]);

    // --------------------------------------------------------
    // Open action modal
    // --------------------------------------------------------
    const openActionModal = (device, action) => {
        setActionModal({
            show: true,
            deviceId: device.id,
            deviceInfo: device,
            action,
        });
        setActionReason('');
    };

    const closeActionModal = () => {
        setActionModal({ show: false, deviceId: null, deviceInfo: null, action: null });
        setActionReason('');
    };

    // --------------------------------------------------------
    // Submit block / revoke
    // --------------------------------------------------------
    const handleSubmitAction = async () => {
        const { deviceId, action } = actionModal;
        if (!deviceId || !action) return;

        if (!actionReason.trim()) {
            setToast({ show: true, message: 'Please provide a reason.', type: 'error' });
            return;
        }

        setSubmitting(true);

        try {
            // 🎯 Route to correct endpoint based on admin type + action
            // Client admin → /api/client-device/{id}/block or /revoke
            // System admin → /api/device/admin/{id}/block or /revoke
            const url = `${baseEndpoint}/${deviceId}/${action}`;
            const payload = { reason: actionReason.trim() };

            const response = await api.post(url, payload);

            if (response.data.success) {
                setToast({
                    show: true,
                    message: response.data.message || `Device ${action}d successfully.`,
                    type: 'success',
                });
                closeActionModal();
                fetchApprovedDevices();
            } else {
                throw new Error(response.data.error || `Failed to ${action} device`);
            }
        } catch (err) {
            console.error(`Action ${action} error:`, err);
            setToast({
                show: true,
                message: err.response?.data?.error || err.message || `Failed to ${action} device`,
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    // --------------------------------------------------------
    // Helpers
    // --------------------------------------------------------
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString();
    };

    const getActionTitle = (action) => {
        if (action === 'block') return 'Block Device';
        if (action === 'revoke') return 'Remove Device';
        return 'Action';
    };

    const getActionColor = (action) => {
        if (action === 'block') return '#c53030';
        if (action === 'revoke') return '#718096';
        return '#2a4d7a';
    };

    const actionConfig = {
        block: { title: 'Block Device', color: '#c53030', confirmLabel: 'Block' },
        revoke: { title: 'Remove Device', color: '#718096', confirmLabel: 'Remove' },
    };

    // --------------------------------------------------------
    // Render
    // --------------------------------------------------------
    return (
        <DashboardLayout user={userInfo} isAdminOrSupervisor={isAnyAdmin}>
            <Container className="dashboard-container">
                <Card className="dashboard-card">
                    <Card.Header style={{ padding: '14px 20px' }}>
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '4px' }}>
                                    <i className="fas fa-shield-alt me-2" style={{ color: '#2a4d7a' }}></i>
                                    Approved Devices
                                </h3>
                            </div>
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={fetchApprovedDevices}
                                disabled={loading}
                            >
                                <i className={`fas fa-sync-alt me-1 ${loading ? 'fa-spin' : ''}`}></i>
                                Refresh
                            </Button>
                        </div>
                    </Card.Header>

                    <Card.Body style={{ padding: '16px 20px' }}>

                        {error && (
                            <Alert variant="danger" dismissible onClose={() => setError('')}>
                                <i className="fas fa-exclamation-circle me-2"></i>
                                {error}
                            </Alert>
                        )}

                        {loading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="primary" />
                                <p className="mt-3 text-muted">Loading approved devices...</p>
                            </div>
                        ) : devices.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                                <h5 className="text-muted">No approved devices yet</h5>
                                <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                                    Once devices are approved, they'll appear here.
                                </p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <Table hover responsive size="sm" className="mb-0">
                                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                                        <tr>
                                            <th style={{ fontSize: '0.8rem', fontWeight: 600 }}>#</th>
                                            <th style={{ fontSize: '0.8rem', fontWeight: 600 }}>User</th>
                                            <th style={{ fontSize: '0.8rem', fontWeight: 600 }}>Role</th>
                                            <th style={{ fontSize: '0.8rem', fontWeight: 600 }}>Device</th>
                                            <th style={{ fontSize: '0.8rem', fontWeight: 600 }}>OS / Browser</th>
                                            <th style={{ fontSize: '0.8rem', fontWeight: 600 }}>IP</th>
                                            <th style={{ fontSize: '0.8rem', fontWeight: 600 }}>Approved On</th>
                                            <th style={{ fontSize: '0.8rem', fontWeight: 600 }}>Last Used</th>
                                            <th style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'end' }}>
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {devices.map((d, index) => (
                                            <tr key={d.id}>
                                                <td style={{ fontSize: '0.85rem' }}>{index + 1}</td>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                                                        {d.userName || 'Unknown'}
                                                    </div>
                                                    <div style={{ color: '#718096', fontSize: '0.78rem' }}>
                                                        {d.userEmail}
                                                    </div>
                                                </td>
                                                <td>
                                                    <Badge
                                                        bg={d.userRole === 'Administrator' ? 'danger' : 'secondary'}
                                                        style={{ fontSize: '0.72rem' }}
                                                    >
                                                        {d.userRole || 'User'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>
                                                        {d.deviceName || 'Unnamed Device'}
                                                    </div>
                                                    <div
                                                        style={{
                                                            color: '#a0aec0',
                                                            fontSize: '0.72rem',
                                                            fontFamily: 'monospace',
                                                        }}
                                                    >
                                                        {d.id?.slice(0, 8)}…
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: '0.85rem' }}>
                                                    <div>{d.operatingSystem || '—'}</div>
                                                    <div style={{ color: '#718096', fontSize: '0.78rem' }}>
                                                        {d.browserName || '—'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <code style={{ fontSize: '0.78rem' }}>
                                                        {d.registrationIpAddress || '—'}
                                                    </code>
                                                </td>
                                                <td style={{ fontSize: '0.85rem' }}>
                                                    <div>{formatDate(d.approvedAt)}</div>
                                                    {d.approvedByName && (
                                                        <div style={{ color: '#718096', fontSize: '0.78rem' }}>
                                                            by {d.approvedByName}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: '0.85rem' }}>
                                                    {formatDate(d.lastUsedAt)}
                                                    {d.loginCount > 0 && (
                                                        <Badge
                                                            bg="secondary"
                                                            style={{
                                                                marginLeft: '6px',
                                                                fontSize: '0.7rem',
                                                            }}
                                                        >
                                                            {d.loginCount}×
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'end' }}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-dark"
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            padding: '3px 10px',
                                                            marginRight: '6px',
                                                        }}
                                                        onClick={() => openActionModal(d, 'block')}
                                                        title="Block this device"
                                                    >
                                                        <i className="fas fa-ban me-1"></i>
                                                        Block
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-secondary"
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            padding: '3px 10px',
                                                        }}
                                                        onClick={() => openActionModal(d, 'revoke')}
                                                        title="Remove this device"
                                                    >
                                                        <i className="fas fa-trash-alt me-1"></i>
                                                        Remove
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Container>

            {/* Action Modal */}
            <Modal show={actionModal.show} onHide={closeActionModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {actionModal.action && actionConfig[actionModal.action]?.title}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {actionModal.deviceInfo && (
                        <div
                            style={{
                                background: '#f8f9fa',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                fontSize: '0.85rem',
                            }}
                        >
                            <div>
                                <strong>Device:</strong> {actionModal.deviceInfo.deviceName || 'Unnamed'}
                            </div>
                            <div>
                                <strong>User:</strong> {actionModal.deviceInfo.userName}{' '}
                                ({actionModal.deviceInfo.userEmail})
                            </div>
                            <div>
                                <strong>OS:</strong> {actionModal.deviceInfo.operatingSystem || '—'}
                            </div>
                        </div>
                    )}

                    <Form.Group>
                        <Form.Label style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            Reason <span style={{ color: '#e53e3e' }}>*</span>
                        </Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Explain why this device is being blocked/removed (required)"
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            disabled={submitting}
                            style={{ fontSize: '0.9rem' }}
                        />
                        <Form.Text className="text-muted">
                            This reason will be recorded in the audit log.
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={closeActionModal}
                        disabled={submitting}
                        size="sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant={
                            actionModal.action === 'block'
                                ? 'danger'
                                : 'secondary'
                        }
                        onClick={handleSubmitAction}
                        disabled={submitting || !actionReason.trim()}
                        size="sm"
                    >
                        {submitting ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-1" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <i
                                    className={`fas ${
                                        actionModal.action === 'block'
                                            ? 'fa-ban'
                                            : 'fa-trash-alt'
                                    } me-1`}
                                ></i>
                                {actionModal.action && actionConfig[actionModal.action]?.confirmLabel}
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Toast */}
            {toast.show && (
                <div
                    style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        zIndex: 1100,
                        padding: '14px 20px',
                        borderRadius: '10px',
                        fontWeight: 600,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                        color: '#fff',
                        minWidth: '260px',
                        background: toast.type === 'success' ? '#38a169' : '#e53e3e',
                        cursor: 'pointer',
                    }}
                    onClick={() => setToast({ ...toast, show: false })}
                >
                    <i
                        className={`fas ${
                            toast.type === 'success'
                                ? 'fa-check-circle'
                                : 'fa-exclamation-circle'
                        } me-2`}
                    ></i>
                    {toast.message}
                </div>
            )}
        </DashboardLayout>
    );
};

export default ApprovedDevices;