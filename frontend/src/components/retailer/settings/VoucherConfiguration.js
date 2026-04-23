import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';

const VoucherConfiguration = () => {
    const [settings, setSettings] = useState({
        roundOffSales: false,
        roundOffPurchase: false,
        roundOffSalesReturn: false,
        roundOffPurchaseReturn: false,
        displayTransactions: false,
        displayTransactionsForSalesReturn: false,
        displayTransactionsForPurchase: false,
        displayTransactionsForPurchaseReturn: false,
        storeManagement: false
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState({});
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    const navigate = useNavigate();

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
        fetchAllSettings();
    }, []);

    const fetchAllSettings = async () => {
        setIsLoading(true);

        try {
            // Fetch round off sales settings - FIXED: Use /api/retailer/ instead of /api/Settings/
            const salesResponse = await api.get('/api/retailer/roundoff-sales');
            console.log('Sales Response:', salesResponse.data);
            if (salesResponse.data.success) {
                setSettings(prev => ({
                    ...prev,
                    roundOffSales: salesResponse.data.data.settings.roundOffSales || false,
                    roundOffPurchase: salesResponse.data.data.settings.roundOffPurchase || false,
                    displayTransactions: salesResponse.data.data.settings.displayTransactions || false,
                    storeManagement: salesResponse.data.data.settings.storeManagement || false
                }));
            }

            // Fetch sales return settings
            const salesReturnResponse = await api.get('/api/retailer/roundoff-sales-return');
            console.log('Sales Return Response:', salesReturnResponse.data);
            if (salesReturnResponse.data.success) {
                const settingsForSalesReturn = salesReturnResponse.data.data.settingsForSalesReturn;
                setSettings(prev => ({
                    ...prev,
                    roundOffSalesReturn: settingsForSalesReturn.roundOffSalesReturn || false,
                    displayTransactionsForSalesReturn: settingsForSalesReturn.displayTransactionsForSalesReturn || false
                }));
            }

            // Fetch purchase settings
            const purchaseResponse = await api.get('/api/retailer/roundoff-purchase');
            console.log('Purchase Response:', purchaseResponse.data);
            if (purchaseResponse.data.success) {
                const settingsForPurchase = purchaseResponse.data.data.settingsForPurchase;
                setSettings(prev => ({
                    ...prev,
                    roundOffPurchase: settingsForPurchase.roundOffPurchase || false
                }));
            }

            // Fetch purchase return settings
            const purchaseReturnResponse = await api.get('/api/retailer/roundoff-purchase-return');
            console.log('Purchase Return Response:', purchaseReturnResponse.data);
            if (purchaseReturnResponse.data.success) {
                const settingsForPurchaseReturn = purchaseReturnResponse.data.data.settingsForPurchaseReturn;
                setSettings(prev => ({
                    ...prev,
                    roundOffPurchaseReturn: settingsForPurchaseReturn.roundOffPurchaseReturn || false
                }));
            }

            // Fetch display settings for purchase
            const displayPurchaseResponse = await api.get('/api/retailer/get-display-purchase-transactions');
            console.log('Display Purchase Response:', displayPurchaseResponse.data);
            if (displayPurchaseResponse.data.success) {
                setSettings(prev => ({
                    ...prev,
                    displayTransactionsForPurchase: displayPurchaseResponse.data.data.displayTransactionsForPurchase || false
                }));
            }

            // Fetch display settings for purchase return
            const displayPurchaseReturnResponse = await api.get('/api/retailer/get-display-purchase-return-transactions');
            console.log('Display Purchase Return Response:', displayPurchaseReturnResponse.data);
            if (displayPurchaseReturnResponse.data.success) {
                setSettings(prev => ({
                    ...prev,
                    displayTransactionsForPurchaseReturn: displayPurchaseReturnResponse.data.data.displayTransactionsForPurchaseReturn || false
                }));
            }

        } catch (err) {
            console.error('Error fetching settings:', err);
            setNotification({
                show: true,
                message: err.response?.data?.error || 'Error fetching settings',
                type: 'error'
            });
            if (err.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const updateSetting = async (settingName, value) => {
        setIsSaving(prev => ({ ...prev, [settingName]: true }));

        try {
            // Determine the endpoint and payload based on the setting name
            let endpoint = '';
            let payload = {};

            switch (settingName) {
                case 'roundOffSales':
                    endpoint = '/api/retailer/roundoff-sales';
                    payload = { roundOffSales: value };
                    break;
                case 'roundOffSalesReturn':
                    endpoint = '/api/retailer/roundoff-sales-return';
                    payload = { roundOffSalesReturn: value };
                    break;
                case 'roundOffPurchase':
                    endpoint = '/api/retailer/roundoff-purchase';
                    payload = { roundOffPurchase: value };
                    break;
                case 'roundOffPurchaseReturn':
                    endpoint = '/api/retailer/roundoff-purchase-return';
                    payload = { roundOffPurchaseReturn: value };
                    break;
                case 'displayTransactions':
                    endpoint = '/api/retailer/updateDisplayTransactionsForSales';
                    payload = { displayTransactions: value };
                    break;
                case 'displayTransactionsForSalesReturn':
                    endpoint = '/api/retailer/updateDisplayTransactionsForSalesReturn';
                    payload = { displayTransactionsForSalesReturn: value };
                    break;
                case 'displayTransactionsForPurchase':
                    endpoint = '/api/retailer/PurchaseTransactionDisplayUpdate';
                    payload = { displayTransactionsForPurchase: value };
                    break;
                case 'displayTransactionsForPurchaseReturn':
                    endpoint = '/api/retailer/PurchaseReturnTransactionDisplayUpdate';
                    payload = { displayTransactionsForPurchaseReturn: value };
                    break;
                case 'storeManagement':
                    endpoint = '/api/retailer/storemanagement';
                    payload = { storeManagement: value };
                    break;
                default:
                    console.error('Unknown setting:', settingName);
                    return;
            }

            console.log(`Updating ${settingName} to ${value} at ${endpoint}`);
            const response = await api.post(endpoint, payload);
            console.log('Update response:', response.data);

            console.log(`Sending payload:`, payload); // Debug log
            if (response.data.success) {
                setSettings(prev => ({ ...prev, [settingName]: value }));
                setNotification({
                    show: true,
                    message: response.data.message || 'Setting updated successfully',
                    type: 'success'
                });
            }
        } catch (err) {
            console.error('Error updating setting:', err);
            console.error('Error response:', err.response?.data);
            setNotification({
                show: true,
                message: err.response?.data?.error || err.response?.data?.message || 'Error updating setting',
                type: 'error'
            });

            if (err.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setIsSaving(prev => ({ ...prev, [settingName]: false }));
        }
    };

    // const handleCheckboxChange = (settingName) => (e) => {
    //     const value = e.target.checked;
    //     updateSetting(settingName, value);
    // };

    const handleCheckboxChange = (settingName) => (e) => {
        // Get the new checked state from the event
        const newValue = e.target.checked;
        console.log(`Checkbox ${settingName} changed to: ${newValue}`); // Debug log
        updateSetting(settingName, newValue);
    };

    if (isLoading) {
        return (
            <div className="Container-fluid">
                <Header />
                <div className="container mt-4">
                    <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="Container-fluid">
            <Header />
            <div className="container settings-container mt-4">
                <div className="card settings-card">
                    <div className="card-body">
                        {/* Round-Off Settings Section */}
                        <div className="settings-section">
                            <h2><i className="fas fa-calculator me-2"></i> Round-Off Settings</h2>
                            <div className="row">
                                <div className="col-md-6 col-lg-3">
                                    <div className="setting-item">
                                        <div className="form-check d-flex align-items-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="roundOffSales"
                                                checked={settings.roundOffSales}
                                                onChange={handleCheckboxChange('roundOffSales')}
                                                disabled={isSaving.roundOffSales}
                                            />
                                            <label className="form-check-label" htmlFor="roundOffSales">
                                                Round Off Sales
                                            </label>
                                        </div>
                                        {isSaving.roundOffSales && (
                                            <div className="mt-2">
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Saving...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <div className="setting-item">
                                        <div className="form-check d-flex align-items-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="roundOffSalesReturn"
                                                checked={settings.roundOffSalesReturn}
                                                onChange={handleCheckboxChange('roundOffSalesReturn')}
                                                disabled={isSaving.roundOffSalesReturn}
                                            />
                                            <label className="form-check-label" htmlFor="roundOffSalesReturn">
                                                Round Off Sales Return
                                            </label>
                                        </div>
                                        {isSaving.roundOffSalesReturn && (
                                            <div className="mt-2">
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Saving...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <div className="setting-item">
                                        <div className="form-check d-flex align-items-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="roundOffPurchase"
                                                checked={settings.roundOffPurchase}
                                                onChange={handleCheckboxChange('roundOffPurchase')}
                                                disabled={isSaving.roundOffPurchase}
                                            />
                                            <label className="form-check-label" htmlFor="roundOffPurchase">
                                                Round Off Purchase
                                            </label>
                                        </div>
                                        {isSaving.roundOffPurchase && (
                                            <div className="mt-2">
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Saving...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <div className="setting-item">
                                        <div className="form-check d-flex align-items-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="roundOffPurchaseReturn"
                                                checked={settings.roundOffPurchaseReturn}
                                                onChange={handleCheckboxChange('roundOffPurchaseReturn')}
                                                disabled={isSaving.roundOffPurchaseReturn}
                                            />
                                            <label className="form-check-label" htmlFor="roundOffPurchaseReturn">
                                                Round Off Purchase Return
                                            </label>
                                        </div>
                                        {isSaving.roundOffPurchaseReturn && (
                                            <div className="mt-2">
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Saving...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Display Settings Section */}
                        <div className="settings-section">
                            <h2><i className="fas fa-desktop me-2"></i> Display Settings</h2>
                            <div className="row">
                                <div className="col-md-6 col-lg-3">
                                    <div className="setting-item">
                                        <div className="form-check d-flex align-items-center">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="displayTransactions"
                                                checked={settings.displayTransactions}
                                                onChange={handleCheckboxChange('displayTransactions')}
                                                disabled={isSaving.displayTransactions}
                                            />
                                            <label className="form-check-label" htmlFor="displayTransactions">
                                                Show Transactions in Sales
                                            </label>
                                        </div>
                                        {isSaving.displayTransactions && (
                                            <div className="mt-2">
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Saving...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <div className="setting-item">
                                        <div className="form-check d-flex align-items-center">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="displayTransactionsForSalesReturn"
                                                checked={settings.displayTransactionsForSalesReturn}
                                                onChange={handleCheckboxChange('displayTransactionsForSalesReturn')}
                                                disabled={isSaving.displayTransactionsForSalesReturn}
                                            />
                                            <label className="form-check-label" htmlFor="displayTransactionsForSalesReturn">
                                                Show Transactions in Sales Return
                                            </label>
                                        </div>
                                        {isSaving.displayTransactionsForSalesReturn && (
                                            <div className="mt-2">
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Saving...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <div className="setting-item">
                                        <div className="form-check d-flex align-items-center">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="displayTransactionsForPurchase"
                                                checked={settings.displayTransactionsForPurchase}
                                                onChange={handleCheckboxChange('displayTransactionsForPurchase')}
                                                disabled={isSaving.displayTransactionsForPurchase}
                                            />
                                            <label className="form-check-label" htmlFor="displayTransactionsForPurchase">
                                                Show Transactions in Purchase
                                            </label>
                                        </div>
                                        {isSaving.displayTransactionsForPurchase && (
                                            <div className="mt-2">
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Saving...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <div className="setting-item">
                                        <div className="form-check d-flex align-items-center">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="displayTransactionsForPurchaseReturn"
                                                checked={settings.displayTransactionsForPurchaseReturn}
                                                onChange={handleCheckboxChange('displayTransactionsForPurchaseReturn')}
                                                disabled={isSaving.displayTransactionsForPurchaseReturn}
                                            />
                                            <label className="form-check-label" htmlFor="displayTransactionsForPurchaseReturn">
                                                Show Transactions in Purchase Return
                                            </label>
                                        </div>
                                        {isSaving.displayTransactionsForPurchaseReturn && (
                                            <div className="mt-2">
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Saving...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Store Management Section */}
                        <div className="settings-section">
                            <h2><i className="fas fa-store me-2"></i> Store Management</h2>
                            <div className="row">
                                <div className="col-md-6 col-lg-3">
                                    <div className="setting-item">
                                        <div className="form-check d-flex align-items-center">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="storeManagement"
                                                checked={settings.storeManagement}
                                                onChange={handleCheckboxChange('storeManagement')}
                                                disabled={isSaving.storeManagement}
                                            />
                                            <label className="form-check-label" htmlFor="storeManagement">
                                                Enable Store/Rack Management
                                            </label>
                                        </div>
                                        {isSaving.storeManagement && (
                                            <div className="mt-2">
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Saving...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />

            <style jsx>{`
                .settings-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding-bottom: 40px;
                }

                .settings-card {
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                    overflow: hidden;
                }

                .settings-section {
                    padding: 25px;
                    border-bottom: 1px solid #e0e0e0;
                }

                .settings-section:last-child {
                    border-bottom: none;
                }

                .settings-section h2 {
                    color: #2c3e50;
                    margin-bottom: 25px;
                    font-size: 1.5rem;
                    font-weight: 600;
                }

                .setting-item {
                    margin-bottom: 20px;
                    padding: 15px;
                    background-color: #f8f9fa;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                }

                .setting-item:hover {
                    background-color: #f1f3f5;
                    transform: translateY(-2px);
                }

                .form-check-input {
                    width: 1.2em;
                    height: 1.2em;
                    margin-top: 0.1em;
                    cursor: pointer;
                }

                .form-check-input:disabled {
                    cursor: not-allowed;
                }

                .form-check-label {
                    margin-left: 8px;
                    font-size: 1rem;
                    font-weight: 500;
                    color: #495057;
                    cursor: pointer;
                }

                .form-check-input:disabled + .form-check-label {
                    cursor: not-allowed;
                    opacity: 0.6;
                }

                @media (max-width: 768px) {
                    .setting-item {
                        margin-bottom: 15px;
                    }

                    .settings-section h2 {
                        font-size: 1.3rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default VoucherConfiguration;