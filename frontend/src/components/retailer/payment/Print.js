// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { Container, Card, Button, Table } from 'react-bootstrap';
// import { BiPrinter, BiArrowBack, BiSolidFilePdf, BiReceipt } from 'react-icons/bi';
// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';

// const PaymentVoucherPrint = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [paymentData, setPaymentData] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const printableRef = useRef();

//     useEffect(() => {
//         const fetchPaymentData = async () => {
//             try {
//                 const response = await fetch(`/api/retailer/payments/${id}/print`, {
//                     credentials: 'include'
//                 });
//                 const data = await response.json();

//                 if (!response.ok) {
//                     throw new Error(data.error || 'Failed to fetch payment data');
//                 }

//                 setPaymentData(data.data);
//                 setLoading(false);
//             } catch (err) {
//                 setError(err.message);
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

//     if (loading) return <div className="text-center py-5">Loading...</div>;
//     if (error) return <div className="alert alert-danger text-center py-5">{error}</div>;
//     if (!paymentData) return <div className="text-center py-5">No payment data found</div>;

//     function formatTo2Decimal(num) {
//         const rounded = Math.round(num * 100) / 100;
//         const parts = rounded.toString().split(".");
//         if (!parts[1]) return parts[0] + ".00";
//         if (parts[1].length === 1) return parts[0] + "." + parts[1] + "0";
//         return rounded.toString();
//     }

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
//                         border-bottom: 1px dashed #000;
//                         padding-bottom: 2mm;
//                     }

//                     .print-voucher-title {
//                         font-size: 12pt;
//                         font-weight: bold;
//                         margin: 2mm 0;
//                         text-transform: uppercase;
//                         text-decoration: underline;
//                         letter-spacing: 1px;
//                     }

//                     .print-company-name {
//                         font-size: 16pt;
//                         font-weight: bold;
//                     }

//                     .print-company-details {
//                         font-size: 8pt;
//                         margin: 1mm 0;
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
//                     }

//                     .print-voucher-table thead {
//                         border-top: 1px dashed #000;
//                         border-bottom: 1px dashed #000;
//                     }

//                     .print-voucher-table th {
//                         background-color: transparent;
//                         border: 1px solid #000;
//                         padding: 1mm;
//                         text-align: left;
//                         font-weight: bold;
//                     }

//                     .print-voucher-table td {
//                         border: 1px solid #000;
//                         padding: 1mm;
//                     }

//                     .print-text-right {
//                         text-align: right;
//                     }

//                     .print-text-center {
//                         text-align: center;
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
//                         border-top: 1px dashed #000;
//                         padding-top: 1mm;
//                         font-weight: bold;
//                     }

//                     .no-print {
//                         display: none;
//                     }

//                     .bordered-digit {
//                         display: inline-block;
//                         border: 1px solid #000;
//                         padding: 0 2px;
//                         margin: 0 1px;
//                         min-width: 12px;
//                         text-align: center;
//                     }

//                     .text-danger {
//                         color: #dc3545 !important;
//                     }
//                 }

//                 @media screen {
//                     .print-version {
//                         display: none;
//                     }

//                     .container {
//                         max-width: 100%;
//                         padding: 10px;
//                     }

//                     .card {
//                         border: 1px solid #ddd;
//                         margin: 10px 0;
//                         padding: 15px;
//                         box-shadow: 0 0 10px rgba(0,0,0,0.1);
//                     }

//                     .header {
//                         text-align: center;
//                         margin-bottom: 15px;
//                     }

//                     .header h2 {
//                         margin: 0;
//                         font-size: 24px;
//                         font-weight: bold;
//                     }

//                     .header h4 {
//                         font-size: 14px;
//                         margin: 10px 0;
//                     }

//                     .voucher-header {
//                         display: flex;
//                         justify-content: space-between;
//                         margin-bottom: 15px;
//                     }

//                     .invoice-details {
//                         text-align: right;
//                         font-size: 14px;
//                     }

//                     .voucher-table {
//                         width: 100%;
//                         border-collapse: collapse;
//                         margin: 15px 0;
//                     }

