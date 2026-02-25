// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { Container, Card, Button, Table } from 'react-bootstrap';
// import { BiPrinter, BiArrowBack, BiSolidFilePdf } from 'react-icons/bi';
// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';

// const PurchaseBillPrint = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [billData, setBillData] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [firstBill, setFirstBill] = useState(false);
//     const printableRef = useRef();

//     useEffect(() => {
//         const fetchBillData = async () => {
//             try {
//                 const response = await fetch(`/api/retailer/purchase/${id}/print`, {
//                     credentials: 'include'
//                 });
//                 const data = await response.json();

//                 if (!response.ok) {
//                     throw new Error(data.error || 'Failed to fetch bill data');
//                 }

//                 setBillData(data.data);
//                 setFirstBill(!data.data.bill.firstPrinted);
//                 setLoading(false);
//             } catch (err) {
//                 setError(err.message);
//                 setLoading(false);
//             }
//         };

//         fetchBillData();
//     }, [id]);

//     const printBill = () => {
//         const printContents = document.getElementById('printableContent').cloneNode(true);
//         const styles = document.getElementById('printStyles').innerHTML;

//         const printWindow = window.open('', '_blank', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');

//         printWindow.document.write(`
//             <html>
//                 <head>
//                     <title>Purchase_Invoice_${billData.bill.billNumber}</title>
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
//                     </script>
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

//             pdf.save(`Purchase_Invoice_${billData.bill.billNumber}.pdf`);

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
//         const rounded = Math.round(num * 100) / 100;
//         const parts = rounded.toString().split(".");
//         if (!parts[1]) return parts[0] + ".00";
//         if (parts[1].length === 1) return parts[0] + "." + parts[1] + "0";
//         return rounded.toString();
//     };

//     if (loading) return <div>Loading...</div>;
//     if (error) return <div>Error: {error}</div>;
//     if (!billData) return <div>No bill data found</div>;

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

//                     .print-invoice-container {
//                         width: 100%;
//                         max-width: 210mm;
//                         margin: 0 auto;
//                         padding: 2mm;
//                     }

//                     .print-invoice-header {
//                         text-align: center;
//                         margin-bottom: 3mm;
//                         border-bottom: 1px solid #000;
//                         padding-bottom: 2mm;
//                     }

//                     .print-invoice-title {
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
//                         font-weight:bold;
//                     }

//                     .print-invoice-details {
//                         display: flex;
//                         justify-content: space-between;
//                         margin: 2mm 0;
//                         font-size: 8pt;
//                     }

//                     .print-invoice-table {
//                         width: 100%;
//                         border-collapse: collapse;
//                         margin: 3mm 0;
//                         font-size: 8pt;
//                         border: none;
//                         table-layout: fixed;
//                     }

//                     .print-invoice-table thead {
//                         border-top: 1px solid #000;
//                         border-bottom: 1px solid #000;
//                     }

//                     .print-invoice-table th {
//                         background-color: transparent;
//                         border: none;
//                         padding: 1mm;
//                         text-align: left;
//                         font-weight: bold;
//                     }

//                     .print-invoice-table td {
//                         border: none;
//                         padding: 1mm;
//                         border-bottom: 1px solid #eee;
//                     }

//                     /* Fixed column widths for print - Purchase specific */
//                     .print-invoice-table th:nth-child(1),
//                     .print-invoice-table td:nth-child(1) {
//                         width: 4%;
//                     }

//                     .print-invoice-table th:nth-child(2),
//                     .print-invoice-table td:nth-child(2) {
//                         width: 7%;
//                     }

//                     .print-invoice-table th:nth-child(3),
//                     .print-invoice-table td:nth-child(3) {
//                         width: 8%;
//                     }

//                     .print-invoice-table th:nth-child(4),
//                     .print-invoice-table td:nth-child(4) {
//                         width: 20%;
//                     }

//                     .print-invoice-table th:nth-child(5),
//                     .print-invoice-table td:nth-child(5) {
//                         width: 6%;
//                     }

//                     .print-invoice-table th:nth-child(6),
//                     .print-invoice-table td:nth-child(6) {
//                         width: 8%;
//                     }

//                     .print-invoice-table th:nth-child(7),
//                     .print-invoice-table td:nth-child(7) {
//                         width: 8%;
//                     }

//                     .print-invoice-table th:nth-child(8),
//                     .print-invoice-table td:nth-child(8) {
//                         width: 6%;
//                         text-align: right;
//                     }

//                     .print-invoice-table th:nth-child(9),
//                     .print-invoice-table td:nth-child(9) {
//                         width: 5%;
//                         text-align: right;
//                     }

//                     .print-invoice-table th:nth-child(10),
//                     .print-invoice-table td:nth-child(10) {
//                         width: 10%;
//                         text-align: right;
//                     }

