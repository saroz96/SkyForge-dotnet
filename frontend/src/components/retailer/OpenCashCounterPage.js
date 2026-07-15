import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Header from './Header';

const OpenCashCounterPage = () => {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [session, setSession] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [userSessions, setUserSessions] = useState([]);
    const [totalCash, setTotalCash] = useState(0);
    const [denominations, setDenominations] = useState({
        2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0,
        50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
    });
    const [closingDenominations, setClosingDenominations] = useState({
        2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0,
        50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
    });

    // Create refs for all input fields
    const inputRefs = useRef({});
    const printRef = useRef();

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    api.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    const formatCurrency = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/api/user/admin/users/list');
            if (response.data.success) {
                setUsers(response.data.data.users || []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
        }
    };

    const fetchCurrentSession = async () => {
        if (!selectedUserId) return;
        try {
            const response = await api.get(`/api/retailer/cash-counter/current-session?userId=${selectedUserId}`);
            if (response.data.success && response.data.data) {
                setSession(response.data.data);
                setIsOpen(true);
                fetchDenominations(response.data.data.id);
            } else {
                setIsOpen(false);
                setSession(null);
                // Reset denominations when no session exists
                setDenominations({
                    2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0,
                    50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
                });
                setClosingDenominations({
                    2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0,
                    50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
                });
            }
        } catch (error) {
            console.error('Error fetching current session:', error);
            setIsOpen(false);
            setSession(null);
            // Reset denominations on error
            setDenominations({
                2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0,
                50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
            });
            setClosingDenominations({
                2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0,
                50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
            });
        }
    };

    const fetchDenominations = async (sessionId) => {
        try {
            const response = await api.get(`/api/retailer/cash-counter/denominations/${sessionId}`);
            if (response.data.success) {
                const denomData = response.data.data;
                // Reset denominations first
                const newDenoms = {
                    2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0,
                    50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
                };
                // Then set the fetched values
                denomData.forEach(d => {
                    const value = parseInt(d.denominationType);
                    newDenoms[value] = d.quantity;
                });
                setDenominations(newDenoms);
            }
        } catch (error) {
            console.error('Error fetching denominations:', error);
        }
    };

    const fetchUserSummary = async () => {
        if (!selectedUserId) return;
        try {
            const response = await api.get(`/api/retailer/cash-counter/user-summary?userId=${selectedUserId}`);
            if (response.data.success) {
                setUserSessions(response.data.data.sessions || []);
                setTotalCash(response.data.data.totalCash || 0);
            }
        } catch (error) {
            console.error('Error fetching user summary:', error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (selectedUserId) {
            fetchCurrentSession();
            fetchUserSummary();
        }
    }, [selectedUserId]);

    // Add this new useEffect to reset denominations when user changes
    useEffect(() => {
        // Reset denominations when user changes
        setDenominations({
            2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0,
            50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
        });
        setClosingDenominations({
            2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0,
            50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
        });
        setNotes('');
    }, [selectedUserId]);

    useEffect(() => {
        if (selectedUserId) {
            fetchCurrentSession();
            fetchUserSummary();
        }
    }, [selectedUserId]);

    const calculateTotal = (denomObj) => {
        let total = 0;
        for (const [key, value] of Object.entries(denomObj)) {
            total += parseInt(key) * parseInt(value);
        }
        return total;
    };

    const handleDenominationChange = (denom, value, type = 'opening') => {
        const setter = type === 'opening' ? setDenominations : setClosingDenominations;
        setter(prev => ({
            ...prev,
            [denom]: parseInt(value) || 0
        }));
    };

    // Handle Enter key to move to next field
    const handleKeyDown = (e, currentFieldId, type = 'opening') => {
        if (e.key === 'Enter') {
            e.preventDefault();

            const denominationKeys = Object.keys(type === 'opening' ? denominations : closingDenominations);
            const currentIndex = denominationKeys.indexOf(currentFieldId);

            // If not the last field, move to next denomination
            if (currentIndex < denominationKeys.length - 1) {
                const nextDenom = denominationKeys[currentIndex + 1];
                const nextInput = inputRefs.current[`${type}-${nextDenom}`];
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                }
            } else {
                // If last denomination field, move to notes field
                const notesInput = inputRefs.current[`${type}-notes`];
                if (notesInput) {
                    notesInput.focus();
                    notesInput.select();
                }
            }
        }
    };

    // Handle Enter key on notes field to trigger button
    const handleNotesKeyDown = (e, type = 'opening') => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const buttonId = type === 'opening' ? 'openButton' : 'closeButton';
            const button = document.getElementById(buttonId);
            if (button) {
                button.click();
            }
        }
    };

    // // Print Opening Report
    // const printOpeningReport = () => {
    //     const total = calculateTotal(denominations);
    //     const selectedUser = users.find(u => u.id === selectedUserId);

    //     // Get logged-in user from localStorage (where token is stored)
    //     // The token contains the user info in the claims
    //     let loggedInUserName = 'System User';
    //     try {
    //         const token = localStorage.getItem('token');
    //         if (token) {
    //             // Decode the JWT token to get user info
    //             const payload = JSON.parse(atob(token.split('.')[1]));
    //             loggedInUserName = payload.name || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 'System User';
    //         }
    //     } catch (e) {
    //         console.error('Error parsing token:', e);
    //     }

    //     // Create print content
    //     const printContent = `
    //         <!DOCTYPE html>
    //         <html>
    //         <head>
    //             <title>Opening Cash Report</title>
    //             <style>
    //                 body { font-family: Arial, sans-serif; padding: 20px; }
    //                 .header { text-align: center; margin-bottom: 20px; }
    //                 .header h1 { margin: 0; color: #333; }
    //                 .header p { margin: 5px 0; color: #666; }
    //                 table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    //                 th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    //                 th { background-color: #f5f5f5; }
    //                 .text-right { text-align: right; }
    //                 .total-row { font-weight: bold; background-color: #f0f0f0; }
    //                 .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
    //                 .status-open { color: green; }
    //                 .signature-section {
    //                     margin-top: 40px;
    //                     display: flex;
    //                     justify-content: space-between;
    //                     padding: 0 20px;
    //                 }
    //                 .signature-box {
    //                     text-align: center;
    //                     width: 45%;
    //                 }
    //                 .signature-line {
    //                     border-top: 1px solid #333;
    //                     margin-top: 40px;
    //                     padding-top: 10px;
    //                 }
    //                 .signature-label {
    //                     font-weight: bold;
    //                     margin-bottom: 5px;
    //                 }
    //             </style>
    //         </head>
    //         <body>
    //             <div class="header">
    //                 <h1>Opening Cash Counter</h1>
    //                 <p><strong>User:</strong> ${selectedUser?.name || 'N/A'}</p>
    //                 <p><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
    //                 <p><strong>Status:</strong> <span class="status-open">🟢 Open</span></p>
    //             </div>

    //             <h3>Denomination Details</h3>
    //             <table>
    //                 <thead>
    //                     <tr>
    //                         <th>Denomination</th>
    //                         <th class="text-right">Quantity</th>
    //                         <th class="text-right">Amount</th>
    //                     </tr>
    //                 </thead>
    //                 <tbody>
    //                     ${Object.entries(denominations)
    //             .filter(([_, value]) => value > 0)
    //             .map(([denom, value]) => `
    //                             <tr>
    //                                 <td>Rs. ${denom}</td>
    //                                 <td class="text-right">${value}</td>
    //                                 <td class="text-right">Rs. ${formatCurrency(parseInt(denom) * parseInt(value))}</td>
    //                             </tr>
    //                         `).join('')}
    //                     <tr class="total-row">
    //                         <td colspan="2"><strong>Total</strong></td>
    //                         <td class="text-right"><strong>Rs. ${formatCurrency(total)}</strong></td>
    //                     </tr>
    //                 </tbody>
    //             </table>

    //             ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}

    //             <div class="signature-section">
    //                 <div class="signature-box">
    //                     <div class="signature-label">Prepared By</div>
    //                     <div class="signature-line">${loggedInUserName}</div>
    //                     <div style="font-size: 12px; color: #666; margin-top: 5px;">(Signature & Date)</div>
    //                 </div>
    //                 <div class="signature-box">
    //                     <div class="signature-label">Approved By</div>
    //                     <div class="signature-line">_________________</div>
    //                     <div style="font-size: 12px; color: #666; margin-top: 5px;">(Signature & Date)</div>
    //                 </div>
    //             </div>

    //         </body>
    //         </html>
    //     `;

    //     // Open print window
    //     const printWindow = window.open('', '_blank', 'width=800,height=600');
    //     if (!printWindow) {
    //         alert('Please allow pop-ups for this site to print reports.');
    //         return;
    //     }

    //     printWindow.document.write(printContent);
    //     printWindow.document.close();
    //     printWindow.focus();

    //     // Wait for content to load then print
    //     setTimeout(() => {
    //         printWindow.print();
    //         printWindow.close();
    //     }, 500);
    // };

    // // Print Closing Report
    // const printClosingReport = () => {
    //     const closingTotal = calculateTotal(closingDenominations);
    //     const expectedTotal = session ? calculateSessionTotal(session) : 0;
    //     const difference = closingTotal - expectedTotal;
    //     const selectedUser = users.find(u => u.id === selectedUserId);

    //     // Get logged-in user from localStorage (where token is stored)
    //     let loggedInUserName = 'System User';
    //     try {
    //         const token = localStorage.getItem('token');
    //         if (token) {
    //             // Decode the JWT token to get user info
    //             const payload = JSON.parse(atob(token.split('.')[1]));
    //             loggedInUserName = payload.name || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 'System User';
    //         }
    //     } catch (e) {
    //         console.error('Error parsing token:', e);
    //     }

    //     const printContent = `
    //         <!DOCTYPE html>
    //         <html>
    //         <head>
    //             <title>Closing Cash Counter Report</title>
    //             <style>
    //                 body { font-family: Arial, sans-serif; padding: 20px; }
    //                 .header { text-align: center; margin-bottom: 20px; }
    //                 .header h1 { margin: 0; color: #333; }
    //                 .header p { margin: 5px 0; color: #666; }
    //                 table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    //                 th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    //                 th { background-color: #f5f5f5; }
    //                 .text-right { text-align: right; }
    //                 .total-row { font-weight: bold; background-color: #f0f0f0; }
    //                 .difference-row { font-weight: bold; background-color: ${difference >= 0 ? '#d4edda' : '#f8d7da'}; }
    //                 .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
    //                 .status-open { color: green; }
    //                 .positive { color: green; }
    //                 .negative { color: red; }
    //                 .summary-box { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border: 1px solid #ddd; }
    //                 .summary-box table { margin: 0; width: 100%; }
    //                 .signature-section {
    //                     margin-top: 40px;
    //                     display: flex;
    //                     justify-content: space-between;
    //                     padding: 0 20px;
    //                 }
    //                 .signature-box {
    //                     text-align: center;
    //                     width: 45%;
    //                 }
    //                 .signature-line {
    //                     border-top: 1px solid #333;
    //                     margin-top: 40px;
    //                     padding-top: 10px;
    //                 }
    //                 .signature-label {
    //                     font-weight: bold;
    //                     margin-bottom: 5px;
    //                 }
    //             </style>
    //         </head>
    //         <body>
    //             <div class="header">
    //                 <h1>Closing Cash Counter</h1>
    //                 <p><strong>User:</strong> ${selectedUser?.name || 'N/A'}</p>
    //                 <p><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
    //                 <p><strong>Status:</strong> <span class="status-open">🟢 Closing</span></p>
    //             </div>

    //             <div class="summary-box">
    //                 <h3>Summary</h3>
    //                 <table>
    //                     <tr>
    //                         <td><strong>Opening Time:</strong></td>
    //                         <td>${session ? new Date(session.openedAt).toLocaleString() : 'N/A'}</td>
    //                     </tr>
    //                     <tr>
    //                         <td><strong>Opening Cash:</strong></td>
    //                         <td class="text-right">Rs. ${formatCurrency(session?.openingBalance || 0)}</td>
    //                     </tr>
    //                     <tr>
    //                         <td><strong>Total Sales:</strong></td>
    //                         <td class="text-right">Rs. ${formatCurrency(session?.totalSales || 0)}</td>
    //                     </tr>
    //                     <tr>
    //                         <td><strong>Total Returns:</strong></td>
    //                         <td class="text-right">Rs. ${formatCurrency(session?.totalReturns || 0)}</td>
    //                     </tr>
    //                     <tr>
    //                         <td><strong>Total Payments:</strong></td>
    //                         <td class="text-right">Rs. ${formatCurrency(session?.totalPayments || 0)}</td>
    //                     </tr>
    //                     <tr>
    //                         <td><strong>Total Receipts:</strong></td>
    //                         <td class="text-right">Rs. ${formatCurrency(session?.totalReceipts || 0)}</td>
    //                     </tr>
    //                     <tr>
    //                         <td><strong>Expected Total:</strong></td>
    //                         <td class="text-right">Rs. ${formatCurrency(expectedTotal)}</td>
    //                     </tr>
    //                 </table>
    //             </div>

    //             <h3>Closing Denomination Details</h3>
    //             <table>
    //                 <thead>
    //                     <tr>
    //                         <th>Denomination</th>
    //                         <th class="text-right">Quantity</th>
    //                         <th class="text-right">Amount</th>
    //                     </tr>
    //                 </thead>
    //                 <tbody>
    //                     ${Object.entries(closingDenominations)
    //             .filter(([_, value]) => value > 0)
    //             .map(([denom, value]) => `
    //                             <tr>
    //                                 <td>Rs. ${denom}</td>
    //                                 <td class="text-right">${value}</td>
    //                                 <td class="text-right">Rs. ${formatCurrency(parseInt(denom) * parseInt(value))}</td>
    //                             </tr>
    //                         `).join('')}
    //                     <tr class="total-row">
    //                         <td colspan="2"><strong>Total Closing Cash</strong></td>
    //                         <td class="text-right"><strong>Rs. ${formatCurrency(closingTotal)}</strong></td>
    //                     </tr>
    //                     <tr class="difference-row">
    //                         <td colspan="2"><strong>Difference (Closing - Expected)</strong></td>
    //                         <td class="text-right">
    //                             <strong class="${difference >= 0 ? 'positive' : 'negative'}">
    //                                 Rs. ${formatCurrency(difference)}
    //                             </strong>
    //                         </td>
    //                     </tr>
    //                 </tbody>
    //             </table>

    //             ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}

    //             <div class="signature-section">
    //                 <div class="signature-box">
    //                     <div class="signature-label">Prepared By</div>
    //                     <div class="signature-line">${loggedInUserName}</div>
    //                     <div style="font-size: 12px; color: #666; margin-top: 5px;">(Signature & Date)</div>
    //                 </div>
    //                 <div class="signature-box">
    //                     <div class="signature-label">Approved By</div>
    //                     <div class="signature-line">_________________</div>
    //                     <div style="font-size: 12px; color: #666; margin-top: 5px;">(Signature & Date)</div>
    //                 </div>
    //             </div>
    //         </body>
    //         </html>
    //     `;

    //     // Open print window
    //     const printWindow = window.open('', '_blank', 'width=800,height=600');
    //     if (!printWindow) {
    //         alert('Please allow pop-ups for this site to print reports.');
    //         return;
    //     }

    //     printWindow.document.write(printContent);
    //     printWindow.document.close();
    //     printWindow.focus();

    //     // Wait for content to load then print
    //     setTimeout(() => {
    //         printWindow.print();
    //         printWindow.close();
    //     }, 500);
    // };

    // Print Opening Report
    const printOpeningReport = () => {
        const total = calculateTotal(denominations);
        const selectedUser = users.find(u => u.id === selectedUserId);

        // Get logged-in user from localStorage (where token is stored)
        // The token contains the user info in the claims
        let loggedInUserName = 'System User';
        try {
            const token = localStorage.getItem('token');
            if (token) {
                // Decode the JWT token to get user info
                const payload = JSON.parse(atob(token.split('.')[1]));
                loggedInUserName = payload.name || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 'System User';
            }
        } catch (e) {
            console.error('Error parsing token:', e);
        }

        // Create print content
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Opening Cash Report</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 10px; 
                        font-size: 11px;
                        line-height: 1.3;
                    }
                    .header { text-align: center; margin-bottom: 10px; }
                    .header h1 { margin: 0; color: #333; font-size: 16px; }
                    .header p { margin: 2px 0; color: #666; font-size: 11px; }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 8px 0; 
                        font-size: 10px;
                    }
                    th, td { 
                        border: 1px solid #ddd; 
                        padding: 4px 6px; 
                        text-align: left; 
                    }
                    th { 
                        background-color: #f5f5f5; 
                        font-weight: bold;
                        font-size: 10px;
                    }
                    .text-right { text-align: right; }
                    .total-row { font-weight: bold; background-color: #f0f0f0; }
                    .footer { margin-top: 10px; text-align: center; color: #666; font-size: 9px; }
                    .status-open { color: green; }
                    .signature-section {
                        margin-top: 15px;
                        display: flex;
                        justify-content: space-between;
                        padding: 0 10px;
                    }
                    .signature-box {
                        text-align: center;
                        width: 45%;
                    }
                    .signature-line {
                        border-top: 1px solid #333;
                        margin-top: 20px;
                        padding-top: 5px;
                        font-size: 10px;
                    }
                    .signature-label {
                        font-weight: bold;
                        margin-bottom: 3px;
                        font-size: 10px;
                    }
                    .signature-sub {
                        font-size: 8px;
                        color: #666;
                        margin-top: 3px;
                    }
                    @media print {
                        body { padding: 8px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Opening Cash Counter</h1>
                    <p><strong>User:</strong> ${selectedUser?.name || 'N/A'}</p>
                    <p><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Status:</strong> <span class="status-open">🟢 Open</span></p>
                </div>

                <h3 style="font-size: 11px; margin: 8px 0 4px 0;">Denomination Details</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Denomination</th>
                            <th class="text-right">Qty</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(denominations)
                .filter(([_, value]) => value > 0)
                .map(([denom, value]) => `
                                <tr>
                                    <td>Rs. ${denom}</td>
                                    <td class="text-right">${value}</td>
                                    <td class="text-right">Rs. ${formatCurrency(parseInt(denom) * parseInt(value))}</td>
                                </tr>
                            `).join('')}
                        <tr class="total-row">
                            <td colspan="2"><strong>Total</strong></td>
                            <td class="text-right"><strong>Rs. ${formatCurrency(total)}</strong></td>
                        </tr>
                    </tbody>
                </table>

                ${notes ? `<p style="font-size: 10px; margin: 4px 0;"><strong>Notes:</strong> ${notes}</p>` : ''}

                <div class="signature-section">
                    <div class="signature-box">
                        <div class="signature-label">Prepared By</div>
                        <div class="signature-line">${loggedInUserName}</div>
                        <div class="signature-sub">(Signature & Date)</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-label">Approved By</div>
                        <div class="signature-line">_________________</div>
                        <div class="signature-sub">(Signature & Date)</div>
                    </div>
                </div>

                <div class="footer">
                    Printed on ${new Date().toLocaleString()}
                </div>
            </body>
            </html>
        `;

        // Open print window
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            alert('Please allow pop-ups for this site to print reports.');
            return;
        }

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();

        // Wait for content to load then print
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    // Print Closing Report
    const printClosingReport = () => {
        const closingTotal = calculateTotal(closingDenominations);
        const expectedTotal = session ? calculateSessionTotal(session) : 0;
        const difference = closingTotal - expectedTotal;
        const selectedUser = users.find(u => u.id === selectedUserId);

        // Get logged-in user from localStorage (where token is stored)
        let loggedInUserName = 'System User';
        try {
            const token = localStorage.getItem('token');
            if (token) {
                // Decode the JWT token to get user info
                const payload = JSON.parse(atob(token.split('.')[1]));
                loggedInUserName = payload.name || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 'System User';
            }
        } catch (e) {
            console.error('Error parsing token:', e);
        }

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Closing Cash Counter Report</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 10px; 
                        font-size: 10px;
                        line-height: 1.3;
                    }
                    .header { text-align: center; margin-bottom: 8px; }
                    .header h1 { margin: 0; color: #333; font-size: 15px; }
                    .header p { margin: 2px 0; color: #666; font-size: 10px; }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 6px 0; 
                        font-size: 9px;
                    }
                    th, td { 
                        border: 1px solid #ddd; 
                        padding: 3px 5px; 
                        text-align: left; 
                    }
                    th { 
                        background-color: #f5f5f5; 
                        font-weight: bold;
                        font-size: 9px;
                    }
                    .text-right { text-align: right; }
                    .total-row { font-weight: bold; background-color: #f0f0f0; }
                    .difference-row { 
                        font-weight: bold; 
                        background-color: ${difference >= 0 ? '#d4edda' : '#f8d7da'}; 
                    }
                    .footer { margin-top: 8px; text-align: center; color: #666; font-size: 8px; }
                    .status-open { color: green; }
                    .positive { color: green; }
                    .negative { color: red; }
                    .summary-box { 
                        margin: 6px 0; 
                        padding: 8px; 
                        background-color: #f9f9f9; 
                        border: 1px solid #ddd;
                    }
                    .summary-box table { 
                        margin: 0; 
                        width: 100%; 
                        font-size: 9px;
                    }
                    .summary-box table td {
                        border: none;
                        padding: 2px 4px;
                    }
                    .signature-section {
                        margin-top: 12px;
                        display: flex;
                        justify-content: space-between;
                        padding: 0 10px;
                    }
                    .signature-box {
                        text-align: center;
                        width: 45%;
                    }
                    .signature-line {
                        border-top: 1px solid #333;
                        margin-top: 15px;
                        padding-top: 4px;
                        font-size: 9px;
                    }
                    .signature-label {
                        font-weight: bold;
                        margin-bottom: 2px;
                        font-size: 9px;
                    }
                    .signature-sub {
                        font-size: 7px;
                        color: #666;
                        margin-top: 2px;
                    }
                    h3 { 
                        font-size: 10px; 
                        margin: 6px 0 3px 0; 
                    }
                    @media print {
                        body { padding: 6px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Closing Cash Counter</h1>
                    <p><strong>User:</strong> ${selectedUser?.name || 'N/A'}</p>
                    <p><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Status:</strong> <span class="status-open">🟢 Closing</span></p>
                </div>

                <div class="summary-box">
                    <h3 style="font-size: 10px; margin-bottom: 4px;">Summary</h3>
                    <table>
                        <tr>
                            <td><strong>Opening Time:</strong></td>
                            <td class="text-right">${session ? new Date(session.openedAt).toLocaleString() : 'N/A'}</td>
                        </tr>
                        <tr>
                            <td><strong>Opening Cash:</strong></td>
                            <td class="text-right">Rs. ${formatCurrency(session?.openingBalance || 0)}</td>
                        </tr>
                        <tr>
                            <td><strong>Total Sales:</strong></td>
                            <td class="text-right">Rs. ${formatCurrency(session?.totalSales || 0)}</td>
                        </tr>
                        <tr>
                            <td><strong>Total Returns:</strong></td>
                            <td class="text-right">Rs. ${formatCurrency(session?.totalReturns || 0)}</td>
                        </tr>
                        <tr>
                            <td><strong>Total Payments:</strong></td>
                            <td class="text-right">Rs. ${formatCurrency(session?.totalPayments || 0)}</td>
                        </tr>
                        <tr>
                            <td><strong>Total Receipts:</strong></td>
                            <td class="text-right">Rs. ${formatCurrency(session?.totalReceipts || 0)}</td>
                        </tr>
                        <tr>
                            <td><strong>Expected Total:</strong></td>
                            <td class="text-right">Rs. ${formatCurrency(expectedTotal)}</td>
                        </tr>
                    </table>
                </div>

                <h3>Closing Denomination Details</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Denomination</th>
                            <th class="text-right">Qty</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(closingDenominations)
                .filter(([_, value]) => value > 0)
                .map(([denom, value]) => `
                                <tr>
                                    <td>Rs. ${denom}</td>
                                    <td class="text-right">${value}</td>
                                    <td class="text-right">Rs. ${formatCurrency(parseInt(denom) * parseInt(value))}</td>
                                </tr>
                            `).join('')}
                        <tr class="total-row">
                            <td colspan="2"><strong>Total Closing Cash</strong></td>
                            <td class="text-right"><strong>Rs. ${formatCurrency(closingTotal)}</strong></td>
                        </tr>
                        <tr class="difference-row">
                            <td colspan="2"><strong>Difference (Closing - Expected)</strong></td>
                            <td class="text-right">
                                <strong class="${difference >= 0 ? 'positive' : 'negative'}">
                                    Rs. ${formatCurrency(difference)}
                                </strong>
                            </td>
                        </tr>
                    </tbody>
                </table>

                ${notes ? `<p style="font-size: 9px; margin: 4px 0;"><strong>Notes:</strong> ${notes}</p>` : ''}

                <div class="signature-section">
                    <div class="signature-box">
                        <div class="signature-label">Prepared By</div>
                        <div class="signature-line">${loggedInUserName}</div>
                        <div class="signature-sub">(Signature & Date)</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-label">Approved By</div>
                        <div class="signature-line">_________________</div>
                        <div class="signature-sub">(Signature & Date)</div>
                    </div>
                </div>

                <div class="footer">
                    Printed on ${new Date().toLocaleString()}
                </div>
            </body>
            </html>
        `;

        // Open print window
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            alert('Please allow pop-ups for this site to print reports.');
            return;
        }

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();

        // Wait for content to load then print
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };


    const handleOpenCounter = async () => {
        if (!selectedUserId) {
            alert('Please select a user first');
            return;
        }

        const total = calculateTotal(denominations);
        if (total === 0) {
            alert('Please enter at least one denomination');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/api/retailer/cash-counter/open-with-denominations', {
                userId: selectedUserId,
                openingBalance: total,
                denominations,
                notes
            });
            if (response.data.success) {
                setSession(response.data.data);
                setIsOpen(true);
                alert('Counter opened successfully!');
                fetchUserSummary();
                // Print report after opening with delay
                setTimeout(printOpeningReport, 1000);
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to open counter');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseCounter = async () => {
        if (!session) return;
        const total = calculateTotal(closingDenominations);
        if (total === 0) {
            alert('Please enter closing denominations');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/api/retailer/cash-counter/close-with-denominations', {
                sessionId: session.id,
                closingBalance: total,
                closingDenominations,
                notes
            });
            if (response.data.success) {
                // Print report before clearing data with delay
                setTimeout(printClosingReport, 500);

                setIsOpen(false);
                setSession(null);
                setDenominations({ 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 });
                setClosingDenominations({ 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 });
                alert('Counter closed successfully!');
                fetchUserSummary();
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to close counter');
        } finally {
            setLoading(false);
        }
    };

    const denominationLabels = {
        2000: 'Rs. 2000',
        1000: 'Rs. 1000',
        500: 'Rs. 500',
        200: 'Rs. 200',
        100: 'Rs. 100',
        50: 'Rs. 50',
        20: 'Rs. 20',
        10: 'Rs. 10',
        5: 'Rs. 5',
        2: 'Rs. 2',
        1: 'Rs. 1'
    };

    // Calculate session total for a single session (opening + sales + receipts - returns - payments)
    const calculateSessionTotal = (sess) => {
        return (sess.openingBalance || 0) +
            (sess.totalSales || 0) +
            (sess.totalReceipts || 0) -
            (sess.totalReturns || 0) -
            (sess.totalPayments || 0);
    };

    // Calculate closing total from denominations
    const closingTotal = calculateTotal(closingDenominations);

    // Calculate the expected total (opening + sales + receipts - returns - payments)
    const expectedTotal = session ? calculateSessionTotal(session) : 0;

    // Calculate difference between closing total and expected total
    const difference = closingTotal - expectedTotal;

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-primary text-white">
                    <h2 className="card-title mb-0">
                        <i className="bi bi-cash-stack me-2"></i>
                        Cash Counter Management
                    </h2>
                </div>

                <div className="card-body p-2 p-md-3">
                    <div className="row g-2 mb-3 align-items-end">
                        <div className="col-12 col-md-6 col-lg-4">
                            <div className="position-relative">
                                <select
                                    className="form-select form-select-sm"
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    style={{ height: '38px', fontSize: '0.875rem', paddingTop: '0.5rem' }}
                                >
                                    <option value="">Select User</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} ({user.email}) {user.isOwner ? '👑' : ''}
                                        </option>
                                    ))}
                                </select>
                                <label className="position-absolute" style={{
                                    top: '-0.5rem',
                                    left: '0.75rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'white',
                                    padding: '0 0.25rem',
                                    color: '#6c757d',
                                    fontWeight: '500'
                                }}>
                                    Select User
                                </label>
                            </div>
                        </div>
                        <div className="col-12 col-md-6 col-lg-8">
                            <div className={`alert ${isOpen ? 'alert-success' : 'alert-secondary'} mb-0 d-flex align-items-center`}
                                style={{
                                    height: '38px',
                                    paddingTop: '0.5rem',
                                    paddingBottom: '0.5rem',
                                    fontSize: '0.875rem'
                                }}>
                                <div className="d-flex flex-wrap justify-content-between align-items-center w-100">
                                    <span>
                                        <strong>Status:</strong> {isOpen ? '🟢 Open' : '🔴 Closed'}
                                        {isOpen && session && (
                                            <span className="ms-3">
                                                <strong>Opened:</strong> {new Date(session.openedAt).toLocaleString()}
                                            </span>
                                        )}
                                    </span>
                                    {isOpen && (
                                        <span>
                                            <strong>Opening Balance:</strong> Rs. {formatCurrency(session?.openingBalance || 0)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Denomination Input - Opening */}
                    {!isOpen ? (
                        <div className="card mb-3">
                            <div className="card-header bg-light">
                                <h6 className="mb-0">Opening Cash - Denomination Details</h6>
                            </div>
                            <div className="card-body py-2">
                                <div className="row g-2">
                                    {Object.entries(denominations).map(([denom, value]) => (
                                        <div className="col-3 col-md-2" key={denom}>
                                            <div className="form-group">
                                                <label className="form-label small mb-0" style={{ fontSize: '0.65rem', fontWeight: '500' }}>
                                                    {denominationLabels[denom]}
                                                </label>
                                                <input
                                                    ref={el => inputRefs.current[`opening-${denom}`] = el}
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={value}
                                                    onChange={(e) => handleDenominationChange(denom, e.target.value, 'opening')}
                                                    onKeyDown={(e) => handleKeyDown(e, denom, 'opening')}
                                                    style={{ height: '28px', fontSize: '0.75rem' }}
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 d-flex justify-content-between align-items-center">
                                    <strong>Total: Rs. {formatCurrency(calculateTotal(denominations))}</strong>
                                    <button
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={printOpeningReport}
                                        disabled={calculateTotal(denominations) === 0}
                                        style={{ height: '32px' }}
                                    >
                                        <i className="bi bi-printer me-1"></i> Print Report
                                    </button>
                                </div>
                                <div className="row g-1 mt-2">
                                    <div className="col-12 col-md-6">
                                        <input
                                            ref={el => inputRefs.current['opening-notes'] = el}
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Opening Notes"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            onKeyDown={(e) => handleNotesKeyDown(e, 'opening')}
                                            style={{ height: '32px' }}
                                        />
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <button
                                            id="openButton"
                                            className="btn btn-success btn-sm w-100"
                                            onClick={handleOpenCounter}
                                            disabled={loading || !selectedUserId}
                                            style={{ height: '32px' }}
                                        >
                                            {loading ? 'Opening...' : <><i className="bi bi-plus-circle me-1"></i> Open Counter</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="card mb-3">
                            <div className="card-header bg-light">
                                <h6 className="mb-0">Closing Cash - Denomination Details</h6>
                            </div>
                            <div className="card-body py-2">
                                <div className="row g-2">
                                    {Object.entries(closingDenominations).map(([denom, value]) => (
                                        <div className="col-3 col-md-2" key={denom}>
                                            <div className="form-group">
                                                <label className="form-label small mb-0" style={{ fontSize: '0.65rem', fontWeight: '500' }}>
                                                    {denominationLabels[denom]}
                                                </label>
                                                <input
                                                    ref={el => inputRefs.current[`closing-${denom}`] = el}
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={value}
                                                    onChange={(e) => handleDenominationChange(denom, e.target.value, 'closing')}
                                                    onKeyDown={(e) => handleKeyDown(e, denom, 'closing')}
                                                    style={{ height: '28px', fontSize: '0.75rem' }}
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2">
                                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                                        <div>
                                            <strong>Closing Total: </strong>
                                            <span className="text-primary">Rs. {formatCurrency(closingTotal)}</span>
                                        </div>
                                        <div>
                                            <strong>Expected Total: </strong>
                                            <span className="text-info">Rs. {formatCurrency(expectedTotal)}</span>
                                        </div>
                                        <div>
                                            <strong>Difference: </strong>
                                            <span className={difference >= 0 ? 'text-success' : 'text-danger'}>
                                                Rs. {formatCurrency(difference)}
                                            </span>
                                        </div>
                                        <div>
                                            <button
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={printClosingReport}
                                                disabled={calculateTotal(closingDenominations) === 0}
                                                style={{ height: '32px' }}
                                            >
                                                <i className="bi bi-printer me-1"></i> Print Report
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="row g-1 mt-2">
                                    <div className="col-12 col-md-6">
                                        <input
                                            ref={el => inputRefs.current['closing-notes'] = el}
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Closing Notes"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            onKeyDown={(e) => handleNotesKeyDown(e, 'closing')}
                                            style={{ height: '32px' }}
                                        />
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <button
                                            id="closeButton"
                                            className="btn btn-danger btn-sm w-100"
                                            onClick={handleCloseCounter}
                                            disabled={loading}
                                            style={{ height: '32px' }}
                                        >
                                            {loading ? 'Closing...' : <><i className="bi bi-x-circle me-1"></i> Close Counter</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Session History */}
                    <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        <table className="table table-sm table-hover table-bordered">
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th style={{ fontSize: '0.75rem' }}>Date</th>
                                    <th style={{ fontSize: '0.75rem' }} className="text-end">Opening</th>
                                    <th style={{ fontSize: '0.75rem' }} className="text-end">Sales</th>
                                    <th style={{ fontSize: '0.75rem' }} className="text-end">Returns</th>
                                    <th style={{ fontSize: '0.75rem' }} className="text-end">Payments</th>
                                    <th style={{ fontSize: '0.75rem' }} className="text-end">Receipts</th>
                                    <th style={{ fontSize: '0.75rem' }} className="text-end">Total</th>
                                    <th style={{ fontSize: '0.75rem' }} className="text-end">Closing</th>
                                    <th style={{ fontSize: '0.75rem' }} className="text-end">Diff</th>
                                    <th style={{ fontSize: '0.75rem' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userSessions.length > 0 ? (
                                    <>
                                        {[...userSessions]
                                            .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt))
                                            .slice(0, 3)
                                            .map((sess) => {
                                                const total = calculateSessionTotal(sess);
                                                return (
                                                    <tr key={sess.id}>
                                                        <td style={{ fontSize: '0.75rem' }}>
                                                            {new Date(sess.openedAt).toLocaleDateString()}
                                                        </td>
                                                        <td style={{ fontSize: '0.75rem' }} className="text-end">Rs. {formatCurrency(sess.openingBalance)}</td>
                                                        <td style={{ fontSize: '0.75rem' }} className="text-end">Rs. {formatCurrency(sess.totalSales)}</td>
                                                        <td style={{ fontSize: '0.75rem' }} className="text-end">Rs. {formatCurrency(sess.totalReturns)}</td>
                                                        <td style={{ fontSize: '0.75rem' }} className="text-end">Rs. {formatCurrency(sess.totalPayments)}</td>
                                                        <td style={{ fontSize: '0.75rem' }} className="text-end">Rs. {formatCurrency(sess.totalReceipts)}</td>
                                                        <td style={{ fontSize: '0.75rem' }} className="text-end fw-bold text-primary">
                                                            Rs. {formatCurrency(total)}
                                                        </td>
                                                        <td style={{ fontSize: '0.75rem' }} className="text-end">Rs. {formatCurrency(sess.closingBalance)}</td>
                                                        <td style={{ fontSize: '0.75rem' }} className="text-end">
                                                            <span className={sess.cashDifference >= 0 ? 'text-success' : 'text-danger'}>
                                                                Rs. {formatCurrency(sess.cashDifference)}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: '0.75rem' }}>
                                                            <span className={`badge ${sess.status === 'Open' ? 'bg-success' : 'bg-secondary'}`}>
                                                                {sess.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </>
                                ) : (
                                    <tr>
                                        <td colSpan="10" className="text-center text-muted py-3">
                                            <i className="bi bi-inbox me-1"></i>
                                            No sessions found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OpenCashCounterPage;