//                     .voucher-table th, .voucher-table td {
//                         border: 1px solid #ddd;
//                         padding: 8px;
//                         text-align: left;
//                     }

//                     .voucher-table th {
//                         background-color: #f0f0f0;
//                     }

//                     .signature-section {
//                         display: flex;
//                         justify-content: space-between;
//                         margin-top: 30px;
//                     }

//                     .signature {
//                         width: 30%;
//                         text-align: center;
//                     }

//                     .signature p {
//                         margin: 0;
//                     }

//                     hr {
//                         border-top: 1px solid #000;
//                         margin: 10px 0;
//                     }

//                     .text-danger {
//                         color: #dc3545;
//                     }
//                 }
//                 `}
//             </style>

//             {/* Screen Version */}
//             <div className="screen-version">
//                 <Container>
//                     <div className="d-flex justify-content-end mb-3">
//                         <Button variant="secondary" className="me-2" onClick={() => navigate(-1)}>
//                             <BiArrowBack /> Back
//                         </Button>
//                         <Button variant="primary" className="me-2" onClick={generatePdf}>
//                             <BiSolidFilePdf /> <span className="pdf-button-text">PDF</span>
//                         </Button>
//                         <Button variant="info" className='me-2' onClick={printVoucher}>
//                             <BiPrinter /> Print
//                         </Button>
//                         <Button variant="success" onClick={() => navigate('/api/retailer/payments')}>
//                             <BiReceipt /> New Payment
//                         </Button>
//                     </div>

//                     <Card>
//                         <div className="header">
//                             <h2 className="card-subtitle">
//                                 {paymentData.currentCompanyName}
//                             </h2>
//                             <h4>
//                                 <b>
//                                     {paymentData.currentCompany.address}-{paymentData.currentCompany.ward}, {paymentData.currentCompany.city}
//                                 </b>
//                                 <br />
//                                 Tel: {paymentData.currentCompany.phone} | PAN: {paymentData.currentCompany.pan}
//                             </h4>
//                             <hr style={{ border: '0.5px solid' }} />
//                         </div>

//                         <div className="voucher-header">
//                             <h1 className="text-center" style={{ textDecoration: 'underline', letterSpacing: '3px' }}>
//                                 Payment Voucher
//                             </h1>
//                             <div className="invoice-details">
//                                 <p><strong>Vch. No:</strong> {paymentData.payment.billNumber}</p>
//                                 <p><strong>Date:</strong> {paymentData.payment.date}</p>
//                             </div>
//                         </div>

//                         <Table className="voucher-table">
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
//                                         {paymentData.payment.isActive ?
//                                             paymentData.payment.account?.name :
//                                             <span className="text-danger">Canceled</span>}
//                                     </td>
//                                     <td>
//                                         {paymentData.payment.isActive ?
//                                             formatTo2Decimal(paymentData.payment.debit) :
//                                             <span className="text-danger">0.00</span>}
//                                     </td>
//                                     <td>0.00</td>
//                                 </tr>
//                                 <tr>
//                                     <td>2</td>
//                                     <td>
//                                         {paymentData.payment.isActive ?
//                                             paymentData.payment.paymentAccount?.name :
//                                             <span className="text-danger">Canceled</span>}
//                                     </td>
//                                     <td>0.00</td>
//                                     <td>
//                                         {paymentData.payment.isActive ?
//                                             formatTo2Decimal(paymentData.payment.debit) :
//                                             <span className="text-danger">0.00</span>}
//                                     </td>
//                                 </tr>
//                             </tbody>
//                             <tfoot>
//                                 <tr>
//                                     <th colSpan="2">Total</th>
//                                     <th>{paymentData.payment.isActive ?
//                                         formatTo2Decimal(paymentData.payment.debit) :
//                                         <span className="text-danger">0.00</span>}
//                                     </th>
//                                     <th>{paymentData.payment.isActive ?
//                                         formatTo2Decimal(paymentData.payment.debit) :
//                                         <span className="text-danger">0.00</span>}
//                                     </th>
//                                 </tr>
//                             </tfoot>
//                         </Table>