//                     .print-invoice-table th:nth-child(11),
//                     .print-invoice-table td:nth-child(11) {
//                         width: 8%;
//                         text-align: right;
//                     }

//                     .print-invoice-table th:nth-child(12),
//                     .print-invoice-table td:nth-child(12) {
//                         width: 5%;
//                         text-align: right;
//                     }

//                     .print-invoice-table th:nth-child(13),
//                     .print-invoice-table td:nth-child(13) {
//                         width: 10%;
//                         text-align: right;
//                         padding-right: 2mm;
//                     }

//                     /* Ensure numbers are fully visible */
//                     .print-invoice-table td:nth-child(10),
//                     .print-invoice-table td:nth-child(11),
//                     .print-invoice-table td:nth-child(12),
//                     .print-invoice-table td:nth-child(13) {
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

//                     .print-amount-in-words {
//                         font-size: 8pt;
//                         margin: 2mm 0;
//                         padding: 1mm;
//                         border: 1px dashed #000;
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
//                         font-weight:bold;
//                     }

//                     .print-totals-table {
//                         width: 60%;
//                         margin-left: auto;
//                         border-collapse: collapse;
//                         font-size: 8pt;
//                     }

//                     .print-totals-table td {
//                         padding: 1mm;
//                     }

//                     .print-totals-table td:nth-child(2) {
//                         text-align: right;
//                         padding-right: 2mm;
//                         width: 40%;
//                         white-space: nowrap;
//                         overflow: visible !important;
//                         text-overflow: clip !important;
//                     }

//                     .print-footer {
//                         text-align: center;
//                         font-size: 7pt;
//                         margin-top: 3mm;
//                         border-top: 1px solid #000;
//                         padding-top: 1mm;
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

//                     /* Compact column widths for screen - Purchase specific */
//                     .table th:nth-child(1),
//                     .table td:nth-child(1) {
//                         width: 4%;
//                     }

//                     .table th:nth-child(2),
//                     .table td:nth-child(2) {
//                         width: 7%;
//                     }

//                     .table th:nth-child(3),
//                     .table td:nth-child(3) {
//                         width: 8%;
//                     }

//                     .table th:nth-child(4),
//                     .table td:nth-child(4) {
//                         width: 20%;
//                     }

//                     .table th:nth-child(5),
//                     .table td:nth-child(5) {
//                         width: 6%;
//                     }

//                     .table th:nth-child(6),
//                     .table td:nth-child(6) {
//                         width: 8%;
//                     }

//                     .table th:nth-child(7),
//                     .table td:nth-child(7) {
//                         width: 8%;
//                     }

//                     .table th:nth-child(8),
//                     .table td:nth-child(8) {
//                         width: 6%;
//                         text-align: right;
//                     }

//                     .table th:nth-child(9),
//                     .table td:nth-child(9) {
//                         width: 5%;
//                         text-align: right;
//                     }

//                     .table th:nth-child(10),
//                     .table td:nth-child(10) {
//                         width: 10%;
//                         text-align: right;
//                     }

//                     .table th:nth-child(11),
//                     .table td:nth-child(11) {
//                         width: 8%;
//                         text-align: right;
//                     }

//                     .table th:nth-child(12),
//                     .table td:nth-child(12) {
//                         width: 5%;
//                         text-align: right;
//                     }

//                     .table th:nth-child(13),
//                     .table td:nth-child(13) {
//                         width: 10%;
//                         text-align: right;
//                     }

//                     .amount-in-words {
//                         font-style: italic;
//                         margin-top: 5px;
//                         font-size: 11px;
//                         line-height: 1.1;
//                     }

//                     .signature-area {
//                         margin-top: 20px;
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

//                     /* Ensure no overflow */
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
//                         <Button variant="info" size="sm" onClick={printBill}>
//                             <BiPrinter /> Print
//                         </Button>
//                     </div>

//                     <Card className="p-4">
//                         <div className="header compact-text">
//                             <h1 className="compact-text">{billData.currentCompanyName}</h1>
//                             <h4 className="compact-text">
//                                 {billData.currentCompany.address}, {billData.currentCompany.city}
//                                 <br />
//                                 Tel: {billData.currentCompany.phone} | PAN: {billData.currentCompany.pan}
//                             </h4>
//                             <h2 className="compact-text">PURCHASE INVOICE</h2>
//                         </div>
//                         <br />
//                         <div className="details-container compact-text">
//                             <div className="left wrap-text">
//                                 <div><strong>Supplier:</strong> {billData.bill.account.name}</div>
//                                 <div><strong>Address:</strong> {billData.bill.account.address || 'N/A'}</div>
//                                 <div><strong>PAN:</strong> {billData.bill.account.pan || 'N/A'}</div>
//                                 <div><strong>Payment Mode:</strong> {billData.bill.paymentMode}</div>
//                             </div>
//                             <div className="right">
//                                 <div><strong>Invoice No:</strong> {billData.bill.billNumber}</div>
//                                 <div><strong>Supplier Inv No:</strong> {billData.bill.partyBillNumber || 'N/A'}</div>
//                                 <div><strong>Transaction Date:</strong> {new Date(billData.bill.transactionDate).toLocaleDateString()}</div>
//                                 <div><strong>Inv. Issue Date:</strong> {new Date(billData.bill.date).toLocaleDateString()}</div>
//                             </div>
//                         </div>

