// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
// import Header from '../Header';
// import NepaliDate from 'nepali-date';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import NotificationToast from '../../NotificationToast';
// import Loader from '../../Loader';
// import * as XLSX from 'xlsx';

// const MonthlyVatSummary = () => {
//     const { draftSave, setDraftSave } = usePageNotRefreshContext();
//     const [company, setCompany] = useState({
//         dateFormat: 'nepali',
//         vatEnabled: true,
//         fiscalYear: {}
//     });
//     const navigate = useNavigate();
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success'
//     });
//     const [formValues, setFormValues] = useState(draftSave?.formValues || {
//         companyDateFormat: 'nepali',
//         month: null,
//         year: null,
//         nepaliMonth: null,
//         nepaliYear: null,
//         periodType: 'monthly' // 'monthly' or 'yearly'
//     });

//     const [reportData, setReportData] = useState(draftSave?.reportData || {
//         company: null,
//         currentFiscalYear: null,
//         totals: null,
//         monthlyData: [], // Array for all months data when "All" is selected
//         currentNepaliYear: new NepaliDate().getYear(),
//         reportDateRange: '',
//         currentCompanyName: ''
//     });

//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [exporting, setExporting] = useState(false);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // Save draft data
//     useEffect(() => {
//         if (reportData.totals || formValues.month || formValues.year || formValues.nepaliMonth || formValues.nepaliYear) {
//             setDraftSave({
//                 ...draftSave,
//                 monthlyVatReportData: {
//                     ...formValues,
//                     ...reportData
//                 }
//             });
//         }
//     }, [formValues, reportData]);

//     const handleDateChange = (e) => {
//         const { name, value } = e.target;
//         setFormValues(prev => ({
//             ...prev,
//             [name]: value === '' ? null : value
//         }));
//     };

//     const handlePeriodTypeChange = (e) => {
//         const periodType = e.target.value;
//         setFormValues(prev => ({
//             ...prev,
//             periodType,
//             month: null,
//             year: null,
//             nepaliMonth: null,
//             nepaliYear: null
//         }));
//         setReportData(prev => ({
//             ...prev,
//             totals: null,
//             monthlyData: []
//         }));
//     };

//     const handleGenerateReport = async (e) => {
//         e.preventDefault();

//         // Validation
//         if (formValues.periodType === 'monthly') {
//             if (formValues.companyDateFormat === 'nepali') {
//                 if (!formValues.nepaliMonth || !formValues.nepaliYear) {
//                     setNotification({
//                         show: true,
//                         message: `Please select both Nepali month and year`,
//                         type: 'error'
//                     });
//                     return;
//                 }
//             } else {
//                 if (!formValues.month || !formValues.year) {
//                     setNotification({
//                         show: true,
//                         message: `Please select both month and year`,
//                         type: 'error'
//                     });
//                     return;
//                 }
//             }
//         } else { // yearly
//             if (formValues.companyDateFormat === 'nepali') {
//                 if (!formValues.nepaliYear) {
//                     setNotification({
//                         show: true,
//                         message: `Please select Nepali year`,
//                         type: 'error'
//                     });
//                     return;
//                 }
//             } else {
//                 if (!formValues.year) {
//                     setNotification({
//                         show: true,
//                         message: `Please select year`,
//                         type: 'error'
//                     });
//                     return;
//                 }
//             }
//         }

//         try {
//             setLoading(true);
//             setError(null);

//             const params = new URLSearchParams();
//             params.append('periodType', formValues.periodType);

//             if (formValues.periodType === 'monthly') {
//                 if (formValues.companyDateFormat === 'english') {
//                     params.append('month', formValues.month);
//                     params.append('year', formValues.year);
//                 } else {
//                     params.append('nepaliMonth', formValues.nepaliMonth);
//                     params.append('nepaliYear', formValues.nepaliYear);
//                 }
//             } else { // yearly
//                 if (formValues.companyDateFormat === 'english') {
//                     params.append('year', formValues.year);
//                 } else {
//                     params.append('nepaliYear', formValues.nepaliYear);
//                 }
//             }

//             const response = await api.get('/api/retailer/monthly-vat-summary', { params });
//             setReportData(prev => ({
//                 ...prev,
//                 ...response.data.data,
//                 currentCompanyName: response.data.data.currentCompanyName || ''
//             }));
//         } catch (err) {
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.error || 'Failed to fetch monthly VAT report',
//                 type: 'error'
//             });
//         } finally {
//             setLoading(false);
//         }
//     };

//     const formatCurrency = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         if (company.dateFormat === 'nepali') {
//             return number.toLocaleString('en-IN', {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2
//             });
//         }
//         return number.toLocaleString('en-US', {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         });
//     };

//     const getNetValueClass = (value) => {
//         return value >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold';
//     };

//     // Get current Nepali fiscal year for placeholder
//     const getCurrentNepaliFiscalYear = () => {
//         const currentNepaliDate = new NepaliDate();
//         const currentYear = currentNepaliDate.getYear();
//         const currentMonth = currentNepaliDate.getMonth() + 1; // 1-12

//         if (currentMonth >= 4) {
//             return `${currentYear}/${currentYear + 1}`;
//         } else {
//             return `${currentYear - 1}/${currentYear}`;
//         }
//     };

//     // Add this function to calculate totals for display
//     const calculateDisplayTotals = () => {
//         if (reportData.totals) {
//             // Single month totals
//             return {
//                 purchaseTaxable: reportData.totals.purchase?.taxableAmount || 0,
//                 purchaseNonVat: reportData.totals.purchase?.nonVatAmount || 0,
//                 purchaseVat: reportData.totals.purchase?.vatAmount || 0,
//                 purchaseTotal: (reportData.totals.purchase?.taxableAmount || 0) +
//                     (reportData.totals.purchase?.nonVatAmount || 0) +
//                     (reportData.totals.purchase?.vatAmount || 0),

//                 purchaseReturnTaxable: reportData.totals.purchaseReturn?.taxableAmount || 0,
//                 purchaseReturnNonVat: reportData.totals.purchaseReturn?.nonVatAmount || 0,
//                 purchaseReturnVat: reportData.totals.purchaseReturn?.vatAmount || 0,
//                 purchaseReturnTotal: (reportData.totals.purchaseReturn?.taxableAmount || 0) +
//                     (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
//                     (reportData.totals.purchaseReturn?.vatAmount || 0),

//                 netPurchaseTaxable: (reportData.totals.purchase?.taxableAmount || 0) -
//                     (reportData.totals.purchaseReturn?.taxableAmount || 0),
//                 netPurchaseNonVat: (reportData.totals.purchase?.nonVatAmount || 0) -
//                     (reportData.totals.purchaseReturn?.nonVatAmount || 0),
//                 netPurchaseTotal: ((reportData.totals.purchase?.taxableAmount || 0) +
//                     (reportData.totals.purchase?.nonVatAmount || 0) +
//                     (reportData.totals.purchase?.vatAmount || 0)) -
//                     ((reportData.totals.purchaseReturn?.taxableAmount || 0) +
//                         (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
//                         (reportData.totals.purchaseReturn?.vatAmount || 0)),

//                 salesTaxable: reportData.totals.sales?.taxableAmount || 0,
//                 salesNonVat: reportData.totals.sales?.nonVatAmount || 0,
//                 salesVat: reportData.totals.sales?.vatAmount || 0,
//                 salesTotal: (reportData.totals.sales?.taxableAmount || 0) +
//                     (reportData.totals.sales?.nonVatAmount || 0) +
//                     (reportData.totals.sales?.vatAmount || 0),

//                 salesReturnTaxable: reportData.totals.salesReturn?.taxableAmount || 0,
//                 salesReturnNonVat: reportData.totals.salesReturn?.nonVatAmount || 0,
//                 salesReturnVat: reportData.totals.salesReturn?.vatAmount || 0,
//                 salesReturnTotal: (reportData.totals.salesReturn?.taxableAmount || 0) +
//                     (reportData.totals.salesReturn?.nonVatAmount || 0) +
//                     (reportData.totals.salesReturn?.vatAmount || 0),

//                 netSalesTaxable: (reportData.totals.sales?.taxableAmount || 0) -
//                     (reportData.totals.salesReturn?.taxableAmount || 0),
//                 netSalesNonVat: (reportData.totals.sales?.nonVatAmount || 0) -
//                     (reportData.totals.salesReturn?.nonVatAmount || 0),
//                 netSalesTotal: ((reportData.totals.sales?.taxableAmount || 0) +
//                     (reportData.totals.sales?.nonVatAmount || 0) +
//                     (reportData.totals.sales?.vatAmount || 0)) -
//                     ((reportData.totals.salesReturn?.taxableAmount || 0) +
//                         (reportData.totals.salesReturn?.nonVatAmount || 0) +
//                         (reportData.totals.salesReturn?.vatAmount || 0)),

//                 netPurchaseVat: reportData.totals.netPurchaseVat || 0,
//                 netSalesVat: reportData.totals.netSalesVat || 0,
//                 netVat: reportData.totals.netVat || 0
//             };
//         } else if (reportData.monthlyData && reportData.monthlyData.length > 0) {
//             // Multiple months totals
//             return calculateYearlyTotals();
//         }
//         return null;
//     };

//     // Excel Export Function - FIXED COLUMN MAPPING
//     const handleExportExcel = async () => {
//         // Check if there's any data to export
//         const hasData = reportData.totals ||
//             (reportData.monthlyData && reportData.monthlyData.length > 0);

//         if (!hasData) {
//             setNotification({
//                 show: true,
//                 message: 'No data to export. Please generate a report first.',
//                 type: 'error'
//             });
//             return;
//         }

//         setExporting(true);
//         try {
//             let excelData = [];
//             const currentDate = new Date().toISOString().split('T')[0];

//             // Add company header information
//             excelData.push(['Company Name:', reportData.currentCompanyName || 'N/A']);
//             excelData.push(['Report Type:', 'Monthly VAT Summary']);
//             excelData.push(['Date Range:', reportData.reportDateRange || 'N/A']);
//             excelData.push(['Export Date:', currentDate]);
//             excelData.push([]); // Empty row for spacing

//             // Main table headers - using array format for proper alignment
//             const headers = [
//                 'Date Range',
//                 'Purchase Taxable', 'Purchase Non-VAT', 'Purchase VAT', 'Purchase Total',
//                 '',
//                 'Purchase Return Taxable', 'Purchase Return Non-VAT', 'Purchase Return VAT', 'Purchase Return Total',
//                 '',
//                 'Net Purchase Taxable', 'Net Purchase Non-VAT', 'Net Purchase Total',
//                 '',
//                 'Sales Taxable', 'Sales Non-VAT', 'Sales VAT', 'Sales Total',
//                 '',
//                 'Sales Return Taxable', 'Sales Return Non-VAT', 'Sales Return VAT', 'Sales Return Total',
//                 '',
//                 'Net Sales Taxable', 'Net Sales Non-VAT', 'Net Sales Total',
//                 '',
//                 'Purchase VAT', 'Sales VAT', 'Net VAT Payable'
//             ];

//             // Add headers row
//             excelData.push(headers);

//             // Export data based on report type
//             if (formValues.periodType === 'yearly' && reportData.monthlyData && reportData.monthlyData.length > 0) {
//                 // Export all months data for yearly report
//                 reportData.monthlyData.forEach((monthData) => {
//                     const rowData = [
//                         monthData.reportDateRange,
//                         formatCurrency(monthData.totals.purchase?.taxableAmount || 0),
//                         formatCurrency(monthData.totals.purchase?.nonVatAmount || 0),
//                         formatCurrency(monthData.totals.purchase?.vatAmount || 0),
//                         formatCurrency(
//                             (monthData.totals.purchase?.taxableAmount || 0) +
//                             (monthData.totals.purchase?.nonVatAmount || 0) +
//                             (monthData.totals.purchase?.vatAmount || 0)
//                         ),
//                         '', // Spacer
//                         formatCurrency(monthData.totals.purchaseReturn?.taxableAmount || 0),
//                         formatCurrency(monthData.totals.purchaseReturn?.nonVatAmount || 0),
//                         formatCurrency(monthData.totals.purchaseReturn?.vatAmount || 0),
//                         formatCurrency(
//                             (monthData.totals.purchaseReturn?.taxableAmount || 0) +
//                             (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
//                             (monthData.totals.purchaseReturn?.vatAmount || 0)
//                         ),
//                         '', // Spacer
//                         formatCurrency(
//                             (monthData.totals.purchase?.taxableAmount || 0) -
//                             (monthData.totals.purchaseReturn?.taxableAmount || 0)
//                         ),
//                         formatCurrency(
//                             (monthData.totals.purchase?.nonVatAmount || 0) -
//                             (monthData.totals.purchaseReturn?.nonVatAmount || 0)
//                         ),
//                         formatCurrency(
//                             ((monthData.totals.purchase?.taxableAmount || 0) +
//                                 (monthData.totals.purchase?.nonVatAmount || 0) +
//                                 (monthData.totals.purchase?.vatAmount || 0)) -
//                             ((monthData.totals.purchaseReturn?.taxableAmount || 0) +
//                                 (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
//                                 (monthData.totals.purchaseReturn?.vatAmount || 0))
//                         ),
//                         '', // Spacer
//                         formatCurrency(monthData.totals.sales?.taxableAmount || 0),
//                         formatCurrency(monthData.totals.sales?.nonVatAmount || 0),
//                         formatCurrency(monthData.totals.sales?.vatAmount || 0),
//                         formatCurrency(
//                             (monthData.totals.sales?.taxableAmount || 0) +
//                             (monthData.totals.sales?.nonVatAmount || 0) +
//                             (monthData.totals.sales?.vatAmount || 0)
//                         ),
//                         '', // Spacer
//                         formatCurrency(monthData.totals.salesReturn?.taxableAmount || 0),
//                         formatCurrency(monthData.totals.salesReturn?.nonVatAmount || 0),
//                         formatCurrency(monthData.totals.salesReturn?.vatAmount || 0),
//                         formatCurrency(
//                             (monthData.totals.salesReturn?.taxableAmount || 0) +
//                             (monthData.totals.salesReturn?.nonVatAmount || 0) +
//                             (monthData.totals.salesReturn?.vatAmount || 0)
//                         ),
//                         '', // Spacer
//                         formatCurrency(
//                             (monthData.totals.sales?.taxableAmount || 0) -
//                             (monthData.totals.salesReturn?.taxableAmount || 0)
//                         ),
//                         formatCurrency(
//                             (monthData.totals.sales?.nonVatAmount || 0) -
//                             (monthData.totals.salesReturn?.nonVatAmount || 0)
//                         ),
//                         formatCurrency(
//                             ((monthData.totals.sales?.taxableAmount || 0) +
//                                 (monthData.totals.sales?.nonVatAmount || 0) +
//                                 (monthData.totals.sales?.vatAmount || 0)) -
//                             ((monthData.totals.salesReturn?.taxableAmount || 0) +
//                                 (monthData.totals.salesReturn?.nonVatAmount || 0) +
//                                 (monthData.totals.salesReturn?.vatAmount || 0))
//                         ),
//                         '', // Spacer
//                         formatCurrency(monthData.totals.netPurchaseVat || 0),
//                         formatCurrency(monthData.totals.netSalesVat || 0),
//                         formatCurrency(monthData.totals.netVat || 0)
//                     ];
//                     excelData.push(rowData);
//                 });

