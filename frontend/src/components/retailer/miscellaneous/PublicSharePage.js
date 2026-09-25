import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NepaliDate from 'nepali-datetime';
import publicApi from '../../services/publicApi';
import '../../../stylesheet/noDateIcon.css';
import './PublicSharePage.css';

const convertBsToAd = (bs) => {
    try {
        if (!bs || !/^\d{4}-\d{2}-\d{2}$/.test(bs)) return null;
        const nd = new NepaliDate(bs);
        const js = nd.getDateObject();
        return `${js.getFullYear()}-${String(js.getMonth() + 1).padStart(2, '0')}-${String(js.getDate()).padStart(2, '0')}`;
    } catch { return null; }
};

const convertAdToBs = (ad) => {
    try {
        if (!ad) return null;
        const d = new Date(ad + 'T00:00:00');
        const nd = new NepaliDate(d);
        return `${nd.getYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
    } catch { return null; }
};

const PublicSharePage = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [company, setCompany] = useState(null);
    const [account, setAccount] = useState(null);
    const [fiscalYear, setFiscalYear] = useState(null);

    const [fromBs, setFromBs] = useState('');
    const [toBs, setToBs] = useState('');
    const [fromAd, setFromAd] = useState('');
    const [toAd, setToAd] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await publicApi.get(`/api/public/share/${encodeURIComponent(token)}`);
                if (!res.data.success) {
                    setError(res.data.message || 'Invalid link');
                    return;
                }
                const d = res.data.data;
                setCompany(d.company);
                setAccount(d.account);
                setFiscalYear(d.fiscalYear);

                setFromAd(d.defaultFromAd);
                setToAd(d.defaultToAd);
                setFromBs(convertAdToBs(d.defaultFromAd) || d.defaultFromAd);
                setToBs(convertAdToBs(d.defaultToAd) || d.defaultToAd);
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    'This link is invalid or has expired.'
                );
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token]);

    const handleFromBs = (v) => {
        setFromBs(v);
        const ad = convertBsToAd(v);
        if (ad) setFromAd(ad);
    };
    const handleToBs = (v) => {
        setToBs(v);
        const ad = convertBsToAd(v);
        if (ad) setToAd(ad);
    };
    const handleFromAd = (v) => {
        setFromAd(v);
        const bs = convertAdToBs(v);
        if (bs) setFromBs(bs);
    };
    const handleToAd = (v) => {
        setToAd(v);
        const bs = convertAdToBs(v);
        if (bs) setToBs(bs);
    };

    const setPreset = (preset) => {
        const today = new Date();
        const fmt = (d) => d.toISOString().split('T')[0];
        let f, t;
        if (preset === 'fy') {
            f = fiscalYear?.startDate?.split('T')[0] || fmt(today);
            t = fmt(today);
        } else if (preset === 'last30') {
            const d = new Date(today); d.setDate(d.getDate() - 30);
            f = fmt(d); t = fmt(today);
        } else if (preset === 'last90') {
            const d = new Date(today); d.setDate(d.getDate() - 90);
            f = fmt(d); t = fmt(today);
        } else if (preset === 'thisMonth') {
            f = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
            t = fmt(today);
        }
        handleFromAd(f);
        handleToAd(t);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        let f = fromAd, t = toAd;
        if (!f && fromBs) f = convertBsToAd(fromBs);
        if (!t && toBs) t = convertBsToAd(toBs);
        if (!f || !t) return;
        if (f > t) [f, t] = [t, f];
        navigate(`/s/${encodeURIComponent(token)}/statement?fromDate=${f}&toDate=${t}`);
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <div className="spinner-border text-primary" role="status" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger text-center">
                    <i className="fas fa-exclamation-triangle me-2" />
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="psp-page">
            <div className="psp-wrap">
                <div className="psp-card">
                    <div className="psp-card-header">
                        <i className="fas fa-file-invoice me-2" />
                        Statement of Account
                    </div>

                    <div className="psp-card-body">
                        {/* Company */}
                        <div className="psp-company">
                            <div className="psp-company__name">{company.name}</div>
                            <div className="psp-company__details">
                                {company.address}{company.city ? `, ${company.city}` : ''}<br />
                                PAN: {company.pan} | Phone: {company.phone}
                            </div>
                        </div>

                        {/* Party / FY alert */}
                        <div className="psp-party">
                            <strong>Party:</strong> {account.uniqueNumber} - {account.name}
                            {fiscalYear?.name && (
                                <span className="psp-party__fy">
                                    <strong>Fiscal Year:</strong> {fiscalYear.name}
                                </span>
                            )}
                        </div>

                        <h5 className="psp-title">Select Date Range</h5>

                        <form onSubmit={handleSubmit}>
                            {/* Presets */}
                            <div className="psp-presets">
                                <button type="button" className="psp-chip" onClick={() => setPreset('fy')}>Current Fiscal Year</button>
                                <button type="button" className="psp-chip" onClick={() => setPreset('last30')}>Last 30 Days</button>
                                <button type="button" className="psp-chip" onClick={() => setPreset('last90')}>Last 90 Days</button>
                                <button type="button" className="psp-chip" onClick={() => setPreset('thisMonth')}>This Month</button>
                            </div>

                            {/* Date fields */}
                            <div className="psp-grid">
                                <div className="psp-field">
                                    <label className="psp-field__label">
                                        From (BS): <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="no-date-icon"
                                        placeholder="YYYY-MM-DD (BS)"
                                        value={fromBs}
                                        onChange={(e) => handleFromBs(e.target.value)}
                                        autoComplete="off"
                                        required
                                    />
                                </div>
                                <div className="psp-field">
                                    <label className="psp-field__label">From (AD):</label>
                                    <input
                                        type="date"
                                        value={fromAd}
                                        onChange={(e) => handleFromAd(e.target.value)}
                                    />
                                </div>
                                <div className="psp-field">
                                    <label className="psp-field__label">
                                        To (BS): <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="no-date-icon"
                                        placeholder="YYYY-MM-DD (BS)"
                                        value={toBs}
                                        onChange={(e) => handleToBs(e.target.value)}
                                        autoComplete="off"
                                        required
                                    />
                                </div>
                                <div className="psp-field">
                                    <label className="psp-field__label">To (AD):</label>
                                    <input
                                        type="date"
                                        value={toAd}
                                        onChange={(e) => handleToAd(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="psp-actions">
                                <button
                                    type="button"
                                    className="psp-btn psp-btn--ghost"
                                    onClick={() => setPreset('fy')}
                                >
                                    <i className="fas fa-redo me-1" /> Reset
                                </button>
                                <button type="submit" className="psp-btn psp-btn--primary">
                                    <i className="fas fa-eye me-1" /> View Statement
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="psp-foot">
                    <i className="fas fa-lock me-1" /> Secure share link · Powered by Ams Software
                </div>
            </div>
        </div>
    );
};

export default PublicSharePage;