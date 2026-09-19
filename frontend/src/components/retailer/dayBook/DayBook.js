// // src/components/retailer/DayBook.js
// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import NepaliDate from 'nepali-datetime';
// import Loader from '../../Loader';
// import { FixedSizeList as List } from 'react-window';
// import AutoSizer from 'react-virtualized-auto-sizer';
// import * as XLSX from 'xlsx';
// import NotificationToast from '../../NotificationToast';
// import {
//     FiBookOpen, FiPrinter, FiDownload, FiSearch,
//     FiRefreshCw, FiCalendar, FiFilter
// } from 'react-icons/fi';
// import './DayBook.css';
// import api from '../../services/api';
// import Header from '../Header';
// import ProductModal from '../dashboard/modals/ProductModal';

// // -------- Date helpers (reuse from SalesBillsList) --------
// const convertBsToAd = (bsDate) => {
//     if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
//     try {
//         const nepaliDate = new NepaliDate(bsDate);
//         if (!nepaliDate || typeof nepaliDate.getDateObject !== 'function') return null;
//         const jsDate = nepaliDate.getDateObject();
//         if (!jsDate || isNaN(jsDate.getTime())) return null;
//         const year = jsDate.getFullYear();
//         const month = String(jsDate.getMonth() + 1).padStart(2, '0');
//         const day = String(jsDate.getDate()).padStart(2, '0');
//         return `${year}-${month}-${day}`;
//     } catch {
//         return null;
//     }
// };

// const convertAdToBs = (adDate) => {
//     if (!adDate) return null;
//     try {
//         let date;
//         if (typeof adDate === 'string') {
//             date = /^\d{4}-\d{2}-\d{2}$/.test(adDate)
//                 ? new Date(adDate + 'T00:00:00')
//                 : new Date(adDate);
//         } else if (adDate instanceof Date) {
//             date = adDate;
//         } else {
//             return null;
//         }
//         if (isNaN(date.getTime())) return null;
//         const nepaliDate = new NepaliDate(date);
//         if (!nepaliDate || typeof nepaliDate.getYear !== 'function') return null;
//         const year = nepaliDate.getYear();
//         const month = nepaliDate.getMonth();
//         const day = nepaliDate.getDate();
//         if (!year || month === undefined || !day) return null;
//         return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//     } catch {
//         return null;
//     }
// };

// const isValidNepaliDate = (dateStr) => {
//     if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
//     try {
//         const [year, month, day] = dateStr.split('-').map(Number);
//         if (month < 1 || month > 12) return false;
//         if (day < 1 || day > 32) return false;
//         const nepaliDate = new NepaliDate(dateStr);
//         if (!nepaliDate || typeof nepaliDate.getYear !== 'function') return false;
//         return (
//             nepaliDate.getYear() === year &&
//             nepaliDate.getMonth() + 1 === month &&
//             nepaliDate.getDate() === day
//         );
//     } catch {
//         return false;
//     }
// };

// // -------- Transaction type → badge color --------
// const getTypeBadgeClass = (type) => {
//     const map = {
//         'Sales': 'success',
//         'Cash Sale': 'success',
//         'Credit Sale': 'primary',
//         'Purchase': 'info',
//         'Payment': 'danger',
//         'Receipt': 'success',
//         'Sales Return': 'warning',
//         'Purchase Return': 'warning',
//         'Journal': 'secondary',
//         'Opening': 'dark',
//     };
//     return map[type] || 'secondary';
// };

// const DayBook = () => {
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];
//     const navigate = useNavigate();

//     const [company, setCompany] = useState({
//         dateFormat: 'english',
//         vatEnabled: true,
//         isVatExempt: false,
//         fiscalYear: {}
//     });

//     // ------- Date range -------
//     const [dateRange, setDateRange] = useState({
//         fromDate: '',
//         toDate: '',
//         fromDateAd: '',
//         toDateAd: '',
//     });

//     // ------- Transaction filters -------
//     const [typeFilter, setTypeFilter] = useState('all');
//     const [searchQuery, setSearchQuery] = useState('');
//     const [paymentModeFilter, setPaymentModeFilter] = useState('');

//     const [dateErrors, setDateErrors] = useState({ fromDate: '', toDate: '' });
//     const [notification, setNotification] = useState({ show: false, message: '', type: 'success', duration: 3000 });
//     const [showProductModal, setShowProductModal] = useState(false);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [transactions, setTransactions] = useState([]);
//     const [filteredTransactions, setFilteredTransactions] = useState([]);
//     const [totals, setTotals] = useState({
//         totalDebit: 0,
//         totalCredit: 0,
//         netBalance: 0,
//         countsByType: { sales: 0, purchase: 0, payment: 0, receipt: 0 }
//     });
//     const [shouldFetch, setShouldFetch] = useState(false);
//     const [exporting, setExporting] = useState(false);

//     // ------- Column widths -------
//     const [columnWidths, setColumnWidths] = useState({
//         bsDate: 80,
//         adDate: 80,
//         invNo: 100,
//         partyName: 160,
//         type: 100,
//         payMode: 80,
//         description: 200,
//         debit: 90,
//         credit: 90,
//         balance: 100,
//         user: 90,
//     });
//     const [isResizing, setIsResizing] = useState(false);
//     const [resizingColumn, setResizingColumn] = useState(null);
//     const [startX, setStartX] = useState(0);
//     const [startWidth, setStartWidth] = useState(0);

//     const tableBodyRef = useRef(null);
//     const fromDateRef = useRef(null);

//     // ------- Fetch company info once -------
//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 const response = await api.get('/api/retailer/day-book/entry-data');
//                 if (response.data.success) {
//                     const d = response.data.data;
//                     const dateFormat = d.company.dateFormat?.toLowerCase() || 'english';
//                     const isNepali = dateFormat === 'nepali';

//                     setCompany({
//                         ...d.company,
//                         dateFormat,
//                         vatEnabled: d.company.vatEnabled || true,
//                         isVatExempt: d.company.isVatExempt || false,
//                     });

//                     const currentFiscalYear = d.currentFiscalYear;

//                     if (currentFiscalYear) {
//                         let fromDate = '', toDate = '', fromAd = '', toAd = '';
//                         if (isNepali) {
//                             fromDate = currentFiscalYear.startDateNepali || currentNepaliDate;
//                             toDate = currentNepaliDate;
//                             fromAd = convertBsToAd(fromDate);
//                             toAd = convertBsToAd(toDate);
//                         } else {
//                             fromDate = currentFiscalYear.startDate
//                                 ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0]
//                                 : currentEnglishDate;
//                             toDate = currentEnglishDate;
//                             fromAd = fromDate;
//                             toAd = toDate;
//                         }
//                         setDateRange({ fromDate, toDate, fromDateAd: fromAd, toDateAd: toAd });
//                     }
//                 }
//             } catch (err) {
//                 console.error('Error fetching initial data:', err);
//                 setNotification({ show: true, message: 'Error loading company data', type: 'error' });
//             }
//         };
//         fetchInitialData();
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, []);

//     // ------- Column width persistence -------
//     useEffect(() => {
//         const saved = localStorage.getItem('dayBookColumnWidths');
//         if (saved) {
//             try { setColumnWidths(JSON.parse(saved)); } catch { }
//         }
//     }, []);
//     useEffect(() => {
//         localStorage.setItem('dayBookColumnWidths', JSON.stringify(columnWidths));
//     }, [columnWidths]);

//     // ------- Fetch on generate -------
//     useEffect(() => {
//         if (!shouldFetch) return;
//         const controller = new AbortController();

//         const fetchData = async () => {
//             try {
//                 setLoading(true);
//                 const params = new URLSearchParams();
//                 if (dateRange.fromDateAd) params.append('fromDate', dateRange.fromDateAd);
//                 if (dateRange.toDateAd) params.append('toDate', dateRange.toDateAd);
//                 if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);

//                 const res = await api.get(`/api/retailer/day-book?${params.toString()}`, { signal: controller.signal });

//                 if (res.data.success) {
//                     setTransactions(res.data.data.transactions || []);
//                     setError(null);
//                 } else {
//                     setError(res.data.error || 'Failed to fetch day book');
//                 }
//             } catch (err) {
//                 if (err.name !== 'AbortError') {
//                     console.error('Fetch error:', err);
//                     setError(err.response?.data?.error || 'Failed to fetch day book');
//                 }
//             } finally {
//                 setLoading(false);
//                 setShouldFetch(false);
//             }
//         };
//         fetchData();
//         return () => controller.abort();
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [shouldFetch, dateRange.fromDateAd, dateRange.toDateAd, typeFilter]);

//     // ------- Filter + totals -------
//     useEffect(() => {
//         const list = Array.isArray(transactions) ? transactions : [];
//         const q = searchQuery.toLowerCase();

//         const filtered = list.filter(t => {
//             const matchesSearch =
//                 (t.billNumber || '').toLowerCase().includes(q) ||
//                 (t.accountName || '').toLowerCase().includes(q) ||
//                 (t.description || '').toLowerCase().includes(q);

//             const matchesType = typeFilter === 'all' || t.type === typeFilter;
//             const matchesPay = !paymentModeFilter || (t.paymentMode || '').toLowerCase() === paymentModeFilter.toLowerCase();

//             return matchesSearch && matchesType && matchesPay;
//         });

//         setFilteredTransactions(filtered);

//         const t = filtered.reduce((acc, trn) => {
//             acc.totalDebit += Number(trn.debit || 0);
//             acc.totalCredit += Number(trn.credit || 0);
//             const type = (trn.type || '').toLowerCase();
//             if (type.includes('sales')) acc.countsByType.sales += 1;
//             if (type.includes('purchase')) acc.countsByType.purchase += 1;
//             if (type.includes('payment')) acc.countsByType.payment += 1;
//             if (type.includes('receipt')) acc.countsByType.receipt += 1;
//             return acc;
//         }, { totalDebit: 0, totalCredit: 0, countsByType: { sales: 0, purchase: 0, payment: 0, receipt: 0 } });

//         t.netBalance = t.totalDebit - t.totalCredit;
//         setTotals(t);
//     }, [transactions, searchQuery, typeFilter, paymentModeFilter]);

//     // ------- F9 ------
//     useEffect(() => {
//         const h = (e) => {
//             if (e.key === 'F9') { e.preventDefault(); setShowProductModal(p => !p); }
//         };
//         window.addEventListener('keydown', h);
//         return () => window.removeEventListener('keydown', h);
//     }, []);

//     const formatCurrency = useCallback((num) => {
//         const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
//     }, []);

//     const handleGenerateReport = () => {
//         if (!dateRange.fromDate || !dateRange.toDate) {
//             setNotification({ show: true, message: 'Please select both dates', type: 'warning' });
//             return;
//         }
//         setShouldFetch(true);
//     };

//     const resetColumnWidths = () => {
//         setColumnWidths({
//             bsDate: 80, adDate: 80, invNo: 100, partyName: 160,
//             type: 100, payMode: 80, description: 200,
//             debit: 90, credit: 90, balance: 100, user: 90,
//         });
//         setNotification({ show: true, message: 'Column widths reset', type: 'success', duration: 2000 });
//     };

