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
    // Add near your other state declarations (around line 60-80)
    const [useVoucherLastDateForPayment, setUseVoucherLastDateForPayment] = useState(false);
    const [lastPaymentDate, setLastPaymentDate] = useState(null);
    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });

    const [dateErrors, setDateErrors] = useState({
        nepaliDate: ''
    });

    const [selectedAccountId, setSelectedAccountId] = useState('');

    // Form data - maintains same structure but internally maps to entries
    const [formData, setFormData] = useState({
        nepaliDate: currentNepaliDate,
        billDate: new Date().toISOString().split('T')[0],
        paymentAccountId: '',
        accountId: '',
        amount: '',
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

            const response = await api.get('/api/retailer/all/accounts/search/except-cash/bank', {
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

    // Fetch date preference setting from backend for Payment
    const fetchDatePreference = async () => {
        try {
            console.log('=== fetchDatePreferenceForPayment CALLED ===');
            const response = await api.get('/api/retailer/date-preference/payment');
            console.log('Date preference response:', response.data);

            if (response.data.success) {
                const useVoucherDate = response.data.data.useVoucherLastDate;
                console.log('useVoucherLastDateForPayment value from API:', useVoucherDate);
                setUseVoucherLastDateForPayment(useVoucherDate);
                return useVoucherDate;
            }
            return false;
        } catch (error) {
            console.error('Error fetching date preference:', error);
            return false;
        }
    };

    // Fetch last payment date from backend
    const fetchLastPaymentDate = async () => {
        try {
            console.log('=== fetchLastPaymentDate CALLED ===');

            // Use the endpoint: /api/retailer/last-payment-date
            const response = await api.get('/api/retailer/last-payment-date');
            console.log('Last payment date response:', response.data);

            if (response.data.success && response.data.data) {
                const data = response.data.data;
                const isNepaliFormat = company.dateFormat === 'nepali' || company.dateFormat === 'Nepali';

                // Get the appropriate date based on company format
                let lastDate = null;
                if (isNepaliFormat) {
                    // Use Nepali date field from response
                    lastDate = data.nepaliDate;
                    console.log('Using Nepali date field:', lastDate);
                } else {
                    // Use English date field from response
                    lastDate = data.date;
                    console.log('Using English date field:', lastDate);
                }

                if (lastDate) {
                    // Format the date (it should already be in YYYY-MM-DD format from backend)
                    let formattedDate = lastDate;
                    if (typeof lastDate === 'string' && lastDate.includes('T')) {
                        formattedDate = lastDate.split('T')[0];
                    }
                    console.log('Formatted last payment date:', formattedDate);
                    setLastPaymentDate(formattedDate);
                    return formattedDate;
                }
            }

            console.log('No last payment date found - returning null');
            return null;
        } catch (error) {
            console.error('Error fetching last payment date:', error);
            return null;
        }
    };

    useEffect(() => {
        const fetchPaymentFormData = async () => {
            try {
                setIsLoading(true);

                // Get current bill number (does NOT increment)
                const currentBillNum = await getCurrentBillNumber();

                // Fetch form data
                const response = await api.get('/api/retailer/payments');
                const { data } = response.data;

                // Set company settings FIRST (needed for date format)
                const isNepaliFormat = data.company.dateFormat === 'nepali' ||
                    data.company.dateFormat === 'Nepali';

                setCompany({
                    ...data.company,
                    dateFormat: data.company.dateFormat || 'nepali',
                    vatEnabled: data.company.vatEnabled || true
                });

                setCashAccounts(data.cashAccounts || []);
                setBankAccounts(data.bankAccounts || []);
                setCompanyDateFormat(data.companyDateFormat || 'nepali');

                // Fetch date preference (useVoucherLastDate setting from backend)
                const useVoucherDate = await fetchDatePreference();

                // Fetch last payment date if needed
                let lastDate = null;
                if (useVoucherDate) {
                    lastDate = await fetchLastPaymentDate();
                }

                let transactionDate = '';
                let invoiceDate = '';

                console.log('Setting dates - useVoucherDate:', useVoucherDate, 'lastDate:', lastDate);

                // Set dates based on preference
                if (useVoucherDate && lastDate) {
                    // Use last voucher date
                    if (isNepaliFormat) {
                        transactionDate = lastDate;
                        invoiceDate = lastDate;
                    } else {
                        transactionDate = lastDate;
                        invoiceDate = lastDate;
                    }
                    console.log('Using LAST VOUCHER date:', { transactionDate, invoiceDate });
                } else {
                    // Use current system date
                    if (isNepaliFormat) {
                        transactionDate = currentNepaliDate;
                        invoiceDate = currentNepaliDate;
                    } else {
                        const today = new Date().toISOString().split('T')[0];
                        transactionDate = today;
                        invoiceDate = today;
                    }
                    console.log('Using SYSTEM date:', { transactionDate, invoiceDate });
                }

                setCurrentBillNumber(currentBillNum);
                setNextBillNumber(currentBillNum);

                // Set initial form data with the determined dates
                setFormData(prev => ({
                    ...prev,
                    paymentAccountId: data.cashAccounts[0]?.id || '',
                    amount: '',
                    nepaliDate: isNepaliFormat ? transactionDate : '',
                    billDate: !isNepaliFormat ? invoiceDate : '',
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

    // Fetch payment form data
    // useEffect(() => {
    //     const fetchPaymentFormData = async () => {
    //         try {
    //             setIsLoading(true);

    //             // Get current bill number (does NOT increment)
    //             const currentBillNum = await getCurrentBillNumber();

    //             // Fetch form data
    //             const response = await api.get('/api/retailer/payments');
    //             const { data } = response.data;

    //             setCompany({
    //                 ...data.company,
    //                 dateFormat: data.company.dateFormat || 'nepali'
    //             });

    //             setCashAccounts(data.cashAccounts || []);
    //             setBankAccounts(data.bankAccounts || []);
    //             setCompanyDateFormat(data.companyDateFormat || 'nepali');
    //             setCurrentBillNumber(currentBillNum);
    //             setNextBillNumber(currentBillNum);

    //             // Set initial form data
    //             setFormData(prev => ({
    //                 ...prev,
    //                 paymentAccountId: data.cashAccounts[0]?.id || '',
    //                 amount: '',
    //                 nepaliDate: currentNepaliDate,
    //                 billDate: new Date().toISOString().split('T')[0],
    //             }));

    //             setIsInitialDataLoaded(true);
    //         } catch (err) {
    //             console.error('Error fetching payment form data:', err);
    //             setError(err.response?.data?.message || 'Failed to load payment form');
    //         } finally {
    //             setIsLoading(false);
    //         }
    //     };

    //     fetchPaymentFormData();
    // }, []);

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

    // const resetAfterSave = async () => {
    //     try {
    //         // Get current bill number (this increments the counter)
    //         const currentBillNum = await getCurrentBillNumber();

    //         // Fetch other data
    //         const response = await api.get('/api/retailer/payments');
    //         const { data } = response.data;

    //         const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    //         const currentRomanDate = new Date().toISOString().split('T')[0];

    //         setFormData({
    //             nepaliDate: currentNepaliDate,
    //             billDate: currentRomanDate,
    //             paymentAccountId: data.cashAccounts[0]?.id || '',
    //             accountId: '',
    //             amount: '',
    //             instType: 0,
    //             instNo: '',
    //             description: '',
    //         });

    //         setCashAccounts(data.cashAccounts || []);
    //         setBankAccounts(data.bankAccounts || []);
    //         setCompanyDateFormat(data.companyDateFormat || 'nepali');
    //         setCurrentBillNumber(currentBillNum);
    //         setNextBillNumber(currentBillNum);
    //         setShowBankDetails(false);
    //         setSelectedAccountId('');

    //         setTimeout(() => {
    //             if (transactionDateRef.current) {
    //                 transactionDateRef.current.focus();
    //             }
    //         }, 50);
    //     } catch (err) {
    //         console.error('Error resetting after save:', err);
    //         setNotification({
    //             show: true,
    //             message: 'Error refreshing form data',
    //             type: 'error'
    //         });
    //     }
    // };

    const resetAfterSave = async () => {
        try {
            // Get current bill number (this increments the counter)
            const currentBillNum = await getCurrentBillNumber();

            // Fetch other data
            const response = await api.get('/api/retailer/payments');
            const { data } = response.data;

            const isNepaliFormat = data.company.dateFormat === 'nepali' ||
                data.company.dateFormat === 'Nepali';

            // Fetch current date preference (don't rely on state, fetch fresh)
            const useVoucherDate = await fetchDatePreference();

            // Fetch last payment date if needed
            let lastDate = null;
            if (useVoucherDate) {
                lastDate = await fetchLastPaymentDate();
            }

            let transactionDate = '';
            let invoiceDate = '';

            console.log('resetAfterSave - useVoucherDate:', useVoucherDate, 'lastDate:', lastDate);

            // Set dates based on preference
            if (useVoucherDate && lastDate) {
                if (isNepaliFormat) {
                    transactionDate = lastDate;
                    invoiceDate = lastDate;
                } else {
                    transactionDate = lastDate;
                    invoiceDate = lastDate;
                }
                console.log('resetAfterSave - Using LAST VOUCHER date:', { transactionDate, invoiceDate });
            } else {
                if (isNepaliFormat) {
                    transactionDate = currentNepaliDate;
                    invoiceDate = currentNepaliDate;
                } else {
                    const today = new Date().toISOString().split('T')[0];
                    transactionDate = today;
                    invoiceDate = today;
                }
                console.log('resetAfterSave - Using SYSTEM date:', { transactionDate, invoiceDate });
            }

            setFormData({
                nepaliDate: isNepaliFormat ? transactionDate : '',
                billDate: !isNepaliFormat ? invoiceDate : '',
                paymentAccountId: data.cashAccounts[0]?.id || '',
                accountId: '',
                amount: '',
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
            const amount = parseFloat(formData.amount) || 0;

            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            if (!formData.paymentAccountId) {
                throw new Error('Payment account is required');
            }

            if (!formData.accountId) {
                throw new Error('Party account is required');
            }

            const parseDate = (dateString) => {
                if (!dateString) return new Date().toISOString();

                // If it's already a valid date string in YYYY-MM-DD format
                if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                    // Create date at UTC to avoid timezone issues
                    const date = new Date(dateString);
                    date.setUTCHours(0, 0, 0, 0);
                    return date.toISOString();
                }
                return new Date(dateString).toISOString();
            };

            const payload = {
                // nepaliDate: new Date(formData.nepaliDate).toISOString().split('T')[0],
                // date: formData.billDate,
                nepaliDate: parseDate(formData.nepaliDate),
                date: parseDate(formData.billDate),
                description: formData.description || '',
                entries: [
                    {
                        accountId: formData.accountId,           // Party Account (Sundry Debtors/Creditors) - DEBIT (money going out)
                        entryType: "Debit",
                        amount: amount,
                        description: formData.description || '',
                        instType: null,
                        instNo: '',
                        bankAcc: '',
                        referenceNumber: ''
                    },
                    {
                        accountId: formData.paymentAccountId,    // Payment Account (Cash/Bank) - CREDIT (money coming in)
                        entryType: "Credit",
                        amount: amount,
                        description: formData.description || '',
                        instType: showBankDetails ? parseInt(formData.instType) : 0,
                        instNo: formData.instNo || '',
                        bankAcc: '',
                        referenceNumber: ''
                    }
                ],
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
                message: err.response?.data?.error || err.message || 'Failed to save payment',
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
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

        // Focus on amount field after account selection
        setTimeout(() => {
            document.getElementById('amount')?.focus();
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

        // Get debit and credit entries from print data
        const debitEntries = printData.debitEntries || [];
        const creditEntries = printData.creditEntries || [];

        let rows = '';
        let totalDebit = 0;
        let totalCredit = 0;
        let rowNumber = 1;

        // Add debit entries
        debitEntries.forEach(entry => {
            rows += `
                <tr>
                    <td class="print-text-center">${rowNumber++}</td>
                    <td>
                        ${entry.accountName}
                        ${entry.referenceNumber ? `<small class="d-block text-muted">Ref: ${entry.referenceNumber}</small>` : ''}
                    </td>
                    <td class="print-text-right">${entry.amount.toFixed(2)}</td>
                    <td class="print-text-right">0.00</td>
                </tr>
            `;
            totalDebit += entry.amount;
        });

        // Add credit entries
        creditEntries.forEach(entry => {
            rows += `
                <tr>
                    <td class="print-text-center">${rowNumber++}</td>
                    <td>
                        ${entry.accountName}
                        ${entry.instType !== 'NA' ? `<small class="d-block text-muted">${entry.instType} ${entry.instNo ? `- ${entry.instNo}` : ''}${entry.bankAcc ? ` (${entry.bankAcc})` : ''}</small>` : ''}
                        ${entry.referenceNumber ? `<small class="d-block text-muted">Ref: ${entry.referenceNumber}</small>` : ''}
                    </td>
                    <td class="print-text-right">0.00</td>
                    <td class="print-text-right">${entry.amount.toFixed(2)}</td>
                </tr>
            `;
            totalCredit += entry.amount;
        });

        tempDiv.innerHTML = `
            <div id="printableContent">
                <div class="print-voucher-container">
                    <div class="print-voucher-header">
                        <div class="print-company-name">${printData.currentCompanyName}</div>
                        <div class="print-company-details">
                            ${printData.currentCompany?.address || ''}, ${printData.currentCompany?.city || ''}
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
                            ${rows}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colSpan="2">Total</th>
                                <th>${totalDebit.toFixed(2)}</th>
                                <th>${totalCredit.toFixed(2)}</th>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="margin-top: 3mm;">
                        <strong>Note:</strong> ${printData.payment.description || 'N/A'}
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
            .text-danger {
                color: #dc3545 !important;
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
                        <form className="wow-form" id='paymentForm' onSubmit={(e) => {
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
                                                    ref={transactionDateRef}
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
                                                    onKeyDown={(e) => handleKeyDown(e, 'nepaliDate')}
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
                                                    ref={transactionDateRef}
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
                                                    onKeyDown={(e) => handleKeyDown(e, 'billDate')}
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
                                            onKeyDown={(e) => handleKeyDown(e, 'billNumber')}
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
                                            readOnly
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleKeyDown(e, 'accountType');
                                                }
                                            }}
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
                                            onKeyDown={(e) => handleKeyDown(e, 'paymentAccountId')}
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
                                            onKeyDown={(e) => handleKeyDown(e, 'account')}
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
                                            name="amount"
                                            id="amount"
                                            className="form-control form-control-sm"
                                            placeholder="Amount"
                                            value={formData.amount}
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
                                                    newTransactionAmount={parseFloat(formData.amount) || 0}
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