//                 // Add yearly totals
//                 const yearlyTotals = calculateYearlyTotals();
//                 if (yearlyTotals) {
//                     excelData.push([]); // Empty row
//                     const totalsRow = [
//                         'YEARLY TOTALS',
//                         formatCurrency(yearlyTotals.purchaseTaxable),
//                         formatCurrency(yearlyTotals.purchaseNonVat),
//                         formatCurrency(yearlyTotals.purchaseVat),
//                         formatCurrency(yearlyTotals.purchaseTotal),
//                         '', // Spacer
//                         formatCurrency(yearlyTotals.purchaseReturnTaxable),
//                         formatCurrency(yearlyTotals.purchaseReturnNonVat),
//                         formatCurrency(yearlyTotals.purchaseReturnVat),
//                         formatCurrency(yearlyTotals.purchaseReturnTotal),
//                         '', // Spacer
//                         formatCurrency(yearlyTotals.netPurchaseTaxable),
//                         formatCurrency(yearlyTotals.netPurchaseNonVat),
//                         formatCurrency(yearlyTotals.netPurchaseTotal),
//                         '', // Spacer
//                         formatCurrency(yearlyTotals.salesTaxable),
//                         formatCurrency(yearlyTotals.salesNonVat),
//                         formatCurrency(yearlyTotals.salesVat),
//                         formatCurrency(yearlyTotals.salesTotal),
//                         '', // Spacer
//                         formatCurrency(yearlyTotals.salesReturnTaxable),
//                         formatCurrency(yearlyTotals.salesReturnNonVat),
//                         formatCurrency(yearlyTotals.salesReturnVat),
//                         formatCurrency(yearlyTotals.salesReturnTotal),
//                         '', // Spacer
//                         formatCurrency(yearlyTotals.netSalesTaxable),
//                         formatCurrency(yearlyTotals.netSalesNonVat),
//                         formatCurrency(yearlyTotals.netSalesTotal),
//                         '', // Spacer
//                         formatCurrency(yearlyTotals.netPurchaseVat),
//                         formatCurrency(yearlyTotals.netSalesVat),
//                         formatCurrency(yearlyTotals.netVat)
//                     ];
//                     excelData.push(totalsRow);
//                 }
//             } else if (reportData.totals) {
//                 // Export single month data
//                 const rowData = [
//                     reportData.reportDateRange,
//                     formatCurrency(reportData.totals.purchase?.taxableAmount || 0),
//                     formatCurrency(reportData.totals.purchase?.nonVatAmount || 0),
//                     formatCurrency(reportData.totals.purchase?.vatAmount || 0),
//                     formatCurrency(
//                         (reportData.totals.purchase?.taxableAmount || 0) +
//                         (reportData.totals.purchase?.nonVatAmount || 0) +
//                         (reportData.totals.purchase?.vatAmount || 0)
//                     ),
//                     '', // Spacer
//                     formatCurrency(reportData.totals.purchaseReturn?.taxableAmount || 0),
//                     formatCurrency(reportData.totals.purchaseReturn?.nonVatAmount || 0),
//                     formatCurrency(reportData.totals.purchaseReturn?.vatAmount || 0),
//                     formatCurrency(
//                         (reportData.totals.purchaseReturn?.taxableAmount || 0) +
//                         (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
//                         (reportData.totals.purchaseReturn?.vatAmount || 0)
//                     ),
//                     '', // Spacer
//                     formatCurrency(
//                         (reportData.totals.purchase?.taxableAmount || 0) -
//                         (reportData.totals.purchaseReturn?.taxableAmount || 0)
//                     ),
//                     formatCurrency(
//                         (reportData.totals.purchase?.nonVatAmount || 0) -
//                         (reportData.totals.purchaseReturn?.nonVatAmount || 0)
//                     ),
//                     formatCurrency(
//                         ((reportData.totals.purchase?.taxableAmount || 0) +
//                             (reportData.totals.purchase?.nonVatAmount || 0) +
//                             (reportData.totals.purchase?.vatAmount || 0)) -
//                         ((reportData.totals.purchaseReturn?.taxableAmount || 0) +
//                             (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
//                             (reportData.totals.purchaseReturn?.vatAmount || 0))
//                     ),
//                     '', // Spacer
//                     formatCurrency(reportData.totals.sales?.taxableAmount || 0),
//                     formatCurrency(reportData.totals.sales?.nonVatAmount || 0),
//                     formatCurrency(reportData.totals.sales?.vatAmount || 0),
//                     formatCurrency(
//                         (reportData.totals.sales?.taxableAmount || 0) +
//                         (reportData.totals.sales?.nonVatAmount || 0) +
//                         (reportData.totals.sales?.vatAmount || 0)
//                     ),
//                     '', // Spacer
//                     formatCurrency(reportData.totals.salesReturn?.taxableAmount || 0),
//                     formatCurrency(reportData.totals.salesReturn?.nonVatAmount || 0),
//                     formatCurrency(reportData.totals.salesReturn?.vatAmount || 0),
//                     formatCurrency(
//                         (reportData.totals.salesReturn?.taxableAmount || 0) +
//                         (reportData.totals.salesReturn?.nonVatAmount || 0) +
//                         (reportData.totals.salesReturn?.vatAmount || 0)
//                     ),
//                     '', // Spacer
//                     formatCurrency(
//                         (reportData.totals.sales?.taxableAmount || 0) -
//                         (reportData.totals.salesReturn?.taxableAmount || 0)
//                     ),
//                     formatCurrency(
//                         (reportData.totals.sales?.nonVatAmount || 0) -
//                         (reportData.totals.salesReturn?.nonVatAmount || 0)
//                     ),
//                     formatCurrency(
//                         ((reportData.totals.sales?.taxableAmount || 0) +
//                             (reportData.totals.sales?.nonVatAmount || 0) +
//                             (reportData.totals.sales?.vatAmount || 0)) -
//                         ((reportData.totals.salesReturn?.taxableAmount || 0) +
//                             (reportData.totals.salesReturn?.nonVatAmount || 0) +
//                             (reportData.totals.salesReturn?.vatAmount || 0))
//                     ),
//                     '', // Spacer
//                     formatCurrency(reportData.totals.netPurchaseVat || 0),
//                     formatCurrency(reportData.totals.netSalesVat || 0),
//                     formatCurrency(reportData.totals.netVat || 0)
//                 ];
//                 excelData.push(rowData);
//             }

//             // Create worksheet using array format
//             const ws = XLSX.utils.aoa_to_sheet(excelData);
//             const wb = XLSX.utils.book_new();
//             XLSX.utils.book_append_sheet(wb, ws, 'Monthly VAT Summary');

//             // Set column widths for better formatting
//             const colWidths = [
//                 { wch: 20 }, // Date Range
//                 { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, // Purchase columns
//                 { wch: 5 },  // Spacer
//                 { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, // Purchase Return columns
//                 { wch: 5 },  // Spacer
//                 { wch: 15 }, { wch: 15 }, { wch: 15 }, // Net Purchase columns
//                 { wch: 5 },  // Spacer
//                 { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, // Sales columns
//                 { wch: 5 },  // Spacer
//                 { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, // Sales Return columns
//                 { wch: 5 },  // Spacer
//                 { wch: 15 }, { wch: 15 }, { wch: 15 }, // Net Sales columns
//                 { wch: 5 },  // Spacer
//                 { wch: 15 }, { wch: 15 }, { wch: 15 }  // VAT columns
//             ];
//             ws['!cols'] = colWidths;

//             // Generate filename
//             const fileName = `Monthly_VAT_Summary_${reportData.reportDateRange || currentDate}.xlsx`;

//             // Export to Excel
//             XLSX.writeFile(wb, fileName);

//             setNotification({
//                 show: true,
//                 message: 'Excel file exported successfully!',
//                 type: 'success'
//             });

//         } catch (err) {
//             console.error('Error exporting to Excel:', err);
//             setNotification({
//                 show: true,
//                 message: 'Failed to export Excel file: ' + err.message,
//                 type: 'error'
//             });
//         } finally {
//             setExporting(false);
//         }
//     };

//     // Helper function to calculate yearly totals
//     const calculateYearlyTotals = () => {
//         if (!reportData.monthlyData || reportData.monthlyData.length === 0) return null;

//         const totals = {
//             purchaseTaxable: 0,
//             purchaseNonVat: 0,
//             purchaseVat: 0,
//             purchaseTotal: 0,
//             purchaseReturnTaxable: 0,
//             purchaseReturnNonVat: 0,
//             purchaseReturnVat: 0,
//             purchaseReturnTotal: 0,
//             netPurchaseTaxable: 0,
//             netPurchaseNonVat: 0,
//             netPurchaseTotal: 0,
//             salesTaxable: 0,
//             salesNonVat: 0,
//             salesVat: 0,
//             salesTotal: 0,
//             salesReturnTaxable: 0,
//             salesReturnNonVat: 0,
//             salesReturnVat: 0,
//             salesReturnTotal: 0,
//             netSalesTaxable: 0,
//             netSalesNonVat: 0,
//             netSalesTotal: 0,
//             netPurchaseVat: 0,
//             netSalesVat: 0,
//             netVat: 0
//         };

//         reportData.monthlyData.forEach(monthData => {
//             totals.purchaseTaxable += monthData.totals.purchase?.taxableAmount || 0;
//             totals.purchaseNonVat += monthData.totals.purchase?.nonVatAmount || 0;
//             totals.purchaseVat += monthData.totals.purchase?.vatAmount || 0;
//             totals.purchaseTotal += (monthData.totals.purchase?.taxableAmount || 0) +
//                 (monthData.totals.purchase?.nonVatAmount || 0) +
//                 (monthData.totals.purchase?.vatAmount || 0);

//             totals.purchaseReturnTaxable += monthData.totals.purchaseReturn?.taxableAmount || 0;
//             totals.purchaseReturnNonVat += monthData.totals.purchaseReturn?.nonVatAmount || 0;
//             totals.purchaseReturnVat += monthData.totals.purchaseReturn?.vatAmount || 0;
//             totals.purchaseReturnTotal += (monthData.totals.purchaseReturn?.taxableAmount || 0) +
//                 (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
//                 (monthData.totals.purchaseReturn?.vatAmount || 0);

//             totals.netPurchaseTaxable += (monthData.totals.purchase?.taxableAmount || 0) -
//                 (monthData.totals.purchaseReturn?.taxableAmount || 0);
//             totals.netPurchaseNonVat += (monthData.totals.purchase?.nonVatAmount || 0) -
//                 (monthData.totals.purchaseReturn?.nonVatAmount || 0);
//             totals.netPurchaseTotal += ((monthData.totals.purchase?.taxableAmount || 0) +
//                 (monthData.totals.purchase?.nonVatAmount || 0) +
//                 (monthData.totals.purchase?.vatAmount || 0)) -
//                 ((monthData.totals.purchaseReturn?.taxableAmount || 0) +
//                     (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
//                     (monthData.totals.purchaseReturn?.vatAmount || 0));

//             totals.salesTaxable += monthData.totals.sales?.taxableAmount || 0;
//             totals.salesNonVat += monthData.totals.sales?.nonVatAmount || 0;
//             totals.salesVat += monthData.totals.sales?.vatAmount || 0;
//             totals.salesTotal += (monthData.totals.sales?.taxableAmount || 0) +
//                 (monthData.totals.sales?.nonVatAmount || 0) +
//                 (monthData.totals.sales?.vatAmount || 0);

//             totals.salesReturnTaxable += monthData.totals.salesReturn?.taxableAmount || 0;
//             totals.salesReturnNonVat += monthData.totals.salesReturn?.nonVatAmount || 0;
//             totals.salesReturnVat += monthData.totals.salesReturn?.vatAmount || 0;
//             totals.salesReturnTotal += (monthData.totals.salesReturn?.taxableAmount || 0) +
//                 (monthData.totals.salesReturn?.nonVatAmount || 0) +
//                 (monthData.totals.salesReturn?.vatAmount || 0);

//             totals.netSalesTaxable += (monthData.totals.sales?.taxableAmount || 0) -
//                 (monthData.totals.salesReturn?.taxableAmount || 0);
//             totals.netSalesNonVat += (monthData.totals.sales?.nonVatAmount || 0) -
//                 (monthData.totals.salesReturn?.nonVatAmount || 0);
//             totals.netSalesTotal += ((monthData.totals.sales?.taxableAmount || 0) +
//                 (monthData.totals.sales?.nonVatAmount || 0) +
//                 (monthData.totals.sales?.vatAmount || 0)) -
//                 ((monthData.totals.salesReturn?.taxableAmount || 0) +
//                     (monthData.totals.salesReturn?.nonVatAmount || 0) +
//                     (monthData.totals.salesReturn?.vatAmount || 0));

//             totals.netPurchaseVat += monthData.totals.netPurchaseVat || 0;
//             totals.netSalesVat += monthData.totals.netSalesVat || 0;
//             totals.netVat += monthData.totals.netVat || 0;
//         });

//         return totals;
//     };

//     if (loading) return <Loader />;

//     const handleKeyDown = (e, nextFieldId) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (nextFieldId) {
//                 document.getElementById(nextFieldId)?.focus();
//             }
//         }
//     };

//     const renderMonthlyTable = () => {
//         if (!reportData.monthlyData || reportData.monthlyData.length === 0) {
//             return null;
//         }

//         const displayTotals = calculateDisplayTotals();