//     // ------- Print -------
//     const handlePrint = (filtered = true) => {
//         const rows = filtered ? filteredTransactions : transactions;
//         if (!rows.length) {
//             setNotification({ show: true, message: 'No transactions to print', type: 'warning' });
//             return;
//         }
//         const w = window.open('', '_blank');
//         if (!w) {
//             setNotification({ show: true, message: 'Popup blocked', type: 'error' });
//             return;
//         }
//         w.document.write(`
//             <html>
//                 <head>
//                     <title>Day Book</title>
//                     <style>
//                         @page { size: A4 landscape; margin: 5mm; }
//                         body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; padding: 5mm; }
//                         h2 { text-align: center; margin: 0 0 6px; font-size: 16px; }
//                         .meta { text-align: center; font-size: 10px; margin-bottom: 8px; }
//                         table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
//                         th, td { border: 1px solid #333; padding: 3px 5px; }
//                         th { background: #e8e8e8 !important; -webkit-print-color-adjust: exact; }
//                         .text-end { text-align: right; }
//                         .grand { background: #f5f5f5 !important; font-weight: 700; border-top: 3px double #000; }
//                     </style>
//                 </head>
//                 <body>
//                     <h2>${company?.name || ''}</h2>
//                     <div class="meta">
//                         ${company?.address || ''} | PAN: ${company?.pan || ''}<br/>
//                         From ${dateRange.fromDate} to ${dateRange.toDate} (BS)
//                     </div>
//                     <table>
//                         <thead>
//                             <tr>
//                                 <th>Miti</th><th>Date</th><th>Inv No.</th><th>Party</th>
//                                 <th>Type</th><th>Pay Mode</th><th>Description</th>
//                                 <th class="text-end">Debit</th>
//                                 <th class="text-end">Credit</th>
//                                 <th class="text-end">Balance</th>
//                                 <th>User</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             ${rows.map(r => `
//                                 <tr>
//                                     <td>${r.nepaliDate || ''}</td>
//                                     <td>${r.date ? new Date(r.date).toLocaleDateString('en-CA') : ''}</td>
//                                     <td>${r.billNumber || ''}</td>
//                                     <td>${r.accountName || ''}</td>
//                                     <td>${r.type || ''}</td>
//                                     <td>${r.paymentMode || ''}</td>
//                                     <td>${r.description || ''}</td>
//                                     <td class="text-end">${formatCurrency(r.debit)}</td>
//                                     <td class="text-end">${formatCurrency(r.credit)}</td>
//                                     <td class="text-end">${formatCurrency(r.balance)}</td>
//                                     <td>${r.userName || ''}</td>
//                                 </tr>
//                             `).join('')}
//                             <tr class="grand">
//                                 <td colspan="7" class="text-end">TOTALS</td>
//                                 <td class="text-end">${formatCurrency(totals.totalDebit)}</td>
//                                 <td class="text-end">${formatCurrency(totals.totalCredit)}</td>
//                                 <td class="text-end">${formatCurrency(totals.netBalance)}</td>
//                                 <td></td>
//                             </tr>
//                         </tbody>
//                     </table>
//                     <script>window.onload=()=>setTimeout(()=>{window.print();setTimeout(()=>window.close(),500)},300);<\/script>
//                 </body>
//             </html>
//         `);
//         w.document.close();
//     };

//     // ------- Excel -------
//     const handleExportExcel = () => {
//         if (!filteredTransactions.length) {
//             setNotification({ show: true, message: 'No data to export', type: 'warning' });
//             return;
//         }
//         setExporting(true);
//         try {
//             const data = [];
//             data.push(['Day Book']);
//             data.push(['Company:', company?.name || '']);
//             data.push(['From (BS):', dateRange.fromDate, 'To (BS):', dateRange.toDate]);
//             data.push([]);
//             data.push([
//                 'S.No', 'Miti', 'Date', 'Inv No.', 'Party', 'Type', 'Pay Mode',
//                 'Description', 'Debit', 'Credit', 'Balance', 'User'
//             ]);

//             filteredTransactions.forEach((r, i) => {
//                 data.push([
//                     i + 1,
//                     r.nepaliDate || '',
//                     r.date ? new Date(r.date).toLocaleDateString() : '',
//                     r.billNumber || '',
//                     r.accountName || '',
//                     r.type || '',
//                     r.paymentMode || '',
//                     r.description || '',
//                     Number(r.debit || 0).toFixed(2),
//                     Number(r.credit || 0).toFixed(2),
//                     Number(r.balance || 0).toFixed(2),
//                     r.userName || ''
//                 ]);
//             });

//             data.push([]);
//             data.push(['', '', '', '', '', '', '', 'TOTALS',
//                 totals.totalDebit.toFixed(2),
//                 totals.totalCredit.toFixed(2),
//                 totals.netBalance.toFixed(2),
//                 ''
//             ]);

//             const ws = XLSX.utils.aoa_to_sheet(data);
//             ws['!cols'] = [
//                 { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
//                 { wch: 26 }, { wch: 12 }, { wch: 10 }, { wch: 30 },
//                 { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
//             ];
//             const wb = XLSX.utils.book_new();
//             XLSX.utils.book_append_sheet(wb, ws, 'Day Book');
//             XLSX.writeFile(wb, `DayBook_${dateRange.fromDate}_to_${dateRange.toDate}.xlsx`);
//             setNotification({ show: true, message: 'Excel exported', type: 'success' });
//         } catch (err) {
//             console.error(err);
//             setNotification({ show: true, message: 'Failed to export', type: 'error' });
//         } finally {
//             setExporting(false);
//         }
//     };

//     // ------- Resize handle -------
//     const ResizeHandle = ({ columnName }) => (
//         <div
//             className="db-resize-handle"
//             onMouseDown={(e) => {
//                 e.preventDefault();
//                 setIsResizing(true);
//                 setResizingColumn(columnName);
//                 setStartX(e.clientX);
//                 setStartWidth(columnWidths[columnName]);
//             }}
//         />
//     );

//     const TableHeader = () => {
//         const totalWidth =
//             columnWidths.bsDate + columnWidths.adDate + columnWidths.invNo +
//             columnWidths.partyName + columnWidths.type + columnWidths.payMode +
//             columnWidths.description + columnWidths.debit + columnWidths.credit +
//             columnWidths.balance + columnWidths.user;

//         const ths = [
//             ['Miti', 'bsDate', 80],
//             ['Date', 'adDate', 80],
//             ['Inv No.', 'invNo', 100],
//             ['Party', 'partyName', 160],
//             ['Type', 'type', 100],
//             ['Pay Mode', 'payMode', 80],
//             ['Description', 'description', 200],
//             ['Debit', 'debit', 90],
//             ['Credit', 'credit', 90],
//             ['Balance', 'balance', 100],
//             ['User', 'user', 90],
//         ];

//         return (
//             <div
//                 className="db-header"
//                 style={{ minWidth: `${totalWidth}px` }}
//                 onMouseMove={(e) => {
//                     if (isResizing && resizingColumn) {
//                         const diff = e.clientX - startX;
//                         const next = Math.max(60, startWidth + diff);
//                         setColumnWidths((p) => ({ ...p, [resizingColumn]: next }));
//                     }
//                 }}
//                 onMouseUp={() => { setIsResizing(false); setResizingColumn(null); }}
//                 onMouseLeave={() => { setIsResizing(false); setResizingColumn(null); }}
//             >
//                 {ths.map(([label, key, min]) => (
//                     <div
//                         key={key}
//                         className={`db-header-cell ${['debit', 'credit', 'balance'].includes(key) ? 'db-header-cell--end' : ''}`}
//                         style={{ width: `${columnWidths[key]}px`, flexShrink: 0, minWidth: `${min}px` }}
//                     >
//                         <strong>{label}</strong>
//                         <ResizeHandle columnName={key} />
//                     </div>
//                 ))}
//                 {isResizing && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, cursor: 'col-resize' }} />}
//             </div>
//         );
//     };

//     const TableRow = ({ index, style }) => {
//         const r = filteredTransactions[index];
//         if (!r) return null;
//         const isDebit = Number(r.debit) > 0;
//         const isCredit = Number(r.credit) > 0;

//         return (
//             <div style={{ ...style, display: 'flex', alignItems: 'center', height: 28, borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white' }}
//                 className="db-row"
//                 onDoubleClick={() => {
//                     if (r.type?.toLowerCase().includes('sales') && r.id) navigate(`/retailer/sales/${r.id}/print`);
//                     else if (r.type?.toLowerCase().includes('purchase') && r.id) navigate(`/retailer/purchase/${r.id}/print`);
//                 }}
//             >
//                 <div className="db-cell db-cell--center" style={{ width: columnWidths.bsDate, flexShrink: 0 }}>{r.nepaliDate || ''}</div>
//                 <div className="db-cell db-cell--center" style={{ width: columnWidths.adDate, flexShrink: 0 }}>{r.date ? new Date(r.date).toLocaleDateString() : ''}</div>
//                 <div className="db-cell" style={{ width: columnWidths.invNo, flexShrink: 0 }}>{r.billNumber || ''}</div>
//                 <div className="db-cell" style={{ width: columnWidths.partyName, flexShrink: 0 }} title={r.accountName}>{r.accountName || ''}</div>
//                 <div className="db-cell" style={{ width: columnWidths.type, flexShrink: 0 }}>
//                     <span className={`db-badge db-badge--${getTypeBadgeClass(r.type)}`}>{r.type || ''}</span>
//                 </div>
//                 <div className="db-cell" style={{ width: columnWidths.payMode, flexShrink: 0 }}>{r.paymentMode || ''}</div>
//                 <div className="db-cell" style={{ width: columnWidths.description, flexShrink: 0 }} title={r.description}>{r.description || ''}</div>
//                 <div className="db-cell db-cell--end" style={{ width: columnWidths.debit, flexShrink: 0 }}>
//                     {isDebit ? formatCurrency(r.debit) : ''}
//                 </div>
//                 <div className="db-cell db-cell--end" style={{ width: columnWidths.credit, flexShrink: 0 }}>
//                     {isCredit ? formatCurrency(r.credit) : ''}
//                 </div>
//                 <div className="db-cell db-cell--end" style={{ width: columnWidths.balance, flexShrink: 0 }}>
//                     {formatCurrency(r.balance)}
//                 </div>
//                 <div className="db-cell" style={{ width: columnWidths.user, flexShrink: 0 }}>{r.userName || ''}</div>
//             </div>
//         );
//     };

//     if (loading && transactions.length === 0) return <Loader />;

//     return (
//         <div className="db-page">
//             <Header />

//             <div className="db-shell">
//                 {/* Top Bar */}
//                 <div className="db-topbar">
//                     <div className="db-topbar__left">
//                         <div className="db-topbar__icon"><FiBookOpen /></div>
//                         <h1>Day Book</h1>
//                     </div>
//                     <div className="db-topbar__actions">
//                         <button className="db-btn-icon" onClick={handleExportExcel} disabled={!filteredTransactions.length || exporting}>
//                             <FiDownload /> {exporting ? '…' : 'Excel'}
//                         </button>
//                         <button className="db-btn-icon" onClick={() => handlePrint(true)} disabled={!filteredTransactions.length}>
//                             <FiPrinter /> Print
//                         </button>
//                         <button className="db-btn-icon" onClick={resetColumnWidths} title="Reset columns">
//                             <FiRefreshCw /> Reset
//                         </button>
//                     </div>
//                 </div>

