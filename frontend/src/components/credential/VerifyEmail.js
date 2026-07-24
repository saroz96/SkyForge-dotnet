// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import { Container, Alert, Spinner, Button } from 'react-bootstrap';

// const VerifyEmail = () => {
//   const { token } = useParams();
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState('');
//   const [error, setError] = useState('');
//   const [isVerified, setIsVerified] = useState(false);

//   useEffect(() => {
//     const verifyEmail = async () => {
//       try {
//         const response = await axios.get(`/api/auth/verify-email/${token}`);
        
//         if (response.data.success) {
//           setMessage('Email successfully verified! You can now log in.');
//           setIsVerified(true);
//         } else {
//           setError(response.data.message || 'Email verification failed');
//         }
//       } catch (err) {
//         setError(err.response?.data?.message || 
//                 err.message || 
//                 'Error verifying email. Please try again.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     verifyEmail();
//   }, [token]);

//   const handleLoginRedirect = () => {
//     navigate('/auth/login'); // Make sure this matches your login route
//   };

//   return (
//     <Container className="mt-5">
//       <div className="text-center">
//         <h2>Email Verification</h2>
        
//         {loading && (
//           <div className="my-4">
//             <Spinner animation="border" role="status" />
//             <p className="mt-2">Verifying your email...</p>
//           </div>
//         )}

//         {message && (
//           <div className="mt-4">
//             <Alert variant="success">
//               {message}
//             </Alert>
//             {isVerified && (
//               <Button 
//                 variant="primary" 
//                 onClick={handleLoginRedirect}
//                 className="mt-3"
//               >
//                 Go to Login
//               </Button>
//             )}
//           </div>
//         )}

//         {error && (
//           <Alert variant="danger" className="mt-4">
//             {error}
//           </Alert>
//         )}
//       </div>
//     </Container>
//   );
// };

// export default VerifyEmail;

//--------------------------------------------------------end

// import React, { useState, useEffect } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom'; // Change this
// import axios from 'axios';
// import { Container, Alert, Spinner, Button } from 'react-bootstrap';
// import NotificationToast from '../NotificationToast'; // Add if you want notifications

// const VerifyEmail = () => {
//   const [searchParams] = useSearchParams(); // Use useSearchParams instead of useParams
//   const token = searchParams.get('token'); // Get token from query string
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState('');
//   const [error, setError] = useState('');
//   const [isVerified, setIsVerified] = useState(false);

//   // Create axios instance with base URL
//   const api = axios.create({
//     baseURL: process.env.REACT_APP_API_BASE_URL,
//     withCredentials: true,
//   });

//   useEffect(() => {
//     const verifyEmail = async () => {
//       // Check if token exists
//       if (!token) {
//         setError('Verification token is missing. Please check your email link.');
//         setLoading(false);
//         return;
//       }

//       try {
//         // Use the correct endpoint with query parameter
//         const response = await api.get(`/api/user/verify-email?token=${encodeURIComponent(token)}`);
        
//         // The backend returns HTML content, not JSON
//         // We need to check if the response contains success indicators
//         if (response.data && typeof response.data === 'string') {
//           // Check if the HTML contains success message
//           if (response.data.includes('Email Verified Successfully')) {
//             setMessage('Email successfully verified! You can now log in.');
//             setIsVerified(true);
//           } else if (response.data.includes('Verification Failed')) {
//             setError('The verification link is invalid or has expired. Please request a new one.');
//           } else {
//             setError('Email verification failed. Please try again.');
//           }
//         } else if (response.data && response.data.success) {
//           // If backend returns JSON (if you change it)
//           setMessage('Email successfully verified! You can now log in.');
//           setIsVerified(true);
//         } else {
//           setError('Email verification failed. Please try again.');
//         }
//       } catch (err) {
//         console.error('Verification error:', err);
        
