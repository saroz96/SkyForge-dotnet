import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NepaliDate from 'nepali-date-converter';
import NotificationToast from '../../NotificationToast';
import Header from '../Header';
import AccountBalanceDisplay from './AccountBalanceDisplay';
import ProductModal from '../dashboard/modals/ProductModal';
import VirtualizedAccountList from '../../VirtualizedAccountList';
import useDebounce from '../../../hooks/useDebounce';

const AddPayment = () => {
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const [showProductModal, setShowProductModal] = useState(false);
    const transactionDateRef = useRef(null);

    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });

    const [dateErrors, setDateErrors] = useState({
        nepaliDate: ''
    });

    const [selectedAccountId, setSelectedAccountId] = useState('');

    const [formData, setFormData] = useState({
        nepaliDate: currentNepaliDate,
        billDate: new Date().toISOString().split('T')[0],
        paymentAccountId: '',
        accountId: '',
        debit: '',
        instType: 0, // N/A = 0
        instNo: '',
        description: '',
    });

    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    // Account search states
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);

    const accountSearchRef = useRef(null);
    const [cashAccounts, setCashAccounts] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [nextBillNumber, setNextBillNumber] = useState('');
    const [currentBillNumber, setCurrentBillNumber] = useState('');
    const [companyDateFormat, setCompanyDateFormat] = useState('nepali');
    const [showBankDetails, setShowBankDetails] = useState(false);
    const [error, setError] = useState(null);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
    const [showPaymentAccountDropdown, setShowPaymentAccountDropdown] = useState(false);

    // Print after save state
    const [printAfterSave, setPrintAfterSave] = useState(
        localStorage.getItem('printAfterSavePayment') === 'true' || false
    );

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

    // Function to get the current bill number (does NOT increment)
    const getCurrentBillNumber = async () => {
        try {
            const response = await api.get('/api/retailer/payments/current-number');
            return response.data.data.currentPaymentsBillNumber;
        } catch (error) {
            console.error('Error getting current bill number:', error);
            return null;
        }
    };

    // Fetch accounts from backend
    const fetchAccountsFromBackend = async (searchTerm = '', page = 1) => {
        try {
            setIsAccountSearching(true);

            const response = await api.get('/api/retailer/all/accounts/search', {
                params: {
                    search: searchTerm,
                    page: page,
                    limit: searchTerm.trim() ? 15 : 25,
                }
            });

            if (response.data.success) {
                if (page === 1) {
                    setAccounts(response.data.accounts);
                } else {
                    setAccounts(prev => [...prev, ...response.data.accounts]);
                }
                setHasMoreAccountResults(response.data.pagination.hasNextPage);
                setTotalAccounts(response.data.pagination.totalAccounts);
                setAccountSearchPage(page);

                if (searchTerm.trim() !== '') {
                    setAccountLastSearchQuery(searchTerm);
                    setAccountShouldShowLastSearchResults(true);
                }
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            setNotification({
                show: true,
                message: 'Error loading accounts',
                type: 'error'
            });
        } finally {
            setIsAccountSearching(false);
        }
    };

    // Fetch payment form data
    useEffect(() => {
        const fetchPaymentFormData = async () => {
            try {
                setIsLoading(true);

                // Get current bill number (does NOT increment)
                const currentBillNum = await getCurrentBillNumber();

                // Fetch form data
                const response = await api.get('/api/retailer/payments');
                const { data } = response.data;

                setCompany({
                    ...data.company,
                    dateFormat: data.company.dateFormat || 'nepali'
                });

                setCashAccounts(data.cashAccounts || []);
                setBankAccounts(data.bankAccounts || []);
                setCompanyDateFormat(data.companyDateFormat || 'nepali');
                setCurrentBillNumber(currentBillNum);
                setNextBillNumber(currentBillNum);

                // Set initial form data
                setFormData(prev => ({
                    ...prev,
                    paymentAccountId: data.cashAccounts[0]?.id || '',
                    nepaliDate: currentNepaliDate,
                    billDate: new Date().toISOString().split('T')[0],
                }));

                setIsInitialDataLoaded(true);
            } catch (err) {
                console.error('Error fetching payment form data:', err);
                setError(err.response?.data?.message || 'Failed to load payment form');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPaymentFormData();
    }, []);

    // Set focus on date input after initial load
    useEffect(() => {
        if (isInitialDataLoaded && transactionDateRef.current) {
            const timer = setTimeout(() => {
                transactionDateRef.current.focus();
            }, 50);

            return () => clearTimeout(timer);
        }
    }, [isInitialDataLoaded, company.dateFormat]);

    useEffect(() => {
        // Add F9 key handler
        const handleF9KeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleF9KeyDown);
        return () => {
            window.removeEventListener('keydown', handleF9KeyDown);
        };
    }, []);

    useEffect(() => {
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape' && showAccountModal) {
                e.preventDefault();
                handleAccountModalClose();
            } else if (e.key === 'Escape' && showAccountCreationModal) {
                e.preventDefault();
                handleAccountCreationModalClose();
            }
        };

        window.addEventListener('keydown', handleEscapeKey);

        return () => {
            window.removeEventListener('keydown', handleEscapeKey);
        };
    }, [showAccountModal, showAccountCreationModal]);

    useEffect(() => {
        const handleF6KeyForAccounts = (e) => {
            if (e.key === 'F6' && showAccountModal) {
                e.preventDefault();
                setShowAccountCreationModal(true);
                setShowAccountModal(false);
            }
        };

        window.addEventListener('keydown', handleF6KeyForAccounts);
        return () => {
            window.removeEventListener('keydown', handleF6KeyForAccounts);
        };
    }, [showAccountModal]);

    useEffect(() => {
        if (showAccountModal) {
            setAccountSearchQuery('');
            setAccountSearchPage(1);

            if (accountShouldShowLastSearchResults && accountLastSearchQuery.trim() !== '') {
                fetchAccountsFromBackend(accountLastSearchQuery, 1);
            } else {
                fetchAccountsFromBackend('', 1);
            }
        }
    }, [showAccountModal]);

    // Print after save handler
    const handlePrintAfterSaveChange = (e) => {
        const isChecked = e.target.checked;
        setPrintAfterSave(isChecked);
        localStorage.setItem('printAfterSavePayment', isChecked);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePaymentAccountChange = (e) => {
        const selectedValue = e.target.value;
        const selectedOption = e.target.options[e.target.selectedIndex];
        const isBankAccount = selectedOption.getAttribute('data-group') === 'bank';

        setShowBankDetails(isBankAccount);
        setFormData(prev => ({ ...prev, paymentAccountId: selectedValue }));
    };

    const resetAfterSave = async () => {
        try {
            // Get current bill number (this increments the counter)
            const currentBillNum = await getCurrentBillNumber();

            // Fetch other data
            const response = await api.get('/api/retailer/payments');
            const { data } = response.data;

            const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
            const currentRomanDate = new Date().toISOString().split('T')[0];

            setFormData({
                nepaliDate: currentNepaliDate,
                billDate: currentRomanDate,
                paymentAccountId: data.cashAccounts[0]?.id || '',
                accountId: '',
                debit: '',
                instType: 0,
                instNo: '',
                description: '',
            });

            setCashAccounts(data.cashAccounts || []);
            setBankAccounts(data.bankAccounts || []);
            setCompanyDateFormat(data.companyDateFormat || 'nepali');
            setCurrentBillNumber(currentBillNum);
            setNextBillNumber(currentBillNum);
            setShowBankDetails(false);
            setSelectedAccountId('');

            setTimeout(() => {
                if (transactionDateRef.current) {
                    transactionDateRef.current.focus();
                }
            }, 50);
        } catch (err) {
            console.error('Error resetting after save:', err);
            setNotification({
                show: true,
                message: 'Error refreshing form data',
                type: 'error'
            });
        }
    };

    const handleSubmit = async (print = false) => {
        setIsSaving(true);

        try {
            // Convert InstrumentType enum
            const instTypeValue = getInstrumentTypeValue(formData.instType);

            const payload = {
                nepaliDate: new Date(formData.nepaliDate).toISOString().split('T')[0],
                billDate: formData.billDate,
                paymentAccountId: formData.paymentAccountId,
                accountId: formData.accountId,
                debit: parseFloat(formData.debit) || 0,
                instType: instTypeValue,
                instNo: formData.instNo || '',
                description: formData.description || '',
                print: print || printAfterSave
            };

            const response = await api.post('/api/retailer/payments', payload);

            setNotification({
                show: true,
                message: 'Payment saved successfully!',
                type: 'success'
            });

            // If print was requested, fetch print data and print
            if ((print || printAfterSave) && response.data.data?.payment?.id) {
                try {
                    const printResponse = await api.get(`/api/retailer/payments/${response.data.data.payment.id}/print`);
                    printVoucherImmediately(printResponse.data.data);
                    await resetAfterSave();
                } catch (printError) {
                    console.error('Error fetching print data:', printError);
                    setNotification({
                        show: true,
                        message: 'Payment saved but failed to load print data',
                        type: 'warning'
                    });
                    await resetAfterSave();
                }
            } else {
                await resetAfterSave();
            }
        } catch (err) {
            console.error('Error saving payment:', err);
            setNotification({
                show: true,
                message: err.response?.data?.message || 'Failed to save payment',
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Helper function to convert instrument type to enum value
    const getInstrumentTypeValue = (type) => {
        // If type is already a number, return it directly
        if (typeof type === 'number') {
            return type;
        }

        // If type is a string, convert to lowercase and map
        if (typeof type === 'string') {
            switch (type.toLowerCase()) {
                case 'rtgs': return 1;
                case 'fonepay': return 2;
                case 'cheque': return 3;
                case 'connect-ips': return 4;
                case 'esewa': return 5;
                case 'khalti': return 6;
                case 'n/a':
                default: return 0;
            }
        }

        // Default return for any other type
        return 0;
    };

    const handleAccountSearch = (e) => {
        const searchText = e.target.value;
        setAccountSearchQuery(searchText);
        setAccountSearchPage(1);

        if (searchText.trim() !== '' && accountShouldShowLastSearchResults) {
            setAccountShouldShowLastSearchResults(false);
            setAccountLastSearchQuery('');
        }

        const timer = setTimeout(() => {
            fetchAccountsFromBackend(searchText, 1);
        }, 300);

        return () => clearTimeout(timer);
    };

    const handleAccountModalClose = () => {
        setShowAccountModal(false);
    };

    const handleAccountCreationModalClose = () => {
        setShowAccountCreationModal(false);
        setShowAccountModal(true);
        fetchAccountsFromBackend('', 1);
    };

    const selectAccount = (account) => {
        setFormData({
            ...formData,
            accountId: account.id,
            accountName: `${account.uniqueNumber || ''} ${account.name}`.trim(),
        });
        setSelectedAccountId(account.id);
        setShowAccountModal(false);

        // Focus on debit amount field after account selection
        setTimeout(() => {
            document.getElementById('debit')?.focus();
        }, 50);
    };

    const handleKeyDown = (e, currentFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const form = e.target.form;
            const inputs = Array.from(form.querySelectorAll('input, select, textarea')).filter(
                el => !el.hidden && !el.disabled && el.offsetParent !== null
            );
            const currentIndex = inputs.findIndex(input => input.id === currentFieldId);

            if (currentIndex > -1 && currentIndex < inputs.length - 1) {
                inputs[currentIndex + 1].focus();
            }
        }
    };

    const loadMoreAccounts = () => {
        if (!isAccountSearching) {
            fetchAccountsFromBackend(accountSearchQuery, accountSearchPage + 1);
        }
    };

    const printVoucherImmediately = (printData) => {
        // Create a temporary div to hold the print content
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);

        // Create the printable content
        tempDiv.innerHTML = `
        <div id="printableContent">
            <div class="print-voucher-container">
                <div class="print-voucher-header">
                    <div class="print-company-name">${printData.currentCompanyName}</div>
                    <div class="print-company-details">
                        ${printData.currentCompany?.address || ''}-${printData.currentCompany?.ward || ''}, ${printData.currentCompany?.city || ''}
                        <br />
                        Tel: ${printData.currentCompany?.phone || ''} | PAN: ${printData.currentCompany?.pan || 'N/A'}
                    </div>
                    <div class="print-voucher-title">PAYMENT VOUCHER</div>
                </div>

                <div class="print-voucher-details">
                    <div>
                        <div><strong>Vch. No:</strong> ${printData.payment.billNumber}</div>
                    </div>
                    <div>
                        <div><strong>Date:</strong> ${new Date(printData.payment.date).toLocaleDateString()}</div>
                    </div>
                </div>

                <table class="print-voucher-table">
                    <thead>
                        <tr>
                            <th>S.N</th>
                            <th>Particular</th>
                            <th>Debit Amount</th>
                            <th>Credit Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>${printData.payment.account?.name || 'N/A'}</td>
                            <td>${(printData.payment.debit || 0).toFixed(2)}</td>
                            <td>0.00</td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td>${printData.payment.paymentAccount?.name || 'N/A'}</td>
                            <td>0.00</td>
                            <td>${(printData.payment.debit || 0).toFixed(2)}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colSpan="2">Total</th>
                            <th>${(printData.payment.debit || 0).toFixed(2)}</th>
                            <th>${(printData.payment.debit || 0).toFixed(2)}</th>
                        </tr>
                    </tfoot>
                </table>

                <div style="margin-top: 3mm;">
                    <strong>Note:</strong> ${printData.payment.description || 'N/A'}
                </div>

                <div style="margin-top: 3mm;">
                    <div><strong>Mode of Payment:</strong> ${getInstrumentTypeName(printData.payment.instType) || 'N/A'}</div>
                    <div><strong>Inst No:</strong> ${printData.payment.instNo || 'N/A'}</div>
                </div>

                <div class="print-signature-area">
                    <div class="print-signature-box">
                        <div style="margin-bottom: 1mm;">
                            <strong>${printData.payment.user?.name || 'N/A'}</strong>
                        </div>
                        Prepared By
                    </div>
                    <div class="print-signature-box">
                        <div style="margin-bottom: 1mm;">&nbsp;</div>
                        Checked By
                    </div>
                    <div class="print-signature-box">
                        <div style="margin-bottom: 1mm;">&nbsp;</div>
                        Approved By
                    </div>
                </div>
            </div>
        </div>
    `;

        // Add print styles
        const styles = `
        @page {
            size: A4;
            margin: 5mm;
        }
        body {
            font-family: 'Arial Narrow', Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.2;
            color: #000;
            background: white;
            margin: 0;
            padding: 0;
        }
        .print-voucher-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 2mm;
        }
        .print-voucher-header {
            text-align: center;
            margin-bottom: 3mm;
            border-bottom: 1px dashed #000;
            padding-bottom: 2mm;
        }
        .print-voucher-title {
            font-size: 12pt;
            font-weight: bold;
            margin: 2mm 0;
            text-transform: uppercase;
            text-decoration: underline;
            letter-spacing: 1px;
        }
        .print-company-name {
            font-size: 16pt;
            font-weight: bold;
        }
        .print-company-details {
            font-size: 8pt;
            margin: 1mm 0;
        }
        .print-voucher-details {
            display: flex;
            justify-content: space-between;
            margin: 2mm 0;
            font-size: 8pt;
        }
        .print-voucher-table {
            width: 100%;
            border-collapse: collapse;
            margin: 3mm 0;
            font-size: 8pt;
        }
        .print-voucher-table thead {
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
        }
        .print-voucher-table th {
            background-color: transparent;
            border: 1px solid #000;
            padding: 1mm;
            text-align: left;
            font-weight: bold;
        }
        .print-voucher-table td {
            border: 1px solid #000;
            padding: 1mm;
        }
        .print-text-right {
            text-align: right;
        }
        .print-text-center {
            text-align: center;
        }
        .print-signature-area {
            display: flex;
            justify-content: space-between;
            margin-top: 5mm;
            font-size: 8pt;
        }
        .print-signature-box {
            text-align: center;
            width: 30%;
            border-top: 1px dashed #000;
            padding-top: 1mm;
            font-weight: bold;
        }
    `;

        // Create print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
        <html>
            <head>
                <title>Payment_Voucher_${printData.payment.billNumber}</title>
                <style>${styles}</style>
            </head>
            <body>
                ${tempDiv.innerHTML}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 200);
                    };
                </script>
            </body>
        </html>
    `);
        printWindow.document.close();

        // Clean up
        document.body.removeChild(tempDiv);
    };

    const getInstrumentTypeName = (type) => {
        switch (type) {
            case 1: return 'RTGS';
            case 2: return 'Fonepay';
            case 3: return 'Cheque';
            case 4: return 'Connect-Ips';
            case 5: return 'Esewa';
            case 6: return 'Khalti';
            case 0:
            default: return 'N/A';
        }
    };

    if (error) return <div className="alert alert-danger mt-5">{error}</div>;

    return (
        <div className="container-fluid">
            <Header />
            <div className="container mt-4 wow-form">
                <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                    <div className="card-header">
                        <div className="d-flex justify-content-between align-items-center">
                            <h2 className="card-title mb-0">
                                <i className="bi bi-file-text me-2"></i>
                                Payment Entry
                            </h2>
                        </div>
                    </div>

                    <div className="card-body p-2 p-md-3">
                        <form className="wow-form" id='billForm' onSubmit={(e) => {
                            e.preventDefault();
                            handleSubmit(false);
                        }}>
                            {/* Date and Basic Info Row */}
                            <div className="row g-2 mb-3">
                                {(company.dateFormat === 'nepali' || company.dateFormat === 'Nepali') ? (
                                    <>
                                        <div className="col-12 col-md-6 col-lg-2">
                                            <div className="position-relative">
                                                <input
                                                    type="text"
                                                    name="nepaliDate"
                                                    id="nepaliDate"
                                                    autoComplete='off'
                                                    autoFocus
                                                    className={`form-control form-control-sm no-date-icon ${dateErrors.nepaliDate ? 'is-invalid' : ''}`}
                                                    value={formData.nepaliDate}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        const sanitizedValue = value.replace(/[^0-9/-]/g, '');

                                                        if (sanitizedValue.length <= 10) {
                                                            setFormData({ ...formData, nepaliDate: sanitizedValue });
                                                            setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        const allowedKeys = [
                                                            'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                                                            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                                            'Home', 'End'
                                                        ];

                                                        if (!allowedKeys.includes(e.key) &&
                                                            !/^\d$/.test(e.key) &&
                                                            e.key !== '/' &&
                                                            e.key !== '-' &&
                                                            !e.ctrlKey && !e.metaKey) {
                                                            e.preventDefault();
                                                        }

                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const dateStr = e.target.value.trim();

                                                            if (!dateStr) {
                                                                const currentDate = new NepaliDate();
                                                                const correctedDate = currentDate.format('YYYY-MM-DD');
                                                                setFormData({
                                                                    ...formData,
                                                                    nepaliDate: correctedDate
                                                                });
                                                                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));

                                                                setNotification({
                                                                    show: true,
                                                                    message: 'Date required. Auto-corrected to current date.',
                                                                    type: 'warning',
                                                                    duration: 3000
                                                                });

                                                                handleKeyDown(e, 'nepaliDate');
                                                            } else if (dateErrors.nepaliDate) {
                                                                e.target.focus();
                                                            } else {
                                                                handleKeyDown(e, 'nepaliDate');
                                                            }
                                                        }
                                                    }}
                                                    onPaste={(e) => {
                                                        e.preventDefault();
                                                        const pastedData = e.clipboardData.getData('text');
                                                        const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
                                                        const newValue = formData.nepaliDate + cleanedData;
                                                        if (newValue.length <= 10) {
                                                            setFormData({ ...formData, nepaliDate: newValue });
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        try {
                                                            const dateStr = e.target.value.trim();
                                                            if (!dateStr) {
                                                                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                                                                return;
                                                            }

                                                            const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                            if (!nepaliDateFormat.test(dateStr)) {
                                                                const currentDate = new NepaliDate();
                                                                const correctedDate = currentDate.format('YYYY-MM-DD');
                                                                setFormData({
                                                                    ...formData,
                                                                    nepaliDate: correctedDate
                                                                });
                                                                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));

                                                                setNotification({
                                                                    show: true,
                                                                    message: 'Invalid date format. Auto-corrected to current date.',
                                                                    type: 'warning',
                                                                    duration: 3000
                                                                });
                                                                return;
                                                            }

                                                            const normalizedDateStr = dateStr.replace(/-/g, '/');
                                                            const [year, month, day] = normalizedDateStr.split('/').map(Number);

                                                            if (month < 1 || month > 12) {
                                                                throw new Error("Month must be between 1-12");
                                                            }
                                                            if (day < 1 || day > 32) {
                                                                throw new Error("Day must be between 1-32");
                                                            }

                                                            const nepaliDate = new NepaliDate(year, month - 1, day);

                                                            if (
                                                                nepaliDate.getYear() !== year ||
                                                                nepaliDate.getMonth() + 1 !== month ||
                                                                nepaliDate.getDate() !== day
                                                            ) {
                                                                const currentDate = new NepaliDate();
                                                                const correctedDate = currentDate.format('YYYY-MM-DD');
                                                                setFormData({
                                                                    ...formData,
                                                                    nepaliDate: correctedDate
                                                                });
                                                                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));

                                                                setNotification({
                                                                    show: true,
                                                                    message: 'Invalid Nepali date. Auto-corrected to current date.',
                                                                    type: 'warning',
                                                                    duration: 3000
                                                                });
                                                            } else {
                                                                setFormData({
                                                                    ...formData,
                                                                    nepaliDate: nepaliDate.format('YYYY-MM-DD')
                                                                });
                                                                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                                                            }
                                                        } catch (error) {
                                                            const currentDate = new NepaliDate();
                                                            const correctedDate = currentDate.format('YYYY-MM-DD');
                                                            setFormData({
                                                                ...formData,
                                                                nepaliDate: correctedDate
                                                            });
                                                            setDateErrors(prev => ({ ...prev, nepaliDate: '' }));

                                                            setNotification({
                                                                show: true,
                                                                message: error.message ? `${error.message}. Auto-corrected to current date.` : 'Invalid date. Auto-corrected to current date.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });
                                                        }
                                                    }}
                                                    placeholder="YYYY-MM-DD"
                                                    required
                                                    style={{
                                                        height: '26px',
                                                        fontSize: '0.875rem',
                                                        paddingTop: '0.75rem',
                                                        width: '100%'
                                                    }}
                                                />
                                                <label
                                                    className="position-absolute"
                                                    style={{
                                                        top: '-0.5rem',
                                                        left: '0.75rem',
                                                        fontSize: '0.75rem',
                                                        backgroundColor: 'white',
                                                        padding: '0 0.25rem',
                                                        color: '#6c757d',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    Date: <span className="text-danger">*</span>
                                                </label>
                                                {dateErrors.nepaliDate && (
                                                    <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                                        {dateErrors.nepaliDate}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>

                                        <div className="col-12 col-md-6 col-lg-2">
                                            <div className="position-relative">
                                                <input
                                                    type="date"
                                                    name="billDate"
                                                    id="billDate"
                                                    className="form-control form-control-sm"
                                                    value={formData.billDate}
                                                    autoFocus
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        const selectedDate = new Date(value);
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);

                                                        if (selectedDate > today) {
                                                            const todayStr = today.toISOString().split('T')[0];
                                                            setFormData({ ...formData, billDate: todayStr });

                                                            setNotification({
                                                                show: true,
                                                                message: 'Future date not allowed. Auto-corrected to today.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });
                                                        } else {
                                                            setFormData({ ...formData, billDate: value });
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const value = e.target.value;

                                                            if (!value) {
                                                                const today = new Date();
                                                                const todayStr = today.toISOString().split('T')[0];
                                                                setFormData({ ...formData, billDate: todayStr });

                                                                setNotification({
                                                                    show: true,
                                                                    message: 'Date required. Auto-corrected to today.',
                                                                    type: 'warning',
                                                                    duration: 3000
                                                                });
                                                            }

                                                            handleKeyDown(e, 'billDate');
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        const value = e.target.value;
                                                        if (!value) {
                                                            const today = new Date();
                                                            const todayStr = today.toISOString().split('T')[0];
                                                            setFormData({ ...formData, billDate: todayStr });

                                                            setNotification({
                                                                show: true,
                                                                message: 'Date required. Auto-corrected to today.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });
                                                        }
                                                    }}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    required
                                                    style={{
                                                        height: '26px',
                                                        fontSize: '0.875rem',
                                                        paddingTop: '0.75rem',
                                                        width: '100%'
                                                    }}
                                                />
                                                <label
                                                    className="position-absolute"
                                                    style={{
                                                        top: '-0.5rem',
                                                        left: '0.75rem',
                                                        fontSize: '0.75rem',
                                                        backgroundColor: 'white',
                                                        padding: '0 0.25rem',
                                                        color: '#6c757d',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    Date: <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="col-12 col-md-6 col-lg-2">
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            name="billNumber"
                                            id="billNumber"
                                            className="form-control form-control-sm"
                                            value={nextBillNumber}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleKeyDown(e, 'billNumber');
                                                }
                                            }}
                                            readOnly
                                            style={{
                                                height: '26px',
                                                fontSize: '0.875rem',
                                                paddingTop: '0.75rem',
                                                width: '100%'
                                            }}
                                        />
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Vch. No:
                                        </label>
                                    </div>
                                </div>

                                <div className="col-12 col-md-6 col-lg-2">
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            name="accountType"
                                            id="accountType"
                                            className="form-control form-control-sm"
                                            value="Payment"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleKeyDown(e, 'accountType');
                                                }
                                            }}
                                            readOnly
                                            style={{
                                                height: '26px',
                                                fontSize: '0.875rem',
                                                paddingTop: '0.75rem',
                                                width: '100%'
                                            }}
                                        />
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            A/c Type:
                                        </label>
                                    </div>
                                </div>

                                <div className="col-12 col-md-6 col-lg-2">
                                    <div className="position-relative">
                                        <select
                                            name="paymentAccountId"
                                            id="paymentAccountId"
                                            className="form-control form-control-sm"
                                            required
                                            value={formData.paymentAccountId}
                                            onChange={handlePaymentAccountChange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleKeyDown(e, 'paymentAccountId');
                                                }
                                            }}
                                            style={{
                                                height: '26px',
                                                fontSize: '0.875rem',
                                                paddingTop: '0.25rem',
                                                width: '100%'
                                            }}
                                        >
                                            <optgroup label="Cash">
                                                {cashAccounts.map(cashAccount => (
                                                    <option
                                                        key={cashAccount.id}
                                                        value={cashAccount.id}
                                                        data-group="cash"
                                                    >
                                                        {cashAccount.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Bank">
                                                {bankAccounts.map(bankAccount => (
                                                    <option
                                                        key={bankAccount.id}
                                                        value={bankAccount.id}
                                                        data-group="bank"
                                                    >
                                                        {bankAccount.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        </select>
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Payment Account: <span className="text-danger">*</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Party and Amount Row */}
                            <div className="row g-2 mb-3 align-items-end">
                                {/* Party Name Field */}
                                <div className="col-12 col-md-5">
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            id="account"
                                            name="account"
                                            className="form-control form-control-sm"
                                            autoComplete='off'
                                            placeholder=""
                                            value={formData.accountName || ''}
                                            onFocus={() => setShowAccountModal(true)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleKeyDown(e, 'account');
                                                }
                                            }}
                                            readOnly
                                            required
                                            style={{
                                                height: '26px',
                                                fontSize: '0.875rem',
                                                paddingTop: '0.75rem',
                                                width: '100%'
                                            }}
                                        />
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Party Name: <span className="text-danger">*</span>
                                        </label>
                                        <input type="hidden" id="accountId" name="accountId" value={formData.accountId} />
                                    </div>
                                </div>

                                {/* Amount Input */}
                                <div className="col-12 col-md-2">
                                    <div className="position-relative">
                                        <input
                                            type="number"
                                            name="debit"
                                            id="debit"
                                            className="form-control form-control-sm"
                                            placeholder="Debit Amount"
                                            value={formData.debit}
                                            onChange={handleInputChange}
                                            onFocus={(e) => e.target.select()}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (showBankDetails) {
                                                        document.getElementById('instType')?.focus();
                                                    } else {
                                                        document.getElementById('description')?.focus();
                                                    }
                                                }
                                            }}
                                            required
                                            min="0.01"
                                            step="0.01"
                                            style={{
                                                height: '26px',
                                                fontSize: '0.875rem',
                                                paddingTop: '0.75rem',
                                                width: '100%'
                                            }}
                                        />
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Amount:
                                        </label>
                                    </div>
                                </div>

                                {/* Institution Type and Number */}
                                {showBankDetails && (
                                    <div className="col-12 col-md-5">
                                        <div className="row g-2">
                                            <div className="col-4">
                                                <div className="position-relative">
                                                    <select
                                                        name="instType"
                                                        id="instType"
                                                        className="form-control form-control-sm"
                                                        value={formData.instType}
                                                        onChange={handleInputChange}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                document.getElementById('instNo')?.focus();
                                                            }
                                                        }}
                                                        style={{
                                                            height: '26px',
                                                            fontSize: '0.875rem',
                                                            paddingTop: '0.25rem',
                                                            width: '100%'
                                                        }}
                                                    >
                                                        <option value="0">N/A</option>
                                                        <option value="1">RTGS</option>
                                                        <option value="2">Fonepay</option>
                                                        <option value="3">Cheque</option>
                                                        <option value="4">Connect-Ips</option>
                                                        <option value="5">Esewa</option>
                                                        <option value="6">Khalti</option>
                                                    </select>
                                                    <label
                                                        className="position-absolute"
                                                        style={{
                                                            top: '-0.5rem',
                                                            left: '0.75rem',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: 'white',
                                                            padding: '0 0.25rem',
                                                            color: '#6c757d',
                                                            fontWeight: '500'
                                                        }}
                                                    >
                                                        Inst. Type
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="col-6">
                                                <div className="position-relative">
                                                    <input
                                                        type="text"
                                                        name="instNo"
                                                        id="instNo"
                                                        className="form-control form-control-sm"
                                                        value={formData.instNo}
                                                        onChange={handleInputChange}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                document.getElementById('description')?.focus();
                                                            }
                                                        }}
                                                        autoComplete='off'
                                                        style={{
                                                            height: '26px',
                                                            fontSize: '0.875rem',
                                                            paddingTop: '0.75rem',
                                                            width: '100%'
                                                        }}
                                                    />
                                                    <label
                                                        className="position-absolute"
                                                        style={{
                                                            top: '-0.5rem',
                                                            left: '0.75rem',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: 'white',
                                                            padding: '0 0.25rem',
                                                            color: '#6c757d',
                                                            fontWeight: '500'
                                                        }}
                                                    >
                                                        Inst. No.
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Account Balance Display */}
                            {formData.accountId && (
                                <div className="row g-2 mb-3">
                                    <div className="col-12">
                                        <div className="position-relative">
                                            <div
                                                className="form-control form-control-sm"
                                                style={{
                                                    height: '26px',
                                                    fontSize: '0.875rem',
                                                    paddingTop: '0.4rem',
                                                    width: '100%',
                                                    border: '1px solid #ced4da',
                                                    borderRadius: '0.375rem',
                                                    overflow: 'hidden',
                                                    whiteSpace: 'nowrap',
                                                    backgroundColor: '#f8f9fa'
                                                }}
                                            >
                                                <AccountBalanceDisplay
                                                    accountId={formData.accountId}
                                                    api={api}
                                                    newTransactionAmount={parseFloat(formData.debit) || 0}
                                                    compact={true}
                                                    transactionType="payment"
                                                    dateFormat={companyDateFormat}
                                                    style={{
                                                        fontSize: '0.875rem',
                                                        lineHeight: '1',
                                                        margin: '0',
                                                        padding: '0',
                                                        display: 'inline-block',
                                                        verticalAlign: 'middle'
                                                    }}
                                                />
                                            </div>
                                            <label
                                                className="position-absolute"
                                                style={{
                                                    top: '-0.5rem',
                                                    left: '0.75rem',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: 'white',
                                                    padding: '0 0.25rem',
                                                    color: '#6c757d',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Account Balance:
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Description and Action Buttons */}
                            <div className="row g-2 mb-3 align-items-center">
                                <div className="col-12 col-md-8">
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            name="description"
                                            id="description"
                                            placeholder="Description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    document.getElementById('saveBill')?.focus();
                                                }
                                            }}
                                            autoComplete='off'
                                            style={{
                                                height: '26px',
                                                fontSize: '0.875rem',
                                                paddingTop: '0.75rem',
                                                width: '100%'
                                            }}
                                        />
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Description:
                                        </label>
                                    </div>
                                </div>

                                <div className="col-12 col-md-4">
                                    <div className="d-flex align-items-center justify-content-end gap-3">
                                        {/* Print After Save Checkbox */}
                                        <div className="form-check mb-0 d-flex align-items-center">
                                            <input
                                                className="form-check-input mt-0"
                                                type="checkbox"
                                                id="printAfterSave"
                                                checked={printAfterSave}
                                                onChange={handlePrintAfterSaveChange}
                                                style={{
                                                    height: '14px',
                                                    width: '14px'
                                                }}
                                            />
                                            <label
                                                className="form-check-label ms-2"
                                                htmlFor="printAfterSave"
                                                style={{
                                                    fontSize: '0.8rem',
                                                    marginBottom: '0'
                                                }}
                                            >
                                                Print after save
                                            </label>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="d-flex gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                                onClick={resetAfterSave}
                                                disabled={isSaving}
                                                style={{
                                                    height: '26px',
                                                    padding: '0 12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                <i className="bi bi-arrow-counterclockwise me-1" style={{ fontSize: '0.9rem' }}></i> Reset
                                            </button>

                                            <button
                                                type="submit"
                                                className="btn btn-primary btn-sm d-flex align-items-center"
                                                id="saveBill"
                                                disabled={isSaving}
                                                style={{
                                                    height: '26px',
                                                    padding: '0 16px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{ width: '10px', height: '10px' }}></span>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-save me-1" style={{ fontSize: '0.9rem' }}></i> Save
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Account Modal */}
            {showAccountModal && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
                    <div
                        className="modal fade show"
                        tabIndex="-1"
                        style={{
                            display: 'block',
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1050
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                handleAccountModalClose();
                            }
                        }}
                    >
                        <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '70%' }}>
                            <div className="modal-content" style={{ height: '400px' }}>
                                <div className="modal-header py-1">
                                    <h5 className="modal-title" id="accountModalLabel" style={{ fontSize: '0.9rem' }}>
                                        Select an Account
                                    </h5>
                                    <small className="ms-auto text-muted" style={{ fontSize: '0.7rem' }}>
                                        {totalAccounts > 0 ? `${accounts.length} of ${totalAccounts} accounts shown` : 'Loading accounts...'}
                                    </small>
                                    <button type="button" className="btn-close" onClick={handleAccountModalClose}></button>
                                </div>
                                <div className="p-2 bg-white sticky-top">
                                    <input
                                        type="text"
                                        id="searchAccount"
                                        className="form-control form-control-sm"
                                        placeholder="Search Account... (Press F6 to create new account)"
                                        autoFocus
                                        autoComplete='off'
                                        value={accountSearchQuery}
                                        onChange={handleAccountSearch}
                                        onKeyDown={(e) => {
                                            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                const firstAccountItem = document.querySelector('.account-item');
                                                if (firstAccountItem) {
                                                    firstAccountItem.focus();
                                                }
                                            } else if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const firstAccountItem = document.querySelector('.account-item.active');
                                                if (firstAccountItem) {
                                                    const accountId = firstAccountItem.getAttribute('data-account-id');
                                                    const account = accounts.find(a => a.id === accountId);
                                                    if (account) {
                                                        selectAccount(account);
                                                    }
                                                }
                                            } else if (e.key === 'F6') {
                                                e.preventDefault();
                                                setShowAccountCreationModal(true);
                                                setShowAccountModal(false);
                                            }
                                        }}
                                        ref={accountSearchRef}
                                        style={{
                                            height: '24px',
                                            fontSize: '0.75rem',
                                            padding: '0.25rem 0.5rem'
                                        }}
                                    />
                                </div>
                                <div className="modal-body p-0">
                                    <div style={{ height: 'calc(400px - 120px)' }}>
                                        <VirtualizedAccountList
                                            accounts={accounts}
                                            onAccountClick={(account) => {
                                                selectAccount(account);
                                            }}
                                            searchRef={accountSearchRef}
                                            hasMore={hasMoreAccountResults}
                                            isSearching={isAccountSearching}
                                            onLoadMore={loadMoreAccounts}
                                            totalAccounts={totalAccounts}
                                            page={accountSearchPage}
                                            searchQuery={accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Account Creation Modal */}
            {showAccountCreationModal && (
                <div className="modal fade show" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)' }}>
                    <div className="modal-dialog modal-fullscreen">
                        <div className="modal-content" style={{ height: '95vh', margin: '2.5vh auto' }}>
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">Create New Account</h5>
                                <div className="d-flex align-items-center">
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={handleAccountCreationModalClose}
                                    ></button>
                                </div>
                            </div>
                            <div className="modal-body p-0">
                                <iframe
                                    src="/retailer/accounts"
                                    title="Account Creation"
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                />
                            </div>
                            <div className="modal-footer bg-light">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleAccountCreationModalClose}
                                >
                                    <i className="bi bi-arrow-left me-2"></i>Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />

            {/* Product modal */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}
        </div>
    );
};

export default AddPayment;