//                 {/* Toolbar */}
//                 <div className="db-toolbar">
//                     <div className="db-field db-field--date">
//                         <label>From (BS) <span className="req">*</span></label>
//                         <input
//                             ref={fromDateRef}
//                             type="text"
//                             value={dateRange.fromDate || ''}
//                             onChange={(e) => {
//                                 const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
//                                 const ad = convertBsToAd(value);
//                                 setDateRange((p) => ({ ...p, fromDate: value, fromDateAd: ad || p.fromDateAd }));
//                             }}
//                             placeholder="YYYY-MM-DD"
//                             autoFocus
//                             autoComplete="off"
//                         />
//                     </div>

//                     <div className="db-field db-field--date">
//                         <label>From (AD)</label>
//                         <input
//                             type="date"
//                             value={dateRange.fromDateAd || ''}
//                             onChange={(e) => {
//                                 const value = e.target.value;
//                                 const bs = convertAdToBs(value);
//                                 setDateRange((p) => ({ ...p, fromDateAd: value, fromDate: bs || p.fromDate }));
//                             }}
//                         />
//                     </div>

//                     <div className="db-field db-field--date">
//                         <label>To (BS) <span className="req">*</span></label>
//                         <input
//                             type="text"
//                             value={dateRange.toDate || ''}
//                             onChange={(e) => {
//                                 const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
//                                 const ad = convertBsToAd(value);
//                                 setDateRange((p) => ({ ...p, toDate: value, toDateAd: ad || p.toDateAd }));
//                             }}
//                             placeholder="YYYY-MM-DD"
//                             autoComplete="off"
//                         />
//                     </div>

//                     <div className="db-field db-field--date">
//                         <label>To (AD)</label>
//                         <input
//                             type="date"
//                             value={dateRange.toDateAd || ''}
//                             onChange={(e) => {
//                                 const value = e.target.value;
//                                 const bs = convertAdToBs(value);
//                                 setDateRange((p) => ({ ...p, toDateAd: value, toDate: bs || p.toDate }));
//                             }}
//                         />
//                     </div>

//                     <div className="db-field db-field--select">
//                         <label>Type</label>
//                         <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
//                             <option value="all">All</option>
//                             <option value="Sales">Sales</option>
//                             <option value="Purchase">Purchase</option>
//                             <option value="Payment">Payment</option>
//                             <option value="Receipt">Receipt</option>
//                         </select>
//                     </div>

//                     <button className="db-btn-gen" onClick={handleGenerateReport} disabled={loading}>
//                         {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><FiSearch className="me-1" /> Generate</>}
//                     </button>

//                     <div className="db-toolbar-divider" />

//                     <div className="db-field db-field--search">
//                         <label>Search</label>
//                         <div className="db-search-wrap">
//                             <FiSearch className="db-search-icon" />
//                             <input
//                                 type="text"
//                                 value={searchQuery}
//                                 onChange={(e) => setSearchQuery(e.target.value)}
//                                 disabled={!transactions.length}
//                                 autoComplete="off"
//                             />
//                             {searchQuery && <button className="db-search-clear" onClick={() => setSearchQuery('')}>×</button>}
//                         </div>
//                     </div>

//                     <div className="db-field db-field--select">
//                         <label>Mode</label>
//                         <select
//                             value={paymentModeFilter}
//                             onChange={(e) => setPaymentModeFilter(e.target.value)}
//                             disabled={!transactions.length}
//                         >
//                             <option value="">All</option>
//                             <option value="cash">Cash</option>
//                             <option value="credit">Credit</option>
//                         </select>
//                     </div>
//                 </div>

//                 {error && (
//                     <div className="db-alert">
//                         <i className="bi bi-exclamation-circle" />{error}
//                         <button className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
//                     </div>
//                 )}

//                 {/* Main */}
//                 <div className="db-main">
//                     {!transactions.length && !loading ? (
//                         <div className="db-state">
//                             <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
//                             <h3>Select date range & generate</h3>
//                             <p>Choose a date range then click Generate.</p>
//                         </div>
//                     ) : loading ? (
//                         <div className="db-state"><div className="spinner-border text-primary" /><p>Loading data...</p></div>
//                     ) : filteredTransactions.length === 0 ? (
//                         <div className="db-state">
//                             <FiFilter size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
//                             <h3>No transactions found</h3>
//                             <p>{searchQuery ? 'Try a different search term' : 'No data for the selected range'}</p>
//                         </div>
//                     ) : (
//                         <>
//                             <div className="db-main__bar">
//                                 <span><strong>{filteredTransactions.length}</strong> transactions</span>
//                                 <span className="db-counts">
//                                     Sales: <b>{totals.countsByType.sales}</b> ·
//                                     Purchase: <b>{totals.countsByType.purchase}</b> ·
//                                     Payment: <b>{totals.countsByType.payment}</b> ·
//                                     Receipt: <b>{totals.countsByType.receipt}</b>
//                                 </span>
//                                 <span>{dateRange.fromDate} — {dateRange.toDate}</span>
//                             </div>

//                             <div className="db-table-wrap" ref={tableBodyRef}>
//                                 <AutoSizer>
//                                     {({ height, width }) => {
//                                         const totalWidth =
//                                             columnWidths.bsDate + columnWidths.adDate + columnWidths.invNo +
//                                             columnWidths.partyName + columnWidths.type + columnWidths.payMode +
//                                             columnWidths.description + columnWidths.debit + columnWidths.credit +
//                                             columnWidths.balance + columnWidths.user;

//                                         return (
//                                             <div style={{ position: 'relative', height, width: Math.max(width, totalWidth) }}>
//                                                 <TableHeader />
//                                                 <List
//                                                     height={height - 28}
//                                                     itemCount={filteredTransactions.length}
//                                                     itemSize={28}
//                                                     width={Math.max(width, totalWidth)}
//                                                 >
//                                                     {TableRow}
//                                                 </List>
//                                             </div>
//                                         );
//                                     }}
//                                 </AutoSizer>
//                             </div>

//                             <div className="db-footer">
//                                 <div
//                                     className="db-footer-cell"
//                                     style={{
//                                         width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.invNo + columnWidths.partyName + columnWidths.type + columnWidths.payMode + columnWidths.description}px`,
//                                         flexShrink: 0
//                                     }}
//                                 >
//                                     <strong>Totals</strong>
//                                 </div>
//                                 <div className="db-footer-cell db-cell--end" style={{ width: columnWidths.debit, flexShrink: 0 }}>
//                                     <strong>{formatCurrency(totals.totalDebit)}</strong>
//                                 </div>
//                                 <div className="db-footer-cell db-cell--end" style={{ width: columnWidths.credit, flexShrink: 0 }}>
//                                     <strong>{formatCurrency(totals.totalCredit)}</strong>
//                                 </div>
//                                 <div className="db-footer-cell db-cell--end" style={{ width: columnWidths.balance, flexShrink: 0 }}>
//                                     <strong>{formatCurrency(totals.netBalance)}</strong>
//                                 </div>
//                                 <div className="db-footer-cell" style={{ width: columnWidths.user, flexShrink: 0 }} />
//                             </div>
//                         </>
//                     )}
//                 </div>
//             </div>

//             {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}

//             <NotificationToast
//                 show={notification.show}
//                 message={notification.message}
//                 type={notification.type}
//                 duration={notification.duration}
//                 onClose={() => setNotification({ ...notification, show: false })}
//             />
//         </div>
//     );
// };

// export default DayBook;

//-------------------------------------------------------end1

// // src/components/retailer/dayBook/DayBook.js
// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import NepaliDate from 'nepali-datetime';
// import Loader from '../../Loader';
// import { FixedSizeList as List } from 'react-window';
// import AutoSizer from 'react-virtualized-auto-sizer';
// import * as XLSX from 'xlsx';
// import NotificationToast from '../../NotificationToast';
// import {
//     FiBookOpen, FiPrinter, FiDownload, FiSearch,
//     FiRefreshCw, FiCalendar, FiFilter
// } from 'react-icons/fi';
// import './DayBook.css';
// import api from '../../services/api';
// import Header from '../Header';
// import ProductModal from '../dashboard/modals/ProductModal';
// import DayBookSummaryCards from './DayBookSummaryCards';

// // -------- Date helpers --------
// const convertBsToAd = (bsDate) => {
//     if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
//     try {
//         const nepaliDate = new NepaliDate(bsDate);
//         if (!nepaliDate || typeof nepaliDate.getDateObject !== 'function') return null;
//         const jsDate = nepaliDate.getDateObject();
//         if (!jsDate || isNaN(jsDate.getTime())) return null;
//         const year = jsDate.getFullYear();
//         const month = String(jsDate.getMonth() + 1).padStart(2, '0');
//         const day = String(jsDate.getDate()).padStart(2, '0');
//         return `${year}-${month}-${day}`;
//     } catch {
//         return null;
//     }
// };

// const convertAdToBs = (adDate) => {
//     if (!adDate) return null;
//     try {
//         let date;
//         if (typeof adDate === 'string') {
//             date = /^\d{4}-\d{2}-\d{2}$/.test(adDate)
//                 ? new Date(adDate + 'T00:00:00')
//                 : new Date(adDate);
//         } else if (adDate instanceof Date) {
//             date = adDate;
//         } else {
//             return null;
//         }
//         if (isNaN(date.getTime())) return null;
//         const nepaliDate = new NepaliDate(date);
//         if (!nepaliDate || typeof nepaliDate.getYear !== 'function') return null;
//         const year = nepaliDate.getYear();
//         const month = nepaliDate.getMonth();
//         const day = nepaliDate.getDate();
//         if (!year || month === undefined || !day) return null;
//         return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//     } catch {
//         return null;
//     }
// };

// // -------- Type → badge color --------
// const getTypeBadgeClass = (type) => {
//     const map = {
//         'Sales': 'success',
//         'Cash Sale': 'success',
//         'Credit Sale': 'primary',
//         'Purchase': 'info',
//         'Payment': 'danger',
//         'Receipt': 'success',
//         'Sales Return': 'warning',
//         'Purchase Return': 'warning',
//         'Journal': 'secondary',
//         'Opening': 'dark',
//     };
//     return map[type] || 'secondary';
// };

// const DayBook = () => {
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];
//     const navigate = useNavigate();

//     const [company, setCompany] = useState({
//         dateFormat: 'english',
//         vatEnabled: true,
//         isVatExempt: false,
//         fiscalYear: {}
//     });

//     // ------- Date range -------
//     const [dateRange, setDateRange] = useState({
//         fromDate: '',
//         toDate: '',
//         fromDateAd: '',
//         toDateAd: '',
//     });

//     // ------- Filters -------
//     const [typeFilter, setTypeFilter] = useState('all');
//     const [searchQuery, setSearchQuery] = useState('');
//     const [paymentModeFilter, setPaymentModeFilter] = useState('');

//     const [notification, setNotification] = useState({ show: false, message: '', type: 'success', duration: 3000 });
//     const [showProductModal, setShowProductModal] = useState(false);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [transactions, setTransactions] = useState([]);
//     const [filteredTransactions, setFilteredTransactions] = useState([]);
//     const [totals, setTotals] = useState({
//         totalDebit: 0,
//         totalCredit: 0,
//         netBalance: 0,
//         countsByType: { sales: 0, purchase: 0, payment: 0, receipt: 0 }
//     });

