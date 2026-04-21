
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Table, Button, Modal, Badge } from 'react-bootstrap';
import { FiSearch, FiFileText, FiDownload, FiPrinter, FiUser, FiTrendingUp, FiCalendar, FiDollarSign } from 'react-icons/fi';
import Header from './retailer/Header';
import Loader from './Loader';
import NotificationToast from './NotificationToast';
import VirtualizedAccountList from './VirtualizedAccountList';

const VATConfirmationLetter = () => {
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

    // Account search states for virtualized list
    const [accounts, setAccounts] = useState([]);
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchResults, setAccountSearchResults] = useState([]);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);

    const [selectedParty, setSelectedParty] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [startMonth, setStartMonth] = useState('');
    const [endMonth, setEndMonth] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const partyNameRef = useRef(null);

    // Fiscal year from JWT claims via API
    const [fiscalYear, setFiscalYear] = useState('');
    const [companyDateFormat, setCompanyDateFormat] = useState('nepali');
    const [isInitialized, setIsInitialized] = useState(false);

    const navigate = useNavigate();
    const startMonthRef = useRef(null);
    const endMonthRef = useRef(null);
    const accountSearchRef = useRef(null);
    const selectedPartyDisplayRef = useRef(null);

    // Nepali months mapping
    const nepaliMonths = [
        { value: 1, name: "Baisakh" },
        { value: 2, name: "Jestha" },
        { value: 3, name: "Ashad" },
        { value: 4, name: "Shrawan" },
        { value: 5, name: "Bhadra" },
        { value: 6, name: "Ashoj" },
        { value: 7, name: "Kartik" },
        { value: 8, name: "Mangsir" },
        { value: 9, name: "Poush" },
        { value: 10, name: "Magh" },
        { value: 11, name: "Falgun" },
        { value: 12, name: "Chaitra" }
    ];

    // Add after the nepaliMonths array
    const nepaliMonthsNames = {
        1: "बैशाख",
        2: "जेठ",
        3: "असार",
        4: "साउन",
        5: "भदौ",
        6: "असोज",
        7: "कात्तिक",
        8: "मंसिर",
        9: "पौष",
        10: "माघ",
        11: "फागुन",
        12: "चैत्र"
    };

    const nepaliTranslations = {
        title: "भ्याट तथा बाँकी सुनिश्चितता पत्र",
        from: "बाट",
        to: "लाई",
        fiscalYear: "आर्थिक वर्ष",
        generatedOn: "जारी मिति",
        referenceNo: "सन्दर्भ नम्बर",
        period: "अवधि",
        page: "पृष्ठ",
        dearSirMadam: "प्रिय महोदय/महोदया,",
        letterBody1: "प्रचलित लेखा मान्यता र नियामक आवश्यकताहरू अनुसार, हामी तपाईंको पुनरावलोकन र सुनिश्चितताको लागि आर्थिक वर्षको निम्नलिखित कारोबार सारांश र बाँकी सुनिश्चितता पेश गर्दछौं।",
        letterBody2: "कृपया तल विस्तृत कारोबार सारांश र मिति समाप्त हुँदाको बाँकी रकम हेर्नुहोस्:",
        salesTransactions: "बिक्री कारोबारहरू",
        purchaseTransactions: "खरिद कारोबारहरू",
        accountBalances: "खाता बाँकीहरू",
        taxableSales: "कर योग्य बिक्री",
        nonTaxableSales: "कर छुटको बिक्री",
        salesReturn: "बिक्री फिर्ता",
        netSales: "कुल बिक्री",
        taxablePurchases: "कर योग्य खरिद",
        nonTaxablePurchase: "कर छुटको खरिद",
        purchaseReturn: "खरिद फिर्ता",
        netPurchases: "कुल खरिद",
        openingBalance: "प्रारम्भिक बाँकी",
        closingBalance: "अन्तिम बाँकी",
        openingBalanceAsOn: "को प्रारम्भिक बाँकी",
        closingBalanceAsOn: "को अन्तिम बाँकी",
        bf: "B/F",
        cf: "C/F",
        remarks: "टिप्पणी",
        amount: "रकम",
        vatAmount: "भ्याट रकम",
        particulars: "विवरण",
        kindlyVerify: "कृपया माथिको कारोबार र खाता बाँकीहरू सुनिश्चित गर्नुहोस्। यदि विवरणहरू सही छन् भने, कृपया यो पत्रको प्रतिलिपि हस्ताक्षर गरी १५ दिन भित्र फिर्ता पठाउनुहोस्। कुनै पनि विसंगति उही अवधि भित्र हामीलाई लिखित रूपमा सूचित गर्नुहोस्।",
        ifNoCommunication: "यदि निर्धारित समय भित्र कुनै सञ्चार प्राप्त भएन भने, बाँकी रकमहरू सबै उद्देश्यका लागि पुष्टि र सही मानिनेछ।",
        authorizedSignatory: "अधिकृत हस्ताक्षरकर्ता",
        name: "नाम",
        designation: "पद",
        date: "मिति",
        confidentialityNotice: "गोपनीयता सूचना: यो कागजात प्राप्तकर्ताको लागि मात्र गोप्य जानकारी समावेश गर्दछ। कुनै पनि अनाधिकृत प्रयोग, खुलासा, वा वितरण कडा रूपमा निषेधित छ।",
        documentId: "कागजात आइडी",
        printedOn: "छापिएको मिति",
        exempt: "छुट",
        creditNote: "क्रेडिट नोट",
        debitNote: "डेबिट नोट"
    };

    // Parse fiscal year - handles both "2082/83" and "2082/2083" formats
    const parseFiscalYear = (fiscalYearStr) => {
        if (!fiscalYearStr) return { startYear: null, endYear: null };

        if (fiscalYearStr.includes('/')) {
            const parts = fiscalYearStr.split('/');
            const startYear = parseInt(parts[0]);
            let endYear;
            if (parts[1].length === 2) {
                const startCentury = Math.floor(startYear / 100) * 100;
                endYear = startCentury + parseInt(parts[1]);
            } else {
                endYear = parseInt(parts[1]);
            }
            return { startYear, endYear };
        }
        return { startYear: parseInt(fiscalYearStr), endYear: parseInt(fiscalYearStr) + 1 };
    };

    const getYearForMonth = (monthValue) => {
        if (!fiscalYear) return null;

        const { startYear, endYear } = parseFiscalYear(fiscalYear);
        if (!startYear || !endYear) return null;

        const monthNum = parseInt(monthValue);

        // For Nepali: Baisakh(1), Jestha(2), Ashad(3) use endYear
        // Shrawan(4) to Chaitra(12) use startYear
        if (monthNum <= 3) {
            return endYear;
        }
        return startYear;
    };

    const getMonthName = (monthValue) => {
        const monthNum = parseInt(monthValue);
        return nepaliMonths.find(m => m.value === monthNum)?.name || '';
    };

    const getMonthYearDisplay = (monthValue) => {
        if (!monthValue || !fiscalYear) return '';
        const monthName = getMonthName(monthValue);
        const year = getYearForMonth(monthValue);
        return `${monthName} ${year}`;
    };

    // API instance
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
        (error) => Promise.reject(error)
    );

    // Fetch accounts from backend with search and pagination
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
                    setAccountSearchResults(response.data.accounts);
                    setAccounts(response.data.accounts);
                } else {
                    setAccountSearchResults(prev => [...prev, ...response.data.accounts]);
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
            setNotification({ show: true, message: 'Error loading accounts', type: 'error' });
        } finally {
            setIsAccountSearching(false);
        }
    };

    // Load accounts when modal opens
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

    // Load more accounts for infinite scroll
    const loadMoreAccounts = () => {
        if (!isAccountSearching && hasMoreAccountResults) {
            const searchTermVal = accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery;
            fetchAccountsFromBackend(searchTermVal, accountSearchPage + 1);
        }
    };

    // Handle account search input
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

    // Get focus target after modal closes
    const getFocusTargetOnModalClose = () => {
        if (startMonthRef.current) {
            return 'startMonth';
        }
        return 'startMonth';
    };

    // Fetch fiscal year and date format from JWT claims via backend
    const fetchInitialData = async () => {
        try {
            const response = await api.get('/api/retailer/party-summary-entry-data');
            if (response.data.success) {
                setFiscalYear(response.data.data.fiscalYearName);
                setCompanyDateFormat(response.data.data.dateFormat);
                setIsInitialized(true);
            }
        } catch (error) {
            console.error('Error fetching initial data:', error);
            // Set default values
            setFiscalYear('2082/83');
            setCompanyDateFormat('nepali');
            setIsInitialized(true);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        // Open account modal automatically when page loads
        const timer = setTimeout(() => {
            setShowAccountModal(true);
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    const loadPartySummaryByMonthRange = async (accountId, startYear, startMonth, endYear, endMonth) => {
        try {
            setLoading(true);
            setError('');

            const response = await api.get(`/api/retailer/party-summary-by-month-range/${accountId}`, {
                params: { startYear, startMonth, endYear, endMonth }
            });

            if (response.data.success) {
                setSummary(response.data.data);
                // Update fiscal year from response if available
                if (response.data.data?.fiscalYear) {
                    setFiscalYear(response.data.data.fiscalYear);
                }
            } else {
                setError(response.data.error || 'Failed to load party summary');
                setNotification({ show: true, message: response.data.error || 'Failed to load party summary', type: 'error' });
            }
        } catch (error) {
            console.error('Error loading summary:', error);
            setError(error.response?.data?.error || 'Failed to load party summary');
            setNotification({ show: true, message: error.response?.data?.error || 'Failed to load party summary', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const selectAccount = (account) => {
        setSelectedParty(account);
        setShowAccountModal(false);
        setAccountSearchQuery('');
        setTimeout(() => {
            if (startMonthRef.current) {
                startMonthRef.current.focus();
            }
        }, 100);
    };

    const handleGenerateReport = () => {
        if (!selectedParty) {
            setNotification({ show: true, message: 'Please select a party first', type: 'warning' });
            return;
        }

        if (!startMonth || !endMonth) {
            setNotification({ show: true, message: 'Please select start month and end month', type: 'warning' });
            return;
        }

        if (!fiscalYear) {
            setNotification({ show: true, message: 'Fiscal year not loaded. Please try again.', type: 'warning' });
            return;
        }

        const startMonthNum = parseInt(startMonth);
        const endMonthNum = parseInt(endMonth);

        const startYear = getYearForMonth(startMonth);
        const endYear = getYearForMonth(endMonth);

        if (!startYear || !endYear) {
            setNotification({ show: true, message: 'Invalid year calculation', type: 'warning' });
            return;
        }

        // Validate range
        let isValid = false;

        if (startYear === endYear) {
            isValid = startMonthNum <= endMonthNum;
        } else if (startYear < endYear) {
            isValid = true;
        }

        if (!isValid) {
            setNotification({ show: true, message: 'Invalid date range. Please ensure start month is before end month.', type: 'warning' });
            return;
        }

        loadPartySummaryByMonthRange(selectedParty.id, startYear, startMonthNum, endYear, endMonthNum);
    };

    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null) return '0.00';
        return parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-NP');
    };

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                const nextField = document.getElementById(nextFieldId);
                if (nextField) nextField.focus();
            }
        }
    };

    const handlePrint = () => {
        if (!summary) {
            setNotification({ show: true, message: 'No data to print', type: 'warning' });
            return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            setNotification({ show: true, message: 'Popup blocked', type: 'error' });
            return;
        }

        const summaryData = summary.summary;
        const company = summary.company;
        const party = summary.party;
        const currentFiscalYear = summary.fiscalYear || fiscalYear;

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>VAT and Balance Confirmation Letter</title>
            <style>
                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; margin: 0; padding: 0; }
                @media print { @page { size: A4; margin: 10mm 15mm; } body { font-family: "Times New Roman", Times, serif; font-size: 11pt; } }
                body { font-family: "Times New Roman", Times, serif; margin: 0; padding: 15px; font-size: 11pt; }
                .document-title { text-align: center; margin: 12px 0; padding: 6px; background: #f5f5f5; border: 1px solid #000; }
                .document-title h1 { margin: 0; font-size: 14pt; }
                .details-container { display: flex; gap: 15px; margin-bottom: 12px; }
                .company-info, .party-info { border: 1px solid #000; padding: 8px; flex: 1; }
                .info-header { background: #000; color: white; padding: 4px 8px; margin: -8px -8px 6px -8px; }
                .info-content p { margin: 1px 0; font-size: 9pt; }
                .meta-info { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 6px; background: #f8f9fa; }
                .transaction-table { width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #000; }
                .transaction-table th, .transaction-table td { border: 1px solid #000; padding: 4px 5px; }
                .transaction-table th { background: #000; color: white; text-align: center; }
                .text-end { text-align: right; }
                .section-header { background: #d3d3d3; font-weight: bold; }
                .total-row { background: #e8f5e8; font-weight: bold; }
                .balance-row { background: #fffacd; font-weight: bold; }
                .content-section { margin: 10px 0; }
                .signature-container { display: flex; gap: 20px; margin-top: 25px; }
                .signature-box { flex: 1; text-align: center; }
                .signature-line { border-top: 1px solid #000; margin: 30px 0 4px 0; }
                .footer { margin-top: 12px; text-align: center; font-size: 7pt; border-top: 1px solid #ccc; padding-top: 5px; }
            </style>
        </head>
        <body>
            <div class="document-title"><h1>VAT AND BALANCE CONFIRMATION LETTER</h1><p>Fiscal Year: ${currentFiscalYear || ''} | Generated on: ${formatDate(new Date())}</p></div>
            <div class="details-container">
                <div class="company-info"><div class="info-header">FROM</div><div class="info-content"><p><strong>${company.name || ''}</strong></p><p>Address: ${company.address || ''}</p><p>Phone: ${company.phone || ''}</p><p>PAN: ${company.pan || ''}</p></div></div>
                <div class="party-info"><div class="info-header">TO</div><div class="info-content"><p><strong>${party.name || ''}</strong></p><p>Address: ${party.address || ''}</p><p>Phone: ${party.phone || ''}</p><p>PAN: ${party.pan || ''}</p></div></div>
            </div>
            <div class="meta-info"><div><strong>Reference No:</strong><br>CONF${(currentFiscalYear || '').replace('/', '')}/${Date.now().toString().slice(-4)}</div><div><strong>Period:</strong><br>${getMonthYearDisplay(startMonth)} to ${getMonthYearDisplay(endMonth)}</div><div><strong>Page:</strong><br>1 of 1</div></div>
            <div class="content-section"><p>Dear Sir/Madam,</p><p>In accordance with standard accounting practices, we hereby submit the transaction summary for the fiscal year <strong>${currentFiscalYear || ''}</strong>.</p><p>Please find below the detailed transaction summary for the period <strong>${getMonthYearDisplay(startMonth)} to ${getMonthYearDisplay(endMonth)}</strong>:</p></div>
            <table class="transaction-table">
                <thead><tr><th>Particulars</th><th class="text-end">Amount (Rs.)</th><th class="text-end">VAT Amount (Rs.)</th><th>Remarks</th></tr></thead>
                <tbody>
                    <tr class="section-header"><td colspan="4"><strong>SALES TRANSACTIONS</strong></td></tr>
                    <tr><td style="padding-left: 10px;">Taxable Sales</td><td class="text-end">${formatCurrency(summaryData?.taxableSales)}</td><td class="text-end">${formatCurrency(summaryData?.taxableSalesVAT)}</td><td class="text-center">-</td></tr>
                    <tr><td style="padding-left: 10px;">Non-Taxable Sales</td><td class="text-end">${formatCurrency(summaryData?.nonTaxableSales)}</td><td class="text-end">-</td><td class="text-center">Exempt</td></tr>
                    <tr><td style="padding-left: 10px;">Sales Return</td><td class="text-end">(${formatCurrency(summaryData?.salesReturn)})</td><td class="text-end">(${formatCurrency(summaryData?.salesReturnVAT)})</td><td class="text-center">Credit Note</td></tr>
                    <tr class="total-row"><td><strong>NET SALES</strong></td><td class="text-end"><strong>${formatCurrency(summaryData?.netSales)}</strong></td><td class="text-end"><strong>${formatCurrency(summaryData?.netSalesVAT)}</strong></td><td class="text-center">-</td></tr>
                    <tr class="section-header"><td colspan="4"><strong>PURCHASE TRANSACTIONS</strong></td></tr>
                    <tr><td style="padding-left: 10px;">Taxable Purchases</td><td class="text-end">${formatCurrency(summaryData?.taxablePurchase)}</td><td class="text-end">${formatCurrency(summaryData?.taxablePurchaseVAT)}</td><td class="text-center">-</td></tr>
                    <tr><td style="padding-left: 10px;">Non-Taxable Purchase</td><td class="text-end">${formatCurrency(summaryData?.nonTaxablePurchase)}</td><td class="text-end">-</td><td class="text-center">Exempt</td></tr>
                    <tr><td style="padding-left: 10px;">Purchase Return</td><td class="text-end">(${formatCurrency(summaryData?.purchaseReturn)})</td><td class="text-end">(${formatCurrency(summaryData?.purchaseReturnVAT)})</td><td class="text-center">Debit Note</td></tr>
                    <tr class="total-row"><td><strong>NET PURCHASES</strong></td><td class="text-end"><strong>${formatCurrency(summaryData?.netPurchase)}</strong></td><td class="text-end"><strong>${formatCurrency(summaryData?.netPurchaseVAT)}</strong></td><td class="text-center">-</td></tr>
                    <tr class="section-header"><td colspan="4"><strong>ACCOUNT BALANCES</strong></td></tr>
                    <tr class="balance-row"><td>Opening Balance as on ${getMonthYearDisplay(startMonth)} 1st</td><td class="text-end"><strong>${formatCurrency(Math.abs(summaryData?.openingBalance || 0))} ${summaryData?.openingBalance > 0 ? 'Cr' : (summaryData?.openingBalance < 0 ? 'Dr' : '')}</strong></td><td class="text-end">-</td><td class="text-center">B/F</td></tr>
                    <tr class="balance-row"><td>Closing Balance as on ${getMonthYearDisplay(endMonth)} End</td><td class="text-end"><strong>${formatCurrency(Math.abs(summaryData?.closingBalance || 0))} ${summaryData?.closingBalance > 0 ? 'Cr' : (summaryData?.closingBalance < 0 ? 'Dr' : '')}</strong></td><td class="text-end">-</td><td class="text-center">C/F</td></tr>
                </tbody>
            </table>
            <div class="content-section">
                <p>
                    Kindly verify the above transactions and account balances. If the details are correct, 
                    please sign and return the duplicate copy of this letter within <strong>15 days</strong>. 
                    Any discrepancies should be communicated to us in writing within the same period.
                </p>
                <p>
                    If no communication is received within the stipulated time, the balances will be 
                    considered as confirmed and correct for all purposes.
                </p>            </div>
            <div class="signature-section"><div class="signature-container"><div class="signature-box"><div class="signature-line"></div><div class="signature-label">For ${company.name || 'Company'}</div></div><div class="signature-box"><div class="signature-line"></div><div class="signature-label">For ${party.name || 'Party'}</div></div></div></div>
            <div class="footer"><p>Document ID: VAT-CONF-${Date.now()} | Printed on: ${new Date().toLocaleDateString()}</p></div>
            <script>window.onload = function() { setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 500); }, 300); };</script>
        </body>
        </html>`;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    const handlePrintNepali = () => {
        if (!summary) {
            setNotification({ show: true, message: 'कृपया पहिले रिपोर्ट जेनरेट गर्नुहोस्', type: 'warning' });
            return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            setNotification({ show: true, message: 'पपअप ब्लक गरिएको छ। कृपया यो साइटको लागि पपअप अनुमति दिनुहोस्।', type: 'error' });
            return;
        }

        const summaryData = summary.summary;
        const company = summary.company;
        const party = summary.party;
        const currentFiscalYear = summary.fiscalYear || fiscalYear;

        // Get month names in Nepali
        const startMonthNum = parseInt(startMonth);
        const endMonthNum = parseInt(endMonth);
        const startMonthNameNepali = nepaliMonthsNames[startMonthNum] || '';
        const endMonthNameNepali = nepaliMonthsNames[endMonthNum] || '';
        const startYear = getYearForMonth(startMonth);
        const endYear = getYearForMonth(endMonth);

        const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>भ्याट तथा बाँकी सुनिश्चितता पत्र - ${party.name || ''}</title>
        <style>
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            
            @media print {
                @page {
                    size: A4;
                    margin: 10mm 15mm;
                }
                body {
                    font-family: 'Mangal', 'Nirmala UI', 'Preeti', 'Times New Roman', Times, serif !important;
                    line-height: 1.2;
                    color: #000000 !important;
                    background: white !important;
                    font-size: 11pt;
                }
            }
            
            body {
                font-family: 'Mangal', 'Nirmala UI', 'Preeti', 'Times New Roman', Times, serif;
                margin: 0;
                padding: 15px;
                font-size: 11pt;
                line-height: 1.2;
                color: #000000;
                background: white;
            }
            
            .print-container {
                max-width: 100%;
                margin: 0 auto;
            }
            
            .document-title {
                text-align: center;
                margin: 12px 0;
                padding: 6px;
                background: #f5f5f5 !important;
                border: 1px solid #000000;
            }
            
            .document-title h1 {
                margin: 0;
                font-size: 14pt;
                font-weight: bold;
            }
            
            .details-container {
                display: flex;
                gap: 15px;
                margin-bottom: 12px;
            }
            
            .company-info, .party-info {
                border: 1px solid #000000;
                padding: 8px;
                flex: 1;
            }
            
            .info-header {
                background: #000000 !important;
                color: white !important;
                padding: 4px 8px;
                margin: -8px -8px 6px -8px;
                font-size: 10pt;
                font-weight: bold;
            }
            
            .info-content p {
                margin: 1px 0;
                font-size: 9pt;
            }
            
            .meta-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                padding: 6px;
                background: #f8f9fa !important;
                font-size: 9pt;
            }
            
            .transaction-table {
                width: 100%;
                border-collapse: collapse;
                margin: 12px 0;
                font-size: 9pt;
                border: 1px solid #000000;
            }
            
            .transaction-table th {
                background: #000000 !important;
                color: white !important;
                border: 1px solid #000000;
                padding: 5px 6px;
                text-align: center;
                font-weight: bold;
            }
            
            .transaction-table td {
                border: 1px solid #000000;
                padding: 4px 5px;
                text-align: left;
            }
            
            .transaction-table .text-end {
                text-align: right;
            }
            
            .transaction-table .text-center {
                text-align: center;
            }
            
            .section-header {
                background: #d3d3d3 !important;
                font-weight: bold;
            }
            
            .total-row {
                background: #e8f5e8 !important;
                font-weight: bold;
            }
            
            .balance-row {
                background: #fffacd !important;
                font-weight: bold;
            }
            
            .content-section {
                margin: 10px 0;
                line-height: 1.2;
                font-size: 10pt;
            }
            
            .content-section p {
                margin: 4px 0;
            }
            
            .signature-section {
                margin-top: 15px;
            }
            
            .signature-container {
                display: flex;
                gap: 20px;
                margin-top: 25px;
            }
            
            .signature-box {
                flex: 1;
                text-align: center;
            }
            
            .signature-line {
                border-top: 1px solid #000000;
                margin: 30px 0 4px 0;
            }
            
            .signature-label {
                font-weight: bold;
                margin: 4px 0;
                font-size: 10pt;
            }
            
            .footer {
                margin-top: 12px;
                text-align: center;
                font-size: 7pt;
                border-top: 1px solid #ccc;
                padding-top: 5px;
            }
            
            .negative-amount {
                font-style: italic;
            }
            
            .text-success {
                color: #28a745 !important;
            }
            .text-danger {
                color: #dc3545 !important;
            }
        </style>
    </head>
    <body>
        <div class="print-container">
            <div class="document-title">
                <h1>भ्याट तथा बाँकी सुनिश्चितता पत्र</h1>
                <p style="margin: 1px 0; font-size: 9pt;">
                    आर्थिक वर्ष: ${currentFiscalYear || ''} | जारी मिति: ${formatDate(new Date())}
                </p>
            </div>

            <div class="details-container">
                <div class="company-info">
                    <div class="info-header">बाट</div>
                    <div class="info-content">
                        <p style="font-weight: bold; margin-bottom: 3px;">${company.name || ''}</p>
                        <p>ठेगाना: ${company.address || ''}</p>
                        <p>फोन: ${company.phone || ''}</p>
                        <p>प्यान: ${company.pan || ''}</p>
                    </div>
                </div>
                
                <div class="party-info">
                    <div class="info-header">लाई</div>
                    <div class="info-content">
                        <p style="font-weight: bold; margin-bottom: 3px;">${party.name || ''}</p>
                        <p>ठेगाना: ${party.address || ''}</p>
                        <p>फोन: ${party.phone || ''}</p>
                        <p>प्यान: ${party.pan || ''}</p>
                        <p>युनिक नम्बर: ${party.uniqueNumber || ''}</p>
                    </div>
                </div>
            </div>

            <div class="meta-info">
                <div style="flex: 1; text-align: left;">
                    <strong>सन्दर्भ नम्बर:</strong><br>
                    CONF${(currentFiscalYear || '').replace('/', '')}/${Date.now().toString().slice(-4)}
                </div>
                <div style="flex: 1; text-align: center;">
                    <strong>अवधि:</strong><br>
                    ${startMonthNameNepali} ${startYear} देखि ${endMonthNameNepali} ${endYear}
                </div>
                <div style="flex: 1; text-align: right;">
                    <strong>पृष्ठ:</strong><br>
                    १/१
                </div>
            </div>

            <div class="content-section">
                <p>प्रिय महोदय/महोदया,</p>
                <p>
                    प्रचलित लेखा मान्यता र नियामक आवश्यकताहरू अनुसार, हामी तपाईंको पुनरावलोकन र सुनिश्चितताको लागि आर्थिक वर्ष 
                    <strong>${currentFiscalYear || ''}</strong> को निम्नलिखित कारोबार सारांश र बाँकी सुनिश्चितता पेश गर्दछौं।
                </p>
                <p>
                    कृपया तल विस्तृत कारोबार सारांश र मिति समाप्त हुँदाको बाँकी रकम हेर्नुहोस्:
                </p>
            </div>

            <table class="transaction-table">
                <thead>
                    <tr>
                        <th style="width: 45%;">विवरण</th>
                        <th style="width: 25%;">रकम (रु.)</th>
                        <th style="width: 20%;">भ्याट रकम (रु.)</th>
                        <th style="width: 10%;">टिप्पणी</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="section-header">
                        <td colspan="4"><strong>बिक्री कारोबारहरू</strong></strong></td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">कर योग्य बिक्री</td>
                        <td class="text-end">${formatCurrency(summaryData?.taxableSales)}</td>
                        <td class="text-end">${formatCurrency(summaryData?.taxableSalesVAT)}</td>
                        <td class="text-center">-</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">कर छुटको बिक्री</td>
                        <td class="text-end">${formatCurrency(summaryData?.nonTaxableSales)}</td>
                        <td class="text-end">-</td>
                        <td class="text-center">छुट</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">बिक्री फिर्ता</td>
                        <td class="text-end">(${formatCurrency(summaryData?.salesReturn)})</td>
                        <td class="text-end">(${formatCurrency(summaryData?.salesReturnVAT)})</td>
                        <td class="text-center">क्रेडिट नोट</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>कुल बिक्री</strong></td>
                        <td class="text-end"><strong>${formatCurrency(summaryData?.netSales)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(summaryData?.netSalesVAT)}</strong></td>
                        <td class="text-center">-</td>
                    </tr>

                    <tr class="section-header">
                        <td colspan="4"><strong>खरिद कारोबारहरू</strong></td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">कर योग्य खरिद</td>
                        <td class="text-end">${formatCurrency(summaryData?.taxablePurchase)}</td>
                        <td class="text-end">${formatCurrency(summaryData?.taxablePurchaseVAT)}</td>
                        <td class="text-center">-</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">कर छुटको खरिद</td>
                        <td class="text-end">${formatCurrency(summaryData?.nonTaxablePurchase)}</td>
                        <td class="text-end">-</td>
                        <td class="text-center">छुट</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">खरिद फिर्ता</td>
                        <td class="text-end">(${formatCurrency(summaryData?.purchaseReturn)})</td>
                        <td class="text-end">(${formatCurrency(summaryData?.purchaseReturnVAT)})</td>
                        <td class="text-center">डेबिट नोट</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>कुल खरिद</strong></td>
                        <td class="text-end"><strong>${formatCurrency(summaryData?.netPurchase)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(summaryData?.netPurchaseVAT)}</strong></td>
                        <td class="text-center">-</td>
                    </tr>

                    <tr class="section-header">
                        <td colspan="4"><strong>खाता बाँकीहरू</strong></td>
                    </tr>
                    <tr class="balance-row">
                        <td>${startMonthNameNepali} ${startYear} १ गतेको प्रारम्भिक बाँकी</td>
                        <td class="text-end"><strong>${formatCurrency(Math.abs(summaryData?.openingBalance || 0))} ${summaryData?.openingBalance > 0 ? 'Cr' : (summaryData?.openingBalance < 0 ? 'Dr' : '')}</strong></td>
                        <td class="text-end">-</td>
                        <td class="text-center">B/F</td>
                    </tr>
                    <tr class="balance-row">
                        <td>${endMonthNameNepali} ${endYear} को अन्तिम बाँकी</td>
                        <td class="text-end"><strong>${formatCurrency(Math.abs(summaryData?.closingBalance || 0))} ${summaryData?.closingBalance > 0 ? 'Cr' : (summaryData?.closingBalance < 0 ? 'Dr' : '')}</strong></td>
                        <td class="text-end">-</td>
                        <td class="text-center">C/F</td>
                    </tr>
                </tbody>
            </table>

            <div class="content-section">
                <p>
                    कृपया माथिको कारोबार र खाता बाँकीहरू सुनिश्चित गर्नुहोस्। यदि विवरणहरू सही छन् भने, 
                    कृपया यो पत्रको प्रतिलिपि हस्ताक्षर गरी <strong>१५ दिन</strong> भित्र फिर्ता पठाउनुहोस्। 
                    कुनै पनि विसंगति उही अवधि भित्र हामीलाई लिखित रूपमा सूचित गर्नुहोस्।
                </p>
                <p>
                    यदि निर्धारित समय भित्र कुनै सञ्चार प्राप्त भएन भने, बाँकी रकमहरू सबै उद्देश्यका लागि 
                    पुष्टि र सही मानिनेछ।
                </p>
            </div>

            <div class="signature-section">
                <div class="signature-container">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-label">${company.name || 'कम्पनी'} को लागि</div>
                        <div class="signature-details">
                            अधिकृत हस्ताक्षरकर्ता<br>
                            नाम: ________________<br>
                            पद: ________________<br>
                            मिति: ________________
                        </div>
                    </div>
                    
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-label">${party.name || 'पार्टी'} को लागि</div>
                        <div class="signature-details">
                            अधिकृत हस्ताक्षरकर्ता<br>
                            नाम: ________________<br>
                            पद: ________________<br>
                            मिति: ________________
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <p>
                    <strong>गोपनीयता सूचना:</strong> यो कागजात प्राप्तकर्ताको लागि मात्र गोप्य जानकारी समावेश गर्दछ। 
                    कुनै पनि अनाधिकृत प्रयोग, खुलासा, वा वितरण कडा रूपमा निषेधित छ।
                </p>
                <p>कागजात आइडी: VAT-CONF-${Date.now()} | छापिएको मिति: ${new Date().toLocaleDateString('ne-NP')}</p>
            </div>
        </div>
        <script>
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 500);
                }, 300);
            };
        <\/script>
    </body>
    </html>`;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    const handleDownloadPDF = () => handlePrint();

    if (!isInitialized) return <Loader />;

    // Format selected party display
    const selectedPartyDisplay = selectedParty
        ? `${selectedParty.uniqueNumber || ''} ${selectedParty.name}`.trim()
        : '';

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">
                        <FiFileText className="me-2" />
                        VAT and Balance Confirmation
                    </h1>
                </div>

                <div className="card-body p-2 p-md-3">
                    {error && (
                        <div className="alert alert-danger text-center py-1 mb-2 small">
                            {error}
                            <button type="button" className="btn-close btn-sm ms-2" onClick={() => setError('')}></button>
                        </div>
                    )}

                    {/* <div className="row g-2 mb-3">
                        <div className="col-12 col-md-3">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    id="account"
                                    className="form-control form-control-sm"
                                    value={selectedPartyDisplay}
                                    onClick={() => setShowAccountModal(true)}
                                    readOnly
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', cursor: 'pointer' }}
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
                            </div>
                        </div>

                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <select
                                    id="startMonth"
                                    ref={startMonthRef}
                                    className="form-select form-select-sm"
                                    value={startMonth}
                                    onChange={(e) => setStartMonth(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, 'endMonth')}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem' }}
                                >
                                    <option value="">Select Start Month</option>
                                    {nepaliMonths.map(month => (
                                        <option key={month.value} value={month.value}>
                                            {month.name}
                                        </option>
                                    ))}
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
                                    Start Month
                                </label>
                            </div>
                        </div>

                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <select
                                    id="endMonth"
                                    ref={endMonthRef}
                                    className="form-select form-select-sm"
                                    value={endMonth}
                                    onChange={(e) => setEndMonth(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem' }}
                                >
                                    <option value="">Select End Month</option>
                                    {nepaliMonths.map(month => (
                                        <option key={month.value} value={month.value}>
                                            {month.name}
                                        </option>
                                    ))}
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
                                    End Month
                                </label>
                            </div>
                        </div>

                        <div className="col-12 col-md-1">
                            <button
                                type="button"
                                id="generateReport"
                                className="btn btn-primary btn-sm w-100"
                                onClick={handleGenerateReport}
                                disabled={!selectedParty || !startMonth || !endMonth || !fiscalYear}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <i className="fas fa-chart-line me-1"></i>Generate
                            </button>
                        </div>

                        <div className="col-12 col-md-1">
                            <button
                                className="btn btn-secondary btn-sm w-100"
                                onClick={handlePrint}
                                disabled={!summary}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <FiPrinter className="me-1" style={{ fontSize: '12px' }} />
                                Print
                            </button>
                        </div>

                        <div className="col-12 col-md-2 d-flex align-items-end justify-content-end gap-2">
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={handlePrint}
                                disabled={!summary}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <FiPrinter className="me-1" style={{ fontSize: '12px' }} />
                                Print (English)
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={handlePrintNepali}
                                disabled={!summary}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <FiPrinter className="me-1" style={{ fontSize: '12px' }} />
                                Print (नेपाली)
                            </button>
                        </div>
                    </div> */}

                    <div className="row g-2 mb-3">
                        {/* Party Name Selection - Click to open modal */}
                        <div className="col-12 col-md-3">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    id="account"
                                    className="form-control form-control-sm"
                                    value={selectedPartyDisplay}
                                    onClick={() => setShowAccountModal(true)}
                                    readOnly
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', cursor: 'pointer' }}
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
                            </div>
                        </div>

                        {/* Start Month */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <select
                                    id="startMonth"
                                    ref={startMonthRef}
                                    className="form-select form-select-sm"
                                    value={startMonth}
                                    onChange={(e) => setStartMonth(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, 'endMonth')}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem' }}
                                >
                                    <option value="">Select Start Month</option>
                                    {nepaliMonths.map(month => (
                                        <option key={month.value} value={month.value}>
                                            {month.name}
                                        </option>
                                    ))}
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
                                    Start Month
                                </label>
                            </div>
                        </div>

                        {/* End Month */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <select
                                    id="endMonth"
                                    ref={endMonthRef}
                                    className="form-select form-select-sm"
                                    value={endMonth}
                                    onChange={(e) => setEndMonth(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem' }}
                                >
                                    <option value="">Select End Month</option>
                                    {nepaliMonths.map(month => (
                                        <option key={month.value} value={month.value}>
                                            {month.name}
                                        </option>
                                    ))}
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
                                    End Month
                                </label>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div className="col-12 col-md-1">
                            <button
                                type="button"
                                id="generateReport"
                                className="btn btn-primary btn-sm w-100"
                                onClick={handleGenerateReport}
                                disabled={!selectedParty || !startMonth || !endMonth || !fiscalYear}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <i className="fas fa-chart-line me-1"></i>Generate
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="col-12 col-md-4">
                            <div className="d-flex gap-2 justify-content-end" style={{ height: '30px' }}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handlePrint}
                                    disabled={!summary}
                                    style={{ fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                                >
                                    <FiPrinter className="me-1" style={{ fontSize: '12px' }} />
                                    Print (English)
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handlePrintNepali}
                                    disabled={!summary}
                                    style={{ fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                                >
                                    <FiPrinter className="me-1" style={{ fontSize: '12px' }} />
                                    Print (नेपाली)
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Selected Period Display */}
                    {startMonth && endMonth && fiscalYear && (
                        <div className="bg-info bg-opacity-10 rounded p-2 mb-3">
                            <span className="text-info" style={{ fontSize: '0.75rem' }}>
                                <FiCalendar className="me-1" />
                                Fiscal Year: <strong>{fiscalYear}</strong> |
                                Selected Period: <strong>{getMonthYearDisplay(startMonth)} to {getMonthYearDisplay(endMonth)}</strong>
                            </span>
                        </div>
                    )}

                    {summary ? (
                        <div>
                            {/* Party Info */}
                            <div className="bg-light rounded p-2 mb-3">
                                <h6 className="text-primary mb-1">
                                    <FiUser className="me-1" style={{ fontSize: '0.7rem' }} />
                                    {summary.party?.name}
                                </h6>
                                <div className="row text-muted" style={{ fontSize: '0.7rem' }}>
                                    <div className="col-2">PAN: {summary.party?.pan || ''}</div>
                                    <div className="col-6">Address: {summary.party?.address || ''}</div>
                                </div>
                            </div>

                            {/* Key Metrics */}
                            <div className="row g-2 mb-3">
                                <div className="col-6">
                                    <div className="text-center p-2 border rounded bg-white">
                                        <h6 className="text-success mb-0" style={{ fontSize: '0.8rem' }}>Rs. {formatCurrency(summary.summary?.netSales)}</h6>
                                        <small className="text-muted" style={{ fontSize: '0.65rem' }}>Net Sales</small>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="text-center p-2 border rounded bg-white">
                                        <h6 className="text-info mb-0" style={{ fontSize: '0.8rem' }}>Rs. {formatCurrency(summary.summary?.netSalesVAT)}</h6>
                                        <small className="text-muted" style={{ fontSize: '0.65rem' }}>Net VAT</small>
                                    </div>
                                </div>
                            </div>

                            {/* Balance Information */}
                            <div className="mb-3 p-2 border rounded">
                                <h6 className="mb-1 text-primary" style={{ fontSize: '0.75rem' }}>Balance Summary</h6>
                                <div className="row g-1">
                                    <div className="col-6">
                                        <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
                                            <span className="text-muted">Opening:</span>
                                            <strong className={summary.summary?.openingBalance > 0 ? 'text-success' : 'text-danger'}>
                                                Rs. {formatCurrency(Math.abs(summary.summary?.openingBalance || 0))} {summary.summary?.openingBalance > 0 ? 'Cr' : (summary.summary?.openingBalance < 0 ? 'Dr' : '')}
                                            </strong>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
                                            <span className="text-muted">Closing:</span>
                                            <strong className={summary.summary?.closingBalance > 0 ? 'text-success' : 'text-danger'}>
                                                Rs. {formatCurrency(Math.abs(summary.summary?.closingBalance || 0))} {summary.summary?.closingBalance > 0 ? 'Cr' : (summary.summary?.closingBalance < 0 ? 'Dr' : '')}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Fiscal Year Info */}
                            <div className="mb-3 p-2 bg-light rounded">
                                <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '0.7rem' }}>
                                    <span><FiCalendar className="me-1" style={{ fontSize: '0.7rem' }} /> Fiscal Year:</span>
                                    <strong>{summary.fiscalYear || fiscalYear}</strong>
                                </div>
                            </div>

                            {/* Generate Confirmation Letter Button */}
                            <button
                                className="btn btn-primary btn-sm w-100"
                                onClick={() => setShowPreview(true)}
                                style={{ height: '30px', fontSize: '0.8rem', fontWeight: '500' }}
                            >
                                <FiFileText className="me-1" style={{ fontSize: '12px' }} />
                                Generate Confirmation Letter
                            </button>
                        </div>
                    ) : (
                        <div className="text-center p-4">
                            <FiUser size={32} className="text-muted mb-2" />
                            <h6 className="text-muted mb-1">No Party Selected</h6>
                            <p className="text-muted mb-0 small">Select a party and date range to view summary.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Letter Preview Modal */}
            <Modal show={showPreview} onHide={() => setShowPreview(false)} size="xl" fullscreen>
                <Modal.Header closeButton className="bg-primary text-white py-1">
                    <Modal.Title className="d-flex align-items-center">
                        <FiFileText className="me-2" />
                        VAT and Balance Confirmation Letter
                        {selectedParty && <span className="ms-2">- {selectedParty.name}</span>}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {summary && (
                        <Table bordered responsive size="sm" className="mb-4" style={{ fontSize: '0.7rem' }}>
                            <thead className="table-light">
                                <tr>
                                    <th>Head Details</th>
                                    <th className="text-end">Transaction Amount</th>
                                    <th className="text-end">VAT Amount</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Taxable Sales</strong></td>
                                    <td className="text-end">{formatCurrency(summary.summary?.taxableSales)}</td>
                                    <td className="text-end">{formatCurrency(summary.summary?.taxableSalesVAT)}</td>
                                    <td>-</td>
                                </tr>
                                <tr>
                                    <td><strong>Non-Taxable Sales</strong></td>
                                    <td className="text-end">{formatCurrency(summary.summary?.nonTaxableSales)}</td>
                                    <td className="text-end">-</td>
                                    <td>Exempt</td>
                                </tr>
                                <tr>
                                    <td><strong>Less: Sales Return</strong></td>
                                    <td className="text-end">({formatCurrency(summary.summary?.salesReturn)})</td>
                                    <td className="text-end">({formatCurrency(summary.summary?.salesReturnVAT)})</td>
                                    <td>Credit Note</td>
                                </tr>
                                <tr className="table-active">
                                    <td><strong>Net Sales</strong></td>
                                    <td className="text-end"><strong>{formatCurrency(summary.summary?.netSales)}</strong></td>
                                    <td className="text-end"><strong>{formatCurrency(summary.summary?.netSalesVAT)}</strong></td>
                                    <td>-</td>
                                </tr>
                                <tr><td colSpan="4">&nbsp;</td></tr>
                                <tr>
                                    <td><strong>Taxable Purchases</strong></td>
                                    <td className="text-end">{formatCurrency(summary.summary?.taxablePurchase)}</td>
                                    <td className="text-end">{formatCurrency(summary.summary?.taxablePurchaseVAT)}</td>
                                    <td>-</td>
                                </tr>
                                <tr>
                                    <td><strong>Non-Taxable Purchase</strong></td>
                                    <td className="text-end">{formatCurrency(summary.summary?.nonTaxablePurchase)}</td>
                                    <td className="text-end">-</td>
                                    <td>Exempt</td>
                                </tr>
                                <tr>
                                    <td><strong>Less: Purchase Return</strong></td>
                                    <td className="text-end">({formatCurrency(summary.summary?.purchaseReturn)})</td>
                                    <td className="text-end">({formatCurrency(summary.summary?.purchaseReturnVAT)})</td>
                                    <td>Debit Note</td>
                                </tr>
                                <tr className="table-active">
                                    <td><strong>Net Purchases</strong></td>
                                    <td className="text-end"><strong>{formatCurrency(summary.summary?.netPurchase)}</strong></td>
                                    <td className="text-end"><strong>{formatCurrency(summary.summary?.netPurchaseVAT)}</strong></td>
                                    <td>-</td>
                                </tr>
                                <tr><td colSpan="4">&nbsp;</td></tr>
                                <tr>
                                    <td><strong>Opening Balance</strong></td>
                                    <td className="text-end">{formatCurrency(Math.abs(summary.summary?.openingBalance || 0))} {summary.summary?.openingBalance > 0 ? 'Cr' : (summary.summary?.openingBalance < 0 ? 'Dr' : '')}</td>
                                    <td className="text-end">-</td>
                                    <td>B/F</td>
                                </tr>
                                <tr>
                                    <td><strong>Closing Balance</strong></td>
                                    <td className="text-end">{formatCurrency(Math.abs(summary.summary?.closingBalance || 0))} {summary.summary?.closingBalance > 0 ? 'Cr' : (summary.summary?.closingBalance < 0 ? 'Dr' : '')}</td>
                                    <td className="text-end">-</td>
                                    <td>C/F</td>
                                </tr>
                            </tbody>
                        </Table>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-light py-1">
                    <Button variant="outline-secondary" size="sm" onClick={() => setShowPreview(false)}>Close</Button>
                    <Button variant="outline-primary" size="sm" onClick={handlePrint}><FiPrinter className="me-1" /> Print</Button>
                    <Button variant="primary" size="sm" onClick={handleDownloadPDF}><FiDownload className="me-1" /> Download PDF</Button>
                </Modal.Footer>
            </Modal>

            {/* Account Selection Modal with Virtualized List */}
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
                            <div className="modal-content" style={{ height: '500px' }}>
                                <div className="modal-header py-1">
                                    <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>
                                        Select Account
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
                                    />
                                </div>
                                <div className="p-2 bg-white sticky-top">
                                    <input
                                        type="text"
                                        id="searchAccount"
                                        className="form-control form-control-sm"
                                        placeholder="Search Account..."
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
                                            }
                                        }}
                                        ref={accountSearchRef}
                                        style={{ height: '24px', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                    />
                                </div>
                                <div className="modal-body p-0">
                                    <div style={{ height: 'calc(500px - 120px)' }}>
                                        <VirtualizedAccountList
                                            accounts={accountSearchResults}
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

            {/* Loading State */}
            {loading && (
                <div className="text-center p-3">
                    <div className="spinner-border spinner-border-sm text-primary" role="status" />
                    <p className="mt-1 text-muted small">Loading party summary...</p>
                </div>
            )}

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />
        </div>
    );
};

export default VATConfirmationLetter;