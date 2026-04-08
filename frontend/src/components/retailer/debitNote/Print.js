// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { Container, Card, Button, Table } from 'react-bootstrap';
// import { BiPrinter, BiArrowBack, BiSolidFilePdf, BiReceipt } from 'react-icons/bi';
// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';

// const DebitNotePrint = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [debitNoteData, setDebitNoteData] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const printableRef = useRef();

//     useEffect(() => {
//         const fetchDebitNoteData = async () => {
//             try {
//                 const response = await fetch(`/api/retailer/debit-note/${id}/print`, {
//                     credentials: 'include'
//                 });
//                 const data = await response.json();

//                 if (!response.ok) {
//                     throw new Error(data.error || 'Failed to fetch debit note data');
//                 }

//                 setDebitNoteData(data.data);
//                 setLoading(false);
//             } catch (err) {
//                 setError(err.message);
//                 setLoading(false);
//             }
//         };

//         fetchDebitNoteData();
//     }, [id]);

//     const printVoucher = () => {
//         const printContents = document.getElementById('printableContent').cloneNode(true);
//         const styles = document.getElementById('printStyles').innerHTML;

//         const printWindow = window.open('', '_blank', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');

//         printWindow.document.write(`
//             <html>
//                 <head>
//                     <title>Debit_Note_${debitNoteData.debitNote.billNumber}</title>
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

//             pdf.save(`Debit_Note_${debitNoteData.debitNote.billNumber}.pdf`);

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
//     if (!debitNoteData) return <div className="text-center py-5">No debit note data found</div>;

//     function formatTo2Decimal(num) {
//         const rounded = Math.round(num * 100) / 100;
//         const parts = rounded.toString().split(".");
//         if (!parts[1]) return parts[0] + ".00";
//         if (parts[1].length === 1) return parts[0] + "." + parts[1] + "0";
//         return rounded.toString();
//     }

//     // Calculate total debit and credit from transactions
//     const totalDebit = debitNoteData.debitTransactions.reduce((sum, transaction) => sum + (transaction.debit || 0), 0);
//     const totalCredit = debitNoteData.creditTransactions.reduce((sum, transaction) => sum + (transaction.credit || 0), 0);

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

//                      .invoice-details {
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

//                     .bordered-digit {
//                         display: inline-block;
//                         border: 1px solid #000;
//                         padding: 0 2px;
//                         margin: 0 1px;
//                         min-width: 12px;
//                         text-align: center;
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
//                         <Button variant="success" onClick={() => navigate('/retailer/debit-note')}>
//                             <BiReceipt /> New Debit Note
//                         </Button>
//                     </div>

//                     <Card>
//                         <div className="header">
//                             <h2 className="card-subtitle">
//                                 {debitNoteData.currentCompanyName}
//                             </h2>
//                             <h4>
//                                 <b>
//                                     {debitNoteData.currentCompany.address}-{debitNoteData.currentCompany.ward}, {debitNoteData.currentCompany.city},
//                                     {debitNoteData.currentCompany.country}
//                                 </b>
//                                 <br />
//                                 VAT NO.: <span id="pan-vat-container">
//                                     {debitNoteData.currentCompany.pan}
//                                 </span>
//                             </h4>
//                             <hr style={{ border: '0.5px solid' }} />
//                         </div>

//                         <div className="voucher-header">
//                             <h1 className="text-center" style={{ textDecoration: 'underline', letterSpacing: '3px' }}>
//                                 Debit Note
//                             </h1>
//                             <div className="invoice-details">
//                                 <p><strong>Vch. No:</strong> {debitNoteData.debitNote.billNumber}</p>
//                                 <p><strong>Date:</strong> {new Date(debitNoteData.debitNote.date).toLocaleDateString()}</p>
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
//                                 {/* Debit Transactions */}
//                                 {debitNoteData.debitTransactions.length > 0 ? (
//                                     debitNoteData.debitTransactions.map((transaction, index) => (
//                                         <tr key={`debit-${index}`}>
//                                             <td>{index + 1}</td>
//                                             <td>
//                                                 {debitNoteData.debitNote.isActive ? (
//                                                     transaction.account ? transaction.account.name : 'N/A'
//                                                 ) : (
//                                                     <span className="text-danger">Canceled</span>
//                                                 )}
//                                             </td>
//                                             <td>
//                                                 {debitNoteData.debitNote.isActive ? (
//                                                     formatTo2Decimal(transaction.debit)
//                                                 ) : (
//                                                     <span className="text-danger">0.00</span>
//                                                 )}
//                                             </td>
//                                             <td>0.00</td>
//                                         </tr>
//                                     ))
//                                 ) : (
//                                     <tr>
//                                         <td colSpan="4" className="text-center">No Debit Transactions Found</td>
//                                     </tr>
//                                 )}