//     // ------- Summary card values (separate from filtered transactions) -------
//     const [summaryData, setSummaryData] = useState({
//         salesTillDate: 0,
//         purchaseTillDate: 0,
//         dailySales: 0,
//         dailyPurchase: 0,
//         dailyReceipt: 0,
//         dailyPayment: 0,
//         profit: 0,
//         dailyProfit: 0,
//     });

//     const [shouldFetch, setShouldFetch] = useState(false);
//     const [exporting, setExporting] = useState(false);

//     // ------- Column widths -------
//     const [columnWidths, setColumnWidths] = useState({
//         bsDate: 80, adDate: 80, invNo: 100, partyName: 160,
//         type: 100, payMode: 80, description: 200,
//         debit: 90, credit: 90, balance: 100, user: 90,
//     });
//     const [isResizing, setIsResizing] = useState(false);
//     const [resizingColumn, setResizingColumn] = useState(null);
//     const [startX, setStartX] = useState(0);
//     const [startWidth, setStartWidth] = useState(0);

//     const tableBodyRef = useRef(null);
//     const fromDateRef = useRef(null);

//     // ------- Fetch company info once -------
//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 const response = await api.get('/api/retailer/day-book/entry-data');
//                 if (response.data.success) {
//                     const d = response.data.data;
//                     const dateFormat = d.company.dateFormat?.toLowerCase() || 'english';
//                     const isNepali = dateFormat === 'nepali';

//                     setCompany({
//                         ...d.company,
//                         dateFormat,
//                         vatEnabled: d.company.vatEnabled || true,
//                         isVatExempt: d.company.isVatExempt || false,
//                     });

//                     const currentFiscalYear = d.currentFiscalYear;

//                     if (currentFiscalYear) {
//                         let fromDate = '', toDate = '', fromAd = '', toAd = '';
//                         if (isNepali) {
//                             fromDate = currentFiscalYear.startDateNepali || currentNepaliDate;
//                             toDate = currentNepaliDate;
//                             fromAd = convertBsToAd(fromDate);
//                             toAd = convertBsToAd(toDate);
//                         } else {
//                             fromDate = currentFiscalYear.startDate
//                                 ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0]
//                                 : currentEnglishDate;
//                             toDate = currentEnglishDate;
//                             fromAd = fromDate;
//                             toAd = toDate;
//                         }
//                         setDateRange({ fromDate, toDate, fromDateAd: fromAd, toDateAd: toAd });
//                     }
//                 }
//             } catch (err) {
//                 console.error('Error fetching initial data:', err);
//                 setNotification({ show: true, message: 'Error loading company data', type: 'error' });
//             }
//         };
//         fetchInitialData();
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, []);

//     // ------- Column width persistence -------
//     useEffect(() => {
//         const saved = localStorage.getItem('dayBookColumnWidths');
//         if (saved) {
//             try { setColumnWidths(JSON.parse(saved)); } catch { }
//         }
//     }, []);
//     useEffect(() => {
//         localStorage.setItem('dayBookColumnWidths', JSON.stringify(columnWidths));
//     }, [columnWidths]);

//     // ------- Fetch on generate — hits 4 endpoints in parallel -------
//     useEffect(() => {
//         if (!shouldFetch) return;
//         const controller = new AbortController();

//         const fetchData = async () => {
//             try {
//                 setLoading(true);

//                 const params = new URLSearchParams();
//                 if (dateRange.fromDateAd) params.append('fromDate', dateRange.fromDateAd);
//                 if (dateRange.toDateAd) params.append('toDate', dateRange.toDateAd);
//                 const qs = params.toString();

//                 const [salesRes, purchaseRes, paymentRes, receiptRes] = await Promise.all([
//                     api.get(`/api/retailer/day-book/sales?${qs}`, { signal: controller.signal }),
//                     api.get(`/api/retailer/day-book/purchase?${qs}`, { signal: controller.signal }),
//                     api.get(`/api/retailer/day-book/payment?${qs}`, { signal: controller.signal }),
//                     api.get(`/api/retailer/day-book/receipt?${qs}`, { signal: controller.signal }),
//                 ]);

//                 const salesTxns    = salesRes.data?.data?.transactions    || [];
//                 const purchaseTxns = purchaseRes.data?.data?.transactions || [];
//                 const paymentTxns  = paymentRes.data?.data?.transactions  || [];
//                 const receiptTxns  = receiptRes.data?.data?.transactions  || [];

//                 // Compute till-date + daily values
//                 let salesTillDate = 0;
//                 let salesReturnTillDate = 0;
//                 let purchaseTillDate = 0;
//                 let purchaseReturnTillDate = 0;
//                 let dailyReceipt = 0;
//                 let dailyPayment = 0;

//                 salesTxns.forEach(t => {
//                     const amt = Math.abs(Number(t.amount || 0));
//                     if (t.type === 'Sales Return') {
//                         salesReturnTillDate += amt;
//                     } else {
//                         salesTillDate += amt;
//                     }
//                 });

//                 purchaseTxns.forEach(t => {
//                     const amt = Math.abs(Number(t.amount || 0));
//                     if (t.type === 'Purchase Return') {
//                         purchaseReturnTillDate += amt;
//                     } else {
//                         purchaseTillDate += amt;
//                     }
//                 });

//                 receiptTxns.forEach(t => { dailyReceipt += Math.abs(Number(t.amount || 0)); });
//                 paymentTxns.forEach(t => { dailyPayment += Math.abs(Number(t.amount || 0)); });

//                 const netSales = salesTillDate - salesReturnTillDate;
//                 const netPurchase = purchaseTillDate - purchaseReturnTillDate;

//                 setSummaryData({
//                     salesTillDate: netSales,
//                     purchaseTillDate: netPurchase,
//                     dailySales: netSales,
//                     dailyPurchase: netPurchase,
//                     dailyReceipt,
//                     dailyPayment,
//                     profit: netSales - netPurchase,
//                     dailyProfit: netSales - netPurchase,
//                 });

//                 // Merge all into one array
//                 const merged = [...salesTxns, ...purchaseTxns, ...paymentTxns, ...receiptTxns];

//                 // Sort by date, then bill number
//                 merged.sort((a, b) => {
//                     const da = new Date(a.date).getTime();
//                     const db = new Date(b.date).getTime();
//                     if (da !== db) return da - db;
//                     return (a.billNumber || '').localeCompare(b.billNumber || '');
//                 });

//                 // Running balance
//                 let bal = 0;
//                 merged.forEach(t => {
//                     bal += Number(t.debit || 0) - Number(t.credit || 0);
//                     t.balance = bal;
//                 });

//                 setTransactions(merged);
//                 setError(null);
//             } catch (err) {
//                 if (err.name !== 'AbortError') {
//                     console.error('Fetch error:', err);
//                     setError(err.response?.data?.error || 'Failed to fetch day book');
//                 }
//             } finally {
//                 setLoading(false);
//                 setShouldFetch(false);
//             }
//         };
//         fetchData();
//         return () => controller.abort();
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [shouldFetch, dateRange.fromDateAd, dateRange.toDateAd]);

//     // ------- Filter + totals (uses the merged data) -------
//     useEffect(() => {
//         const list = Array.isArray(transactions) ? transactions : [];
//         const q = searchQuery.toLowerCase();

//         const filtered = list.filter(t => {
//             const matchesSearch =
//                 (t.billNumber || '').toLowerCase().includes(q) ||
//                 (t.accountName || '').toLowerCase().includes(q) ||
//                 (t.description || '').toLowerCase().includes(q);

//             const matchesType = typeFilter === 'all' || t.type === typeFilter;
//             const matchesPay = !paymentModeFilter ||
//                 (t.paymentMode || '').toLowerCase() === paymentModeFilter.toLowerCase();

//             return matchesSearch && matchesType && matchesPay;
//         });

//         setFilteredTransactions(filtered);

//         const t = filtered.reduce((acc, trn) => {
//             acc.totalDebit += Number(trn.debit || 0);
//             acc.totalCredit += Number(trn.credit || 0);
//             const type = (trn.type || '').toLowerCase();
//             if (type.includes('sales')) acc.countsByType.sales += 1;
//             if (type.includes('purchase')) acc.countsByType.purchase += 1;
//             if (type.includes('payment')) acc.countsByType.payment += 1;
//             if (type.includes('receipt')) acc.countsByType.receipt += 1;
//             return acc;
//         }, { totalDebit: 0, totalCredit: 0, countsByType: { sales: 0, purchase: 0, payment: 0, receipt: 0 } });

//         t.netBalance = t.totalDebit - t.totalCredit;
//         setTotals(t);
//     }, [transactions, searchQuery, typeFilter, paymentModeFilter]);

//     // ------- F9 ------
//     useEffect(() => {
//         const h = (e) => {
//             if (e.key === 'F9') { e.preventDefault(); setShowProductModal(p => !p); }
//         };
//         window.addEventListener('keydown', h);
//         return () => window.removeEventListener('keydown', h);
//     }, []);

//     const formatCurrency = useCallback((num) => {
//         const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
//     }, []);

//     const handleGenerateReport = () => {
//         if (!dateRange.fromDate || !dateRange.toDate) {
//             setNotification({ show: true, message: 'Please select both dates', type: 'warning' });
//             return;
//         }
//         setShouldFetch(true);
//     };

//     const resetColumnWidths = () => {
//         setColumnWidths({
//             bsDate: 80, adDate: 80, invNo: 100, partyName: 160,
//             type: 100, payMode: 80, description: 200,
//             debit: 90, credit: 90, balance: 100, user: 90,
//         });
//         setNotification({ show: true, message: 'Column widths reset', type: 'success', duration: 2000 });
//     };

//     // ------- Print -------
//     const handlePrint = (filtered = true) => {
//         const rows = filtered ? filteredTransactions : transactions;
//         if (!rows.length) {
//             setNotification({ show: true, message: 'No transactions to print', type: 'warning' });
//             return;
//         }
//         const w = window.open('', '_blank');
//         if (!w) {
//             setNotification({ show: true, message: 'Popup blocked', type: 'error' });
//             return;
//         }
//         w.document.write(`
//             <html>
//                 <head>
//                     <title>Day Book</title>
//                     <style>
//                         @page { size: A4 landscape; margin: 5mm; }
//                         body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; padding: 5mm; }
//                         h2 { text-align: center; margin: 0 0 6px; font-size: 16px; }
//                         .meta { text-align: center; font-size: 10px; margin-bottom: 8px; }
//                         table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
//                         th, td { border: 1px solid #333; padding: 3px 5px; }
//                         th { background: #e8e8e8 !important; -webkit-print-color-adjust: exact; }
//                         .text-end { text-align: right; }
//                         .grand { background: #f5f5f5 !important; font-weight: 700; border-top: 3px double #000; }
//                     </style>
//                 </head>
//                 <body>
//                     <h2>${company?.name || ''}</h2>
//                     <div class="meta">
//                         ${company?.address || ''} | PAN: ${company?.pan || ''}<br/>
//                         From ${dateRange.fromDate} to ${dateRange.toDate} (BS)
//                     </div>
//                     <table>
//                         <thead>
//                             <tr>
//                                 <th>Miti</th><th>Date</th><th>Inv No.</th><th>Party</th>
//                                 <th>Type</th><th>Pay Mode</th><th>Description</th>
//                                 <th class="text-end">Debit</th>
//                                 <th class="text-end">Credit</th>
//                                 <th class="text-end">Balance</th>
//                                 <th>User</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             ${rows.map(r => `
//                                 <tr>
//                                     <td>${r.nepaliDate || ''}</td>
//                                     <td>${r.date ? new Date(r.date).toLocaleDateString('en-CA') : ''}</td>
//                                     <td>${r.billNumber || ''}</td>
//                                     <td>${r.accountName || ''}</td>
//                                     <td>${r.type || ''}</td>
//                                     <td>${r.paymentMode || ''}</td>
//                                     <td>${r.description || ''}</td>
//                                     <td class="text-end">${formatCurrency(r.debit)}</td>
//                                     <td class="text-end">${formatCurrency(r.credit)}</td>
//                                     <td class="text-end">${formatCurrency(r.balance)}</td>
//                                     <td>${r.userName || ''}</td>
//                                 </tr>
//                             `).join('')}
//                             <tr class="grand">
//                                 <td colspan="7" class="text-end">TOTALS</td>
//                                 <td class="text-end">${formatCurrency(totals.totalDebit)}</td>
//                                 <td class="text-end">${formatCurrency(totals.totalCredit)}</td>
//                                 <td class="text-end">${formatCurrency(totals.netBalance)}</td>
//                                 <td></td>
//                             </tr>
//                         </tbody>
//                     </table>
//                     <script>window.onload=()=>setTimeout(()=>{window.print();setTimeout(()=>window.close(),500)},300);<\/script>
//                 </body>
//             </html>
//         `);
//         w.document.close();
//     };

