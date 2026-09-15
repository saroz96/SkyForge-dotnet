// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
// import Header from '../Header';
// import NotificationToast from '../../NotificationToast';
// import api, { refreshToken } from '../../services/api';

// const VoucherConfiguration = () => {
//     const [settings, setSettings] = useState({
//         roundOffSales: false,
//         roundOffPurchase: false,
//         roundOffSalesReturn: false,
//         roundOffPurchaseReturn: false,
//         displayTransactions: false,
//         displayTransactionsForSalesReturn: false,
//         displayTransactionsForPurchase: false,
//         displayTransactionsForPurchaseReturn: false,
//         storeManagement: false,
//         // Date preferences - true = Voucher Last Date, false = System Date
//         datePreferencePurchase: false,
//         datePreferenceSales: false,
//         datePreferenceSalesReturn: false,
//         datePreferencePurchaseReturn: false,
//         datePreferencePayment: false,
//         datePreferenceReceipt: false,
//         datePreferenceJournal: false,
//         datePreferenceDebitNote: false,
//         datePreferenceCreditNote: false,
//         datePreferenceSalesQuotation: false,
//         datePreferenceStockAdjustment: false

//     });

//     const [isLoading, setIsLoading] = useState(true);
//     const [isSaving, setIsSaving] = useState({});
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success'
//     });

//     const navigate = useNavigate();

//     useEffect(() => {
//         fetchAllSettings();
//         fetchAllDatePreferences();
//     }, []);

//     const fetchAllSettings = async () => {
//         setIsLoading(true);

//         try {
//             // Fetch round off sales settings
//             const salesResponse = await api.get('/api/retailer/roundoff-sales');
//             if (salesResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     roundOffSales: salesResponse.data.data.settings.roundOffSales || false,
//                     roundOffPurchase: salesResponse.data.data.settings.roundOffPurchase || false,
//                     displayTransactions: salesResponse.data.data.settings.displayTransactions || false,
//                     storeManagement: salesResponse.data.data.settings.storeManagement || false
//                 }));
//             }

//             // Fetch sales return settings
//             const salesReturnResponse = await api.get('/api/retailer/roundoff-sales-return');
//             if (salesReturnResponse.data.success) {
//                 const settingsForSalesReturn = salesReturnResponse.data.data.settingsForSalesReturn;
//                 setSettings(prev => ({
//                     ...prev,
//                     roundOffSalesReturn: settingsForSalesReturn.roundOffSalesReturn || false,
//                     displayTransactionsForSalesReturn: settingsForSalesReturn.displayTransactionsForSalesReturn || false
//                 }));
//             }

//             // Fetch purchase settings
//             const purchaseResponse = await api.get('/api/retailer/roundoff-purchase');
//             if (purchaseResponse.data.success) {
//                 const settingsForPurchase = purchaseResponse.data.data.settingsForPurchase;
//                 setSettings(prev => ({
//                     ...prev,
//                     roundOffPurchase: settingsForPurchase.roundOffPurchase || false
//                 }));
//             }

//             // Fetch purchase return settings
//             const purchaseReturnResponse = await api.get('/api/retailer/roundoff-purchase-return');
//             if (purchaseReturnResponse.data.success) {
//                 const settingsForPurchaseReturn = purchaseReturnResponse.data.data.settingsForPurchaseReturn;
//                 setSettings(prev => ({
//                     ...prev,
//                     roundOffPurchaseReturn: settingsForPurchaseReturn.roundOffPurchaseReturn || false
//                 }));
//             }

//             // Fetch display settings for purchase
//             const displayPurchaseResponse = await api.get('/api/retailer/get-display-purchase-transactions');
//             if (displayPurchaseResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     displayTransactionsForPurchase: displayPurchaseResponse.data.data.displayTransactionsForPurchase || false
//                 }));
//             }

//             // Fetch display settings for purchase return
//             const displayPurchaseReturnResponse = await api.get('/api/retailer/get-display-purchase-return-transactions');
//             if (displayPurchaseReturnResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     displayTransactionsForPurchaseReturn: displayPurchaseReturnResponse.data.data.displayTransactionsForPurchaseReturn || false
//                 }));
//             }

