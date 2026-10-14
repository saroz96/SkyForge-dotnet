import React, { useState, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import api from '../../services/api';

const STATUS_TABS = [
    { key: 'Pending', label: 'Pending Approval', icon: 'bi-hourglass-split', color: '#d69e2e' },
    { key: 'Approved', label: 'Approved', icon: 'bi-check-circle', color: '#38a169' },
    { key: 'Rejected', label: 'Rejected', icon: 'bi-x-circle', color: '#e53e3e' },
    { key: 'Revoked', label: 'Revoked', icon: 'bi-slash-circle', color: '#718096' },
    { key: 'Blocked', label: 'Blocked', icon: 'bi-shield-x', color: '#c53030' },
    { key: 'All', label: 'All Devices', icon: 'bi-list-ul', color: '#2a4d7a' },
];

const DeviceApprovalQueue = () => {
    const [activeTab, setActiveTab] = useState('Pending');
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [counts, setCounts] = useState({ Pending: 0, Approved: 0, Rejected: 0, Revoked: 0, Blocked: 0, All: 0 });

    // Action modal state
    const [actionModal, setActionModal] = useState({
        show: false,
        deviceId: null,
        action: null, // 'approve' | 'reject' | 'revoke' | 'block'
        deviceInfo: null,
    });
    const [actionReason, setActionReason] = useState('');
    const [actionNotes, setActionNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Toast
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // ============================================================
    // Fetch devices for the active tab
    // ============================================================
    const fetchDevices = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const params = activeTab === 'All' ? {} : { status: activeTab };
            const response = await api.get('/api/device/admin/all', { params });

            if (response.data.success) {
                setDevices(response.data.devices || []);
            } else {
                throw new Error(response.data.error || 'Failed to fetch devices');
            }
        } catch (err) {
            console.error('Fetch devices error:', err);
            setError(err.response?.data?.error || err.message || 'Failed to load devices');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    // ============================================================
    // Fetch counts (all statuses) — used for tab badges
    // ============================================================
    const fetchCounts = useCallback(async () => {
        try {
            const response = await api.get('/api/device/admin/all');
            if (response.data.success) {
                const devices = response.data.devices || [];
                const next = { Pending: 0, Approved: 0, Rejected: 0, Revoked: 0, Blocked: 0, All: devices.length };
                devices.forEach((d) => {
                    if (next[d.status] !== undefined) next[d.status]++;
                });
                setCounts(next);
            }
        } catch (err) {
            console.error('Fetch counts error:', err);
        }
    }, []);

    useEffect(() => {
        fetchDevices();
        fetchCounts();
    }, [fetchDevices, fetchCounts]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchDevices();
            fetchCounts();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchDevices, fetchCounts]);

    // ============================================================
    // Open action modal
    // ============================================================
    const openActionModal = (device, action) => {
        setActionModal({
            show: true,
            deviceId: device.id,
            action,
            deviceInfo: device,
        });
        setActionReason('');
        setActionNotes('');
    };

    const closeActionModal = () => {
        setActionModal({ show: false, deviceId: null, action: null, deviceInfo: null });
        setActionReason('');
        setActionNotes('');
    };

    // ============================================================
    // Submit action
    // ============================================================
    const handleSubmitAction = async () => {
        const { deviceId, action } = actionModal;
        if (!deviceId || !action) return;

        // Reason required for non-approve actions
        if (action !== 'approve' && !actionReason.trim()) {
            setToast({ show: true, message: 'Please provide a reason.', type: 'error' });
            return;
        }

        setSubmitting(true);

        try {
            let url = '';
            let payload = {};

            switch (action) {
                case 'approve':
                    url = `/api/device/admin/${deviceId}/approve`;
                    payload = { notes: actionNotes || null, trustScore: null };
                    break;
                case 'reject':
                    url = `/api/device/admin/${deviceId}/reject`;
                    payload = { reason: actionReason.trim() };
                    break;
                case 'revoke':
                    url = `/api/device/admin/${deviceId}/revoke`;
                    payload = { reason: actionReason.trim() };
                    break;
                case 'block':
                    url = `/api/device/admin/${deviceId}/block`;
                    payload = { reason: actionReason.trim() };
                    break;
                default:
                    throw new Error('Unknown action');
            }

            const response = await api.post(url, payload);

            if (response.data.success) {
                setToast({
                    show: true,
                    message: response.data.message || `Device ${action}d successfully.`,
                    type: 'success',
                });
                closeActionModal();
                fetchDevices();
                fetchCounts();
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

    // ============================================================
    // Helpers
    // ============================================================
    const getStatusBadge = (status) => {
        const map = {
            Pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
            Approved: { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
            Rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
            Revoked: { bg: '#e5e7eb', color: '#374151', label: 'Revoked' },
            Blocked: { bg: '#fecaca', color: '#7f1d1d', label: 'Blocked' },
        };
        const s = map[status] || { bg: '#e5e7eb', color: '#374151', label: status };
        return (
            <span style={{
                background: s.bg,
                color: s.color,
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
            }}>
                {s.label}
            </span>
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleString();
    };

    // ============================================================
    // Render
    // ============================================================
    const styles = {
        container: {
            padding: '24px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
        },
        title: {
            fontSize: '1.6rem',
            fontWeight: 700,
            color: '#1a202c',
            margin: 0,
        },
        subtitle: {
            color: '#718096',
            margin: 0,
            fontSize: '0.9rem',
        },
        refreshBtn: {
            background: '#2a4d7a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        },
        tabBar: {
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '20px',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '0',
        },
        tab: (active, color) => ({
            padding: '10px 16px',
            border: 'none',
            background: 'transparent',
            color: active ? color : '#718096',
            fontWeight: active ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderBottom: active ? `3px solid ${color}` : '3px solid transparent',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        }),
        tabCount: (active, color) => ({
            background: active ? color : '#e2e8f0',
            color: active ? '#fff' : '#4a5568',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '0.75rem',
            fontWeight: 700,
        }),
        table: {
            width: '100%',
            background: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
        },
        th: {
            background: '#f7fafc',
            padding: '14px 16px',
            textAlign: 'left',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#4a5568',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderBottom: '1px solid #e2e8f0',
        },
        td: {
            padding: '14px 16px',
            fontSize: '0.88rem',
            color: '#2d3748',
            borderBottom: '1px solid #edf2f7',
            verticalAlign: 'middle',
        },
        actionBtn: (variant) => {
            const variants = {
                approve: { bg: '#38a169', color: '#fff' },
                reject: { bg: '#e53e3e', color: '#fff' },
                revoke: { bg: '#718096', color: '#fff' },
                block: { bg: '#c53030', color: '#fff' },
            };
            const v = variants[variant] || { bg: '#e2e8f0', color: '#2d3748' };
            return {
                background: v.bg,
                color: v.color,
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginRight: '6px',
            };
        },
        emptyState: {
            padding: '60px 20px',
            textAlign: 'center',
            color: '#a0aec0',
        },
        modalBackdrop: {
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '20px',
        },
        modal: {
            background: '#fff',
            borderRadius: '14px',
            padding: '28px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        },
        modalTitle: {
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#1a202c',
            marginBottom: '8px',
        },
        modalSubtitle: {
            color: '#718096',
            fontSize: '0.9rem',
            marginBottom: '20px',
        },
        textarea: {
            width: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '0.9rem',
            outline: 'none',
            resize: 'vertical',
            minHeight: '80px',
            fontFamily: 'inherit',
            marginBottom: '16px',
        },
        modalFooter: {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
        },
        btnCancel: {
            padding: '10px 18px',
            background: '#edf2f7',
            color: '#4a5568',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
        },
        btnConfirm: (bg) => ({
            padding: '10px 18px',
            background: bg,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
        }),
        toast: {
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
        },
    };

    const actionConfig = {
        approve: { title: 'Approve Device', color: '#38a169', confirmLabel: 'Approve' },
        reject: { title: 'Reject Device', color: '#e53e3e', confirmLabel: 'Reject' },
        revoke: { title: 'Revoke Device', color: '#718096', confirmLabel: 'Revoke' },
        block: { title: 'Block Device', color: '#c53030', confirmLabel: 'Block' },
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h2 style={styles.title}>
                        <i className="bi bi-shield-check me-2" style={{ color: '#2a4d7a' }}></i>
                        Device Verification
                    </h2>
                    <p style={styles.subtitle}>
                        Review, approve, or reject device registration requests from users.
                    </p>
                </div>
                <button
                    style={styles.refreshBtn}
                    onClick={() => { fetchDevices(); fetchCounts(); }}
                    disabled={loading}
                >
                    <i className={`bi ${loading ? 'bi-arrow-repeat spin' : 'bi-arrow-clockwise'}`}></i>
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div style={styles.tabBar}>
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        style={styles.tab(activeTab === tab.key, tab.color)}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <i className={`bi ${tab.icon}`}></i>
                        {tab.label}
                        <span style={styles.tabCount(activeTab === tab.key, tab.color)}>
                            {counts[tab.key] ?? 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                </div>
            )}

            {/* Table */}
            {loading && devices.length === 0 ? (
                <div style={styles.emptyState}>
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="mt-3">Loading devices...</p>
                </div>
            ) : devices.length === 0 ? (
                <div style={styles.emptyState}>
                    <i className="bi bi-inbox" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}></i>
                    <h3 style={{ color: '#4a5568', fontSize: '1.1rem', fontWeight: 600 }}>
                        No devices {activeTab === 'All' ? '' : `with status "${activeTab}"`}
                    </h3>
                    <p>Nothing to show here.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>User</th>
                                <th style={styles.th}>Device</th>
                                <th style={styles.th}>OS / Browser</th>
                                <th style={styles.th}>IP Address</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Requested</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {devices.map((d) => (
                                <tr key={d.id}>
                                    <td style={styles.td}>
                                        <div style={{ fontWeight: 600 }}>{d.userName || 'Unknown'}</div>
                                        <div style={{ color: '#718096', fontSize: '0.8rem' }}>{d.userEmail}</div>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={{ fontWeight: 500 }}>{d.deviceName || 'Unnamed Device'}</div>
                                        <div style={{ color: '#a0aec0', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                            {d.id.slice(0, 8)}…
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <div>{d.operatingSystem || '—'}</div>
                                        <div style={{ color: '#718096', fontSize: '0.8rem' }}>
                                            {d.browserName || '—'}
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <code style={{ fontSize: '0.8rem' }}>
                                            {d.registrationIpAddress || '—'}
                                        </code>
                                    </td>
                                    <td style={styles.td}>{getStatusBadge(d.status)}</td>
                                    <td style={styles.td}>
                                        <div style={{ fontSize: '0.85rem' }}>{formatDate(d.createdAt)}</div>
                                        {d.approvedAt && (
                                            <div style={{ color: '#718096', fontSize: '0.78rem' }}>
                                                Approved: {formatDate(d.approvedAt)}
                                                {d.approvedByName && ` by ${d.approvedByName}`}
                                            </div>
                                        )}
                                        {d.rejectionReason && (
                                            <div style={{ color: '#e53e3e', fontSize: '0.78rem' }}>
                                                Reason: {d.rejectionReason}
                                            </div>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        {d.status === 'Pending' && (
                                            <>
                                                <button
                                                    style={styles.actionBtn('approve')}
                                                    onClick={() => openActionModal(d, 'approve')}
                                                >
                                                    <i className="bi bi-check-lg"></i> Approve
                                                </button>
                                                <button
                                                    style={styles.actionBtn('reject')}
                                                    onClick={() => openActionModal(d, 'reject')}
                                                >
                                                    <i className="bi bi-x-lg"></i> Reject
                                                </button>
                                            </>
                                        )}
                                        {d.status === 'Approved' && (
                                            <>
                                                <button
                                                    style={styles.actionBtn('revoke')}
                                                    onClick={() => openActionModal(d, 'revoke')}
                                                >
                                                    <i className="bi bi-slash-circle"></i> Revoke
                                                </button>
                                                <button
                                                    style={styles.actionBtn('block')}
                                                    onClick={() => openActionModal(d, 'block')}
                                                >
                                                    <i className="bi bi-shield-x"></i> Block
                                                </button>
                                            </>
                                        )}
                                        {(d.status === 'Rejected' || d.status === 'Revoked' || d.status === 'Blocked') && (
                                            <button
                                                style={styles.actionBtn('approve')}
                                                onClick={() => openActionModal(d, 'approve')}
                                            >
                                                <i className="bi bi-check-lg"></i> Approve
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Action Modal */}
            {actionModal.show && actionModal.action && (
                <div style={styles.modalBackdrop} onClick={closeActionModal}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>
                            {actionConfig[actionModal.action].title}
                        </h3>
                        <p style={styles.modalSubtitle}>
                            Device: <strong>{actionModal.deviceInfo?.deviceName || 'Unnamed'}</strong>
                            <br />
                            User: <strong>{actionModal.deviceInfo?.userName}</strong> ({actionModal.deviceInfo?.userEmail})
                        </p>

                        {actionModal.action === 'approve' ? (
                            <textarea
                                style={styles.textarea}
                                placeholder="Optional notes (visible to admins only)"
                                value={actionNotes}
                                onChange={(e) => setActionNotes(e.target.value)}
                                disabled={submitting}
                            />
                        ) : (
                            <textarea
                                style={styles.textarea}
                                placeholder="Reason (required, will be shown to the user)"
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                disabled={submitting}
                            />
                        )}

                        <div style={styles.modalFooter}>
                            <button
                                style={styles.btnCancel}
                                onClick={closeActionModal}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                style={styles.btnConfirm(actionConfig[actionModal.action].color)}
                                onClick={handleSubmitAction}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                                        Processing...
                                    </>
                                ) : (
                                    actionConfig[actionModal.action].confirmLabel
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast.show && (
                <div
                    style={{
                        ...styles.toast,
                        background: toast.type === 'success' ? '#38a169' : '#e53e3e',
                    }}
                    onClick={() => setToast({ ...toast, show: false })}
                >
                    <i className={`bi ${toast.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2`}></i>
                    {toast.message}
                </div>
            )}

            {/* Auto-dismiss toast */}
            {toast.show && (
                <ToastAutoDismiss onDismiss={() => setToast({ ...toast, show: false })} />
            )}

            <style>{`
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

// Small helper component for auto-dismissing the toast
const ToastAutoDismiss = ({ onDismiss }) => {
    useEffect(() => {
        const t = setTimeout(onDismiss, 3500);
        return () => clearTimeout(t);
    }, [onDismiss]);
    return null;
};

export default DeviceApprovalQueue;