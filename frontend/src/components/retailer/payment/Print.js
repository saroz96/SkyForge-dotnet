// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { Container, Card, Button, Table } from 'react-bootstrap';
// import { BiPrinter, BiArrowBack, BiSolidFilePdf } from 'react-icons/bi';
// import NepaliDate from 'nepali-date-converter';
// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';
// import axios from 'axios';

// const PaymentVoucherPrint = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [paymentData, setPaymentData] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [firstBill, setFirstBill] = useState(false);
//     const printableRef = useRef();

//     // API instance with JWT token
//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // Add authorization header to all requests
//     api.interceptors.request.use(
//         (config) => {
//             const token = localStorage.getItem('token');
//             if (token) {
//                 config.headers.Authorization = `Bearer ${token}`;
//             }
//             return config;
//         },
//         (error) => {
//             return Promise.reject(error);
//         }
//     );

//     useEffect(() => {
//         const fetchPaymentData = async () => {
//             try {
//                 setLoading(true);
//                 const response = await api.get(`/api/retailer/payments/${id}/print`);

//                 if (!response.data.success) {
//                     throw new Error(response.data.error || 'Failed to fetch payment data');
//                 }

//                 setPaymentData(response.data.data);
//                 setFirstBill(response.data.data.firstBill || false);
//                 setLoading(false);
//             } catch (err) {
//                 console.error('Error fetching payment data:', err);
//                 setError(err.response?.data?.error || err.message || 'Failed to fetch payment data');
//                 setLoading(false);
//             }
//         };

//         fetchPaymentData();
//     }, [id]);

//     const printVoucher = () => {
//         const printContents = document.getElementById('printableContent').cloneNode(true);
//         const styles = document.getElementById('printStyles').innerHTML;

//         const printWindow = window.open('', '_blank', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');

//         printWindow.document.write(`
//             <html>
//                 <head>
//                     <title>Payment_Voucher_${paymentData.payment.billNumber}</title>
//                     <style>${styles}</style>
//                 </head>
//                 <body>
//                     ${printContents.innerHTML}
//                     <script>
//                         window.onload = function() {
//                             setTimeout(function() {
//                                 window.print();
//                                 window.close();
//                             }, 200);
//                         };
//                     <\/script>
//                 </body>
//             </html>
//         `);

//         printWindow.document.close();
//     };

//     const generatePdf = async () => {
//         if (!printableRef.current) return;

//         try {
//             const originalText = document.querySelector('.pdf-button-text');
//             if (originalText) {
//                 originalText.textContent = 'Generating PDF...';
//             }

//             const element = printableRef.current.cloneNode(true);
//             element.style.display = 'block';
//             element.style.width = '210mm';
//             element.style.margin = '0 auto';

//             const tempContainer = document.createElement('div');
//             tempContainer.style.position = 'absolute';
//             tempContainer.style.left = '-9999px';
//             tempContainer.appendChild(element);
//             document.body.appendChild(tempContainer);

//             const canvas = await html2canvas(element, {
//                 scale: 2,
//                 useCORS: true,
//                 allowTaint: true,
//                 scrollX: 0,
//                 scrollY: 0,
//                 windowWidth: element.scrollWidth,
//                 windowHeight: element.scrollHeight
//             });

//             document.body.removeChild(tempContainer);

//             const imgData = canvas.toDataURL('image/png');
//             const pdf = new jsPDF({
//                 orientation: 'portrait',
//                 unit: 'mm',
//                 format: 'a4'
//             });

//             const imgWidth = 210;
//             const pageHeight = 295;
//             const imgHeight = canvas.height * imgWidth / canvas.width;

//             let heightLeft = imgHeight;
//             let position = 0;

//             pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
//             heightLeft -= pageHeight;

//             while (heightLeft >= 0) {
//                 position = heightLeft - imgHeight;
//                 pdf.addPage();
//                 pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
//                 heightLeft -= pageHeight;
//             }

//             pdf.save(`Payment_Voucher_${paymentData.payment.billNumber}.pdf`);

//             if (originalText) {
//                 originalText.textContent = 'PDF';
//             }
//         } catch (error) {
//             console.error('Error generating PDF:', error);
//             alert('Failed to generate PDF. Please try again.');

//             const originalText = document.querySelector('.pdf-button-text');
//             if (originalText) {
//                 originalText.textContent = 'PDF';
//             }
//         }
//     };

//     const numberToWords = (num) => {
//         const ones = [
//             '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
//             'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
//             'Seventeen', 'Eighteen', 'Nineteen'
//         ];

//         const tens = [
//             '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
//         ];

//         const scales = ['', 'Thousand', 'Million', 'Billion'];

//         const convertHundreds = (num) => {
//             let words = '';

//             if (num > 99) {
//                 words += ones[Math.floor(num / 100)] + ' Hundred ';
//                 num %= 100;
//             }

//             if (num > 19) {
//                 words += tens[Math.floor(num / 10)] + ' ';
//                 num %= 10;
//             }

//             if (num > 0) {
//                 words += ones[num] + ' ';
//             }

//             return words.trim();
//         };

//         if (num === 0) return 'Zero';
//         if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));

//         let words = '';

//         for (let i = 0; i < scales.length; i++) {
//             let unit = Math.pow(1000, scales.length - i - 1);
//             let currentNum = Math.floor(num / unit);

//             if (currentNum > 0) {
//                 words += convertHundreds(currentNum) + ' ' + scales[scales.length - i - 1] + ' ';
//             }

//             num %= unit;
//         }

//         return words.trim();
//     };

//     const numberToWordsWithPaisa = (amount) => {
//         const rupees = Math.floor(amount);
//         const paisa = Math.round((amount - rupees) * 100);

//         let result = numberToWords(rupees) + ' Rupees';

//         if (paisa > 0) {
//             result += ' and ' + numberToWords(paisa) + ' Paisa';
//         }

//         return result;
//     };

//     const handleBack = () => {
//         navigate(-1);
//     };