//     // ------- Excel -------
//     const handleExportExcel = () => {
//         if (!filteredTransactions.length) {
//             setNotification({ show: true, message: 'No data to export', type: 'warning' });
//             return;
//         }
//         setExporting(true);
//         try {
//             const data = [];
//             data.push(['Day Book']);
//             data.push(['Company:', company?.name || '']);
//             data.push(['From (BS):', dateRange.fromDate, 'To (BS):', dateRange.toDate]);
//             data.push([]);
//             data.push([
//                 'S.No', 'Miti', 'Date', 'Inv No.', 'Party', 'Type', 'Pay Mode',
//                 'Description', 'Debit', 'Credit', 'Balance', 'User'
//             ]);

//             filteredTransactions.forEach((r, i) => {
//                 data.push([
//                     i + 1,
//                     r.nepaliDate || '',
//                     r.date ? new Date(r.date).toLocaleDateString() : '',
//                     r.billNumber || '',
//                     r.accountName || '',
//                     r.type || '',
//                     r.paymentMode || '',
//                     r.description || '',
//                     Number(r.debit || 0).toFixed(2),
//                     Number(r.credit || 0).toFixed(2),
//                     Number(r.balance || 0).toFixed(2),
//                     r.userName || ''
//                 ]);
//             });

//             data.push([]);
//             data.push(['', '', '', '', '', '', '', 'TOTALS',
//                 totals.totalDebit.toFixed(2),
//                 totals.totalCredit.toFixed(2),
//                 totals.netBalance.toFixed(2),
//                 ''
//             ]);

//             const ws = XLSX.utils.aoa_to_sheet(data);
//             ws['!cols'] = [
//                 { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
//                 { wch: 26 }, { wch: 12 }, { wch: 10 }, { wch: 30 },
//                 { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
//             ];
//             const wb = XLSX.utils.book_new();
//             XLSX.utils.book_append_sheet(wb, ws, 'Day Book');
//             XLSX.writeFile(wb, `DayBook_${dateRange.fromDate}_to_${dateRange.toDate}.xlsx`);
//             setNotification({ show: true, message: 'Excel exported', type: 'success' });
//         } catch (err) {
//             console.error(err);
//             setNotification({ show: true, message: 'Failed to export', type: 'error' });
//         } finally {
//             setExporting(false);
//         }
//     };

//     // ------- Resize handle -------
//     const ResizeHandle = ({ columnName }) => (
//         <div
//             className="db-resize-handle"
//             onMouseDown={(e) => {
//                 e.preventDefault();
//                 setIsResizing(true);
//                 setResizingColumn(columnName);
//                 setStartX(e.clientX);
//                 setStartWidth(columnWidths[columnName]);
//             }}
//         />
//     );

//     const TableHeader = () => {
//         const totalWidth =
//             columnWidths.bsDate + columnWidths.adDate + columnWidths.invNo +
//             columnWidths.partyName + columnWidths.type + columnWidths.payMode +
//             columnWidths.description + columnWidths.debit + columnWidths.credit +
//             columnWidths.balance + columnWidths.user;

//         const ths = [
//             ['Miti', 'bsDate', 80],
//             ['Date', 'adDate', 80],
//             ['Inv No.', 'invNo', 100],
//             ['Party', 'partyName', 160],
//             ['Type', 'type', 100],
//             ['Pay Mode', 'payMode', 80],
//             ['Description', 'description', 200],
//             ['Debit', 'debit', 90],
//             ['Credit', 'credit', 90],
//             ['Balance', 'balance', 100],
//             ['User', 'user', 90],
//         ];

//         return (
//             <div
//                 className="db-header"
//                 style={{ minWidth: `${totalWidth}px` }}
//                 onMouseMove={(e) => {
//                     if (isResizing && resizingColumn) {
//                         const diff = e.clientX - startX;
//                         const next = Math.max(60, startWidth + diff);
//                         setColumnWidths((p) => ({ ...p, [resizingColumn]: next }));
//                     }
//                 }}
//                 onMouseUp={() => { setIsResizing(false); setResizingColumn(null); }}
//                 onMouseLeave={() => { setIsResizing(false); setResizingColumn(null); }}
//             >
//                 {ths.map(([label, key, min]) => (
//                     <div
//                         key={key}
//                         className={`db-header-cell ${['debit', 'credit', 'balance'].includes(key) ? 'db-header-cell--end' : ''}`}
//                         style={{ width: `${columnWidths[key]}px`, flexShrink: 0, minWidth: `${min}px` }}
//                     >
//                         <strong>{label}</strong>
//                         <ResizeHandle columnName={key} />
//                     </div>
//                 ))}
//                 {isResizing && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, cursor: 'col-resize' }} />}
//             </div>
//         );
//     };

//     const TableRow = ({ index, style }) => {
//         const r = filteredTransactions[index];
//         if (!r) return null;
//         const isDebit = Number(r.debit) > 0;
//         const isCredit = Number(r.credit) > 0;

//         return (
//             <div
//                 style={{ ...style, display: 'flex', alignItems: 'center', height: 28, borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white' }}
//                 className="db-row"
//                 onDoubleClick={() => {
//                     if (r.type?.toLowerCase().includes('sales') && r.id) navigate(`/retailer/sales/${r.id}/print`);
//                     else if (r.type?.toLowerCase().includes('purchase') && r.id) navigate(`/retailer/purchase/${r.id}/print`);
//                 }}
//             >
//                 <div className="db-cell db-cell--center" style={{ width: columnWidths.bsDate, flexShrink: 0 }}>{r.nepaliDate || ''}</div>
//                 <div className="db-cell db-cell--center" style={{ width: columnWidths.adDate, flexShrink: 0 }}>{r.date ? new Date(r.date).toLocaleDateString() : ''}</div>
//                 <div className="db-cell" style={{ width: columnWidths.invNo, flexShrink: 0 }}>{r.billNumber || ''}</div>
//                 <div className="db-cell" style={{ width: columnWidths.partyName, flexShrink: 0 }} title={r.accountName}>{r.accountName || ''}</div>
//                 <div className="db-cell" style={{ width: columnWidths.type, flexShrink: 0 }}>
//                     <span className={`db-badge db-badge--${getTypeBadgeClass(r.type)}`}>{r.type || ''}</span>
//                 </div>
//                 <div className="db-cell" style={{ width: columnWidths.payMode, flexShrink: 0 }}>{r.paymentMode || ''}</div>
//                 <div className="db-cell" style={{ width: columnWidths.description, flexShrink: 0 }} title={r.description}>{r.description || ''}</div>
//                 <div className="db-cell db-cell--end" style={{ width: columnWidths.debit, flexShrink: 0 }}>
//                     {isDebit ? formatCurrency(r.debit) : ''}
//                 </div>
//                 <div className="db-cell db-cell--end" style={{ width: columnWidths.credit, flexShrink: 0 }}>
//                     {isCredit ? formatCurrency(r.credit) : ''}
//                 </div>
//                 <div className="db-cell db-cell--end" style={{ width: columnWidths.balance, flexShrink: 0 }}>
//                     {formatCurrency(r.balance)}
//                 </div>
//                 <div className="db-cell" style={{ width: columnWidths.user, flexShrink: 0 }}>{r.userName || ''}</div>
//             </div>
//         );
//     };

//     if (loading && transactions.length === 0) return <Loader />;

//     return (
//         <div className="db-page">
//             <Header />

//             <div className="db-shell">
//                 {/* Top Bar */}
//                 <div className="db-topbar">
//                     <div className="db-topbar__left">
//                         <div className="db-topbar__icon"><FiBookOpen /></div>
//                         <h1>Day Book</h1>
//                     </div>
//                     <div className="db-topbar__actions">
//                         <button className="db-btn-icon" onClick={handleExportExcel} disabled={!filteredTransactions.length || exporting}>
//                             <FiDownload /> {exporting ? '…' : 'Excel'}
//                         </button>
//                         <button className="db-btn-icon" onClick={() => handlePrint(true)} disabled={!filteredTransactions.length}>
//                             <FiPrinter /> Print
//                         </button>
//                         <button className="db-btn-icon" onClick={resetColumnWidths} title="Reset columns">
//                             <FiRefreshCw /> Reset
//                         </button>
//                     </div>
//                 </div>

//                 {/* Summary Cards */}
//                 <DayBookSummaryCards
//                     salesTillDate={summaryData.salesTillDate}
//                     purchaseTillDate={summaryData.purchaseTillDate}
//                     dailySales={summaryData.dailySales}
//                     dailyPurchase={summaryData.dailyPurchase}
//                     dailyReceipt={summaryData.dailyReceipt}
//                     dailyPayment={summaryData.dailyPayment}
//                     profit={summaryData.profit}
//                     dailyProfit={summaryData.dailyProfit}
//                     nepaliDate={dateRange.toDate || ''}
//                 />

//                 {/* Toolbar */}
//                 <div className="db-toolbar">
//                     <div className="db-field db-field--date">
//                         <label>From (BS) <span className="req">*</span></label>
//                         <input
//                             ref={fromDateRef}
//                             type="text"
//                             value={dateRange.fromDate || ''}
//                             onChange={(e) => {
//                                 const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
//                                 const ad = convertBsToAd(value);
//                                 setDateRange((p) => ({ ...p, fromDate: value, fromDateAd: ad || p.fromDateAd }));
//                             }}
//                             placeholder="YYYY-MM-DD"
//                             autoComplete="off"
//                         />
//                     </div>

//                     <div className="db-field db-field--date">
//                         <label>From (AD)</label>
//                         <input
//                             type="date"
//                             value={dateRange.fromDateAd || ''}
//                             onChange={(e) => {
//                                 const value = e.target.value;
//                                 const bs = convertAdToBs(value);
//                                 setDateRange((p) => ({ ...p, fromDateAd: value, fromDate: bs || p.fromDate }));
//                             }}
//                         />
//                     </div>

