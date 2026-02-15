// // components/RoleRedirect.js
// import React, { useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';

// const RoleRedirect = () => {
//     const { currentUser } = useAuth();
//     const navigate = useNavigate();

//     useEffect(() => {
//         if (currentUser) {
//             // Define role-based dashboard paths (same as backend)
//             const roleDashboards = {
//                 'ADMINISTRATOR': '/admin-dashboard',
//             };

//             // Redirect based on role
//             const dashboardPath = roleDashboards[currentUser.role] || '/dashboard';
//             navigate(dashboardPath);
//         }
//     }, [currentUser, navigate]);

//     return (
//         <div className="flex items-center justify-center min-h-screen">
//             <div className="text-center">
//                 <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
//                 <p className="mt-4 text-gray-600">Redirecting to your dashboard...</p>
//             </div>
//         </div>
//     );
// };

// export default RoleRedirect;

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
            if (currentUser.role === 'ADMINISTRATOR') {
                navigate('/admin-dashboard');
            } else {
                navigate('/user-dashboard');
            }
        }
    }, [currentUser, navigate]);
};

export default RoleRedirect;