//                                 {/* Credit Transactions */}
//                                 {debitNoteData.creditTransactions.length > 0 ? (
//                                     debitNoteData.creditTransactions.map((transaction, index) => (
//                                         <tr key={`credit-${index}`}>
//                                             <td>{debitNoteData.debitTransactions.length + index + 1}</td>
//                                             <td>
//                                                 {debitNoteData.debitNote.isActive ? (
//                                                     transaction.account ? transaction.account.name : 'N/A'
//                                                 ) : (
//                                                     <span className="text-danger">Canceled</span>
//                                                 )}
//                                             </td>
//                                             <td>0.00</td>
//                                             <td>
//                                                 {debitNoteData.debitNote.isActive ? (
//                                                     formatTo2Decimal(transaction.credit)
//                                                 ) : (
//                                                     <span className="text-danger">0.00</span>
//                                                 )}
//                                             </td>
//                                         </tr>
//                                     ))
//                                 ) : (
//                                     <tr>
//                                         <td colSpan="4" className="text-center">No Credit Transactions Found</td>
//                                     </tr>
//                                 )}
//                             </tbody>
//                             <tfoot>
//                                 <tr>
//                                     <th colSpan="2">Total</th>
//                                     <th>
//                                         {debitNoteData.debitNote.isActive ? 
//                                             formatTo2Decimal(totalDebit) : 
//                                             <span className="text-danger">0.00</span>
//                                         }
//                                     </th>
//                                     <th>
//                                         {debitNoteData.debitNote.isActive ? 
//                                             formatTo2Decimal(totalCredit) : 
//                                             <span className="text-danger">0.00</span>
//                                         }
//                                     </th>
//                                 </tr>
//                             </tfoot>
//                         </Table>

//                         <p><strong>Note:</strong> {debitNoteData.debitNote.description || 'N/A'}</p>

//                         <div className="signature-section">
//                             <div className="signature">
//                                 <p style={{ textDecoration: 'overline' }}>Prepared By:</p>
//                             </div>
//                             <div className="signature">
//                                 <p style={{ textDecoration: 'overline' }}>Checked By:</p>
//                             </div>
//                             <div className="signature">
//                                 <p style={{ textDecoration: 'overline' }}>Approved By:</p>
//                             </div>
//                         </div>
//                     </Card>
//                 </Container>
//             </div>

//             {/* Printable Version */}
//             <div id="printableContent" className="print-version" ref={printableRef}>
//                 <div className="print-voucher-container">
//                     <div className="print-voucher-header">
//                         <div className="print-company-name">{debitNoteData.currentCompanyName}</div>
//                         <div className="print-company-details">
//                             {debitNoteData.currentCompany.address}-{debitNoteData.currentCompany.ward}, {debitNoteData.currentCompany.city},
//                             {debitNoteData.currentCompany.country}
//                             <br />
//                             VAT NO.: {debitNoteData.currentCompany.pan ? debitNoteData.currentCompany.pan : 'N/A'}
//                         </div>
//                         <div className="print-voucher-title">DEBIT NOTE</div>
//                     </div>