//                     <div className="db-field db-field--date">
//                         <label>To (BS) <span className="req">*</span></label>
//                         <input
//                             type="text"
//                             value={dateRange.toDate || ''}
//                             onChange={(e) => {
//                                 const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
//                                 const ad = convertBsToAd(value);
//                                 setDateRange((p) => ({ ...p, toDate: value, toDateAd: ad || p.toDateAd }));
//                             }}
//                             placeholder="YYYY-MM-DD"
//                             autoComplete="off"
//                         />
//                     </div>

//                     <div className="db-field db-field--date">
//                         <label>To (AD)</label>
//                         <input
//                             type="date"
//                             value={dateRange.toDateAd || ''}
//                             onChange={(e) => {
//                                 const value = e.target.value;
//                                 const bs = convertAdToBs(value);
//                                 setDateRange((p) => ({ ...p, toDateAd: value, toDate: bs || p.toDate }));
//                             }}
//                         />
//                     </div>

//                     <div className="db-field db-field--select">
//                         <label>Type</label>
//                         <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
//                             <option value="all">All</option>
//                             <option value="Sales">Sales</option>
//                             <option value="Purchase">Purchase</option>
//                             <option value="Payment">Payment</option>
//                             <option value="Receipt">Receipt</option>
//                         </select>
//                     </div>

//                     <button className="db-btn-gen" onClick={handleGenerateReport} disabled={loading}>
//                         {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><FiSearch className="me-1" /> Generate</>}
//                     </button>

//                     <div className="db-toolbar-divider" />

//                     <div className="db-field db-field--search">
//                         <label>Search</label>
//                         <div className="db-search-wrap">
//                             <FiSearch className="db-search-icon" />
//                             <input
//                                 type="text"
//                                 value={searchQuery}
//                                 onChange={(e) => setSearchQuery(e.target.value)}
//                                 disabled={!transactions.length}
//                                 autoComplete="off"
//                             />
//                             {searchQuery && <button className="db-search-clear" onClick={() => setSearchQuery('')}>×</button>}
//                         </div>
//                     </div>

//                     <div className="db-field db-field--select">
//                         <label>Mode</label>
//                         <select
//                             value={paymentModeFilter}
//                             onChange={(e) => setPaymentModeFilter(e.target.value)}
//                             disabled={!transactions.length}
//                         >
//                             <option value="">All</option>
//                             <option value="cash">Cash</option>
//                             <option value="credit">Credit</option>
//                         </select>
//                     </div>
//                 </div>

//                 {error && (
//                     <div className="db-alert">
//                         <i className="bi bi-exclamation-circle" />{error}
//                         <button className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
//                     </div>
//                 )}

//                 {/* Main */}
//                 <div className="db-main">
//                     {!transactions.length && !loading ? (
//                         <div className="db-state">
//                             <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
//                             <h3>Select date range & generate</h3>
//                             <p>Choose a date range then click Generate.</p>
//                         </div>
//                     ) : loading ? (
//                         <div className="db-state"><div className="spinner-border text-primary" /><p>Loading data...</p></div>
//                     ) : filteredTransactions.length === 0 ? (
//                         <div className="db-state">
//                             <FiFilter size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
//                             <h3>No transactions found</h3>
//                             <p>{searchQuery ? 'Try a different search term' : 'No data for the selected range'}</p>
//                         </div>
//                     ) : (
//                         <>
//                             <div className="db-main__bar">
//                                 <span><strong>{filteredTransactions.length}</strong> transactions</span>
//                                 <span className="db-counts">
//                                     Sales: <b>{totals.countsByType.sales}</b> ·
//                                     Purchase: <b>{totals.countsByType.purchase}</b> ·
//                                     Payment: <b>{totals.countsByType.payment}</b> ·
//                                     Receipt: <b>{totals.countsByType.receipt}</b>
//                                 </span>
//                                 <span>{dateRange.fromDate} — {dateRange.toDate}</span>
//                             </div>

//                             <div className="db-table-wrap" ref={tableBodyRef}>
//                                 <AutoSizer>
//                                     {({ height, width }) => {
//                                         const totalWidth =
//                                             columnWidths.bsDate + columnWidths.adDate + columnWidths.invNo +
//                                             columnWidths.partyName + columnWidths.type + columnWidths.payMode +
//                                             columnWidths.description + columnWidths.debit + columnWidths.credit +
//                                             columnWidths.balance + columnWidths.user;

//                                         return (
//                                             <div style={{ position: 'relative', height, width: Math.max(width, totalWidth) }}>
//                                                 <TableHeader />
//                                                 <List
//                                                     height={height - 28}
//                                                     itemCount={filteredTransactions.length}
//                                                     itemSize={28}
//                                                     width={Math.max(width, totalWidth)}
//                                                 >
//                                                     {TableRow}
//                                                 </List>
//                                             </div>
//                                         );
//                                     }}
//                                 </AutoSizer>
//                             </div>

//                             <div className="db-footer">
//                                 <div
//                                     className="db-footer-cell"
//                                     style={{
//                                         width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.invNo + columnWidths.partyName + columnWidths.type + columnWidths.payMode + columnWidths.description}px`,
//                                         flexShrink: 0
//                                     }}
//                                 >
//                                     <strong>Totals</strong>
//                                 </div>
//                                 <div className="db-footer-cell db-cell--end" style={{ width: columnWidths.debit, flexShrink: 0 }}>
//                                     <strong>{formatCurrency(totals.totalDebit)}</strong>
//                                 </div>
//                                 <div className="db-footer-cell db-cell--end" style={{ width: columnWidths.credit, flexShrink: 0 }}>
//                                     <strong>{formatCurrency(totals.totalCredit)}</strong>
//                                 </div>
//                                 <div className="db-footer-cell db-cell--end" style={{ width: columnWidths.balance, flexShrink: 0 }}>
//                                     <strong>{formatCurrency(totals.netBalance)}</strong>
//                                 </div>
//                                 <div className="db-footer-cell" style={{ width: columnWidths.user, flexShrink: 0 }} />
//                             </div>
//                         </>
//                     )}
//                 </div>
//             </div>

//             {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}

//             <NotificationToast
//                 show={notification.show}
//                 message={notification.message}
//                 type={notification.type}
//                 duration={notification.duration}
//                 onClose={() => setNotification({ ...notification, show: false })}
//             />
//         </div>
//     );
// };

// export default DayBook;

//-------------------------------------------end2

// src/components/retailer/DayBook.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import NepaliDate from 'nepali-datetime';
import Loader from '../../Loader';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';
import {
    FiBookOpen, FiPrinter, FiDownload, FiSearch,
    FiRefreshCw, FiCalendar, FiFilter
} from 'react-icons/fi';
import './DayBook.css';
import api from '../../services/api';
import Header from '../Header';
import ProductModal from '../dashboard/modals/ProductModal';
import DayBookSummaryCards from './DayBookSummaryCards';