//     const formatTo2Decimal = (num) => {
//         if (num === null || num === undefined) return '0.00';
//         const rounded = Math.round(num * 100) / 100;
//         const parts = rounded.toString().split(".");
//         if (!parts[1]) return parts[0] + ".00";
//         if (parts[1].length === 1) return parts[0] + "." + parts[1] + "0";
//         return rounded.toString();
//     };

//     const formatDate = (dateString, format = 'english') => {
//         if (!dateString) return 'N/A';

//         try {
//             const date = new Date(dateString);
//             if (isNaN(date.getTime())) return 'N/A';

//             if (format === 'nepali') {
//                 // Convert to Nepali date
//                 const nepaliDate = new NepaliDate(date);
//                 return nepaliDate.format('YYYY-MM-DD');
//             }

//             // English format
//             const year = date.getFullYear();
//             const month = String(date.getMonth() + 1).padStart(2, '0');
//             const day = String(date.getDate()).padStart(2, '0');
//             return `${year}-${month}-${day}`;
//         } catch (e) {
//             console.error('Date formatting error:', e);
//             return 'N/A';
//         }
//     };

//     const getInstrumentTypeName = (type) => {
//         if (!type) return 'N/A';

//         // Convert to string and handle different formats
//         const typeStr = type.toString().toLowerCase();

//         switch (typeStr) {
//             case '1':
//             case 'rtgs':
//                 return 'RTGS';
//             case '2':
//             case 'fonepay':
//                 return 'Fonepay';
//             case '3':
//             case 'cheque':
//                 return 'Cheque';
//             case '4':
//             case 'connectips':
//             case 'connect-ips':
//                 return 'Connect-Ips';
//             case '5':
//             case 'esewa':
//                 return 'Esewa';
//             case '6':
//             case 'khalti':
//                 return 'Khalti';
//             case '0':
//             case 'na':
//             case 'n/a':
//             default:
//                 return 'N/A';
//         }
//     };

//     if (loading) return (
//         <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
//             <div className="spinner-border text-primary" role="status">
//                 <span className="visually-hidden">Loading...</span>
//             </div>
//         </div>
//     );

//     if (error) return (
//         <Container fluid className="mt-4">
//             <div className="alert alert-danger" role="alert">
//                 <h4 className="alert-heading">Error!</h4>
//                 <p>{error}</p>
//                 <hr />
//                 <Button variant="outline-danger" onClick={handleBack}>
//                     <BiArrowBack /> Go Back
//                 </Button>
//             </div>
//         </Container>
//     );

//     if (!paymentData || !paymentData.payment) return (
//         <Container fluid className="mt-4">
//             <div className="alert alert-warning" role="alert">
//                 <h4 className="alert-heading">No Data</h4>
//                 <p>No payment data found</p>
//                 <hr />
//                 <Button variant="outline-warning" onClick={handleBack}>
//                     <BiArrowBack /> Go Back
//                 </Button>
//             </div>
//         </Container>
//     );

//     const payment = paymentData.payment;
//     const isCanceled = payment.status === 'Canceled';

//     return (
//         <>
//             <style id="printStyles">
//                 {`
//                 @media print {
//                     @page {
//                         size: A4;
//                         margin: 5mm;
//                     }

//                     body {
//                         font-family: 'Arial Narrow', Arial, sans-serif;
//                         font-size: 9pt;
//                         line-height: 1.2;
//                         color: #000;
//                         background: white;
//                         margin: 0;
//                         padding: 0;
//                     }

//                     .print-voucher-container {
//                         width: 100%;
//                         max-width: 210mm;
//                         margin: 0 auto;
//                         padding: 2mm;
//                     }

//                     .print-voucher-header {
//                         text-align: center;
//                         margin-bottom: 3mm;
//                         border-bottom: 1px solid #000;
//                         padding-bottom: 2mm;
//                     }

//                     .print-voucher-title {
//                         font-size: 12pt;
//                         font-weight: bold;
//                         margin: 2mm 0;
//                         text-transform: uppercase;
//                     }

//                     .print-company-name {
//                         font-size: 16pt;
//                         font-weight: bold;
//                     }

//                     .print-company-details {
//                         font-size: 8pt;
//                         margin: 1mm 0;
//                         font-weight: bold;
//                     }

//                     .print-voucher-details {
//                         display: flex;
//                         justify-content: space-between;
//                         margin: 2mm 0;
//                         font-size: 8pt;
//                     }

//                     .print-voucher-table {
//                         width: 100%;
//                         border-collapse: collapse;
//                         margin: 3mm 0;
//                         font-size: 8pt;
//                         border: none;
//                         table-layout: fixed;
//                     }

//                     .print-voucher-table thead {
//                         border-top: 1px solid #000;
//                         border-bottom: 1px solid #000;
//                     }

//                     .print-voucher-table th {
//                         background-color: transparent;
//                         border: none;
//                         padding: 1mm;
//                         text-align: left;
//                         font-weight: bold;
//                     }

//                     .print-voucher-table td {
//                         border: none;
//                         padding: 1mm;
//                         border-bottom: 1px solid #eee;
//                     }

//                     /* Fixed column widths for print - Payment specific */
//                     .print-voucher-table th:nth-child(1),
//                     .print-voucher-table td:nth-child(1) {
//                         width: 10%;
//                         text-align: center;
//                     }

//                     .print-voucher-table th:nth-child(2),
//                     .print-voucher-table td:nth-child(2) {
//                         width: 50%;
//                     }

//                     .print-voucher-table th:nth-child(3),
//                     .print-voucher-table td:nth-child(3) {
//                         width: 20%;
//                         text-align: right;
//                     }

//                     .print-voucher-table th:nth-child(4),
//                     .print-voucher-table td:nth-child(4) {
//                         width: 20%;
//                         text-align: right;
//                         padding-right: 2mm;
//                     }

//                     /* Ensure numbers are fully visible */
//                     .print-voucher-table td:nth-child(3),
//                     .print-voucher-table td:nth-child(4) {
//                         white-space: nowrap;
//                         overflow: visible !important;
//                         text-overflow: clip !important;
//                     }

//                     .print-text-right {
//                         text-align: right;
//                         padding-right: 2mm;
//                     }

//                     .print-text-center {
//                         text-align: center;
//                     }

//                     .print-payment-details {
//                         margin-top: 3mm;
//                         font-size: 8pt;
//                         padding: 1mm;
//                     }

//                     .print-signature-area {
//                         display: flex;
//                         justify-content: space-between;
//                         margin-top: 5mm;
//                         font-size: 8pt;
//                     }

//                     .print-signature-box {
//                         text-align: center;
//                         width: 30%;
//                         border-top: 1px solid #000;
//                         padding-top: 1mm;
//                         font-weight: bold;
//                     }

//                     .text-danger {
//                         color: #dc3545 !important;
//                     }

//                     .no-print {
//                         display: none;
//                     }

//                     .screen-version {
//                         display: none;
//                     }
//                 }

//                 @media screen {
//                     .print-version {
//                         display: none;
//                     }

//                     /* Compact Screen Version */
//                     .container {
//                         max-width: 100%;
//                         padding: 5px;
//                     }

//                     .card {
//                         border: 1px solid #ddd;
//                         margin: 5px 0;
//                         padding: 8px;
//                         box-shadow: 0 0 5px rgba(0,0,0,0.1);
//                         font-size: 12px;
//                     }

//                     .header {
//                         text-align: center;
//                         margin-bottom: 8px;
//                     }

//                     .header h1 {
//                         margin: 0;
//                         font-size: 18px;
//                         font-weight: bold;
//                         line-height: 1.1;
//                     }

//                     .header h2 {
//                         font-size: 14px;
//                         margin: 5px 0;
//                         line-height: 1.1;
//                     }

//                     .header h4 {
//                         font-size: 11px;
//                         margin: 3px 0;
//                         line-height: 1.1;
//                     }

//                     .details-container {
//                         display: flex;
//                         justify-content: space-between;
//                         margin-bottom: 8px;
//                         font-size: 11px;
//                         line-height: 1.1;
//                     }

//                     .table {
//                         width: 100%;
//                         border-collapse: collapse;
//                         margin-top: 5px;
//                         font-size: 11px;
//                         table-layout: fixed;
//                     }

//                     .table th {
//                         background-color: #f0f0f0;
//                         border: 1px solid #ddd;
//                         padding: 4px;
//                         text-align: left;
//                         height: 25px;
//                     }

//                     .table td {
//                         border: 1px solid #ddd;
//                         padding: 3px;
//                         text-align: left;
//                         height: 25px;
//                         vertical-align: top;
//                     }

//                     /* Compact column widths for screen - Payment specific */
//                     .table th:nth-child(1),
//                     .table td:nth-child(1) {
//                         width: 10%;
//                         text-align: center;
//                     }

//                     .table th:nth-child(2),
//                     .table td:nth-child(2) {
//                         width: 50%;
//                     }

//                     .table th:nth-child(3),
//                     .table td:nth-child(3) {
//                         width: 20%;
//                         text-align: right;
//                     }

//                     .table th:nth-child(4),
//                     .table td:nth-child(4) {
//                         width: 20%;
//                         text-align: right;
//                     }

//                     .payment-details {
//                         margin-top: 5px;
//                         font-size: 11px;
//                         line-height: 1.1;
//                     }

//                     .signature-area {
//                         margin-top: 15px;
//                         display: flex;
//                         justify-content: space-between;
//                     }

//                     .signature-box {
//                         width: 30%;
//                         text-align: center;
//                         border-top: 1px solid #000;
//                         padding-top: 5px;
//                         font-size: 11px;
//                         height: 40px;
//                     }

//                     .total-table {
//                         width: 40%;
//                         float: right;
//                         margin-top: 10px;
//                         font-size: 11px;
//                     }

//                     .total-table table {
//                         font-size: 11px;
//                     }

//                     .total-table td {
//                         padding: 2px;
//                         height: 20px;
//                     }

//                     .amount-in-words {
//                         font-style: italic;
//                         margin-top: 5px;
//                         font-size: 11px;
//                         line-height: 1.1;
//                     }

//                     hr {
//                         border-top: 1px solid #000;
//                         margin: 5px 0;
//                     }

//                     .btn {
//                         padding: 3px 8px;
//                         font-size: 12px;
//                     }

//                     .btn svg {
//                         width: 14px;
//                         height: 14px;
//                     }

//                     /* Utility classes for better spacing */
//                     .compact-text {
//                         line-height: 1;
//                         margin: 0;
//                         padding: 0;
//                     }

//                     .compact-row {
//                         margin: 0;
//                         padding: 0;
//                     }

//                     .no-overflow {
//                         overflow: hidden;
//                         text-overflow: ellipsis;
//                         white-space: nowrap;
//                     }

//                     .wrap-text {
//                         word-wrap: break-word;
//                         overflow-wrap: break-word;
//                         white-space: normal;
//                     }

//                     .text-danger {
//                         color: #dc3545;
//                     }
//                 }
//                 `}
//             </style>

//             {/* Screen Version - Compact */}
//             <div className="screen-version">
//                 <Container fluid>
//                     <div className="d-flex justify-content-end mb-2">
//                         <Button variant="secondary" size="sm" className="me-2" onClick={handleBack}>
//                             <BiArrowBack /> Back
//                         </Button>
//                         <Button variant="primary" size="sm" className="me-2" onClick={generatePdf}>
//                             <BiSolidFilePdf /> <span className="pdf-button-text">PDF</span>
//                         </Button>
//                         <Button variant="info" size="sm" onClick={printVoucher}>
//                             <BiPrinter /> Print
//                         </Button>
//                     </div>

