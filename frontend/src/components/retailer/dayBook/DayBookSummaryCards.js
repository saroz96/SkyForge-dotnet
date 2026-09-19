// src/components/retailer/dayBook/DayBookSummaryCards.jsx
import React from 'react';

const fmt = (num) => {
    const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Two-column summary header for DayBook.
 *
 * Props:
 *   salesTillDate      {number}
 *   purchaseTillDate   {number}
 *   dailySales         {number}
 *   dailyPurchase      {number}
 *   dailyReceipt       {number}
 *   dailyPayment       {number}
 *   profit             {number}
 *   dailyProfit        {number}
 *   nepaliDate         {string} e.g. "2083-05-26"
 *   dateRangeLabel     {string} optional fallback for the date shown
 */
const DayBookSummaryCards = ({
    salesTillDate = 0,
    purchaseTillDate = 0,
    dailySales = 0,
    dailyPurchase = 0,
    dailyReceipt = 0,
    dailyPayment = 0,
    profit = 0,
    dailyProfit = 0,
    nepaliDate = '',
    dateRangeLabel = '',
}) => {
    const dateLabel = nepaliDate || dateRangeLabel;

    return (
        <div className="db-summary">
            {/* Header row — bold black bar */}
            <div className="db-summary__row db-summary__row--header">
                <div className="db-summary__cell">
                    <span className="db-summary__label">Sale Till Date</span>
                    <span className="db-summary__value">
                        {fmt(salesTillDate)} <span className="db-summary__suffix">Cr</span>
                    </span>
                </div>
                <div className="db-summary__cell">
                    <span className="db-summary__label">Purchase Till Date</span>
                    <span className="db-summary__value">
                        {fmt(purchaseTillDate)} <span className="db-summary__suffix">Dr</span>
                    </span>
                </div>
            </div>

            {/* Daily Sale | Daily Purchase */}
            <div className="db-summary__row">
                <div className="db-summary__cell db-summary__cell--stacked">
                    <div className="db-summary__title">Daily Sale</div>
                    <div className="db-summary__sub">
                        <span className="db-summary__date">({dateLabel})</span>
                        <span className="db-summary__amount">{fmt(dailySales)}</span>
                    </div>
                </div>
                <div className="db-summary__cell db-summary__cell--stacked">
                    <div className="db-summary__title">Daily Purchase</div>
                    <div className="db-summary__sub">
                        <span className="db-summary__date">({dateLabel})</span>
                        <span className="db-summary__amount">{fmt(dailyPurchase)}</span>
                    </div>
                </div>
            </div>

            {/* Daily Receipt | Daily Payment */}
            <div className="db-summary__row">
                <div className="db-summary__cell db-summary__cell--stacked">
                    <div className="db-summary__title">Daily Receipt</div>
                    <div className="db-summary__sub">
                        <span className="db-summary__date">({dateLabel})</span>
                        <span className="db-summary__amount">{fmt(dailyReceipt)}</span>
                    </div>
                </div>
                <div className="db-summary__cell db-summary__cell--stacked">
                    <div className="db-summary__title">Daily Payment</div>
                    <div className="db-summary__sub">
                        <span className="db-summary__date">({dateLabel})</span>
                        <span className="db-summary__amount">{fmt(dailyPayment)}</span>
                    </div>
                </div>
            </div>

            {/* Profit | Profit for the day */}
            <div className="db-summary__row">
                <div className="db-summary__cell db-summary__cell--stacked">
                    <div className="db-summary__title">Profit</div>
                    <div className="db-summary__sub">
                        <span className="db-summary__amount db-summary__amount--big">{fmt(profit)}</span>
                    </div>
                </div>
                <div className="db-summary__cell db-summary__cell--stacked">
                    <div className="db-summary__title">Profit for the day</div>
                    <div className="db-summary__sub">
                        <span className="db-summary__amount db-summary__amount--big">{fmt(dailyProfit)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DayBookSummaryCards;