//                     <div className="print-voucher-details">
//                         <div>
//                             <div><strong>Vch. No:</strong> {debitNoteData.debitNote.billNumber}</div>
//                         </div>
//                         <div>
//                             <div><strong>Date:</strong> {new Date(debitNoteData.debitNote.date).toLocaleDateString()}</div>
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
//                             {/* Debit Transactions */}
//                             {debitNoteData.debitTransactions.length > 0 ? (
//                                 debitNoteData.debitTransactions.map((transaction, index) => (
//                                     <tr key={`debit-${index}`}>
//                                         <td>{index + 1}</td>
//                                         <td>
//                                             {debitNoteData.debitNote.isActive ? (
//                                                 transaction.account ? transaction.account.name : 'N/A'
//                                             ) : (
//                                                 <span className="text-danger">Canceled</span>
//                                             )}
//                                         </td>
//                                         <td>
//                                             {debitNoteData.debitNote.isActive ? (
//                                                 formatTo2Decimal(transaction.debit)
//                                             ) : (
//                                                 <span className="text-danger">0.00</span>
//                                             )}
//                                         </td>
//                                         <td>0.00</td>
//                                     </tr>
//                                 ))
//                             ) : (
//                                 <tr>
//                                     <td colSpan="4" className="text-center">No Debit Transactions Found</td>
//                                 </tr>
//                             )}

//                             {/* Credit Transactions */}
//                             {debitNoteData.creditTransactions.length > 0 ? (
//                                 debitNoteData.creditTransactions.map((transaction, index) => (
//                                     <tr key={`credit-${index}`}>
//                                         <td>{debitNoteData.debitTransactions.length + index + 1}</td>
//                                         <td>
//                                             {debitNoteData.debitNote.isActive ? (
//                                                 transaction.account ? transaction.account.name : 'N/A'
//                                             ) : (
//                                                 <span className="text-danger">Canceled</span>
//                                             )}
//                                         </td>
//                                         <td>0.00</td>
//                                         <td>
//                                             {debitNoteData.debitNote.isActive ? (
//                                                 formatTo2Decimal(transaction.credit)
//                                             ) : (
//                                                 <span className="text-danger">0.00</span>
//                                             )}
//                                         </td>
//                                     </tr>
//                                 ))
//                             ) : (
//                                 <tr>
//                                     <td colSpan="4" className="text-center">No Credit Transactions Found</td>
//                                 </tr>
//                             )}
//                         </tbody>
//                         <tfoot>
//                             <tr>
//                                 <th colSpan="2">Total</th>
//                                 <th>
//                                     {debitNoteData.debitNote.isActive ? 
//                                         formatTo2Decimal(totalDebit) : 
//                                         <span className="text-danger">0.00</span>
//                                     }
//                                 </th>
//                                 <th>
//                                     {debitNoteData.debitNote.isActive ? 
//                                         formatTo2Decimal(totalCredit) : 
//                                         <span className="text-danger">0.00</span>
//                                     }
//                                 </th>
//                             </tr>
//                         </tfoot>
//                     </table>

//                     <div style={{ marginTop: '3mm' }}>
//                         <strong>Note:</strong> {debitNoteData.debitNote.description || 'N/A'}
//                     </div>

//                     <div className="print-signature-area">
//                         <div className="print-signature-box">
//                             Prepared By
//                         </div>
//                         <div className="print-signature-box">
//                             Checked By
//                         </div>
//                         <div className="print-signature-box">
//                             Approved By
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </>
//     );
// };

// export default DebitNotePrint;

//--------------------------------------------------------------end

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Table } from 'react-bootstrap';
import { BiPrinter, BiArrowBack, BiSolidFilePdf, BiReceipt } from 'react-icons/bi';
import NepaliDate from 'nepali-date-converter';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';

