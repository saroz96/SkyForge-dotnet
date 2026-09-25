import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import publicApi from '../../services/publicApi';
import './PublicShareStatement.css';

const formatAD = (d) => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`;
};

const formatCurrency = (num) => {
    const number =
        typeof num === 'string'
            ? parseFloat(num.replace(/,/g, ''))
            : Number(num) || 0;
    return number.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatBalance = (amount) =>
    amount > 0
        ? `${formatCurrency(amount)} Dr`
        : `${formatCurrency(Math.abs(amount))} Cr`;

const PublicShareStatement = () => {
    const { token } = useParams();
    const [searchParams] = useSearchParams();
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [payload, setPayload] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await publicApi.get(
                    `/api/public/share/${encodeURIComponent(token)}/statement`,
                    { params: { fromDate, toDate } }
                );
                if (!res.data.success) {
                    setError(res.data.message || 'Failed to load statement');
                    return;
                }
                setPayload(res.data.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load statement');
            } finally {
                setLoading(false);
            }
        };
        if (fromDate && toDate) load();
    }, [token, fromDate, toDate]);

    /* ---------- Print: same CSS as Statement.js ---------- */
    const handlePrint = useCallback(() => {
        if (!payload) return;
        const { company, account, statement } = payload;
        const rows = statement.statement || [];

        let running = statement.openingBalance || 0;
        let totalDebit = 0;
        let totalCredit = 0;

        let tableRows = '';
        rows.forEach((item) => {
            const debit = parseFloat(item.debit) || 0;
            const credit = parseFloat(item.credit) || 0;
            running += debit - credit;
            totalDebit += debit;
            totalCredit += credit;

            const balanceText =
                running > 0
                    ? `${formatCurrency(Math.abs(running))} Dr`
                    : `${formatCurrency(Math.abs(running))} Cr`;

            tableRows += `<tr>
                <td>${item.nepaliDate || '-'}</td>
                <td>${item.date ? formatAD(item.date) : '-'}</td>
                <td>${item.billNumber || '-'}</td>
                <td>${item.type || '-'}</td>
                <td>${item.paymentMode || '-'}</td>
                <td style="white-space:normal;word-wrap:break-word;max-width:150px;">${item.accountType || '-'}</td>
                <td class="text-end">${debit > 0 ? formatCurrency(debit) : '-'}</td>
                <td class="text-end">${credit > 0 ? formatCurrency(credit) : '-'}</td>
                <td class="text-end">${balanceText}</td>
                <td>${item.cashSettlementRemarks || ''}</td>
            </tr>`;
        });

        const finalBalanceText =
            running > 0
                ? `${formatCurrency(Math.abs(running))} Dr`
                : `${formatCurrency(Math.abs(running))} Cr`;

        const tableContent = `
            <div class="print-header">
                <div class="company-name">${company.name || 'Company Name'}</div>
                <div class="company-details">
                    ${company.address || ''}${company.city ? ', ' + company.city : ''}<br>
                    PAN: ${company.pan || ''} | Phone: ${company.phone || ''}
                </div>
                <hr style="margin:6px 0; border: 1px solid #ccc;">
                <div class="report-title">STATEMENT OF ACCOUNT</div>
                <div class="statement-info">
                    <strong>Party:</strong> ${account.uniqueNumber} - ${account.name}
                    &nbsp;|&nbsp;
                    <strong>From (AD):</strong> ${formatAD(fromDate)}
                    &nbsp;|&nbsp;
                    <strong>To (AD):</strong> ${formatAD(toDate)}
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Miti</th>
                        <th>Date</th>
                        <th>Vch No.</th>
                        <th>Type</th>
                        <th>Pay Mode</th>
                        <th>Account</th>
                        <th class="text-end">Debit</th>
                        <th class="text-end">Credit</th>
                        <th class="text-end">Balance</th>
                        <th>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                    <tr class="grand-total-row">
                        <td colspan="6" class="text-end total-label">TOTALS</td>
                        <td class="text-end total-label">${formatCurrency(totalDebit)}</td>
                        <td class="text-end total-label">${formatCurrency(totalCredit)}</td>
                        <td class="text-end total-label">${finalBalanceText}</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
            <div class="footer">
                Generated on: ${new Date().toLocaleString()} | Powered by Ams Software
            </div>
        `;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Popup blocked. Please allow popups to print.');
            return;
        }
        printWindow.document.write(`<html><head><title>Statement of Account</title><style>
            @page { margin: 5mm; size: A4 portrait; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; margin: 0; padding: 5mm; background: #fff; color: #000; }
            table { width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 10px; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th, td { border: 1px solid #333; padding: 4px 6px; text-align: left; white-space: nowrap; }
            th { background-color: #e8e8e8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11px; font-weight: 700; color: #1a1a1a; }
            td { font-size: 10px; padding: 4px 6px; }
            .print-header { text-align: center; margin-bottom: 10px; }
            .text-end { text-align: right; }
            .text-center { text-align: center; }
            .nowrap { white-space: nowrap; }
            .report-title { text-align: center; text-decoration: underline; font-size: 14px; font-weight: 700; margin: 6px 0; color: #1a1a1a; letter-spacing: 0.5px; }
            .grand-total-row td { font-weight: 700; border-top: 3px double #000; background-color: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .company-name { font-size: 18px; font-weight: 700; margin: 0; padding: 0; color: #1a1a1a; letter-spacing: 1px; }
            .company-details { font-size: 10px; margin: 4px 0; color: #333; line-height: 1.4; }
            .statement-info { font-size: 10px; margin: 4px 0; color: #444; line-height: 1.6; }
            .statement-info strong { font-weight: 600; color: #1a1a1a; }
            .footer { margin-top: 15px; font-size: 9px; text-align: center; border-top: 1px solid #ccc; padding-top: 8px; color: #666; }
            .total-label { font-size: 11px; font-weight: 600; }
            @media print { body { padding: 10px; } th, td { padding: 3px 5px; } }
        </style></head><body>${tableContent}<script>
            window.onload = function(){
                setTimeout(function(){
                    window.print();
                    setTimeout(function(){ window.close(); }, 500);
                }, 300);
            };
        </script></body></html>`);
        printWindow.document.close();
    }, [payload, fromDate, toDate]);

    /* ---------- Loading ---------- */
    if (loading) {
        return (
            <div className="ps-page">
                <div className="ps-shell">
                    <div className="ps-state">
                        <div className="spinner-border text-primary" />
                        <p className="mt-2">Loading statement...</p>
                    </div>
                </div>
            </div>
        );
    }

    /* ---------- Error ---------- */
    if (error) {
        return (
            <div className="ps-page">
                <div className="ps-shell">
                    <div className="ps-actions">
                        <div className="ps-actions__left">
                            <Link to={`/s/${token}`} className="ps-btn ps-btn--secondary">
                                ← Back
                            </Link>
                        </div>
                    </div>
                    <div className="ps-card">
                        <div className="ps-state">
                            <div className="ps-alert" style={{ maxWidth: 480 }}>
                                {error}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ---------- Render ---------- */
    const { company, account, statement } = payload;
    const rows = statement.statement || [];
    let running = statement.openingBalance || 0;

    return (
        <div className="ps-page">
            <div className="ps-shell">
                {/* Screen-only actions */}
                <div className="ps-actions">
                    <div className="ps-actions__left">
                        <Link to={`/s/${token}`} className="ps-btn ps-btn--secondary">
                            ← New Search
                        </Link>
                    </div>
                    <div className="ps-actions__right">
                        <button
                            type="button"
                            className="ps-btn ps-btn--primary"
                            onClick={handlePrint}
                        >
                            🖨 Print
                        </button>
                    </div>
                </div>

                {/* Statement card — this is the ONLY thing printed */}
                <div className="ps-card">
                    <div className="ps-head">
                        <div className="ps-head__company">{company.name}</div>
                        <div className="ps-head__details">
                            {company.address}
                            {company.city ? `, ${company.city}` : ''}
                            <br />
                            PAN: {company.pan} | Phone: {company.phone}
                        </div>
                        <div className="ps-head__title">STATEMENT OF ACCOUNT</div>
                        <div className="ps-head__meta">
                            <span>
                                <strong>Party:</strong> {account.uniqueNumber} - {account.name}
                            </span>
                            <span>
                                <strong>From (AD):</strong> {formatAD(fromDate)}
                            </span>
                            <span>
                                <strong>To (AD):</strong> {formatAD(toDate)}
                            </span>
                        </div>
                    </div>

                    <div className="ps-table-wrap">
                        <table className="ps-table">
                            <thead>
                                <tr>
                                    <th>Miti</th>
                                    <th>Date</th>
                                    <th>Vch No.</th>
                                    <th>Type</th>
                                    <th>Pay Mode</th>
                                    <th>Account</th>
                                    <th className="num">Debit (Rs.)</th>
                                    <th className="num">Credit (Rs.)</th>
                                    <th className="num">Balance (Rs.)</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((item, idx) => {
                                    running += (item.debit || 0) - (item.credit || 0);
                                    const sign = running >= 0 ? 'Dr' : 'Cr';
                                    const bal = Math.abs(running).toFixed(2);
                                    return (
                                        <tr key={idx}>
                                            <td>{item.nepaliDate || '-'}</td>
                                            <td>{item.date ? formatAD(item.date) : '-'}</td>
                                            <td>{item.billNumber || '-'}</td>
                                            <td>{item.type || '-'}</td>
                                            <td>{item.paymentMode || '-'}</td>
                                            <td>{item.accountType || '-'}</td>
                                            <td className="num">
                                                {item.debit > 0 ? item.debit.toFixed(2) : '-'}
                                            </td>
                                            <td className="num">
                                                {item.credit > 0 ? item.credit.toFixed(2) : '-'}
                                            </td>
                                            <td className="num">
                                                {bal} {sign}
                                            </td>
                                            <td>{item.cashSettlementRemarks || ''}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={6} className="num">
                                        TOTALS
                                    </td>
                                    <td className="num">
                                        {(statement.totalDebit || 0).toFixed(2)}
                                    </td>
                                    <td className="num">
                                        {(statement.totalCredit || 0).toFixed(2)}
                                    </td>
                                    <td className="num">
                                        {Math.abs(running).toFixed(2)}{' '}
                                        {running >= 0 ? 'Dr' : 'Cr'}
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="ps-foot">
                        <strong>Last Updated:</strong>{' '}
                        {new Date().toISOString().split('T')[0]} | Powered by Ams Software
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicShareStatement;