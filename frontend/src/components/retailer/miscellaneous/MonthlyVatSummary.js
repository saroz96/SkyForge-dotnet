import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import NepaliDate from 'nepali-date-converter';
import '../../../stylesheet/noDateIcon.css';
import Loader from '../../Loader';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';

const MonthlyVatSummary = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

    const [company, setCompany] = useState({
        dateFormat: 'english',
        vatEnabled: true,
        fiscalYear: {}
    });

    const [data, setData] = useState({
        company: null,
        currentFiscalYear: null,
        totals: null,
        monthlyData: [],
        currentNepaliYear: new NepaliDate().getYear(),
        reportDateRange: '',
        currentCompanyName: '',
        companyDateFormat: 'english',
        nepaliDate: '',
        periodType: 'monthly',
        month: '',
        year: '',
        nepaliMonth: '',
        nepaliYear: ''
    });

    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);

    const monthRef = useRef(null);
    const yearRef = useRef(null);
    const nepaliMonthRef = useRef(null);
    const nepaliYearRef = useRef(null);
    const generateReportRef = useRef(null);
    const [shouldFetch, setShouldFetch] = useState(false);
    const navigate = useNavigate();

    // API instance with JWT token
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

    // Helper function to get current default values based on period type and date format
    const getDefaultValues = useCallback((periodType, dateFormat) => {
        const currentNepaliDateObj = new NepaliDate();
        const currentEnglishDateObj = new Date();

        let month = '';
        let year = '';
        let nepaliMonth = '';
        let nepaliYear = '';

        if (periodType === 'monthly') {
            if (dateFormat === 'english') {
                month = (currentEnglishDateObj.getMonth() + 1).toString();
                year = currentEnglishDateObj.getFullYear().toString();
            } else {
                nepaliMonth = (currentNepaliDateObj.getMonth() + 1).toString();
                nepaliYear = currentNepaliDateObj.getYear().toString();
            }
        } else {
            if (dateFormat === 'english') {
                year = currentEnglishDateObj.getFullYear().toString();
            } else {
                const currentYear = currentNepaliDateObj.getYear();
                const currentMonth = currentNepaliDateObj.getMonth() + 1;
                if (currentMonth >= 4) {
                    nepaliYear = `${currentYear}/${currentYear + 1}`;
                } else {
                    nepaliYear = `${currentYear - 1}/${currentYear}`;
                }
            }
        }

        return { month, year, nepaliMonth, nepaliYear };
    }, []);

    // Auto-fill values when period type or date format changes
    useEffect(() => {
        const defaultValues = getDefaultValues(data.periodType, company.dateFormat);
        setData(prev => ({
            ...prev,
            month: defaultValues.month,
            year: defaultValues.year,
            nepaliMonth: defaultValues.nepaliMonth,
            nepaliYear: defaultValues.nepaliYear,
            totals: null,
            monthlyData: []
        }));
    }, [data.periodType, company.dateFormat, getDefaultValues]);

    // Fetch initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/retailer/monthly-vat-summary');

                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.company?.dateFormat?.toLowerCase() || 'english';

                    setCompany({
                        dateFormat: dateFormat,
                        vatEnabled: responseData.company?.vatEnabled !== false,
                        fiscalYear: responseData.currentFiscalYear || {}
                    });

                    const defaultValues = getDefaultValues('monthly', dateFormat);

                    setData(prev => ({
                        ...prev,
                        company: responseData.company,
                        currentFiscalYear: responseData.currentFiscalYear,
                        companyDateFormat: responseData.companyDateFormat || dateFormat,
                        nepaliDate: responseData.nepaliDate,
                        currentCompanyName: responseData.currentCompanyName || '',
                        currentNepaliYear: responseData.currentNepaliYear || new NepaliDate().getYear(),
                        periodType: responseData.periodType || 'monthly',
                        month: responseData.month || defaultValues.month,
                        year: responseData.year || defaultValues.year,
                        nepaliMonth: responseData.nepaliMonth || defaultValues.nepaliMonth,
                        nepaliYear: responseData.nepaliYear || defaultValues.nepaliYear
                    }));

                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
                setNotification({
                    show: true,
                    message: err.response?.data?.error || 'Error loading data',
                    type: 'error'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [getDefaultValues]);

    // Fetch report data when generate is clicked
    useEffect(() => {
        const fetchReportData = async () => {
            if (!shouldFetch) return;

            try {
                setLoading(true);
                const params = new URLSearchParams();
                params.append('periodType', data.periodType);

                if (data.periodType === 'monthly') {
                    if (company.dateFormat === 'english') {
                        if (data.month) params.append('month', data.month);
                        if (data.year) params.append('year', data.year);
                    } else {
                        if (data.nepaliMonth) params.append('nepaliMonth', data.nepaliMonth);
                        if (data.nepaliYear) params.append('nepaliYear', data.nepaliYear);
                    }
                } else {
                    if (company.dateFormat === 'english') {
                        if (data.year) params.append('year', data.year);
                    } else {
                        if (data.nepaliYear) params.append('nepaliYear', data.nepaliYear);
                    }
                }

                const response = await api.get(`/api/retailer/monthly-vat-summary?${params.toString()}`);

                if (response.data.success) {
                    const responseData = response.data.data;
                    setData(prev => ({
                        ...prev,
                        totals: responseData.totals || null,
                        monthlyData: responseData.monthlyData || [],
                        reportDateRange: responseData.reportDateRange || '',
                        company: responseData.company || prev.company,
                        currentFiscalYear: responseData.currentFiscalYear || prev.currentFiscalYear,
                        companyDateFormat: responseData.companyDateFormat || prev.companyDateFormat,
                        nepaliDate: responseData.nepaliDate || prev.nepaliDate,
                        currentCompanyName: responseData.currentCompanyName || prev.currentCompanyName,
                        currentNepaliYear: responseData.currentNepaliYear || prev.currentNepaliYear
                    }));
                    setError(null);
                } else {
                    const errorMsg = response.data.error || 'Failed to fetch monthly VAT summary';
                    setError(errorMsg);
                    setNotification({
                        show: true,
                        message: errorMsg,
                        type: 'error'
                    });
                }
            } catch (err) {
                console.error('Fetch error:', err);
                const errorMsg = err.response?.data?.error || 'Failed to fetch monthly VAT summary';
                setError(errorMsg);
                setNotification({
                    show: true,
                    message: errorMsg,
                    type: 'error'
                });
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };

        fetchReportData();

        return () => {
            setShouldFetch(false);
        };
    }, [shouldFetch, data.periodType, data.month, data.year, data.nepaliMonth, data.nepaliYear, company.dateFormat]);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handlePeriodTypeChange = (e) => {
        const periodType = e.target.value;
        setData(prev => ({
            ...prev,
            periodType,
            totals: null,
            monthlyData: []
        }));
        // The useEffect will auto-fill the values
    };

    const handleGenerateReport = () => {
        // Validation
        if (data.periodType === 'monthly') {
            if (company.dateFormat === 'nepali') {
                if (!data.nepaliMonth || !data.nepaliYear) {
                    setNotification({
                        show: true,
                        message: 'Please select both Nepali month and year',
                        type: 'warning'
                    });
                    return;
                }
            } else {
                if (!data.month || !data.year) {
                    setNotification({
                        show: true,
                        message: 'Please select both month and year',
                        type: 'warning'
                    });
                    return;
                }
            }
        } else {
            if (company.dateFormat === 'nepali') {
                if (!data.nepaliYear) {
                    setNotification({
                        show: true,
                        message: 'Please select Nepali fiscal year (format: YYYY/YYYY)',
                        type: 'warning'
                    });
                    return;
                }
                const nepaliYearPattern = /^\d{4}\/\d{4}$/;
                if (!nepaliYearPattern.test(data.nepaliYear)) {
                    setNotification({
                        show: true,
                        message: 'Please enter Nepali fiscal year in format: YYYY/YYYY (e.g., 2081/2082)',
                        type: 'warning'
                    });
                    return;
                }
            } else {
                if (!data.year) {
                    setNotification({
                        show: true,
                        message: 'Please select year',
                        type: 'warning'
                    });
                    return;
                }
            }
        }
        setShouldFetch(true);
    };

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                const nextField = document.getElementById(nextFieldId);
                if (nextField) {
                    nextField.focus();
                }
            }
        }
    };

    const formatCurrency = useCallback((num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        if (company.dateFormat === 'nepali') {
            return number.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        return number.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, [company.dateFormat]);

    const getNetValueClass = (value) => {
        return value >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold';
    };

    const getCurrentNepaliFiscalYear = () => {
        const currentNepaliDate = new NepaliDate();
        const currentYear = currentNepaliDate.getYear();
        const currentMonth = currentNepaliDate.getMonth() + 1;
        if (currentMonth >= 4) {
            return `${currentYear}/${currentYear + 1}`;
        } else {
            return `${currentYear - 1}/${currentYear}`;
        }
    };

    const formatCurrencyForExport = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toFixed(2);
    };

    const exportToExcel = async () => {
        const hasData = data.totals || (data.monthlyData && data.monthlyData.length > 0);

        if (!hasData) {
            setNotification({
                show: true,
                message: 'No data to export. Please generate a report first.',
                type: 'warning'
            });
            return;
        }

        setExporting(true);
        try {
            const excelData = [];
            const currentDate = new Date().toISOString().split('T')[0];

            excelData.push(['Company Name:', data.currentCompanyName || '']);
            excelData.push(['Report Type:', 'Monthly VAT Summary']);
            excelData.push(['Report Period:', data.reportDateRange || '']);
            excelData.push(['Export Date:', currentDate]);
            excelData.push([]);

            const headers = [
                'Date Range',
                'Purchase Taxable', 'Purchase Non-VAT', 'Purchase VAT', 'Purchase Total',
                '', 'Purchase Return Taxable', 'Purchase Return Non-VAT', 'Purchase Return VAT', 'Purchase Return Total',
                '', 'Net Purchase Taxable', 'Net Purchase Non-VAT', 'Net Purchase Total',
                '', 'Sales Taxable', 'Sales Non-VAT', 'Sales VAT', 'Sales Total',
                '', 'Sales Return Taxable', 'Sales Return Non-VAT', 'Sales Return VAT', 'Sales Return Total',
                '', 'Net Sales Taxable', 'Net Sales Non-VAT', 'Net Sales Total',
                '', 'Purchase VAT', 'Sales VAT', 'Net VAT Payable'
            ];
            excelData.push(headers);

            if (data.periodType === 'yearly' && data.monthlyData && data.monthlyData.length > 0) {
                data.monthlyData.forEach((monthData) => {
                    const rowData = [
                        monthData.reportDateRange,
                        formatCurrencyForExport(monthData.totals?.purchase?.taxableAmount || 0),
                        formatCurrencyForExport(monthData.totals?.purchase?.nonVatAmount || 0),
                        formatCurrencyForExport(monthData.totals?.purchase?.vatAmount || 0),
                        formatCurrencyForExport((monthData.totals?.purchase?.taxableAmount || 0) + (monthData.totals?.purchase?.nonVatAmount || 0) + (monthData.totals?.purchase?.vatAmount || 0)),
                        '',
                        formatCurrencyForExport(monthData.totals?.purchaseReturn?.taxableAmount || 0),
                        formatCurrencyForExport(monthData.totals?.purchaseReturn?.nonVatAmount || 0),
                        formatCurrencyForExport(monthData.totals?.purchaseReturn?.vatAmount || 0),
                        formatCurrencyForExport((monthData.totals?.purchaseReturn?.taxableAmount || 0) + (monthData.totals?.purchaseReturn?.nonVatAmount || 0) + (monthData.totals?.purchaseReturn?.vatAmount || 0)),
                        '',
                        formatCurrencyForExport((monthData.totals?.purchase?.taxableAmount || 0) - (monthData.totals?.purchaseReturn?.taxableAmount || 0)),
                        formatCurrencyForExport((monthData.totals?.purchase?.nonVatAmount || 0) - (monthData.totals?.purchaseReturn?.nonVatAmount || 0)),
                        formatCurrencyForExport(((monthData.totals?.purchase?.taxableAmount || 0) + (monthData.totals?.purchase?.nonVatAmount || 0) + (monthData.totals?.purchase?.vatAmount || 0)) - ((monthData.totals?.purchaseReturn?.taxableAmount || 0) + (monthData.totals?.purchaseReturn?.nonVatAmount || 0) + (monthData.totals?.purchaseReturn?.vatAmount || 0))),
                        '',
                        formatCurrencyForExport(monthData.totals?.sales?.taxableAmount || 0),
                        formatCurrencyForExport(monthData.totals?.sales?.nonVatAmount || 0),
                        formatCurrencyForExport(monthData.totals?.sales?.vatAmount || 0),
                        formatCurrencyForExport((monthData.totals?.sales?.taxableAmount || 0) + (monthData.totals?.sales?.nonVatAmount || 0) + (monthData.totals?.sales?.vatAmount || 0)),
                        '',
                        formatCurrencyForExport(monthData.totals?.salesReturn?.taxableAmount || 0),
                        formatCurrencyForExport(monthData.totals?.salesReturn?.nonVatAmount || 0),
                        formatCurrencyForExport(monthData.totals?.salesReturn?.vatAmount || 0),
                        formatCurrencyForExport((monthData.totals?.salesReturn?.taxableAmount || 0) + (monthData.totals?.salesReturn?.nonVatAmount || 0) + (monthData.totals?.salesReturn?.vatAmount || 0)),
                        '',
                        formatCurrencyForExport((monthData.totals?.sales?.taxableAmount || 0) - (monthData.totals?.salesReturn?.taxableAmount || 0)),
                        formatCurrencyForExport((monthData.totals?.sales?.nonVatAmount || 0) - (monthData.totals?.salesReturn?.nonVatAmount || 0)),
                        formatCurrencyForExport(((monthData.totals?.sales?.taxableAmount || 0) + (monthData.totals?.sales?.nonVatAmount || 0) + (monthData.totals?.sales?.vatAmount || 0)) - ((monthData.totals?.salesReturn?.taxableAmount || 0) + (monthData.totals?.salesReturn?.nonVatAmount || 0) + (monthData.totals?.salesReturn?.vatAmount || 0))),
                        '',
                        formatCurrencyForExport(monthData.totals?.netPurchaseVat || 0),
                        formatCurrencyForExport(monthData.totals?.netSalesVat || 0),
                        formatCurrencyForExport(monthData.totals?.netVat || 0)
                    ];
                    excelData.push(rowData);
                });
            } else if (data.totals) {
                const rowData = [
                    data.reportDateRange,
                    formatCurrencyForExport(data.totals.purchase?.taxableAmount || 0),
                    formatCurrencyForExport(data.totals.purchase?.nonVatAmount || 0),
                    formatCurrencyForExport(data.totals.purchase?.vatAmount || 0),
                    formatCurrencyForExport((data.totals.purchase?.taxableAmount || 0) + (data.totals.purchase?.nonVatAmount || 0) + (data.totals.purchase?.vatAmount || 0)),
                    '',
                    formatCurrencyForExport(data.totals.purchaseReturn?.taxableAmount || 0),
                    formatCurrencyForExport(data.totals.purchaseReturn?.nonVatAmount || 0),
                    formatCurrencyForExport(data.totals.purchaseReturn?.vatAmount || 0),
                    formatCurrencyForExport((data.totals.purchaseReturn?.taxableAmount || 0) + (data.totals.purchaseReturn?.nonVatAmount || 0) + (data.totals.purchaseReturn?.vatAmount || 0)),
                    '',
                    formatCurrencyForExport((data.totals.purchase?.taxableAmount || 0) - (data.totals.purchaseReturn?.taxableAmount || 0)),
                    formatCurrencyForExport((data.totals.purchase?.nonVatAmount || 0) - (data.totals.purchaseReturn?.nonVatAmount || 0)),
                    formatCurrencyForExport(((data.totals.purchase?.taxableAmount || 0) + (data.totals.purchase?.nonVatAmount || 0) + (data.totals.purchase?.vatAmount || 0)) - ((data.totals.purchaseReturn?.taxableAmount || 0) + (data.totals.purchaseReturn?.nonVatAmount || 0) + (data.totals.purchaseReturn?.vatAmount || 0))),
                    '',
                    formatCurrencyForExport(data.totals.sales?.taxableAmount || 0),
                    formatCurrencyForExport(data.totals.sales?.nonVatAmount || 0),
                    formatCurrencyForExport(data.totals.sales?.vatAmount || 0),
                    formatCurrencyForExport((data.totals.sales?.taxableAmount || 0) + (data.totals.sales?.nonVatAmount || 0) + (data.totals.sales?.vatAmount || 0)),
                    '',
                    formatCurrencyForExport(data.totals.salesReturn?.taxableAmount || 0),
                    formatCurrencyForExport(data.totals.salesReturn?.nonVatAmount || 0),
                    formatCurrencyForExport(data.totals.salesReturn?.vatAmount || 0),
                    formatCurrencyForExport((data.totals.salesReturn?.taxableAmount || 0) + (data.totals.salesReturn?.nonVatAmount || 0) + (data.totals.salesReturn?.vatAmount || 0)),
                    '',
                    formatCurrencyForExport((data.totals.sales?.taxableAmount || 0) - (data.totals.salesReturn?.taxableAmount || 0)),
                    formatCurrencyForExport((data.totals.sales?.nonVatAmount || 0) - (data.totals.salesReturn?.nonVatAmount || 0)),
                    formatCurrencyForExport(((data.totals.sales?.taxableAmount || 0) + (data.totals.sales?.nonVatAmount || 0) + (data.totals.sales?.vatAmount || 0)) - ((data.totals.salesReturn?.taxableAmount || 0) + (data.totals.salesReturn?.nonVatAmount || 0) + (data.totals.salesReturn?.vatAmount || 0))),
                    '',
                    formatCurrencyForExport(data.totals.netPurchaseVat || 0),
                    formatCurrencyForExport(data.totals.netSalesVat || 0),
                    formatCurrencyForExport(data.totals.netVat || 0)
                ];
                excelData.push(rowData);
            }

            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Monthly VAT Summary');

            const colWidths = [
                { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
                { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
                { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
                { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
                { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
                { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
                { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
            ];
            ws['!cols'] = colWidths;

            const fileName = `Monthly_VAT_Summary_${data.reportDateRange || currentDate}.xlsx`;
            XLSX.writeFile(wb, fileName);

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

    const handlePrint = () => {
        const hasData = data.totals || (data.monthlyData && data.monthlyData.length > 0);

        if (!hasData) {
            setNotification({
                show: true,
                message: 'No data to print. Please generate a report first.',
                type: 'warning'
            });
            return;
        }

        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            setNotification({
                show: true,
                message: 'Popup blocked. Please allow popups for this site.',
                type: 'error'
            });
            return;
        }

        let tableRows = '';

        if (data.periodType === 'yearly' && data.monthlyData && data.monthlyData.length > 0) {
            data.monthlyData.forEach((monthData) => {
                const netPurchaseTaxable = (monthData.totals?.purchase?.taxableAmount || 0) - (monthData.totals?.purchaseReturn?.taxableAmount || 0);
                const netPurchaseNonVat = (monthData.totals?.purchase?.nonVatAmount || 0) - (monthData.totals?.purchaseReturn?.nonVatAmount || 0);
                const netPurchaseTotal = ((monthData.totals?.purchase?.taxableAmount || 0) + (monthData.totals?.purchase?.nonVatAmount || 0) + (monthData.totals?.purchase?.vatAmount || 0)) -
                    ((monthData.totals?.purchaseReturn?.taxableAmount || 0) + (monthData.totals?.purchaseReturn?.nonVatAmount || 0) + (monthData.totals?.purchaseReturn?.vatAmount || 0));

                const netSalesTaxable = (monthData.totals?.sales?.taxableAmount || 0) - (monthData.totals?.salesReturn?.taxableAmount || 0);
                const netSalesNonVat = (monthData.totals?.sales?.nonVatAmount || 0) - (monthData.totals?.salesReturn?.nonVatAmount || 0);
                const netSalesTotal = ((monthData.totals?.sales?.taxableAmount || 0) + (monthData.totals?.sales?.nonVatAmount || 0) + (monthData.totals?.sales?.vatAmount || 0)) -
                    ((monthData.totals?.salesReturn?.taxableAmount || 0) + (monthData.totals?.salesReturn?.nonVatAmount || 0) + (monthData.totals?.salesReturn?.vatAmount || 0));

                tableRows += `
                    <tr>
                        <td class="nowrap"><strong>${monthData.reportDateRange}</strong></td>
                        <td class="text-end">${formatCurrency(monthData.totals?.purchase?.taxableAmount || 0)}</td>
                        <td class="text-end">${formatCurrency(monthData.totals?.purchase?.nonVatAmount || 0)}</td>
                        <td class="text-end">${formatCurrency(monthData.totals?.purchase?.vatAmount || 0)}</td>
                        <td class="text-end fw-bold">${formatCurrency((monthData.totals?.purchase?.taxableAmount || 0) + (monthData.totals?.purchase?.nonVatAmount || 0) + (monthData.totals?.purchase?.vatAmount || 0))}</td>
                        <td class="bg-light"></td>
                        <td class="text-end">${formatCurrency(monthData.totals?.purchaseReturn?.taxableAmount || 0)}</td>
                        <td class="text-end">${formatCurrency(monthData.totals?.purchaseReturn?.nonVatAmount || 0)}</td>
                        <td class="text-end">${formatCurrency(monthData.totals?.purchaseReturn?.vatAmount || 0)}</td>
                        <td class="text-end fw-bold">${formatCurrency((monthData.totals?.purchaseReturn?.taxableAmount || 0) + (monthData.totals?.purchaseReturn?.nonVatAmount || 0) + (monthData.totals?.purchaseReturn?.vatAmount || 0))}</td>
                        <td class="bg-light"></td>
                        <td class="text-end ${getNetValueClass(netPurchaseTaxable)}">${formatCurrency(netPurchaseTaxable)}</td>
                        <td class="text-end ${getNetValueClass(netPurchaseNonVat)}">${formatCurrency(netPurchaseNonVat)}</td>
                        <td class="text-end ${getNetValueClass(netPurchaseTotal)}">${formatCurrency(netPurchaseTotal)}</td>
                        <td class="bg-light"></td>
                        <td class="text-end">${formatCurrency(monthData.totals?.sales?.taxableAmount || 0)}</td>
                        <td class="text-end">${formatCurrency(monthData.totals?.sales?.nonVatAmount || 0)}</td>
                        <td class="text-end">${formatCurrency(monthData.totals?.sales?.vatAmount || 0)}</td>
                        <td class="text-end fw-bold">${formatCurrency((monthData.totals?.sales?.taxableAmount || 0) + (monthData.totals?.sales?.nonVatAmount || 0) + (monthData.totals?.sales?.vatAmount || 0))}</td>
                        <td class="bg-light"></td>
                        <td class="text-end">${formatCurrency(monthData.totals?.salesReturn?.taxableAmount || 0)}</td>
                        <td class="text-end">${formatCurrency(monthData.totals?.salesReturn?.nonVatAmount || 0)}</td>
                        <td class="text-end">${formatCurrency(monthData.totals?.salesReturn?.vatAmount || 0)}</td>
                        <td class="text-end fw-bold">${formatCurrency((monthData.totals?.salesReturn?.taxableAmount || 0) + (monthData.totals?.salesReturn?.nonVatAmount || 0) + (monthData.totals?.salesReturn?.vatAmount || 0))}</td>
                        <td class="bg-light"></td>
                        <td class="text-end ${getNetValueClass(netSalesTaxable)}">${formatCurrency(netSalesTaxable)}</td>
                        <td class="text-end ${getNetValueClass(netSalesNonVat)}">${formatCurrency(netSalesNonVat)}</td>
                        <td class="text-end ${getNetValueClass(netSalesTotal)}">${formatCurrency(netSalesTotal)}</td>
                        <td class="bg-light"></td>
                        <td class="text-end">${formatCurrency(monthData.totals?.netPurchaseVat || 0)}</td>
                        <td class="text-end">${formatCurrency(monthData.totals?.netSalesVat || 0)}</td>
                        <td class="text-end ${getNetValueClass(monthData.totals?.netVat || 0)}">${formatCurrency(monthData.totals?.netVat || 0)}</td>
                    </tr>
                `;
            });
        } else if (data.totals) {
            const netPurchaseTaxable = (data.totals.purchase?.taxableAmount || 0) - (data.totals.purchaseReturn?.taxableAmount || 0);
            const netPurchaseNonVat = (data.totals.purchase?.nonVatAmount || 0) - (data.totals.purchaseReturn?.nonVatAmount || 0);
            const netPurchaseTotal = ((data.totals.purchase?.taxableAmount || 0) + (data.totals.purchase?.nonVatAmount || 0) + (data.totals.purchase?.vatAmount || 0)) -
                ((data.totals.purchaseReturn?.taxableAmount || 0) + (data.totals.purchaseReturn?.nonVatAmount || 0) + (data.totals.purchaseReturn?.vatAmount || 0));

            const netSalesTaxable = (data.totals.sales?.taxableAmount || 0) - (data.totals.salesReturn?.taxableAmount || 0);
            const netSalesNonVat = (data.totals.sales?.nonVatAmount || 0) - (data.totals.salesReturn?.nonVatAmount || 0);
            const netSalesTotal = ((data.totals.sales?.taxableAmount || 0) + (data.totals.sales?.nonVatAmount || 0) + (data.totals.sales?.vatAmount || 0)) -
                ((data.totals.salesReturn?.taxableAmount || 0) + (data.totals.salesReturn?.nonVatAmount || 0) + (data.totals.salesReturn?.vatAmount || 0));

            tableRows += `
                <tr>
                    <td class="nowrap"><strong>${data.reportDateRange}</strong></td>
                    <td class="text-end">${formatCurrency(data.totals.purchase?.taxableAmount || 0)}</td>
                    <td class="text-end">${formatCurrency(data.totals.purchase?.nonVatAmount || 0)}</td>
                    <td class="text-end">${formatCurrency(data.totals.purchase?.vatAmount || 0)}</td>
                    <td class="text-end fw-bold">${formatCurrency((data.totals.purchase?.taxableAmount || 0) + (data.totals.purchase?.nonVatAmount || 0) + (data.totals.purchase?.vatAmount || 0))}</td>
                    <td class="bg-light"></td>
                    <td class="text-end">${formatCurrency(data.totals.purchaseReturn?.taxableAmount || 0)}</td>
                    <td class="text-end">${formatCurrency(data.totals.purchaseReturn?.nonVatAmount || 0)}</td>
                    <td class="text-end">${formatCurrency(data.totals.purchaseReturn?.vatAmount || 0)}</td>
                    <td class="text-end fw-bold">${formatCurrency((data.totals.purchaseReturn?.taxableAmount || 0) + (data.totals.purchaseReturn?.nonVatAmount || 0) + (data.totals.purchaseReturn?.vatAmount || 0))}</td>
                    <td class="bg-light"></td>
                    <td class="text-end ${getNetValueClass(netPurchaseTaxable)}">${formatCurrency(netPurchaseTaxable)}</td>
                    <td class="text-end ${getNetValueClass(netPurchaseNonVat)}">${formatCurrency(netPurchaseNonVat)}</td>
                    <td class="text-end ${getNetValueClass(netPurchaseTotal)}">${formatCurrency(netPurchaseTotal)}</td>
                    <td class="bg-light"></td>
                    <td class="text-end">${formatCurrency(data.totals.sales?.taxableAmount || 0)}</td>
                    <td class="text-end">${formatCurrency(data.totals.sales?.nonVatAmount || 0)}</td>
                    <td class="text-end">${formatCurrency(data.totals.sales?.vatAmount || 0)}</td>
                    <td class="text-end fw-bold">${formatCurrency((data.totals.sales?.taxableAmount || 0) + (data.totals.sales?.nonVatAmount || 0) + (data.totals.sales?.vatAmount || 0))}</td>
                    <td class="bg-light"></td>
                    <td class="text-end">${formatCurrency(data.totals.salesReturn?.taxableAmount || 0)}</td>
                    <td class="text-end">${formatCurrency(data.totals.salesReturn?.nonVatAmount || 0)}</td>
                    <td class="text-end">${formatCurrency(data.totals.salesReturn?.vatAmount || 0)}</td>
                    <td class="text-end fw-bold">${formatCurrency((data.totals.salesReturn?.taxableAmount || 0) + (data.totals.salesReturn?.nonVatAmount || 0) + (data.totals.salesReturn?.vatAmount || 0))}</td>
                    <td class="bg-light"></td>
                    <td class="text-end ${getNetValueClass(netSalesTaxable)}">${formatCurrency(netSalesTaxable)}</td>
                    <td class="text-end ${getNetValueClass(netSalesNonVat)}">${formatCurrency(netSalesNonVat)}</td>
                    <td class="text-end ${getNetValueClass(netSalesTotal)}">${formatCurrency(netSalesTotal)}</td>
                    <td class="bg-light"></td>
                    <td class="text-end">${formatCurrency(data.totals.netPurchaseVat || 0)}</td>
                    <td class="text-end">${formatCurrency(data.totals.netSalesVat || 0)}</td>
                    <td class="text-end ${getNetValueClass(data.totals.netVat || 0)}">${formatCurrency(data.totals.netVat || 0)}</td>
                </tr>
            `;
        }

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Monthly VAT Summary - ${data.currentCompanyName || 'Company Name'}</title>
            <style>
                @page { margin: 5mm; size: A4 landscape; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, Helvetica, sans-serif; font-size: 8px; margin: 0; padding: 5mm; }
                .print-header { text-align: center; margin-bottom: 8px; }
                .print-header h2 { font-size: 14px; margin: 2px 0; }
                .print-header h3 { font-size: 12px; margin: 2px 0; text-decoration: underline; }
                .print-header p { font-size: 8px; margin: 2px 0; }
                .print-header hr { margin: 4px 0; }
                .report-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 8px; }
                table { width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 7px; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                th, td { border: 1px solid #000; padding: 3px 4px; text-align: left; }
                th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: bold; font-size: 7px; }
                .text-end { text-align: right; }
                .text-center { text-align: center; }
                .nowrap { white-space: nowrap; }
                .print-footer { margin-top: 8px; font-size: 7px; text-align: center; border-top: 1px solid #ccc; padding-top: 4px; }
                .bg-primary { background-color: #007bff !important; color: white !important; }
                .bg-light { background-color: #f8f9fa !important; }
                .text-success { color: #28a745 !important; }
                .text-danger { color: #dc3545 !important; }
                .fw-bold { font-weight: bold !important; }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h2>${data.currentCompanyName || 'Company Name'}</h2>
                <p>${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}<br>PAN: ${data.company?.pan || ''} | Phone: ${data.company?.phone || ''}</p>
                <hr>
                <h3>Monthly VAT Summary</h3>
                <div class="report-info">
                    <div><strong>Report Period:</strong> ${data.reportDateRange || 'N/A'}</div>
                    <div><strong>Printed:</strong> ${new Date().toLocaleString()}</div>
                </div>
            </div>
            <table cellspacing="0">
                <thead>
                    <tr>
                        <th rowspan="2" class="text-center align-middle">Date Range</th>
                        <th colspan="4" class="text-center bg-primary">Purchase</th>
                        <th class="bg-light"></th>
                        <th colspan="4" class="text-center bg-primary">Purchase Return</th>
                        <th class="bg-light"></th>
                        <th colspan="3" class="text-center bg-primary">Net Purchase</th>
                        <th class="bg-light"></th>
                        <th colspan="4" class="text-center bg-primary">Sales</th>
                        <th class="bg-light"></th>
                        <th colspan="4" class="text-center bg-primary">Sales Return</th>
                        <th class="bg-light"></th>
                        <th colspan="3" class="text-center bg-primary">Net Sales</th>
                        <th class="bg-light"></th>
                        <th colspan="3" class="text-center bg-primary">Net VAT</th>
                    </tr>
                    <tr>
                        <th>Taxable</th><th>Non-VAT</th><th>VAT</th><th>Total</th><th class="bg-light"></th>
                        <th>Taxable</th><th>Non-VAT</th><th>VAT</th><th>Total</th><th class="bg-light"></th>
                        <th>Taxable</th><th>Non-VAT</th><th>Total</th><th class="bg-light"></th>
                        <th>Taxable</th><th>Non-VAT</th><th>VAT</th><th>Total</th><th class="bg-light"></th>
                        <th>Taxable</th><th>Non-VAT</th><th>VAT</th><th>Total</th><th class="bg-light"></th>
                        <th>Taxable</th><th>Non-VAT</th><th>Total</th><th class="bg-light"></th>
                        <th>Purc VAT</th><th>Sales VAT</th><th>Net Payable</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <div class="print-footer">Printed from ${data.currentCompanyName || 'Company Name'} | ${new Date().toLocaleString()}</div>
            <script>
                window.onload = function() {
                    setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 500); }, 200);
                };
            <\/script>
        </body>
        </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    if (loading && !data.totals && data.monthlyData.length === 0) return <Loader />;

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">Monthly VAT Summary</h1>
                </div>

                <div className="card-body p-2 p-md-3">
                    {/* Filter Row */}
                    <div className="row g-2 mb-3">
                        {/* Period Type */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <select
                                    name="periodType"
                                    id="periodType"
                                    className="form-select form-select-sm"
                                    value={data.periodType}
                                    onChange={handlePeriodTypeChange}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem' }}
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly (All Months)</option>
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
                                    Period Type
                                </label>
                            </div>
                        </div>

                        {data.periodType === 'monthly' ? (
                            company.dateFormat === 'english' ? (
                                <>
                                    <div className="col-12 col-md-2">
                                        <div className="position-relative">
                                            <select
                                                name="month"
                                                id="month"
                                                ref={monthRef}
                                                className="form-select form-select-sm"
                                                value={data.month}
                                                onChange={handleDateChange}
                                                onKeyDown={(e) => handleKeyDown(e, 'year')}
                                                style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem' }}
                                            >
                                                <option value="">Select Month</option>
                                                {["January", "February", "March", "April", "May", "June",
                                                    "July", "August", "September", "October", "November", "December"]
                                                    .map((monthName, index) => (
                                                        <option key={monthName} value={index + 1}>{monthName}</option>
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
                                                Month
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-2">
                                        <div className="position-relative">
                                            <input
                                                type="number"
                                                name="year"
                                                id="year"
                                                ref={yearRef}
                                                className="form-control form-control-sm"
                                                value={data.year}
                                                onChange={handleDateChange}
                                                onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                                placeholder={`e.g. ${new Date().getFullYear()}`}
                                                autoComplete="off"
                                                style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem' }}
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
                                                Year
                                            </label>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="col-12 col-md-2">
                                        <div className="position-relative">
                                            <select
                                                name="nepaliMonth"
                                                id="nepaliMonth"
                                                ref={nepaliMonthRef}
                                                className="form-select form-select-sm"
                                                value={data.nepaliMonth}
                                                onChange={handleDateChange}
                                                onKeyDown={(e) => handleKeyDown(e, 'nepaliYear')}
                                                style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem' }}
                                            >
                                                <option value="">Select Month</option>
                                                {["Baisakh", "Jestha", "Ashad", "Shrawan", "Bhadra", "Ashoj",
                                                    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"]
                                                    .map((monthName, index) => (
                                                        <option key={monthName} value={index + 1}>{monthName}</option>
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
                                                Month (Nepali)
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-2">
                                        <div className="position-relative">
                                            <input
                                                type="text"
                                                name="nepaliYear"
                                                id="nepaliYear"
                                                ref={nepaliYearRef}
                                                className="form-control form-control-sm"
                                                value={data.nepaliYear}
                                                onChange={handleDateChange}
                                                onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                                placeholder={`e.g. ${data.currentNepaliYear}`}
                                                autoComplete="off"
                                                style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem' }}
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
                                                Year (Nepali)
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )
                        ) : (
                            company.dateFormat === 'english' ? (
                                <div className="col-12 col-md-2">
                                    <div className="position-relative">
                                        <input
                                            type="number"
                                            name="year"
                                            id="year"
                                            ref={yearRef}
                                            className="form-control form-control-sm"
                                            value={data.year}
                                            onChange={handleDateChange}
                                            onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                            placeholder={`e.g. ${new Date().getFullYear()}`}
                                            autoComplete="off"
                                            style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem' }}
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
                                            Year
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="col-12 col-md-3">
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            name="nepaliYear"
                                            id="nepaliYear"
                                            ref={nepaliYearRef}
                                            className="form-control form-control-sm"
                                            value={data.nepaliYear}
                                            onChange={handleDateChange}
                                            onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                            placeholder={`e.g. ${getCurrentNepaliFiscalYear()}`}
                                            autoComplete="off"
                                            style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem' }}
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
                                            Fiscal Year (Nepali)
                                        </label>
                                    </div>
                                </div>
                            )
                        )}

                        {/* Generate Button */}
                        <div className="col-12 col-md-1">
                            <button
                                type="button"
                                id="generateReport"
                                ref={generateReportRef}
                                className="btn btn-primary btn-sm w-100"
                                onClick={handleGenerateReport}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <i className="fas fa-chart-line me-1"></i>Generate
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="col-12 col-md-auto d-flex align-items-end justify-content-end gap-2">
                            <button
                                className="btn btn-success btn-sm"
                                onClick={exportToExcel}
                                disabled={(!data.totals && data.monthlyData.length === 0) || exporting}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                {exporting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="fas fa-file-excel me-1"></i>}
                                Excel
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={handlePrint}
                                disabled={!data.totals && data.monthlyData.length === 0}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <i className="fas fa-print me-1"></i>Print
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger text-center py-1 mb-2 small" style={{ fontSize: '0.75rem' }}>
                            {error}
                            <button type="button" className="btn-close btn-sm ms-2" style={{ fontSize: '10px' }} onClick={() => setError(null)}></button>
                        </div>
                    )}

                    {!data.totals && data.monthlyData.length === 0 ? (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.875rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Select period type and date to generate the VAT report
                        </div>
                    ) : (
                        <div className="table-responsive" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <table className="table table-bordered table-hover table-sm" style={{ fontSize: '0.75rem' }}>
                                <thead className="table-light sticky-top">
                                    <tr>
                                        <th rowSpan="2" className="text-center align-middle bg-primary text-white" style={{ padding: '4px', fontSize: '0.7rem' }}>Date Range</th>
                                        <th colSpan="4" className="text-center bg-primary text-white" style={{ padding: '4px', fontSize: '0.7rem' }}>Purchase</th>
                                        <th className="bg-light" style={{ width: '10px' }}></th>
                                        <th colSpan="4" className="text-center bg-primary text-white" style={{ padding: '4px', fontSize: '0.7rem' }}>Purchase Return</th>
                                        <th className="bg-light" style={{ width: '10px' }}></th>
                                        <th colSpan="3" className="text-center bg-primary text-white" style={{ padding: '4px', fontSize: '0.7rem' }}>Net Purchase</th>
                                        <th className="bg-light" style={{ width: '10px' }}></th>
                                        <th colSpan="4" className="text-center bg-primary text-white" style={{ padding: '4px', fontSize: '0.7rem' }}>Sales</th>
                                        <th className="bg-light" style={{ width: '10px' }}></th>
                                        <th colSpan="4" className="text-center bg-primary text-white" style={{ padding: '4px', fontSize: '0.7rem' }}>Sales Return</th>
                                        <th className="bg-light" style={{ width: '10px' }}></th>
                                        <th colSpan="3" className="text-center bg-primary text-white" style={{ padding: '4px', fontSize: '0.7rem' }}>Net Sales</th>
                                        <th className="bg-light" style={{ width: '10px' }}></th>
                                        <th colSpan="3" className="text-center bg-primary text-white" style={{ padding: '4px', fontSize: '0.7rem' }}>Net VAT</th>
                                    </tr>
                                    <tr>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Taxable</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Non-VAT</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>VAT</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Total</th>
                                        <th className="bg-light"></th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Taxable</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Non-VAT</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>VAT</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Total</th>
                                        <th className="bg-light"></th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Taxable</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Non-VAT</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Total</th>
                                        <th className="bg-light"></th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Taxable</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Non-VAT</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>VAT</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Total</th>
                                        <th className="bg-light"></th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Taxable</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Non-VAT</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>VAT</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Total</th>
                                        <th className="bg-light"></th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Taxable</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Non-VAT</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Total</th>
                                        <th className="bg-light"></th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Purc VAT</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Sales VAT</th>
                                        <th style={{ padding: '4px', fontSize: '0.7rem' }}>Net Payable</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.periodType === 'yearly' && data.monthlyData && data.monthlyData.length > 0 ? (
                                        data.monthlyData.map((monthData, idx) => {
                                            const netPurchaseTaxable = (monthData.totals?.purchase?.taxableAmount || 0) - (monthData.totals?.purchaseReturn?.taxableAmount || 0);
                                            const netPurchaseNonVat = (monthData.totals?.purchase?.nonVatAmount || 0) - (monthData.totals?.purchaseReturn?.nonVatAmount || 0);
                                            const netPurchaseTotal = ((monthData.totals?.purchase?.taxableAmount || 0) + (monthData.totals?.purchase?.nonVatAmount || 0) + (monthData.totals?.purchase?.vatAmount || 0)) -
                                                ((monthData.totals?.purchaseReturn?.taxableAmount || 0) + (monthData.totals?.purchaseReturn?.nonVatAmount || 0) + (monthData.totals?.purchaseReturn?.vatAmount || 0));

                                            const netSalesTaxable = (monthData.totals?.sales?.taxableAmount || 0) - (monthData.totals?.salesReturn?.taxableAmount || 0);
                                            const netSalesNonVat = (monthData.totals?.sales?.nonVatAmount || 0) - (monthData.totals?.salesReturn?.nonVatAmount || 0);
                                            const netSalesTotal = ((monthData.totals?.sales?.taxableAmount || 0) + (monthData.totals?.sales?.nonVatAmount || 0) + (monthData.totals?.sales?.vatAmount || 0)) -
                                                ((monthData.totals?.salesReturn?.taxableAmount || 0) + (monthData.totals?.salesReturn?.nonVatAmount || 0) + (monthData.totals?.salesReturn?.vatAmount || 0));

                                            return (
                                                <tr key={idx}>
                                                    <td className="align-middle"><strong>{monthData.reportDateRange}</strong></td>
                                                    <td>{formatCurrency(monthData.totals?.purchase?.taxableAmount)}</td>
                                                    <td>{formatCurrency(monthData.totals?.purchase?.nonVatAmount)}</td>
                                                    <td>{formatCurrency(monthData.totals?.purchase?.vatAmount)}</td>
                                                    <td className="fw-bold">{formatCurrency((monthData.totals?.purchase?.taxableAmount || 0) + (monthData.totals?.purchase?.nonVatAmount || 0) + (monthData.totals?.purchase?.vatAmount || 0))}</td>
                                                    <td className="bg-light"></td>
                                                    <td>{formatCurrency(monthData.totals?.purchaseReturn?.taxableAmount)}</td>
                                                    <td>{formatCurrency(monthData.totals?.purchaseReturn?.nonVatAmount)}</td>
                                                    <td>{formatCurrency(monthData.totals?.purchaseReturn?.vatAmount)}</td>
                                                    <td className="fw-bold">{formatCurrency((monthData.totals?.purchaseReturn?.taxableAmount || 0) + (monthData.totals?.purchaseReturn?.nonVatAmount || 0) + (monthData.totals?.purchaseReturn?.vatAmount || 0))}</td>
                                                    <td className="bg-light"></td>
                                                    <td className={getNetValueClass(netPurchaseTaxable)}>{formatCurrency(netPurchaseTaxable)}</td>
                                                    <td className={getNetValueClass(netPurchaseNonVat)}>{formatCurrency(netPurchaseNonVat)}</td>
                                                    <td className={getNetValueClass(netPurchaseTotal)}>{formatCurrency(netPurchaseTotal)}</td>
                                                    <td className="bg-light"></td>
                                                    <td>{formatCurrency(monthData.totals?.sales?.taxableAmount)}</td>
                                                    <td>{formatCurrency(monthData.totals?.sales?.nonVatAmount)}</td>
                                                    <td>{formatCurrency(monthData.totals?.sales?.vatAmount)}</td>
                                                    <td className="fw-bold">{formatCurrency((monthData.totals?.sales?.taxableAmount || 0) + (monthData.totals?.sales?.nonVatAmount || 0) + (monthData.totals?.sales?.vatAmount || 0))}</td>
                                                    <td className="bg-light"></td>
                                                    <td>{formatCurrency(monthData.totals?.salesReturn?.taxableAmount)}</td>
                                                    <td>{formatCurrency(monthData.totals?.salesReturn?.nonVatAmount)}</td>
                                                    <td>{formatCurrency(monthData.totals?.salesReturn?.vatAmount)}</td>
                                                    <td className="fw-bold">{formatCurrency((monthData.totals?.salesReturn?.taxableAmount || 0) + (monthData.totals?.salesReturn?.nonVatAmount || 0) + (monthData.totals?.salesReturn?.vatAmount || 0))}</td>
                                                    <td className="bg-light"></td>
                                                    <td className={getNetValueClass(netSalesTaxable)}>{formatCurrency(netSalesTaxable)}</td>
                                                    <td className={getNetValueClass(netSalesNonVat)}>{formatCurrency(netSalesNonVat)}</td>
                                                    <td className={getNetValueClass(netSalesTotal)}>{formatCurrency(netSalesTotal)}</td>
                                                    <td className="bg-light"></td>
                                                    <td>{formatCurrency(monthData.totals?.netPurchaseVat)}</td>
                                                    <td>{formatCurrency(monthData.totals?.netSalesVat)}</td>
                                                    <td className={getNetValueClass(monthData.totals?.netVat)}>{formatCurrency(monthData.totals?.netVat)}</td>
                                                </tr>
                                            );
                                        })
                                    ) : data.totals ? (
                                        <tr>
                                            <td className="align-middle"><strong>{data.reportDateRange}</strong></td>
                                            <td>{formatCurrency(data.totals.purchase?.taxableAmount)}</td>
                                            <td>{formatCurrency(data.totals.purchase?.nonVatAmount)}</td>
                                            <td>{formatCurrency(data.totals.purchase?.vatAmount)}</td>
                                            <td className="fw-bold">{formatCurrency((data.totals.purchase?.taxableAmount || 0) + (data.totals.purchase?.nonVatAmount || 0) + (data.totals.purchase?.vatAmount || 0))}</td>
                                            <td className="bg-light"></td>
                                            <td>{formatCurrency(data.totals.purchaseReturn?.taxableAmount)}</td>
                                            <td>{formatCurrency(data.totals.purchaseReturn?.nonVatAmount)}</td>
                                            <td>{formatCurrency(data.totals.purchaseReturn?.vatAmount)}</td>
                                            <td className="fw-bold">{formatCurrency((data.totals.purchaseReturn?.taxableAmount || 0) + (data.totals.purchaseReturn?.nonVatAmount || 0) + (data.totals.purchaseReturn?.vatAmount || 0))}</td>
                                            <td className="bg-light"></td>
                                            <td className={getNetValueClass((data.totals.purchase?.taxableAmount || 0) - (data.totals.purchaseReturn?.taxableAmount || 0))}>
                                                {formatCurrency((data.totals.purchase?.taxableAmount || 0) - (data.totals.purchaseReturn?.taxableAmount || 0))}
                                            </td>
                                            <td className={getNetValueClass((data.totals.purchase?.nonVatAmount || 0) - (data.totals.purchaseReturn?.nonVatAmount || 0))}>
                                                {formatCurrency((data.totals.purchase?.nonVatAmount || 0) - (data.totals.purchaseReturn?.nonVatAmount || 0))}
                                            </td>
                                            <td className={getNetValueClass(((data.totals.purchase?.taxableAmount || 0) + (data.totals.purchase?.nonVatAmount || 0) + (data.totals.purchase?.vatAmount || 0)) -
                                                ((data.totals.purchaseReturn?.taxableAmount || 0) + (data.totals.purchaseReturn?.nonVatAmount || 0) + (data.totals.purchaseReturn?.vatAmount || 0)))}>
                                                {formatCurrency(((data.totals.purchase?.taxableAmount || 0) + (data.totals.purchase?.nonVatAmount || 0) + (data.totals.purchase?.vatAmount || 0)) -
                                                    ((data.totals.purchaseReturn?.taxableAmount || 0) + (data.totals.purchaseReturn?.nonVatAmount || 0) + (data.totals.purchaseReturn?.vatAmount || 0)))}
                                            </td>
                                            <td className="bg-light"></td>
                                            <td>{formatCurrency(data.totals.sales?.taxableAmount)}</td>
                                            <td>{formatCurrency(data.totals.sales?.nonVatAmount)}</td>
                                            <td>{formatCurrency(data.totals.sales?.vatAmount)}</td>
                                            <td className="fw-bold">{formatCurrency((data.totals.sales?.taxableAmount || 0) + (data.totals.sales?.nonVatAmount || 0) + (data.totals.sales?.vatAmount || 0))}</td>
                                            <td className="bg-light"></td>
                                            <td>{formatCurrency(data.totals.salesReturn?.taxableAmount)}</td>
                                            <td>{formatCurrency(data.totals.salesReturn?.nonVatAmount)}</td>
                                            <td>{formatCurrency(data.totals.salesReturn?.vatAmount)}</td>
                                            <td className="fw-bold">{formatCurrency((data.totals.salesReturn?.taxableAmount || 0) + (data.totals.salesReturn?.nonVatAmount || 0) + (data.totals.salesReturn?.vatAmount || 0))}</td>
                                            <td className="bg-light"></td>
                                            <td className={getNetValueClass((data.totals.sales?.taxableAmount || 0) - (data.totals.salesReturn?.taxableAmount || 0))}>
                                                {formatCurrency((data.totals.sales?.taxableAmount || 0) - (data.totals.salesReturn?.taxableAmount || 0))}
                                            </td>
                                            <td className={getNetValueClass((data.totals.sales?.nonVatAmount || 0) - (data.totals.salesReturn?.nonVatAmount || 0))}>
                                                {formatCurrency((data.totals.sales?.nonVatAmount || 0) - (data.totals.salesReturn?.nonVatAmount || 0))}
                                            </td>
                                            <td className={getNetValueClass(((data.totals.sales?.taxableAmount || 0) + (data.totals.sales?.nonVatAmount || 0) + (data.totals.sales?.vatAmount || 0)) -
                                                ((data.totals.salesReturn?.taxableAmount || 0) + (data.totals.salesReturn?.nonVatAmount || 0) + (data.totals.salesReturn?.vatAmount || 0)))}>
                                                {formatCurrency(((data.totals.sales?.taxableAmount || 0) + (data.totals.sales?.nonVatAmount || 0) + (data.totals.sales?.vatAmount || 0)) -
                                                    ((data.totals.salesReturn?.taxableAmount || 0) + (data.totals.salesReturn?.nonVatAmount || 0) + (data.totals.salesReturn?.vatAmount || 0)))}
                                            </td>
                                            <td className="bg-light"></td>
                                            <td>{formatCurrency(data.totals.netPurchaseVat)}</td>
                                            <td>{formatCurrency(data.totals.netSalesVat)}</td>
                                            <td className={getNetValueClass(data.totals.netVat)}>{formatCurrency(data.totals.netVat)}</td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
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

export default MonthlyVatSummary;