//                         <hr className="my-1" />

//                         <Table bordered size="sm">
//                             <thead>
//                                 <tr>
//                                     <th>S.N.</th>
//                                     <th>Code</th>
//                                     <th>HSN</th>
//                                     <th>Description of Goods</th>
//                                     <th>Unit</th>
//                                     <th>Batch</th>
//                                     <th>Expiry</th>
//                                     <th>Qty</th>
//                                     <th>Free</th>
//                                     <th>Rate</th>
//                                     <th>MRP</th>
//                                     <th>%</th>
//                                     <th>Amount</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {billData.bill.items.map((item, i) => (
//                                     <tr key={i}>
//                                         <td>{i + 1}</td>
//                                         <td>{item.item.uniqueNumber}</td>
//                                         <td>{item.item.hscode}</td>
//                                         <td>
//                                             {item.item.vatStatus === 'vatExempt' ? (
//                                                 <>
//                                                     <span className="wrap-text">{item.item.name}</span> <span style={{ color: 'red' }}>*</span>
//                                                 </>
//                                             ) : (
//                                                 <span className="wrap-text">{item.item.name}</span>
//                                             )}
//                                         </td>
//                                         <td>{item.item.unit?.name || ''}</td>
//                                         <td>{item.batchNumber}</td>
//                                         <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
//                                         <td className="text-right">{item.Altquantity}</td>
//                                         <td className="text-right">{item.Altbonus}</td>
//                                         <td className="text-right">{formatTo2Decimal(item.AltpuPrice)}</td>
//                                         <td className="text-right">{formatTo2Decimal(item.mrp)}</td>
//                                         <td className="text-right">{formatTo2Decimal(item.marginPercentage)}</td>
//                                         <td className="text-right">{formatTo2Decimal(item.Altquantity * item.AltpuPrice)}</td>
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </Table>

//                         <div className="total-table">
//                             <table className="table table-sm border-0">
//                                 <tbody>
//                                     <tr>
//                                         <td><strong>Sub-Total:</strong></td>
//                                         <td className="text-right">{formatTo2Decimal(billData.bill.subTotal)}</td>
//                                     </tr>
//                                     <tr>
//                                         <td><strong>Discount ({billData.bill.discountPercentage}%):</strong></td>
//                                         <td className="text-right">{formatTo2Decimal(billData.bill.discountAmount)}</td>
//                                     </tr>
//                                     <tr>
//                                         <td><strong>CC Charge:</strong></td>
//                                         <td className="text-right">{formatTo2Decimal(billData.bill.totalCCAmount)}</td>
//                                     </tr>
//                                     {!billData.bill.isVatExempt && (
//                                         <>
//                                             <tr>
//                                                 <td><strong>Taxable Amount:</strong></td>
//                                                 <td className="text-right">{formatTo2Decimal(billData.bill.taxableAmount)}</td>
//                                             </tr>
//                                             <tr>
//                                                 <td><strong>VAT ({billData.bill.vatPercentage}%):</strong></td>
//                                                 <td className="text-right">{formatTo2Decimal(billData.bill.taxableAmount * billData.bill.vatPercentage / 100)}</td>
//                                             </tr>
//                                         </>
//                                     )}
//                                     <tr>
//                                         <td><strong>Round Off:</strong></td>
//                                         <td className="text-right">{formatTo2Decimal(billData.bill.roundOffAmount)}</td>
//                                     </tr>
//                                     <tr>
//                                         <td><strong>Grand Total:</strong></td>
//                                         <td className="text-right">{formatTo2Decimal(billData.bill.totalAmount)}</td>
//                                     </tr>
//                                 </tbody>
//                             </table>
//                         </div>

//                         <div className="amount-in-words compact-text">
//                             <strong>In Words:</strong> {numberToWordsWithPaisa(billData.bill.totalAmount)} Only.
//                         </div>

//                         <div className="signature-area">
//                             <div className="signature-box">Prepared By</div>
//                             <div className="signature-box">Checked By</div>
//                             <div className="signature-box">Received By</div>
//                         </div>
//                     </Card>
//                 </Container>
//             </div>

