import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../../stylesheet/retailer/purchase/List.css';
import Header from '../Header';
import NepaliDate from 'nepali-date-converter';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import '../../../stylesheet/noDateIcon.css'
import Loader from '../../Loader';
import { useStatementContext } from '../../../context/StatementContext';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';

const Statement = () => {
    const { statementState, setStatementState } = useStatementContext();
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });

    // Replace your current useState with context state
    const [data, setData] = useState(() => ({
        ...statementState,
        company: null,
        currentFiscalYear: null,
    }));

    // New state for item-wise view
    const [viewMode, setViewMode] = useState('regular'); // 'regular' or 'itemwise'
    const [itemwiseStatement, setItemwiseStatement] = useState([]);
    const [expandedVouchers, setExpandedVouchers] = useState(new Set());

    // Update context when data changes
    useEffect(() => {
        setStatementState(prev => ({
            ...prev,
            selectedCompany: data.selectedCompany,
            partyName: data.partyName,
            fromDate: data.fromDate,
            toDate: data.toDate,
            paymentMode: data.paymentMode,
            statement: data.statement,
            accounts: data.accounts,
            totalDebit: data.totalDebit,
            totalCredit: data.totalCredit,
            openingBalance: data.openingBalance
        }));
    }, [data, setStatementState]);

    // Fetch company and fiscal year info when component mounts
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/my-company');
                if (response.data.success) {
                    const { company: companyData, currentFiscalYear } = response.data;

                    // Set company info
                    const dateFormat = companyData.dateFormat || 'english';
                    setCompany({
                        dateFormat,
                        isVatExempt: companyData.isVatExempt || false,
                        vatEnabled: companyData.vatEnabled !== false, // default true
                        fiscalYear: currentFiscalYear || {}
                    });

                    // Set dates based on fiscal year
                    if (currentFiscalYear?.startDate) {
                        setData(prev => ({
                            ...prev,
                            fromDate: dateFormat === 'nepali'
                                ? new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD')
                                : new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD'),
                            toDate: dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate,
                            company: companyData,
                            currentFiscalYear
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
            }
        };

        fetchInitialData();
    }, []);

    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const [filteredStatement, setFilteredStatement] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [showAccountModal, setShowAccountModal] = useState(false);

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const accountSearchRef = useRef(null);
    const paymentModeRef = useRef(null);
    const generateReportRef = useRef(null);
    const tableBodyRef = useRef(null);
    const [shouldFetch, setShouldFetch] = useState(false);
    const navigate = useNavigate();

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    useEffect(() => {
        if (data.statement.length > 0 || data.fromDate || data.toDate) {
        }
    }, [data]);

    useEffect(() => {
        // Fetch initial data
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/retailer/statement');
                const { data } = response;

                // Sort accounts alphabetically
                const sortedAccounts = data.data.accounts.sort((a, b) => a.name.localeCompare(b.name));

                setCompany(data.data.company);
                setData(prev => ({
                    ...prev,
                    accounts: sortedAccounts,
                    company: data.data.company,
                    currentFiscalYear: data.data.currentFiscalYear
                }));
            } catch (error) {
                console.error('Error fetching initial data:', error);
                setError('Failed to load initial data');
            } finally {
            }
        };

        fetchInitialData();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!shouldFetch || !data.selectedCompany) return;

            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (data.fromDate) params.append('fromDate', data.fromDate);
                if (data.toDate) params.append('toDate', data.toDate);
                if (data.selectedCompany) params.append('account', data.selectedCompany);
                if (data.paymentMode) params.append('paymentMode', data.paymentMode);
                if (viewMode === 'itemwise') params.append('includeItems', 'true');

                const response = await api.get(`/api/retailer/statement?${params.toString()}`);

                if (viewMode === 'itemwise') {
                    setItemwiseStatement(response.data.data.itemwiseStatement || []);
                    // Reset expanded vouchers when new data loads
                    setExpandedVouchers(new Set());
                }

                setData(prev => ({
                    ...prev,
                    ...response.data.data,
                    paymentMode: data.paymentMode // Keep the selected payment mode
                }));
                setError(null);
                setSelectedRowIndex(0); // Reset selection when new data loads
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to fetch statement');
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };

        fetchData();
    }, [shouldFetch, viewMode]); // Depend on viewMode as well

    // Filter statement based on search and payment mode
    useEffect(() => {
        const filtered = data.statement.filter(item => {
            // First filter by payment mode
            const paymentModeMatch =
                data.paymentMode === 'all' ||
                (data.paymentMode === 'cash' && item.paymentMode === 'cash') ||
                (data.paymentMode === 'credit' && item.paymentMode === 'credit') ||
                (data.paymentMode === 'exclude-cash' && item.paymentMode !== 'cash');

            // Then filter by search query if payment mode matches
            return paymentModeMatch && (
                item.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.account?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.type?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        });

        setFilteredStatement(filtered);
        // Reset selected row when filters change
        setSelectedRowIndex(0);
    }, [data.statement, searchQuery, data.paymentMode]);

    const paymentModeOptions = [
        { value: 'all', label: 'All (Include Cash)' },
        { value: 'exclude-cash', label: 'All (Exclude Cash)' },
        { value: 'cash', label: 'Cash' },
        { value: 'credit', label: 'Credit' }
    ];

    // Excel Export Function
    const handleExportExcel = async () => {
        // Check if there's any data to export
        if (!data.statement || data.statement.length === 0) {
            setNotification({
                show: true,
                message: 'No data available to export. Please generate a report first.',
                type: 'warning'
            });
            return;
        }

        setExporting(true);
        try {
            let excelData = [];
            const currentDate = new Date().toISOString().split('T')[0];

            // Add company header information
            excelData.push(['Company Name:', data.currentCompanyName || 'N/A']);
            excelData.push(['Report Type:', 'Statement Report']);
            excelData.push(['View Mode:', viewMode === 'regular' ? 'Regular Statement' : 'Itemwise Statement']);
            excelData.push(['Party Name:', data.partyName || 'N/A']);
            excelData.push(['From Date:', data.fromDate]);
            excelData.push(['To Date:', data.toDate]);
            excelData.push(['Payment Mode:', data.paymentMode]);
            excelData.push(['Export Date:', currentDate]);
            excelData.push([]); // Empty row for spacing

            // Add opening balance information
            excelData.push(['Opening Balance:', formatBalanceForExport(data.openingBalance)]);
            excelData.push([]); // Empty row for spacing

            if (viewMode === 'regular') {
                // Regular statement export
                const headers = [
                    'Date',
                    'Voucher No.',
                    'Voucher Type',
                    'Payment Mode',
                    'Account',
                    'Party Bill No.',
                    'Instrument Type',
                    'Instrument No.',
                    'Debit Amount',
                    'Credit Amount',
                    'Balance'
                ];

                // Add headers row
                excelData.push(headers);

                // Add transaction data
                let balance = data.openingBalance;
                data.statement.forEach((item) => {
                    const rowData = [
                        formatDateForExport(item.date),
                        item.billNumber || '',
                        item.type || '',
                        item.paymentMode || '',
                        item.accountType?.name || item.purchaseSalesType || item.journalAccountType || item.purchaseSalesReturnType || item.drCrNoteAccountType || item.paymentReceiptAccountType || 'Opening',
                        item.partyBillNumber || '',
                        (item.InstType && item.InstType !== 'N/A') ? item.InstType : '',
                        (item.InstNo && item.InstType !== 'N/A') ? item.InstNo : '',
                        formatCurrencyForExport(item.debit || 0),
                        formatCurrencyForExport(item.credit || 0),
                        formatBalanceForExport(balance)
                    ];
                    excelData.push(rowData);

                    // Update running balance
                    balance += (item.debit || 0) - (item.credit || 0);
                });

                // Add totals row
                excelData.push([]);
                excelData.push([
                    'TOTALS', '', '', '', '', '', '', '',
                    formatCurrencyForExport(data.totalDebit),
                    formatCurrencyForExport(data.totalCredit),
                    formatBalanceForExport(balance)
                ]);
            } else {
                // Itemwise statement export
                const headers = [
                    'Date',
                    'Voucher No.',
                    'Voucher Type',
                    'Payment Mode',
                    'Account',
                    'Item Name',
                    'Quantity',
                    'Unit',
                    'Rate',
                    'Discount',
                    'Taxable Amount',
                    'VAT Amount',
                    'Total Amount',
                    'Balance'
                ];

                // Add headers row
                excelData.push(headers);

                const groupedStatement = getGroupedItemwiseStatement();
                let balance = data.openingBalance;

                data.statement.forEach((item) => {
                    const voucherKey = `${item.date}-${item.billNumber}`;
                    const voucherData = groupedStatement[voucherKey];
                    const hasItems = voucherData && voucherData.items && voucherData.items.length > 0;

                    // Main transaction row
                    const mainRowData = [
                        formatDateForExport(item.date),
                        item.billNumber || '',
                        item.type || '',
                        item.paymentMode || '',
                        item.accountType?.name || item.purchaseSalesType || item.journalAccountType || item.purchaseSalesReturnType || item.drCrNoteAccountType || item.paymentReceiptAccountType || 'Opening',
                        '', // Item Name (empty for main row)
                        '', // Quantity
                        '', // Unit
                        '', // Rate
                        '', // Discount
                        '', // Taxable Amount
                        '', // VAT Amount
                        '', // Total Amount
                        formatBalanceForExport(balance)
                    ];
                    excelData.push(mainRowData);

                    // Item details rows
                    if (hasItems) {
                        voucherData.items.forEach((itemDetail) => {
                            const isPurchase = item.type?.toLowerCase() === 'purc';
                            const isPurchaseReturn = item.type?.toLowerCase() === 'prrt';
                            const displayPrice = isPurchase || isPurchaseReturn ? itemDetail.puPrice : itemDetail.price;
                            const calculatedAmount = (itemDetail.netPrice || 0) * (itemDetail.quantity || 0);
                            const discountAmount = itemDetail.discountAmountPerItem || 0;

                            const itemRowData = [
                                '', // Date
                                '', // Voucher No.
                                '', // Voucher Type
                                '', // Payment Mode
                                '', // Account
                                itemDetail.item?.name || 'N/A',
                                itemDetail.quantity ? parseFloat(itemDetail.quantity).toFixed(2) : '',
                                itemDetail.unit?.name || '',
                                displayPrice ? formatCurrencyForExport(displayPrice) : '',
                                discountAmount > 0 ? formatCurrencyForExport(discountAmount) : '',
                                calculatedAmount > 0 ? formatCurrencyForExport(calculatedAmount) : '',
                                voucherData.vatAmount > 0 ? formatCurrencyForExport(voucherData.vatAmount) : '',
                                voucherData.totalAmount > 0 ? formatCurrencyForExport(voucherData.totalAmount) : '',
                                '' // Balance (empty for item rows)
                            ];
                            excelData.push(itemRowData);
                        });
                    }

                    // Update running balance
                    balance += (item.debit || 0) - (item.credit || 0);
                });

                // Add totals row
                excelData.push([]);
                excelData.push([
                    'TOTALS', '', '', '', '', '', '', '', '', '', '', '',
                    formatCurrencyForExport(data.totalDebit),
                    formatCurrencyForExport(data.totalCredit),
                    formatBalanceForExport(balance)
                ]);
            }

            // Create worksheet using array format
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Statement Report');

            // Set column widths for better formatting
            const colWidths = viewMode === 'regular'
                ? [
                    { wch: 12 }, // Date
                    { wch: 15 }, // Voucher No.
                    { wch: 15 }, // Voucher Type
                    { wch: 12 }, // Payment Mode
                    { wch: 25 }, // Account
                    { wch: 15 }, // Party Bill No.
                    { wch: 15 }, // Instrument Type
                    { wch: 15 }, // Instrument No.
                    { wch: 15 }, // Debit
                    { wch: 15 }, // Credit
                    { wch: 20 }  // Balance
                ]
                : [
                    { wch: 12 }, // Date
                    { wch: 15 }, // Voucher No.
                    { wch: 15 }, // Voucher Type
                    { wch: 12 }, // Payment Mode
                    { wch: 25 }, // Account
                    { wch: 25 }, // Item Name
                    { wch: 10 }, // Quantity
                    { wch: 10 }, // Unit
                    { wch: 12 }, // Rate
                    { wch: 12 }, // Discount
                    { wch: 15 }, // Taxable Amount
                    { wch: 12 }, // VAT Amount
                    { wch: 15 }, // Total Amount
                    { wch: 20 }  // Balance
                ];
            ws['!cols'] = colWidths;

            // Generate filename
            const fileName = `Statement_${data.partyName}_${data.fromDate}_to_${data.toDate}_${viewMode}.xlsx`;

            // Export to Excel
            XLSX.writeFile(wb, fileName);

            // Show success message
            setNotification({
                show: true,
                message: 'Excel file exported successfully!',
                type: 'success'
            });

        } catch (err) {
            console.error('Error exporting to Excel:', err);
            setNotification({
                show: true,
                message: 'Failed to export Excel file: ' + err.message,
                type: 'error'
            });
        } finally {
            setExporting(false);
        }
    };

    // Helper functions for Excel export
    const formatDateForExport = (dateString) => {
        if (!dateString) return '';
        try {
            if (company.dateFormat === 'nepali') {
                return new NepaliDate(dateString).format('YYYY-MM-DD');
            }
            return new Date(dateString).toISOString().split('T')[0];
        } catch (error) {
            return dateString;
        }
    };

    const formatCurrencyForExport = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toFixed(2);
    };

    const formatBalanceForExport = (amount) => {
        const absAmount = Math.abs(amount);
        const formatted = formatCurrencyForExport(absAmount);
        return amount > 0 ? `${formatted} Dr` : `${formatted} Cr`;
    };


    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredStatement.length === 0) return;

            // Check if focus is inside an input or select element
            const activeElement = document.activeElement;
            if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT') {
                return;
            }

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedRowIndex(prev => Math.max(0, prev - 1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedRowIndex(prev => Math.min(filteredStatement.length - 1, prev + 1));
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredStatement, selectedRowIndex]);

    // Scroll to selected row
    useEffect(() => {
        if (tableBodyRef.current && filteredStatement.length > 0) {
            const rows = tableBodyRef.current.querySelectorAll('tr');
            if (rows.length > selectedRowIndex) {
                rows[selectedRowIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }
    }, [selectedRowIndex, filteredStatement]);

    const handleAccountSearch = (e) => {
        const searchText = e.target.value.toLowerCase();
        const filtered = data.accounts.filter(account =>
            account.name.toLowerCase().includes(searchText) ||
            (account.uniqueNumber && account.uniqueNumber.toString().toLowerCase().includes(searchText))
        ).sort((a, b) => a.name.localeCompare(b.name));

        setFilteredAccounts(filtered);
    };

    const selectAccount = (account) => {
        setData(prev => ({
            ...prev,
            selectedCompany: account._id,
            partyName: account.name
        }));
        setShowAccountModal(false);

        setTimeout(() => {
            const fromDateField = document.getElementById('fromDate');
            if (fromDateField) {
                fromDateField.focus();
            }
        }, 50);
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handlePaymentModeChange = (e) => {
        setData(prev => ({ ...prev, paymentMode: e.target.value }));
    };

    const handleViewModeChange = (e) => {
        setViewMode(e.target.value);
    };

    const handleGenerateReport = () => {
        if (!data.fromDate || !data.toDate) {
            setError('Please select both from and to dates');
            return;
        }
        if (!data.selectedCompany) {
            setError('Please select an account');
            return;
        }
        setShouldFetch(true);
    };

    const handleRowDoubleClick = (item) => {
        // Determine the route based on transaction type and payment mode
        let route = '';
        const billId = item.billId || item._id;
        const purchaseBillId = item.purchaseBillId || item._id;
        const purchaseReturnBillId = item.purchaseReturnBillId || item._id;
        const paymentAccountId = item.paymentAccountId || item._id;
        const receiptAccountId = item.receiptAccountId || item._id;
        const journalBillId = item.journalBillId || item._id;
        const debitNoteId = item.debitNoteId || item._id;

        switch (item.type?.toLowerCase()) {
            case 'sale':
                if (item.paymentMode === 'cash') {
                    route = `/retailer/cash-sales/edit/${billId}`;
                } else if (item.paymentMode === 'credit') {
                    route = `/retailer/credit-sales/edit/${billId}`;
                }
                break;

            case 'purc':
                route = `/retailer/purchase/edit/${purchaseBillId}`;
                break;

            case 'prrt':
                route = `/retailer/purchase-return/edit/${purchaseReturnBillId}`;
                break;

            case 'pymt':
                route = `/retailer/payments/${paymentAccountId}`;
                break;

            case 'rcpt':
                route = `/retailer/receipts/${receiptAccountId}`;
                break;

            case 'jrnl':
                route = `/retailer/journal/${journalBillId}`;
                break;

            case 'drnt':
                route = `/retailer/debit-note/${debitNoteId}`;
                break;

            case 'credit note':
                route = `/retailer/credit-note/edit/${billId}`;
                break;

            default:
                console.log('No edit route for transaction type:', item.type);
                // You can show a toast notification here
                return;
        }

        if (route) {
            navigate(route);
        }
    };

    // Toggle voucher expansion for itemwise view
    const toggleVoucherExpansion = (voucherKey) => {
        setExpandedVouchers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(voucherKey)) {
                newSet.delete(voucherKey);
            } else {
                newSet.add(voucherKey);
            }
            return newSet;
        });
    };

    // Group items by voucher for itemwise view - UPDATED FOR NEW STRUCTURE
    const getGroupedItemwiseStatement = () => {
        const grouped = {};
        itemwiseStatement.forEach(bill => {
            const voucherKey = `${bill.date}-${bill.billNumber}`;
            if (!grouped[voucherKey]) {
                grouped[voucherKey] = {
                    date: bill.date,
                    billNumber: bill.billNumber,
                    type: bill.type,
                    paymentMode: bill.paymentMode,
                    partyBillNumber: bill.partyBillNumber,
                    vatAmount: bill.vatAmount,
                    totalAmount: bill.totalAmount,
                    items: bill.items || [] // Use the nested items array
                };
            }
        });
        return grouped;
    };

    const formatBalance = (amount) => {
        return amount > 0 ? `${amount.toFixed(2)} Dr` : `${(-amount).toFixed(2)} Cr`;
    };

    const formatCurrency = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        if (company.dateFormat === 'nepali') {
            // Indian grouping, two decimals, English digits
            return number.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        // English (US) grouping by default
        return number.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    function formatAmountWithType(amount, type = '') {
        const formatted = formatCurrency(Math.abs(amount));
        if (type.toLowerCase() === 'dr' && amount > 0) {
            return `${formatted} Dr`;
        }
        if (type.toLowerCase() === 'cr' && amount < 0) {
            return `${formatted} Cr`;
        }
        if (amount > 0) return `${formatted} Dr`;
        if (amount < 0) return `${formatted} Cr`;
        return `${formatted}`; // For zero
    }

    const handlePrint = () => {
        const rowsToPrint = viewMode === 'regular'
            ? document.querySelectorAll('.statement-row')
            : document.querySelectorAll('.statement-row, .item-detail-row');

        if (rowsToPrint.length === 0) {
            alert("No statement to print");
            return;
        }

        const printWindow = window.open("", "_blank");

        let tableContent = '';

        if (viewMode === 'regular') {
            tableContent = generateRegularPrintContent();
        } else {
            tableContent = generateItemwisePrintContent();
        }

        printWindow.document.write(`
        <html>
            <head>
                <title>Statement - ${viewMode === 'regular' ? 'Regular' : 'Itemwise'}</title>
            </head>
            <body>
                ${tableContent}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 200);
                    };
                <\/script>
            </body>
        </html>
    `);
        printWindow.document.close();
    };

    const generateRegularPrintContent = () => {
        const printHeader = `
        <div class="print-header">
            <h1 style="text-align:center;text-decoration:underline;">Statement</h1>
            <h1>${data.currentCompanyName || 'Company Name'}</h1>
            <p>
                ${data.company?.address || ''}-${data.company?.ward || ''}, ${data.company?.city || ''},
            </p>
            <hr>
        </div>
    `;

        let tableContent = `
        <style>
            @page {
                margin: 10mm;
            }
            body { 
                font-family: Arial, sans-serif; 
                font-size: 10px; 
                margin: 0;
                padding: 10mm;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                page-break-inside: auto;
            }
            tr { 
                page-break-inside: avoid; 
                page-break-after: auto; 
            }
            th, td { 
                border: 1px solid #000; 
                padding: 4px; 
                text-align: left; 
                white-space: nowrap;
            }
            th { 
                background-color: #f8f8f8; 
                font-weight: bold;
            }
            .print-header { 
                text-align: center; 
                margin-bottom: 15px; 
            }
            .nowrap {
                white-space: nowrap;
            }
            .text-end {
                text-align: right;
            }
            .statement-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding: 0 20px;
                font-size:10px
            }
            .instrument-details {
                font-size: 0.8em;
            }
            .total-row {
                font-weight: bold;
                border-top: 2px solid #000;
            }
        </style>
        ${printHeader}
        <div class="statement-header">
            <div><strong>Party Name:</strong> ${data.partyName}</div>
            <div><strong>From:</strong> ${data.fromDate} To:</strong> ${data.toDate}</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th class="nowrap">Date</th>
                    <th class="nowrap">Vch. No.</th>
                    <th class="nowrap">Vch. Type</th>
                    <th class="nowrap">Pay Mode</th>
                    <th class="nowrap">Account</th>
                    <th class="nowrap">Debit</th>
                    <th class="nowrap">Credit</th>
                    <th class="nowrap">Balance</th>
                </tr>
            </thead>
            <tbody>
    `;

        let balance = data.openingBalance;

        data.statement.forEach((item, index) => {
            if (index === 0) {
                tableContent += `
                <tr>
                    <td class="nowrap">${new Date(item.date).toLocaleDateString()}</td>
                    <td class="nowrap">${item.billNumber || ''}</td>
                    <td class="nowrap">${item.type}</td>
                    <td class="nowrap">${item.paymentMode || ''}</td>
                    <td class="nowrap">
                        ${item.accountType?.name || item.purchaseSalesType || item.journalAccountType || item.purchaseSalesReturnType || item.drCrNoteAccountType || item.paymentReceiptAccountType || 'Opening'}
                        ${item.partyBillNumber || ''}
                        ${(item.InstType && item.InstType !== 'N/A') ?
                        `<div class="instrument-details"><strong>Inst:</strong> ${item.InstType} ${item.InstNo ? `- ${item.InstNo}` : ''}</div>`
                        : ''}
                    </td>
                    <td class="text-end">${item.debit ? parseFloat(item.debit).toFixed(2) : '0.00'}</td>
                    <td class="text-end">${item.credit ? parseFloat(item.credit).toFixed(2) : '0.00'}</td>
                    <td class="text-end">${formatBalance(balance)}</td>
                </tr>
            `;
            } else {
                balance += (item.debit || 0) - (item.credit || 0);
                tableContent += `
                <tr>
                    <td class="nowrap">${new Date(item.date).toLocaleDateString()}</td>
                    <td class="nowrap">${item.billNumber || ''}</td>
                    <td class="nowrap">${item.type}</td>
                    <td class="nowrap">${item.paymentMode || ''}</td>
                    <td class="nowrap">
                        ${item.accountType?.name || item.purchaseSalesType || item.journalAccountType || item.purchaseSalesReturnType || item.drCrNoteAccountType || item.paymentReceiptAccountType || 'Opening'}
                        ${item.partyBillNumber || ''}
                        ${(item.InstType && item.InstType !== 'N/A') ?
                        `<div class="instrument-details"><strong>Inst:</strong> ${item.InstType} ${item.InstNo ? `- ${item.InstNo}` : ''}</div>`
                        : ''}
                    </td>
                    <td class="text-end">${item.debit ? parseFloat(item.debit).toFixed(2) : '0.00'}</td>
                    <td class="text-end">${item.credit ? parseFloat(item.credit).toFixed(2) : '0.00'}</td>
                    <td class="text-end">${formatBalance(balance)}</td>
                </tr>
            `;
            }
        });

        tableContent += `
            <tr class="total-row">
                <td colspan="5">Totals</td>
                <td class="text-end">${data.totalDebit.toFixed(2)}</td>
                <td class="text-end">${data.totalCredit.toFixed(2)}</td>
                <td class="text-end">${formatBalance(balance)}</td>
            </tr>
            </tbody>
        </table>
    `;

        return tableContent;
    };


    const generateItemwisePrintContent = () => {
        const groupedStatement = getGroupedItemwiseStatement();

        const printHeader = `
    <div class="print-header">
        <h1 style="text-align:center;text-decoration:underline;">Itemwise Statement</h1>
        <h1>${data.currentCompanyName || 'Company Name'}</h1>
        <p>
            ${data.company?.address || ''}-${data.company?.ward || ''}, ${data.company?.city || ''},
        </p>
        <hr>
    </div>
`;

        let tableContent = `
    <style>
        @page {
            margin: 10mm;
        }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 9px; 
            margin: 0;
            padding: 10mm;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            page-break-inside: auto;
        }
        tr { 
            page-break-inside: avoid; 
            page-break-after: auto; 
        }
        th, td { 
            border: 1px solid #000; 
            padding: 3px; 
            text-align: left; 
        }
        th { 
            background-color: #f8f8f8; 
            font-weight: bold;
        }
        .print-header { 
            text-align: center; 
            margin-bottom: 15px; 
        }
        .nowrap {
            white-space: nowrap;
        }
        .text-end {
            text-align: right;
        }
        .statement-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding: 0 20px;
            font-size:9px
        }
        .voucher-header {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        .item-detail {
            background-color: #f8f8f8;
        }
        .item-indent {
            padding-left: 20px !important;
        }
        .item-details {
            font-size: 8px;
            margin-top: 2px;
        }
        .item-info {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 2px;
        }
        .item-field {
            white-space: nowrap;
        }
        .separator {
            border-top: 1px solid #ccc;
            margin: 4px 0;
        }
        .summary-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 2px 0;
        }
        .summary-amount {
            font-weight: bold;
        }
        .total-row {
            font-weight: bold;
            border-top: 2px solid #000;
        }
    </style>
    ${printHeader}
    <div class="statement-header">
        <div><strong>Party Name:</strong> ${data.partyName}</div>
        <div><strong>From:</strong> ${data.fromDate} To:</strong> ${data.toDate}</div>
        <div><strong>View:</strong> Itemwise Statement</div>
    </div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Vch. No.</th>
                <th>Vch. Type</th>
                <th>Pay Mode</th>
                <th>Account / Item Details</th>
                <th class="text-end">Debit</th>
                <th class="text-end">Credit</th>
                <th class="text-end">Balance</th>
            </tr>
        </thead>
        <tbody>
`;

        let balance = data.openingBalance;

        data.statement.forEach((item, index) => {
            const voucherKey = `${item.date}-${item.billNumber}`;
            const voucherData = groupedStatement[voucherKey];
            const hasItems = voucherData && voucherData.items && voucherData.items.length > 0;

            // Voucher header row
            if (index === 0) {
                tableContent += `
            <tr class="voucher-header">
                <td class="nowrap">${new Date(item.date).toLocaleDateString()}</td>
                <td class="nowrap">${item.billNumber || ''}</td>
                <td class="nowrap">${item.type}</td>
                <td class="nowrap">${item.paymentMode || ''}</td>
                <td>
                    <strong>${item.accountType?.name || item.purchaseSalesType || item.journalAccountType || item.purchaseSalesReturnType || item.drCrNoteAccountType || item.paymentReceiptAccountType || 'Opening'}</strong>
                    ${item.partyBillNumber ? ` (${item.partyBillNumber})` : ''}
                    ${(item.InstType && item.InstType !== 'N/A') ?
                        `<div class="item-details"><strong>Inst:</strong> ${item.InstType} ${item.InstNo ? `- ${item.InstNo}` : ''}</div>`
                        : ''}
                    ${hasItems ? `<div class="item-details">Contains ${voucherData.items.length} item(s)</div>` : ''}
                </td>
                <td class="text-end">${item.debit ? parseFloat(item.debit).toFixed(2) : '0.00'}</td>
                <td class="text-end">${item.credit ? parseFloat(item.credit).toFixed(2) : '0.00'}</td>
                <td class="text-end">${formatBalance(balance)}</td>
            </tr>
        `;
            } else {
                balance += (item.debit || 0) - (item.credit || 0);
                tableContent += `
            <tr class="voucher-header">
                <td class="nowrap">${new Date(item.date).toLocaleDateString()}</td>
                <td class="nowrap">${item.billNumber || ''}</td>
                <td class="nowrap">${item.type}</td>
                <td class="nowrap">${item.paymentMode || ''}</td>
                <td>
                    <strong>${item.accountType?.name || item.purchaseSalesType || item.journalAccountType || item.purchaseSalesReturnType || item.drCrNoteAccountType || item.paymentReceiptAccountType || 'Opening'}</strong>
                    ${item.partyBillNumber ? ` (${item.partyBillNumber})` : ''}
                    ${(item.InstType && item.InstType !== 'N/A') ?
                        `<div class="item-details"><strong>Inst:</strong> ${item.InstType} ${item.InstNo ? `- ${item.InstNo}` : ''}</div>`
                        : ''}
                    ${hasItems ? `<div class="item-details">Contains ${voucherData.items.length} item(s)</div>` : ''}
                </td>
                <td class="text-end">${item.debit ? parseFloat(item.debit).toFixed(2) : '0.00'}</td>
                <td class="text-end">${item.credit ? parseFloat(item.credit).toFixed(2) : '0.00'}</td>
                <td class="text-end">${formatBalance(balance)}</td>
            </tr>
        `;
            }

            // Item detail rows
            if (hasItems) {
                voucherData.items.forEach((itemDetail, itemIndex) => {
                    const isPurchase = item.type?.toLowerCase() === 'purc';
                    const isPurchaseReturn = item.type?.toLowerCase() === 'prrt';
                    const displayPrice = isPurchase || isPurchaseReturn ? itemDetail.puPrice : itemDetail.price;
                    const priceLabel = isPurchase || isPurchaseReturn ? 'Pur. Rate' : 'Rate';
                    const calculatedAmount = (itemDetail.netPrice || 0) * (itemDetail.quantity || 0);
                    const discountAmount = itemDetail.discountAmountPerItem || 0;

                    tableContent += `
                <tr class="item-detail">
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td class="item-indent">
                        <div>
                            <strong>${itemDetail.item?.name || 'N/A'}</strong>
                            <div class="item-info">
                                ${itemDetail.quantity ? `<span class="item-field"><strong>Qty:</strong> ${parseFloat(itemDetail.quantity).toFixed(2)}</span>` : ''}
                                ${itemDetail.unit?.name ? `<span class="item-field"><strong>Unit:</strong> ${itemDetail.unit.name}</span>` : ''}
                                ${displayPrice ? `<span class="item-field"><strong>${priceLabel}:</strong> ${formatCurrency(displayPrice)}</span>` : ''}
                                ${discountAmount > 0 ? `<span class="item-field"><strong>Disc:</strong> ${formatCurrency(discountAmount)}</span>` : ''}
                                ${calculatedAmount > 0 ? `<span class="item-field"><strong>Tax. Amt:</strong> ${formatCurrency(calculatedAmount)}</span>` : ''}
                            </div>
                        </div>
                    </td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            `;
                });

                // VAT and Total Summary Row
                tableContent += `
                <tr class="voucher-summary">
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td class="item-indent">
                        ${voucherData.vatAmount > 0 ? `
                            <div class="summary-line">
                                <span><strong>VAT:</strong></span>
                                <span class="summary-amount">${formatCurrency(voucherData.vatAmount)}</span>
                            </div>
                        ` : ''}
                        ${voucherData.totalAmount > 0 ? `
                            <div class="summary-line">
                                <span><strong>Total:</strong></span>
                                <span class="summary-amount">${formatCurrency(voucherData.totalAmount)}</span>
                            </div>
                        ` : ''}
                    </td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            `;
            }
        });

        tableContent += `
        <tr class="total-row">
            <td colspan="5">Totals</td>
            <td class="text-end">${data.totalDebit.toFixed(2)}</td>
            <td class="text-end">${data.totalCredit.toFixed(2)}</td>
            <td class="text-end">${formatBalance(balance)}</td>
        </tr>
        </tbody>
    </table>
`;
        return tableContent;
    };

    const handleRowClick = (index) => {
        setSelectedRowIndex(index);
    };

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                const nextField = document.getElementById(nextFieldId);
                if (nextField) {
                    nextField.focus();
                }
            } else {
                // If no nextFieldId provided, try to find the next focusable element
                const focusableElements = Array.from(
                    document.querySelectorAll('input, select, button, [tabindex]:not([tabindex="-1"])')
                ).filter(el => !el.disabled && el.offsetParent !== null);

                const currentIndex = focusableElements.findIndex(el => el === e.target);

                if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
                    focusableElements[currentIndex + 1].focus();
                }
            }
        }
    };

    const renderItemwiseStatement = () => {
        const groupedStatement = getGroupedItemwiseStatement();
        return (
            <div className="table-responsive">
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Vch. No.</th>
                            <th>Vch. Type</th>
                            <th>Pay Mode</th>
                            <th>Account / Item Details</th>
                            <th className="text-end">Debit</th>
                            <th className="text-end">Credit</th>
                            <th className="text-end">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.statement.map((item, index) => {
                            const voucherKey = `${item.date}-${item.billNumber}`;
                            const voucherData = groupedStatement[voucherKey];
                            const hasItems = voucherData && voucherData.items && voucherData.items.length > 0;

                            return (
                                <React.Fragment key={index}>
                                    {/* Voucher Header Row */}
                                    <tr
                                        className={`statement-row ${selectedRowIndex === index ? 'highlighted-row' : ''}`}
                                        onClick={() => handleRowClick(index)}
                                        onDoubleClick={() => handleRowDoubleClick(item)}
                                        style={{ cursor: 'pointer' }}
                                        title="Double-click to edit"
                                    >
                                        <td>{new NepaliDate(item.date).format('YYYY-MM-DD')}</td>
                                        <td>{item.billNumber || ''}</td>
                                        <td>{item.type}</td>
                                        <td>{item.paymentMode || ''}</td>
                                        <td>
                                            <div>
                                                <strong>
                                                    {item.accountType?.name ||
                                                        item.purchaseSalesType ||
                                                        item.journalAccountType ||
                                                        item.purchaseSalesReturnType ||
                                                        item.drCrNoteAccountType ||
                                                        item.paymentReceiptAccountType ||
                                                        'Opening'}
                                                </strong>
                                                {item.partyBillNumber && (
                                                    <span style={{ marginLeft: '5px' }}>
                                                        {item.partyBillNumber}
                                                    </span>
                                                )}
                                                {/* Add instrument details if available */}
                                                {(item.InstType && item.InstType !== 'N/A') && (
                                                    <div className="small">
                                                        <strong>Inst:</strong> {item.InstType} {item.InstNo && `- ${item.InstNo}`}
                                                    </div>
                                                )}
                                                {hasItems && (
                                                    <div className="small text-success mt-1">
                                                        <i className="fas fa-boxes me-1"></i>
                                                        Contains {voucherData.items.length} item(s)
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-end">{formatCurrency(item.debit) ? formatCurrency(item.debit) : '0.00'}</td>
                                        <td className="text-end">{formatCurrency(item.credit) ? formatCurrency(item.credit) : '0.00'}</td>
                                        <td className="text-end">{formatAmountWithType(item.balance) ? formatAmountWithType(item.balance) : '0.00'}</td>
                                    </tr>

                                    {/* Item Details Rows */}
                                    {hasItems && voucherData.items.map((itemDetail, itemIndex) => {
                                        const isPurchase = item.type?.toLowerCase() === 'purc';
                                        const isPurchaseReturn = item.type?.toLowerCase() === 'prrt';
                                        const displayPrice = isPurchase || isPurchaseReturn ? itemDetail.puPrice : itemDetail.price;
                                        const priceLabel = isPurchase || isPurchaseReturn ? 'Pur. Rate' : 'Rate';

                                        const calculatedAmount = (itemDetail.netPrice || 0) * (itemDetail.quantity || 0);
                                        const discountAmount = itemDetail.discountAmountPerItem || 0;

                                        return (
                                            <tr key={`${index}-${itemIndex}`} className="item-detail-row bg-light">
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td className="ps-4">
                                                    <div className="small">
                                                        <div className="d-flex align-items-center mb-1">
                                                            <i className="fas fa-cube text-primary me-2"></i>
                                                            <strong className="me-2">Item:</strong>
                                                            <span className="text-dark fw-bold">{itemDetail.item?.name || 'N/A'}</span>
                                                        </div>
                                                        <div className="d-flex flex-wrap gap-3 ms-3">
                                                            {itemDetail.quantity && (
                                                                <span className="badge bg-info text-dark">
                                                                    <strong>Qty:</strong> {parseFloat(itemDetail.quantity).toFixed(2)}
                                                                </span>
                                                            )}
                                                            {itemDetail.unit?.name && (
                                                                <span className="badge bg-secondary">
                                                                    <strong>Unit:</strong> {itemDetail.unit.name}
                                                                </span>
                                                            )}
                                                            {displayPrice && (
                                                                <span className="badge bg-warning text-dark">
                                                                    <strong>{priceLabel}:</strong> {formatCurrency(displayPrice)}
                                                                </span>
                                                            )}
                                                            {/* DISCOUNT AMOUNT */}
                                                            {discountAmount > 0 && (
                                                                <span className="badge bg-danger text-white">
                                                                    <strong>Disc:</strong> {formatCurrency(discountAmount)}
                                                                </span>
                                                            )}
                                                            {/* TAXABLE AMOUNT */}
                                                            {calculatedAmount > 0 && (
                                                                <span className="badge bg-success">
                                                                    <strong>Tax. Amt:</strong> {formatCurrency(calculatedAmount)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        );
                                    })}

                                    {/* VAT and Total Summary Row */}
                                    {hasItems && (
                                        <tr className="voucher-summary-row bg-light">
                                            <td colSpan="4"></td>
                                            <td className="ps-4">
                                                <div className="small fw-bold">
                                                    <div className="d-flex flex-column gap-2">
                                                        {/* VAT Amount - Display directly from data */}
                                                        {voucherData.vatAmount > 0 && (
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <span className="text-dark">VAT:</span>
                                                                <span className="badge bg-dark text-white fs-6">
                                                                    {formatCurrency(voucherData.vatAmount)}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Total Amount - Display directly from data */}
                                                        {voucherData.totalAmount > 0 && (
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <span className="text-dark fw-bold">Total:</span>
                                                                <span className="badge bg-primary text-white fs-6">
                                                                    {formatCurrency(voucherData.totalAmount)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="fw-bold">
                            <td colSpan="5">Totals:</td>
                            <td className="text-end">{formatCurrency(data.totalDebit)}</td>
                            <td className="text-end">{formatCurrency(data.totalCredit)}</td>
                            <td className="text-end">{formatAmountWithType(data.statement.length > 0 ? data.statement[data.statement.length - 1].balance : 0)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    };

    const renderRegularStatement = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Vch. No.</th>
                            <th>Vch. Type</th>
                            <th>Pay Mode</th>
                            <th>Account</th>
                            <th className="text-end">Debit</th>
                            <th className="text-end">Credit</th>
                            <th className="text-end">Balance</th>
                        </tr>
                    </thead>
                    <tbody ref={tableBodyRef}>
                        {filteredStatement.map((item, index) => (
                            <tr
                                key={index}
                                className={`statement-row ${selectedRowIndex === index ? 'highlighted-row' : ''}`}
                                onClick={() => handleRowClick(index)}
                                onDoubleClick={() => handleRowDoubleClick(item)}
                                style={{ cursor: 'pointer' }}
                                title="Double-click to edit"
                            >
                                <td>{new NepaliDate(item.date).format('YYYY-MM-DD')}</td>
                                <td>{item.billNumber || ''}</td>
                                <td>{item.type}</td>
                                <td>{item.paymentMode || ''}</td>
                                <td>
                                    {item.accountType?.name ||
                                        item.purchaseSalesType ||
                                        item.journalAccountType ||
                                        item.purchaseSalesReturnType ||
                                        item.drCrNoteAccountType ||
                                        item.paymentReceiptAccountType ||
                                        'Opening'}
                                    {item.partyBillNumber && (
                                        <span style={{ marginLeft: '5px' }}>
                                            {item.partyBillNumber}
                                        </span>
                                    )}
                                    {/* Add instrument details if available */}
                                    {(item.InstType && item.InstType !== 'N/A') && (
                                        <div>
                                            <strong>Inst:</strong> {item.InstType} {item.InstNo && `- ${item.InstNo}`}
                                        </div>
                                    )}
                                </td>
                                <td className="text-end">{formatCurrency(item.debit) ? formatCurrency(item.debit) : '0.00'}</td>
                                <td className="text-end">{formatCurrency(item.credit) ? formatCurrency(item.credit) : '0.00'}</td>
                                <td className="text-end">{formatAmountWithType(item.balance) ? formatAmountWithType(item.balance) : '0.00'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="fw-bold">
                            <td colSpan="5">Totals:</td>
                            <td className="text-end">{formatCurrency(data.totalDebit)}</td>
                            <td className="text-end">{formatCurrency(data.totalCredit)}</td>
                            <td className="text-end">{formatAmountWithType(data.statement.length > 0 ? data.statement[data.statement.length - 1].balance : 0)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    };

    if (loading) return <Loader />;
    if (error) {
        return <div className="alert alert-danger text-center py-5">{error}</div>;
    }

    return (
        <div className="container-fluid">
            <Header />
            <div className="card shadow">
                <div className="card-header bg-white py-3">
                    <h1 className="h3 mb-0 text-center text-primary">Statement</h1>
                </div>

                <div className="card-body">
                    {/* Search and Filter Section */}
                    <div className="row mb-2 g-3">
                        {/* Account Selection */}
                        <div className="col-md-3">
                            <label htmlFor="account">Party Name:</label>
                            <input
                                type="text"
                                id="account"
                                name="account"
                                className="form-control"
                                value={data.partyName}
                                onClick={() => setShowAccountModal(true)}
                                onFocus={() => setShowAccountModal(true)}
                                readOnly
                                required
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleKeyDown(e, 'fromDate');
                                    }
                                }}
                            />
                            <input type="hidden" id="accountId" name="accountId" value={data.selectedCompany} />
                        </div>

                        {/* Date Range */}
                        <div className="col-md-2">
                            <label htmlFor="fromDate">From Date</label>
                            <input
                                type="text"
                                name="fromDate"
                                id="fromDate"
                                ref={company.dateFormat === 'nepali' ? fromDateRef : null}
                                className="form-control no-date-icon"
                                value={data.fromDate}
                                onChange={handleDateChange}
                                required
                                autoComplete='off'
                                onKeyDown={(e) => handleKeyDown(e, 'toDate')}
                            />
                        </div>
                        <div className="col-md-2">
                            <label htmlFor="toDate">To Date</label>
                            <input
                                type="text"
                                name="toDate"
                                id="toDate"
                                ref={toDateRef}
                                className="form-control no-date-icon"
                                value={data.toDate}
                                onChange={handleDateChange}
                                required
                                autoComplete='off'
                                onKeyDown={(e) => handleKeyDown(e, 'paymentMode')}
                            />
                        </div>

                        {/* Payment Mode */}
                        <div className="col-md-2">
                            <label htmlFor="paymentMode">Payment Mode</label>
                            <select
                                className="form-control"
                                id="paymentMode"
                                ref={paymentModeRef}
                                value={data.paymentMode}
                                onChange={handlePaymentModeChange}
                                onKeyDown={(e) => handleKeyDown(e, 'viewMode')}
                            >
                                {paymentModeOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* View Mode */}
                        <div className="col-md-2">
                            <label htmlFor="viewMode">View Mode</label>
                            <select
                                className="form-control"
                                id="viewMode"
                                value={viewMode}
                                onChange={handleViewModeChange}
                                onKeyDown={(e) => handleKeyDown(e, 'searchInput')}
                            >
                                <option value="regular">Regular</option>
                                <option value="itemwise">Itemwise</option>
                            </select>
                        </div>

                        {/* Search */}
                        <div className="col-md-2">
                            {/* <label htmlFor="searchInput">Search</label> */}
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    id="searchInput"
                                    ref={searchInputRef}
                                    placeholder="Search statement..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoComplete='off'
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !searchQuery) {
                                            handleKeyDown(e, 'generateReport');
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div className="col-md-1 d-flex align-items-end">
                            <button
                                type="button"
                                id="generateReport"
                                ref={generateReportRef}
                                className="btn btn-primary w-100"
                                onClick={handleGenerateReport}
                            >
                                <i className="fas fa-chart-line me-2"></i>Generate
                            </button>
                        </div>
                        <div className="col-md-1 d-flex align-items-end">
                            <button
                                className="btn btn-success w-100"
                                onClick={handleExportExcel}
                                disabled={data.statement.length === 0 || exporting}
                            >
                                {exporting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-file-excel me-1"></i>Excel
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Print Button */}
                        <div className="col-md-1 d-flex align-items-end">
                            <button
                                className="btn btn-secondary w-100"
                                onClick={handlePrint}
                                disabled={data.statement.length === 0}
                            >
                                <i className="fas fa-print"></i>Print
                            </button>
                        </div>

                        <div className="col-md-1 d-flex align-items-end">
                            <span className="badge bg-primary fs-6">
                                <strong>Party Name:</strong> {data.partyName}
                            </span>
                        </div>
                    </div>

                    {data.statement.length === 0 ? (
                        <div className="alert alert-info text-center py-3">
                            <i className="fas fa-info-circle me-2"></i>
                            Please select account, date range and click "Generate Report" to view statement
                        </div>
                    ) : (
                        <>
                            {/* Statement Table - Same format for both views */}
                            {viewMode === 'regular' ? renderRegularStatement() : renderItemwiseStatement()}

                            {/* Statement Summary */}
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <div className="card">
                                        <div className="card-body">
                                            <h5 className="card-title">Statement Summary</h5>
                                            <div className="row">
                                                <div className="col">
                                                    <p><strong>Opening Balance:</strong> {formatAmountWithType(data.openingBalance)}</p>
                                                    <p><strong>From Date:</strong> {new Date(data.fromDate).toLocaleDateString()}</p>
                                                    <p><strong>To Date:</strong> {new Date(data.toDate).toLocaleDateString()}</p>
                                                </div>
                                                <div className="col">
                                                    <p><strong>Total Debit:</strong> {formatCurrency(data.totalDebit)}</p>
                                                    <p><strong>Total Credit:</strong> {formatCurrency(data.totalCredit)}</p>
                                                    <p><strong>Closing Balance:</strong> {formatAmountWithType(data.statement.length > 0 ? data.statement[data.statement.length - 1].balance : 0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Account Modal */}
            {showAccountModal && (
                <div className="modal fade show" id="accountModal" tabIndex="-1" style={{ display: 'block' }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content" style={{ height: '500px' }}>
                            <div className="modal-header">
                                <h5 className="modal-title" id="accountModalLabel">Select an Account</h5>
                                <button type="button" className="btn-close" onClick={() => setShowAccountModal(false)}></button>
                            </div>
                            <div className="p-3 bg-white sticky-top">
                                <input
                                    type="text"
                                    id="searchAccount"
                                    className="form-control form-control-sm"
                                    placeholder="Search Account"
                                    autoFocus
                                    autoComplete='off'
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
                                                const account = filteredAccounts.length > 0
                                                    ? filteredAccounts.find(a => a._id === accountId)
                                                    : data.accounts.find(a => a._id === accountId);
                                                if (account) {
                                                    selectAccount(account);
                                                }
                                            }
                                        }
                                    }}
                                    ref={accountSearchRef}
                                />
                            </div>
                            <div className="modal-body p-0">
                                <div className="overflow-auto" style={{ height: 'calc(400px - 120px)' }}>
                                    <ul id="accountList" className="list-group">
                                        {filteredAccounts.length > 0 ? (
                                            filteredAccounts
                                                .sort((a, b) => a.name.localeCompare(b.name))
                                                .map((account, index) => (
                                                    <li
                                                        key={account._id}
                                                        data-account-id={account._id}
                                                        className={`list-group-item account-item py-2 ${index === 0 ? 'active' : ''}`}
                                                        onClick={() => selectAccount(account)}
                                                        style={{ cursor: 'pointer' }}
                                                        tabIndex={0}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'ArrowDown') {
                                                                e.preventDefault();
                                                                const nextItem = e.target.nextElementSibling;
                                                                if (nextItem) {
                                                                    e.target.classList.remove('active');
                                                                    nextItem.classList.add('active');
                                                                    nextItem.focus();
                                                                }
                                                            } else if (e.key === 'ArrowUp') {
                                                                e.preventDefault();
                                                                const prevItem = e.target.previousElementSibling;
                                                                if (prevItem) {
                                                                    e.target.classList.remove('active');
                                                                    prevItem.classList.add('active');
                                                                    prevItem.focus();
                                                                } else {
                                                                    accountSearchRef.current.focus();
                                                                }
                                                            } else if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                selectAccount(account);
                                                            }
                                                        }}
                                                        onFocus={(e) => {
                                                            document.querySelectorAll('.account-item').forEach(item => {
                                                                item.classList.remove('active');
                                                            });
                                                            e.target.classList.add('active');
                                                        }}
                                                    >
                                                        <div className="d-flex justify-content-between small">
                                                            <strong>{account.uniqueNumber || 'N/A'} {account.name}</strong>
                                                            <span>📍 {account.address || 'N/A'} | 🆔 PAN: {account.pan || 'N/A'}</span>
                                                        </div>
                                                    </li>
                                                ))
                                        ) : (
                                            accountSearchRef.current?.value ? (
                                                <li className="list-group-item text-center text-muted small py-2">No accounts found</li>
                                            ) : (
                                                data.accounts
                                                    .sort((a, b) => a.name.localeCompare(b.name))
                                                    .map((account, index) => (
                                                        <li
                                                            key={account._id}
                                                            data-account-id={account._id}
                                                            className={`list-group-item account-item py-2 ${index === 0 ? 'active' : ''}`}
                                                            onClick={() => selectAccount(account)}
                                                            style={{ cursor: 'pointer' }}
                                                            tabIndex={0}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'ArrowDown') {
                                                                    e.preventDefault();
                                                                    const nextItem = e.target.nextElementSibling;
                                                                    if (nextItem) {
                                                                        e.target.classList.remove('active');
                                                                        nextItem.classList.add('active');
                                                                        nextItem.focus();
                                                                    }
                                                                } else if (e.key === 'ArrowUp') {
                                                                    e.preventDefault();
                                                                    const prevItem = e.target.previousElementSibling;
                                                                    if (prevItem) {
                                                                        e.target.classList.remove('active');
                                                                        prevItem.classList.add('active');
                                                                        prevItem.focus();
                                                                    } else {
                                                                        accountSearchRef.current.focus();
                                                                    }
                                                                } else if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    selectAccount(account);
                                                                }
                                                            }}
                                                            onFocus={(e) => {
                                                                document.querySelectorAll('.account-item').forEach(item => {
                                                                    item.classList.remove('active');
                                                                });
                                                                e.target.classList.add('active');
                                                            }}
                                                        >
                                                            <div className="d-flex justify-content-between small">
                                                                <strong>{account.uniqueNumber || 'N/A'} {account.name}</strong>
                                                                <span>📍 {account.address || 'N/A'} | 🆔 PAN: {account.pan || 'N/A'}</span>
                                                            </div>
                                                        </li>
                                                    ))
                                            )
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />
        </div>
    );
};

export default Statement;
//------------------------------------------------------------------------end