//                     <Card className="p-4">
//                         <div className="header compact-text">
//                             <h1 className="compact-text">{paymentData.currentCompanyName}</h1>
//                             <h4 className="compact-text">
//                                 {paymentData.currentCompany.address}, {paymentData.currentCompany.city}
//                                 <br />
//                                 Tel: {paymentData.currentCompany.phone} | PAN: {paymentData.currentCompany.pan}
//                             </h4>
//                             <h2 className="compact-text">PAYMENT VOUCHER</h2>
//                         </div>
//                         <br />
//                         <div className="details-container compact-text">
//                             <div className="left">
//                                 <div><strong>Vch. No:</strong> {payment.billNumber}</div>
//                             </div>
//                             <div className="right">
//                                 <div><strong>Date:</strong> {paymentData.companyDateFormat === 'Nepali' ? formatDate(payment.nepaliDate, 'nepali') : formatDate(payment.date)}</div>
//                             </div>
//                         </div>

//                         <hr className="my-1" />

//                         <Table bordered size="sm">
//                             <thead>
//                                 <tr>
//                                     <th>S.N</th>
//                                     <th>Particular</th>
//                                     <th>Debit Amount</th>
//                                     <th>Credit Amount</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 <tr>
//                                     <td>1</td>
//                                     <td>
//                                         {!isCanceled ?
//                                             payment.account?.name :
//                                             <span className="text-danger">Canceled</span>}
//                                     </td>
//                                     <td className="text-right">
//                                         {!isCanceled ?
//                                             formatTo2Decimal(payment.debit) :
//                                             <span className="text-danger">0.00</span>}
//                                     </td>
//                                     <td className="text-right">0.00</td>
//                                 </tr>
//                                 <tr>
//                                     <td>2</td>
//                                     <td>
//                                         {!isCanceled ?
//                                             payment.paymentAccount?.name :
//                                             <span className="text-danger">Canceled</span>}
//                                     </td>
//                                     <td className="text-right">0.00</td>
//                                     <td className="text-right">
//                                         {!isCanceled ?
//                                             formatTo2Decimal(payment.debit) :
//                                             <span className="text-danger">0.00</span>}
//                                     </td>
//                                 </tr>
//                                 <tr style={{ borderTop: '2px solid #000' }}>
//                                     <td colSpan="2" className="text-right"><strong>Total</strong></td>
//                                     <td className="text-right">
//                                         <strong>
//                                             {!isCanceled ?
//                                                 formatTo2Decimal(payment.debit) :
//                                                 <span className="text-danger">0.00</span>}
//                                         </strong>
//                                     </td>
//                                     <td className="text-right">
//                                         <strong>
//                                             {!isCanceled ?
//                                                 formatTo2Decimal(payment.debit) :
//                                                 <span className="text-danger">0.00</span>}
//                                         </strong>
//                                     </td>
//                                 </tr>
//                             </tbody>
//                         </Table>

//                         <div className="payment-details compact-text">
//                             <div><strong>Note:</strong> {payment.description || 'N/A'}</div>
//                             <div className="mt-1">
//                                 <span className="me-3"><strong>Mode of Payment:</strong> {getInstrumentTypeName(payment.instType)}</span>
//                                 <span><strong>Inst No:</strong> {payment.instNo || 'N/A'}</span>
//                             </div>
//                         </div>

//                         <div className="amount-in-words compact-text">
//                             <strong>In Words:</strong> {numberToWordsWithPaisa(payment.debit)} Only.
//                         </div>

//                         <div className="signature-area">
//                             <div className="signature-box">
//                                 <div className="compact-text"><strong>{payment.user?.name || 'N/A'}</strong></div>
//                                 Prepared By
//                             </div>
//                             <div className="signature-box">
//                                 <div className="compact-text">&nbsp;</div>
//                                 Checked By
//                             </div>
//                             <div className="signature-box">
//                                 <div className="compact-text">&nbsp;</div>
//                                 Approved By
//                             </div>
//                         </div>
//                     </Card>
//                 </Container>
//             </div>

//             {/* Printable Version */}
//             <div id="printableContent" className="print-version" ref={printableRef}>
//                 <div className="print-voucher-container">
//                     <div className="print-voucher-header">
//                         <div className="print-company-name">{paymentData.currentCompanyName}</div>
//                         <div className="print-company-details">
//                             {paymentData.currentCompany.address}, {paymentData.currentCompany.city}
//                             <br />
//                             Tel: {paymentData.currentCompany.phone} | PAN: {paymentData.currentCompany.pan}
//                         </div>
//                         <div className="print-voucher-title">PAYMENT VOUCHER</div>
//                     </div>

//                     <div className="print-voucher-details">
//                         <div>
//                             <div><strong>Vch. No:</strong> {payment.billNumber}</div>
//                         </div>
//                         <div>
//                             <div><strong>Date:</strong> {paymentData.companyDateFormat === 'Nepali' ? formatDate(payment.nepaliDate, 'nepali') : formatDate(payment.date)}</div>
//                         </div>
//                     </div>

//                     <table className="print-voucher-table">
//                         <thead>
//                             <tr>
//                                 <th>S.N</th>
//                                 <th>Particular</th>
//                                 <th>Debit Amount</th>
//                                 <th>Credit Amount</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             <tr>
//                                 <td className="print-text-center">1</td>
//                                 <td>
//                                     {!isCanceled ?
//                                         payment.account?.name :
//                                         <span className="text-danger">Canceled</span>}
//                                 </td>
//                                 <td className="print-text-right">
//                                     {!isCanceled ?
//                                         formatTo2Decimal(payment.debit) :
//                                         <span className="text-danger">0.00</span>}
//                                 </td>
//                                 <td className="print-text-right">0.00</td>
//                             </tr>
//                             <tr>
//                                 <td className="print-text-center">2</td>
//                                 <td>
//                                     {!isCanceled ?
//                                         payment.paymentAccount?.name :
//                                         <span className="text-danger">Canceled</span>}
//                                 </td>
//                                 <td className="print-text-right">0.00</td>
//                                 <td className="print-text-right">
//                                     {!isCanceled ?
//                                         formatTo2Decimal(payment.debit) :
//                                         <span className="text-danger">0.00</span>}
//                                 </td>
//                             </tr>
//                         </tbody>
//                         <tr>
//                             <td colSpan="4" style={{ borderBottom: '1px solid #000' }}></td>
//                         </tr>
//                     </table>

