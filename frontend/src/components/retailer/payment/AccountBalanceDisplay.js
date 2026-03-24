import React, { useState, useEffect, useMemo, useCallback } from 'react';

const AccountBalanceDisplay = ({ accountId, api, newTransactionAmount = 0, originalTransactionAmount = 0, compact = false, transactionType = 'payment', dateFormat = 'nepali', isEditMode = false }) => {
    const [balance, setBalance] = useState(0);
    const [balanceType, setBalanceType] = useState('');
    const [rawBalance, setRawBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [previousAccountId, setPreviousAccountId] = useState(null);

    const formatCurrency = useCallback((num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        if (dateFormat === 'nepali') {
            return number.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        return number.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, [dateFormat]);

    const fetchAccountBalance = useCallback(async () => {
        if (!accountId) {
            setBalance(0);
            setBalanceType('');
            setRawBalance(0);
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.get(`/api/retailer/accounts/${accountId}/balance`);
            if (response.data.success) {
                setBalance(response.data.data.balance);
                setBalanceType(response.data.data.balanceType);
                setRawBalance(response.data.data.rawBalance);
                setPreviousAccountId(accountId);
            }
        } catch (err) {
            console.error('Error fetching account balance:', err);
        } finally {
            setIsLoading(false);
        }
    }, [accountId, api]);

    useEffect(() => {
        if (accountId && accountId !== previousAccountId) {
            fetchAccountBalance();
        } else if (!accountId) {
            setBalance(0);
            setBalanceType('');
            setRawBalance(0);
            setPreviousAccountId(null);
        }
    }, [accountId, previousAccountId, fetchAccountBalance]);

    const { projectedBalance, projectedBalanceType } = useMemo(() => {
        if (newTransactionAmount > 0 && rawBalance !== 0) {
            let newRawBalance;
            if (isEditMode) {
                newRawBalance = transactionType === 'payment'
                    ? rawBalance - originalTransactionAmount + newTransactionAmount
                    : rawBalance + originalTransactionAmount - newTransactionAmount;
            } else {
                newRawBalance = transactionType === 'payment'
                    ? rawBalance + newTransactionAmount
                    : rawBalance - newTransactionAmount;
            }
            return {
                projectedBalance: Math.abs(newRawBalance),
                projectedBalanceType: newRawBalance >= 0 ? 'Dr' : 'Cr'
            };
        }
        return { projectedBalance: null, projectedBalanceType: null };
    }, [newTransactionAmount, originalTransactionAmount, rawBalance, transactionType, isEditMode]);

    if (isLoading) {
        return (
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                <i className="fas fa-spinner fa-spin me-1"></i> Bal: ...
            </span>
        );
    }

    if (compact) {
        return (
            <span style={{ fontSize: '0.75rem' }}>
                <span className={balanceType === 'Dr' ? 'text-danger' : 'text-success'}>
                    Bal: {formatCurrency(balance)} {balanceType}
                </span>
                {projectedBalance !== null && (
                    <span className={`ms-2 ${projectedBalanceType === 'Dr' ? 'text-danger' : 'text-success'}`}>
                        Proj: {formatCurrency(projectedBalance)} {projectedBalanceType}
                    </span>
                )}
            </span>
        );
    }

    return (
        <div style={{ fontSize: '0.75rem' }}>
            <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">Balance:</small>
                <button
                    className="btn btn-sm btn-outline-secondary py-0 px-1"
                    onClick={fetchAccountBalance}
                    title="Refresh"
                    style={{ fontSize: '0.6rem', height: '18px' }}
                >
                    <i className="fas fa-sync-alt"></i>
                </button>
            </div>
            <div className={`fw-bold ${balanceType === 'Dr' ? 'text-danger' : 'text-success'}`}>
                {formatCurrency(balance)} {balanceType}
            </div>
            {projectedBalance !== null && (
                <div className={`fw-bold ${projectedBalanceType === 'Dr' ? 'text-danger' : 'text-success'}`}>
                    Proj: {formatCurrency(projectedBalance)} {projectedBalanceType}
                </div>
            )}
        </div>
    );
};

export default React.memo(AccountBalanceDisplay);
