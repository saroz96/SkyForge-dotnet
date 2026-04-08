import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import NepaliDate from 'nepali-date-converter';
import NotificationToast from '../../NotificationToast';
import Header from '../Header';
import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
import ProductModal from '../dashboard/modals/ProductModal';
import VirtualizedAccountList from '../../VirtualizedAccountList';

const EditJournalVoucher = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const accountSearchRef = useRef(null);
    const itemsTableRef = useRef(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [printAfterSave, setPrintAfterSave] = useState(
        localStorage.getItem('printAfterSaveJournalEdit') === 'true' || false
    );
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');

    // Header selection states
    const [headerDebitAccount, setHeaderDebitAccount] = useState(null);
    const [headerDebitAmount, setHeaderDebitAmount] = useState('');
    const [headerCreditAccount, setHeaderCreditAccount] = useState(null);
    const [headerCreditAmount, setHeaderCreditAmount] = useState('');
    const [currentSelectionType, setCurrentSelectionType] = useState('debit');
    const [editingEntryIndex, setEditingEntryIndex] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        nepaliDate: currentNepaliDate,
        description: '',
        status: 'Active',
        entries: []
    });

    const [accounts, setAccounts] = useState([]);
    const [billNumber, setBillNumber] = useState('');
    const [companyDateFormat, setCompanyDateFormat] = useState('nepali');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
    const transactionDateRef = useRef(null);
    const [dateErrors, setDateErrors] = useState({
        nepaliDate: ''
    });

    // Account search states
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

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

    // Calculate total amounts from unified entries
    const totals = useMemo(() => {
        const totalDebit = formData.entries
            .filter(entry => entry.entryType === 'Debit')
            .reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
        const totalCredit = formData.entries
            .filter(entry => entry.entryType === 'Credit')
            .reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
        return { totalDebit, totalCredit };
    }, [formData.entries]);

    useEffect(() => {
        const handleF9Key = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleF9Key);
        return () => {
            window.removeEventListener('keydown', handleF9Key);
        };
    }, []);

    // Fetch journal data
    useEffect(() => {
        const fetchJournalData = async () => {
            try {
                setIsLoading(true);

                const response = await api.get(`/api/retailer/journal/edit/${id}`);
                const { data } = response.data;

                setAccounts(data.accounts || []);
                setCompanyDateFormat(data.companyDateFormat || 'nepali');

                const journalVoucher = data.journalVoucher;
                const entries = data.entries || [];

                // Format date properly
                const formatDate = (dateValue) => {
                    if (!dateValue) return '';
                    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                        return dateValue;
                    }
                    try {
                        const date = new Date(dateValue);
                        if (isNaN(date.getTime())) return '';
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    } catch (e) {
                        console.error('Date formatting error:', e);
                        return '';
                    }
                };

                setBillNumber(journalVoucher.billNumber || '');
                setFormData({
                    date: formatDate(journalVoucher.date) || new Date().toISOString().split('T')[0],
                    nepaliDate: formatDate(journalVoucher.nepaliDate) || currentNepaliDate,
                    description: journalVoucher.description || '',
                    status: journalVoucher.status || 'Active',
                    entries: entries.map(entry => ({
                        id: entry.id,
                        accountId: entry.accountId,
                        accountName: entry.accountName,
                        entryType: entry.entryType,
                        amount: entry.amount?.toString() || '',
                        lineNumber: entry.lineNumber,
                        description: entry.description || '',
                        referenceNumber: entry.referenceNumber || ''
                    }))
                });

                setIsInitialDataLoaded(true);
            } catch (error) {
                console.error('Error fetching journal data:', error);
                setError(error.response?.data?.error || 'Failed to load journal data');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchJournalData();
        }
    }, [id]);

    // Set focus on date input after initial load
    useEffect(() => {
        if (isInitialDataLoaded && transactionDateRef.current) {
            const timer = setTimeout(() => {
                transactionDateRef.current.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isInitialDataLoaded, companyDateFormat]);

    // Auto-scroll to bottom when new entries are added
    useEffect(() => {
        if (itemsTableRef.current && formData.entries.length > 0) {
            setTimeout(() => {
                itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
            }, 10);
        }
    }, [formData.entries]);

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

    const startEditEntry = (index) => {
        // Get the paired entry - find the corresponding debit and credit entries
        const debitEntriesList = formData.entries.filter(entry => entry.entryType === 'Debit');
        const creditEntriesList = formData.entries.filter(entry => entry.entryType === 'Credit');

        const debitEntry = debitEntriesList[index];
        const creditEntry = creditEntriesList[index];

        // Load debit data if exists
        if (debitEntry && debitEntry.accountId && debitEntry.amount) {
            const debitAccount = accounts.find(acc => acc.id === debitEntry.accountId);
            if (debitAccount) {
                setHeaderDebitAccount(debitAccount);
                setHeaderDebitAmount(debitEntry.amount);
            }
        }

        // Load credit data if exists
        if (creditEntry && creditEntry.accountId && creditEntry.amount) {
            const creditAccount = accounts.find(acc => acc.id === creditEntry.accountId);
            if (creditAccount) {
                setHeaderCreditAccount(creditAccount);
                setHeaderCreditAmount(creditEntry.amount);
            }
        }

        setEditingEntryIndex(index);
        setIsEditMode(true);

        // Focus on debit search after loading
        setTimeout(() => {
            const debitSearchInput = document.getElementById('headerDebitSearch');
            if (debitSearchInput) {
                debitSearchInput.focus();
            }
        }, 100);

        setNotification({
            show: true,
            message: 'Editing row ' + (index + 1) + '. Make changes and click UPDATE to save.',
            type: 'info'
        });
    };

    const cancelEdit = () => {
        setHeaderDebitAccount(null);
        setHeaderDebitAmount('');
        setHeaderCreditAccount(null);
        setHeaderCreditAmount('');
        setEditingEntryIndex(null);
        setIsEditMode(false);

        setNotification({
            show: true,
            message: 'Edit cancelled.',
            type: 'info'
        });
    };

    const updateEntry = () => {
        const debitAmount = parseFloat(headerDebitAmount) || 0;
        const creditAmount = parseFloat(headerCreditAmount) || 0;

        // Validate if at least one entry is provided
        if (!headerDebitAccount && !headerCreditAccount) {
            setNotification({
                show: true,
                message: 'Please select at least one account',
                type: 'error'
            });
            return;
        }

        // If both are provided, amounts must match
        if (headerDebitAccount && headerCreditAccount && debitAmount !== creditAmount) {
            setNotification({
                show: true,
                message: `Debit amount (${debitAmount}) must equal credit amount (${creditAmount})`,
                type: 'error'
            });
            return;
        }

        const newEntries = [...formData.entries];
        const debitEntriesList = newEntries.filter(entry => entry.entryType === 'Debit');
        const creditEntriesList = newEntries.filter(entry => entry.entryType === 'Credit');

        // Update debit entry if exists in the row
        if (headerDebitAccount && debitEntriesList[editingEntryIndex]) {
            const originalDebitIndex = newEntries.findIndex(e => e.id === debitEntriesList[editingEntryIndex].id);
            if (originalDebitIndex !== -1) {
                newEntries[originalDebitIndex] = {
                    ...newEntries[originalDebitIndex],
                    accountId: headerDebitAccount.id,
                    accountName: `${headerDebitAccount.uniqueNumber || ''} - ${headerDebitAccount.name}`,
                    amount: debitAmount.toString()
                };
            }
        } else if (!headerDebitAccount && debitEntriesList[editingEntryIndex]) {
            // Remove debit entry if it exists and no debit provided
            const originalDebitIndex = newEntries.findIndex(e => e.id === debitEntriesList[editingEntryIndex].id);
            if (originalDebitIndex !== -1) {
                newEntries.splice(originalDebitIndex, 1);
            }
        }

        // Update credit entry if exists in the row
        if (headerCreditAccount && creditEntriesList[editingEntryIndex]) {
            const originalCreditIndex = newEntries.findIndex(e => e.id === creditEntriesList[editingEntryIndex].id);
            if (originalCreditIndex !== -1) {
                newEntries[originalCreditIndex] = {
                    ...newEntries[originalCreditIndex],
                    accountId: headerCreditAccount.id,
                    accountName: `${headerCreditAccount.uniqueNumber || ''} - ${headerCreditAccount.name}`,
                    amount: creditAmount.toString()
                };
            }
        } else if (!headerCreditAccount && creditEntriesList[editingEntryIndex]) {
            // Remove credit entry if it exists and no credit provided
            const originalCreditIndex = newEntries.findIndex(e => e.id === creditEntriesList[editingEntryIndex].id);
            if (originalCreditIndex !== -1) {
                newEntries.splice(originalCreditIndex, 1);
            }
        }

        // Add new entries if they don't exist
        if (headerDebitAccount && !debitEntriesList[editingEntryIndex]) {
            newEntries.push({
                id: null,
                accountId: headerDebitAccount.id,
                accountName: `${headerDebitAccount.uniqueNumber || ''} - ${headerDebitAccount.name}`,
                entryType: 'Debit',
                amount: debitAmount.toString(),
                lineNumber: newEntries.length + 1,
                description: '',
                referenceNumber: ''
            });
        }

        if (headerCreditAccount && !creditEntriesList[editingEntryIndex]) {
            newEntries.push({
                id: null,
                accountId: headerCreditAccount.id,
                accountName: `${headerCreditAccount.uniqueNumber || ''} - ${headerCreditAccount.name}`,
                entryType: 'Credit',
                amount: creditAmount.toString(),
                lineNumber: newEntries.length + 1,
                description: '',
                referenceNumber: ''
            });
        }

        setFormData(prev => ({ ...prev, entries: newEntries }));

        // Reset header fields and edit mode
        setHeaderDebitAccount(null);
        setHeaderDebitAmount('');
        setHeaderCreditAccount(null);
        setHeaderCreditAmount('');
        setEditingEntryIndex(null);
        setIsEditMode(false);

        setNotification({
            show: true,
            message: 'Entry updated successfully!',
            type: 'success'
        });

        // Focus on debit search after update
        setTimeout(() => {
            const debitSearchInput = document.getElementById('headerDebitSearch');
            if (debitSearchInput) {
                debitSearchInput.focus();
                debitSearchInput.select();
            }
        }, 100);
    };

    const insertEntry = () => {
        const debitAmount = parseFloat(headerDebitAmount) || 0;
        const creditAmount = parseFloat(headerCreditAmount) || 0;

        const newEntries = [...formData.entries];
        let lineNumber = newEntries.length + 1;

        // Case 1: Both debit and credit entries provided
        if (headerDebitAccount && headerDebitAmount && headerCreditAccount && headerCreditAmount) {
            if (debitAmount !== creditAmount) {
                setNotification({
                    show: true,
                    message: `Debit amount (${debitAmount}) must equal credit amount (${creditAmount})`,
                    type: 'error'
                });
                return;
            }

            newEntries.push({
                id: null,
                accountId: headerDebitAccount.id,
                accountName: `${headerDebitAccount.uniqueNumber || ''} - ${headerDebitAccount.name}`,
                entryType: 'Debit',
                amount: debitAmount,
                lineNumber: lineNumber++,
                description: '',
                referenceNumber: ''
            });

            newEntries.push({
                id: null,
                accountId: headerCreditAccount.id,
                accountName: `${headerCreditAccount.uniqueNumber || ''} - ${headerCreditAccount.name}`,
                entryType: 'Credit',
                amount: creditAmount,
                lineNumber: lineNumber++,
                description: '',
                referenceNumber: ''
            });

            setFormData(prev => ({ ...prev, entries: newEntries }));

            // Reset header fields
            setHeaderDebitAccount(null);
            setHeaderDebitAmount('');
            setHeaderCreditAccount(null);
            setHeaderCreditAmount('');

            setTimeout(() => {
                const debitSearchInput = document.getElementById('headerDebitSearch');
                if (debitSearchInput) {
                    debitSearchInput.focus();
                    debitSearchInput.select();
                }
            }, 50);
        }
        // Case 2: Only debit entry provided
        else if (headerDebitAccount && headerDebitAmount && !headerCreditAccount && !headerCreditAmount) {
            newEntries.push({
                id: null,
                accountId: headerDebitAccount.id,
                accountName: `${headerDebitAccount.uniqueNumber || ''} - ${headerDebitAccount.name}`,
                entryType: 'Debit',
                amount: debitAmount,
                lineNumber: lineNumber++,
                description: '',
                referenceNumber: ''
            });

            setFormData(prev => ({ ...prev, entries: newEntries }));

            setHeaderDebitAccount(null);
            setHeaderDebitAmount('');
            setHeaderCreditAccount(null);
            setHeaderCreditAmount('');

            setTimeout(() => {
                const debitSearchInput = document.getElementById('headerDebitSearch');
                if (debitSearchInput) {
                    debitSearchInput.focus();
                    debitSearchInput.select();
                }
            }, 50);
        }
        // Case 3: Only credit entry provided
        else if (!headerDebitAccount && !headerDebitAmount && headerCreditAccount && headerCreditAmount) {
            newEntries.push({
                id: null,
                accountId: headerCreditAccount.id,
                accountName: `${headerCreditAccount.uniqueNumber || ''} - ${headerCreditAccount.name}`,
                entryType: 'Credit',
                amount: creditAmount,
                lineNumber: lineNumber++,
                description: '',
                referenceNumber: ''
            });

            setFormData(prev => ({ ...prev, entries: newEntries }));

            setHeaderDebitAccount(null);
            setHeaderDebitAmount('');
            setHeaderCreditAccount(null);
            setHeaderCreditAmount('');

            setTimeout(() => {
                const creditSearchInput = document.getElementById('headerCreditSearch');
                if (creditSearchInput) {
                    creditSearchInput.focus();
                    creditSearchInput.select();
                }
            }, 50);
        }
        else {
            setNotification({
                show: true,
                message: 'Please fill either both debit and credit entries, or one of them',
                type: 'error'
            });
        }
    };

    const removeEntry = (index) => {
        // When removing a row, we need to remove both debit and credit entries at that index
        const debitEntriesList = formData.entries.filter(entry => entry.entryType === 'Debit');
        const creditEntriesList = formData.entries.filter(entry => entry.entryType === 'Credit');

        const debitToRemove = debitEntriesList[index];
        const creditToRemove = creditEntriesList[index];

        let newEntries = [...formData.entries];

        if (debitToRemove) {
            const debitIndex = newEntries.findIndex(e => e.id === debitToRemove.id);
            if (debitIndex !== -1) {
                newEntries.splice(debitIndex, 1);
            }
        }

        if (creditToRemove) {
            const creditIndex = newEntries.findIndex(e => e.id === creditToRemove.id);
            if (creditIndex !== -1) {
                newEntries.splice(creditIndex, 1);
            }
        }

        setFormData(prev => ({ ...prev, entries: newEntries }));
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

    const selectAccount = (account) => {
        if (currentSelectionType === 'debit') {
            setHeaderDebitAccount(account);
            setShowAccountModal(false);
            setTimeout(() => {
                document.getElementById('headerDebitAmount')?.focus();
            }, 100);
        } else {
            setHeaderCreditAccount(account);
            setShowAccountModal(false);
            setTimeout(() => {
                document.getElementById('headerCreditAmount')?.focus();
            }, 100);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (print = false) => {
        // Filter out entries with empty account or amount
        const validEntries = formData.entries.filter(entry =>
            entry.accountId && entry.amount && parseFloat(entry.amount) > 0
        );

        // Check if we have at least one debit and one credit entry
        const hasDebit = validEntries.some(entry => entry.entryType === 'Debit');
        const hasCredit = validEntries.some(entry => entry.entryType === 'Credit');

        if (!hasDebit || !hasCredit) {
            setNotification({
                show: true,
                message: 'At least one debit and one credit entry is required',
                type: 'error'
            });
            return;
        }

        if (totals.totalDebit !== totals.totalCredit) {
            setNotification({
                show: true,
                message: `Total debit (${totals.totalDebit.toFixed(2)}) must equal total credit (${totals.totalCredit.toFixed(2)})`,
                type: 'error'
            });
            return;
        }

        setIsSaving(true);

        try {
            // Prepare payload with unified entries array
            const payload = {
                date: formData.date,
                nepaliDate: formData.nepaliDate,
                description: formData.description,
                entries: validEntries.map(entry => ({
                    id: entry.id,
                    accountId: entry.accountId,
                    entryType: entry.entryType,
                    amount: parseFloat(entry.amount),
                    lineNumber: entry.lineNumber,
                    description: entry.description || '',
                    referenceNumber: entry.referenceNumber || ''
                })),
                print: print || printAfterSave
            };

            const response = await api.put(`/api/retailer/journal/edit/${id}`, payload);

            setNotification({
                show: true,
                message: 'Journal voucher updated successfully!',
                type: 'success'
            });

            // If print was requested, fetch print data and print
            if ((print || printAfterSave) && response.data.data?.journalVoucher?.id) {
                try {
                    const printResponse = await api.get(`/api/retailer/journal/${response.data.data.journalVoucher.id}/print`);
                    printVoucherImmediately(printResponse.data.data);
                    setTimeout(() => handleBack(), 500);
                } catch (printError) {
                    console.error('Error fetching print data:', printError);
                    setNotification({
                        show: true,
                        message: 'Journal voucher updated but failed to load print data',
                        type: 'warning'
                    });
                    setTimeout(() => handleBack(), 1000);
                }
            } else {
                setTimeout(() => handleBack(), 500);
            }
        } catch (err) {
            console.error('Error updating journal voucher:', err);
            setNotification({
                show: true,
                message: err.response?.data?.error || 'Failed to update journal voucher. Please try again.',
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelVoucher = async () => {
        if (window.confirm("Are you sure you want to cancel this voucher?")) {
            try {
                await api.post(`/api/retailer/journals/cancel/${billNumber}`);
                setNotification({
                    show: true,
                    message: 'Voucher canceled successfully!',
                    type: 'success'
                });
                setFormData(prev => ({ ...prev, status: 'Canceled' }));
            } catch (err) {
                setNotification({
                    show: true,
                    message: err.response?.data?.message || 'Failed to cancel voucher',
                    type: 'error'
                });
            }
        }
    };

    const handleReactivateVoucher = async () => {
        if (window.confirm("Are you sure you want to reactivate this voucher?")) {
            try {
                await api.post(`/api/retailer/journals/reactivate/${billNumber}`);
                setNotification({
                    show: true,
                    message: 'Voucher reactivated successfully!',
                    type: 'success'
                });
                setFormData(prev => ({ ...prev, status: 'Active' }));
            } catch (err) {
                setNotification({
                    show: true,
                    message: err.response?.data?.message || 'Failed to reactivate voucher',
                    type: 'error'
                });
            }
        }
    };

    const handleBack = () => {
        navigate(-1);
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

    const handlePrintAfterSaveChange = (e) => {
        const isChecked = e.target.checked;
        setPrintAfterSave(isChecked);
        localStorage.setItem('printAfterSaveJournalEdit', isChecked);
    };

    const printVoucherImmediately = (printData) => {
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);

        const debitEntries = printData.debitEntries || [];
        const creditEntries = printData.creditEntries || [];

        let rows = '';
        let totalDebit = 0;
        let totalCredit = 0;
        let rowNumber = 1;

        debitEntries.forEach(entry => {
            rows += `
                <tr>
                    <td class="print-text-center">${rowNumber++}</td>
                    <td>${entry.accountName}</td>
                    <td class="print-text-right">${entry.amount.toFixed(2)}</td>
                    <td class="print-text-right">0.00</td>
                </tr>
            `;
            totalDebit += entry.amount;
        });

        creditEntries.forEach(entry => {
            rows += `
                <tr>
                    <td class="print-text-center">${rowNumber++}</td>
                    <td>${entry.accountName}</td>
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
                            ${printData.currentCompany?.address || ''}
                            <br />
                            Tel: ${printData.currentCompany?.phone || ''} | PAN: ${printData.currentCompany?.pan || 'N/A'}
                        </div>
                        <div class="print-voucher-title">JOURNAL VOUCHER</div>
                    </div>

                    <div class="print-voucher-details">
                        <div><strong>Vch. No:</strong> ${printData.journalVoucher?.billNumber}</div>
                        <div><strong>Date:</strong> ${new Date(printData.journalVoucher?.date).toLocaleDateString()}</div>
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
                        <tbody>${rows}</tbody>
                        <tfoot>
                            <tr>
                                <th colSpan="2">Total</th>
                                <th>${totalDebit.toFixed(2)}</th>
                                <th>${totalCredit.toFixed(2)}</th>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="margin-top: 3mm;"><strong>Note:</strong> ${printData.journalVoucher?.description || 'N/A'}</div>

                    <div class="print-signature-area">
                        <div class="print-signature-box">
                            <div><strong>${printData.journalVoucher?.user?.name || 'N/A'}</strong></div>
                            Prepared By
                        </div>
                        <div class="print-signature-box">
                            <div>&nbsp;</div>
                            Checked By
                        </div>
                        <div class="print-signature-box">
                            <div>&nbsp;</div>
                            Approved By
                        </div>
                    </div>
                </div>
            </div>
        `;

        const styles = `
            @media print {
                @page { size: A4; margin: 5mm; }
                body { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 9pt; line-height: 1.2; color: #000; background: white; margin: 0; padding: 0; }
                .print-voucher-container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 2mm; }
                .print-voucher-header { text-align: center; margin-bottom: 3mm; border-bottom: 1px dashed #000; padding-bottom: 2mm; }
                .print-voucher-title { font-size: 12pt; font-weight: bold; margin: 2mm 0; text-transform: uppercase; text-decoration: underline; letter-spacing: 1px; }
                .print-company-name { font-size: 16pt; font-weight: bold; }
                .print-company-details { font-size: 8pt; margin: 1mm 0; }
                .print-voucher-details { display: flex; justify-content: space-between; margin: 2mm 0; font-size: 8pt; }
                .print-voucher-table { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 8pt; }
                .print-voucher-table thead { border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
                .print-voucher-table th { background-color: transparent; border: 1px solid #000; padding: 1mm; text-align: left; font-weight: bold; }
                .print-voucher-table td { border: 1px solid #000; padding: 1mm; }
                .print-text-right { text-align: right; }
                .print-text-center { text-align: center; }
                .print-signature-area { display: flex; justify-content: space-between; margin-top: 5mm; font-size: 8pt; }
                .print-signature-box { text-align: center; width: 30%; border-top: 1px dashed #000; padding-top: 1mm; font-weight: bold; }
            }
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Journal_Voucher_${printData.journalVoucher?.billNumber}</title>
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
        document.body.removeChild(tempDiv);
    };

    const getFocusTargetOnModalClose = () => {
        const hasTransactions = formData.entries.length > 0 &&
            formData.entries.some(entry => entry.accountId && entry.amount > 0);
        const isTotalsBalanced = totals.totalDebit === totals.totalCredit && totals.totalDebit > 0;

        if (hasTransactions && isTotalsBalanced) {
            return 'saveBill';
        }
        if (currentSelectionType === 'debit') {
            return 'headerDebitAmount';
        } else {
            return 'headerCreditAmount';
        }
    };

    if (isLoading) {
        return (
            <div className="container-fluid">
                <Header />
                <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) return <div className="alert alert-danger mt-5">{error}</div>;

    const isCanceled = formData.status === 'Canceled';

    // Get debit and credit entries for display
    const debitEntries = formData.entries.filter(entry => entry.entryType === 'Debit');
    const creditEntries = formData.entries.filter(entry => entry.entryType === 'Credit');
    const maxRows = Math.max(debitEntries.length, creditEntries.length);

    return (
        <div className='container-fluid'>
            <Header />
            <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="card-title mb-0">
                            <i className="bi bi-file-text me-2"></i>
                            Edit Journal Voucher
                        </h2>
                        <div className="d-flex align-items-center gap-2">
                            {isCanceled && (
                                <span className="badge bg-danger" style={{ fontSize: '0.7rem' }}>Voucher Canceled</span>
                            )}
                            {!isCanceled ? (
                                <button type="button" className="btn btn-danger btn-sm d-flex align-items-center" onClick={handleCancelVoucher} style={{ height: '26px', padding: '0 12px', fontSize: '0.8rem' }}>
                                    <i className="bi bi-x-circle me-1"></i> Cancel Voucher
                                </button>
                            ) : (
                                <button type="button" className="btn btn-success btn-sm d-flex align-items-center" onClick={handleReactivateVoucher} style={{ height: '26px', padding: '0 12px', fontSize: '0.8rem' }}>
                                    <i className="bi bi-check-circle me-1"></i> Reactivate Voucher
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card-body p-2 p-md-3">
                    <form id='journalForm' onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit(false);
                    }}>
                        {/* Date and Basic Info Row */}
                        <div className="row g-2 mb-3">
                            {companyDateFormat === 'nepali' ? (
                                <div className="col-12 col-md-6 col-lg-2">
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            name="nepaliDate"
                                            id="nepaliDate"
                                            className="form-control form-control-sm"
                                            required
                                            autoComplete='off'
                                            ref={transactionDateRef}
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
                                            disabled={isCanceled}
                                            style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%', backgroundColor: isCanceled ? '#e9ecef' : '' }}
                                        />
                                        <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                            Date: <span className="text-danger">*</span>
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="col-12 col-md-6 col-lg-2">
                                    <div className="position-relative">
                                        <input
                                            type="date"
                                            name="date"
                                            id="date"
                                            className="form-control form-control-sm"
                                            ref={transactionDateRef}
                                            value={formData.date}
                                            onChange={(e) => {
                                                const selectedDate = new Date(e.target.value);
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                if (selectedDate > today) {
                                                    setFormData({ ...formData, date: today.toISOString().split('T')[0] });
                                                    setNotification({ show: true, message: 'Future date not allowed. Auto-corrected to today.', type: 'warning', duration: 3000 });
                                                } else {
                                                    setFormData({ ...formData, date: e.target.value });
                                                }
                                            }}
                                            onKeyDown={(e) => handleKeyDown(e, 'date')}
                                            max={new Date().toISOString().split('T')[0]}
                                            disabled={isCanceled}
                                            style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%', backgroundColor: isCanceled ? '#e9ecef' : '' }}
                                        />
                                        <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                            Date: <span className="text-danger">*</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="col-12 col-md-6 col-lg-2">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        name="billNumber"
                                        id="billNumber"
                                        className="form-control form-control-sm"
                                        value={billNumber}
                                        readOnly
                                        style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                    />
                                    <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                        Vch. No:
                                    </label>
                                </div>
                            </div>

                            <div className="col-12 col-md-6 col-lg-8">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        name="description"
                                        id="description"
                                        className="form-control form-control-sm"
                                        placeholder="Enter description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        onKeyDown={(e) => handleKeyDown(e, 'description')}
                                        autoComplete='off'
                                        disabled={isCanceled}
                                        style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%', backgroundColor: isCanceled ? '#e9ecef' : '' }}
                                    />
                                    <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                        Description:
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Table Container */}
                        <div
                            className="table-responsive"
                            style={{
                                minHeight: "270px",
                                maxHeight: "270px",
                                overflowY: "auto",
                                border: formData.entries.filter(e => e.accountId && e.amount > 0).length > 0
                                    ? '1px solid #dee2e6'
                                    : '1px dashed #ced4da',
                                backgroundColor: '#fff'
                            }}
                            ref={itemsTableRef}
                        >
                            <table className="table table-sm table-bordered table-hover mb-0">
                                <thead className="sticky-top bg-light">
                                    {/* Header Entry Row */}
                                    <tr style={{
                                        height: '26px',
                                        backgroundColor: '#ffffff',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 10,
                                        boxShadow: '0 2px 3px rgba(0,0,0,0.1)'
                                    }}>
                                        <td width="5%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>#</span>
                                        </td>
                                        <td width="30%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="text"
                                                id="headerDebitSearch"
                                                className="form-control form-control-sm"
                                                placeholder="Select Debit Account"
                                                value={headerDebitAccount ? `${headerDebitAccount.uniqueNumber || ''} - ${headerDebitAccount.name}` : ''}
                                                onFocus={() => {
                                                    setCurrentSelectionType('debit');
                                                    setShowAccountModal(true);
                                                    setAccountSearchQuery('');
                                                }}
                                                readOnly
                                                disabled={isCanceled}
                                                style={{ height: '20px', fontSize: '0.75rem', padding: '0 4px', backgroundColor: isCanceled ? '#e9ecef' : '#ffffff' }}
                                            />
                                        </td>
                                        <td width="15%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="number"
                                                id="headerDebitAmount"
                                                className="form-control form-control-sm"
                                                placeholder="Debit Amount"
                                                value={headerDebitAmount}
                                                onChange={(e) => setHeaderDebitAmount(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        document.getElementById('headerCreditSearch')?.focus();
                                                    }
                                                }}
                                                disabled={isCanceled}
                                                style={{ height: '20px', fontSize: '0.75rem', padding: '0 4px', backgroundColor: isCanceled ? '#e9ecef' : '#ffffff' }}
                                            />
                                        </td>
                                        <td width="35%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="text"
                                                id="headerCreditSearch"
                                                className="form-control form-control-sm"
                                                placeholder="Select Credit Account"
                                                value={headerCreditAccount ? `${headerCreditAccount.uniqueNumber || ''} - ${headerCreditAccount.name}` : ''}
                                                onFocus={() => {
                                                    setCurrentSelectionType('credit');
                                                    setShowAccountModal(true);
                                                    setAccountSearchQuery('');
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (showAccountModal) {
                                                            setShowAccountModal(false);
                                                        }
                                                        setTimeout(() => {
                                                            document.getElementById('headerCreditAmount')?.focus();
                                                        }, 50);
                                                    }
                                                }}
                                                readOnly
                                                disabled={isCanceled}
                                                style={{ height: '20px', fontSize: '0.75rem', padding: '0 4px', backgroundColor: isCanceled ? '#e9ecef' : '#ffffff' }}
                                            />
                                        </td>
                                        <td width="15%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="number"
                                                id="headerCreditAmount"
                                                className="form-control form-control-sm"
                                                placeholder="Credit Amount"
                                                value={headerCreditAmount}
                                                onChange={(e) => setHeaderCreditAmount(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        if (isEditMode) {
                                                            document.getElementById('updateButton')?.focus();
                                                        } else {
                                                            document.getElementById('insertButton')?.focus();
                                                        }
                                                    }
                                                }}
                                                disabled={isCanceled}
                                                style={{ height: '20px', fontSize: '0.75rem', padding: '0 4px', backgroundColor: isCanceled ? '#e9ecef' : '#ffffff' }}
                                            />
                                        </td>
                                        <td width="10%" style={{ padding: '2px', textAlign: 'center', backgroundColor: '#ffffff' }}>
                                            {isEditMode ? (
                                                <div className="d-flex gap-1">
                                                    <button
                                                        type="button"
                                                        id="updateButton"
                                                        className="btn btn-sm btn-warning py-0 px-2"
                                                        onClick={updateEntry}
                                                        style={{ height: '20px', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: '#ffc107', borderColor: '#ffc107' }}
                                                    >
                                                        UPDATE
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-secondary py-0 px-2"
                                                        onClick={cancelEdit}
                                                        style={{ height: '20px', fontSize: '0.7rem', fontWeight: 'bold' }}
                                                    >
                                                        CANCEL
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    id="insertButton"
                                                    className="btn btn-sm btn-success py-0 px-2"
                                                    onClick={insertEntry}
                                                    disabled={isCanceled || (!headerDebitAccount && !headerCreditAccount) ||
                                                        (headerDebitAccount && !headerDebitAmount) ||
                                                        (headerCreditAccount && !headerCreditAmount)}
                                                    style={{ height: '20px', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: '#198754', borderColor: '#198754' }}
                                                >
                                                    INSERT
                                                </button>
                                            )}
                                        </td>
                                    </tr>

                                    {/* Column headers row */}
                                    <tr style={{
                                        height: '26px',
                                        backgroundColor: '#e9ecef',
                                        position: 'sticky',
                                        top: '26px',
                                        zIndex: 9
                                    }}>
                                        <th width="5%" style={{ padding: '3px', fontSize: '0.75rem' }}>S.N.</th>
                                        <th width="30%" style={{ padding: '3px', fontSize: '0.75rem' }}>Debit Account</th>
                                        <th width="15%" style={{ padding: '3px', fontSize: '0.75rem' }}>Debit Amount (Rs.)</th>
                                        <th width="30%" style={{ padding: '3px', fontSize: '0.75rem' }}>Credit Account</th>
                                        <th width="15%" style={{ padding: '3px', fontSize: '0.75rem' }}>Credit Amount (Rs.)</th>
                                        <th width="5%" style={{ padding: '3px', fontSize: '0.75rem' }}>Actions</th>
                                    </tr>
                                </thead>

                                <tbody id="items" style={{ backgroundColor: '#fff' }}>
                                    {(() => {
                                        // Get debit and credit entries from unified entries array
                                        const debitEntriesList = formData.entries
                                            .filter(entry => entry.entryType === 'Debit')
                                            .map(entry => ({
                                                id: entry.id,
                                                accountId: entry.accountId,
                                                accountName: entry.accountName,
                                                amount: entry.amount
                                            }));

                                        const creditEntriesList = formData.entries
                                            .filter(entry => entry.entryType === 'Credit')
                                            .map(entry => ({
                                                id: entry.id,
                                                accountId: entry.accountId,
                                                accountName: entry.accountName,
                                                amount: entry.amount
                                            }));

                                        const maxLength = Math.max(debitEntriesList.length, creditEntriesList.length);

                                        // Create paired entries
                                        const pairedEntries = [];
                                        for (let i = 0; i < maxLength; i++) {
                                            pairedEntries.push({
                                                debitEntry: debitEntriesList[i] || { accountId: '', accountName: '', amount: 0 },
                                                creditEntry: creditEntriesList[i] || { accountId: '', accountName: '', amount: 0 }
                                            });
                                        }

                                        return pairedEntries.map((item, index) => {
                                            const debitEntry = item.debitEntry;
                                            const creditEntry = item.creditEntry;
                                            const isBeingEdited = editingEntryIndex === index;

                                            return (
                                                <tr key={index} style={{
                                                    height: 'auto',
                                                    minHeight: '26px',
                                                    backgroundColor: isBeingEdited ? '#fff3cd' : 'transparent'
                                                }}>
                                                    <td style={{ padding: '3px', fontSize: '0.75rem', verticalAlign: 'top' }}>{index + 1}</td>

                                                    {/* Debit Account Column */}
                                                    <td style={{ padding: '3px', fontSize: '0.75rem', verticalAlign: 'top' }}>
                                                        {debitEntry.accountName ? (
                                                            <>
                                                                <div>{debitEntry.accountName}</div>
                                                                {debitEntry.accountId && (
                                                                    <div className="mt-1">
                                                                        <AccountBalanceDisplay
                                                                            accountId={debitEntry.accountId}
                                                                            api={api}
                                                                            newTransactionAmount={parseFloat(debitEntry.amount) || 0}
                                                                            compact={true}
                                                                            transactionType="payment"
                                                                            dateFormat={companyDateFormat}
                                                                            isEditMode={true}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-muted">-- No Entry --</span>
                                                        )}
                                                    </td>

                                                    {/* Debit Amount Column */}
                                                    <td style={{ padding: '3px', fontSize: '0.75rem', verticalAlign: 'top' }}>
                                                        {debitEntry.amount > 0 ? debitEntry.amount : '-'}
                                                    </td>

                                                    {/* Credit Account Column */}
                                                    <td style={{ padding: '3px', fontSize: '0.75rem', verticalAlign: 'top' }}>
                                                        {creditEntry.accountName ? (
                                                            <>
                                                                <div>{creditEntry.accountName}</div>
                                                                {creditEntry.accountId && (
                                                                    <div className="mt-1">
                                                                        <AccountBalanceDisplay
                                                                            accountId={creditEntry.accountId}
                                                                            api={api}
                                                                            newTransactionAmount={parseFloat(creditEntry.amount) || 0}
                                                                            compact={true}
                                                                            transactionType="receipt"
                                                                            dateFormat={companyDateFormat}
                                                                            isEditMode={true}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-muted">-- No Entry --</span>
                                                        )}
                                                    </td>

                                                    {/* Credit Amount Column */}
                                                    <td style={{ padding: '3px', fontSize: '0.75rem', verticalAlign: 'top' }}>
                                                        {creditEntry.amount > 0 ? creditEntry.amount : '-'}
                                                    </td>

                                                    {/* Action Buttons Column */}
                                                    <td className="text-center" style={{ padding: '2px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                                        <div className="d-flex gap-1 justify-content-center">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-warning py-0 px-1"
                                                                onClick={() => startEditEntry(index)}
                                                                disabled={isCanceled}
                                                                title="Edit this row"
                                                                style={{
                                                                    height: '18px',
                                                                    width: '18px',
                                                                    minWidth: '18px',
                                                                    fontSize: '0.6rem',
                                                                    backgroundColor: '#ffc107',
                                                                    borderColor: '#ffc107'
                                                                }}
                                                            >
                                                                <i className="bi bi-pencil"></i>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-danger py-0 px-1"
                                                                onClick={() => removeEntry(index)}
                                                                disabled={isCanceled}
                                                                title="Delete this row"
                                                                style={{
                                                                    height: '18px',
                                                                    width: '18px',
                                                                    minWidth: '18px',
                                                                    fontSize: '0.6rem',
                                                                    backgroundColor: '#dc3545',
                                                                    borderColor: '#dc3545'
                                                                }}
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}

                                    {formData.entries.filter(e => e.accountId && e.amount > 0).length === 0 && (
                                        <tr style={{ height: '24px' }}>
                                            <td colSpan="6" className="text-center text-muted py-1" style={{ fontSize: '0.75rem' }}>
                                                No entries added yet. Use the header row above to add entries.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>

                                <tfoot>
                                    <tr className="table-active">
                                        <th colSpan="2" className="text-end">Total Debit:</th>
                                        <th className="text-primary">Rs. {totals.totalDebit.toFixed(2)}</th>
                                        <th className="text-end">Total Credit:</th>
                                        <th className="text-primary">Rs. {totals.totalCredit.toFixed(2)}</th>
                                        <th></th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Validation Messages */}
                        {totals.totalDebit !== totals.totalCredit && totals.totalDebit > 0 && (
                            <div className="alert alert-warning mt-2">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                Total debit and credit amounts must be equal
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <div className="form-check mb-0 d-flex align-items-center">
                                <input
                                    className="form-check-input mt-0"
                                    type="checkbox"
                                    id="printAfterSave"
                                    checked={printAfterSave}
                                    onChange={handlePrintAfterSaveChange}
                                    disabled={isCanceled}
                                    style={{ height: '14px', width: '14px' }}
                                />
                                <label className="form-check-label ms-2" htmlFor="printAfterSave" style={{ fontSize: '0.8rem' }}>
                                    Print after update
                                </label>
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm d-flex align-items-center"
                                    onClick={handleBack}
                                    disabled={isSaving}
                                    style={{ height: '26px', padding: '0 12px', fontSize: '0.8rem' }}
                                >
                                    <i className="bi bi-arrow-left me-1"></i> Back
                                </button>

                                <button
                                    type="submit"
                                    className="btn btn-primary btn-sm d-flex align-items-center"
                                    id="saveBill"
                                    disabled={isSaving || isCanceled || totals.totalDebit !== totals.totalCredit}
                                    style={{ height: '26px', padding: '0 16px', fontSize: '0.8rem' }}
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{ width: '10px', height: '10px' }}></span>
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-save me-1"></i> Update
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Account Modal */}
            {showAccountModal && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
                    <div
                        className="modal fade show"
                        tabIndex="-1"
                        style={{ display: 'block', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                setShowAccountModal(false);
                                const focusTargetId = getFocusTargetOnModalClose();
                                setTimeout(() => document.getElementById(focusTargetId)?.focus(), 50);
                            }
                        }}
                    >
                        <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '70%' }}>
                            <div className="modal-content" style={{ height: '400px' }}>
                                <div className="modal-header py-1">
                                    <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>
                                        Select {currentSelectionType === 'debit' ? 'Debit' : 'Credit'} Account
                                    </h5>
                                    <small className="ms-auto text-muted" style={{ fontSize: '0.7rem' }}>
                                        {totalAccounts > 0 ? `${accounts.length} of ${totalAccounts} accounts shown` : 'Loading accounts...'}
                                    </small>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => {
                                            setShowAccountModal(false);
                                            const focusTargetId = getFocusTargetOnModalClose();
                                            setTimeout(() => document.getElementById(focusTargetId)?.focus(), 50);
                                        }}
                                    ></button>
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
                                                if (firstAccountItem) firstAccountItem.focus();
                                            } else if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const activeItem = document.querySelector('.account-item.active');
                                                if (activeItem) {
                                                    const accountId = activeItem.getAttribute('data-account-id');
                                                    const account = accounts.find(a => a.id === accountId);
                                                    if (account) selectAccount(account);
                                                } else {
                                                    setShowAccountModal(false);
                                                    const focusTargetId = getFocusTargetOnModalClose();
                                                    setTimeout(() => document.getElementById(focusTargetId)?.focus(), 50);
                                                }
                                            } else if (e.key === 'F6') {
                                                e.preventDefault();
                                                // Create account functionality can be added here
                                            }
                                        }}
                                        ref={accountSearchRef}
                                        style={{ height: '24px', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                    />
                                </div>
                                <div className="modal-body p-0">
                                    <div style={{ height: 'calc(400px - 120px)' }}>
                                        <VirtualizedAccountList
                                            accounts={accounts}
                                            onAccountClick={selectAccount}
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

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />

            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}
        </div>
    );
};

export default EditJournalVoucher;