//         // Check if the error response is HTML
//         if (err.response?.data && typeof err.response.data === 'string') {
//           if (err.response.data.includes('Verification Failed')) {
//             setError('The verification link is invalid or has expired. Please request a new one.');
//           } else {
//             setError('Error verifying email. Please try again.');
//           }
//         } else {
//           setError(err.response?.data?.message || 
//                   err.message || 
//                   'Error verifying email. Please try again.');
//         }
//       } finally {
//         setLoading(false);
//       }
//     };

//     verifyEmail();
//   }, [token, api]);

//   const handleLoginRedirect = () => {
//     navigate('/auth/login');
//   };

//   const handleResendVerification = () => {
//     // Navigate to resend verification page
//     navigate('/auth/resend-verification');
//   };

//   return (
//     <Container className="mt-5">
//       <div className="text-center">
//         <h2>Email Verification</h2>
        
//         {loading && (
//           <div className="my-4">
//             <Spinner animation="border" role="status" />
//             <p className="mt-2">Verifying your email...</p>
//           </div>
//         )}

//         {message && (
//           <div className="mt-4">
//             <Alert variant="success">
//               <h4 className="alert-heading">Success!</h4>
//               <p>{message}</p>
//             </Alert>
//             {isVerified && (
//               <Button 
//                 variant="primary" 
//                 onClick={handleLoginRedirect}
//                 className="mt-3"
//               >
//                 Go to Login
//               </Button>
//             )}
//           </div>
//         )}

//         {error && (
//           <div className="mt-4">
//             <Alert variant="danger">
//               <h4 className="alert-heading">Verification Failed</h4>
//               <p>{error}</p>
//               <hr />
//               <p className="mb-0">
//                 The verification link may have expired or been used already.
//                 You can request a new verification email.
//               </p>
//             </Alert>
//             <Button 
//               variant="primary" 
//               onClick={handleResendVerification}
//               className="mt-3"
//             >
//               Resend Verification Email
//             </Button>
//             <Button 
//               variant="outline-secondary" 
//               onClick={handleLoginRedirect}
//               className="mt-3 ms-2"
//             >
//               Back to Login
//             </Button>
//           </div>
//         )}
//       </div>
//     </Container>
//   );
// };

// export default VerifyEmail;

//----------------------------------------------------------end

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Container, Alert, Spinner, Button } from 'react-bootstrap';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
  });

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Verification token is missing. Please check your email link.');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/api/user/verify-email?token=${encodeURIComponent(token)}`);
        
        // Now this returns JSON instead of HTML
        if (response.data.success) {
          setMessage(response.data.message || 'Email successfully verified! You can now log in.');
          setIsVerified(true);
        } else {
          setError(response.data.message || 'Email verification failed');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError(err.response?.data?.message || 'Error verifying email. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token]);

  const handleLoginRedirect = () => {
    navigate('/auth/login');
  };

  const handleResendVerification = () => {
    navigate('/auth/resend-verification');
  };

  return (
    <Container className="mt-5">
      <div className="text-center">
        <h2>Email Verification</h2>
        
        {loading && (
          <div className="my-4">
            <Spinner animation="border" role="status" />
            <p className="mt-2">Verifying your email...</p>
          </div>
        )}

        {message && (
          <div className="mt-4">
            <Alert variant="success">
              <h4 className="alert-heading">Success!</h4>
              <p>{message}</p>
            </Alert>
            {isVerified && (
              <Button 
                variant="primary" 
                onClick={handleLoginRedirect}
                className="mt-3"
              >
                Go to Login
              </Button>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4">
            <Alert variant="danger">
              <h4 className="alert-heading">Verification Failed</h4>
              <p>{error}</p>
              <hr />
              <p className="mb-0">
                The verification link may have expired or been used already.
                You can request a new verification email.
              </p>
            </Alert>
            <Button 
              variant="primary" 
              onClick={handleResendVerification}
              className="mt-3"
            >
              Resend Verification Email
            </Button>
            <Button 
              variant="outline-secondary" 
              onClick={handleLoginRedirect}
              className="mt-3 ms-2"
            >
              Back to Login
            </Button>
          </div>
        )}
      </div>
    </Container>
  );
};

export default VerifyEmail;