//             {/* Printable Version */}
//             <div id="printableContent" className="print-version" ref={printableRef}>
//                 <div className="print-invoice-container">
//                     <div className="print-invoice-header">
//                         <div className="print-company-name">{billData.currentCompanyName}</div>
//                         <div className="print-company-details">
//                             {billData.currentCompany.address}, {billData.currentCompany.city} |
//                             Tel: {billData.currentCompany.phone} | PAN: {billData.currentCompany.pan}
//                         </div>
//                         <div className="print-invoice-title">PURCHASE INVOICE</div>
//                     </div>

//                     <div className="print-invoice-details">
//                         <div>
//                             <div><strong>Supplier:</strong> {billData.bill.account.name}</div>
//                             <div><strong>Address:</strong> {billData.bill.account.address || 'N/A'}</div>
//                             <div><strong>PAN:</strong> {billData.bill.account.pan || 'N/A'}</div>
//                             <div><strong>Payment Mode:</strong> {billData.bill.paymentMode}</div>
//                         </div>
//                         <div>
//                             <div><strong>Invoice No:</strong> {billData.bill.billNumber}</div>
//                             <div><strong>Supplier Inv No:</strong> {billData.bill.partyBillNumber || 'N/A'}</div>
//                             <div><strong>Transaction Date:</strong> {new Date(billData.bill.transactionDate).toLocaleDateString()}</div>
//                             <div><strong>Inv. Issue Date:</strong> {new Date(billData.bill.date).toLocaleDateString()}</div>
//                         </div>
//                     </div>

//                     <table className="print-invoice-table">
//                         <thead>
//                             <tr>
//                                 <th>S.N.</th>
//                                 <th>Code</th>
//                                 <th>HSN</th>
//                                 <th>Description of Goods</th>
//                                 <th>Unit</th>
//                                 <th>Batch</th>
//                                 <th>Expiry</th>
//                                 <th>Qty</th>
//                                 <th>Free</th>
//                                 <th>Rate</th>
//                                 <th>MRP</th>
//                                 <th>%</th>
//                                 <th>Amount</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {billData.bill.items.map((item, i) => (
//                                 <tr key={i}>
//                                     <td>{i + 1}</td>
//                                     <td>{item.item.uniqueNumber}</td>
//                                     <td>{item.item.hscode}</td>
//                                     <td>
//                                         {item.item.vatStatus === 'vatExempt' ? (
//                                             `${item.item.name} *`
//                                         ) : (
//                                             item.item.name
//                                         )}
//                                     </td>
//                                     <td>{item.item.unit?.name || ''}</td>
//                                     <td>{item.batchNumber}</td>
//                                     <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
//                                     <td className="print-text-right">{item.Altquantity}</td>
//                                     <td className="print-text-right">{item.Altbonus}</td>
//                                     <td className="print-text-right">{formatTo2Decimal(item.AltpuPrice)}</td>
//                                     <td className="print-text-right">{formatTo2Decimal(item.mrp)}</td>
//                                     <td className="print-text-right">{formatTo2Decimal(item.marginPercentage)}</td>
//                                     <td className="print-text-right">{formatTo2Decimal(item.Altquantity * item.AltpuPrice)}</td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                         <tr>
//                             <td colSpan="13" style={{ borderBottom: '1px solid #000' }}></td>
//                         </tr>
//                     </table>

//                     <table className="print-totals-table">
//                         <tbody>
//                             <tr>
//                                 <td><strong>Sub-Total:</strong></td>
//                                 <td className="print-text-right">{formatTo2Decimal(billData.bill.subTotal)}</td>
//                             </tr>
//                             <tr>
//                                 <td><strong>Discount ({billData.bill.discountPercentage}%):</strong></td>
//                                 <td className="print-text-right">{formatTo2Decimal(billData.bill.discountAmount)}</td>
//                             </tr>
//                             <tr>
//                                 <td><strong>CC Charge:</strong></td>
//                                 <td className="print-text-right">{formatTo2Decimal(billData.bill.totalCCAmount)}</td>
//                             </tr>
//                             {!billData.bill.isVatExempt && (
//                                 <>
//                                     <tr>
//                                         <td><strong>Taxable Amount:</strong></td>
//                                         <td className="print-text-right">{formatTo2Decimal(billData.bill.taxableAmount)}</td>
//                                     </tr>
//                                     <tr>
//                                         <td><strong>VAT ({billData.bill.vatPercentage}%):</strong></td>
//                                         <td className="print-text-right">{formatTo2Decimal(billData.bill.taxableAmount * billData.bill.vatPercentage / 100)}</td>
//                                     </tr>
//                                 </>
//                             )}
//                             <tr>
//                                 <td><strong>Round Off:</strong></td>
//                                 <td className="print-text-right">{formatTo2Decimal(billData.bill.roundOffAmount)}</td>
//                             </tr>
//                             <tr>
//                                 <td><strong>Grand Total:</strong></td>
//                                 <td className="print-text-right">{formatTo2Decimal(billData.bill.totalAmount)}</td>
//                             </tr>
//                         </tbody>
//                     </table>

