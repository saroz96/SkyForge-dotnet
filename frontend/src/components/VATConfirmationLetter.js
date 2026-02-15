// components/VATConfirmationLetter.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Alert, Spinner, Modal, Badge } from 'react-bootstrap';
import { getParties, getPartySummary } from '../components/services/vatConfirmationService';
import Header from './retailer/Header';
import { FiSearch, FiFileText, FiDownload, FiPrinter, FiUser, FiDollarSign, FiTrendingUp, FiCalendar } from 'react-icons/fi';

const VATConfirmationLetter = () => {
    const [parties, setParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingParties, setLoadingParties] = useState(false);
    const [error, setError] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadParties();
    }, []);

    const loadParties = async () => {
        try {
            setLoadingParties(true);
            const response = await getParties();
            setParties(response.data);
        } catch (error) {
            console.error('Error loading parties:', error);
            setError('Failed to load parties');
        } finally {
            setLoadingParties(false);
        }
    };

    const loadPartySummary = async (partyId) => {
        try {
            setLoading(true);
            setError('');
            const response = await getPartySummary(partyId);
            setSummary(response.data);
            setSelectedParty(parties.find(p => p._id === partyId));
        } catch (error) {
            console.error('Error loading summary:', error);
            setError('Failed to load party summary');
        } finally {
            setLoading(false);
        }
    };

    const handlePartySelect = (partyId) => {
        if (partyId) {
            loadPartySummary(partyId);
        } else {
            setSelectedParty(null);
            setSummary(null);
        }
    };

    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null) return '0.00';
        return parseFloat(amount).toLocaleString('en-NP', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-NP');
    };

    // Fixed search filter with null checks
    const filteredParties = parties.filter(party => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();

        // Safely check name
        const nameMatch = party.name?.toLowerCase().includes(searchLower) || false;

        // Safely check PAN (convert to string first)
        const panMatch = String(party.pan || '').toLowerCase().includes(searchLower);

        // Safely check phone (convert to string first)
        const phoneMatch = String(party.phone || '').includes(searchTerm);

        return nameMatch || panMatch || phoneMatch;
    });

    // const handlePrint = () => {
    //     // const printWindow = window.open('', '_blank', 'width=1000,height=800');
    //     const printWindow = window.open("", "_blank");

    //     const printContent = generatePrintContent();

    //     printWindow.document.write(`
    //         <!DOCTYPE html>
    //         <html>
    //         <head>
    //             <title>VAT and Balance Confirmation Letter - ${summary.party.name}</title>
    //             <style>
    //                 @media print {
    //                     @page {
    //                         size: A4;
    //                         margin: 12mm 15mm;
    //                     }
    //                     body {
    //                         font-family: 'Arial', 'Helvetica', sans-serif;
    //                         line-height: 1.3;
    //                         color: #000;
    //                         background: white;
    //                         font-size: 11px;
    //                         margin: 0;
    //                         padding: 0;
    //                     }
    //                 }
    //                 body {
    //                     font-family: Arial, Helvetica, sans-serif;
    //                     margin: 0;
    //                     padding: 0;
    //                     font-size: 11px;
    //                     line-height: 1.3;
    //                     color: #333;
    //                 }
    //                 .print-container {
    //                     max-width: 100%;
    //                     margin: 0 auto;
    //                     padding: 0;
    //                 }
    //                 .company-tagline {
    //                     font-size: 11px;
    //                     color: #666;
    //                     margin: 2px 0;
    //                 }
    //                 .company-contact {
    //                     font-size: 10px;
    //                     color: #555;
    //                     margin: 3px 0;
    //                 }
    //                 .document-title {
    //                     text-align: center;
    //                     margin: 15px 0;
    //                     padding: 8px;
    //                     background: #f8f9fa;
    //                     border: 1px solid #dee2e6;
    //                 }
    //                 .document-title h1 {
    //                     margin: 0;
    //                     font-size: 16px;
    //                     color: #2c3e50;
    //                     text-transform: uppercase;
    //                 }
    //                 .details-container {
    //                     display: flex;
    //                     gap: 20px;
    //                     margin-bottom: 15px;
    //                 }
    //                 .company-info, .party-info {
    //                     border: 1px solid #ccc;
    //                     padding: 12px;
    //                     flex: 1;
    //                     background: #fafafa;
    //                     border-radius: 4px;
    //                 }
    //                 .info-header {
    //                     background: #2c5aa0;
    //                     color: white;
    //                     padding: 4px 8px;
    //                     margin: -12px -12px 8px -12px;
    //                     border-radius: 4px 4px 0 0;
    //                     font-size: 11px;
    //                     font-weight: bold;
    //                 }
    //                 .info-content p {
    //                     margin: 4px 0;
    //                 }
    //                 .meta-info {
    //                     display: flex;
    //                     justify-content: space-between;
    //                     margin-bottom: 12px;
    //                     padding: 8px;
    //                     background: #f8f9fa;
    //                     border-radius: 4px;
    //                 }
    //                 .transaction-table {
    //                     width: 100%;
    //                     border-collapse: collapse;
    //                     margin: 15px 0;
    //                     font-size: 10px;
    //                     page-break-inside: avoid;
    //                 }
    //                 .transaction-table th {
    //                     background: #2c5aa0;
    //                     color: white;
    //                     border: 1px solid #1e3d6d;
    //                     padding: 6px 8px;
    //                     text-align: center;
    //                     font-weight: bold;
    //                 }
    //                 .transaction-table td {
    //                     border: 1px solid #ddd;
    //                     padding: 5px 8px;
    //                     text-align: left;
    //                 }
    //                 .transaction-table .text-end {
    //                     text-align: right;
    //                 }
    //                 .transaction-table .text-center {
    //                     text-align: center;
    //                 }
    //                 .section-header {
    //                     background: #e9ecef !important;
    //                     font-weight: bold;
    //                     border-left: 3px solid #2c5aa0;
    //                 }
    //                 .total-row {
    //                     background: #d4edda !important;
    //                     font-weight: bold;
    //                     border-top: 2px solid #28a745;
    //                 }
    //                 .balance-row {
    //                     background: #fff3cd !important;
    //                     font-weight: bold;
    //                 }
    //                 .content-section {
    //                     margin: 12px 0;
    //                     line-height: 1.4;
    //                 }
    //                 .signature-section {
    //                     margin-top: 25px;
    //                     page-break-inside: avoid;
    //                 }
    //                 .signature-container {
    //                     display: flex;
    //                     gap: 30px;
    //                     margin-top: 40px;
    //                 }
    //                 .signature-box {
    //                     flex: 1;
    //                     text-align: center;
    //                 }
    //                 .signature-line {
    //                     border-top: 1px solid #333;
    //                     margin: 40px 0 5px 0;
    //                 }
    //                 .signature-label {
    //                     font-weight: bold;
    //                     margin: 5px 0;
    //                 }
    //                 .signature-details {
    //                     font-size: 10px;
    //                     color: #666;
    //                 }
    //                 .footer {
    //                     margin-top: 20px;
    //                     text-align: center;
    //                     font-size: 9px;
    //                     color: #888;
    //                     border-top: 1px solid #eee;
    //                     padding-top: 8px;
    //                 }
    //                 .negative-amount {
    //                     color: #dc3545;
    //                 }
    //                 .page-break {
    //                     page-break-before: always;
    //                 }
    //                 @media print {
    //                     .no-print {
    //                         display: none;
    //                     }
    //                 }
    //             </style>
    //         </head>
    //         <body>
    //             ${printContent}
    //             <script>
    //                 window.onload = function() {
    //                     window.print();
    //                     setTimeout(function() {
    //                         window.close();
    //                     }, 1000);
    //                 };
    //             </script>
    //         </body>
    //         </html>
    //     `);
    //     printWindow.document.close();
    // };

    // const generatePrintContent = () => {
    //     if (!summary) return '';

    //     return `
    //         <div class="print-container">

    //             <!-- Document Title -->
    //             <div class="document-title">
    //                 <h1>VAT AND BALANCE CONFIRMATION LETTER</h1>
    //                 <p style="margin: 2px 0; font-size: 11px; color: #666;">
    //                     Fiscal Year: ${summary.fiscalYear} | Generated on: ${formatDate(summary.generatedDate)}
    //                 </p>
    //             </div>

    //             <!-- Company and Party Details -->
    //             <div class="details-container">
    //                 <div class="company-info">
    //                     <div class="info-header">FROM</div>
    //                     <div class="info-content">
    //                         <p style="font-weight: bold; margin-bottom: 5px;">${summary.company.name}</p>
    //                         <p style="margin: 2px 0;">Address: ${summary.company.address || ''}</p>
    //                         <p style="margin: 2px 0;">Phone: ${summary.company.phone || ''}</p>
    //                         <p style="margin: 2px 0;">PAN: ${summary.company.pan || ''}</p>
    //                         ${summary.company.vat ? `<p style="margin: 2px 0;">VAT: ${summary.company.vat}</p>` : ''}
    //                     </div>
    //                 </div>

    //                 <div class="party-info">
    //                     <div class="info-header">TO</div>
    //                     <div class="info-content">
    //                         <p style="font-weight: bold; margin-bottom: 5px;">${summary.party.name}</p>
    //                         <p style="margin: 2px 0;">Address: ${summary.party.address || ''}</p>
    //                         <p style="margin: 2px 0;">Phone: ${summary.party.phone || ''}</p>
    //                         <p style="margin: 2px 0;">PAN: ${summary.party.pan || ''}</p>
    //                         ${summary.party.vat ? `<p style="margin: 2px 0;">VAT: ${summary.party.vat}</p>` : ''}
    //                     </div>
    //                 </div>
    //             </div>

    //             <!-- Document Meta Information -->
    //             <div class="meta-info">
    //                 <div><strong>Reference No:</strong> ${`CONF/${summary.fiscalYear.replace('/', '')}/${Date.now()}`}</div>
    //                 <div><strong>Period:</strong> ${formatDate(summary.period.start)} to ${formatDate(summary.period.end)}</div>
    //                 <div><strong>Page:</strong> 1 of 1</div>
    //             </div>

    //             <!-- Salutation -->
    //             <div class="content-section">
    //                 <p>Dear Sir/Madam,</p>
    //                 <p>
    //                     In accordance with standard accounting practices and regulatory requirements, we hereby submit the following 
    //                     transaction summary and balance confirmation for your review and verification for the fiscal year 
    //                     <strong>${summary.fiscalYear}</strong>.
    //                 </p>
    //                 <p>
    //                     Please find below the detailed transaction summary and closing balance as on 
    //                     <strong>${formatDate(summary.period.end)}</strong>:
    //                 </p>
    //             </div>

    //             <!-- Transaction Summary Table -->
    //             <table class="transaction-table">
    //                 <thead>
    //                     <tr>
    //                         <th style="width: 45%;">Particulars</th>
    //                         <th style="width: 20%;">Amount (Rs.)</th>
    //                         <th style="width: 20%;">VAT Amount (Rs.)</th>
    //                         <th style="width: 15%;">Remarks</th>
    //                     </tr>
    //                 </thead>
    //                 <tbody>
    //                     <!-- Sales Section -->
    //                     <tr class="section-header">
    //                         <td colspan="4"><strong>SALES TRANSACTIONS</strong></td>
    //                     </tr>
    //                     <tr>
    //                         <td style="padding-left: 15px;">Taxable Sales</td>
    //                         <td class="text-end">${formatCurrency(summary.summary.taxableSales)}</td>
    //                         <td class="text-end">${formatCurrency(summary.summary.taxableSalesVAT)}</td>
    //                         <td class="text-center">-</td>
    //                     </tr>
    //                     <tr>
    //                         <td style="padding-left: 15px;">Non-Taxable Sales</td>
    //                         <td class="text-end">${formatCurrency(summary.summary.nonTaxableSales)}</td>
    //                         <td class="text-end">-</td>
    //                         <td class="text-center">Exempt</td>
    //                     </tr>
    //                     <tr>
    //                         <td style="padding-left: 15px;">Sales Return</td>
    //                         <td class="text-end negative-amount">(${formatCurrency(summary.summary.salesReturn)})</td>
    //                         <td class="text-end negative-amount">(${formatCurrency(summary.summary.salesReturnVAT)})</td>
    //                         <td class="text-center">Credit Note</td>
    //                     </tr>
    //                     <tr class="total-row">
    //                         <td><strong>NET SALES</strong></td>
    //                         <td class="text-end"><strong>${formatCurrency(summary.summary.netSales)}</strong></td>
    //                         <td class="text-end"><strong>${formatCurrency(summary.summary.netSalesVAT)}</strong></td>
    //                         <td class="text-center">-</td>
    //                     </tr>

    //                     <!-- Purchase Section -->
    //                     <tr class="section-header">
    //                         <td colspan="4"><strong>PURCHASE TRANSACTIONS</strong></td>
    //                     </tr>
    //                     <tr>
    //                         <td style="padding-left: 15px;">Taxable Purchases</td>
    //                         <td class="text-end">${formatCurrency(summary.summary.taxablePurchase)}</td>
    //                         <td class="text-end">${formatCurrency(summary.summary.taxablePurchaseVAT)}</td>
    //                         <td class="text-center">-</td>
    //                     </tr>
    //                     <tr>
    //                         <td style="padding-left: 15px;">Non-Taxable Purchase</td>
    //                         <td class="text-end">${formatCurrency(summary.summary.nonTaxablePurchase)}</td>
    //                         <td class="text-end">-</td>
    //                         <td class="text-center">Exempt</td>
    //                     </tr>
    //                     <tr>
    //                         <td style="padding-left: 15px;">Purchase Return</td>
    //                         <td class="text-end negative-amount">(${formatCurrency(summary.summary.purchaseReturn)})</td>
    //                         <td class="text-end negative-amount">(${formatCurrency(summary.summary.purchaseReturnVAT)})</td>
    //                         <td class="text-center">Debit Note</td>
    //                     </tr>
    //                     <tr class="total-row">
    //                         <td><strong>NET PURCHASES</strong></td>
    //                         <td class="text-end"><strong>${formatCurrency(summary.summary.netPurchase)}</strong></td>
    //                         <td class="text-end"><strong>${formatCurrency(summary.summary.netPurchaseVAT)}</strong></td>
    //                         <td class="text-center">-</td>
    //                     </tr>

    //                     <!-- Balance Section -->
    //                     <tr class="section-header">
    //                         <td colspan="4"><strong>ACCOUNT BALANCES</strong></td>
    //                     </tr>
    //                     <tr class="balance-row">
    //                         <td>Opening Balance as on ${formatDate(summary.period.start)}</td>
    //                         <td class="text-end"><strong>${formatCurrency(Math.abs(summary.summary.openingBalance))} ${summary.summary.openingBalance >= 0 ? 'Dr' : 'Cr'}</strong></td>
    //                         <td class="text-end">-</td>
    //                         <td class="text-center">B/F</td>
    //                     </tr>
    //                     <tr class="balance-row">
    //                         <td>Closing Balance as on ${formatDate(summary.period.end)}</td>
    //                         <td class="text-end"><strong>${formatCurrency(Math.abs(summary.summary.closingBalance))} ${summary.summary.closingBalance >= 0 ? 'Dr' : 'Cr'}</strong></td>
    //                         <td class="text-end">-</td>
    //                         <td class="text-center">C/F</td>
    //                     </tr>
    //                 </tbody>
    //             </table>

    //             <!-- Closing Paragraph -->
    //             <div class="content-section">
    //                 <p>
    //                     Kindly verify the above transactions and account balances. If the details are correct, 
    //                     please sign and return the duplicate copy of this letter within <strong>7 days</strong>. 
    //                     Any discrepancies should be communicated to us in writing within the same period.
    //                 </p>
    //                 <p>
    //                     If no communication is received within the stipulated time, the balances will be 
    //                     considered as confirmed and correct for all purposes.
    //                 </p>
    //             </div>

    //             <!-- Signatures -->
    //             <div class="signature-section">
    //                 <div class="signature-container">
    //                     <div class="signature-box">
    //                         <div class="signature-line"></div>
    //                         <div class="signature-label">For ${summary.company.name}</div>
    //                         <div class="signature-details">
    //                             Authorized Signatory<br>
    //                             Name: ________________<br>
    //                             Designation: ________________<br>
    //                             Date: ________________
    //                         </div>
    //                     </div>

    //                     <div class="signature-box">
    //                         <div class="signature-line"></div>
    //                         <div class="signature-label">For ${summary.party.name}</div>
    //                         <div class="signature-details">
    //                             Authorized Signatory<br>
    //                             Name: ________________<br>
    //                             Designation: ________________<br>
    //                             Date: ________________
    //                         </div>
    //                     </div>
    //                 </div>
    //             </div>
    //             <!-- Footer -->
    //             <div class="footer">
    //                 <p>
    //                     <strong>Confidentiality Notice:</strong> This document contains confidential information intended only for the recipient. 
    //                     Any unauthorized use, disclosure, or distribution is strictly prohibited.<br>
    //                     Generated electronically - No signature required for electronic verification
    //                 </p>
    //                 <p>Document ID: ${`VAT-CONF-${Date.now()}`} | Printed on: ${new Date().toLocaleDateString()}</p>
    //             </div>
    //         </div>
    //     `;
    // };

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");

        const printContent = generatePrintContent();

        printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>VAT and Balance Confirmation Letter - ${summary.party.name}</title>
        <style>
            /* Reset and base styles for print clarity */
            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            
            @media print {
                @page {
                    size: A4;
                    margin: 10mm 15mm;
                    size: portrait;
                }
                
                body {
                    font-family: "Times New Roman", Times, serif !important;
                    line-height: 1.15;
                    color: #000000 !important;
                    background: white !important;
                    font-size: 11pt;
                    margin: 0;
                    padding: 0;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }
                
                .print-container {
                    zoom: 1;
                }
            }
            
            /* Screen styles */
            body {
                font-family: "Times New Roman", Times, serif;
                margin: 0;
                padding: 15px;
                font-size: 11pt;
                line-height: 1.15;
                color: #000000;
                background: white;
            }
            
            .print-container {
                max-width: 100%;
                margin: 0 auto;
                padding: 0;
            }
            
            .company-name {
                font-size: 16pt;
                font-weight: bold;
                color: #000000;
                margin: 0 0 3px 0;
                line-height: 1.1;
            }
            
            .company-contact {
                font-size: 9pt;
                color: #000000;
                margin: 2px 0;
                line-height: 1.1;
            }
            
            /* Document Title - Compact */
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
                color: #000000;
                text-transform: uppercase;
                font-weight: bold;
                line-height: 1.1;
            }
            
            /* Details Container - Compact */
            .details-container {
                display: flex;
                gap: 15px;
                margin-bottom: 12px;
            }
            
            .company-info, .party-info {
                border: 1px solid #000000;
                padding: 8px;
                flex: 1;
                background: #ffffff !important;
                page-break-inside: avoid;
            }
            
            .info-header {
                background: #000000 !important;
                color: white !important;
                padding: 4px 8px;
                margin: -8px -8px 6px -8px;
                font-size: 10pt;
                font-weight: bold;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .info-content p {
                margin: 1px 0;
                font-size: 9pt;
                line-height: 1.1;
            }
            
            /* Meta Info - Compact */
            .meta-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding: 6px;
                background: #f8f9fa !important;
                border-radius: 2px;
                font-size: 9pt;
                line-height: 1.1;
            }
            
            /* Tables - Compact */
            .transaction-table {
                width: 100%;
                border-collapse: collapse;
                margin: 12px 0;
                font-size: 9pt;
                border: 1px solid #000000;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .transaction-table th {
                background: #000000 !important;
                color: white !important;
                border: 1px solid #000000;
                padding: 5px 6px;
                text-align: center;
                font-weight: bold;
                font-size: 9pt;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .transaction-table td {
                border: 1px solid #000000;
                padding: 4px 5px;
                text-align: left;
                font-size: 9pt;
                background: white !important;
                line-height: 1.1;
            }
            
            .transaction-table .text-end {
                text-align: right;
            }
            
            .transaction-table .text-center {
                text-align: center;
            }
            
            /* Table row styles */
            .section-header {
                background: #d3d3d3 !important;
                font-weight: bold;
                border-left: 2px solid #000000;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                font-size: 9pt;
            }
            
            .total-row {
                background: #e8f5e8 !important;
                font-weight: bold;
                border-top: 1px solid #000000;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                font-size: 9pt;
            }
            
            .balance-row {
                background: #fffacd !important;
                font-weight: bold;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                font-size: 9pt;
            }
            
            /* Content sections - Compact */
            .content-section {
                margin: 10px 0;
                line-height: 1.2;
                font-size: 10pt;
            }
            
            .content-section p {
                margin: 4px 0;
            }
            
            /* Signature section - Compact */
            .signature-section {
                margin-top: 15px;
                page-break-inside: avoid;
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
            
            .signature-details {
                font-size: 8pt;
                color: #000000;
                line-height: 1.1;
            }
            
            /* Footer - Compact */
            .footer {
                margin-top: 12px;
                text-align: center;
                font-size: 7pt;
                color: #888;
                border-top: 1px solid #eee;
                padding-top: 5px;
                line-height: 1.1;
            }
            
            /* Utility classes */
            .negative-amount {
                color: #000000;
                font-style: italic;
            }
            
            .text-muted {
                color: #000000 !important;
                opacity: 0.8;
            }
            
            /* Force black and white for print */
            @media print {
                * {
                    color: #000000 !important;
                }
                
                .transaction-table th {
                    background: #000000 !important;
                    color: white !important;
                }
                
                .section-header {
                    background: #d3d3d3 !important;
                }
                
                .total-row {
                    background: #e8f5e8 !important;
                }
                
                .balance-row {
                    background: #fffacd !important;
                }
                
                .document-title {
                    background: #f5f5f5 !important;
                }
                
                .meta-info {
                    background: #f8f9fa !important;
                }
            }
        </style>
    </head>
    <body>
        ${printContent}
        <script>
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                }, 300);
            };
            
            window.onafterprint = function() {
                setTimeout(function() {
                    window.close();
                }, 1000);
            };
        </script>
    </body>
    </html>
    `);
        printWindow.document.close();
    };

    const generatePrintContent = () => {
        if (!summary) return '';

        return `
        <div class="print-container">

            <!-- Document Title -->
            <div class="document-title">
                <h1>VAT AND BALANCE CONFIRMATION LETTER</h1>
                <p style="margin: 1px 0; font-size: 9pt; color: #666;">
                    Fiscal Year: ${summary.fiscalYear} | Generated on: ${formatDate(summary.generatedDate)}
                </p>
            </div>

            <!-- Company and Party Details -->
            <div class="details-container">
                <div class="company-info">
                    <div class="info-header">FROM</div>
                    <div class="info-content">
                        <p style="font-weight: bold; margin-bottom: 3px;">${summary.company.name}</p>
                        <p>Address: ${summary.company.address || ''}</p>
                        <p>Phone: ${summary.company.phone || ''}</p>
                        <p>PAN: ${summary.company.pan || ''}</p>
                        ${summary.company.vat ? `<p>VAT: ${summary.company.vat}</p>` : ''}
                    </div>
                </div>
                
                <div class="party-info">
                    <div class="info-header">TO</div>
                    <div class="info-content">
                        <p style="font-weight: bold; margin-bottom: 3px;">${summary.party.name}</p>
                        <p>Address: ${summary.party.address || ''}</p>
                        <p>Phone: ${summary.party.phone || ''}</p>
                        <p>PAN: ${summary.party.pan || ''}</p>
                        ${summary.party.vat ? `<p>VAT: ${summary.party.vat}</p>` : ''}
                    </div>
                </div>
            </div>

            <!-- Document Meta Information -->
            <div class="meta-info">
                <div style="flex: 1; text-align: left;">
                    <strong>Reference No:</strong><br>
                    ${`CONF/${summary.fiscalYear.replace('/', '')}/${Date.now().toString().slice(-4)}`}
                </div>
                <div style="flex: 1; text-align: center;">
                    <strong>Period:</strong><br>
                    ${formatDate(summary.period.start)} to ${formatDate(summary.period.end)}
                </div>
                <div style="flex: 1; text-align: right;">
                    <strong>Page:</strong><br>
                    1 of 1
                </div>
            </div>

            <!-- Salutation -->
            <div class="content-section">
                <p>Dear Sir/Madam,</p>
                <p>
                    In accordance with standard accounting practices and regulatory requirements, we hereby submit the following 
                    transaction summary and balance confirmation for your review and verification for the fiscal year 
                    <strong>${summary.fiscalYear}</strong>.
                </p>
                <p>
                    Please find below the detailed transaction summary and closing balance as on 
                    <strong>${formatDate(summary.period.end)}</strong>:
                </p>
            </div>

            <!-- Transaction Summary Table -->
            <table class="transaction-table">
                <thead>
                    <tr>
                        <th style="width: 45%;">Particulars</th>
                        <th style="width: 20%;">Amount (Rs.)</th>
                        <th style="width: 20%;">VAT Amount (Rs.)</th>
                        <th style="width: 15%;">Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Sales Section -->
                    <tr class="section-header">
                        <td colspan="4"><strong>SALES TRANSACTIONS</strong></td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">Taxable Sales</td>
                        <td class="text-end">${formatCurrency(summary.summary.taxableSales)}</td>
                        <td class="text-end">${formatCurrency(summary.summary.taxableSalesVAT)}</td>
                        <td class="text-center">-</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">Non-Taxable Sales</td>
                        <td class="text-end">${formatCurrency(summary.summary.nonTaxableSales)}</td>
                        <td class="text-end">-</td>
                        <td class="text-center">Exempt</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">Sales Return</td>
                        <td class="text-end negative-amount">(${formatCurrency(summary.summary.salesReturn)})</td>
                        <td class="text-end negative-amount">(${formatCurrency(summary.summary.salesReturnVAT)})</td>
                        <td class="text-center">Credit Note</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>NET SALES</strong></td>
                        <td class="text-end"><strong>${formatCurrency(summary.summary.netSales)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(summary.summary.netSalesVAT)}</strong></td>
                        <td class="text-center">-</td>
                    </tr>

                    <!-- Purchase Section -->
                    <tr class="section-header">
                        <td colspan="4"><strong>PURCHASE TRANSACTIONS</strong></td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">Taxable Purchases</td>
                        <td class="text-end">${formatCurrency(summary.summary.taxablePurchase)}</td>
                        <td class="text-end">${formatCurrency(summary.summary.taxablePurchaseVAT)}</td>
                        <td class="text-center">-</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">Non-Taxable Purchase</td>
                        <td class="text-end">${formatCurrency(summary.summary.nonTaxablePurchase)}</td>
                        <td class="text-end">-</td>
                        <td class="text-center">Exempt</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">Purchase Return</td>
                        <td class="text-end negative-amount">(${formatCurrency(summary.summary.purchaseReturn)})</td>
                        <td class="text-end negative-amount">(${formatCurrency(summary.summary.purchaseReturnVAT)})</td>
                        <td class="text-center">Debit Note</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>NET PURCHASES</strong></td>
                        <td class="text-end"><strong>${formatCurrency(summary.summary.netPurchase)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(summary.summary.netPurchaseVAT)}</strong></td>
                        <td class="text-center">-</td>
                    </tr>

                    <!-- Balance Section -->
                    <tr class="section-header">
                        <td colspan="4"><strong>ACCOUNT BALANCES</strong></td>
                    </tr>
                    <tr class="balance-row">
                        <td>Opening Balance as on ${formatDate(summary.period.start)}</td>
                        <td class="text-end"><strong>${formatCurrency(Math.abs(summary.summary.openingBalance))} ${summary.summary.openingBalance >= 0 ? 'Dr' : 'Cr'}</strong></td>
                        <td class="text-end">-</td>
                        <td class="text-center">B/F</td>
                    </tr>
                    <tr class="balance-row">
                        <td>Closing Balance as on ${formatDate(summary.period.end)}</td>
                        <td class="text-end"><strong>${formatCurrency(Math.abs(summary.summary.closingBalance))} ${summary.summary.closingBalance >= 0 ? 'Dr' : 'Cr'}</strong></td>
                        <td class="text-end">-</td>
                        <td class="text-center">C/F</td>
                    </tr>
                </tbody>
            </table>

            <!-- Closing Paragraph -->
            <div class="content-section">
                <p>
                    Kindly verify the above transactions and account balances. If the details are correct, 
                    please sign and return the duplicate copy of this letter within <strong>7 days</strong>. 
                    Any discrepancies should be communicated to us in writing within the same period.
                </p>
                <p>
                    If no communication is received within the stipulated time, the balances will be 
                    considered as confirmed and correct for all purposes.
                </p>
            </div>

            <!-- Signatures -->
            <div class="signature-section">
                <div class="signature-container">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-label">For ${summary.company.name}</div>
                        <div class="signature-details">
                            Authorized Signatory<br>
                            Name: ________________<br>
                            Designation: ________________<br>
                            Date: ________________
                        </div>
                    </div>
                    
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-label">For ${summary.party.name}</div>
                        <div class="signature-details">
                            Authorized Signatory<br>
                            Name: ________________<br>
                            Designation: ________________<br>
                            Date: ________________
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>
                    <strong>Confidentiality Notice:</strong> This document contains confidential information intended only for the recipient. 
                    Any unauthorized use, disclosure, or distribution is strictly prohibited.
                </p>
                <p>Document ID: ${`VAT-CONF-${Date.now()}`} | Printed on: ${new Date().toLocaleDateString()}</p>
            </div>
        </div>
    `;
    };

    const handleDownloadPDF = () => {
        handlePrint();
    };

    return (
        <Container fluid className="px-4">
            <Header />

            {/* Header Section */}
            <Row className="mb-4 mt-3">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="mb-1 text-primary">
                                <FiFileText className="me-2" />
                                VAT and Balance Confirmation
                            </h2>
                        </div>
                        <Badge bg="light" text="dark" className="fs-6">
                            <FiCalendar className="me-1" />
                            {summary ? `FY: ${summary.fiscalYear}` : 'Select Party'}
                        </Badge>
                    </div>
                </Col>
            </Row>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-4">
                    <FiFileText className="me-2" />
                    {error}
                </Alert>
            )}

            {/* Main Content */}
            <Row className="g-4">
                {/* Left Column - Party Selection */}
                <Col lg={6}>
                    <Card className="h-100 shadow-sm border-0">
                        <Card.Header className="bg-primary text-white py-3">
                            <h5 className="mb-0 d-flex align-items-center">
                                <FiUser className="me-2" />
                                Select Party
                            </h5>
                        </Card.Header>
                        <Card.Body className="p-4">
                            {/* Search Box */}
                            <div className="mb-4">
                                <Form.Group>
                                    <Form.Label className="fw-semibold">Search Parties</Form.Label>
                                    <div className="position-relative">
                                        <FiSearch className="position-absolute top-50 start-3 translate-middle-y text-muted" />
                                        <Form.Control
                                            type="text"
                                            placeholder="Search by name, PAN, or phone..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="ps-5"
                                        />
                                    </div>
                                </Form.Group>
                            </div>

                            {/* Party Selection */}
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-semibold">Choose Party</Form.Label>
                                <Form.Select
                                    onChange={(e) => handlePartySelect(e.target.value)}
                                    disabled={loadingParties}
                                    size="lg"
                                    className="border-primary"
                                >
                                    <option value="">Select a party from the list</option>
                                    {filteredParties.map(party => (
                                        <option key={party._id} value={party._id}>
                                            {party.name} ( {party.pan || ''} )
                                            {party.companyGroups ? ` - ${party.companyGroups.name}` : ''}
                                        </option>
                                    ))}
                                </Form.Select>
                                {loadingParties && (
                                    <div className="text-center mt-3">
                                        <Spinner size="sm" animation="border" variant="primary" />
                                        <span className="ms-2 text-muted">Loading parties...</span>
                                    </div>
                                )}
                            </Form.Group>

                            {/* Parties Count */}
                            <div className="bg-light rounded p-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted">Available Parties</span>
                                    <Badge bg="primary" pill>
                                        {parties.length}
                                    </Badge>
                                </div>
                                {searchTerm && (
                                    <div className="d-flex justify-content-between align-items-center mt-2">
                                        <span className="text-muted">Filtered Results</span>
                                        <Badge bg="success" pill>
                                            {filteredParties.length}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Right Column - Summary & Actions */}
                <Col lg={6}>
                    {summary ? (
                        <Card className="h-100 shadow-sm border-0">
                            <Card.Header className="bg-success text-white py-3">
                                <h5 className="mb-0 d-flex align-items-center">
                                    <FiTrendingUp className="me-2" />
                                    Party Summary
                                </h5>
                            </Card.Header>
                            <Card.Body className="p-4">
                                {/* Party Info */}
                                <div className="mb-4 p-3 bg-light rounded">
                                    <h6 className="text-primary mb-2">
                                        <FiUser className="me-2" />
                                        {summary.party.name}
                                    </h6>
                                    <div className="row small text-muted">
                                        <Col sm={6}>PAN: {summary.party.pan || 'N/A'}</Col>
                                        <Col sm={6}>Group: {summary.party.companyGroups ? summary.party.companyGroups.name : ''}</Col>
                                    </div>
                                </div>

                                {/* Key Metrics */}
                                <Row className="g-3 mb-4">
                                    <Col md={6}>
                                        <div className="text-center p-3 border rounded bg-white">
                                            <FiDollarSign className="text-success mb-2 fs-4" />
                                            <h5 className="text-success mb-1">Rs. {formatCurrency(summary.summary.netSales)}</h5>
                                            <small className="text-muted">Net Sales</small>
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="text-center p-3 border rounded bg-white">
                                            <FiTrendingUp className="text-info mb-2 fs-4" />
                                            <h5 className="text-info mb-1">Rs. {formatCurrency(summary.summary.netSalesVAT)}</h5>
                                            <small className="text-muted">Net VAT</small>
                                        </div>
                                    </Col>
                                </Row>

                                {/* Balance Information */}
                                <div className="mb-4 p-3 border rounded">
                                    <h6 className="mb-3 text-primary">Balance Summary</h6>
                                    <Row className="g-2">
                                        <Col sm={6}>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Opening:</span>
                                                <strong className={summary.summary.openingBalance >= 0 ? 'text-success' : 'text-danger'}>
                                                    Rs. {formatCurrency(Math.abs(summary.summary.openingBalance))} {summary.summary.openingBalance >= 0 ? 'Dr' : 'Cr'}
                                                </strong>
                                            </div>
                                        </Col>
                                        <Col sm={6}>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Closing:</span>
                                                <strong className={summary.summary.closingBalance >= 0 ? 'text-success' : 'text-danger'}>
                                                    Rs. {formatCurrency(Math.abs(summary.summary.closingBalance))} {summary.summary.closingBalance >= 0 ? 'Dr' : 'Cr'}
                                                </strong>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>

                                {/* Action Buttons */}
                                <div className="d-grid gap-2">
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={() => setShowPreview(true)}
                                        className="d-flex align-items-center justify-content-center"
                                    >
                                        <FiFileText className="me-2" />
                                        Generate
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    ) : (
                        <Card className="h-100 shadow-sm border-0">
                            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center p-5">
                                <FiUser className="text-muted mb-3" size={48} />
                                <h5 className="text-muted mb-2">No Party Selected</h5>
                                <p className="text-muted mb-0">
                                    Select a party from the left panel to view summary and generate confirmation letter.
                                </p>
                            </Card.Body>
                        </Card>
                    )}
                </Col>
            </Row>

            {/* Confirmation Letter Preview Modal */}
            <Modal show={showPreview} onHide={() => setShowPreview(false)} size="xl" fullscreen>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title className="d-flex align-items-center">
                        <FiFileText className="me-2" />
                        VAT and Balance Confirmation Letter
                        {selectedParty && (
                            <span className="ms-2">- {selectedParty.name}</span>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {summary && (
                        <div className="confirmation-letter-preview">
                            {/* <Row className="mb-4">
                                <Col md={6}>
                                    <div className="border p-3 bg-light rounded">
                                        <h6 className="text-primary">From:</h6>
                                        <strong>{summary.company.name}</strong><br />
                                        Address: {summary.company.address}<br />
                                        Phone: {summary.company.phone}<br />
                                        PAN: {summary.company.pan}
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="border p-3 bg-light rounded">
                                        <h6 className="text-primary">To:</h6>
                                        <strong>{summary.party.name}</strong><br />
                                        Address: {summary.party.address}<br />
                                        Phone: {summary.party.phone}<br />
                                        PAN: {summary.party.pan}
                                    </div>
                                </Col>
                            </Row> */}

                            {/* Transaction Summary Table */}
                            <Table bordered className="mb-4">
                                <thead className="table-light">
                                    <tr>
                                        <th>Head Details</th>
                                        <th className="text-end">Transaction Amount</th>
                                        <th className="text-end">VAT Amount</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Sales Section */}
                                    <tr>
                                        <td><strong>Taxable Sales</strong></td>
                                        <td className="text-end">{formatCurrency(summary.summary.taxableSales)}</td>
                                        <td className="text-end">{formatCurrency(summary.summary.taxableSalesVAT)}</td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Non-Taxable Sales</strong></td>
                                        <td className="text-end">{formatCurrency(summary.summary.nonTaxableSales)}</td>
                                        <td className="text-end">-</td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Less: Sales Return</strong></td>
                                        <td className="text-end">({formatCurrency(summary.summary.salesReturn)})</td>
                                        <td className="text-end">({formatCurrency(summary.summary.salesReturnVAT)})</td>
                                        <td></td>
                                    </tr>
                                    <tr className="table-active">
                                        <td><strong>Net Sales</strong></td>
                                        <td className="text-end"><strong>{formatCurrency(summary.summary.netSales)}</strong></td>
                                        <td className="text-end"><strong>{formatCurrency(summary.summary.netSalesVAT)}</strong></td>
                                        <td></td>
                                    </tr>

                                    {/* Purchase Section */}
                                    <tr>
                                        <td><strong>Taxable Purchases</strong></td>
                                        <td className="text-end">{formatCurrency(summary.summary.taxablePurchase)}</td>
                                        <td className="text-end">{formatCurrency(summary.summary.taxablePurchaseVAT)}</td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Non-Taxable Purchase</strong></td>
                                        <td className="text-end">{formatCurrency(summary.summary.nonTaxablePurchase)}</td>
                                        <td className="text-end">-</td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Less: Purchase Return</strong></td>
                                        <td className="text-end">({formatCurrency(summary.summary.purchaseReturn)})</td>
                                        <td className="text-end">({formatCurrency(summary.summary.purchaseReturnVAT)})</td>
                                        <td></td>
                                    </tr>
                                    <tr className="table-active">
                                        <td><strong>Net Purchases</strong></td>
                                        <td className="text-end"><strong>{formatCurrency(summary.summary.netPurchase)}</strong></td>
                                        <td className="text-end"><strong>{formatCurrency(summary.summary.netPurchaseVAT)}</strong></td>
                                        <td></td>
                                    </tr>

                                    {/* Balance Section */}
                                    <tr>
                                        <td><strong>Opening Balance as on {formatDate(summary.period.start)}</strong></td>
                                        <td className="text-end">{formatCurrency(Math.abs(summary.summary.openingBalance))} {summary.summary.openingBalance >= 0 ? 'Dr' : 'Cr'}</td>
                                        <td className="text-end">-</td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Closing Balance as on {formatDate(summary.period.end)}</strong></td>
                                        <td className="text-end">{formatCurrency(Math.abs(summary.summary.closingBalance))} {summary.summary.closingBalance >= 0 ? 'Dr' : 'Cr'}</td>
                                        <td className="text-end">-</td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-light">
                    <Button variant="outline-secondary" onClick={() => setShowPreview(false)}>
                        Close
                    </Button>
                    <Button variant="outline-primary" onClick={handlePrint} className="d-flex align-items-center">
                        <FiPrinter className="me-2" />
                        Print
                    </Button>
                    <Button variant="primary" onClick={handleDownloadPDF} className="d-flex align-items-center">
                        <FiDownload className="me-2" />
                        Download PDF
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Loading State */}
            {loading && (
                <div className="text-center p-5">
                    <Spinner animation="border" variant="primary" size="lg" />
                    <p className="mt-3 text-muted">Loading party summary...</p>
                </div>
            )}
        </Container>
    );
};

export default VATConfirmationLetter;