//                         <p>Note: {paymentData.payment.description || 'N/A'}</p>

//                         <div className="row">
//                             <div className="col-6">
//                                 <label>Mode of Payment: {paymentData.payment.InstType || 'N/A'}</label>
//                             </div>
//                             <div className="col-6">
//                                 <label>Inst No: {paymentData.payment.InstNo || 'N/A'}</label>
//                             </div>
//                         </div>

//                         <div className="signature-section">
//                             <div className="signature">
//                                 <p style={{ marginBottom: 0 }}>
//                                     <strong>{paymentData.payment.user?.name || 'N/A'}</strong>
//                                 </p>
//                                 <p style={{ textDecoration: 'overline', marginTop: '5px' }}>Prepared By:</p>
//                             </div>
//                             <div className="signature">
//                                 <p style={{ marginBottom: 0 }}>&nbsp;</p>
//                                 <p style={{ textDecoration: 'overline', marginTop: '5px' }}>Checked By:</p>
//                             </div>
//                             <div className="signature">
//                                 <p style={{ marginBottom: 0 }}>&nbsp;</p>
//                                 <p style={{ textDecoration: 'overline', marginTop: '5px' }}>Approved By:</p>
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
//                             {paymentData.currentCompany.address}-{paymentData.currentCompany.ward}, {paymentData.currentCompany.city}
//                             <br />
//                             Tel: {paymentData.currentCompany.phone} | PAN: {paymentData.currentCompany.pan ? paymentData.currentCompany.pan : 'N/A'}
//                         </div>
//                         <div className="print-voucher-title">PAYMENT VOUCHER</div>
//                     </div>

//                     <div className="print-voucher-details">
//                         <div>
//                             <div><strong>Vch. No:</strong> {paymentData.payment.billNumber}</div>
//                         </div>
//                         <div>
//                             <div><strong>Date:</strong> {paymentData.payment.date}</div>
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
//                                 <td>1</td>
//                                 <td>
//                                     {paymentData.payment.isActive ?
//                                         paymentData.payment.account?.name :
//                                         <span className="text-danger">Canceled</span>}
//                                 </td>
//                                 <td>
//                                     {paymentData.payment.isActive ?
//                                         formatTo2Decimal(paymentData.payment.debit) :
//                                         <span className="text-danger">0.00</span>}
//                                 </td>
//                                 <td>0.00</td>
//                             </tr>
//                             <tr>
//                                 <td>2</td>
//                                 <td>
//                                     {paymentData.payment.isActive ?
//                                         paymentData.payment.paymentAccount?.name :
//                                         <span className="text-danger">Canceled</span>}
//                                 </td>
//                                 <td>0.00</td>
//                                 <td>
//                                     {paymentData.payment.isActive ?
//                                         formatTo2Decimal(paymentData.payment.debit) :
//                                         <span className="text-danger">0.00</span>}
//                                 </td>
//                             </tr>
//                         </tbody>
//                         <tfoot>
//                             <tr>
//                                 <th colSpan="2">Total</th>
//                                 <th>{paymentData.payment.isActive ? formatTo2Decimal(paymentData.payment.debit) : <span className="text-danger">0.00</span>}</th>
//                                 <th>{paymentData.payment.isActive ? formatTo2Decimal(paymentData.payment.debit) : <span className="text-danger">0.00</span>}</th>
//                             </tr>
//                         </tfoot>
//                     </table>

//                     <div style={{ marginTop: '3mm' }}>
//                         <strong>Note:</strong> {paymentData.payment.description || 'N/A'}
//                     </div>

//                     <div style={{ marginTop: '3mm' }}>
//                         <div><strong>Mode of Payment:</strong> {paymentData.payment.InstType || 'N/A'}</div>
//                         <div><strong>Inst No:</strong> {paymentData.payment.InstNo || 'N/A'}</div>
//                     </div>

//                     <div className="print-signature-area">
//                         <div className="print-signature-box">
//                             <div style={{ marginBottom: '1mm' }}>
//                                 <strong>{paymentData.payment.user?.name || 'N/A'}</strong>
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