//                     <div className="print-amount-in-words">
//                         <strong>In Words:</strong> {numberToWordsWithPaisa(billData.bill.totalAmount)} Only.
//                     </div>

//                     <br /><br />
//                     <div className="print-signature-area">
//                         <div className="print-signature-box">Prepared By</div>
//                         <div className="print-signature-box">Checked By</div>
//                         <div className="print-signature-box">Approved By</div>
//                     </div>
//                 </div>
//             </div>
//         </>
//     );
// };

// export default PurchaseBillPrint;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Table } from 'react-bootstrap';
import { BiPrinter, BiArrowBack, BiSolidFilePdf } from 'react-icons/bi';
import NepaliDate from 'nepali-date-converter';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';

const PurchaseBillPrint = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [billData, setBillData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [firstBill, setFirstBill] = useState(false);
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
        const fetchBillData = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/api/retailer/purchase/${id}/print`);

                if (!response.data.success) {
                    throw new Error(response.data.error || 'Failed to fetch bill data');
                }

                setBillData(response.data.data);
                setFirstBill(response.data.data.firstBill);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching bill data:', err);
                setError(err.response?.data?.error || err.message || 'Failed to fetch bill data');
                setLoading(false);
            }
        };

        fetchBillData();
    }, [id]);

    const printBill = () => {
        const printContents = document.getElementById('printableContent').cloneNode(true);
        const styles = document.getElementById('printStyles').innerHTML;

        const printWindow = window.open('', '_blank', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Purchase_Invoice_${billData.bill.billNumber}</title>
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
                    </script>
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

            pdf.save(`Purchase_Invoice_${billData.bill.billNumber}.pdf`);

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
                // Convert to Nepali date
                const nepaliDate = new NepaliDate(date);
                return nepaliDate.format('YYYY-MM-DD');
            }

            // English format
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error('Date formatting error:', e);
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

    if (!billData || !billData.bill) return (
        <Container fluid className="mt-4">
            <div className="alert alert-warning" role="alert">
                <h4 className="alert-heading">No Data</h4>
                <p>No bill data found</p>
                <hr />
                <Button variant="outline-warning" onClick={handleBack}>
                    <BiArrowBack /> Go Back
                </Button>
            </div>
        </Container>
    );

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

                    .print-invoice-container {
                        width: 100%;
                        max-width: 210mm;
                        margin: 0 auto;
                        padding: 2mm;
                    }

                    .print-invoice-header {
                        text-align: center;
                        margin-bottom: 3mm;
                        border-bottom: 1px solid #000;
                        padding-bottom: 2mm;
                    }

                    .print-invoice-title {
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
                        font-weight:bold;
                    }

                    .print-invoice-details {
                        display: flex;
                        justify-content: space-between;
                        margin: 2mm 0;
                        font-size: 8pt;
                    }

                    .print-invoice-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 3mm 0;
                        font-size: 8pt;
                        border: none;
                        table-layout: fixed;
                    }

                    .print-invoice-table thead {
                        border-top: 1px solid #000;
                        border-bottom: 1px solid #000;
                    }

                    .print-invoice-table th {
                        background-color: transparent;
                        border: none;
                        padding: 1mm;
                        text-align: left;
                        font-weight: bold;
                    }

                    .print-invoice-table td {
                        border: none;
                        padding: 1mm;
                        border-bottom: 1px solid #eee;
                    }

                    /* Fixed column widths for print - Purchase specific */
                    .print-invoice-table th:nth-child(1),
                    .print-invoice-table td:nth-child(1) {
                        width: 4%;
                    }

                    .print-invoice-table th:nth-child(2),
                    .print-invoice-table td:nth-child(2) {
                        width: 7%;
                    }

                    .print-invoice-table th:nth-child(3),
                    .print-invoice-table td:nth-child(3) {
                        width: 8%;
                    }

                    .print-invoice-table th:nth-child(4),
                    .print-invoice-table td:nth-child(4) {
                        width: 20%;
                    }

                    .print-invoice-table th:nth-child(5),
                    .print-invoice-table td:nth-child(5) {
                        width: 6%;
                    }

                    .print-invoice-table th:nth-child(6),
                    .print-invoice-table td:nth-child(6) {
                        width: 8%;
                    }

                    .print-invoice-table th:nth-child(7),
                    .print-invoice-table td:nth-child(7) {
                        width: 8%;
                    }

                    .print-invoice-table th:nth-child(8),
                    .print-invoice-table td:nth-child(8) {
                        width: 6%;
                        text-align: right;
                    }

                    .print-invoice-table th:nth-child(9),
                    .print-invoice-table td:nth-child(9) {
                        width: 5%;
                        text-align: right;
                    }

                    .print-invoice-table th:nth-child(10),
                    .print-invoice-table td:nth-child(10) {
                        width: 10%;
                        text-align: right;
                    }

                    .print-invoice-table th:nth-child(11),
                    .print-invoice-table td:nth-child(11) {
                        width: 8%;
                        text-align: right;
                    }

                    .print-invoice-table th:nth-child(12),
                    .print-invoice-table td:nth-child(12) {
                        width: 5%;
                        text-align: right;
                    }

                    .print-invoice-table th:nth-child(13),
                    .print-invoice-table td:nth-child(13) {
                        width: 10%;
                        text-align: right;
                        padding-right: 2mm;
                    }

                    /* Ensure numbers are fully visible */
                    .print-invoice-table td:nth-child(10),
                    .print-invoice-table td:nth-child(11),
                    .print-invoice-table td:nth-child(12),
                    .print-invoice-table td:nth-child(13) {
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

                    .print-amount-in-words {
                        font-size: 8pt;
                        margin: 2mm 0;
                        padding: 1mm;
                        border: 1px dashed #000;
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
                        font-weight:bold;
                    }

                    .print-totals-table {
                        width: 60%;
                        margin-left: auto;
                        border-collapse: collapse;
                        font-size: 8pt;
                    }

                    .print-totals-table td {
                        padding: 1mm;
                    }

                    .print-totals-table td:nth-child(2) {
                        text-align: right;
                        padding-right: 2mm;
                        width: 40%;
                        white-space: nowrap;
                        overflow: visible !important;
                        text-overflow: clip !important;
                    }

                    .print-footer {
                        text-align: center;
                        font-size: 7pt;
                        margin-top: 3mm;
                        border-top: 1px solid #000;
                        padding-top: 1mm;
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

                    /* Compact Screen Version */
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

                    /* Compact column widths for screen - Purchase specific */
                    .table th:nth-child(1),
                    .table td:nth-child(1) {
                        width: 4%;
                    }

                    .table th:nth-child(2),
                    .table td:nth-child(2) {
                        width: 7%;
                    }

                    .table th:nth-child(3),
                    .table td:nth-child(3) {
                        width: 8%;
                    }

                    .table th:nth-child(4),
                    .table td:nth-child(4) {
                        width: 20%;
                    }

                    .table th:nth-child(5),
                    .table td:nth-child(5) {
                        width: 6%;
                    }

                    .table th:nth-child(6),
                    .table td:nth-child(6) {
                        width: 8%;
                    }

                    .table th:nth-child(7),
                    .table td:nth-child(7) {
                        width: 8%;
                    }

                    .table th:nth-child(8),
                    .table td:nth-child(8) {
                        width: 6%;
                        text-align: right;
                    }

                    .table th:nth-child(9),
                    .table td:nth-child(9) {
                        width: 5%;
                        text-align: right;
                    }

                    .table th:nth-child(10),
                    .table td:nth-child(10) {
                        width: 10%;
                        text-align: right;
                    }

                    .table th:nth-child(11),
                    .table td:nth-child(11) {
                        width: 8%;
                        text-align: right;
                    }

                    .table th:nth-child(12),
                    .table td:nth-child(12) {
                        width: 5%;
                        text-align: right;
                    }

                    .table th:nth-child(13),
                    .table td:nth-child(13) {
                        width: 10%;
                        text-align: right;
                    }

                    .amount-in-words {
                        font-style: italic;
                        margin-top: 5px;
                        font-size: 11px;
                        line-height: 1.1;
                    }

                    .signature-area {
                        margin-top: 20px;
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

                    /* Utility classes for better spacing */
                    .compact-text {
                        line-height: 1;
                        margin: 0;
                        padding: 0;
                    }

                    .compact-row {
                        margin: 0;
                        padding: 0;
                    }

                    /* Ensure no overflow */
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
                        <Button variant="info" size="sm" onClick={printBill}>
                            <BiPrinter /> Print
                        </Button>
                    </div>

                    <Card className="p-4">
                        <div className="header compact-text">
                            <h1 className="compact-text">{billData.currentCompanyName}</h1>
                            <h4 className="compact-text">
                                {billData.currentCompany.address}, {billData.currentCompany.city}
                                <br />
                                Tel: {billData.currentCompany.phone} | PAN: {billData.currentCompany.pan}
                            </h4>
                            <h2 className="compact-text">PURCHASE INVOICE</h2>
                        </div>
                        <br />
                        <div className="details-container compact-text">
                            <div className="left wrap-text">
                                <div><strong>Supplier:</strong> {billData.bill.account?.name || ''}</div>
                                <div><strong>Address:</strong> {billData.bill.account?.address || ''}</div>
                                <div><strong>PAN:</strong> {billData.bill.account?.pan || ''}</div>
                                <div><strong>Payment Mode:</strong> {billData.bill.paymentMode}</div>
                            </div>
                            <div className="right">
                                <div><strong>Invoice No:</strong> {billData.bill.billNumber}</div>
                                <div><strong>Supplier Inv No:</strong> {billData.bill.partyBillNumber || ''}</div>
                                <div><strong>Transaction Date:</strong> {billData.companyDateFormat === 'Nepali' ? formatDate(billData.transactionDateNepali, 'nepali') : formatDate(billData.bill.transactionDate)}</div>
                                <div><strong>Inv. Issue Date:</strong> {billData.companyDateFormat === 'Nepali' ? formatDate(billData.nepaliDate, 'nepali') : formatDate(billData.bill.date)}</div>
                            </div>
                        </div>

                        <hr className="my-1" />

                        <Table bordered size="sm">
                            <thead>
                                <tr>
                                    <th>S.N.</th>
                                    <th>Code</th>
                                    <th>HSN</th>
                                    <th>Description of Goods</th>
                                    <th>Unit</th>
                                    <th>Batch</th>
                                    <th>Expiry</th>
                                    <th>Qty</th>
                                    <th>Free</th>
                                    <th>Rate</th>
                                    <th>MRP</th>
                                    <th>%</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billData.bill.items.map((item, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td>{item.uniqueNumber || ''}</td>
                                        <td>{item.hscode || ''}</td>
                                        <td>
                                            {item.vatStatus === 'vatExempt' ? (
                                                <>
                                                    <span className="wrap-text">{item.itemName || item.item?.name}</span> <span style={{ color: 'red' }}>*</span>
                                                </>
                                            ) : (
                                                <span className="wrap-text">{item.itemName || item.item?.name}</span>
                                            )}
                                        </td>
                                        <td>{item.unitName || (item.item?.unit?.name) || ''}</td>
                                        <td>{item.batchNumber || 'XXX'}</td>
                                        <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                                        <td className="text-right">{formatTo2Decimal(item.quantity)}</td>
                                        <td className="text-right">{formatTo2Decimal(item.bonus || 0)}</td>
                                        <td className="text-right">{formatTo2Decimal(item.puPrice)}</td>
                                        <td className="text-right">{formatTo2Decimal(item.mrp)}</td>
                                        <td className="text-right">{formatTo2Decimal(item.marginPercentage)}</td>
                                        <td className="text-right">{formatTo2Decimal(item.quantity * item.puPrice)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>

                        <div className="total-table">
                            <table className="table table-sm border-0">
                                <tbody>
                                    <tr>
                                        <td><strong>Sub-Total:</strong></td>
                                        <td className="text-right">{formatTo2Decimal(billData.bill.subTotal)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Discount ({billData.bill.discountPercentage || 0}%):</strong></td>
                                        <td className="text-right">{formatTo2Decimal(billData.bill.discountAmount)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>CC Charge:</strong></td>
                                        <td className="text-right">{formatTo2Decimal(billData.bill.totalCcAmount || 0)}</td>
                                    </tr>
                                    {!billData.bill.isVatExempt && (
                                        <>
                                            <tr>
                                                <td><strong>Taxable Amount:</strong></td>
                                                <td className="text-right">{formatTo2Decimal(billData.bill.taxableAmount)}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>VAT ({billData.bill.vatPercentage || 0}%):</strong></td>
                                                <td className="text-right">{formatTo2Decimal(billData.bill.vatAmount)}</td>
                                            </tr>
                                        </>
                                    )}
                                    <tr>
                                        <td><strong>Round Off:</strong></td>
                                        <td className="text-right">{formatTo2Decimal(billData.bill.roundOffAmount || 0)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Grand Total:</strong></td>
                                        <td className="text-right">{formatTo2Decimal(billData.bill.totalAmount)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="amount-in-words compact-text">
                            <strong>In Words:</strong> {numberToWordsWithPaisa(billData.bill.totalAmount)} Only.
                        </div>

                        <div className="signature-area">
                            <div className="signature-box">Prepared By</div>
                            <div className="signature-box">Checked By</div>
                            <div className="signature-box">Received By</div>
                        </div>
                    </Card>
                </Container>
            </div>

            {/* Printable Version */}
            <div id="printableContent" className="print-version" ref={printableRef}>
                <div className="print-invoice-container">
                    <div className="print-invoice-header">
                        <div className="print-company-name">{billData.currentCompanyName}</div>
                        <div className="print-company-details">
                            {billData.currentCompany.address}, {billData.currentCompany.city} |
                            Tel: {billData.currentCompany.phone} | PAN: {billData.currentCompany.pan}
                        </div>
                        <div className="print-invoice-title">PURCHASE INVOICE</div>
                    </div>

                    <div className="print-invoice-details">
                        <div>
                            <div><strong>Supplier:</strong> {billData.bill.account?.name || ''}</div>
                            <div><strong>Address:</strong> {billData.bill.account?.address || ''}</div>
                            <div><strong>PAN:</strong> {billData.bill.account?.pan || ''}</div>
                            <div><strong>Payment Mode:</strong> {billData.bill.paymentMode}</div>
                        </div>
                        <div>
                            <div><strong>Invoice No:</strong> {billData.bill.billNumber}</div>
                            <div><strong>Supplier Inv No:</strong> {billData.bill.partyBillNumber || ''}</div>
                            <div><strong>Transaction Date:</strong> {billData.companyDateFormat === 'Nepali' ? formatDate(billData.transactionDateNepali, 'nepali') : formatDate(billData.bill.transactionDate)}</div>
                            <div><strong>Inv. Issue Date:</strong> {billData.companyDateFormat === 'Nepali' ? formatDate(billData.nepaliDate, 'nepali') : formatDate(billData.bill.date)}</div>
                        </div>
                    </div>

                    <table className="print-invoice-table">
                        <thead>
                            <tr>
                                <th>S.N.</th>
                                <th>Code</th>
                                <th>HSN</th>
                                <th>Description of Goods</th>
                                <th>Unit</th>
                                <th>Batch</th>
                                <th>Expiry</th>
                                <th>Qty</th>
                                <th>Free</th>
                                <th>Rate</th>
                                <th>MRP</th>
                                <th>%</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {billData.bill.items.map((item, i) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td>{item.uniqueNumber || ''}</td>
                                    <td>{item.hscode || ''}</td>
                                    <td>
                                        {item.vatStatus === 'vatExempt' ? (
                                            `${item.itemName || item.item?.name} *`
                                        ) : (
                                            item.itemName || item.item?.name
                                        )}
                                    </td>
                                    <td>{item.unitName || (item.item?.unit?.name) || ''}</td>
                                    <td>{item.batchNumber || 'XXX'}</td>
                                    <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="print-text-right">{formatTo2Decimal(item.quantity)}</td>
                                    <td className="print-text-right">{formatTo2Decimal(item.bonus || 0)}</td>
                                    <td className="print-text-right">{formatTo2Decimal(item.puPrice)}</td>
                                    <td className="print-text-right">{formatTo2Decimal(item.mrp)}</td>
                                    <td className="print-text-right">{formatTo2Decimal(item.marginPercentage)}</td>
                                    <td className="print-text-right">{formatTo2Decimal(item.quantity * item.puPrice)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tr>
                            <td colSpan="13" style={{ borderBottom: '1px solid #000' }}></td>
                        </tr>
                    </table>

                    <table className="print-totals-table">
                        <tbody>
                            <tr>
                                <td><strong>Sub-Total:</strong></td>
                                <td className="print-text-right">{formatTo2Decimal(billData.bill.subTotal)}</td>
                            </tr>
                            <tr>
                                <td><strong>Discount ({billData.bill.discountPercentage || 0}%):</strong></td>
                                <td className="print-text-right">{formatTo2Decimal(billData.bill.discountAmount)}</td>
                            </tr>
                            <tr>
                                <td><strong>CC Charge:</strong></td>
                                <td className="print-text-right">{formatTo2Decimal(billData.bill.totalCcAmount || 0)}</td>
                            </tr>
                            {!billData.bill.isVatExempt && (
                                <>
                                    <tr>
                                        <td><strong>Taxable Amount:</strong></td>
                                        <td className="print-text-right">{formatTo2Decimal(billData.bill.taxableAmount)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>VAT ({billData.bill.vatPercentage || 0}%):</strong></td>
                                        <td className="print-text-right">{formatTo2Decimal(billData.bill.vatAmount)}</td>
                                    </tr>
                                </>
                            )}
                            <tr>
                                <td><strong>Round Off:</strong></td>
                                <td className="print-text-right">{formatTo2Decimal(billData.bill.roundOffAmount || 0)}</td>
                            </tr>
                            <tr>
                                <td><strong>Grand Total:</strong></td>
                                <td className="print-text-right">{formatTo2Decimal(billData.bill.totalAmount)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="print-amount-in-words">
                        <strong>In Words:</strong> {numberToWordsWithPaisa(billData.bill.totalAmount)} Only.
                    </div>

                    <br /><br />
                    <div className="print-signature-area">
                        <div className="print-signature-box">Prepared By</div>
                        <div className="print-signature-box">Checked By</div>
                        <div className="print-signature-box">Approved By</div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PurchaseBillPrint;