const DebitNotePrint = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [debitNoteData, setDebitNoteData] = useState(null);
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
        const fetchDebitNoteData = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/api/retailer/debit-note/${id}/print`);

                if (!response.data.success) {
                    throw new Error(response.data.error || 'Failed to fetch debit note data');
                }

                console.log('Print data:', response.data.data);
                setDebitNoteData(response.data.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching debit note data:', err);
                setError(err.response?.data?.error || err.message || 'Failed to fetch debit note data');
                setLoading(false);
            }
        };

        fetchDebitNoteData();
    }, [id]);

    const printVoucher = () => {
        const printContents = document.getElementById('printableContent').cloneNode(true);
        const styles = document.getElementById('printStyles').innerHTML;

        const printWindow = window.open('', '_blank', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Debit_Note_${debitNoteData.debitNote.billNumber}</title>
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

            pdf.save(`Debit_Note_${debitNoteData.debitNote.billNumber}.pdf`);

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

    if (!debitNoteData || !debitNoteData.debitNote) return (
        <Container fluid className="mt-4">
            <div className="alert alert-warning" role="alert">
                <h4 className="alert-heading">No Data</h4>
                <p>No debit note data found</p>
                <hr />
                <Button variant="outline-warning" onClick={handleBack}>
                    <BiArrowBack /> Go Back
                </Button>
            </div>
        </Container>
    );

    const debitNote = debitNoteData.debitNote;
    const debitEntries = debitNoteData.debitEntries || [];
    const creditEntries = debitNoteData.creditEntries || [];
    const isCanceled = debitNote.status === 'Canceled';

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

                    .print-text-right {
                        text-align: right;
                        padding-right: 2mm;
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
                        <Button variant="success" size="sm" onClick={() => navigate('/retailer/debit-note')}>
                            <BiReceipt /> New Debit Note
                        </Button>
                    </div>

                    <Card className="p-4">
                        <div className="header compact-text">
                            <h1 className="compact-text">{debitNoteData.currentCompanyName}</h1>
                            <h4 className="compact-text">
                                {debitNoteData.currentCompany.address}, {debitNoteData.currentCompany.city}
                                <br />
                                Tel: {debitNoteData.currentCompany.phone} | PAN: {debitNoteData.currentCompany.pan}
                            </h4>
                            <h2 className="compact-text">DEBIT NOTE</h2>
                        </div>
                        <br />
                        <div className="details-container compact-text">
                            <div className="left">
                                <div><strong>Vch. No:</strong> {debitNote.billNumber}</div>
                            </div>
                            <div className="right">
                                <div><strong>Date:</strong> {debitNoteData.companyDateFormat === 'Nepali' ? formatDate(debitNote.nepaliDate, 'nepali') : formatDate(debitNote.date)}</div>
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
                                                    {entry.referenceNumber && (
                                                        <small className="d-block text-muted">
                                                            Ref: {entry.referenceNumber}
                                                        </small>
                                                    )}
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
                                                    {entry.referenceNumber && (
                                                        <small className="d-block text-muted">
                                                            Ref: {entry.referenceNumber}
                                                        </small>
                                                    )}
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

                        <div className="compact-text">
                            <div><strong>Note:</strong> {debitNote.description || 'N/A'}</div>
                        </div>

                        <div className="amount-in-words compact-text">
                            <strong>In Words:</strong> {numberToWordsWithPaisa(totalCredit)} Only.
                        </div>

                        <div className="signature-area">
                            <div className="signature-box">
                                <div className="compact-text"><strong>{debitNote.user?.name || 'N/A'}</strong></div>
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
                        <div className="print-company-name">{debitNoteData.currentCompanyName}</div>
                        <div className="print-company-details">
                            {debitNoteData.currentCompany.address}, {debitNoteData.currentCompany.city}
                            <br />
                            Tel: {debitNoteData.currentCompany.phone} | PAN: {debitNoteData.currentCompany.pan}
                        </div>
                        <div className="print-voucher-title">DEBIT NOTE</div>
                    </div>

                    <div className="print-voucher-details">
                        <div>
                            <div><strong>Vch. No:</strong> {debitNote.billNumber}</div>
                        </div>
                        <div>
                            <div><strong>Date:</strong> {debitNoteData.companyDateFormat === 'Nepali' ? formatDate(debitNote.nepaliDate, 'nepali') : formatDate(debitNote.date)}</div>
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
                                                {entry.referenceNumber && (
                                                    <small className="d-block text-muted">
                                                        Ref: {entry.referenceNumber}
                                                    </small>
                                                )}
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
                                                {entry.referenceNumber && (
                                                    <small className="d-block text-muted">
                                                        Ref: {entry.referenceNumber}
                                                    </small>
                                                )}
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

                    <div style={{ marginTop: '3mm' }}>
                        <div><strong>Note:</strong> {debitNote.description || 'N/A'}</div>
                    </div>

                    <div className="print-amount-in-words" style={{ marginTop: '3mm', padding: '1mm', border: '1px dashed #000' }}>
                        <strong>In Words:</strong> {numberToWordsWithPaisa(totalCredit)} Only.
                    </div>

                    <br /><br />
                    <div className="print-signature-area">
                        <div className="print-signature-box">
                            <div style={{ marginBottom: '1mm' }}>
                                <strong>{debitNote.user?.name || 'N/A'}</strong>
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

export default DebitNotePrint;