//         return (
//             <div className="table-container mt-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
//                 <table className="table table-bordered table-hover" id="vatReportTable">
//                     <thead>
//                         <tr>
//                             <th rowSpan="2" className="text-center align-middle bg-primary text-white">Date Range</th>
//                             <th colSpan="4" className="text-center bg-primary text-white">Purchase</th>
//                             <th className="bg-light" style={{ width: '10px' }}></th>
//                             <th colSpan="4" className="text-center bg-primary text-white">Purchase Return</th>
//                             <th className="bg-light" style={{ width: '10px' }}></th>
//                             <th colSpan="3" className="text-center bg-primary text-white">Net Purchase</th>
//                             <th className="bg-light" style={{ width: '10px' }}></th>
//                             <th colSpan="4" className="text-center bg-primary text-white">Sales</th>
//                             <th className="bg-light" style={{ width: '10px' }}></th>
//                             <th colSpan="4" className="text-center bg-primary text-white">Sales Return</th>
//                             <th className="bg-light" style={{ width: '10px' }}></th>
//                             <th colSpan="3" className="text-center bg-primary text-white">Net Sales</th>
//                             <th className="bg-light" style={{ width: '10px' }}></th>
//                             <th colSpan="3" className="text-center bg-primary text-white">Net VAT</th>
//                         </tr>
//                         <tr>
//                             <th>Taxable</th>
//                             <th>Non-VAT</th>
//                             <th>VAT</th>
//                             <th>Total</th>
//                             <th className="bg-light"></th>
//                             <th>Taxable</th>
//                             <th>Non-VAT</th>
//                             <th>VAT</th>
//                             <th>Total</th>
//                             <th className="bg-light"></th>
//                             <th>Taxable</th>
//                             <th>Non-VAT</th>
//                             <th>Total</th>
//                             <th className="bg-light"></th>
//                             <th>Taxable</th>
//                             <th>Non-VAT</th>
//                             <th>VAT</th>
//                             <th>Total</th>
//                             <th className="bg-light"></th>
//                             <th>Taxable</th>
//                             <th>Non-VAT</th>
//                             <th>VAT</th>
//                             <th>Total</th>
//                             <th className="bg-light"></th>
//                             <th>Taxable</th>
//                             <th>Non-VAT</th>
//                             <th>Total</th>
//                             <th className="bg-light"></th>
//                             <th>Purc VAT</th>
//                             <th>Sales VAT</th>
//                             <th>Net Payable</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {reportData.monthlyData.map((monthData, index) => (
//                             <tr key={index}>
//                                 <td className="align-middle"><strong>{monthData.reportDateRange}</strong></td>
//                                 <td>{formatCurrency(monthData.totals.purchase?.taxableAmount)}</td>
//                                 <td>{formatCurrency(monthData.totals.purchase?.nonVatAmount)}</td>
//                                 <td>{formatCurrency(monthData.totals.purchase?.vatAmount)}</td>
//                                 <td className="fw-bold">
//                                     {formatCurrency(
//                                         (monthData.totals.purchase?.taxableAmount || 0) +
//                                         (monthData.totals.purchase?.nonVatAmount || 0) +
//                                         (monthData.totals.purchase?.vatAmount || 0)
//                                     )}
//                                 </td>
//                                 <td className="bg-light"></td>
//                                 <td>{formatCurrency(monthData.totals.purchaseReturn?.taxableAmount)}</td>
//                                 <td>{formatCurrency(monthData.totals.purchaseReturn?.nonVatAmount)}</td>
//                                 <td>{formatCurrency(monthData.totals.purchaseReturn?.vatAmount)}</td>
//                                 <td className="fw-bold">
//                                     {formatCurrency(
//                                         (monthData.totals.purchaseReturn?.taxableAmount || 0) +
//                                         (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
//                                         (monthData.totals.purchaseReturn?.vatAmount || 0)
//                                     )}
//                                 </td>
//                                 <td className="bg-light"></td>
//                                 <td className={getNetValueClass(
//                                     (monthData.totals.purchase?.taxableAmount || 0) -
//                                     (monthData.totals.purchaseReturn?.taxableAmount || 0)
//                                 )}>
//                                     {formatCurrency(
//                                         (monthData.totals.purchase?.taxableAmount || 0) -
//                                         (monthData.totals.purchaseReturn?.taxableAmount || 0)
//                                     )}
//                                 </td>
//                                 <td className={getNetValueClass(
//                                     (monthData.totals.purchase?.nonVatAmount || 0) -
//                                     (monthData.totals.purchaseReturn?.nonVatAmount || 0)
//                                 )}>
//                                     {formatCurrency(
//                                         (monthData.totals.purchase?.nonVatAmount || 0) -
//                                         (monthData.totals.purchaseReturn?.nonVatAmount || 0)
//                                     )}
//                                 </td>
//                                 <td className={`fw-bold ${getNetValueClass(
//                                     ((monthData.totals.purchase?.taxableAmount || 0) +
//                                         (monthData.totals.purchase?.nonVatAmount || 0) +
//                                         (monthData.totals.purchase?.vatAmount || 0)) -
//                                     ((monthData.totals.purchaseReturn?.taxableAmount || 0) +
//                                         (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
//                                         (monthData.totals.purchaseReturn?.vatAmount || 0))
//                                 )}`}>
//                                     {formatCurrency(
//                                         ((monthData.totals.purchase?.taxableAmount || 0) +
//                                             (monthData.totals.purchase?.nonVatAmount || 0) +
//                                             (monthData.totals.purchase?.vatAmount || 0)) -
//                                         ((monthData.totals.purchaseReturn?.taxableAmount || 0) +
//                                             (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
//                                             (monthData.totals.purchaseReturn?.vatAmount || 0))
//                                     )}
//                                 </td>
//                                 <td className="bg-light"></td>
//                                 <td>{formatCurrency(monthData.totals.sales?.taxableAmount)}</td>
//                                 <td>{formatCurrency(monthData.totals.sales?.nonVatAmount)}</td>
//                                 <td>{formatCurrency(monthData.totals.sales?.vatAmount)}</td>
//                                 <td className="fw-bold">
//                                     {formatCurrency(
//                                         (monthData.totals.sales?.taxableAmount || 0) +
//                                         (monthData.totals.sales?.nonVatAmount || 0) +
//                                         (monthData.totals.sales?.vatAmount || 0)
//                                     )}
//                                 </td>
//                                 <td className="bg-light"></td>
//                                 <td>{formatCurrency(monthData.totals.salesReturn?.taxableAmount)}</td>
//                                 <td>{formatCurrency(monthData.totals.salesReturn?.nonVatAmount)}</td>
//                                 <td>{formatCurrency(monthData.totals.salesReturn?.vatAmount)}</td>
//                                 <td className="fw-bold">
//                                     {formatCurrency(
//                                         (monthData.totals.salesReturn?.taxableAmount || 0) +
//                                         (monthData.totals.salesReturn?.nonVatAmount || 0) +
//                                         (monthData.totals.salesReturn?.vatAmount || 0)
//                                     )}
//                                 </td>
//                                 <td className="bg-light"></td>
//                                 <td className={getNetValueClass(
//                                     (monthData.totals.sales?.taxableAmount || 0) -
//                                     (monthData.totals.salesReturn?.taxableAmount || 0)
//                                 )}>
//                                     {formatCurrency(
//                                         (monthData.totals.sales?.taxableAmount || 0) -
//                                         (monthData.totals.salesReturn?.taxableAmount || 0)
//                                     )}
//                                 </td>
//                                 <td className={getNetValueClass(
//                                     (monthData.totals.sales?.nonVatAmount || 0) -
//                                     (monthData.totals.salesReturn?.nonVatAmount || 0)
//                                 )}>
//                                     {formatCurrency(
//                                         (monthData.totals.sales?.nonVatAmount || 0) -
//                                         (monthData.totals.salesReturn?.nonVatAmount || 0)
//                                     )}
//                                 </td>
//                                 <td className={`fw-bold ${getNetValueClass(
//                                     ((monthData.totals.sales?.taxableAmount || 0) +
//                                         (monthData.totals.sales?.nonVatAmount || 0) +
//                                         (monthData.totals.sales?.vatAmount || 0)) -
//                                     ((monthData.totals.salesReturn?.taxableAmount || 0) +
//                                         (monthData.totals.salesReturn?.nonVatAmount || 0) +
//                                         (monthData.totals.salesReturn?.vatAmount || 0))
//                                 )}`}>
//                                     {formatCurrency(
//                                         ((monthData.totals.sales?.taxableAmount || 0) +
//                                             (monthData.totals.sales?.nonVatAmount || 0) +
//                                             (monthData.totals.sales?.vatAmount || 0)) -
//                                         ((monthData.totals.salesReturn?.taxableAmount || 0) +
//                                             (monthData.totals.salesReturn?.nonVatAmount || 0) +
//                                             (monthData.totals.salesReturn?.vatAmount || 0))
//                                     )}
//                                 </td>
//                                 <td className="bg-light"></td>
//                                 <td>{formatCurrency(monthData.totals.netPurchaseVat)}</td>
//                                 <td>{formatCurrency(monthData.totals.netSalesVat)}</td>
//                                 <td className={`fw-bold ${monthData.totals.netVat >= 0 ? 'text-success' : 'text-danger'}`}>
//                                     {formatCurrency(monthData.totals.netVat)}
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                     {displayTotals && (
//                         <tfoot className="table-group-divider">
//                             <tr className="fw-bold table-secondary">
//                                 <td>TOTAL</td>
//                                 <td>{formatCurrency(displayTotals.purchaseTaxable)}</td>
//                                 <td>{formatCurrency(displayTotals.purchaseNonVat)}</td>
//                                 <td>{formatCurrency(displayTotals.purchaseVat)}</td>
//                                 <td>{formatCurrency(displayTotals.purchaseTotal)}</td>
//                                 <td className="bg-light"></td>
//                                 <td>{formatCurrency(displayTotals.purchaseReturnTaxable)}</td>
//                                 <td>{formatCurrency(displayTotals.purchaseReturnNonVat)}</td>
//                                 <td>{formatCurrency(displayTotals.purchaseReturnVat)}</td>
//                                 <td>{formatCurrency(displayTotals.purchaseReturnTotal)}</td>
//                                 <td className="bg-light"></td>
//                                 <td className={getNetValueClass(displayTotals.netPurchaseTaxable)}>
//                                     {formatCurrency(displayTotals.netPurchaseTaxable)}
//                                 </td>
//                                 <td className={getNetValueClass(displayTotals.netPurchaseNonVat)}>
//                                     {formatCurrency(displayTotals.netPurchaseNonVat)}
//                                 </td>
//                                 <td className={getNetValueClass(displayTotals.netPurchaseTotal)}>
//                                     {formatCurrency(displayTotals.netPurchaseTotal)}
//                                 </td>
//                                 <td className="bg-light"></td>
//                                 <td>{formatCurrency(displayTotals.salesTaxable)}</td>
//                                 <td>{formatCurrency(displayTotals.salesNonVat)}</td>
//                                 <td>{formatCurrency(displayTotals.salesVat)}</td>
//                                 <td>{formatCurrency(displayTotals.salesTotal)}</td>
//                                 <td className="bg-light"></td>
//                                 <td>{formatCurrency(displayTotals.salesReturnTaxable)}</td>
//                                 <td>{formatCurrency(displayTotals.salesReturnNonVat)}</td>
//                                 <td>{formatCurrency(displayTotals.salesReturnVat)}</td>
//                                 <td>{formatCurrency(displayTotals.salesReturnTotal)}</td>
//                                 <td className="bg-light"></td>
//                                 <td className={getNetValueClass(displayTotals.netSalesTaxable)}>
//                                     {formatCurrency(displayTotals.netSalesTaxable)}
//                                 </td>
//                                 <td className={getNetValueClass(displayTotals.netSalesNonVat)}>
//                                     {formatCurrency(displayTotals.netSalesNonVat)}
//                                 </td>
//                                 <td className={getNetValueClass(displayTotals.netSalesTotal)}>
//                                     {formatCurrency(displayTotals.netSalesTotal)}
//                                 </td>
//                                 <td className="bg-light"></td>
//                                 <td>{formatCurrency(displayTotals.netPurchaseVat)}</td>
//                                 <td>{formatCurrency(displayTotals.netSalesVat)}</td>
//                                 <td className={getNetValueClass(displayTotals.netVat)}>
//                                     {formatCurrency(displayTotals.netVat)}
//                                 </td>
//                             </tr>
//                         </tfoot>
//                     )}
//                 </table>
//             </div>
//         );
//     };

//     const renderSingleMonthTable = () => {
//         if (!reportData.totals) {
//             return null;
//         }

//         const displayTotals = calculateDisplayTotals();

//         return (
//             <div className="table-container mt-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
//                 <table className="table table-bordered table-hover" id="vatReportTable">
//                     <thead>
//                         <tr>
//                             <th rowSpan="2" className="text-center align-middle bg-primary text-white">Date Range</th>
//                             <th colSpan="4" className="text-center bg-primary text-white">Purchase</th>
//                             <th className="bg-light" style={{ width: '10px' }}></th>
//                             <th colSpan="4" className="text-center bg-primary text-white">Purchase Return</th>
//                             <th className="bg-light" style={{ width: '10px' }}></th>
//                             <th colSpan="3" className="text-center bg-primary text-white">Net Purchase</th>
//                             <th className="bg-light" style={{ width: '10px' }}></th>
//                             <th colSpan="4" className="text-center bg-primary text-white">Sales</th>
//                             <th className="bg-light" style={{ width: '10px' }}></th>
//                             <th colSpan="4" className="text-center bg-primary text-white">Sales Return</th>
//                             <th className="bg-light" style={{ width: '10px' }}></th>
//                             <th colSpan="3" className="text-center bg-primary text-white">Net Sales</th>
//                             <th className="bg-light" style={{ width: '10px' }}></th>
//                             <th colSpan="3" className="text-center bg-primary text-white">Net VAT</th>
//                         </tr>
//                         <tr>
//                             <th>Taxable</th>
//                             <th>Non-VAT</th>
//                             <th>VAT</th>
//                             <th>Total</th>
//                             <th className="bg-light"></th>
//                             <th>Taxable</th>
//                             <th>Non-VAT</th>
//                             <th>VAT</th>
//                             <th>Total</th>
//                             <th className="bg-light"></th>
//                             <th>Taxable</th>
//                             <th>Non-VAT</th>
//                             <th>Total</th>
//                             <th className="bg-light"></th>
//                             <th>Taxable</th>
//                             <th>Non-VAT</th>
//                             <th>VAT</th>
//                             <th>Total</th>
//                             <th className="bg-light"></th>
//                             <th>Taxable</th>
//                             <th>Non-VAT</th>
//                             <th>VAT</th>
//                             <th>Total</th>
//                             <th className="bg-light"></th>
//                             <th>Taxable</th>
//                             <th>Non-VAT</th>
//                             <th>Total</th>
//                             <th className="bg-light"></th>
//                             <th>Purc VAT</th>
//                             <th>Sales VAT</th>
//                             <th>Net Payable</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         <tr>
//                             <td className="align-middle"><strong>{reportData.reportDateRange}</strong></td>
//                             <td>{formatCurrency(reportData.totals.purchase?.taxableAmount)}</td>
//                             <td>{formatCurrency(reportData.totals.purchase?.nonVatAmount)}</td>
//                             <td>{formatCurrency(reportData.totals.purchase?.vatAmount)}</td>
//                             <td className="fw-bold">
//                                 {formatCurrency(
//                                     (reportData.totals.purchase?.taxableAmount || 0) +
//                                     (reportData.totals.purchase?.nonVatAmount || 0) +
//                                     (reportData.totals.purchase?.vatAmount || 0)
//                                 )}
//                             </td>
//                             <td className="bg-light"></td>
//                             <td>{formatCurrency(reportData.totals.purchaseReturn?.taxableAmount)}</td>
//                             <td>{formatCurrency(reportData.totals.purchaseReturn?.nonVatAmount)}</td>
//                             <td>{formatCurrency(reportData.totals.purchaseReturn?.vatAmount)}</td>
//                             <td className="fw-bold">
//                                 {formatCurrency(
//                                     (reportData.totals.purchaseReturn?.taxableAmount || 0) +
//                                     (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
//                                     (reportData.totals.purchaseReturn?.vatAmount || 0)
//                                 )}
//                             </td>
//                             <td className="bg-light"></td>
//                             <td className={getNetValueClass(
//                                 (reportData.totals.purchase?.taxableAmount || 0) -
//                                 (reportData.totals.purchaseReturn?.taxableAmount || 0)
//                             )}>
//                                 {formatCurrency(
//                                     (reportData.totals.purchase?.taxableAmount || 0) -
//                                     (reportData.totals.purchaseReturn?.taxableAmount || 0)
//                                 )}
//                             </td>
//                             <td className={getNetValueClass(
//                                 (reportData.totals.purchase?.nonVatAmount || 0) -
//                                 (reportData.totals.purchaseReturn?.nonVatAmount || 0)
//                             )}>
//                                 {formatCurrency(
//                                     (reportData.totals.purchase?.nonVatAmount || 0) -
//                                     (reportData.totals.purchaseReturn?.nonVatAmount || 0)
//                                 )}
//                             </td>
//                             <td className={`fw-bold ${getNetValueClass(
//                                 ((reportData.totals.purchase?.taxableAmount || 0) +
//                                     (reportData.totals.purchase?.nonVatAmount || 0) +
//                                     (reportData.totals.purchase?.vatAmount || 0)) -
//                                 ((reportData.totals.purchaseReturn?.taxableAmount || 0) +
//                                     (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
//                                     (reportData.totals.purchaseReturn?.vatAmount || 0))
//                             )}`}>
//                                 {formatCurrency(
//                                     ((reportData.totals.purchase?.taxableAmount || 0) +
//                                         (reportData.totals.purchase?.nonVatAmount || 0) +
//                                         (reportData.totals.purchase?.vatAmount || 0)) -
//                                     ((reportData.totals.purchaseReturn?.taxableAmount || 0) +
//                                         (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
//                                         (reportData.totals.purchaseReturn?.vatAmount || 0))
//                                 )}
//                             </td>
//                             <td className="bg-light"></td>
//                             <td>{formatCurrency(reportData.totals.sales?.taxableAmount)}</td>
//                             <td>{formatCurrency(reportData.totals.sales?.nonVatAmount)}</td>
//                             <td>{formatCurrency(reportData.totals.sales?.vatAmount)}</td>
//                             <td className="fw-bold">
//                                 {formatCurrency(
//                                     (reportData.totals.sales?.taxableAmount || 0) +
//                                     (reportData.totals.sales?.nonVatAmount || 0) +
//                                     (reportData.totals.sales?.vatAmount || 0)
//                                 )}
//                             </td>
//                             <td className="bg-light"></td>
//                             <td>{formatCurrency(reportData.totals.salesReturn?.taxableAmount)}</td>
//                             <td>{formatCurrency(reportData.totals.salesReturn?.nonVatAmount)}</td>
//                             <td>{formatCurrency(reportData.totals.salesReturn?.vatAmount)}</td>
//                             <td className="fw-bold">
//                                 {formatCurrency(
//                                     (reportData.totals.salesReturn?.taxableAmount || 0) +
//                                     (reportData.totals.salesReturn?.nonVatAmount || 0) +
//                                     (reportData.totals.salesReturn?.vatAmount || 0)
//                                 )}
//                             </td>
//                             <td className="bg-light"></td>
//                             <td className={getNetValueClass(
//                                 (reportData.totals.sales?.taxableAmount || 0) -
//                                 (reportData.totals.salesReturn?.taxableAmount || 0)
//                             )}>
//                                 {formatCurrency(
//                                     (reportData.totals.sales?.taxableAmount || 0) -
//                                     (reportData.totals.salesReturn?.taxableAmount || 0)
//                                 )}
//                             </td>
//                             <td className={getNetValueClass(
//                                 (reportData.totals.sales?.nonVatAmount || 0) -
//                                 (reportData.totals.salesReturn?.nonVatAmount || 0)
//                             )}>
//                                 {formatCurrency(
//                                     (reportData.totals.sales?.nonVatAmount || 0) -
//                                     (reportData.totals.salesReturn?.nonVatAmount || 0)
//                                 )}
//                             </td>
//                             <td className={`fw-bold ${getNetValueClass(
//                                 ((reportData.totals.sales?.taxableAmount || 0) +
//                                     (reportData.totals.sales?.nonVatAmount || 0) +
//                                     (reportData.totals.sales?.vatAmount || 0)) -
//                                 ((reportData.totals.salesReturn?.taxableAmount || 0) +
//                                     (reportData.totals.salesReturn?.nonVatAmount || 0) +
//                                     (reportData.totals.salesReturn?.vatAmount || 0))
//                             )}`}>
//                                 {formatCurrency(
//                                     ((reportData.totals.sales?.taxableAmount || 0) +
//                                         (reportData.totals.sales?.nonVatAmount || 0) +
//                                         (reportData.totals.sales?.vatAmount || 0)) -
//                                     ((reportData.totals.salesReturn?.taxableAmount || 0) +
//                                         (reportData.totals.salesReturn?.nonVatAmount || 0) +
//                                         (reportData.totals.salesReturn?.vatAmount || 0))
//                                 )}
//                             </td>
//                             <td className="bg-light"></td>
//                             <td>{formatCurrency(reportData.totals.netPurchaseVat)}</td>
//                             <td>{formatCurrency(reportData.totals.netSalesVat)}</td>
//                             <td className={`fw-bold ${reportData.totals.netVat >= 0 ? 'text-success' : 'text-danger'}`}>
//                                 {formatCurrency(reportData.totals.netVat)}
//                             </td>
//                         </tr>
//                     </tbody>
//                     {displayTotals && (
//                         <tfoot className="table-group-divider">
//                             <tr className="fw-bold table-secondary">
//                                 <td>TOTAL</td>
//                                 <td>{formatCurrency(displayTotals.purchaseTaxable)}</td>
//                                 <td>{formatCurrency(displayTotals.purchaseNonVat)}</td>
//                                 <td>{formatCurrency(displayTotals.purchaseVat)}</td>
//                                 <td>{formatCurrency(displayTotals.purchaseTotal)}</td>
//                                 <td className="bg-light"></td>
//                                 <td>{formatCurrency(displayTotals.purchaseReturnTaxable)}</td>
//                                 <td>{formatCurrency(displayTotals.purchaseReturnNonVat)}</td>
//                                 <td>{formatCurrency(displayTotals.purchaseReturnVat)}</td>
//                                 <td>{formatCurrency(displayTotals.purchaseReturnTotal)}</td>
//                                 <td className="bg-light"></td>
//                                 <td className={getNetValueClass(displayTotals.netPurchaseTaxable)}>
//                                     {formatCurrency(displayTotals.netPurchaseTaxable)}
//                                 </td>
//                                 <td className={getNetValueClass(displayTotals.netPurchaseNonVat)}>
//                                     {formatCurrency(displayTotals.netPurchaseNonVat)}
//                                 </td>
//                                 <td className={getNetValueClass(displayTotals.netPurchaseTotal)}>
//                                     {formatCurrency(displayTotals.netPurchaseTotal)}
//                                 </td>
//                                 <td className="bg-light"></td>
//                                 <td>{formatCurrency(displayTotals.salesTaxable)}</td>
//                                 <td>{formatCurrency(displayTotals.salesNonVat)}</td>
//                                 <td>{formatCurrency(displayTotals.salesVat)}</td>
//                                 <td>{formatCurrency(displayTotals.salesTotal)}</td>
//                                 <td className="bg-light"></td>
//                                 <td>{formatCurrency(displayTotals.salesReturnTaxable)}</td>
//                                 <td>{formatCurrency(displayTotals.salesReturnNonVat)}</td>
//                                 <td>{formatCurrency(displayTotals.salesReturnVat)}</td>
//                                 <td>{formatCurrency(displayTotals.salesReturnTotal)}</td>
//                                 <td className="bg-light"></td>
//                                 <td className={getNetValueClass(displayTotals.netSalesTaxable)}>
//                                     {formatCurrency(displayTotals.netSalesTaxable)}
//                                 </td>
//                                 <td className={getNetValueClass(displayTotals.netSalesNonVat)}>
//                                     {formatCurrency(displayTotals.netSalesNonVat)}
//                                 </td>
//                                 <td className={getNetValueClass(displayTotals.netSalesTotal)}>
//                                     {formatCurrency(displayTotals.netSalesTotal)}
//                                 </td>
//                                 <td className="bg-light"></td>
//                                 <td>{formatCurrency(displayTotals.netPurchaseVat)}</td>
//                                 <td>{formatCurrency(displayTotals.netSalesVat)}</td>
//                                 <td className={getNetValueClass(displayTotals.netVat)}>
//                                     {formatCurrency(displayTotals.netVat)}
//                                 </td>
//                             </tr>
//                         </tfoot>
//                     )}
//                 </table>
//             </div>
//         );
//     };
//     return (
//         <div className="container-fluid mt-4">
//             <Header />
//             <div className="card mt-4 p-4">
//                 <div className="report-header bg-light p-4 rounded-3 shadow-sm mb-4">
//                     <h2 className="text-center mb-4 text-decoration-underline">Monthly VAT Summary</h2>
//                     <form onSubmit={handleGenerateReport}>
//                         <div className="row g-3">
//                             <div className="col-md-2">
//                                 <label htmlFor="periodType" className="form-label fw-semibold">Period Type</label>
//                                 <select
//                                     name="periodType"
//                                     id="periodType"
//                                     className="form-select"
//                                     value={formValues.periodType || 'monthly'}
//                                     onChange={handlePeriodTypeChange}
//                                 >
//                                     <option value="monthly">Monthly</option>
//                                     <option value="yearly">All Months (Yearly)</option>
//                                 </select>
//                             </div>

//                             {formValues.periodType === 'monthly' ? (
//                                 formValues.companyDateFormat === 'english' ? (
//                                     <>
//                                         <div className="col-md-2">
//                                             <label htmlFor="month" className="form-label fw-semibold">Month</label>
//                                             <select
//                                                 name="month"
//                                                 id="month"
//                                                 className="form-select"
//                                                 value={formValues.month || ''}
//                                                 onChange={handleDateChange}
//                                             >
//                                                 <option value="">Select Month</option>
//                                                 {["January", "February", "March", "April", "May", "June",
//                                                     "July", "August", "September", "October", "November", "December"]
//                                                     .map((monthName, index) => (
//                                                         <option key={monthName} value={index + 1}>
//                                                             {monthName}
//                                                         </option>
//                                                     ))}
//                                             </select>
//                                         </div>
//                                         <div className="col-md-2">
//                                             <label htmlFor="year" className="form-label fw-semibold">Year</label>
//                                             <input
//                                                 type="number"
//                                                 name="year"
//                                                 id="year"
//                                                 className="form-control"
//                                                 value={formValues.year || ''}
//                                                 onKeyDown={handleKeyDown}
//                                                 onChange={handleDateChange}
//                                                 placeholder={`e.g. ${new Date().getFullYear()}`}
//                                                 autoComplete='off'
//                                             />
//                                         </div>
//                                     </>
//                                 ) : (
//                                     <>
//                                         <div className="col-md-2">
//                                             <label htmlFor="nepaliMonth" className="form-label fw-semibold">Month (Nepali)</label>
//                                             <select
//                                                 name="nepaliMonth"
//                                                 id="nepaliMonth"
//                                                 className="form-select"
//                                                 value={formValues.nepaliMonth || ''}
//                                                 onChange={handleDateChange}
//                                                 autoFocus
//                                                 onKeyDown={(e) => handleKeyDown(e, 'nepaliYear')}
//                                             >
//                                                 <option value="">Select Month</option>
//                                                 {["Baisakh", "Jestha", "Ashad", "Shrawan", "Bhadra", "Ashoj",
//                                                     "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"]
//                                                     .map((monthName, index) => (
//                                                         <option key={monthName} value={index + 1}>
//                                                             {monthName}
//                                                         </option>
//                                                     ))}
//                                             </select>
//                                         </div>
//                                         <div className="col-md-2">
//                                             <label htmlFor="nepaliYear" className="form-label fw-semibold">Year (Nepali)</label>
//                                             <input
//                                                 type="text"
//                                                 name="nepaliYear"
//                                                 id="nepaliYear"
//                                                 className="form-control"
//                                                 value={formValues.nepaliYear || ''}
//                                                 onChange={handleDateChange}
//                                                 placeholder={`e.g. ${reportData.currentNepaliYear}`}
//                                                 autoComplete='off'
//                                                 onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
//                                             />
//                                         </div>
//                                     </>
//                                 )
//                             ) : (
//                                 formValues.companyDateFormat === 'english' ? (
//                                     <div className="col-md-2">
//                                         <label htmlFor="year" className="form-label fw-semibold">Year</label>
//                                         <input
//                                             type="number"
//                                             name="year"
//                                             id="year"
//                                             className="form-control"
//                                             value={formValues.year || ''}
//                                             onChange={handleDateChange}
//                                             placeholder={`e.g. ${new Date().getFullYear()}`}
//                                             autoComplete='off'
//                                         />
//                                     </div>
//                                 ) : (
//                                     <div className="col-md-2">
//                                         <label htmlFor="nepaliYear" className="form-label fw-semibold">Fiscal Year (Nepali)</label>
//                                         <input
//                                             type="text"
//                                             name="nepaliYear"
//                                             id="nepaliYear"
//                                             className="form-control"
//                                             value={formValues.nepaliYear || ''}
//                                             onChange={handleDateChange}
//                                             placeholder={`e.g. ${getCurrentNepaliFiscalYear()}`}
//                                             autoComplete='off'
//                                         />
//                                     </div>
//                                 )
//                             )}

//                             <div className="col-md-2 d-flex align-items-end">
//                                 <button type="submit" className="btn btn-primary w-100"
//                                     id="generateReport"
//                                 >
//                                     <i className="fas fa-search me-2"></i> Generate Report
//                                 </button>
//                             </div>
//                             <div className="col-md-2 d-flex align-items-end">
//                                 <button
//                                     type="button"
//                                     id="exportExcel"
//                                     className="btn btn-success w-100"
//                                     onClick={handleExportExcel}
//                                     disabled={(!reportData.totals && (!reportData.monthlyData || reportData.monthlyData.length === 0)) || exporting}
//                                 >
//                                     {exporting ? (
//                                         <>
//                                             <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
//                                             Exporting...
//                                         </>
//                                     ) : (
//                                         <>
//                                             <i className="fas fa-file-excel me-2"></i> Export to Excel
//                                         </>
//                                     )}
//                                 </button>
//                             </div>
//                         </div>
//                     </form>
//                 </div>

//                 {reportData.totals ? (
//                     renderSingleMonthTable()
//                 ) : reportData.monthlyData && reportData.monthlyData.length > 0 ? (
//                     renderMonthlyTable()
//                 ) : (
//                     <div className="alert alert-info text-center py-4">
//                         <i className="fas fa-info-circle me-2"></i>
//                         Select period type and date to generate the VAT report
//                     </div>
//                 )}
//             </div>
//             <NotificationToast
//                 show={notification.show}
//                 message={notification.message}
//                 type={notification.type}
//                 onClose={() => setNotification({ ...notification, show: false })}
//             />
//         </div>
//     );
// };

// export default MonthlyVatSummary;


//---------------------------------------------------------------------------------------

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Header from '../Header';
import NepaliDate from 'nepali-date';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import NotificationToast from '../../NotificationToast';
import Loader from '../../Loader';
import * as XLSX from 'xlsx';

const MonthlyVatSummary = () => {
    const { draftSave, setDraftSave } = usePageNotRefreshContext();
    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });
    const navigate = useNavigate();
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [formValues, setFormValues] = useState(draftSave?.formValues || {
        companyDateFormat: 'nepali',
        month: null,
        year: null,
        nepaliMonth: null,
        nepaliYear: null,
        periodType: 'monthly' // 'monthly' or 'yearly'
    });

    const [reportData, setReportData] = useState(draftSave?.reportData || {
        company: null,
        currentFiscalYear: null,
        totals: null,
        monthlyData: [], // Array for all months data when "All" is selected
        currentNepaliYear: new NepaliDate().getYear(),
        reportDateRange: '',
        currentCompanyName: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [exporting, setExporting] = useState(false);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    // Save draft data
    useEffect(() => {
        if (reportData.totals || formValues.month || formValues.year || formValues.nepaliMonth || formValues.nepaliYear) {
            setDraftSave({
                ...draftSave,
                monthlyVatReportData: {
                    ...formValues,
                    ...reportData
                }
            });
        }
    }, [formValues, reportData]);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setFormValues(prev => ({
            ...prev,
            [name]: value === '' ? null : value
        }));
    };

    const handlePeriodTypeChange = (e) => {
        const periodType = e.target.value;
        setFormValues(prev => ({
            ...prev,
            periodType,
            month: null,
            year: null,
            nepaliMonth: null,
            nepaliYear: null
        }));
        setReportData(prev => ({
            ...prev,
            totals: null,
            monthlyData: []
        }));
    };

    const handleGenerateReport = async (e) => {
        e.preventDefault();

        // Validation
        if (formValues.periodType === 'monthly') {
            if (formValues.companyDateFormat === 'nepali') {
                if (!formValues.nepaliMonth || !formValues.nepaliYear) {
                    setNotification({
                        show: true,
                        message: `Please select both Nepali month and year`,
                        type: 'error'
                    });
                    return;
                }
            } else {
                if (!formValues.month || !formValues.year) {
                    setNotification({
                        show: true,
                        message: `Please select both month and year`,
                        type: 'error'
                    });
                    return;
                }
            }
        } else { // yearly
            if (formValues.companyDateFormat === 'nepali') {
                if (!formValues.nepaliYear) {
                    setNotification({
                        show: true,
                        message: `Please select Nepali year`,
                        type: 'error'
                    });
                    return;
                }
            } else {
                if (!formValues.year) {
                    setNotification({
                        show: true,
                        message: `Please select year`,
                        type: 'error'
                    });
                    return;
                }
            }
        }

        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            params.append('periodType', formValues.periodType);

            if (formValues.periodType === 'monthly') {
                if (formValues.companyDateFormat === 'english') {
                    params.append('month', formValues.month);
                    params.append('year', formValues.year);
                } else {
                    params.append('nepaliMonth', formValues.nepaliMonth);
                    params.append('nepaliYear', formValues.nepaliYear);
                }
            } else { // yearly
                if (formValues.companyDateFormat === 'english') {
                    params.append('year', formValues.year);
                } else {
                    params.append('nepaliYear', formValues.nepaliYear);
                }
            }

            const response = await api.get('/api/retailer/monthly-vat-summary', { params });
            setReportData(prev => ({
                ...prev,
                ...response.data.data,
                currentCompanyName: response.data.data.currentCompanyName || ''
            }));
        } catch (err) {
            setNotification({
                show: true,
                message: err.response?.data?.error || 'Failed to fetch monthly VAT report',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (num) => {
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
    };

    const getNetValueClass = (value) => {
        return value >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold';
    };

    // Get current Nepali fiscal year for placeholder
    const getCurrentNepaliFiscalYear = () => {
        const currentNepaliDate = new NepaliDate();
        const currentYear = currentNepaliDate.getYear();
        const currentMonth = currentNepaliDate.getMonth() + 1; // 1-12

        if (currentMonth >= 4) {
            return `${currentYear}/${currentYear + 1}`;
        } else {
            return `${currentYear - 1}/${currentYear}`;
        }
    };

    const handlePrint = () => {
        const hasData = reportData.totals ||
            (reportData.monthlyData && reportData.monthlyData.length > 0);

        if (!hasData) {
            setNotification({
                show: true,
                message: 'No data to print. Please generate a report first.',
                type: 'error'
            });
            return;
        }

        const printWindow = window.open("", "_blank");
        const currentDate = new Date().toISOString().split('T')[0];
        // Add company header information
        const printHeader = `
    <div class="print-header">
        <h2 style="margin: 0; font-size: 16px;">${reportData.currentCompanyName || 'Company Name'}</h2>
    </div>
    `;

        let tableContent = `
    <style>
        @page {
            size: A4 landscape;
            margin: 5mm;
        }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 7px; 
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
        }
        .container {
            width: 100%;
            padding: 5mm;
            transform: scale(0.95);
            transform-origin: top left;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            page-break-inside: auto;
            font-size: 7px;
            table-layout: fixed;
        }
        tr { 
            page-break-inside: avoid; 
            page-break-after: auto; 
            height: 20px;
        }
        th, td { 
            border: 1px solid #000; 
            padding: 3px 1px; 
            text-align: center; 
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.1;
            vertical-align: middle;
        }
        th { 
            background-color: #f8f9fa !important; 
            font-weight: bold;
            color: #000;
            padding: 4px 1px;
        }
        .print-header { 
            text-align: center; 
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #000;
        }
        .report-title {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin: 6px 0;
            text-decoration: underline;
        }
        .report-info {
            text-align: center;
            font-size: 9px;
            margin: 4px 0 10px 0;
            font-weight: bold;
        }
        .nowrap {
            white-space: nowrap;
        }
        .text-success { color: #198754 !important; }
        .text-danger { color: #dc3545 !important; }
        .fw-bold { font-weight: bold !important; }
        .text-center { text-align: center !important; }
        .table-secondary { background-color: #e9ecef !important; }
        .bg-light { background-color: #f8f9fa !important; }
        .bg-primary { background-color: #007bff !important; color: white !important; }
        
        /* Optimized column widths to fit all columns */
        .col-date { width: 100px; }
        .col-number { width: 65px; }
        .col-total { width: 70px; }
        .col-spacer { width: 5px; }
        .col-vat { width: 65px; }
        
        /* Compact amount styling */
        .amount-cell {
            font-family: 'Courier New', monospace;
            font-size: 7px;
            letter-spacing: -0.3px;
        }
        
        /* Compact header styling */
        .header-cell {
            font-size: 6.5px;
            line-height: 1.0;
            padding: 3px 1px;
        }
        
        /* Two-line headers for better fit */
        .two-line {
            line-height: 1.0;
        }
        .two-line br {
            display: block;
            content: "";
            margin: 1px 0;
        }
    </style>
    
    <div class="container">
        ${printHeader}
        <div class="report-title">Monthly VAT Summary</div>
        <div class="report-info">
            <strong>Report Date Range:</strong> ${reportData.reportDateRange || 'N/A'} | 
            <strong>Print Date:</strong> ${currentDate}
        </div>
        <table>
            <colgroup>
                <col class="col-date">
                <!-- Purchase columns (4) -->
                <col class="col-number"><col class="col-number"><col class="col-number"><col class="col-total">
                <col class="col-spacer">
                <!-- Purchase Return columns (4) -->
                <col class="col-number"><col class="col-number"><col class="col-number"><col class="col-total">
                <col class="col-spacer">
                <!-- Net Purchase columns (3) -->
                <col class="col-number"><col class="col-number"><col class="col-total">
                <col class="col-spacer">
                <!-- Sales columns (4) -->
                <col class="col-number"><col class="col-number"><col class="col-number"><col class="col-total">
                <col class="col-spacer">
                <!-- Sales Return columns (4) -->
                <col class="col-number"><col class="col-number"><col class="col-number"><col class="col-total">
                <col class="col-spacer">
                <!-- Net Sales columns (3) -->
                <col class="col-number"><col class="col-number"><col class="col-total">
                <col class="col-spacer">
                <!-- Net VAT columns (3) -->
                <col class="col-vat"><col class="col-vat"><col class="col-vat">
            </colgroup>
            <thead>
                <tr>
                    <th rowSpan="2" class="text-center align-middle bg-primary header-cell">Date Range</th>
                    <th colSpan="4" class="text-center bg-primary header-cell">Purchase</th>
                    <th class="bg-light col-spacer"></th>
                    <th colSpan="4" class="text-center bg-primary header-cell">Purchase Return</th>
                    <th class="bg-light col-spacer"></th>
                    <th colSpan="3" class="text-center bg-primary header-cell">Net Purchase</th>
                    <th class="bg-light col-spacer"></th>
                    <th colSpan="4" class="text-center bg-primary header-cell">Sales</th>
                    <th class="bg-light col-spacer"></th>
                    <th colSpan="4" class="text-center bg-primary header-cell">Sales Return</th>
                    <th class="bg-light col-spacer"></th>
                    <th colSpan="3" class="text-center bg-primary header-cell">Net Sales</th>
                    <th class="bg-light col-spacer"></th>
                    <th colSpan="3" class="text-center bg-primary header-cell">Net VAT</th>
                </tr>
                <tr>
                    <th class="header-cell two-line">Taxable<br>Amount</th>
                    <th class="header-cell two-line">Non-VAT<br>Amount</th>
                    <th class="header-cell two-line">VAT<br>Amount</th>
                    <th class="header-cell two-line">Total<br>Amount</th>
                    <th class="bg-light"></th>
                    <th class="header-cell two-line">Taxable<br>Amount</th>
                    <th class="header-cell two-line">Non-VAT<br>Amount</th>
                    <th class="header-cell two-line">VAT<br>Amount</th>
                    <th class="header-cell two-line">Total<br>Amount</th>
                    <th class="bg-light"></th>
                    <th class="header-cell two-line">Taxable<br>Amount</th>
                    <th class="header-cell two-line">Non-VAT<br>Amount</th>
                    <th class="header-cell two-line">Total<br>Amount</th>
                    <th class="bg-light"></th>
                    <th class="header-cell two-line">Taxable<br>Amount</th>
                    <th class="header-cell two-line">Non-VAT<br>Amount</th>
                    <th class="header-cell two-line">VAT<br>Amount</th>
                    <th class="header-cell two-line">Total<br>Amount</th>
                    <th class="bg-light"></th>
                    <th class="header-cell two-line">Taxable<br>Amount</th>
                    <th class="header-cell two-line">Non-VAT<br>Amount</th>
                    <th class="header-cell two-line">VAT<br>Amount</th>
                    <th class="header-cell two-line">Total<br>Amount</th>
                    <th class="bg-light"></th>
                    <th class="header-cell two-line">Taxable<br>Amount</th>
                    <th class="header-cell two-line">Non-VAT<br>Amount</th>
                    <th class="header-cell two-line">Total<br>Amount</th>
                    <th class="bg-light"></th>
                    <th class="header-cell two-line">Purchase<br>VAT</th>
                    <th class="header-cell two-line">Sales<br>VAT</th>
                    <th class="header-cell two-line">Net<br>Payable</th>
                </tr>
            </thead>
            <tbody>
    `;

        // Add data rows based on report type
        if (formValues.periodType === 'yearly' && reportData.monthlyData && reportData.monthlyData.length > 0) {
            // Print all months data for yearly report
            reportData.monthlyData.forEach((monthData) => {
                const netPurchaseTaxable = (monthData.totals.purchase?.taxableAmount || 0) - (monthData.totals.purchaseReturn?.taxableAmount || 0);
                const netPurchaseNonVat = (monthData.totals.purchase?.nonVatAmount || 0) - (monthData.totals.purchaseReturn?.nonVatAmount || 0);
                const netPurchaseTotal = ((monthData.totals.purchase?.taxableAmount || 0) + (monthData.totals.purchase?.nonVatAmount || 0) + (monthData.totals.purchase?.vatAmount || 0)) -
                    ((monthData.totals.purchaseReturn?.taxableAmount || 0) + (monthData.totals.purchaseReturn?.nonVatAmount || 0) + (monthData.totals.purchaseReturn?.vatAmount || 0));

                const netSalesTaxable = (monthData.totals.sales?.taxableAmount || 0) - (monthData.totals.salesReturn?.taxableAmount || 0);
                const netSalesNonVat = (monthData.totals.sales?.nonVatAmount || 0) - (monthData.totals.salesReturn?.nonVatAmount || 0);
                const netSalesTotal = ((monthData.totals.sales?.taxableAmount || 0) + (monthData.totals.sales?.nonVatAmount || 0) + (monthData.totals.sales?.vatAmount || 0)) -
                    ((monthData.totals.salesReturn?.taxableAmount || 0) + (monthData.totals.salesReturn?.nonVatAmount || 0) + (monthData.totals.salesReturn?.vatAmount || 0));

                tableContent += `
            <tr>
                <td class="nowrap"><strong>${monthData.reportDateRange}</strong></td>
                <td class="amount-cell">${formatCurrency(monthData.totals.purchase?.taxableAmount || 0)}</td>
                <td class="amount-cell">${formatCurrency(monthData.totals.purchase?.nonVatAmount || 0)}</td>
                <td class="amount-cell">${formatCurrency(monthData.totals.purchase?.vatAmount || 0)}</td>
                <td class="fw-bold amount-cell">${formatCurrency((monthData.totals.purchase?.taxableAmount || 0) + (monthData.totals.purchase?.nonVatAmount || 0) + (monthData.totals.purchase?.vatAmount || 0))}</td>
                <td class="bg-light"></td>
                <td class="amount-cell">${formatCurrency(monthData.totals.purchaseReturn?.taxableAmount || 0)}</td>
                <td class="amount-cell">${formatCurrency(monthData.totals.purchaseReturn?.nonVatAmount || 0)}</td>
                <td class="amount-cell">${formatCurrency(monthData.totals.purchaseReturn?.vatAmount || 0)}</td>
                <td class="fw-bold amount-cell">${formatCurrency((monthData.totals.purchaseReturn?.taxableAmount || 0) + (monthData.totals.purchaseReturn?.nonVatAmount || 0) + (monthData.totals.purchaseReturn?.vatAmount || 0))}</td>
                <td class="bg-light"></td>
                <td class="amount-cell ${netPurchaseTaxable >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(netPurchaseTaxable)}</td>
                <td class="amount-cell ${netPurchaseNonVat >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(netPurchaseNonVat)}</td>
                <td class="amount-cell ${netPurchaseTotal >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(netPurchaseTotal)}</td>
                <td class="bg-light"></td>
                <td class="amount-cell">${formatCurrency(monthData.totals.sales?.taxableAmount || 0)}</td>
                <td class="amount-cell">${formatCurrency(monthData.totals.sales?.nonVatAmount || 0)}</td>
                <td class="amount-cell">${formatCurrency(monthData.totals.sales?.vatAmount || 0)}</td>
                <td class="fw-bold amount-cell">${formatCurrency((monthData.totals.sales?.taxableAmount || 0) + (monthData.totals.sales?.nonVatAmount || 0) + (monthData.totals.sales?.vatAmount || 0))}</td>
                <td class="bg-light"></td>
                <td class="amount-cell">${formatCurrency(monthData.totals.salesReturn?.taxableAmount || 0)}</td>
                <td class="amount-cell">${formatCurrency(monthData.totals.salesReturn?.nonVatAmount || 0)}</td>
                <td class="amount-cell">${formatCurrency(monthData.totals.salesReturn?.vatAmount || 0)}</td>
                <td class="fw-bold amount-cell">${formatCurrency((monthData.totals.salesReturn?.taxableAmount || 0) + (monthData.totals.salesReturn?.nonVatAmount || 0) + (monthData.totals.salesReturn?.vatAmount || 0))}</td>
                <td class="bg-light"></td>
                <td class="amount-cell ${netSalesTaxable >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(netSalesTaxable)}</td>
                <td class="amount-cell ${netSalesNonVat >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(netSalesNonVat)}</td>
                <td class="amount-cell ${netSalesTotal >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(netSalesTotal)}</td>
                <td class="bg-light"></td>
                <td class="amount-cell">${formatCurrency(monthData.totals.netPurchaseVat || 0)}</td>
                <td class="amount-cell">${formatCurrency(monthData.totals.netSalesVat || 0)}</td>
                <td class="amount-cell ${(monthData.totals.netVat || 0) >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(monthData.totals.netVat || 0)}</td>
            </tr>
            `;
            });

            // Add yearly totals
            const yearlyTotals = calculateYearlyTotals();
            if (yearlyTotals) {
                tableContent += `
            <tr class="fw-bold table-secondary">
                <td>TOTAL</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.purchaseTaxable)}</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.purchaseNonVat)}</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.purchaseVat)}</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.purchaseTotal)}</td>
                <td class="bg-light"></td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.purchaseReturnTaxable)}</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.purchaseReturnNonVat)}</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.purchaseReturnVat)}</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.purchaseReturnTotal)}</td>
                <td class="bg-light"></td>
                <td class="amount-cell ${yearlyTotals.netPurchaseTaxable >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(yearlyTotals.netPurchaseTaxable)}</td>
                <td class="amount-cell ${yearlyTotals.netPurchaseNonVat >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(yearlyTotals.netPurchaseNonVat)}</td>
                <td class="amount-cell ${yearlyTotals.netPurchaseTotal >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(yearlyTotals.netPurchaseTotal)}</td>
                <td class="bg-light"></td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.salesTaxable)}</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.salesNonVat)}</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.salesVat)}</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.salesTotal)}</td>
                <td class="bg-light"></td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.salesReturnTaxable)}</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.salesReturnNonVat)}</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.salesReturnVat)}</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.salesReturnTotal)}</td>
                <td class="bg-light"></td>
                <td class="amount-cell ${yearlyTotals.netSalesTaxable >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(yearlyTotals.netSalesTaxable)}</td>
                <td class="amount-cell ${yearlyTotals.netSalesNonVat >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(yearlyTotals.netSalesNonVat)}</td>
                <td class="amount-cell ${yearlyTotals.netSalesTotal >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(yearlyTotals.netSalesTotal)}</td>
                <td class="bg-light"></td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.netPurchaseVat)}</td>
                <td class="amount-cell">${formatCurrency(yearlyTotals.netSalesVat)}</td>
                <td class="amount-cell ${yearlyTotals.netVat >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(yearlyTotals.netVat)}</td>
            </tr>
            `;
            }
        } else if (reportData.totals) {
            // Print single month data
            const displayTotals = calculateDisplayTotals();
            tableContent += `
        <tr>
            <td class="nowrap"><strong>${reportData.reportDateRange}</strong></td>
            <td class="amount-cell">${formatCurrency(reportData.totals.purchase?.taxableAmount || 0)}</td>
            <td class="amount-cell">${formatCurrency(reportData.totals.purchase?.nonVatAmount || 0)}</td>
            <td class="amount-cell">${formatCurrency(reportData.totals.purchase?.vatAmount || 0)}</td>
            <td class="fw-bold amount-cell">${formatCurrency((reportData.totals.purchase?.taxableAmount || 0) + (reportData.totals.purchase?.nonVatAmount || 0) + (reportData.totals.purchase?.vatAmount || 0))}</td>
            <td class="bg-light"></td>
            <td class="amount-cell">${formatCurrency(reportData.totals.purchaseReturn?.taxableAmount || 0)}</td>
            <td class="amount-cell">${formatCurrency(reportData.totals.purchaseReturn?.nonVatAmount || 0)}</td>
            <td class="amount-cell">${formatCurrency(reportData.totals.purchaseReturn?.vatAmount || 0)}</td>
            <td class="fw-bold amount-cell">${formatCurrency((reportData.totals.purchaseReturn?.taxableAmount || 0) + (reportData.totals.purchaseReturn?.nonVatAmount || 0) + (reportData.totals.purchaseReturn?.vatAmount || 0))}</td>
            <td class="bg-light"></td>
            <td class="amount-cell ${displayTotals.netPurchaseTaxable >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(displayTotals.netPurchaseTaxable)}</td>
            <td class="amount-cell ${displayTotals.netPurchaseNonVat >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(displayTotals.netPurchaseNonVat)}</td>
            <td class="amount-cell ${displayTotals.netPurchaseTotal >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(displayTotals.netPurchaseTotal)}</td>
            <td class="bg-light"></td>
            <td class="amount-cell">${formatCurrency(reportData.totals.sales?.taxableAmount || 0)}</td>
            <td class="amount-cell">${formatCurrency(reportData.totals.sales?.nonVatAmount || 0)}</td>
            <td class="amount-cell">${formatCurrency(reportData.totals.sales?.vatAmount || 0)}</td>
            <td class="fw-bold amount-cell">${formatCurrency((reportData.totals.sales?.taxableAmount || 0) + (reportData.totals.sales?.nonVatAmount || 0) + (reportData.totals.sales?.vatAmount || 0))}</td>
            <td class="bg-light"></td>
            <td class="amount-cell">${formatCurrency(reportData.totals.salesReturn?.taxableAmount || 0)}</td>
            <td class="amount-cell">${formatCurrency(reportData.totals.salesReturn?.nonVatAmount || 0)}</td>
            <td class="amount-cell">${formatCurrency(reportData.totals.salesReturn?.vatAmount || 0)}</td>
            <td class="fw-bold amount-cell">${formatCurrency((reportData.totals.salesReturn?.taxableAmount || 0) + (reportData.totals.salesReturn?.nonVatAmount || 0) + (reportData.totals.salesReturn?.vatAmount || 0))}</td>
            <td class="bg-light"></td>
            <td class="amount-cell ${displayTotals.netSalesTaxable >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(displayTotals.netSalesTaxable)}</td>
            <td class="amount-cell ${displayTotals.netSalesNonVat >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(displayTotals.netSalesNonVat)}</td>
            <td class="amount-cell ${displayTotals.netSalesTotal >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(displayTotals.netSalesTotal)}</td>
            <td class="bg-light"></td>
            <td class="amount-cell">${formatCurrency(reportData.totals.netPurchaseVat || 0)}</td>
            <td class="amount-cell">${formatCurrency(reportData.totals.netSalesVat || 0)}</td>
            <td class="amount-cell ${(reportData.totals.netVat || 0) >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">${formatCurrency(reportData.totals.netVat || 0)}</td>
        </tr>
        `;
        }

        tableContent += `
            </tbody>
        </table>
    </div>
    `;

        printWindow.document.write(`
    <html>
        <head>
            <title>Monthly VAT Summary</title>
        </head>
        <body>
            ${tableContent}
            <script>
                window.onload = function() {
                    window.print();
                    // Removed window.close() to keep the print window open
                };
            <\/script>
        </body>
    </html>
    `);
        printWindow.document.close();
    };

    // Add this function to calculate totals for display
    const calculateDisplayTotals = () => {
        if (reportData.totals) {
            // Single month totals
            return {
                purchaseTaxable: reportData.totals.purchase?.taxableAmount || 0,
                purchaseNonVat: reportData.totals.purchase?.nonVatAmount || 0,
                purchaseVat: reportData.totals.purchase?.vatAmount || 0,
                purchaseTotal: (reportData.totals.purchase?.taxableAmount || 0) +
                    (reportData.totals.purchase?.nonVatAmount || 0) +
                    (reportData.totals.purchase?.vatAmount || 0),

                purchaseReturnTaxable: reportData.totals.purchaseReturn?.taxableAmount || 0,
                purchaseReturnNonVat: reportData.totals.purchaseReturn?.nonVatAmount || 0,
                purchaseReturnVat: reportData.totals.purchaseReturn?.vatAmount || 0,
                purchaseReturnTotal: (reportData.totals.purchaseReturn?.taxableAmount || 0) +
                    (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
                    (reportData.totals.purchaseReturn?.vatAmount || 0),

                netPurchaseTaxable: (reportData.totals.purchase?.taxableAmount || 0) -
                    (reportData.totals.purchaseReturn?.taxableAmount || 0),
                netPurchaseNonVat: (reportData.totals.purchase?.nonVatAmount || 0) -
                    (reportData.totals.purchaseReturn?.nonVatAmount || 0),
                netPurchaseTotal: ((reportData.totals.purchase?.taxableAmount || 0) +
                    (reportData.totals.purchase?.nonVatAmount || 0) +
                    (reportData.totals.purchase?.vatAmount || 0)) -
                    ((reportData.totals.purchaseReturn?.taxableAmount || 0) +
                        (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
                        (reportData.totals.purchaseReturn?.vatAmount || 0)),

                salesTaxable: reportData.totals.sales?.taxableAmount || 0,
                salesNonVat: reportData.totals.sales?.nonVatAmount || 0,
                salesVat: reportData.totals.sales?.vatAmount || 0,
                salesTotal: (reportData.totals.sales?.taxableAmount || 0) +
                    (reportData.totals.sales?.nonVatAmount || 0) +
                    (reportData.totals.sales?.vatAmount || 0),

                salesReturnTaxable: reportData.totals.salesReturn?.taxableAmount || 0,
                salesReturnNonVat: reportData.totals.salesReturn?.nonVatAmount || 0,
                salesReturnVat: reportData.totals.salesReturn?.vatAmount || 0,
                salesReturnTotal: (reportData.totals.salesReturn?.taxableAmount || 0) +
                    (reportData.totals.salesReturn?.nonVatAmount || 0) +
                    (reportData.totals.salesReturn?.vatAmount || 0),

                netSalesTaxable: (reportData.totals.sales?.taxableAmount || 0) -
                    (reportData.totals.salesReturn?.taxableAmount || 0),
                netSalesNonVat: (reportData.totals.sales?.nonVatAmount || 0) -
                    (reportData.totals.salesReturn?.nonVatAmount || 0),
                netSalesTotal: ((reportData.totals.sales?.taxableAmount || 0) +
                    (reportData.totals.sales?.nonVatAmount || 0) +
                    (reportData.totals.sales?.vatAmount || 0)) -
                    ((reportData.totals.salesReturn?.taxableAmount || 0) +
                        (reportData.totals.salesReturn?.nonVatAmount || 0) +
                        (reportData.totals.salesReturn?.vatAmount || 0)),

                netPurchaseVat: reportData.totals.netPurchaseVat || 0,
                netSalesVat: reportData.totals.netSalesVat || 0,
                netVat: reportData.totals.netVat || 0
            };
        } else if (reportData.monthlyData && reportData.monthlyData.length > 0) {
            // Multiple months totals
            return calculateYearlyTotals();
        }
        return null;
    };

    // Excel Export Function - FIXED COLUMN MAPPING
    const handleExportExcel = async () => {
        // Check if there's any data to export
        const hasData = reportData.totals ||
            (reportData.monthlyData && reportData.monthlyData.length > 0);

        if (!hasData) {
            setNotification({
                show: true,
                message: 'No data to export. Please generate a report first.',
                type: 'error'
            });
            return;
        }

        setExporting(true);
        try {
            let excelData = [];
            const currentDate = new Date().toISOString().split('T')[0];

            // Add company header information
            excelData.push(['Company Name:', reportData.currentCompanyName || 'N/A']);
            excelData.push(['Report Type:', 'Monthly VAT Summary']);
            excelData.push(['Date Range:', reportData.reportDateRange || 'N/A']);
            excelData.push(['Export Date:', currentDate]);
            excelData.push([]); // Empty row for spacing

            // Main table headers - using array format for proper alignment
            const headers = [
                'Date Range',
                'Purchase Taxable', 'Purchase Non-VAT', 'Purchase VAT', 'Purchase Total',
                '',
                'Purchase Return Taxable', 'Purchase Return Non-VAT', 'Purchase Return VAT', 'Purchase Return Total',
                '',
                'Net Purchase Taxable', 'Net Purchase Non-VAT', 'Net Purchase Total',
                '',
                'Sales Taxable', 'Sales Non-VAT', 'Sales VAT', 'Sales Total',
                '',
                'Sales Return Taxable', 'Sales Return Non-VAT', 'Sales Return VAT', 'Sales Return Total',
                '',
                'Net Sales Taxable', 'Net Sales Non-VAT', 'Net Sales Total',
                '',
                'Purchase VAT', 'Sales VAT', 'Net VAT Payable'
            ];

            // Add headers row
            excelData.push(headers);

            // Export data based on report type
            if (formValues.periodType === 'yearly' && reportData.monthlyData && reportData.monthlyData.length > 0) {
                // Export all months data for yearly report
                reportData.monthlyData.forEach((monthData) => {
                    const rowData = [
                        monthData.reportDateRange,
                        formatCurrency(monthData.totals.purchase?.taxableAmount || 0),
                        formatCurrency(monthData.totals.purchase?.nonVatAmount || 0),
                        formatCurrency(monthData.totals.purchase?.vatAmount || 0),
                        formatCurrency(
                            (monthData.totals.purchase?.taxableAmount || 0) +
                            (monthData.totals.purchase?.nonVatAmount || 0) +
                            (monthData.totals.purchase?.vatAmount || 0)
                        ),
                        '', // Spacer
                        formatCurrency(monthData.totals.purchaseReturn?.taxableAmount || 0),
                        formatCurrency(monthData.totals.purchaseReturn?.nonVatAmount || 0),
                        formatCurrency(monthData.totals.purchaseReturn?.vatAmount || 0),
                        formatCurrency(
                            (monthData.totals.purchaseReturn?.taxableAmount || 0) +
                            (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
                            (monthData.totals.purchaseReturn?.vatAmount || 0)
                        ),
                        '', // Spacer
                        formatCurrency(
                            (monthData.totals.purchase?.taxableAmount || 0) -
                            (monthData.totals.purchaseReturn?.taxableAmount || 0)
                        ),
                        formatCurrency(
                            (monthData.totals.purchase?.nonVatAmount || 0) -
                            (monthData.totals.purchaseReturn?.nonVatAmount || 0)
                        ),
                        formatCurrency(
                            ((monthData.totals.purchase?.taxableAmount || 0) +
                                (monthData.totals.purchase?.nonVatAmount || 0) +
                                (monthData.totals.purchase?.vatAmount || 0)) -
                            ((monthData.totals.purchaseReturn?.taxableAmount || 0) +
                                (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
                                (monthData.totals.purchaseReturn?.vatAmount || 0))
                        ),
                        '', // Spacer
                        formatCurrency(monthData.totals.sales?.taxableAmount || 0),
                        formatCurrency(monthData.totals.sales?.nonVatAmount || 0),
                        formatCurrency(monthData.totals.sales?.vatAmount || 0),
                        formatCurrency(
                            (monthData.totals.sales?.taxableAmount || 0) +
                            (monthData.totals.sales?.nonVatAmount || 0) +
                            (monthData.totals.sales?.vatAmount || 0)
                        ),
                        '', // Spacer
                        formatCurrency(monthData.totals.salesReturn?.taxableAmount || 0),
                        formatCurrency(monthData.totals.salesReturn?.nonVatAmount || 0),
                        formatCurrency(monthData.totals.salesReturn?.vatAmount || 0),
                        formatCurrency(
                            (monthData.totals.salesReturn?.taxableAmount || 0) +
                            (monthData.totals.salesReturn?.nonVatAmount || 0) +
                            (monthData.totals.salesReturn?.vatAmount || 0)
                        ),
                        '', // Spacer
                        formatCurrency(
                            (monthData.totals.sales?.taxableAmount || 0) -
                            (monthData.totals.salesReturn?.taxableAmount || 0)
                        ),
                        formatCurrency(
                            (monthData.totals.sales?.nonVatAmount || 0) -
                            (monthData.totals.salesReturn?.nonVatAmount || 0)
                        ),
                        formatCurrency(
                            ((monthData.totals.sales?.taxableAmount || 0) +
                                (monthData.totals.sales?.nonVatAmount || 0) +
                                (monthData.totals.sales?.vatAmount || 0)) -
                            ((monthData.totals.salesReturn?.taxableAmount || 0) +
                                (monthData.totals.salesReturn?.nonVatAmount || 0) +
                                (monthData.totals.salesReturn?.vatAmount || 0))
                        ),
                        '', // Spacer
                        formatCurrency(monthData.totals.netPurchaseVat || 0),
                        formatCurrency(monthData.totals.netSalesVat || 0),
                        formatCurrency(monthData.totals.netVat || 0)
                    ];
                    excelData.push(rowData);
                });

                // Add yearly totals
                const yearlyTotals = calculateYearlyTotals();
                if (yearlyTotals) {
                    excelData.push([]); // Empty row
                    const totalsRow = [
                        'YEARLY TOTALS',
                        formatCurrency(yearlyTotals.purchaseTaxable),
                        formatCurrency(yearlyTotals.purchaseNonVat),
                        formatCurrency(yearlyTotals.purchaseVat),
                        formatCurrency(yearlyTotals.purchaseTotal),
                        '', // Spacer
                        formatCurrency(yearlyTotals.purchaseReturnTaxable),
                        formatCurrency(yearlyTotals.purchaseReturnNonVat),
                        formatCurrency(yearlyTotals.purchaseReturnVat),
                        formatCurrency(yearlyTotals.purchaseReturnTotal),
                        '', // Spacer
                        formatCurrency(yearlyTotals.netPurchaseTaxable),
                        formatCurrency(yearlyTotals.netPurchaseNonVat),
                        formatCurrency(yearlyTotals.netPurchaseTotal),
                        '', // Spacer
                        formatCurrency(yearlyTotals.salesTaxable),
                        formatCurrency(yearlyTotals.salesNonVat),
                        formatCurrency(yearlyTotals.salesVat),
                        formatCurrency(yearlyTotals.salesTotal),
                        '', // Spacer
                        formatCurrency(yearlyTotals.salesReturnTaxable),
                        formatCurrency(yearlyTotals.salesReturnNonVat),
                        formatCurrency(yearlyTotals.salesReturnVat),
                        formatCurrency(yearlyTotals.salesReturnTotal),
                        '', // Spacer
                        formatCurrency(yearlyTotals.netSalesTaxable),
                        formatCurrency(yearlyTotals.netSalesNonVat),
                        formatCurrency(yearlyTotals.netSalesTotal),
                        '', // Spacer
                        formatCurrency(yearlyTotals.netPurchaseVat),
                        formatCurrency(yearlyTotals.netSalesVat),
                        formatCurrency(yearlyTotals.netVat)
                    ];
                    excelData.push(totalsRow);
                }
            } else if (reportData.totals) {
                // Export single month data
                const rowData = [
                    reportData.reportDateRange,
                    formatCurrency(reportData.totals.purchase?.taxableAmount || 0),
                    formatCurrency(reportData.totals.purchase?.nonVatAmount || 0),
                    formatCurrency(reportData.totals.purchase?.vatAmount || 0),
                    formatCurrency(
                        (reportData.totals.purchase?.taxableAmount || 0) +
                        (reportData.totals.purchase?.nonVatAmount || 0) +
                        (reportData.totals.purchase?.vatAmount || 0)
                    ),
                    '', // Spacer
                    formatCurrency(reportData.totals.purchaseReturn?.taxableAmount || 0),
                    formatCurrency(reportData.totals.purchaseReturn?.nonVatAmount || 0),
                    formatCurrency(reportData.totals.purchaseReturn?.vatAmount || 0),
                    formatCurrency(
                        (reportData.totals.purchaseReturn?.taxableAmount || 0) +
                        (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
                        (reportData.totals.purchaseReturn?.vatAmount || 0)
                    ),
                    '', // Spacer
                    formatCurrency(
                        (reportData.totals.purchase?.taxableAmount || 0) -
                        (reportData.totals.purchaseReturn?.taxableAmount || 0)
                    ),
                    formatCurrency(
                        (reportData.totals.purchase?.nonVatAmount || 0) -
                        (reportData.totals.purchaseReturn?.nonVatAmount || 0)
                    ),
                    formatCurrency(
                        ((reportData.totals.purchase?.taxableAmount || 0) +
                            (reportData.totals.purchase?.nonVatAmount || 0) +
                            (reportData.totals.purchase?.vatAmount || 0)) -
                        ((reportData.totals.purchaseReturn?.taxableAmount || 0) +
                            (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
                            (reportData.totals.purchaseReturn?.vatAmount || 0))
                    ),
                    '', // Spacer
                    formatCurrency(reportData.totals.sales?.taxableAmount || 0),
                    formatCurrency(reportData.totals.sales?.nonVatAmount || 0),
                    formatCurrency(reportData.totals.sales?.vatAmount || 0),
                    formatCurrency(
                        (reportData.totals.sales?.taxableAmount || 0) +
                        (reportData.totals.sales?.nonVatAmount || 0) +
                        (reportData.totals.sales?.vatAmount || 0)
                    ),
                    '', // Spacer
                    formatCurrency(reportData.totals.salesReturn?.taxableAmount || 0),
                    formatCurrency(reportData.totals.salesReturn?.nonVatAmount || 0),
                    formatCurrency(reportData.totals.salesReturn?.vatAmount || 0),
                    formatCurrency(
                        (reportData.totals.salesReturn?.taxableAmount || 0) +
                        (reportData.totals.salesReturn?.nonVatAmount || 0) +
                        (reportData.totals.salesReturn?.vatAmount || 0)
                    ),
                    '', // Spacer
                    formatCurrency(
                        (reportData.totals.sales?.taxableAmount || 0) -
                        (reportData.totals.salesReturn?.taxableAmount || 0)
                    ),
                    formatCurrency(
                        (reportData.totals.sales?.nonVatAmount || 0) -
                        (reportData.totals.salesReturn?.nonVatAmount || 0)
                    ),
                    formatCurrency(
                        ((reportData.totals.sales?.taxableAmount || 0) +
                            (reportData.totals.sales?.nonVatAmount || 0) +
                            (reportData.totals.sales?.vatAmount || 0)) -
                        ((reportData.totals.salesReturn?.taxableAmount || 0) +
                            (reportData.totals.salesReturn?.nonVatAmount || 0) +
                            (reportData.totals.salesReturn?.vatAmount || 0))
                    ),
                    '', // Spacer
                    formatCurrency(reportData.totals.netPurchaseVat || 0),
                    formatCurrency(reportData.totals.netSalesVat || 0),
                    formatCurrency(reportData.totals.netVat || 0)
                ];
                excelData.push(rowData);
            }

            // Create worksheet using array format
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Monthly VAT Summary');

            // Set column widths for better formatting
            const colWidths = [
                { wch: 20 }, // Date Range
                { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, // Purchase columns
                { wch: 5 },  // Spacer
                { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, // Purchase Return columns
                { wch: 5 },  // Spacer
                { wch: 15 }, { wch: 15 }, { wch: 15 }, // Net Purchase columns
                { wch: 5 },  // Spacer
                { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, // Sales columns
                { wch: 5 },  // Spacer
                { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, // Sales Return columns
                { wch: 5 },  // Spacer
                { wch: 15 }, { wch: 15 }, { wch: 15 }, // Net Sales columns
                { wch: 5 },  // Spacer
                { wch: 15 }, { wch: 15 }, { wch: 15 }  // VAT columns
            ];
            ws['!cols'] = colWidths;

            // Generate filename
            const fileName = `Monthly_VAT_Summary_${reportData.reportDateRange || currentDate}.xlsx`;

            // Export to Excel
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

    // Helper function to calculate yearly totals
    const calculateYearlyTotals = () => {
        if (!reportData.monthlyData || reportData.monthlyData.length === 0) return null;

        const totals = {
            purchaseTaxable: 0,
            purchaseNonVat: 0,
            purchaseVat: 0,
            purchaseTotal: 0,
            purchaseReturnTaxable: 0,
            purchaseReturnNonVat: 0,
            purchaseReturnVat: 0,
            purchaseReturnTotal: 0,
            netPurchaseTaxable: 0,
            netPurchaseNonVat: 0,
            netPurchaseTotal: 0,
            salesTaxable: 0,
            salesNonVat: 0,
            salesVat: 0,
            salesTotal: 0,
            salesReturnTaxable: 0,
            salesReturnNonVat: 0,
            salesReturnVat: 0,
            salesReturnTotal: 0,
            netSalesTaxable: 0,
            netSalesNonVat: 0,
            netSalesTotal: 0,
            netPurchaseVat: 0,
            netSalesVat: 0,
            netVat: 0
        };

        reportData.monthlyData.forEach(monthData => {
            totals.purchaseTaxable += monthData.totals.purchase?.taxableAmount || 0;
            totals.purchaseNonVat += monthData.totals.purchase?.nonVatAmount || 0;
            totals.purchaseVat += monthData.totals.purchase?.vatAmount || 0;
            totals.purchaseTotal += (monthData.totals.purchase?.taxableAmount || 0) +
                (monthData.totals.purchase?.nonVatAmount || 0) +
                (monthData.totals.purchase?.vatAmount || 0);

            totals.purchaseReturnTaxable += monthData.totals.purchaseReturn?.taxableAmount || 0;
            totals.purchaseReturnNonVat += monthData.totals.purchaseReturn?.nonVatAmount || 0;
            totals.purchaseReturnVat += monthData.totals.purchaseReturn?.vatAmount || 0;
            totals.purchaseReturnTotal += (monthData.totals.purchaseReturn?.taxableAmount || 0) +
                (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
                (monthData.totals.purchaseReturn?.vatAmount || 0);

            totals.netPurchaseTaxable += (monthData.totals.purchase?.taxableAmount || 0) -
                (monthData.totals.purchaseReturn?.taxableAmount || 0);
            totals.netPurchaseNonVat += (monthData.totals.purchase?.nonVatAmount || 0) -
                (monthData.totals.purchaseReturn?.nonVatAmount || 0);
            totals.netPurchaseTotal += ((monthData.totals.purchase?.taxableAmount || 0) +
                (monthData.totals.purchase?.nonVatAmount || 0) +
                (monthData.totals.purchase?.vatAmount || 0)) -
                ((monthData.totals.purchaseReturn?.taxableAmount || 0) +
                    (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
                    (monthData.totals.purchaseReturn?.vatAmount || 0));

            totals.salesTaxable += monthData.totals.sales?.taxableAmount || 0;
            totals.salesNonVat += monthData.totals.sales?.nonVatAmount || 0;
            totals.salesVat += monthData.totals.sales?.vatAmount || 0;
            totals.salesTotal += (monthData.totals.sales?.taxableAmount || 0) +
                (monthData.totals.sales?.nonVatAmount || 0) +
                (monthData.totals.sales?.vatAmount || 0);

            totals.salesReturnTaxable += monthData.totals.salesReturn?.taxableAmount || 0;
            totals.salesReturnNonVat += monthData.totals.salesReturn?.nonVatAmount || 0;
            totals.salesReturnVat += monthData.totals.salesReturn?.vatAmount || 0;
            totals.salesReturnTotal += (monthData.totals.salesReturn?.taxableAmount || 0) +
                (monthData.totals.salesReturn?.nonVatAmount || 0) +
                (monthData.totals.salesReturn?.vatAmount || 0);

            totals.netSalesTaxable += (monthData.totals.sales?.taxableAmount || 0) -
                (monthData.totals.salesReturn?.taxableAmount || 0);
            totals.netSalesNonVat += (monthData.totals.sales?.nonVatAmount || 0) -
                (monthData.totals.salesReturn?.nonVatAmount || 0);
            totals.netSalesTotal += ((monthData.totals.sales?.taxableAmount || 0) +
                (monthData.totals.sales?.nonVatAmount || 0) +
                (monthData.totals.sales?.vatAmount || 0)) -
                ((monthData.totals.salesReturn?.taxableAmount || 0) +
                    (monthData.totals.salesReturn?.nonVatAmount || 0) +
                    (monthData.totals.salesReturn?.vatAmount || 0));

            totals.netPurchaseVat += monthData.totals.netPurchaseVat || 0;
            totals.netSalesVat += monthData.totals.netSalesVat || 0;
            totals.netVat += monthData.totals.netVat || 0;
        });

        return totals;
    };

    if (loading) return <Loader />;

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                document.getElementById(nextFieldId)?.focus();
            }
        }
    };

    const renderMonthlyTable = () => {
        if (!reportData.monthlyData || reportData.monthlyData.length === 0) {
            return null;
        }

        const displayTotals = calculateDisplayTotals();

        return (
            <div className="table-container mt-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <table className="table table-bordered table-hover" id="vatReportTable">
                    <thead>
                        <tr>
                            <th rowSpan="2" className="text-center align-middle bg-primary text-white">Date Range</th>
                            <th colSpan="4" className="text-center bg-primary text-white">Purchase</th>
                            <th className="bg-light" style={{ width: '10px' }}></th>
                            <th colSpan="4" className="text-center bg-primary text-white">Purchase Return</th>
                            <th className="bg-light" style={{ width: '10px' }}></th>
                            <th colSpan="3" className="text-center bg-primary text-white">Net Purchase</th>
                            <th className="bg-light" style={{ width: '10px' }}></th>
                            <th colSpan="4" className="text-center bg-primary text-white">Sales</th>
                            <th className="bg-light" style={{ width: '10px' }}></th>
                            <th colSpan="4" className="text-center bg-primary text-white">Sales Return</th>
                            <th className="bg-light" style={{ width: '10px' }}></th>
                            <th colSpan="3" className="text-center bg-primary text-white">Net Sales</th>
                            <th className="bg-light" style={{ width: '10px' }}></th>
                            <th colSpan="3" className="text-center bg-primary text-white">Net VAT</th>
                        </tr>
                        <tr>
                            <th>Taxable</th>
                            <th>Non-VAT</th>
                            <th>VAT</th>
                            <th>Total</th>
                            <th className="bg-light"></th>
                            <th>Taxable</th>
                            <th>Non-VAT</th>
                            <th>VAT</th>
                            <th>Total</th>
                            <th className="bg-light"></th>
                            <th>Taxable</th>
                            <th>Non-VAT</th>
                            <th>Total</th>
                            <th className="bg-light"></th>
                            <th>Taxable</th>
                            <th>Non-VAT</th>
                            <th>VAT</th>
                            <th>Total</th>
                            <th className="bg-light"></th>
                            <th>Taxable</th>
                            <th>Non-VAT</th>
                            <th>VAT</th>
                            <th>Total</th>
                            <th className="bg-light"></th>
                            <th>Taxable</th>
                            <th>Non-VAT</th>
                            <th>Total</th>
                            <th className="bg-light"></th>
                            <th>Purc VAT</th>
                            <th>Sales VAT</th>
                            <th>Net Payable</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.monthlyData.map((monthData, index) => (
                            <tr key={index}>
                                <td className="align-middle"><strong>{monthData.reportDateRange}</strong></td>
                                <td>{formatCurrency(monthData.totals.purchase?.taxableAmount)}</td>
                                <td>{formatCurrency(monthData.totals.purchase?.nonVatAmount)}</td>
                                <td>{formatCurrency(monthData.totals.purchase?.vatAmount)}</td>
                                <td className="fw-bold">
                                    {formatCurrency(
                                        (monthData.totals.purchase?.taxableAmount || 0) +
                                        (monthData.totals.purchase?.nonVatAmount || 0) +
                                        (monthData.totals.purchase?.vatAmount || 0)
                                    )}
                                </td>
                                <td className="bg-light"></td>
                                <td>{formatCurrency(monthData.totals.purchaseReturn?.taxableAmount)}</td>
                                <td>{formatCurrency(monthData.totals.purchaseReturn?.nonVatAmount)}</td>
                                <td>{formatCurrency(monthData.totals.purchaseReturn?.vatAmount)}</td>
                                <td className="fw-bold">
                                    {formatCurrency(
                                        (monthData.totals.purchaseReturn?.taxableAmount || 0) +
                                        (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
                                        (monthData.totals.purchaseReturn?.vatAmount || 0)
                                    )}
                                </td>
                                <td className="bg-light"></td>
                                <td className={getNetValueClass(
                                    (monthData.totals.purchase?.taxableAmount || 0) -
                                    (monthData.totals.purchaseReturn?.taxableAmount || 0)
                                )}>
                                    {formatCurrency(
                                        (monthData.totals.purchase?.taxableAmount || 0) -
                                        (monthData.totals.purchaseReturn?.taxableAmount || 0)
                                    )}
                                </td>
                                <td className={getNetValueClass(
                                    (monthData.totals.purchase?.nonVatAmount || 0) -
                                    (monthData.totals.purchaseReturn?.nonVatAmount || 0)
                                )}>
                                    {formatCurrency(
                                        (monthData.totals.purchase?.nonVatAmount || 0) -
                                        (monthData.totals.purchaseReturn?.nonVatAmount || 0)
                                    )}
                                </td>
                                <td className={`fw-bold ${getNetValueClass(
                                    ((monthData.totals.purchase?.taxableAmount || 0) +
                                        (monthData.totals.purchase?.nonVatAmount || 0) +
                                        (monthData.totals.purchase?.vatAmount || 0)) -
                                    ((monthData.totals.purchaseReturn?.taxableAmount || 0) +
                                        (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
                                        (monthData.totals.purchaseReturn?.vatAmount || 0))
                                )}`}>
                                    {formatCurrency(
                                        ((monthData.totals.purchase?.taxableAmount || 0) +
                                            (monthData.totals.purchase?.nonVatAmount || 0) +
                                            (monthData.totals.purchase?.vatAmount || 0)) -
                                        ((monthData.totals.purchaseReturn?.taxableAmount || 0) +
                                            (monthData.totals.purchaseReturn?.nonVatAmount || 0) +
                                            (monthData.totals.purchaseReturn?.vatAmount || 0))
                                    )}
                                </td>
                                <td className="bg-light"></td>
                                <td>{formatCurrency(monthData.totals.sales?.taxableAmount)}</td>
                                <td>{formatCurrency(monthData.totals.sales?.nonVatAmount)}</td>
                                <td>{formatCurrency(monthData.totals.sales?.vatAmount)}</td>
                                <td className="fw-bold">
                                    {formatCurrency(
                                        (monthData.totals.sales?.taxableAmount || 0) +
                                        (monthData.totals.sales?.nonVatAmount || 0) +
                                        (monthData.totals.sales?.vatAmount || 0)
                                    )}
                                </td>
                                <td className="bg-light"></td>
                                <td>{formatCurrency(monthData.totals.salesReturn?.taxableAmount)}</td>
                                <td>{formatCurrency(monthData.totals.salesReturn?.nonVatAmount)}</td>
                                <td>{formatCurrency(monthData.totals.salesReturn?.vatAmount)}</td>
                                <td className="fw-bold">
                                    {formatCurrency(
                                        (monthData.totals.salesReturn?.taxableAmount || 0) +
                                        (monthData.totals.salesReturn?.nonVatAmount || 0) +
                                        (monthData.totals.salesReturn?.vatAmount || 0)
                                    )}
                                </td>
                                <td className="bg-light"></td>
                                <td className={getNetValueClass(
                                    (monthData.totals.sales?.taxableAmount || 0) -
                                    (monthData.totals.salesReturn?.taxableAmount || 0)
                                )}>
                                    {formatCurrency(
                                        (monthData.totals.sales?.taxableAmount || 0) -
                                        (monthData.totals.salesReturn?.taxableAmount || 0)
                                    )}
                                </td>
                                <td className={getNetValueClass(
                                    (monthData.totals.sales?.nonVatAmount || 0) -
                                    (monthData.totals.salesReturn?.nonVatAmount || 0)
                                )}>
                                    {formatCurrency(
                                        (monthData.totals.sales?.nonVatAmount || 0) -
                                        (monthData.totals.salesReturn?.nonVatAmount || 0)
                                    )}
                                </td>
                                <td className={`fw-bold ${getNetValueClass(
                                    ((monthData.totals.sales?.taxableAmount || 0) +
                                        (monthData.totals.sales?.nonVatAmount || 0) +
                                        (monthData.totals.sales?.vatAmount || 0)) -
                                    ((monthData.totals.salesReturn?.taxableAmount || 0) +
                                        (monthData.totals.salesReturn?.nonVatAmount || 0) +
                                        (monthData.totals.salesReturn?.vatAmount || 0))
                                )}`}>
                                    {formatCurrency(
                                        ((monthData.totals.sales?.taxableAmount || 0) +
                                            (monthData.totals.sales?.nonVatAmount || 0) +
                                            (monthData.totals.sales?.vatAmount || 0)) -
                                        ((monthData.totals.salesReturn?.taxableAmount || 0) +
                                            (monthData.totals.salesReturn?.nonVatAmount || 0) +
                                            (monthData.totals.salesReturn?.vatAmount || 0))
                                    )}
                                </td>
                                <td className="bg-light"></td>
                                <td>{formatCurrency(monthData.totals.netPurchaseVat)}</td>
                                <td>{formatCurrency(monthData.totals.netSalesVat)}</td>
                                <td className={`fw-bold ${monthData.totals.netVat >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {formatCurrency(monthData.totals.netVat)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {displayTotals && (
                        <tfoot className="table-group-divider">
                            <tr className="fw-bold table-secondary">
                                <td>TOTAL</td>
                                <td>{formatCurrency(displayTotals.purchaseTaxable)}</td>
                                <td>{formatCurrency(displayTotals.purchaseNonVat)}</td>
                                <td>{formatCurrency(displayTotals.purchaseVat)}</td>
                                <td>{formatCurrency(displayTotals.purchaseTotal)}</td>
                                <td className="bg-light"></td>
                                <td>{formatCurrency(displayTotals.purchaseReturnTaxable)}</td>
                                <td>{formatCurrency(displayTotals.purchaseReturnNonVat)}</td>
                                <td>{formatCurrency(displayTotals.purchaseReturnVat)}</td>
                                <td>{formatCurrency(displayTotals.purchaseReturnTotal)}</td>
                                <td className="bg-light"></td>
                                <td className={getNetValueClass(displayTotals.netPurchaseTaxable)}>
                                    {formatCurrency(displayTotals.netPurchaseTaxable)}
                                </td>
                                <td className={getNetValueClass(displayTotals.netPurchaseNonVat)}>
                                    {formatCurrency(displayTotals.netPurchaseNonVat)}
                                </td>
                                <td className={getNetValueClass(displayTotals.netPurchaseTotal)}>
                                    {formatCurrency(displayTotals.netPurchaseTotal)}
                                </td>
                                <td className="bg-light"></td>
                                <td>{formatCurrency(displayTotals.salesTaxable)}</td>
                                <td>{formatCurrency(displayTotals.salesNonVat)}</td>
                                <td>{formatCurrency(displayTotals.salesVat)}</td>
                                <td>{formatCurrency(displayTotals.salesTotal)}</td>
                                <td className="bg-light"></td>
                                <td>{formatCurrency(displayTotals.salesReturnTaxable)}</td>
                                <td>{formatCurrency(displayTotals.salesReturnNonVat)}</td>
                                <td>{formatCurrency(displayTotals.salesReturnVat)}</td>
                                <td>{formatCurrency(displayTotals.salesReturnTotal)}</td>
                                <td className="bg-light"></td>
                                <td className={getNetValueClass(displayTotals.netSalesTaxable)}>
                                    {formatCurrency(displayTotals.netSalesTaxable)}
                                </td>
                                <td className={getNetValueClass(displayTotals.netSalesNonVat)}>
                                    {formatCurrency(displayTotals.netSalesNonVat)}
                                </td>
                                <td className={getNetValueClass(displayTotals.netSalesTotal)}>
                                    {formatCurrency(displayTotals.netSalesTotal)}
                                </td>
                                <td className="bg-light"></td>
                                <td>{formatCurrency(displayTotals.netPurchaseVat)}</td>
                                <td>{formatCurrency(displayTotals.netSalesVat)}</td>
                                <td className={getNetValueClass(displayTotals.netVat)}>
                                    {formatCurrency(displayTotals.netVat)}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        );
    };

    const renderSingleMonthTable = () => {
        if (!reportData.totals) {
            return null;
        }

        const displayTotals = calculateDisplayTotals();

        return (
            <div className="table-container mt-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <table className="table table-bordered table-hover" id="vatReportTable">
                    <thead>
                        <tr>
                            <th rowSpan="2" className="text-center align-middle bg-primary text-white">Date Range</th>
                            <th colSpan="4" className="text-center bg-primary text-white">Purchase</th>
                            <th className="bg-light" style={{ width: '10px' }}></th>
                            <th colSpan="4" className="text-center bg-primary text-white">Purchase Return</th>
                            <th className="bg-light" style={{ width: '10px' }}></th>
                            <th colSpan="3" className="text-center bg-primary text-white">Net Purchase</th>
                            <th className="bg-light" style={{ width: '10px' }}></th>
                            <th colSpan="4" className="text-center bg-primary text-white">Sales</th>
                            <th className="bg-light" style={{ width: '10px' }}></th>
                            <th colSpan="4" className="text-center bg-primary text-white">Sales Return</th>
                            <th className="bg-light" style={{ width: '10px' }}></th>
                            <th colSpan="3" className="text-center bg-primary text-white">Net Sales</th>
                            <th className="bg-light" style={{ width: '10px' }}></th>
                            <th colSpan="3" className="text-center bg-primary text-white">Net VAT</th>
                        </tr>
                        <tr>
                            <th>Taxable</th>
                            <th>Non-VAT</th>
                            <th>VAT</th>
                            <th>Total</th>
                            <th className="bg-light"></th>
                            <th>Taxable</th>
                            <th>Non-VAT</th>
                            <th>VAT</th>
                            <th>Total</th>
                            <th className="bg-light"></th>
                            <th>Taxable</th>
                            <th>Non-VAT</th>
                            <th>Total</th>
                            <th className="bg-light"></th>
                            <th>Taxable</th>
                            <th>Non-VAT</th>
                            <th>VAT</th>
                            <th>Total</th>
                            <th className="bg-light"></th>
                            <th>Taxable</th>
                            <th>Non-VAT</th>
                            <th>VAT</th>
                            <th>Total</th>
                            <th className="bg-light"></th>
                            <th>Taxable</th>
                            <th>Non-VAT</th>
                            <th>Total</th>
                            <th className="bg-light"></th>
                            <th>Purc VAT</th>
                            <th>Sales VAT</th>
                            <th>Net Payable</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="align-middle"><strong>{reportData.reportDateRange}</strong></td>
                            <td>{formatCurrency(reportData.totals.purchase?.taxableAmount)}</td>
                            <td>{formatCurrency(reportData.totals.purchase?.nonVatAmount)}</td>
                            <td>{formatCurrency(reportData.totals.purchase?.vatAmount)}</td>
                            <td className="fw-bold">
                                {formatCurrency(
                                    (reportData.totals.purchase?.taxableAmount || 0) +
                                    (reportData.totals.purchase?.nonVatAmount || 0) +
                                    (reportData.totals.purchase?.vatAmount || 0)
                                )}
                            </td>
                            <td className="bg-light"></td>
                            <td>{formatCurrency(reportData.totals.purchaseReturn?.taxableAmount)}</td>
                            <td>{formatCurrency(reportData.totals.purchaseReturn?.nonVatAmount)}</td>
                            <td>{formatCurrency(reportData.totals.purchaseReturn?.vatAmount)}</td>
                            <td className="fw-bold">
                                {formatCurrency(
                                    (reportData.totals.purchaseReturn?.taxableAmount || 0) +
                                    (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
                                    (reportData.totals.purchaseReturn?.vatAmount || 0)
                                )}
                            </td>
                            <td className="bg-light"></td>
                            <td className={getNetValueClass(
                                (reportData.totals.purchase?.taxableAmount || 0) -
                                (reportData.totals.purchaseReturn?.taxableAmount || 0)
                            )}>
                                {formatCurrency(
                                    (reportData.totals.purchase?.taxableAmount || 0) -
                                    (reportData.totals.purchaseReturn?.taxableAmount || 0)
                                )}
                            </td>
                            <td className={getNetValueClass(
                                (reportData.totals.purchase?.nonVatAmount || 0) -
                                (reportData.totals.purchaseReturn?.nonVatAmount || 0)
                            )}>
                                {formatCurrency(
                                    (reportData.totals.purchase?.nonVatAmount || 0) -
                                    (reportData.totals.purchaseReturn?.nonVatAmount || 0)
                                )}
                            </td>
                            <td className={`fw-bold ${getNetValueClass(
                                ((reportData.totals.purchase?.taxableAmount || 0) +
                                    (reportData.totals.purchase?.nonVatAmount || 0) +
                                    (reportData.totals.purchase?.vatAmount || 0)) -
                                ((reportData.totals.purchaseReturn?.taxableAmount || 0) +
                                    (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
                                    (reportData.totals.purchaseReturn?.vatAmount || 0))
                            )}`}>
                                {formatCurrency(
                                    ((reportData.totals.purchase?.taxableAmount || 0) +
                                        (reportData.totals.purchase?.nonVatAmount || 0) +
                                        (reportData.totals.purchase?.vatAmount || 0)) -
                                    ((reportData.totals.purchaseReturn?.taxableAmount || 0) +
                                        (reportData.totals.purchaseReturn?.nonVatAmount || 0) +
                                        (reportData.totals.purchaseReturn?.vatAmount || 0))
                                )}
                            </td>
                            <td className="bg-light"></td>
                            <td>{formatCurrency(reportData.totals.sales?.taxableAmount)}</td>
                            <td>{formatCurrency(reportData.totals.sales?.nonVatAmount)}</td>
                            <td>{formatCurrency(reportData.totals.sales?.vatAmount)}</td>
                            <td className="fw-bold">
                                {formatCurrency(
                                    (reportData.totals.sales?.taxableAmount || 0) +
                                    (reportData.totals.sales?.nonVatAmount || 0) +
                                    (reportData.totals.sales?.vatAmount || 0)
                                )}
                            </td>
                            <td className="bg-light"></td>
                            <td>{formatCurrency(reportData.totals.salesReturn?.taxableAmount)}</td>
                            <td>{formatCurrency(reportData.totals.salesReturn?.nonVatAmount)}</td>
                            <td>{formatCurrency(reportData.totals.salesReturn?.vatAmount)}</td>
                            <td className="fw-bold">
                                {formatCurrency(
                                    (reportData.totals.salesReturn?.taxableAmount || 0) +
                                    (reportData.totals.salesReturn?.nonVatAmount || 0) +
                                    (reportData.totals.salesReturn?.vatAmount || 0)
                                )}
                            </td>
                            <td className="bg-light"></td>
                            <td className={getNetValueClass(
                                (reportData.totals.sales?.taxableAmount || 0) -
                                (reportData.totals.salesReturn?.taxableAmount || 0)
                            )}>
                                {formatCurrency(
                                    (reportData.totals.sales?.taxableAmount || 0) -
                                    (reportData.totals.salesReturn?.taxableAmount || 0)
                                )}
                            </td>
                            <td className={getNetValueClass(
                                (reportData.totals.sales?.nonVatAmount || 0) -
                                (reportData.totals.salesReturn?.nonVatAmount || 0)
                            )}>
                                {formatCurrency(
                                    (reportData.totals.sales?.nonVatAmount || 0) -
                                    (reportData.totals.salesReturn?.nonVatAmount || 0)
                                )}
                            </td>
                            <td className={`fw-bold ${getNetValueClass(
                                ((reportData.totals.sales?.taxableAmount || 0) +
                                    (reportData.totals.sales?.nonVatAmount || 0) +
                                    (reportData.totals.sales?.vatAmount || 0)) -
                                ((reportData.totals.salesReturn?.taxableAmount || 0) +
                                    (reportData.totals.salesReturn?.nonVatAmount || 0) +
                                    (reportData.totals.salesReturn?.vatAmount || 0))
                            )}`}>
                                {formatCurrency(
                                    ((reportData.totals.sales?.taxableAmount || 0) +
                                        (reportData.totals.sales?.nonVatAmount || 0) +
                                        (reportData.totals.sales?.vatAmount || 0)) -
                                    ((reportData.totals.salesReturn?.taxableAmount || 0) +
                                        (reportData.totals.salesReturn?.nonVatAmount || 0) +
                                        (reportData.totals.salesReturn?.vatAmount || 0))
                                )}
                            </td>
                            <td className="bg-light"></td>
                            <td>{formatCurrency(reportData.totals.netPurchaseVat)}</td>
                            <td>{formatCurrency(reportData.totals.netSalesVat)}</td>
                            <td className={`fw-bold ${reportData.totals.netVat >= 0 ? 'text-success' : 'text-danger'}`}>
                                {formatCurrency(reportData.totals.netVat)}
                            </td>
                        </tr>
                    </tbody>
                    {displayTotals && (
                        <tfoot className="table-group-divider">
                            <tr className="fw-bold table-secondary">
                                <td>TOTAL</td>
                                <td>{formatCurrency(displayTotals.purchaseTaxable)}</td>
                                <td>{formatCurrency(displayTotals.purchaseNonVat)}</td>
                                <td>{formatCurrency(displayTotals.purchaseVat)}</td>
                                <td>{formatCurrency(displayTotals.purchaseTotal)}</td>
                                <td className="bg-light"></td>
                                <td>{formatCurrency(displayTotals.purchaseReturnTaxable)}</td>
                                <td>{formatCurrency(displayTotals.purchaseReturnNonVat)}</td>
                                <td>{formatCurrency(displayTotals.purchaseReturnVat)}</td>
                                <td>{formatCurrency(displayTotals.purchaseReturnTotal)}</td>
                                <td className="bg-light"></td>
                                <td className={getNetValueClass(displayTotals.netPurchaseTaxable)}>
                                    {formatCurrency(displayTotals.netPurchaseTaxable)}
                                </td>
                                <td className={getNetValueClass(displayTotals.netPurchaseNonVat)}>
                                    {formatCurrency(displayTotals.netPurchaseNonVat)}
                                </td>
                                <td className={getNetValueClass(displayTotals.netPurchaseTotal)}>
                                    {formatCurrency(displayTotals.netPurchaseTotal)}
                                </td>
                                <td className="bg-light"></td>
                                <td>{formatCurrency(displayTotals.salesTaxable)}</td>
                                <td>{formatCurrency(displayTotals.salesNonVat)}</td>
                                <td>{formatCurrency(displayTotals.salesVat)}</td>
                                <td>{formatCurrency(displayTotals.salesTotal)}</td>
                                <td className="bg-light"></td>
                                <td>{formatCurrency(displayTotals.salesReturnTaxable)}</td>
                                <td>{formatCurrency(displayTotals.salesReturnNonVat)}</td>
                                <td>{formatCurrency(displayTotals.salesReturnVat)}</td>
                                <td>{formatCurrency(displayTotals.salesReturnTotal)}</td>
                                <td className="bg-light"></td>
                                <td className={getNetValueClass(displayTotals.netSalesTaxable)}>
                                    {formatCurrency(displayTotals.netSalesTaxable)}
                                </td>
                                <td className={getNetValueClass(displayTotals.netSalesNonVat)}>
                                    {formatCurrency(displayTotals.netSalesNonVat)}
                                </td>
                                <td className={getNetValueClass(displayTotals.netSalesTotal)}>
                                    {formatCurrency(displayTotals.netSalesTotal)}
                                </td>
                                <td className="bg-light"></td>
                                <td>{formatCurrency(displayTotals.netPurchaseVat)}</td>
                                <td>{formatCurrency(displayTotals.netSalesVat)}</td>
                                <td className={getNetValueClass(displayTotals.netVat)}>
                                    {formatCurrency(displayTotals.netVat)}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        );
    };

    return (
        <div className="container-fluid mt-4">
            <Header />
            <div className="card mt-4 p-4">
                <div className="report-header bg-light p-4 rounded-3 shadow-sm mb-4">
                    <h2 className="text-center mb-4 text-decoration-underline">Monthly VAT Summary</h2>
                    <form onSubmit={handleGenerateReport}>
                        <div className="row g-3">
                            <div className="col-md-2">
                                <label htmlFor="periodType" className="form-label fw-semibold">Period Type</label>
                                <select
                                    name="periodType"
                                    id="periodType"
                                    className="form-select"
                                    value={formValues.periodType || 'monthly'}
                                    onChange={handlePeriodTypeChange}
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">All Months (Yearly)</option>
                                </select>
                            </div>

                            {formValues.periodType === 'monthly' ? (
                                formValues.companyDateFormat === 'english' ? (
                                    <>
                                        <div className="col-md-2">
                                            <label htmlFor="month" className="form-label fw-semibold">Month</label>
                                            <select
                                                name="month"
                                                id="month"
                                                className="form-select"
                                                value={formValues.month || ''}
                                                onChange={handleDateChange}
                                            >
                                                <option value="">Select Month</option>
                                                {["January", "February", "March", "April", "May", "June",
                                                    "July", "August", "September", "October", "November", "December"]
                                                    .map((monthName, index) => (
                                                        <option key={monthName} value={index + 1}>
                                                            {monthName}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                        <div className="col-md-2">
                                            <label htmlFor="year" className="form-label fw-semibold">Year</label>
                                            <input
                                                type="number"
                                                name="year"
                                                id="year"
                                                className="form-control"
                                                value={formValues.year || ''}
                                                onKeyDown={handleKeyDown}
                                                onChange={handleDateChange}
                                                placeholder={`e.g. ${new Date().getFullYear()}`}
                                                autoComplete='off'
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="col-md-2">
                                            <label htmlFor="nepaliMonth" className="form-label fw-semibold">Month (Nepali)</label>
                                            <select
                                                name="nepaliMonth"
                                                id="nepaliMonth"
                                                className="form-select"
                                                value={formValues.nepaliMonth || ''}
                                                onChange={handleDateChange}
                                                autoFocus
                                                onKeyDown={(e) => handleKeyDown(e, 'nepaliYear')}
                                            >
                                                <option value="">Select Month</option>
                                                {["Baisakh", "Jestha", "Ashad", "Shrawan", "Bhadra", "Ashoj",
                                                    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"]
                                                    .map((monthName, index) => (
                                                        <option key={monthName} value={index + 1}>
                                                            {monthName}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                        <div className="col-md-2">
                                            <label htmlFor="nepaliYear" className="form-label fw-semibold">Year (Nepali)</label>
                                            <input
                                                type="text"
                                                name="nepaliYear"
                                                id="nepaliYear"
                                                className="form-control"
                                                value={formValues.nepaliYear || ''}
                                                onChange={handleDateChange}
                                                placeholder={`e.g. ${reportData.currentNepaliYear}`}
                                                autoComplete='off'
                                                onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                            />
                                        </div>
                                    </>
                                )
                            ) : (
                                formValues.companyDateFormat === 'english' ? (
                                    <div className="col-md-2">
                                        <label htmlFor="year" className="form-label fw-semibold">Year</label>
                                        <input
                                            type="number"
                                            name="year"
                                            id="year"
                                            className="form-control"
                                            value={formValues.year || ''}
                                            onChange={handleDateChange}
                                            placeholder={`e.g. ${new Date().getFullYear()}`}
                                            autoComplete='off'
                                        />
                                    </div>
                                ) : (
                                    <div className="col-md-2">
                                        <label htmlFor="nepaliYear" className="form-label fw-semibold">Fiscal Year (Nepali)</label>
                                        <input
                                            type="text"
                                            name="nepaliYear"
                                            id="nepaliYear"
                                            className="form-control"
                                            value={formValues.nepaliYear || ''}
                                            onChange={handleDateChange}
                                            placeholder={`e.g. ${getCurrentNepaliFiscalYear()}`}
                                            autoComplete='off'
                                        />
                                    </div>
                                )
                            )}

                            <div className="col-md-2 d-flex align-items-end">
                                <button type="submit" className="btn btn-primary w-100"
                                    id="generateReport"
                                >
                                    <i className="fas fa-search me-2"></i> Generate Report
                                </button>
                            </div>
                            <div className="col-md-2 d-flex align-items-end">
                                <button
                                    type="button"
                                    id="exportExcel"
                                    className="btn btn-success w-100"
                                    onClick={handleExportExcel}
                                    disabled={(!reportData.totals && (!reportData.monthlyData || reportData.monthlyData.length === 0)) || exporting}
                                >
                                    {exporting ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Exporting...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-file-excel me-2"></i> Export to Excel
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="col-md-2 d-flex align-items-end">
                                <button
                                    type="button"
                                    className="btn btn-secondary w-100"
                                    onClick={handlePrint}
                                    disabled={!reportData.totals && (!reportData.monthlyData || reportData.monthlyData.length === 0)}
                                >
                                    <i className="fas fa-print me-2"></i> Print
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {reportData.totals ? (
                    renderSingleMonthTable()
                ) : reportData.monthlyData && reportData.monthlyData.length > 0 ? (
                    renderMonthlyTable()
                ) : (
                    <div className="alert alert-info text-center py-4">
                        <i className="fas fa-info-circle me-2"></i>
                        Select period type and date to generate the VAT report
                    </div>
                )}
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