// components/RoleRedirect.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleRedirect = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            // Redirect ADMINISTRATOR to admin-dashboard, all others to dashboard
            if (currentUser.role === 'Administrator') {
                navigate('/admin-dashboard');
            } else {
                navigate('/user-dashboard');
            }
        }
    }, [currentUser, navigate]);
};

export default RoleRedirect;