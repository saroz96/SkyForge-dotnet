import React, { useState, useEffect, useMemo, useCallback } from 'react';

const AccountBalanceDisplay = ({
    accountId,
    api,
    newTransactionAmount = 0,
    originalTransactionAmount = 0,
    compact = false,
    transactionType = 'payment',
    dateFormat = 'nepali',
    isEditMode = false,
    entryType = null // 'Debit' or 'Credit' for journal entries and purchase/sales
}) => {
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
        if (newTransactionAmount > 0 && rawBalance !== undefined && rawBalance !== null) {
            let newRawBalance = rawBalance;
            let transactionEffect = 0;

            // Calculate the effect of this transaction on the account balance
            // Accounting rules:
            // - Debit entry: INCREASES Debit balance, DECREASES Credit balance
            // - Credit entry: INCREASES Credit balance, DECREASES Debit balance

            if (transactionType === 'journal') {
                if (entryType === 'Debit') {
                    // Debit entry: Positive effect on raw balance (increases Dr, decreases Cr)
                    transactionEffect = newTransactionAmount;
                } else if (entryType === 'Credit') {
                    // Credit entry: Negative effect on raw balance (increases Cr, decreases Dr)
                    transactionEffect = -newTransactionAmount;
                }
            } else if (transactionType === 'payment') {
                // For payment module:
                // If entryType is 'Debit' - means we are DEBITING this account (e.g., paying a supplier)
                // If entryType is 'Credit' - means we are CREDITING this account (e.g., receiving payment)
                if (entryType === 'Debit') {
                    // Debiting an account: 
                    // - If Dr balance: INCREASES (positive effect)
                    // - If Cr balance: DECREASES (positive effect reduces negative)
                    transactionEffect = newTransactionAmount;
                } else if (entryType === 'Credit') {
                    // Crediting an account:
                    // - If Dr balance: DECREASES (negative effect)
                    // - If Cr balance: INCREASES (negative effect makes more negative)
                    transactionEffect = -newTransactionAmount;
                } else {
                    // Default - treat as debit
                    transactionEffect = newTransactionAmount;
                }
            } else if (transactionType === 'receipt') {
                if (entryType === 'Debit') {
                    transactionEffect = -newTransactionAmount;
                } else if (entryType === 'Credit') {
                    transactionEffect = newTransactionAmount;
                } else {
                    transactionEffect = -newTransactionAmount;
                }
            } else {
                // Default behavior
                transactionEffect = entryType === 'Debit' ? newTransactionAmount : -newTransactionAmount;
            }

            if (isEditMode) {
                // Calculate original transaction effect
                let originalEffect = 0;
                if (transactionType === 'journal') {
                    if (entryType === 'Debit') {
                        originalEffect = originalTransactionAmount;
                    } else if (entryType === 'Credit') {
                        originalEffect = -originalTransactionAmount;
                    }
                } else if (transactionType === 'payment') {
                    if (entryType === 'Debit') {
                        originalEffect = originalTransactionAmount;
                    } else if (entryType === 'Credit') {
                        originalEffect = -originalTransactionAmount;
                    } else {
                        originalEffect = originalTransactionAmount;
                    }
                } else if (transactionType === 'receipt') {
                    if (entryType === 'Debit') {
                        originalEffect = -originalTransactionAmount;
                    } else if (entryType === 'Credit') {
                        originalEffect = originalTransactionAmount;
                    } else {
                        originalEffect = -originalTransactionAmount;
                    }
                } else {
                    originalEffect = entryType === 'Debit' ? originalTransactionAmount : -originalTransactionAmount;
                }

                // Remove original effect and add new effect
                newRawBalance = rawBalance - originalEffect + transactionEffect;
            } else {
                // Add transaction effect to current balance
                newRawBalance = rawBalance + transactionEffect;
            }

            return {
                projectedBalance: Math.abs(newRawBalance),
                projectedBalanceType: newRawBalance >= 0 ? 'Dr' : 'Cr'
            };
        }
        return { projectedBalance: null, projectedBalanceType: null };
    }, [newTransactionAmount, originalTransactionAmount, rawBalance, transactionType, isEditMode, entryType]);

    // For new accounts with zero balance, show the projected balance directly
    const getDisplayBalance = useCallback(() => {
        // If we have a projected balance and the current balance is zero (new account)
        if (projectedBalance !== null && newTransactionAmount > 0 && rawBalance === 0 && balance === 0) {
            return {
                displayBalance: projectedBalance,
                displayBalanceType: projectedBalanceType
            };
        }
        return {
            displayBalance: balance,
            displayBalanceType: balanceType
        };
    }, [balance, balanceType, projectedBalance, projectedBalanceType, newTransactionAmount, rawBalance]);

    const { displayBalance, displayBalanceType } = getDisplayBalance();

    if (isLoading) {
        return (
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                <i className="fas fa-spinner fa-spin me-1"></i> Bal: ...
            </span>
        );
    }

    // For accounts with no balance yet (new account)
    if (!accountId || (balance === 0 && !balanceType && projectedBalance === null)) {
        if (compact) {
            return (
                <span style={{ fontSize: '0.75rem' }}>
                    <span className="text-muted">Bal: 0.00 Dr</span>
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
                <div className="fw-bold text-muted">
                    0.00 Dr
                </div>
            </div>
        );
    }

    if (compact) {
        return (
            <span style={{ fontSize: '0.75rem' }}>
                <span className={displayBalanceType === 'Dr' ? 'text-danger' : 'text-success'}>
                    Bal: {formatCurrency(displayBalance)} {displayBalanceType}
                </span>
                {projectedBalance !== null && newTransactionAmount > 0 && (
                    <span className={`ms-2 ${projectedBalanceType === 'Dr' ? 'text-danger' : 'text-success'}`}>
                        → {formatCurrency(projectedBalance)} {projectedBalanceType}
                    </span>
                )}
            </span>
        );
    }

    return (
        <div style={{ fontSize: '0.75rem' }}>
            <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">Current Balance:</small>
                <button
                    className="btn btn-sm btn-outline-secondary py-0 px-1"
                    onClick={fetchAccountBalance}
                    title="Refresh Balance"
                    style={{ fontSize: '0.6rem', height: '18px' }}
                >
                    <i className="fas fa-sync-alt"></i>
                </button>
            </div>
            <div className={`fw-bold ${displayBalanceType === 'Dr' ? 'text-danger' : 'text-success'}`}>
                {formatCurrency(displayBalance)} {displayBalanceType}
            </div>
            {projectedBalance !== null && newTransactionAmount > 0 && (
                <div className="small text-muted mt-1">
                    After this entry:
                    <span className={`ms-1 fw-bold ${projectedBalanceType === 'Dr' ? 'text-danger' : 'text-success'}`}>
                        {formatCurrency(projectedBalance)} {projectedBalanceType}
                    </span>
                </div>
            )}
        </div>
    );
};

export default React.memo(AccountBalanceDisplay);