// -------- Date helpers --------
const convertBsToAd = (bsDate) => {
    if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
    try {
        const nepaliDate = new NepaliDate(bsDate);
        if (!nepaliDate || typeof nepaliDate.getDateObject !== 'function') return null;
        const jsDate = nepaliDate.getDateObject();
        if (!jsDate || isNaN(jsDate.getTime())) return null;
        const year = jsDate.getFullYear();
        const month = String(jsDate.getMonth() + 1).padStart(2, '0');
        const day = String(jsDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return null;
    }
};

const convertAdToBs = (adDate) => {
    if (!adDate) return null;
    try {
        let date;
        if (typeof adDate === 'string') {
            date = /^\d{4}-\d{2}-\d{2}$/.test(adDate)
                ? new Date(adDate + 'T00:00:00')
                : new Date(adDate);
        } else if (adDate instanceof Date) {
            date = adDate;
        } else {
            return null;
        }
        if (isNaN(date.getTime())) return null;
        const nepaliDate = new NepaliDate(date);
        if (!nepaliDate || typeof nepaliDate.getYear !== 'function') return null;
        const year = nepaliDate.getYear();
        const month = nepaliDate.getMonth();
        const day = nepaliDate.getDate();
        if (!year || month === undefined || !day) return null;
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } catch {
        return null;
    }
};

const getTypeBadgeClass = (type) => {
    const map = {
        'Sales': 'success',
        'Cash Sale': 'success',
        'Credit Sale': 'primary',
        'Purchase': 'info',
        'Payment': 'danger',
        'Receipt': 'success',
        'Sales Return': 'warning',
        'Purchase Return': 'warning',
        'Journal': 'secondary',
        'Opening': 'dark',
    };
    return map[type] || 'secondary';
};

const DayBook = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    const navigate = useNavigate();

    const [company, setCompany] = useState({
        dateFormat: 'english',
        vatEnabled: true,
        isVatExempt: false,
        fiscalYear: {}
    });

    const [dateRange, setDateRange] = useState({
        fromDate: '',
        toDate: '',
        fromDateAd: '',
        toDateAd: '',
    });

    const [typeFilter, setTypeFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentModeFilter, setPaymentModeFilter] = useState('');

    const [notification, setNotification] = useState({ show: false, message: '', type: 'success', duration: 3000 });
    const [showProductModal, setShowProductModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [totals, setTotals] = useState({
        totalDebit: 0,
        totalCredit: 0,
        netBalance: 0,
        countsByType: { sales: 0, purchase: 0, payment: 0, receipt: 0 }
    });

    // Summary card values (from server)
    const [summaryData, setSummaryData] = useState({
        salesTillDate: 0,
        purchaseTillDate: 0,
        dailySales: 0,
        dailyPurchase: 0,
        dailyReceipt: 0,
        dailyPayment: 0,
        profit: 0,
        dailyProfit: 0,
    });

    // ✅ Monotonic counter — prevents StrictMode double-fire
    const [fetchTrigger, setFetchTrigger] = useState(0);
    const [exporting, setExporting] = useState(false);

    const [columnWidths, setColumnWidths] = useState({
        bsDate: 80, adDate: 80, invNo: 100, partyName: 160,
        type: 100, payMode: 80, description: 200,
        debit: 90, credit: 90, balance: 100, user: 90,
    });
    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const tableBodyRef = useRef(null);
    const fromDateRef = useRef(null);

    // ------- Fetch company info once -------
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/retailer/day-book/entry-data');
                if (response.data.success) {
                    const d = response.data.data;
                    const dateFormat = d.company.dateFormat?.toLowerCase() || 'english';
                    const isNepali = dateFormat === 'nepali';

                    setCompany({
                        ...d.company,
                        dateFormat,
                        vatEnabled: d.company.vatEnabled || true,
                        isVatExempt: d.company.isVatExempt || false,
                    });

                    const currentFiscalYear = d.currentFiscalYear;

                    if (currentFiscalYear) {
                        let fromDate = '', toDate = '', fromAd = '', toAd = '';
                        if (isNepali) {
                            fromDate = currentFiscalYear.startDateNepali || currentNepaliDate;
                            toDate = currentNepaliDate;
                            fromAd = convertBsToAd(fromDate);
                            toAd = convertBsToAd(toDate);
                        } else {
                            fromDate = currentFiscalYear.startDate
                                ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0]
                                : currentEnglishDate;
                            toDate = currentEnglishDate;
                            fromAd = fromDate;
                            toAd = toDate;
                        }
                        setDateRange({ fromDate, toDate, fromDateAd: fromAd, toDateAd: toAd });
                    }
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
                setNotification({ show: true, message: 'Error loading company data', type: 'error' });
            }
        };
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ------- Column width persistence -------
    useEffect(() => {
        const saved = localStorage.getItem('dayBookColumnWidths');
        if (saved) {
            try { setColumnWidths(JSON.parse(saved)); } catch { }
        }
    }, []);
    useEffect(() => {
        localStorage.setItem('dayBookColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // ------- Fetch on generate — SINGLE call to /day-book -------
    useEffect(() => {
        if (fetchTrigger === 0) return;      // ← prevents StrictMode double-run
        const controller = new AbortController();

        const fetchData = async () => {
            try {
                setLoading(true);

                const params = new URLSearchParams();
                if (dateRange.fromDateAd) params.append('fromDate', dateRange.fromDateAd);
                if (dateRange.toDateAd) params.append('toDate', dateRange.toDateAd);
                if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);

                const res = await api.get(
                    `/api/retailer/day-book?${params.toString()}`,
                    { signal: controller.signal }
                );

                if (res.data.success) {
                    const txns = res.data.data.transactions || [];
                    setTransactions(txns);

                    // Server does NOT currently return summary; compute client-side
                    // so the summary cards still light up. If backend later adds
                    // `summary` in the response, use it directly.
                    const serverSummary = res.data.data.summary;
                    if (serverSummary) {
                        setSummaryData({
                            salesTillDate:    serverSummary.salesTillDate    || 0,
                            purchaseTillDate: serverSummary.purchaseTillDate || 0,
                            dailySales:       serverSummary.dailySales       || 0,
                            dailyPurchase:    serverSummary.dailyPurchase    || 0,
                            dailyReceipt:     serverSummary.dailyReceipt     || 0,
                            dailyPayment:     serverSummary.dailyPayment     || 0,
                            profit:           serverSummary.profit           || 0,
                            dailyProfit:      serverSummary.dailyProfit      || 0,
                        });
                    } else {
                        // Client-side aggregation fallback
                        let salesTillDate = 0, salesReturn = 0;
                        let purchaseTillDate = 0, purchaseReturn = 0;
                        let dailyReceipt = 0, dailyPayment = 0;

                        txns.forEach(t => {
                            const type = (t.type || '').toLowerCase();
                            const d = Number(t.debit || 0);
                            const c = Number(t.credit || 0);

                            if (type === 'sales') { salesTillDate += c || d; }
                            else if (type === 'sales return') { salesReturn += d || c; }
                            else if (type === 'purchase') { purchaseTillDate += d || c; }
                            else if (type === 'purchase return') { purchaseReturn += c || d; }
                            else if (type === 'receipt') { dailyReceipt += c || d; }
                            else if (type === 'payment') { dailyPayment += d || c; }
                        });

                        const netSales    = salesTillDate - salesReturn;
                        const netPurchase = purchaseTillDate - purchaseReturn;

                        setSummaryData({
                            salesTillDate: netSales,
                            purchaseTillDate: netPurchase,
                            dailySales: netSales,
                            dailyPurchase: netPurchase,
                            dailyReceipt,
                            dailyPayment,
                            profit: netSales - netPurchase,
                            dailyProfit: netSales - netPurchase,
                        });
                    }

                    setError(null);
                } else {
                    setError(res.data.error || 'Failed to fetch day book');
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Fetch error:', err);
                    setError(err.response?.data?.error || 'Failed to fetch day book');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchTrigger]);

    // ------- Filter + totals -------
    useEffect(() => {
        const list = Array.isArray(transactions) ? transactions : [];
        const q = searchQuery.toLowerCase();

        const filtered = list.filter(t => {
            const matchesSearch =
                (t.billNumber || '').toLowerCase().includes(q) ||
                (t.accountName || '').toLowerCase().includes(q) ||
                (t.description || '').toLowerCase().includes(q);

            const matchesType = typeFilter === 'all' || t.type === typeFilter;
            const matchesPay = !paymentModeFilter ||
                (t.paymentMode || '').toLowerCase() === paymentModeFilter.toLowerCase();

            return matchesSearch && matchesType && matchesPay;
        });

        setFilteredTransactions(filtered);

        const t = filtered.reduce((acc, trn) => {
            acc.totalDebit += Number(trn.debit || 0);
            acc.totalCredit += Number(trn.credit || 0);
            const type = (trn.type || '').toLowerCase();
            if (type.includes('sales')) acc.countsByType.sales += 1;
            if (type.includes('purchase')) acc.countsByType.purchase += 1;
            if (type.includes('payment')) acc.countsByType.payment += 1;
            if (type.includes('receipt')) acc.countsByType.receipt += 1;
            return acc;
        }, { totalDebit: 0, totalCredit: 0, countsByType: { sales: 0, purchase: 0, payment: 0, receipt: 0 } });

        t.netBalance = t.totalDebit - t.totalCredit;
        setTotals(t);
    }, [transactions, searchQuery, typeFilter, paymentModeFilter]);

    // ------- F9 ------
    useEffect(() => {
        const h = (e) => {
            if (e.key === 'F9') { e.preventDefault(); setShowProductModal(p => !p); }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    const formatCurrency = useCallback((num) => {
        const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, []);

    const handleGenerateReport = () => {
        if (!dateRange.fromDate || !dateRange.toDate) {
            setNotification({ show: true, message: 'Please select both dates', type: 'warning' });
            return;
        }
        setFetchTrigger(prev => prev + 1);      // ← increment counter
    };

    const resetColumnWidths = () => {
        setColumnWidths({
            bsDate: 80, adDate: 80, invNo: 100, partyName: 160,
            type: 100, payMode: 80, description: 200,
            debit: 90, credit: 90, balance: 100, user: 90,
        });
        setNotification({ show: true, message: 'Column widths reset', type: 'success', duration: 2000 });
    };

    // ------- Print -------
    const handlePrint = (filtered = true) => {
        const rows = filtered ? filteredTransactions : transactions;
        if (!rows.length) {
            setNotification({ show: true, message: 'No transactions to print', type: 'warning' });
            return;
        }
        const w = window.open('', '_blank');
        if (!w) {
            setNotification({ show: true, message: 'Popup blocked', type: 'error' });
            return;
        }
        w.document.write(`
            <html>
                <head>
                    <title>Day Book</title>
                    <style>
                        @page { size: A4 landscape; margin: 5mm; }
                        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; padding: 5mm; }
                        h2 { text-align: center; margin: 0 0 6px; font-size: 16px; }
                        .meta { text-align: center; font-size: 10px; margin-bottom: 8px; }
                        table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
                        th, td { border: 1px solid #333; padding: 3px 5px; }
                        th { background: #e8e8e8 !important; -webkit-print-color-adjust: exact; }
                        .text-end { text-align: right; }
                        .grand { background: #f5f5f5 !important; font-weight: 700; border-top: 3px double #000; }
                    </style>
                </head>
                <body>
                    <h2>${company?.name || ''}</h2>
                    <div class="meta">
                        ${company?.address || ''} | PAN: ${company?.pan || ''}<br/>
                        From ${dateRange.fromDate} to ${dateRange.toDate} (BS)
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Miti</th><th>Date</th><th>Inv No.</th><th>Party</th>
                                <th>Type</th><th>Pay Mode</th><th>Description</th>
                                <th class="text-end">Debit</th>
                                <th class="text-end">Credit</th>
                                <th class="text-end">Balance</th>
                                <th>User</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map(r => `
                                <tr>
                                    <td>${r.nepaliDate || ''}</td>
                                    <td>${r.date ? new Date(r.date).toLocaleDateString('en-CA') : ''}</td>
                                    <td>${r.billNumber || ''}</td>
                                    <td>${r.accountName || ''}</td>
                                    <td>${r.type || ''}</td>
                                    <td>${r.paymentMode || ''}</td>
                                    <td>${r.description || ''}</td>
                                    <td class="text-end">${formatCurrency(r.debit)}</td>
                                    <td class="text-end">${formatCurrency(r.credit)}</td>
                                    <td class="text-end">${formatCurrency(r.balance)}</td>
                                    <td>${r.userName || ''}</td>
                                </tr>
                            `).join('')}
                            <tr class="grand">
                                <td colspan="7" class="text-end">TOTALS</td>
                                <td class="text-end">${formatCurrency(totals.totalDebit)}</td>
                                <td class="text-end">${formatCurrency(totals.totalCredit)}</td>
                                <td class="text-end">${formatCurrency(totals.netBalance)}</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                    <script>window.onload=()=>setTimeout(()=>{window.print();setTimeout(()=>window.close(),500)},300);<\/script>
                </body>
            </html>
        `);
        w.document.close();
    };

    // ------- Excel -------
    const handleExportExcel = () => {
        if (!filteredTransactions.length) {
            setNotification({ show: true, message: 'No data to export', type: 'warning' });
            return;
        }
        setExporting(true);
        try {
            const data = [];
            data.push(['Day Book']);
            data.push(['Company:', company?.name || '']);
            data.push(['From (BS):', dateRange.fromDate, 'To (BS):', dateRange.toDate]);
            data.push([]);
            data.push([
                'S.No', 'Miti', 'Date', 'Inv No.', 'Party', 'Type', 'Pay Mode',
                'Description', 'Debit', 'Credit', 'Balance', 'User'
            ]);

            filteredTransactions.forEach((r, i) => {
                data.push([
                    i + 1,
                    r.nepaliDate || '',
                    r.date ? new Date(r.date).toLocaleDateString() : '',
                    r.billNumber || '',
                    r.accountName || '',
                    r.type || '',
                    r.paymentMode || '',
                    r.description || '',
                    Number(r.debit || 0).toFixed(2),
                    Number(r.credit || 0).toFixed(2),
                    Number(r.balance || 0).toFixed(2),
                    r.userName || ''
                ]);
            });

            data.push([]);
            data.push(['', '', '', '', '', '', '', 'TOTALS',
                totals.totalDebit.toFixed(2),
                totals.totalCredit.toFixed(2),
                totals.netBalance.toFixed(2),
                ''
            ]);

            const ws = XLSX.utils.aoa_to_sheet(data);
            ws['!cols'] = [
                { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
                { wch: 26 }, { wch: 12 }, { wch: 10 }, { wch: 30 },
                { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Day Book');
            XLSX.writeFile(wb, `DayBook_${dateRange.fromDate}_to_${dateRange.toDate}.xlsx`);
            setNotification({ show: true, message: 'Excel exported', type: 'success' });
        } catch (err) {
            console.error(err);
            setNotification({ show: true, message: 'Failed to export', type: 'error' });
        } finally {
            setExporting(false);
        }
    };

    // ------- Resize handle -------
    const ResizeHandle = ({ columnName }) => (
        <div
            className="db-resize-handle"
            onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
                setResizingColumn(columnName);
                setStartX(e.clientX);
                setStartWidth(columnWidths[columnName]);
            }}
        />
    );

    const TableHeader = () => {
        const totalWidth =
            columnWidths.bsDate + columnWidths.adDate + columnWidths.invNo +
            columnWidths.partyName + columnWidths.type + columnWidths.payMode +
            columnWidths.description + columnWidths.debit + columnWidths.credit +
            columnWidths.balance + columnWidths.user;

        const ths = [
            ['Miti', 'bsDate', 80],
            ['Date', 'adDate', 80],
            ['Inv No.', 'invNo', 100],
            ['Party', 'partyName', 160],
            ['Type', 'type', 100],
            ['Pay Mode', 'payMode', 80],
            ['Description', 'description', 200],
            ['Debit', 'debit', 90],
            ['Credit', 'credit', 90],
            ['Balance', 'balance', 100],
            ['User', 'user', 90],
        ];

        return (
            <div
                className="db-header"
                style={{ minWidth: `${totalWidth}px` }}
                onMouseMove={(e) => {
                    if (isResizing && resizingColumn) {
                        const diff = e.clientX - startX;
                        const next = Math.max(60, startWidth + diff);
                        setColumnWidths((p) => ({ ...p, [resizingColumn]: next }));
                    }
                }}
                onMouseUp={() => { setIsResizing(false); setResizingColumn(null); }}
                onMouseLeave={() => { setIsResizing(false); setResizingColumn(null); }}
            >
                {ths.map(([label, key, min]) => (
                    <div
                        key={key}
                        className={`db-header-cell ${['debit', 'credit', 'balance'].includes(key) ? 'db-header-cell--end' : ''}`}
                        style={{ width: `${columnWidths[key]}px`, flexShrink: 0, minWidth: `${min}px` }}
                    >
                        <strong>{label}</strong>
                        <ResizeHandle columnName={key} />
                    </div>
                ))}
                {isResizing && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, cursor: 'col-resize' }} />}
            </div>
        );
    };

    const TableRow = ({ index, style }) => {
        const r = filteredTransactions[index];
        if (!r) return null;
        const isDebit = Number(r.debit) > 0;
        const isCredit = Number(r.credit) > 0;

        return (
            <div
                style={{ ...style, display: 'flex', alignItems: 'center', height: 28, borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white' }}
                className="db-row"
                onDoubleClick={() => {
                    if (r.type?.toLowerCase().includes('sales') && r.id) navigate(`/retailer/sales/${r.id}/print`);
                    else if (r.type?.toLowerCase().includes('purchase') && r.id) navigate(`/retailer/purchase/${r.id}/print`);
                }}
            >
                <div className="db-cell db-cell--center" style={{ width: columnWidths.bsDate, flexShrink: 0 }}>{r.nepaliDate || ''}</div>
                <div className="db-cell db-cell--center" style={{ width: columnWidths.adDate, flexShrink: 0 }}>{r.date ? new Date(r.date).toLocaleDateString() : ''}</div>
                <div className="db-cell" style={{ width: columnWidths.invNo, flexShrink: 0 }}>{r.billNumber || ''}</div>
                <div className="db-cell" style={{ width: columnWidths.partyName, flexShrink: 0 }} title={r.accountName}>{r.accountName || ''}</div>
                <div className="db-cell" style={{ width: columnWidths.type, flexShrink: 0 }}>
                    <span className={`db-badge db-badge--${getTypeBadgeClass(r.type)}`}>{r.type || ''}</span>
                </div>
                <div className="db-cell" style={{ width: columnWidths.payMode, flexShrink: 0 }}>{r.paymentMode || ''}</div>
                <div className="db-cell" style={{ width: columnWidths.description, flexShrink: 0 }} title={r.description}>{r.description || ''}</div>
                <div className="db-cell db-cell--end" style={{ width: columnWidths.debit, flexShrink: 0 }}>
                    {isDebit ? formatCurrency(r.debit) : ''}
                </div>
                <div className="db-cell db-cell--end" style={{ width: columnWidths.credit, flexShrink: 0 }}>
                    {isCredit ? formatCurrency(r.credit) : ''}
                </div>
                <div className="db-cell db-cell--end" style={{ width: columnWidths.balance, flexShrink: 0 }}>
                    {formatCurrency(r.balance)}
                </div>
                <div className="db-cell" style={{ width: columnWidths.user, flexShrink: 0 }}>{r.userName || ''}</div>
            </div>
        );
    };

    if (loading && transactions.length === 0) return <Loader />;

    return (
        <div className="db-page">
            <Header />

            <div className="db-shell">
                {/* Top Bar */}
                <div className="db-topbar">
                    <div className="db-topbar__left">
                        <div className="db-topbar__icon"><FiBookOpen /></div>
                        <h1>Day Book</h1>
                    </div>
                    <div className="db-topbar__actions">
                        <button className="db-btn-icon" onClick={handleExportExcel} disabled={!filteredTransactions.length || exporting}>
                            <FiDownload /> {exporting ? '…' : 'Excel'}
                        </button>
                        <button className="db-btn-icon" onClick={() => handlePrint(true)} disabled={!filteredTransactions.length}>
                            <FiPrinter /> Print
                        </button>
                        <button className="db-btn-icon" onClick={resetColumnWidths} title="Reset columns">
                            <FiRefreshCw /> Reset
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <DayBookSummaryCards
                    salesTillDate={summaryData.salesTillDate}
                    purchaseTillDate={summaryData.purchaseTillDate}
                    dailySales={summaryData.dailySales}
                    dailyPurchase={summaryData.dailyPurchase}
                    dailyReceipt={summaryData.dailyReceipt}
                    dailyPayment={summaryData.dailyPayment}
                    profit={summaryData.profit}
                    dailyProfit={summaryData.dailyProfit}
                    nepaliDate={dateRange.toDate || ''}
                />

                {/* Toolbar */}
                <div className="db-toolbar">
                    <div className="db-field db-field--date">
                        <label>From (BS) <span className="req">*</span></label>
                        <input
                            ref={fromDateRef}
                            type="text"
                            value={dateRange.fromDate || ''}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                const ad = convertBsToAd(value);
                                setDateRange((p) => ({ ...p, fromDate: value, fromDateAd: ad || p.fromDateAd }));
                            }}
                            placeholder="YYYY-MM-DD"
                            autoComplete="off"
                        />
                    </div>

                    <div className="db-field db-field--date">
                        <label>From (AD)</label>
                        <input
                            type="date"
                            value={dateRange.fromDateAd || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                const bs = convertAdToBs(value);
                                setDateRange((p) => ({ ...p, fromDateAd: value, fromDate: bs || p.fromDate }));
                            }}
                        />
                    </div>

                    <div className="db-field db-field--date">
                        <label>To (BS) <span className="req">*</span></label>
                        <input
                            type="text"
                            value={dateRange.toDate || ''}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                const ad = convertBsToAd(value);
                                setDateRange((p) => ({ ...p, toDate: value, toDateAd: ad || p.toDateAd }));
                            }}
                            placeholder="YYYY-MM-DD"
                            autoComplete="off"
                        />
                    </div>

                    <div className="db-field db-field--date">
                        <label>To (AD)</label>
                        <input
                            type="date"
                            value={dateRange.toDateAd || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                const bs = convertAdToBs(value);
                                setDateRange((p) => ({ ...p, toDateAd: value, toDate: bs || p.toDate }));
                            }}
                        />
                    </div>

                    <div className="db-field db-field--select">
                        <label>Type</label>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                            <option value="all">All</option>
                            <option value="Sales">Sales</option>
                            <option value="Purchase">Purchase</option>
                            <option value="Payment">Payment</option>
                            <option value="Receipt">Receipt</option>
                        </select>
                    </div>

                    <button className="db-btn-gen" onClick={handleGenerateReport} disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><FiSearch className="me-1" /> Generate</>}
                    </button>

                    <div className="db-toolbar-divider" />

                    <div className="db-field db-field--search">
                        <label>Search</label>
                        <div className="db-search-wrap">
                            <FiSearch className="db-search-icon" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={!transactions.length}
                                autoComplete="off"
                            />
                            {searchQuery && <button className="db-search-clear" onClick={() => setSearchQuery('')}>×</button>}
                        </div>
                    </div>

                    <div className="db-field db-field--select">
                        <label>Mode</label>
                        <select
                            value={paymentModeFilter}
                            onChange={(e) => setPaymentModeFilter(e.target.value)}
                            disabled={!transactions.length}
                        >
                            <option value="">All</option>
                            <option value="cash">Cash</option>
                            <option value="credit">Credit</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="db-alert">
                        <i className="bi bi-exclamation-circle" />{error}
                        <button className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
                    </div>
                )}

                {/* Main */}
                <div className="db-main">
                    {!transactions.length && !loading ? (
                        <div className="db-state">
                            <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>Select date range & generate</h3>
                            <p>Choose a date range then click Generate.</p>
                        </div>
                    ) : loading ? (
                        <div className="db-state"><div className="spinner-border text-primary" /><p>Loading data...</p></div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="db-state">
                            <FiFilter size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>No transactions found</h3>
                            <p>{searchQuery ? 'Try a different search term' : 'No data for the selected range'}</p>
                        </div>
                    ) : (
                        <>
                            <div className="db-main__bar">
                                <span><strong>{filteredTransactions.length}</strong> transactions</span>
                                <span className="db-counts">
                                    Sales: <b>{totals.countsByType.sales}</b> ·
                                    Purchase: <b>{totals.countsByType.purchase}</b> ·
                                    Payment: <b>{totals.countsByType.payment}</b> ·
                                    Receipt: <b>{totals.countsByType.receipt}</b>
                                </span>
                                <span>{dateRange.fromDate} — {dateRange.toDate}</span>
                            </div>

                            <div className="db-table-wrap" ref={tableBodyRef}>
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth =
                                            columnWidths.bsDate + columnWidths.adDate + columnWidths.invNo +
                                            columnWidths.partyName + columnWidths.type + columnWidths.payMode +
                                            columnWidths.description + columnWidths.debit + columnWidths.credit +
                                            columnWidths.balance + columnWidths.user;

                                        return (
                                            <div style={{ position: 'relative', height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List
                                                    height={height - 28}
                                                    itemCount={filteredTransactions.length}
                                                    itemSize={28}
                                                    width={Math.max(width, totalWidth)}
                                                >
                                                    {TableRow}
                                                </List>
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            </div>

                            <div className="db-footer">
                                <div
                                    className="db-footer-cell"
                                    style={{
                                        width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.invNo + columnWidths.partyName + columnWidths.type + columnWidths.payMode + columnWidths.description}px`,
                                        flexShrink: 0
                                    }}
                                >
                                    <strong>Totals</strong>
                                </div>
                                <div className="db-footer-cell db-cell--end" style={{ width: columnWidths.debit, flexShrink: 0 }}>
                                    <strong>{formatCurrency(totals.totalDebit)}</strong>
                                </div>
                                <div className="db-footer-cell db-cell--end" style={{ width: columnWidths.credit, flexShrink: 0 }}>
                                    <strong>{formatCurrency(totals.totalCredit)}</strong>
                                </div>
                                <div className="db-footer-cell db-cell--end" style={{ width: columnWidths.balance, flexShrink: 0 }}>
                                    <strong>{formatCurrency(totals.netBalance)}</strong>
                                </div>
                                <div className="db-footer-cell" style={{ width: columnWidths.user, flexShrink: 0 }} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                duration={notification.duration}
                onClose={() => setNotification({ ...notification, show: false })}
            />
        </div>
    );
};

export default DayBook;