//                     <div className="print-payment-details">
//                         <div><strong>Note:</strong> {payment.description || 'N/A'}</div>
//                         <div style={{ marginTop: '1mm' }}>
//                             <div><strong>Mode of Payment:</strong> {getInstrumentTypeName(payment.instType)}</div>
//                             <div><strong>Inst No:</strong> {payment.instNo || 'N/A'}</div>
//                         </div>
//                     </div>

//                     <div className="print-amount-in-words" style={{ marginTop: '3mm', padding: '1mm', border: '1px dashed #000' }}>
//                         <strong>In Words:</strong> {numberToWordsWithPaisa(payment.debit)} Only.
//                     </div>

//                     <br /><br />
//                     <div className="print-signature-area">
//                         <div className="print-signature-box">
//                             <div style={{ marginBottom: '1mm' }}>
//                                 <strong>{payment.user?.name || 'N/A'}</strong>
//                             </div>
//                             Prepared By
//                         </div>
//                         <div className="print-signature-box">
//                             <div style={{ marginBottom: '1mm' }}>&nbsp;</div>
//                             Checked By
//                         </div>
//                         <div className="print-signature-box">
//                             <div style={{ marginBottom: '1mm' }}>&nbsp;</div>
//                             Approved By
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </>
//     );
// };

// export default PaymentVoucherPrint;

//---------------------------------------------------------------end

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Table } from 'react-bootstrap';
import { BiPrinter, BiArrowBack, BiSolidFilePdf } from 'react-icons/bi';
import NepaliDate from 'nepali-date-converter';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';