//         } catch (err) {
//             console.error('Error fetching settings:', err);
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.error || 'Error fetching settings',
//                 type: 'error'
//             });
//             if (err.response?.status === 401) {
//                 navigate('/login');
//             }
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const fetchAllDatePreferences = async () => {
//         try {
//             // Fetch purchase date preference
//             const purchasePrefResponse = await api.get('/api/retailer/date-preference/purchase');
//             if (purchasePrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferencePurchase: purchasePrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }

//             // Fetch sales date preference
//             const salesPrefResponse = await api.get('/api/retailer/date-preference/sales');
//             if (salesPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceSales: salesPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }

//             // Fetch sales return date preference
//             const salesReturnPrefResponse = await api.get('/api/retailer/date-preference/sales-return');
//             if (salesReturnPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceSalesReturn: salesReturnPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }

//             // Fetch purchase return date preference
//             const purchaseReturnPrefResponse = await api.get('/api/retailer/date-preference/purchase-return');
//             if (purchaseReturnPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferencePurchaseReturn: purchaseReturnPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }

//             // Fetch payment date preference
//             const paymentPrefResponse = await api.get('/api/retailer/date-preference/payment');
//             if (paymentPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferencePayment: paymentPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }
//             // Fetch receipt date preference
//             const receiptPrefResponse = await api.get('/api/retailer/date-preference/receipt');
//             if (receiptPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceReceipt: receiptPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }

//             // Fetch journal date preference
//             const journalPrefResponse = await api.get('/api/retailer/date-preference/journal');
//             if (journalPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceJournal: journalPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }
//             // Fetch debit note date preference
//             const debitNotePrefResponse = await api.get('/api/retailer/date-preference/debit-note');
//             if (debitNotePrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceDebitNote: debitNotePrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }
//             // Fetch debit note date preference
//             const creditNotePrefResponse = await api.get('/api/retailer/date-preference/credit-note');
//             if (creditNotePrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceCreditNote: creditNotePrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }
//             // Fetch sales quotation date preference
//             const salesQuotationPrefResponse = await api.get('/api/retailer/date-preference/sales-quotation');
//             if (salesQuotationPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceSalesQuotation: salesQuotationPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }
//             // Fetch debit note date preference
//             const stockAdjustmentPrefResponse = await api.get('/api/retailer/date-preference/stock-adjustment');
//             if (creditNotePrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceStockAdjustment: stockAdjustmentPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }
//         } catch (err) {
//             console.error('Error fetching date preferences:', err);
//         }
//     };

//     const updateDatePreference = async (type, useVoucherLastDate) => {
//         setIsSaving(prev => ({ ...prev, [type]: true }));

//         try {
//             let endpoint = '';
//             switch (type) {
//                 case 'datePreferencePurchase':
//                     endpoint = '/api/retailer/date-preference/purchase';
//                     break;
//                 case 'datePreferenceSales':
//                     endpoint = '/api/retailer/date-preference/sales';
//                     break;
//                 case 'datePreferenceSalesReturn':
//                     endpoint = '/api/retailer/date-preference/sales-return';
//                     break;
//                 case 'datePreferencePurchaseReturn':
//                     endpoint = '/api/retailer/date-preference/purchase-return';
//                     break;
//                 case 'datePreferencePayment':
//                     endpoint = '/api/retailer/date-preference/payment';
//                     break;
//                 case 'datePreferenceReceipt':
//                     endpoint = '/api/retailer/date-preference/receipt';
//                     break;
//                 case 'datePreferenceJournal':
//                     endpoint = '/api/retailer/date-preference/journal';
//                     break;
//                 case 'datePreferenceDebitNote':
//                     endpoint = '/api/retailer/date-preference/debit-note';
//                     break;
//                 case 'datePreferenceCreditNote':
//                     endpoint = '/api/retailer/date-preference/credit-note';
//                     break;
//                 case 'datePreferenceSalesQuotation':
//                     endpoint = '/api/retailer/date-preference/sales-quotation';
//                     break;
//                 case 'datePreferenceStockAdjustment':
//                     endpoint = '/api/retailer/date-preference/stock-adjustment';
//                     break;
//                 default:
//                     return;
//             }

//             const response = await api.post(endpoint, { useVoucherLastDate });

//             if (response.data.success) {
//                 setSettings(prev => ({ ...prev, [type]: useVoucherLastDate }));
//                 setNotification({
//                     show: true,
//                     message: `${getTypeLabel(type)} date preference updated successfully`,
//                     type: 'success'
//                 });
//             }
//         } catch (err) {
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.error || 'Error updating date preference',
//                 type: 'error'
//             });
//         } finally {
//             setIsSaving(prev => ({ ...prev, [type]: false }));
//         }
//     };

//     const getTypeLabel = (type) => {
//         const labels = {
//             datePreferencePurchase: 'Purchase',
//             datePreferenceSales: 'Sales',
//             datePreferenceSalesReturn: 'Sales Return',
//             datePreferencePurchaseReturn: 'Purchase Return',
//             datePreferencePayment: 'Payment',
//             datePreferenceReceipt: 'Receipt',
//             datePreferenceJournal: 'Journal',
//             datePreferenceDebitNote: 'Debit Note',
//             datePreferenceCreditNote: 'Credit Note',
//             datePreferenceSalesQuotation: 'Sales Quotation',
//             datePreferenceStockAdjustment: 'Stock Adjustment'
//         };
//         return labels[type] || type;
//     };

//     const updateSetting = async (settingName, value) => {
//         setIsSaving(prev => ({ ...prev, [settingName]: true }));

//         try {
//             let endpoint = '';
//             let payload = {};

//             switch (settingName) {
//                 case 'roundOffSales':
//                     endpoint = '/api/retailer/roundoff-sales';
//                     payload = { roundOffSales: value };
//                     break;
//                 case 'roundOffSalesReturn':
//                     endpoint = '/api/retailer/roundoff-sales-return';
//                     payload = { roundOffSalesReturn: value };
//                     break;
//                 case 'roundOffPurchase':
//                     endpoint = '/api/retailer/roundoff-purchase';
//                     payload = { roundOffPurchase: value };
//                     break;
//                 case 'roundOffPurchaseReturn':
//                     endpoint = '/api/retailer/roundoff-purchase-return';
//                     payload = { roundOffPurchaseReturn: value };
//                     break;
//                 case 'displayTransactions':
//                     endpoint = '/api/retailer/updateDisplayTransactionsForSales';
//                     payload = { displayTransactions: value };
//                     break;
//                 case 'displayTransactionsForSalesReturn':
//                     endpoint = '/api/retailer/updateDisplayTransactionsForSalesReturn';
//                     payload = { displayTransactionsForSalesReturn: value };
//                     break;
//                 case 'displayTransactionsForPurchase':
//                     endpoint = '/api/retailer/PurchaseTransactionDisplayUpdate';
//                     payload = { displayTransactionsForPurchase: value };
//                     break;
//                 case 'displayTransactionsForPurchaseReturn':
//                     endpoint = '/api/retailer/PurchaseReturnTransactionDisplayUpdate';
//                     payload = { displayTransactionsForPurchaseReturn: value };
//                     break;
//                 case 'storeManagement':
//                     endpoint = '/api/retailer/storemanagement';
//                     payload = { storeManagement: value };
//                     break;
//                 default:
//                     console.error('Unknown setting:', settingName);
//                     return;
//             }

//             const response = await api.post(endpoint, payload);

//             if (response.data.success) {
//                 setSettings(prev => ({ ...prev, [settingName]: value }));
//                 setNotification({
//                     show: true,
//                     message: response.data.message || 'Setting updated successfully',
//                     type: 'success'
//                 });
//             }
//         } catch (err) {
//             console.error('Error updating setting:', err);
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.error || err.response?.data?.message || 'Error updating setting',
//                 type: 'error'
//             });

//             if (err.response?.status === 401) {
//                 navigate('/login');
//             }
//         } finally {
//             setIsSaving(prev => ({ ...prev, [settingName]: false }));
//         }
//     };

//     const handleCheckboxChange = (settingName) => (e) => {
//         const newValue = e.target.checked;
//         updateSetting(settingName, newValue);
//     };

//     const DatePreferenceRadio = ({ type, label, value, disabled }) => (
//         <div className="d-flex gap-3">
//             <div className="form-check">
//                 <input
//                     type="radio"
//                     className="form-check-input"
//                     name={type}
//                     id={`${type}_system`}
//                     checked={!value}
//                     onChange={() => updateDatePreference(type, false)}
//                     disabled={disabled}
//                     style={{ marginTop: '0', cursor: 'pointer' }}
//                 />
//                 <label className="form-check-label ms-1" htmlFor={`${type}_system`} style={{ fontSize: '0.7rem', cursor: 'pointer' }}>
//                     System Date
//                 </label>
//             </div>
//             <div className="form-check">
//                 <input
//                     type="radio"
//                     className="form-check-input"
//                     name={type}
//                     id={`${type}_voucher`}
//                     checked={value}
//                     onChange={() => updateDatePreference(type, true)}
//                     disabled={disabled}
//                     style={{ marginTop: '0', cursor: 'pointer' }}
//                 />
//                 <label className="form-check-label ms-1" htmlFor={`${type}_voucher`} style={{ fontSize: '0.7rem', cursor: 'pointer' }}>
//                     Voucher Last Date
//                 </label>
//             </div>
//         </div>
//     );

//     if (isLoading) {
//         return (
//             <div className="container-fluid">
//                 <Header />
//                 <div className="text-center py-5">
//                     <div className="spinner-border" role="status">
//                         <span className="visually-hidden">Loading...</span>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                 <div className="card-header">
//                     <div className="d-flex justify-content-between align-items-center">
//                         <h2 className="card-title mb-0" style={{ fontSize: '1.1rem' }}>
//                             <i className="bi bi-gear me-2"></i>
//                             Voucher Configuration
//                         </h2>
//                     </div>
//                 </div>
//                 <div className="card-body p-2 p-md-3">

//                     {/* Round-Off Settings Section */}
//                     <div className="mb-4">
//                         <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#2c3e50', marginBottom: '0.5rem' }}>
//                             <i className="bi bi-calculator me-2"></i> Round-Off Settings
//                         </h4>
//                         <div className="row g-2">
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="form-check d-flex align-items-center">
//                                         <input
//                                             type="checkbox"
//                                             className="form-check-input"
//                                             id="roundOffSales"
//                                             checked={settings.roundOffSales}
//                                             onChange={handleCheckboxChange('roundOffSales')}
//                                             disabled={isSaving.roundOffSales}
//                                             style={{ marginTop: '0', cursor: 'pointer' }}
//                                         />
//                                         <label className="form-check-label ms-2" htmlFor="roundOffSales" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
//                                             Round Off Sales
//                                         </label>
//                                         {isSaving.roundOffSales && (
//                                             <span className="spinner-border spinner-border-sm ms-2" role="status" style={{ width: '12px', height: '12px' }}></span>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="form-check d-flex align-items-center">
//                                         <input
//                                             type="checkbox"
//                                             className="form-check-input"
//                                             id="roundOffSalesReturn"
//                                             checked={settings.roundOffSalesReturn}
//                                             onChange={handleCheckboxChange('roundOffSalesReturn')}
//                                             disabled={isSaving.roundOffSalesReturn}
//                                             style={{ marginTop: '0', cursor: 'pointer' }}
//                                         />
//                                         <label className="form-check-label ms-2" htmlFor="roundOffSalesReturn" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
//                                             Round Off Sales Return
//                                         </label>
//                                         {isSaving.roundOffSalesReturn && (
//                                             <span className="spinner-border spinner-border-sm ms-2" role="status" style={{ width: '12px', height: '12px' }}></span>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="form-check d-flex align-items-center">
//                                         <input
//                                             type="checkbox"
//                                             className="form-check-input"
//                                             id="roundOffPurchase"
//                                             checked={settings.roundOffPurchase}
//                                             onChange={handleCheckboxChange('roundOffPurchase')}
//                                             disabled={isSaving.roundOffPurchase}
//                                             style={{ marginTop: '0', cursor: 'pointer' }}
//                                         />
//                                         <label className="form-check-label ms-2" htmlFor="roundOffPurchase" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
//                                             Round Off Purchase
//                                         </label>
//                                         {isSaving.roundOffPurchase && (
//                                             <span className="spinner-border spinner-border-sm ms-2" role="status" style={{ width: '12px', height: '12px' }}></span>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="form-check d-flex align-items-center">
//                                         <input
//                                             type="checkbox"
//                                             className="form-check-input"
//                                             id="roundOffPurchaseReturn"
//                                             checked={settings.roundOffPurchaseReturn}
//                                             onChange={handleCheckboxChange('roundOffPurchaseReturn')}
//                                             disabled={isSaving.roundOffPurchaseReturn}
//                                             style={{ marginTop: '0', cursor: 'pointer' }}
//                                         />
//                                         <label className="form-check-label ms-2" htmlFor="roundOffPurchaseReturn" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
//                                             Round Off Purchase Return
//                                         </label>
//                                         {isSaving.roundOffPurchaseReturn && (
//                                             <span className="spinner-border spinner-border-sm ms-2" role="status" style={{ width: '12px', height: '12px' }}></span>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Display Settings Section */}
//                     <div className="mb-4">
//                         <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#2c3e50', marginBottom: '0.5rem' }}>
//                             <i className="bi bi-desktop me-2"></i> Display Settings
//                         </h4>
//                         <div className="row g-2">
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="form-check d-flex align-items-center">
//                                         <input
//                                             className="form-check-input"
//                                             type="checkbox"
//                                             id="displayTransactions"
//                                             checked={settings.displayTransactions}
//                                             onChange={handleCheckboxChange('displayTransactions')}
//                                             disabled={isSaving.displayTransactions}
//                                             style={{ marginTop: '0', cursor: 'pointer' }}
//                                         />
//                                         <label className="form-check-label ms-2" htmlFor="displayTransactions" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
//                                             Show Transactions in Sales
//                                         </label>
//                                         {isSaving.displayTransactions && (
//                                             <span className="spinner-border spinner-border-sm ms-2" role="status" style={{ width: '12px', height: '12px' }}></span>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="form-check d-flex align-items-center">
//                                         <input
//                                             className="form-check-input"
//                                             type="checkbox"
//                                             id="displayTransactionsForSalesReturn"
//                                             checked={settings.displayTransactionsForSalesReturn}
//                                             onChange={handleCheckboxChange('displayTransactionsForSalesReturn')}
//                                             disabled={isSaving.displayTransactionsForSalesReturn}
//                                             style={{ marginTop: '0', cursor: 'pointer' }}
//                                         />
//                                         <label className="form-check-label ms-2" htmlFor="displayTransactionsForSalesReturn" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
//                                             Show Transactions in Sales Return
//                                         </label>
//                                         {isSaving.displayTransactionsForSalesReturn && (
//                                             <span className="spinner-border spinner-border-sm ms-2" role="status" style={{ width: '12px', height: '12px' }}></span>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="form-check d-flex align-items-center">
//                                         <input
//                                             className="form-check-input"
//                                             type="checkbox"
//                                             id="displayTransactionsForPurchase"
//                                             checked={settings.displayTransactionsForPurchase}
//                                             onChange={handleCheckboxChange('displayTransactionsForPurchase')}
//                                             disabled={isSaving.displayTransactionsForPurchase}
//                                             style={{ marginTop: '0', cursor: 'pointer' }}
//                                         />
//                                         <label className="form-check-label ms-2" htmlFor="displayTransactionsForPurchase" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
//                                             Show Transactions in Purchase
//                                         </label>
//                                         {isSaving.displayTransactionsForPurchase && (
//                                             <span className="spinner-border spinner-border-sm ms-2" role="status" style={{ width: '12px', height: '12px' }}></span>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="form-check d-flex align-items-center">
//                                         <input
//                                             className="form-check-input"
//                                             type="checkbox"
//                                             id="displayTransactionsForPurchaseReturn"
//                                             checked={settings.displayTransactionsForPurchaseReturn}
//                                             onChange={handleCheckboxChange('displayTransactionsForPurchaseReturn')}
//                                             disabled={isSaving.displayTransactionsForPurchaseReturn}
//                                             style={{ marginTop: '0', cursor: 'pointer' }}
//                                         />
//                                         <label className="form-check-label ms-2" htmlFor="displayTransactionsForPurchaseReturn" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
//                                             Show Transactions in Purchase Return
//                                         </label>
//                                         {isSaving.displayTransactionsForPurchaseReturn && (
//                                             <span className="spinner-border spinner-border-sm ms-2" role="status" style={{ width: '12px', height: '12px' }}></span>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Date Preference Settings Section */}
//                     <div className="mb-4">
//                         <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#2c3e50', marginBottom: '0.5rem' }}>
//                             <i className="bi bi-calendar-date me-2"></i> Date Preference Settings
//                         </h4>
//                         <div className="row g-2">
//                             {/* Purchase Date Preference */}
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="mb-2">
//                                         <label style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
//                                             Purchase Entry
//                                         </label>
//                                         <DatePreferenceRadio
//                                             type="datePreferencePurchase"
//                                             label="Purchase"
//                                             value={settings.datePreferencePurchase}
//                                             disabled={isSaving.datePreferencePurchase}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Sales Date Preference */}
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="mb-2">
//                                         <label style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
//                                             Sales Entry
//                                         </label>
//                                         <DatePreferenceRadio
//                                             type="datePreferenceSales"
//                                             label="Sales"
//                                             value={settings.datePreferenceSales}
//                                             disabled={isSaving.datePreferenceSales}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Sales Return Date Preference */}
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="mb-2">
//                                         <label style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
//                                             Sales Return Entry
//                                         </label>
//                                         <DatePreferenceRadio
//                                             type="datePreferenceSalesReturn"
//                                             label="Sales Return"
//                                             value={settings.datePreferenceSalesReturn}
//                                             disabled={isSaving.datePreferenceSalesReturn}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Purchase Return Date Preference */}
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="mb-2">
//                                         <label style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
//                                             Purchase Return Entry
//                                         </label>
//                                         <DatePreferenceRadio
//                                             type="datePreferencePurchaseReturn"
//                                             label="Purchase Return"
//                                             value={settings.datePreferencePurchaseReturn}
//                                             disabled={isSaving.datePreferencePurchaseReturn}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Payment Date Preference */}
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="mb-2">
//                                         <label style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
//                                             Payment Entry
//                                         </label>
//                                         <DatePreferenceRadio
//                                             type="datePreferencePayment"
//                                             label="Payment"
//                                             value={settings.datePreferencePayment}
//                                             disabled={isSaving.datePreferencePayment}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Receipt Date Preference */}
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="mb-2">
//                                         <label style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
//                                             Receipt Entry
//                                         </label>
//                                         <DatePreferenceRadio
//                                             type="datePreferenceReceipt"
//                                             label="Receipt"
//                                             value={settings.datePreferenceReceipt}
//                                             disabled={isSaving.datePreferenceReceipt}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Journal Date Preference */}
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="mb-2">
//                                         <label style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
//                                             Journal Entry
//                                         </label>
//                                         <DatePreferenceRadio
//                                             type="datePreferenceJournal"
//                                             label="Journal"
//                                             value={settings.datePreferenceJournal}
//                                             disabled={isSaving.datePreferenceJournal}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Debit Note Date Preference */}
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="mb-2">
//                                         <label style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
//                                             Debit Note Entry
//                                         </label>
//                                         <DatePreferenceRadio
//                                             type="datePreferenceDebitNote"
//                                             label="Debit Note"
//                                             value={settings.datePreferenceDebitNote}
//                                             disabled={isSaving.datePreferenceDebitNote}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>
//                             {/* Credit Note Date Preference */}
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="mb-2">
//                                         <label style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
//                                             Credit Note Entry
//                                         </label>
//                                         <DatePreferenceRadio
//                                             type="datePreferenceCreditNote"
//                                             label="Credit Note"
//                                             value={settings.datePreferenceCreditNote}
//                                             disabled={isSaving.datePreferenceCreditNote}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>
//                             {/* Sales Quotation Date Preference */}
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="mb-2">
//                                         <label style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
//                                             Sales Quotation Entry
//                                         </label>
//                                         <DatePreferenceRadio
//                                             type="datePreferenceSalesQuotation"
//                                             label="Sales Quotation"
//                                             value={settings.datePreferenceSalesQuotation}
//                                             disabled={isSaving.datePreferenceSalesQuotation}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>
//                             {/* Stock Adjustment Date Preference */}
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="mb-2">
//                                         <label style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
//                                             Stock Adjustment Entry
//                                         </label>
//                                         <DatePreferenceRadio
//                                             type="datePreferenceStockAdjustment"
//                                             label="Stock Adjustment"
//                                             value={settings.datePreferenceStockAdjustment}
//                                             disabled={isSaving.datePreferenceStockAdjustment}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Store Management Section */}
//                     <div>
//                         <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#2c3e50', marginBottom: '0.5rem' }}>
//                             <i className="bi bi-shop me-2"></i> Store Management
//                         </h4>
//                         <div className="row g-2">
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="form-check d-flex align-items-center">
//                                         <input
//                                             className="form-check-input"
//                                             type="checkbox"
//                                             id="storeManagement"
//                                             checked={settings.storeManagement}
//                                             onChange={handleCheckboxChange('storeManagement')}
//                                             disabled={isSaving.storeManagement}
//                                             style={{ marginTop: '0', cursor: 'pointer' }}
//                                         />
//                                         <label className="form-check-label ms-2" htmlFor="storeManagement" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
//                                             Enable Store/Rack Management
//                                         </label>
//                                         {isSaving.storeManagement && (
//                                             <span className="spinner-border spinner-border-sm ms-2" role="status" style={{ width: '12px', height: '12px' }}></span>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Notification Toast */}
//             <NotificationToast
//                 show={notification.show}
//                 message={notification.message}
//                 type={notification.type}
//                 onClose={() => setNotification({ ...notification, show: false })}
//             />
//         </div>
//     );
// };

// export default VoucherConfiguration;

//----------------------------------------------------end1

// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
// import Header from '../Header';
// import NotificationToast from '../../NotificationToast';
// import api, { refreshToken } from '../../services/api';

// const VOUCHER_TYPES = [
//     {
//         key: 'sales',
//         label: 'Sales',
//         icon: 'bi-cart',
//         settings: {
//             roundOff: 'roundOffSales',
//             displayTransactions: 'displayTransactions',
//             datePreference: 'datePreferenceSales'
//         }
//     },
//     {
//         key: 'salesReturn',
//         label: 'Sales Return',
//         icon: 'bi-arrow-return-left',
//         settings: {
//             roundOff: 'roundOffSalesReturn',
//             displayTransactions: 'displayTransactionsForSalesReturn',
//             datePreference: 'datePreferenceSalesReturn'
//         }
//     },
//     {
//         key: 'purchase',
//         label: 'Purchase',
//         icon: 'bi-bag',
//         settings: {
//             roundOff: 'roundOffPurchase',
//             displayTransactions: 'displayTransactionsForPurchase',
//             datePreference: 'datePreferencePurchase'
//         }
//     },
//     {
//         key: 'purchaseReturn',
//         label: 'Purchase Return',
//         icon: 'bi-arrow-return-right',
//         settings: {
//             roundOff: 'roundOffPurchaseReturn',
//             displayTransactions: 'displayTransactionsForPurchaseReturn',
//             datePreference: 'datePreferencePurchaseReturn'
//         }
//     },
//     {
//         key: 'payment',
//         label: 'Payment',
//         icon: 'bi-cash-stack',
//         settings: {
//             roundOff: null,
//             displayTransactions: null,
//             datePreference: 'datePreferencePayment'
//         }
//     },
//     {
//         key: 'receipt',
//         label: 'Receipt',
//         icon: 'bi-receipt',
//         settings: {
//             roundOff: null,
//             displayTransactions: null,
//             datePreference: 'datePreferenceReceipt'
//         }
//     },
//     {
//         key: 'journal',
//         label: 'Journal',
//         icon: 'bi-journal-text',
//         settings: {
//             roundOff: null,
//             displayTransactions: null,
//             datePreference: 'datePreferenceJournal'
//         }
//     },
//     {
//         key: 'debitNote',
//         label: 'Debit Note',
//         icon: 'bi-file-earmark-minus',
//         settings: {
//             roundOff: null,
//             displayTransactions: null,
//             datePreference: 'datePreferenceDebitNote'
//         }
//     },
//     {
//         key: 'creditNote',
//         label: 'Credit Note',
//         icon: 'bi-file-earmark-plus',
//         settings: {
//             roundOff: null,
//             displayTransactions: null,
//             datePreference: 'datePreferenceCreditNote'
//         }
//     },
//     {
//         key: 'salesQuotation',
//         label: 'Sales Quotation',
//         icon: 'bi-file-earmark-text',
//         settings: {
//             roundOff: null,
//             displayTransactions: null,
//             datePreference: 'datePreferenceSalesQuotation'
//         }
//     },
//     {
//         key: 'stockAdjustment',
//         label: 'Stock Adjustment',
//         icon: 'bi-box-seam',
//         settings: {
//             roundOff: null,
//             displayTransactions: null,
//             datePreference: 'datePreferenceStockAdjustment'
//         }
//     }
// ];

// const VoucherConfiguration = () => {
//     const [settings, setSettings] = useState({
//         roundOffSales: false,
//         roundOffPurchase: false,
//         roundOffSalesReturn: false,
//         roundOffPurchaseReturn: false,
//         displayTransactions: false,
//         displayTransactionsForSalesReturn: false,
//         displayTransactionsForPurchase: false,
//         displayTransactionsForPurchaseReturn: false,
//         storeManagement: false,
//         // Date preferences - true = Voucher Last Date, false = System Date
//         datePreferencePurchase: false,
//         datePreferenceSales: false,
//         datePreferenceSalesReturn: false,
//         datePreferencePurchaseReturn: false,
//         datePreferencePayment: false,
//         datePreferenceReceipt: false,
//         datePreferenceJournal: false,
//         datePreferenceDebitNote: false,
//         datePreferenceCreditNote: false,
//         datePreferenceSalesQuotation: false,
//         datePreferenceStockAdjustment: false
//     });

//     const [isLoading, setIsLoading] = useState(true);
//     const [isSaving, setIsSaving] = useState({});
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success'
//     });

//     const navigate = useNavigate();

//     useEffect(() => {
//         fetchAllSettings();
//         fetchAllDatePreferences();
//     }, []);

//     const fetchAllSettings = async () => {
//         setIsLoading(true);

//         try {
//             // Fetch round off sales settings
//             const salesResponse = await api.get('/api/retailer/roundoff-sales');
//             if (salesResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     roundOffSales: salesResponse.data.data.settings.roundOffSales || false,
//                     roundOffPurchase: salesResponse.data.data.settings.roundOffPurchase || false,
//                     displayTransactions: salesResponse.data.data.settings.displayTransactions || false,
//                     storeManagement: salesResponse.data.data.settings.storeManagement || false
//                 }));
//             }

//             // Fetch sales return settings
//             const salesReturnResponse = await api.get('/api/retailer/roundoff-sales-return');
//             if (salesReturnResponse.data.success) {
//                 const settingsForSalesReturn = salesReturnResponse.data.data.settingsForSalesReturn;
//                 setSettings(prev => ({
//                     ...prev,
//                     roundOffSalesReturn: settingsForSalesReturn.roundOffSalesReturn || false,
//                     displayTransactionsForSalesReturn: settingsForSalesReturn.displayTransactionsForSalesReturn || false
//                 }));
//             }

//             // Fetch purchase settings
//             const purchaseResponse = await api.get('/api/retailer/roundoff-purchase');
//             if (purchaseResponse.data.success) {
//                 const settingsForPurchase = purchaseResponse.data.data.settingsForPurchase;
//                 setSettings(prev => ({
//                     ...prev,
//                     roundOffPurchase: settingsForPurchase.roundOffPurchase || false
//                 }));
//             }

//             // Fetch purchase return settings
//             const purchaseReturnResponse = await api.get('/api/retailer/roundoff-purchase-return');
//             if (purchaseReturnResponse.data.success) {
//                 const settingsForPurchaseReturn = purchaseReturnResponse.data.data.settingsForPurchaseReturn;
//                 setSettings(prev => ({
//                     ...prev,
//                     roundOffPurchaseReturn: settingsForPurchaseReturn.roundOffPurchaseReturn || false
//                 }));
//             }

//             // Fetch display settings for purchase
//             const displayPurchaseResponse = await api.get('/api/retailer/get-display-purchase-transactions');
//             if (displayPurchaseResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     displayTransactionsForPurchase: displayPurchaseResponse.data.data.displayTransactionsForPurchase || false
//                 }));
//             }

//             // Fetch display settings for purchase return
//             const displayPurchaseReturnResponse = await api.get('/api/retailer/get-display-purchase-return-transactions');
//             if (displayPurchaseReturnResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     displayTransactionsForPurchaseReturn: displayPurchaseReturnResponse.data.data.displayTransactionsForPurchaseReturn || false
//                 }));
//             }

//         } catch (err) {
//             console.error('Error fetching settings:', err);
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.error || 'Error fetching settings',
//                 type: 'error'
//             });
//             if (err.response?.status === 401) {
//                 navigate('/login');
//             }
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const fetchAllDatePreferences = async () => {
//         try {
//             // Fetch purchase date preference
//             const purchasePrefResponse = await api.get('/api/retailer/date-preference/purchase');
//             if (purchasePrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferencePurchase: purchasePrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }

//             // Fetch sales date preference
//             const salesPrefResponse = await api.get('/api/retailer/date-preference/sales');
//             if (salesPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceSales: salesPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }

//             // Fetch sales return date preference
//             const salesReturnPrefResponse = await api.get('/api/retailer/date-preference/sales-return');
//             if (salesReturnPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceSalesReturn: salesReturnPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }

//             // Fetch purchase return date preference
//             const purchaseReturnPrefResponse = await api.get('/api/retailer/date-preference/purchase-return');
//             if (purchaseReturnPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferencePurchaseReturn: purchaseReturnPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }

//             // Fetch payment date preference
//             const paymentPrefResponse = await api.get('/api/retailer/date-preference/payment');
//             if (paymentPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferencePayment: paymentPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }
//             // Fetch receipt date preference
//             const receiptPrefResponse = await api.get('/api/retailer/date-preference/receipt');
//             if (receiptPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceReceipt: receiptPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }

//             // Fetch journal date preference
//             const journalPrefResponse = await api.get('/api/retailer/date-preference/journal');
//             if (journalPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceJournal: journalPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }
//             // Fetch debit note date preference
//             const debitNotePrefResponse = await api.get('/api/retailer/date-preference/debit-note');
//             if (debitNotePrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceDebitNote: debitNotePrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }
//             // Fetch credit note date preference
//             const creditNotePrefResponse = await api.get('/api/retailer/date-preference/credit-note');
//             if (creditNotePrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceCreditNote: creditNotePrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }
//             // Fetch sales quotation date preference
//             const salesQuotationPrefResponse = await api.get('/api/retailer/date-preference/sales-quotation');
//             if (salesQuotationPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceSalesQuotation: salesQuotationPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }
//             // Fetch stock adjustment date preference
//             const stockAdjustmentPrefResponse = await api.get('/api/retailer/date-preference/stock-adjustment');
//             if (stockAdjustmentPrefResponse.data.success) {
//                 setSettings(prev => ({
//                     ...prev,
//                     datePreferenceStockAdjustment: stockAdjustmentPrefResponse.data.data.useVoucherLastDate || false
//                 }));
//             }
//         } catch (err) {
//             console.error('Error fetching date preferences:', err);
//         }
//     };

//     const updateDatePreference = async (type, useVoucherLastDate) => {
//         setIsSaving(prev => ({ ...prev, [type]: true }));

//         try {
//             let endpoint = '';
//             switch (type) {
//                 case 'datePreferencePurchase':
//                     endpoint = '/api/retailer/date-preference/purchase';
//                     break;
//                 case 'datePreferenceSales':
//                     endpoint = '/api/retailer/date-preference/sales';
//                     break;
//                 case 'datePreferenceSalesReturn':
//                     endpoint = '/api/retailer/date-preference/sales-return';
//                     break;
//                 case 'datePreferencePurchaseReturn':
//                     endpoint = '/api/retailer/date-preference/purchase-return';
//                     break;
//                 case 'datePreferencePayment':
//                     endpoint = '/api/retailer/date-preference/payment';
//                     break;
//                 case 'datePreferenceReceipt':
//                     endpoint = '/api/retailer/date-preference/receipt';
//                     break;
//                 case 'datePreferenceJournal':
//                     endpoint = '/api/retailer/date-preference/journal';
//                     break;
//                 case 'datePreferenceDebitNote':
//                     endpoint = '/api/retailer/date-preference/debit-note';
//                     break;
//                 case 'datePreferenceCreditNote':
//                     endpoint = '/api/retailer/date-preference/credit-note';
//                     break;
//                 case 'datePreferenceSalesQuotation':
//                     endpoint = '/api/retailer/date-preference/sales-quotation';
//                     break;
//                 case 'datePreferenceStockAdjustment':
//                     endpoint = '/api/retailer/date-preference/stock-adjustment';
//                     break;
//                 default:
//                     return;
//             }

//             const response = await api.post(endpoint, { useVoucherLastDate });

//             if (response.data.success) {
//                 setSettings(prev => ({ ...prev, [type]: useVoucherLastDate }));
//                 setNotification({
//                     show: true,
//                     message: `${getTypeLabel(type)} date preference updated successfully`,
//                     type: 'success'
//                 });
//             }
//         } catch (err) {
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.error || 'Error updating date preference',
//                 type: 'error'
//             });
//         } finally {
//             setIsSaving(prev => ({ ...prev, [type]: false }));
//         }
//     };

//     const getTypeLabel = (type) => {
//         const labels = {
//             datePreferencePurchase: 'Purchase',
//             datePreferenceSales: 'Sales',
//             datePreferenceSalesReturn: 'Sales Return',
//             datePreferencePurchaseReturn: 'Purchase Return',
//             datePreferencePayment: 'Payment',
//             datePreferenceReceipt: 'Receipt',
//             datePreferenceJournal: 'Journal',
//             datePreferenceDebitNote: 'Debit Note',
//             datePreferenceCreditNote: 'Credit Note',
//             datePreferenceSalesQuotation: 'Sales Quotation',
//             datePreferenceStockAdjustment: 'Stock Adjustment'
//         };
//         return labels[type] || type;
//     };

//     const updateSetting = async (settingName, value) => {
//         setIsSaving(prev => ({ ...prev, [settingName]: true }));

//         try {
//             let endpoint = '';
//             let payload = {};

//             switch (settingName) {
//                 case 'roundOffSales':
//                     endpoint = '/api/retailer/roundoff-sales';
//                     payload = { roundOffSales: value };
//                     break;
//                 case 'roundOffSalesReturn':
//                     endpoint = '/api/retailer/roundoff-sales-return';
//                     payload = { roundOffSalesReturn: value };
//                     break;
//                 case 'roundOffPurchase':
//                     endpoint = '/api/retailer/roundoff-purchase';
//                     payload = { roundOffPurchase: value };
//                     break;
//                 case 'roundOffPurchaseReturn':
//                     endpoint = '/api/retailer/roundoff-purchase-return';
//                     payload = { roundOffPurchaseReturn: value };
//                     break;
//                 case 'displayTransactions':
//                     endpoint = '/api/retailer/updateDisplayTransactionsForSales';
//                     payload = { displayTransactions: value };
//                     break;
//                 case 'displayTransactionsForSalesReturn':
//                     endpoint = '/api/retailer/updateDisplayTransactionsForSalesReturn';
//                     payload = { displayTransactionsForSalesReturn: value };
//                     break;
//                 case 'displayTransactionsForPurchase':
//                     endpoint = '/api/retailer/PurchaseTransactionDisplayUpdate';
//                     payload = { displayTransactionsForPurchase: value };
//                     break;
//                 case 'displayTransactionsForPurchaseReturn':
//                     endpoint = '/api/retailer/PurchaseReturnTransactionDisplayUpdate';
//                     payload = { displayTransactionsForPurchaseReturn: value };
//                     break;
//                 case 'storeManagement':
//                     endpoint = '/api/retailer/storemanagement';
//                     payload = { storeManagement: value };
//                     break;
//                 default:
//                     console.error('Unknown setting:', settingName);
//                     return;
//             }

//             const response = await api.post(endpoint, payload);

//             if (response.data.success) {
//                 setSettings(prev => ({ ...prev, [settingName]: value }));
//                 setNotification({
//                     show: true,
//                     message: response.data.message || 'Setting updated successfully',
//                     type: 'success'
//                 });
//             }
//         } catch (err) {
//             console.error('Error updating setting:', err);
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.error || err.response?.data?.message || 'Error updating setting',
//                 type: 'error'
//             });

//             if (err.response?.status === 401) {
//                 navigate('/login');
//             }
//         } finally {
//             setIsSaving(prev => ({ ...prev, [settingName]: false }));
//         }
//     };

//     const handleCheckboxChange = (settingName) => (e) => {
//         const newValue = e.target.checked;
//         updateSetting(settingName, newValue);
//     };

//     const DatePreferenceRadio = ({ type, label, value, disabled }) => (
//         <div className="d-flex gap-3">
//             <div className="form-check">
//                 <input
//                     type="radio"
//                     className="form-check-input"
//                     name={type}
//                     id={`${type}_system`}
//                     checked={!value}
//                     onChange={() => updateDatePreference(type, false)}
//                     disabled={disabled}
//                     style={{ marginTop: '0', cursor: 'pointer' }}
//                 />
//                 <label className="form-check-label ms-1" htmlFor={`${type}_system`} style={{ fontSize: '0.7rem', cursor: 'pointer' }}>
//                     System Date
//                 </label>
//             </div>
//             <div className="form-check">
//                 <input
//                     type="radio"
//                     className="form-check-input"
//                     name={type}
//                     id={`${type}_voucher`}
//                     checked={value}
//                     onChange={() => updateDatePreference(type, true)}
//                     disabled={disabled}
//                     style={{ marginTop: '0', cursor: 'pointer' }}
//                 />
//                 <label className="form-check-label ms-1" htmlFor={`${type}_voucher`} style={{ fontSize: '0.7rem', cursor: 'pointer' }}>
//                     Voucher Last Date
//                 </label>
//             </div>
//         </div>
//     );

//     if (isLoading) {
//         return (
//             <div className="container-fluid">
//                 <Header />
//                 <div className="text-center py-5">
//                     <div className="spinner-border" role="status">
//                         <span className="visually-hidden">Loading...</span>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                 <div className="card-header">
//                     <div className="d-flex justify-content-between align-items-center">
//                         <h2 className="card-title mb-0" style={{ fontSize: '1.1rem' }}>
//                             <i className="bi bi-gear me-2"></i>
//                             Voucher Configuration
//                         </h2>
//                     </div>
//                 </div>
//                 <div className="card-body p-2 p-md-3">

//                     {/* ─────────────────────────────────────────────── */}
//                     {/* Busy-style Voucher Configuration Table          */}
//                     {/* ─────────────────────────────────────────────── */}
//                     <div className="table-responsive">
//                         <table className="table table-sm align-middle mb-3" style={{ fontSize: '0.78rem' }}>
//                             <thead style={{ backgroundColor: '#f1f5f9' }}>
//                                 <tr>
//                                     <th style={{ width: '24%', fontWeight: '600', color: '#334155' }}>
//                                         Voucher Type
//                                     </th>
//                                     <th style={{ width: '26%', fontWeight: '600', color: '#334155' }}>
//                                         Date Preference
//                                     </th>
//                                     <th style={{ width: '16%', fontWeight: '600', color: '#334155', textAlign: 'center' }}>
//                                         Round Off
//                                     </th>
//                                     <th style={{ width: '22%', fontWeight: '600', color: '#334155', textAlign: 'center' }}>
//                                         Show Transactions
//                                     </th>
//                                     <th style={{ width: '12%', fontWeight: '600', color: '#334155', textAlign: 'center' }}>
//                                         Status
//                                     </th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {VOUCHER_TYPES.map(v => {
//                                     const dateKey = v.settings.datePreference;
//                                     const roundKey = v.settings.roundOff;
//                                     const displayKey = v.settings.displayTransactions;

//                                     const dateValue = dateKey ? settings[dateKey] : null;
//                                     const roundValue = roundKey ? settings[roundKey] : null;
//                                     const displayValue = displayKey ? settings[displayKey] : null;

//                                     const anySaving =
//                                         (dateKey && isSaving[dateKey]) ||
//                                         (roundKey && isSaving[roundKey]) ||
//                                         (displayKey && isSaving[displayKey]);

//                                     return (
//                                         <tr key={v.key} style={{ borderBottom: '1px solid #e2e8f0' }}>
//                                             {/* Voucher label */}
//                                             <td>
//                                                 <div className="d-flex align-items-center gap-2">
//                                                     <i className={`bi ${v.icon}`} style={{ color: '#475569' }}></i>
//                                                     <span style={{ fontWeight: '500', color: '#1e293b' }}>
//                                                         {v.label}
//                                                     </span>
//                                                     {anySaving && (
//                                                         <span
//                                                             className="spinner-border spinner-border-sm"
//                                                             role="status"
//                                                             style={{ width: '10px', height: '10px' }}
//                                                         ></span>
//                                                     )}
//                                                 </div>
//                                             </td>

//                                             {/* Date preference radio buttons */}
//                                             <td>
//                                                 {dateKey ? (
//                                                     <DatePreferenceRadio
//                                                         type={dateKey}
//                                                         label={v.label}
//                                                         value={dateValue}
//                                                         disabled={isSaving[dateKey]}
//                                                     />
//                                                 ) : (
//                                                     <span style={{ color: '#cbd5e1' }}>—</span>
//                                                 )}
//                                             </td>

//                                             {/* Round off checkbox */}
//                                             <td style={{ textAlign: 'center' }}>
//                                                 {roundKey ? (
//                                                     <input
//                                                         type="checkbox"
//                                                         className="form-check-input"
//                                                         checked={!!roundValue}
//                                                         onChange={handleCheckboxChange(roundKey)}
//                                                         disabled={isSaving[roundKey]}
//                                                         style={{ cursor: 'pointer' }}
//                                                     />
//                                                 ) : (
//                                                     <span style={{ color: '#cbd5e1' }}>—</span>
//                                                 )}
//                                             </td>

//                                             {/* Show transactions checkbox */}
//                                             <td style={{ textAlign: 'center' }}>
//                                                 {displayKey ? (
//                                                     <input
//                                                         type="checkbox"
//                                                         className="form-check-input"
//                                                         checked={!!displayValue}
//                                                         onChange={handleCheckboxChange(displayKey)}
//                                                         disabled={isSaving[displayKey]}
//                                                         style={{ cursor: 'pointer' }}
//                                                     />
//                                                 ) : (
//                                                     <span style={{ color: '#cbd5e1' }}>—</span>
//                                                 )}
//                                             </td>

//                                             {/* Compact status badge */}
//                                             <td style={{ textAlign: 'center' }}>
//                                                 {anySaving ? (
//                                                     <span className="badge bg-secondary" style={{ fontSize: '0.65rem' }}>
//                                                         Saving…
//                                                     </span>
//                                                 ) : (
//                                                     <span className="badge bg-success-subtle text-success-emphasis" style={{ fontSize: '0.65rem' }}>
//                                                         Ready
//                                                     </span>
//                                                 )}
//                                             </td>
//                                         </tr>
//                                     );
//                                 })}
//                             </tbody>
//                         </table>
//                     </div>

//                     {/* ─────────────────────────────────────────────── */}
//                     {/* Store Management — still a global setting      */}
//                     {/* ─────────────────────────────────────────────── */}
//                     <div className="mt-3">
//                         <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#2c3e50', marginBottom: '0.5rem' }}>
//                             <i className="bi bi-shop me-2"></i> Store Management
//                         </h4>
//                         <div className="row g-2">
//                             <div className="col-md-6 col-lg-3">
//                                 <div className="setting-item" style={{
//                                     padding: '0.5rem',
//                                     backgroundColor: '#f8f9fa',
//                                     borderRadius: '4px',
//                                     border: '1px solid #dee2e6'
//                                 }}>
//                                     <div className="form-check d-flex align-items-center">
//                                         <input
//                                             className="form-check-input"
//                                             type="checkbox"
//                                             id="storeManagement"
//                                             checked={settings.storeManagement}
//                                             onChange={handleCheckboxChange('storeManagement')}
//                                             disabled={isSaving.storeManagement}
//                                             style={{ marginTop: '0', cursor: 'pointer' }}
//                                         />
//                                         <label className="form-check-label ms-2" htmlFor="storeManagement" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
//                                             Enable Store/Rack Management
//                                         </label>
//                                         {isSaving.storeManagement && (
//                                             <span className="spinner-border spinner-border-sm ms-2" role="status" style={{ width: '12px', height: '12px' }}></span>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Notification Toast */}
//             <NotificationToast
//                 show={notification.show}
//                 message={notification.message}
//                 type={notification.type}
//                 onClose={() => setNotification({ ...notification, show: false })}
//             />
//         </div>
//     );
// };

// export default VoucherConfiguration;

//----------------------------------------------------end2

// VoucherConfiguration.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import api from '../../services/api';
import { FiSettings, FiRefreshCw, FiSave, FiCheckCircle, FiCalendar, FiSearch, FiFileText } from 'react-icons/fi';
import './VoucherConfiguration.css';

// ────────────────────────────────────────────────────────────
// Voucher type → settings-key mapping
// ────────────────────────────────────────────────────────────
const VOUCHER_TYPES = [
    {
        key: 'sales',
        label: 'Sales',
        icon: 'bi-cart',
        group: 'Sales',
        settings: {
            roundOff: 'roundOffSales',
            displayTransactions: 'displayTransactions',
            datePreference: 'datePreferenceSales'
        }
    },
    {
        key: 'salesReturn',
        label: 'Sales Return',
        icon: 'bi-arrow-return-left',
        group: 'Sales',
        settings: {
            roundOff: 'roundOffSalesReturn',
            displayTransactions: 'displayTransactionsForSalesReturn',
            datePreference: 'datePreferenceSalesReturn'
        }
    },
    {
        key: 'purchase',
        label: 'Purchase',
        icon: 'bi-bag',
        group: 'Purchase',
        settings: {
            roundOff: 'roundOffPurchase',
            displayTransactions: 'displayTransactionsForPurchase',
            datePreference: 'datePreferencePurchase'
        }
    },
    {
        key: 'purchaseReturn',
        label: 'Purchase Return',
        icon: 'bi-arrow-return-right',
        group: 'Purchase',
        settings: {
            roundOff: 'roundOffPurchaseReturn',
            displayTransactions: 'displayTransactionsForPurchaseReturn',
            datePreference: 'datePreferencePurchaseReturn'
        }
    },
    {
        key: 'payment',
        label: 'Payment',
        icon: 'bi-cash-stack',
        group: 'Accounts',
        settings: {
            roundOff: null,
            displayTransactions: null,
            datePreference: 'datePreferencePayment'
        }
    },
    {
        key: 'receipt',
        label: 'Receipt',
        icon: 'bi-receipt',
        group: 'Accounts',
        settings: {
            roundOff: null,
            displayTransactions: null,
            datePreference: 'datePreferenceReceipt'
        }
    },
    {
        key: 'journal',
        label: 'Journal',
        icon: 'bi-journal-text',
        group: 'Accounts',
        settings: {
            roundOff: null,
            displayTransactions: null,
            datePreference: 'datePreferenceJournal'
        }
    },
    {
        key: 'debitNote',
        label: 'Debit Note',
        icon: 'bi-file-earmark-minus',
        group: 'Accounts',
        settings: {
            roundOff: null,
            displayTransactions: null,
            datePreference: 'datePreferenceDebitNote'
        }
    },
    {
        key: 'creditNote',
        label: 'Credit Note',
        icon: 'bi-file-earmark-plus',
        group: 'Accounts',
        settings: {
            roundOff: null,
            displayTransactions: null,
            datePreference: 'datePreferenceCreditNote'
        }
    },
    {
        key: 'salesQuotation',
        label: 'Sales Quotation',
        icon: 'bi-file-earmark-text',
        group: 'Sales',
        settings: {
            roundOff: null,
            displayTransactions: null,
            datePreference: 'datePreferenceSalesQuotation'
        }
    },
    {
        key: 'stockAdjustment',
        label: 'Stock Adjustment',
        icon: 'bi-box-seam',
        group: 'Inventory',
        settings: {
            roundOff: null,
            displayTransactions: null,
            datePreference: 'datePreferenceStockAdjustment'
        }
    }
];

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
        storeManagement: false,
        datePreferencePurchase: false,
        datePreferenceSales: false,
        datePreferenceSalesReturn: false,
        datePreferencePurchaseReturn: false,
        datePreferencePayment: false,
        datePreferenceReceipt: false,
        datePreferenceJournal: false,
        datePreferenceDebitNote: false,
        datePreferenceCreditNote: false,
        datePreferenceSalesQuotation: false,
        datePreferenceStockAdjustment: false
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    const navigate = useNavigate();
    const searchRef = useRef(null);

    useEffect(() => {
        fetchAllSettings();
        fetchAllDatePreferences();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAllSettings = async () => {
        setIsLoading(true);
        try {
            const salesResponse = await api.get('/api/retailer/roundoff-sales');
            if (salesResponse.data.success) {
                setSettings(prev => ({
                    ...prev,
                    roundOffSales: salesResponse.data.data.settings.roundOffSales || false,
                    roundOffPurchase: salesResponse.data.data.settings.roundOffPurchase || false,
                    displayTransactions: salesResponse.data.data.settings.displayTransactions || false,
                    storeManagement: salesResponse.data.data.settings.storeManagement || false
                }));
            }

            const salesReturnResponse = await api.get('/api/retailer/roundoff-sales-return');
            if (salesReturnResponse.data.success) {
                const s = salesReturnResponse.data.data.settingsForSalesReturn;
                setSettings(prev => ({
                    ...prev,
                    roundOffSalesReturn: s.roundOffSalesReturn || false,
                    displayTransactionsForSalesReturn: s.displayTransactionsForSalesReturn || false
                }));
            }

            const purchaseResponse = await api.get('/api/retailer/roundoff-purchase');
            if (purchaseResponse.data.success) {
                const s = purchaseResponse.data.data.settingsForPurchase;
                setSettings(prev => ({
                    ...prev,
                    roundOffPurchase: s.roundOffPurchase || false
                }));
            }

            const purchaseReturnResponse = await api.get('/api/retailer/roundoff-purchase-return');
            if (purchaseReturnResponse.data.success) {
                const s = purchaseReturnResponse.data.data.settingsForPurchaseReturn;
                setSettings(prev => ({
                    ...prev,
                    roundOffPurchaseReturn: s.roundOffPurchaseReturn || false
                }));
            }

            const displayPurchaseResponse = await api.get('/api/retailer/get-display-purchase-transactions');
            if (displayPurchaseResponse.data.success) {
                setSettings(prev => ({
                    ...prev,
                    displayTransactionsForPurchase: displayPurchaseResponse.data.data.displayTransactionsForPurchase || false
                }));
            }

            const displayPurchaseReturnResponse = await api.get('/api/retailer/get-display-purchase-return-transactions');
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
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllDatePreferences = async () => {
        try {
            const map = [
                ['/api/retailer/date-preference/purchase', 'datePreferencePurchase'],
                ['/api/retailer/date-preference/sales', 'datePreferenceSales'],
                ['/api/retailer/date-preference/sales-return', 'datePreferenceSalesReturn'],
                ['/api/retailer/date-preference/purchase-return', 'datePreferencePurchaseReturn'],
                ['/api/retailer/date-preference/payment', 'datePreferencePayment'],
                ['/api/retailer/date-preference/receipt', 'datePreferenceReceipt'],
                ['/api/retailer/date-preference/journal', 'datePreferenceJournal'],
                ['/api/retailer/date-preference/debit-note', 'datePreferenceDebitNote'],
                ['/api/retailer/date-preference/credit-note', 'datePreferenceCreditNote'],
                ['/api/retailer/date-preference/sales-quotation', 'datePreferenceSalesQuotation'],
                ['/api/retailer/date-preference/stock-adjustment', 'datePreferenceStockAdjustment']
            ];
            for (const [endpoint, key] of map) {
                try {
                    const res = await api.get(endpoint);
                    if (res.data.success) {
                        setSettings(prev => ({ ...prev, [key]: res.data.data.useVoucherLastDate || false }));
                    }
                } catch (inner) {
                    console.warn('Date pref failed for', endpoint, inner.message);
                }
            }
        } catch (err) {
            console.error('Error fetching date preferences:', err);
        }
    };

    const getTypeLabel = useCallback((type) => {
        const labels = {
            datePreferencePurchase: 'Purchase',
            datePreferenceSales: 'Sales',
            datePreferenceSalesReturn: 'Sales Return',
            datePreferencePurchaseReturn: 'Purchase Return',
            datePreferencePayment: 'Payment',
            datePreferenceReceipt: 'Receipt',
            datePreferenceJournal: 'Journal',
            datePreferenceDebitNote: 'Debit Note',
            datePreferenceCreditNote: 'Credit Note',
            datePreferenceSalesQuotation: 'Sales Quotation',
            datePreferenceStockAdjustment: 'Stock Adjustment'
        };
        return labels[type] || type;
    }, []);

    const updateDatePreference = async (type, useVoucherLastDate) => {
        setIsSaving(prev => ({ ...prev, [type]: true }));
        try {
            const endpointMap = {
                datePreferencePurchase: '/api/retailer/date-preference/purchase',
                datePreferenceSales: '/api/retailer/date-preference/sales',
                datePreferenceSalesReturn: '/api/retailer/date-preference/sales-return',
                datePreferencePurchaseReturn: '/api/retailer/date-preference/purchase-return',
                datePreferencePayment: '/api/retailer/date-preference/payment',
                datePreferenceReceipt: '/api/retailer/date-preference/receipt',
                datePreferenceJournal: '/api/retailer/date-preference/journal',
                datePreferenceDebitNote: '/api/retailer/date-preference/debit-note',
                datePreferenceCreditNote: '/api/retailer/date-preference/credit-note',
                datePreferenceSalesQuotation: '/api/retailer/date-preference/sales-quotation',
                datePreferenceStockAdjustment: '/api/retailer/date-preference/stock-adjustment'
            };
            const endpoint = endpointMap[type];
            if (!endpoint) return;

            const response = await api.post(endpoint, { useVoucherLastDate });

            if (response.data.success) {
                setSettings(prev => ({ ...prev, [type]: useVoucherLastDate }));
                setNotification({
                    show: true,
                    message: `${getTypeLabel(type)} date preference updated successfully`,
                    type: 'success'
                });
            }
        } catch (err) {
            setNotification({
                show: true,
                message: err.response?.data?.error || 'Error updating date preference',
                type: 'error'
            });
        } finally {
            setIsSaving(prev => ({ ...prev, [type]: false }));
        }
    };

    const updateSetting = async (settingName, value) => {
        setIsSaving(prev => ({ ...prev, [settingName]: true }));
        try {
            let endpoint = '';
            let payload = {};

            switch (settingName) {
                case 'roundOffSales': endpoint = '/api/retailer/roundoff-sales'; payload = { roundOffSales: value }; break;
                case 'roundOffSalesReturn': endpoint = '/api/retailer/roundoff-sales-return'; payload = { roundOffSalesReturn: value }; break;
                case 'roundOffPurchase': endpoint = '/api/retailer/roundoff-purchase'; payload = { roundOffPurchase: value }; break;
                case 'roundOffPurchaseReturn': endpoint = '/api/retailer/roundoff-purchase-return'; payload = { roundOffPurchaseReturn: value }; break;
                case 'displayTransactions': endpoint = '/api/retailer/updateDisplayTransactionsForSales'; payload = { displayTransactions: value }; break;
                case 'displayTransactionsForSalesReturn': endpoint = '/api/retailer/updateDisplayTransactionsForSalesReturn'; payload = { displayTransactionsForSalesReturn: value }; break;
                case 'displayTransactionsForPurchase': endpoint = '/api/retailer/PurchaseTransactionDisplayUpdate'; payload = { displayTransactionsForPurchase: value }; break;
                case 'displayTransactionsForPurchaseReturn': endpoint = '/api/retailer/PurchaseReturnTransactionDisplayUpdate'; payload = { displayTransactionsForPurchaseReturn: value }; break;
                case 'storeManagement': endpoint = '/api/retailer/storemanagement'; payload = { storeManagement: value }; break;
                default:
                    console.error('Unknown setting:', settingName);
                    return;
            }

            const response = await api.post(endpoint, payload);
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
            setNotification({
                show: true,
                message: err.response?.data?.error || err.response?.data?.message || 'Error updating setting',
                type: 'error'
            });
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setIsSaving(prev => ({ ...prev, [settingName]: false }));
        }
    };

    const handleCheckboxChange = (settingName) => (e) => {
        updateSetting(settingName, e.target.checked);
    };

    const filteredVouchers = useMemo(() => {
        if (!searchQuery.trim()) return VOUCHER_TYPES;
        const q = searchQuery.toLowerCase();
        return VOUCHER_TYPES.filter(v =>
            v.label.toLowerCase().includes(q) ||
            v.group.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    const savingCount = Object.values(isSaving).filter(Boolean).length;

    if (isLoading) {
        return (
            <div className="vc-page">
                <Header />
                <div className="vc-shell">
                    <div className="vc-state">
                        <div className="spinner-border text-primary" role="status" />
                        <p>Loading voucher configuration…</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="vc-page">
            <Header />

            <div className="vc-shell">
                {/* Top Bar */}
                <div className="vc-topbar">
                    <div className="vc-topbar__left">
                        <div className="vc-topbar__icon"><FiSettings /></div>
                        <div>
                            <h1>Voucher Configuration</h1>
                            <small>Configure round off, transaction display &amp; date preferences per voucher type</small>
                        </div>
                    </div>
                    <div className="vc-topbar__actions">
                        <button
                            className="vc-btn-icon"
                            onClick={() => { fetchAllSettings(); fetchAllDatePreferences(); }}
                            title="Refresh"
                        >
                            <FiRefreshCw /> Refresh
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="vc-toolbar">
                    <div className="vc-field vc-field--search">
                        <label>Search</label>
                        <div className="vc-search-wrap">
                            <FiSearch className="vc-search-icon" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search voucher…"
                                autoComplete="off"
                            />
                            {searchQuery && (
                                <button className="vc-search-clear" onClick={() => setSearchQuery('')}>×</button>
                            )}
                        </div>
                    </div>

                    <div className="vc-toolbar-divider" />

                    <div className="vc-status-pill">
                        <span className="vc-status-dot" />
                        <span>{filteredVouchers.length} voucher{filteredVouchers.length === 1 ? '' : 's'}</span>
                    </div>

                    {savingCount > 0 && (
                        <div className="vc-status-pill vc-status-pill--saving">
                            <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }} />
                            <span>Saving {savingCount}…</span>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="vc-main">
                    {filteredVouchers.length === 0 ? (
                        <div className="vc-state">
                            <FiSearch size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>No matching vouchers</h3>
                            <p>Try a different search term.</p>
                        </div>
                    ) : (
                        <>
                            <div className="vc-main__bar">
                                <span><strong>{filteredVouchers.length}</strong> voucher types</span>
                                <span className="vc-main__bar-note">Changes save automatically</span>
                            </div>

                            <div className="vc-table-wrap">
                                <table className="vc-table">
                                    <thead>
                                        <tr>
                                            <th className="vc-col-voucher">Voucher Type</th>
                                            <th className="vc-col-date">Date Preference</th>
                                            <th className="vc-col-check">Round Off</th>
                                            <th className="vc-col-check">Show Transactions</th>
                                            <th className="vc-col-status">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredVouchers.map(v => {
                                            const dateKey = v.settings.datePreference;
                                            const roundKey = v.settings.roundOff;
                                            const displayKey = v.settings.displayTransactions;

                                            const dateValue = dateKey ? settings[dateKey] : null;
                                            const roundValue = roundKey ? settings[roundKey] : null;
                                            const displayValue = displayKey ? settings[displayKey] : null;

                                            const anySaving =
                                                (dateKey && isSaving[dateKey]) ||
                                                (roundKey && isSaving[roundKey]) ||
                                                (displayKey && isSaving[displayKey]);

                                            return (
                                                <tr key={v.key} className="vc-row">
                                                    <td className="vc-cell-voucher">
                                                        <div className="vc-voucher">
                                                            <div className="vc-voucher__icon">
                                                                <i className={`bi ${v.icon}`}></i>
                                                            </div>
                                                            <div className="vc-voucher__text">
                                                                <div className="vc-voucher__name">{v.label}</div>
                                                                <div className="vc-voucher__group">{v.group}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="vc-cell-date">
                                                        {dateKey ? (
                                                            <div className="vc-radio-group">
                                                                <label className={`vc-radio ${!dateValue ? 'vc-radio--active' : ''} ${isSaving[dateKey] ? 'vc-radio--disabled' : ''}`}>
                                                                    <input
                                                                        type="radio"
                                                                        name={dateKey}
                                                                        checked={!dateValue}
                                                                        onChange={() => updateDatePreference(dateKey, false)}
                                                                        disabled={isSaving[dateKey]}
                                                                    />
                                                                    <span className="vc-radio__dot" />
                                                                    <span className="vc-radio__label">System</span>
                                                                </label>
                                                                <label className={`vc-radio ${dateValue ? 'vc-radio--active' : ''} ${isSaving[dateKey] ? 'vc-radio--disabled' : ''}`}>
                                                                    <input
                                                                        type="radio"
                                                                        name={dateKey}
                                                                        checked={!!dateValue}
                                                                        onChange={() => updateDatePreference(dateKey, true)}
                                                                        disabled={isSaving[dateKey]}
                                                                    />
                                                                    <span className="vc-radio__dot" />
                                                                    <span className="vc-radio__label">Voucher Last</span>
                                                                </label>
                                                            </div>
                                                        ) : (
                                                            <span className="vc-dash">—</span>
                                                        )}
                                                    </td>

                                                    <td className="vc-cell-check">
                                                        {roundKey ? (
                                                            <label className="vc-switch">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!roundValue}
                                                                    onChange={handleCheckboxChange(roundKey)}
                                                                    disabled={isSaving[roundKey]}
                                                                />
                                                                <span className="vc-switch__track">
                                                                    <span className="vc-switch__thumb" />
                                                                </span>
                                                            </label>
                                                        ) : (
                                                            <span className="vc-dash">—</span>
                                                        )}
                                                    </td>

                                                    <td className="vc-cell-check">
                                                        {displayKey ? (
                                                            <label className="vc-switch">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!displayValue}
                                                                    onChange={handleCheckboxChange(displayKey)}
                                                                    disabled={isSaving[displayKey]}
                                                                />
                                                                <span className="vc-switch__track">
                                                                    <span className="vc-switch__thumb" />
                                                                </span>
                                                            </label>
                                                        ) : (
                                                            <span className="vc-dash">—</span>
                                                        )}
                                                    </td>

                                                    <td className="vc-cell-status">
                                                        {anySaving ? (
                                                            <span className="vc-badge vc-badge--saving">
                                                                <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }} />
                                                                Saving
                                                            </span>
                                                        ) : (
                                                            <span className="vc-badge vc-badge--ready">
                                                                <FiCheckCircle size={11} /> Ready
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Store Management Footer Card */}
                            <div className="vc-footer-card">
                                <div className="vc-footer-card__left">
                                    <div className="vc-footer-card__icon">
                                        <i className="bi bi-shop"></i>
                                    </div>
                                    <div>
                                        <div className="vc-footer-card__title">Store / Rack Management</div>
                                        <div className="vc-footer-card__subtitle">
                                            Enable store and rack tracking across all vouchers
                                        </div>
                                    </div>
                                </div>
                                <div className="vc-footer-card__right">
                                    <label className="vc-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.storeManagement}
                                            onChange={handleCheckboxChange('storeManagement')}
                                            disabled={isSaving.storeManagement}
                                        />
                                        <span className="vc-switch__track">
                                            <span className="vc-switch__thumb" />
                                        </span>
                                    </label>
                                    {isSaving.storeManagement && (
                                        <span className="spinner-border spinner-border-sm ms-2" role="status" style={{ width: 12, height: 12 }} />
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />
        </div>
    );
};

export default VoucherConfiguration;