//-----------------------------------------------------------end

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Table } from 'react-bootstrap';
import { BiPrinter, BiArrowBack, BiSolidFilePdf, BiReceipt } from 'react-icons/bi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PaymentVoucherPrint = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [paymentData, setPaymentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const printableRef = useRef();

    useEffect(() => {
        const fetchPaymentData = async () => {
            try {
                const response = await fetch(`/api/retailer/payments/${id}/print`, {
                    credentials: 'include'
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch payment data');
                }

                setPaymentData(data.data);
                setLoading(false);
            } catch (err) {
                setError(err.message);
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

    const handleBack = () => {
        navigate(-1);
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!paymentData) return <div>No payment data found</div>;

    const formatTo2Decimal = (num) => {
        const rounded = Math.round(num * 100) / 100;
        const parts = rounded.toString().split(".");
        if (!parts[1]) return parts[0] + ".00";
        if (parts[1].length === 1) return parts[0] + "." + parts[1] + "0";
        return rounded.toString();
    };

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

                    /* Fixed column widths for print */
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

                    /* Ensure numbers are fully visible */
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

                    .no-print {
                        display: none;
                    }

                    .screen-version {
                        display: none;
                    }

                    .text-danger {
                        color: #dc3545 !important;
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

                    .header h4 {
                        font-size: 11px;
                        margin: 3px 0;
                        line-height: 1.1;
                        font-weight: bold;
                    }

                    .header h2 {
                        font-size: 14px;
                        margin: 3px 0;
                        line-height: 1.1;
                        text-decoration: underline;
                        text-transform: uppercase;
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

                    /* Compact column widths for screen */
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
                        <Button variant="info" size="sm" className="me-2" onClick={printVoucher}>
                            <BiPrinter /> Print
                        </Button>
                        <Button variant="success" size="sm" onClick={() => navigate('/api/retailer/payments')}>
                            <BiReceipt /> New Payment
                        </Button>
                    </div>

                    <Card className="p-4">
                        <div className="header compact-text">
                            <h1 className="compact-text">{paymentData.currentCompanyName}</h1>
                            <h4 className="compact-text">
                                {paymentData.currentCompany.address}-{paymentData.currentCompany.ward}, {paymentData.currentCompany.city}
                                <br />
                                Tel: {paymentData.currentCompany.phone} | PAN: {paymentData.currentCompany.pan}
                            </h4>
                            <h2 className="compact-text">PAYMENT VOUCHER</h2>
                        </div>

                        <div className="details-container compact-text">
                            <div className="left">
                                <div><strong>Vch. No:</strong> {paymentData.payment.billNumber}</div>
                            </div>
                            <div className="right">
                                <div><strong>Date:</strong> {paymentData.payment.date}</div>
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
                                <tr>
                                    <td>1</td>
                                    <td>
                                        {paymentData.payment.isActive ?
                                            paymentData.payment.account?.name :
                                            <span className="text-danger">Canceled</span>}
                                    </td>
                                    <td className="text-right">
                                        {paymentData.payment.isActive ?
                                            formatTo2Decimal(paymentData.payment.debit) :
                                            <span className="text-danger">0.00</span>}
                                    </td>
                                    <td className="text-right">0.00</td>
                                </tr>
                                <tr>
                                    <td>2</td>
                                    <td>
                                        {paymentData.payment.isActive ?
                                            paymentData.payment.paymentAccount?.name :
                                            <span className="text-danger">Canceled</span>}
                                    </td>
                                    <td className="text-right">0.00</td>
                                    <td className="text-right">
                                        {paymentData.payment.isActive ?
                                            formatTo2Decimal(paymentData.payment.debit) :
                                            <span className="text-danger">0.00</span>}
                                    </td>
                                </tr>
                                <tr style={{ borderTop: '2px solid #000' }}>
                                    <td colSpan="2" className="text-right"><strong>Total</strong></td>
                                    <td className="text-right">
                                        <strong>
                                            {paymentData.payment.isActive ?
                                                formatTo2Decimal(paymentData.payment.debit) :
                                                <span className="text-danger">0.00</span>}
                                        </strong>
                                    </td>
                                    <td className="text-right">
                                        <strong>
                                            {paymentData.payment.isActive ?
                                                formatTo2Decimal(paymentData.payment.debit) :
                                                <span className="text-danger">0.00</span>}
                                        </strong>
                                    </td>
                                </tr>
                            </tbody>
                        </Table>

                        <div className="payment-details compact-text">
                            <div><strong>Note:</strong> {paymentData.payment.description || 'N/A'}</div>
                            <div className="mt-1">
                                <span className="me-3"><strong>Mode of Payment:</strong> {paymentData.payment.InstType || 'N/A'}</span>
                                <span><strong>Inst No:</strong> {paymentData.payment.InstNo || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="signature-area">
                            <div className="signature-box">
                                <div className="compact-text"><strong>{paymentData.payment.user?.name || 'N/A'}</strong></div>
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
                            {paymentData.currentCompany.address}-{paymentData.currentCompany.ward}, {paymentData.currentCompany.city}
                            <br />
                            Tel: {paymentData.currentCompany.phone} | PAN: {paymentData.currentCompany.pan}
                        </div>
                        <div className="print-voucher-title">PAYMENT VOUCHER</div>
                    </div>

                    <div className="print-voucher-details">
                        <div>
                            <div><strong>Vch. No:</strong> {paymentData.payment.billNumber}</div>
                        </div>
                        <div>
                            <div><strong>Date:</strong> {paymentData.payment.date}</div>
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
                            <tr>
                                <td className="print-text-center">1</td>
                                <td>
                                    {paymentData.payment.isActive ?
                                        paymentData.payment.account?.name :
                                        <span className="text-danger">Canceled</span>}
                                </td>
                                <td className="print-text-right">
                                    {paymentData.payment.isActive ?
                                        formatTo2Decimal(paymentData.payment.debit) :
                                        <span className="text-danger">0.00</span>}
                                </td>
                                <td className="print-text-right">0.00</td>
                            </tr>
                            <tr>
                                <td className="print-text-center">2</td>
                                <td>
                                    {paymentData.payment.isActive ?
                                        paymentData.payment.paymentAccount?.name :
                                        <span className="text-danger">Canceled</span>}
                                </td>
                                <td className="print-text-right">0.00</td>
                                <td className="print-text-right">
                                    {paymentData.payment.isActive ?
                                        formatTo2Decimal(paymentData.payment.debit) :
                                        <span className="text-danger">0.00</span>}
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan="2" style={{ borderTop: '1px solid #000', paddingTop: '1mm' }}>
                                    <strong>Total</strong>
                                </td>
                                <td className="print-text-right" style={{ borderTop: '1px solid #000', paddingTop: '1mm' }}>
                                    <strong>
                                        {paymentData.payment.isActive ?
                                            formatTo2Decimal(paymentData.payment.debit) :
                                            <span className="text-danger">0.00</span>}
                                    </strong>
                                </td>
                                <td className="print-text-right" style={{ borderTop: '1px solid #000', paddingTop: '1mm' }}>
                                    <strong>
                                        {paymentData.payment.isActive ?
                                            formatTo2Decimal(paymentData.payment.debit) :
                                            <span className="text-danger">0.00</span>}
                                    </strong>
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="print-payment-details">
                        <div><strong>Note:</strong> {paymentData.payment.description || 'N/A'}</div>
                        <div style={{ marginTop: '1mm' }}>
                            <div><strong>Mode of Payment:</strong> {paymentData.payment.InstType || 'N/A'}</div>
                            <div><strong>Inst No:</strong> {paymentData.payment.InstNo || 'N/A'}</div>
                        </div>
                    </div>

                    <div className="print-signature-area">
                        <div className="print-signature-box">
                            <div style={{ marginBottom: '1mm' }}>
                                <strong>{paymentData.payment.user?.name || 'N/A'}</strong>
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