const PaymentVoucherPrint = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [paymentData, setPaymentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const printableRef = useRef();

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

    useEffect(() => {
        const fetchPaymentData = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/api/retailer/payments/${id}/print`);

                if (!response.data.success) {
                    throw new Error(response.data.error || 'Failed to fetch payment data');
                }

                console.log('Print data:', response.data.data); // Debug log
                setPaymentData(response.data.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching payment data:', err);
                setError(err.response?.data?.error || err.message || 'Failed to fetch payment data');
                setLoading(false);
            }
        };

        fetchPaymentData();
    }, [id]);

    const printVoucher = () => {
        const printContents = document.getElementById('printableContent').cloneNode(true);
        const styles = document.getElementById('printStyles').innerHTML;

        const printWindow = window.open('', '_blank', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Payment_Voucher_${paymentData.payment.billNumber}</title>
                    <style>${styles}</style>
                </head>
                <body>
                    ${printContents.innerHTML}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 200);
                        };
                    <\/script>
                </body>
            </html>
        `);

        printWindow.document.close();
    };

    const generatePdf = async () => {
        if (!printableRef.current) return;

        try {
            const originalText = document.querySelector('.pdf-button-text');
            if (originalText) {
                originalText.textContent = 'Generating PDF...';
            }

            const element = printableRef.current.cloneNode(true);
            element.style.display = 'block';
            element.style.width = '210mm';
            element.style.margin = '0 auto';

            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.appendChild(element);
            document.body.appendChild(tempContainer);

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                scrollX: 0,
                scrollY: 0,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            document.body.removeChild(tempContainer);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = canvas.height * imgWidth / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`Payment_Voucher_${paymentData.payment.billNumber}.pdf`);

            if (originalText) {
                originalText.textContent = 'PDF';
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');

            const originalText = document.querySelector('.pdf-button-text');
            if (originalText) {
                originalText.textContent = 'PDF';
            }
        }
    };

    const numberToWords = (num) => {
        const ones = [
            '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
            'Seventeen', 'Eighteen', 'Nineteen'
        ];

        const tens = [
            '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
        ];

        const scales = ['', 'Thousand', 'Million', 'Billion'];

        const convertHundreds = (num) => {
            let words = '';

            if (num > 99) {
                words += ones[Math.floor(num / 100)] + ' Hundred ';
                num %= 100;
            }

            if (num > 19) {
                words += tens[Math.floor(num / 10)] + ' ';
                num %= 10;
            }

            if (num > 0) {
                words += ones[num] + ' ';
            }

            return words.trim();
        };

        if (num === 0) return 'Zero';
        if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));

        let words = '';

        for (let i = 0; i < scales.length; i++) {
            let unit = Math.pow(1000, scales.length - i - 1);
            let currentNum = Math.floor(num / unit);

            if (currentNum > 0) {
                words += convertHundreds(currentNum) + ' ' + scales[scales.length - i - 1] + ' ';
            }

            num %= unit;
        }

        return words.trim();
    };

    const numberToWordsWithPaisa = (amount) => {
        const rupees = Math.floor(amount);
        const paisa = Math.round((amount - rupees) * 100);

        let result = numberToWords(rupees) + ' Rupees';

        if (paisa > 0) {
            result += ' and ' + numberToWords(paisa) + ' Paisa';
        }

        return result;
    };

    const handleBack = () => {
        navigate(-1);
    };

    const formatTo2Decimal = (num) => {
        if (num === null || num === undefined) return '0.00';
        const rounded = Math.round(num * 100) / 100;
        const parts = rounded.toString().split(".");
        if (!parts[1]) return parts[0] + ".00";
        if (parts[1].length === 1) return parts[0] + "." + parts[1] + "0";
        return rounded.toString();
    };

    const formatDate = (dateString, format = 'english') => {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';

            if (format === 'nepali') {
                const nepaliDate = new NepaliDate(date);
                return nepaliDate.format('YYYY-MM-DD');
            }

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error('Date formatting error:', e);
            return 'N/A';
        }
    };

    const getInstrumentTypeName = (type) => {
        if (!type) return 'N/A';
        const typeStr = type.toString().toLowerCase();

        switch (typeStr) {
            case '1':
            case 'rtgs':
                return 'RTGS';
            case '2':
            case 'fonepay':
                return 'Fonepay';
            case '3':
            case 'cheque':
                return 'Cheque';
            case '4':
            case 'connectips':
            case 'connect-ips':
                return 'Connect-Ips';
            case '5':
            case 'esewa':
                return 'Esewa';
            case '6':
            case 'khalti':
                return 'Khalti';
            default:
                return 'N/A';
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );

    if (error) return (
        <Container fluid className="mt-4">
            <div className="alert alert-danger" role="alert">
                <h4 className="alert-heading">Error!</h4>
                <p>{error}</p>
                <hr />
                <Button variant="outline-danger" onClick={handleBack}>
                    <BiArrowBack /> Go Back
                </Button>
            </div>
        </Container>
    );

    if (!paymentData || !paymentData.payment) return (
        <Container fluid className="mt-4">
            <div className="alert alert-warning" role="alert">
                <h4 className="alert-heading">No Data</h4>
                <p>No payment data found</p>
                <hr />
                <Button variant="outline-warning" onClick={handleBack}>
                    <BiArrowBack /> Go Back
                </Button>
            </div>
        </Container>
    );

    const payment = paymentData.payment;
    const debitEntries = paymentData.debitEntries || [];
    const creditEntries = paymentData.creditEntries || [];
    const isCanceled = payment.status === 'Canceled';

    // Calculate totals
    const totalDebit = debitEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const totalCredit = creditEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    return (
        <>
            <style id="printStyles">
                {`
                @media print {
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
                        border-bottom: 1px solid #000;
                        padding-bottom: 2mm;
                    }

                    .print-voucher-title {
                        font-size: 12pt;
                        font-weight: bold;
                        margin: 2mm 0;
                        text-transform: uppercase;
                    }

                    .print-company-name {
                        font-size: 16pt;
                        font-weight: bold;
                    }

                    .print-company-details {
                        font-size: 8pt;
                        margin: 1mm 0;
                        font-weight: bold;
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
                        border: none;
                        table-layout: fixed;
                    }

                    .print-voucher-table thead {
                        border-top: 1px solid #000;
                        border-bottom: 1px solid #000;
                    }

                    .print-voucher-table th {
                        background-color: transparent;
                        border: none;
                        padding: 1mm;
                        text-align: left;
                        font-weight: bold;
                    }

                    .print-voucher-table td {
                        border: none;
                        padding: 1mm;
                        border-bottom: 1px solid #eee;
                    }

                    .print-voucher-table th:nth-child(1),
                    .print-voucher-table td:nth-child(1) {
                        width: 10%;
                        text-align: center;
                    }

                    .print-voucher-table th:nth-child(2),
                    .print-voucher-table td:nth-child(2) {
                        width: 50%;
                    }

                    .print-voucher-table th:nth-child(3),
                    .print-voucher-table td:nth-child(3) {
                        width: 20%;
                        text-align: right;
                    }

                    .print-voucher-table th:nth-child(4),
                    .print-voucher-table td:nth-child(4) {
                        width: 20%;
                        text-align: right;
                        padding-right: 2mm;
                    }

                    .print-voucher-table td:nth-child(3),
                    .print-voucher-table td:nth-child(4) {
                        white-space: nowrap;
                        overflow: visible !important;
                        text-overflow: clip !important;
                    }

                    .print-text-right {
                        text-align: right;
                        padding-right: 2mm;
                    }

                    .print-text-center {
                        text-align: center;
                    }

                    .print-payment-details {
                        margin-top: 3mm;
                        font-size: 8pt;
                        padding: 1mm;
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
                        border-top: 1px solid #000;
                        padding-top: 1mm;
                        font-weight: bold;
                    }

                    .text-danger {
                        color: #dc3545 !important;
                    }

                    .no-print {
                        display: none;
                    }

                    .screen-version {
                        display: none;
                    }
                }

                @media screen {
                    .print-version {
                        display: none;
                    }

                    .container {
                        max-width: 100%;
                        padding: 5px;
                    }

                    .card {
                        border: 1px solid #ddd;
                        margin: 5px 0;
                        padding: 8px;
                        box-shadow: 0 0 5px rgba(0,0,0,0.1);
                        font-size: 12px;
                    }

                    .header {
                        text-align: center;
                        margin-bottom: 8px;
                    }

                    .header h1 {
                        margin: 0;
                        font-size: 18px;
                        font-weight: bold;
                        line-height: 1.1;
                    }

                    .header h2 {
                        font-size: 14px;
                        margin: 5px 0;
                        line-height: 1.1;
                    }

                    .header h4 {
                        font-size: 11px;
                        margin: 3px 0;
                        line-height: 1.1;
                    }

                    .details-container {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                        font-size: 11px;
                        line-height: 1.1;
                    }

                    .table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 5px;
                        font-size: 11px;
                        table-layout: fixed;
                    }

                    .table th {
                        background-color: #f0f0f0;
                        border: 1px solid #ddd;
                        padding: 4px;
                        text-align: left;
                        height: 25px;
                    }

                    .table td {
                        border: 1px solid #ddd;
                        padding: 3px;
                        text-align: left;
                        height: 25px;
                        vertical-align: top;
                    }

                    .table th:nth-child(1),
                    .table td:nth-child(1) {
                        width: 10%;
                        text-align: center;
                    }

                    .table th:nth-child(2),
                    .table td:nth-child(2) {
                        width: 50%;
                    }

                    .table th:nth-child(3),
                    .table td:nth-child(3) {
                        width: 20%;
                        text-align: right;
                    }

                    .table th:nth-child(4),
                    .table td:nth-child(4) {
                        width: 20%;
                        text-align: right;
                    }

                    .payment-details {
                        margin-top: 5px;
                        font-size: 11px;
                        line-height: 1.1;
                    }

                    .signature-area {
                        margin-top: 15px;
                        display: flex;
                        justify-content: space-between;
                    }

                    .signature-box {
                        width: 30%;
                        text-align: center;
                        border-top: 1px solid #000;
                        padding-top: 5px;
                        font-size: 11px;
                        height: 40px;
                    }

                    .total-table {
                        width: 40%;
                        float: right;
                        margin-top: 10px;
                        font-size: 11px;
                    }

                    .total-table table {
                        font-size: 11px;
                    }

                    .total-table td {
                        padding: 2px;
                        height: 20px;
                    }

                    .amount-in-words {
                        font-style: italic;
                        margin-top: 5px;
                        font-size: 11px;
                        line-height: 1.1;
                    }

                    hr {
                        border-top: 1px solid #000;
                        margin: 5px 0;
                    }

                    .btn {
                        padding: 3px 8px;
                        font-size: 12px;
                    }

                    .btn svg {
                        width: 14px;
                        height: 14px;
                    }

                    .compact-text {
                        line-height: 1;
                        margin: 0;
                        padding: 0;
                    }

                    .compact-row {
                        margin: 0;
                        padding: 0;
                    }

                    .no-overflow {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .wrap-text {
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        white-space: normal;
                    }

                    .text-danger {
                        color: #dc3545;
                    }
                }
                `}
            </style>

            {/* Screen Version - Compact */}
            <div className="screen-version">
                <Container fluid>
                    <div className="d-flex justify-content-end mb-2">
                        <Button variant="secondary" size="sm" className="me-2" onClick={handleBack}>
                            <BiArrowBack /> Back
                        </Button>
                        <Button variant="primary" size="sm" className="me-2" onClick={generatePdf}>
                            <BiSolidFilePdf /> <span className="pdf-button-text">PDF</span>
                        </Button>
                        <Button variant="info" size="sm" onClick={printVoucher}>
                            <BiPrinter /> Print
                        </Button>
                    </div>

                    <Card className="p-4">
                        <div className="header compact-text">
                            <h1 className="compact-text">{paymentData.currentCompanyName}</h1>
                            <h4 className="compact-text">
                                {paymentData.currentCompany.address}, {paymentData.currentCompany.city}
                                <br />
                                Tel: {paymentData.currentCompany.phone} | PAN: {paymentData.currentCompany.pan}
                            </h4>
                            <h2 className="compact-text">PAYMENT VOUCHER</h2>
                        </div>
                        <br />
                        <div className="details-container compact-text">
                            <div className="left">
                                <div><strong>Vch. No:</strong> {payment.billNumber}</div>
                            </div>
                            <div className="right">
                                <div><strong>Date:</strong> {paymentData.companyDateFormat === 'Nepali' ? formatDate(payment.nepaliDate, 'nepali') : formatDate(payment.date)}</div>
                            </div>
                        </div>

                        <hr className="my-1" />

                        <Table bordered size="sm">
                            <thead>
                                <tr>
                                    <th>S.N</th>
                                    <th>Particular</th>
                                    <th>Debit Amount</th>
                                    <th>Credit Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Debit Entries */}
                                {debitEntries.map((entry, index) => (
                                    <tr key={entry.id || index}>
                                        <td>{index + 1}</td>
                                        <td>
                                            {!isCanceled ? (
                                                <>
                                                    {entry.accountName}
                                                    {/* {entry.referenceNumber && (
                                                        <small className="d-block text-muted">
                                                            Ref: {entry.referenceNumber}
                                                        </small>
                                                    )} */}
                                                </>
                                            ) : (
                                                <span className="text-danger">Canceled</span>
                                            )}
                                        </td>
                                        <td className="text-right">
                                            {!isCanceled ? formatTo2Decimal(entry.amount) : <span className="text-danger">0.00</span>}
                                         </td>
                                        <td className="text-right">0.00</td>
                                    </tr>
                                ))}

                                {/* Credit Entries */}
                                {creditEntries.map((entry, index) => (
                                    <tr key={entry.id || index}>
                                        <td>{debitEntries.length + index + 1}</td>
                                        <td>
                                            {!isCanceled ? (
                                                <>
                                                    {entry.accountName}
                                                    {/* {entry.instType !== 'N/A' && (
                                                        <small className="d-block text-muted">
                                                            {entry.instType} {entry.instNo ? `- ${entry.instNo}` : ''}
                                                            {entry.bankAcc ? ` (${entry.bankAcc})` : ''}
                                                        </small>
                                                    )}
                                                    {entry.referenceNumber && (
                                                        <small className="d-block text-muted">
                                                            Ref: {entry.referenceNumber}
                                                        </small>
                                                    )} */}
                                                </>
                                            ) : (
                                                <span className="text-danger">Canceled</span>
                                            )}
                                        </td>
                                        <td className="text-right">0.00</td>
                                        <td className="text-right">
                                            {!isCanceled ? formatTo2Decimal(entry.amount) : <span className="text-danger">0.00</span>}
                                        </td>
                                    </tr>
                                ))}

                                <tr style={{ borderTop: '2px solid #000' }}>
                                    <td colSpan="2" className="text-right"><strong>Total</strong></td>
                                    <td className="text-right">
                                        <strong>
                                            {!isCanceled ? formatTo2Decimal(totalDebit) : <span className="text-danger">0.00</span>}
                                        </strong>
                                    </td>
                                    <td className="text-right">
                                        <strong>
                                            {!isCanceled ? formatTo2Decimal(totalCredit) : <span className="text-danger">0.00</span>}
                                        </strong>
                                    </td>
                                </tr>
                            </tbody>
                        </Table>

                        <div className="payment-details compact-text">
                            <div><strong>Note:</strong> {payment.description || 'N/A'}</div>
                            <div className="mt-1">
                                {creditEntries[0] && creditEntries[0].instType !== 'N/A' && (
                                    <span className="me-3">
                                        <strong>Mode of Payment:</strong> {getInstrumentTypeName(creditEntries[0].instType)}
                                    </span>
                                )}
                                {creditEntries[0] && creditEntries[0].bankAcc && (
                                    <span className="me-3">
                                        <strong>Bank:</strong> {creditEntries[0].bankAcc}
                                    </span>
                                )}
                                {creditEntries[0] && creditEntries[0].instNo && (
                                    <span>
                                        <strong>Inst No:</strong> {creditEntries[0].instNo}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="amount-in-words compact-text">
                            <strong>In Words:</strong> {numberToWordsWithPaisa(totalCredit)} Only.
                        </div>

                        <div className="signature-area">
                            <div className="signature-box">
                                <div className="compact-text"><strong>{payment.user?.name || 'N/A'}</strong></div>
                                Prepared By
                            </div>
                            <div className="signature-box">
                                <div className="compact-text">&nbsp;</div>
                                Checked By
                            </div>
                            <div className="signature-box">
                                <div className="compact-text">&nbsp;</div>
                                Approved By
                            </div>
                        </div>
                    </Card>
                </Container>
            </div>

            {/* Printable Version */}
            <div id="printableContent" className="print-version" ref={printableRef}>
                <div className="print-voucher-container">
                    <div className="print-voucher-header">
                        <div className="print-company-name">{paymentData.currentCompanyName}</div>
                        <div className="print-company-details">
                            {paymentData.currentCompany.address}, {paymentData.currentCompany.city}
                            <br />
                            Tel: {paymentData.currentCompany.phone} | PAN: {paymentData.currentCompany.pan}
                        </div>
                        <div className="print-voucher-title">PAYMENT VOUCHER</div>
                    </div>

                    <div className="print-voucher-details">
                        <div>
                            <div><strong>Vch. No:</strong> {payment.billNumber}</div>
                        </div>
                        <div>
                            <div><strong>Date:</strong> {paymentData.companyDateFormat === 'Nepali' ? formatDate(payment.nepaliDate, 'nepali') : formatDate(payment.date)}</div>
                        </div>
                    </div>

                    <table className="print-voucher-table">
                        <thead>
                            <tr>
                                <th>S.N</th>
                                <th>Particular</th>
                                <th>Debit Amount</th>
                                <th>Credit Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Debit Entries */}
                            {debitEntries.map((entry, index) => (
                                <tr key={entry.id || index}>
                                    <td className="print-text-center">{index + 1}</td>
                                    <td>
                                        {!isCanceled ? (
                                            <>
                                                {entry.accountName}
                                                {/* {entry.referenceNumber && (
                                                    <small className="d-block text-muted">
                                                        Ref: {entry.referenceNumber}
                                                    </small>
                                                )} */}
                                            </>
                                        ) : (
                                            <span className="text-danger">Canceled</span>
                                        )}
                                    </td>
                                    <td className="print-text-right">
                                        {!isCanceled ? formatTo2Decimal(entry.amount) : <span className="text-danger">0.00</span>}
                                    </td>
                                    <td className="print-text-right">0.00</td>
                                </tr>
                            ))}

                            {/* Credit Entries */}
                            {creditEntries.map((entry, index) => (
                                <tr key={entry.id || index}>
                                    <td className="print-text-center">{debitEntries.length + index + 1}</td>
                                    <td>
                                        {!isCanceled ? (
                                            <>
                                                {entry.accountName}
                                                {/* {entry.instType !== 'N/A' && (
                                                    <small className="d-block text-muted">
                                                        {entry.instType} {entry.instNo ? `- ${entry.instNo}` : ''}
                                                        {entry.bankAcc ? ` (${entry.bankAcc})` : ''}
                                                    </small>
                                                )}
                                                {entry.referenceNumber && (
                                                    <small className="d-block text-muted">
                                                        Ref: {entry.referenceNumber}
                                                    </small>
                                                )} */}
                                            </>
                                        ) : (
                                            <span className="text-danger">Canceled</span>
                                        )}
                                    </td>
                                    <td className="print-text-right">0.00</td>
                                    <td className="print-text-right">
                                        {!isCanceled ? formatTo2Decimal(entry.amount) : <span className="text-danger">0.00</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan="4" style={{ borderBottom: '1px solid #000' }}></td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="print-payment-details">
                        <div><strong>Note:</strong> {payment.description || 'N/A'}</div>
                        <div style={{ marginTop: '1mm' }}>
                            {creditEntries[0] && creditEntries[0].instType !== 'N/A' && (
                                <div><strong>Mode of Payment:</strong> {getInstrumentTypeName(creditEntries[0].instType)}</div>
                            )}
                            {creditEntries[0] && creditEntries[0].bankAcc && (
                                <div><strong>Bank:</strong> {creditEntries[0].bankAcc}</div>
                            )}
                            {creditEntries[0] && creditEntries[0].instNo && (
                                <div><strong>Inst No:</strong> {creditEntries[0].instNo}</div>
                            )}
                        </div>
                    </div>

                    <div className="print-amount-in-words" style={{ marginTop: '3mm', padding: '1mm', border: '1px dashed #000' }}>
                        <strong>In Words:</strong> {numberToWordsWithPaisa(totalCredit)} Only.
                    </div>

                    <br /><br />
                    <div className="print-signature-area">
                        <div className="print-signature-box">
                            <div style={{ marginBottom: '1mm' }}>
                                <strong>{payment.user?.name || 'N/A'}</strong>
                            </div>
                            Prepared By
                        </div>
                        <div className="print-signature-box">
                            <div style={{ marginBottom: '1mm' }}>&nbsp;</div>
                            Checked By
                        </div>
                        <div className="print-signature-box">
                            <div style={{ marginBottom: '1mm' }}>&nbsp;</div>
                            Approved By
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PaymentVoucherPrint;