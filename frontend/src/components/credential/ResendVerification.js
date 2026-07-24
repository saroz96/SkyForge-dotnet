// // components/credential/ResendVerification.js
// import React, { useState } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import { Form, Button, Alert, Container } from 'react-bootstrap';
// import axios from 'axios';

// const ResendVerification = () => {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const [email, setEmail] = useState(location.state?.email || '');
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState('');
//   const [error, setError] = useState('');

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');
//     setMessage('');

//     try {
//       const response = await axios.post('/api/public/resend-verification', { email });
//       if (response.data.success) {
//         setMessage('Verification email sent. Please check your inbox.');
//       } else {
//         setError(response.data.message || 'Failed to resend verification email');
//       }
//     } catch (err) {
//       setError(err.response?.data?.message ||
//         'Error resending verification email. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Container className="mt-5" style={{ maxWidth: '500px' }}>
//       <h2 className="text-center mb-4">Resend Verification Email</h2>

//       {message && <Alert variant="success">{message}</Alert>}
//       {error && <Alert variant="danger">{error}</Alert>}

//       <Form onSubmit={handleSubmit}>
//         <Form.Group className="mb-3">
//           <Form.Label>Email Address</Form.Label>
//           <Form.Control
//             type="email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             required
//             placeholder="Enter your email"
//           />
//         </Form.Group>

//         <div className="d-grid gap-2">
//           <Button
//             variant="primary"
//             type="submit"
//             disabled={loading}
//           >
//             {loading ? 'Sending...' : 'Resend Verification Email'}
//           </Button>
//         </div>
//       </Form>

//       <div className="text-center mt-3">
//         <Button
//           variant="link"
//           onClick={() => navigate('/auth/login')}
//         >
//           Back to Login
//         </Button>
//       </div>
//     </Container>
//   );
// };

// export default ResendVerification;

//---------------------------------------------------end

// components/credential/ResendVerification.js
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Form, Button, Alert, Container } from 'react-bootstrap';
import axios from 'axios';
import NotificationToast from '../NotificationToast'; // Add this

const ResendVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success',
    duration: 3000
  });

  // Create axios instance with base URL (same as ForgotPassword)
  const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
  });

  // Add authorization header if token exists (optional)
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Use the api instance with base URL
      const response = await api.post('/api/public/resend-verification', { email });
      
      if (response.data.success) {
        setMessage('Verification email sent. Please check your inbox.');
        setNotification({
          show: true,
          message: response.data.message || 'Verification email sent. Please check your inbox.',
          type: 'success',
          duration: 5000
        });
      } else {
        setError(response.data.message || 'Failed to resend verification email');
        setNotification({
          show: true,
          message: response.data.message || 'Failed to resend verification email',
          type: 'error',
          duration: 3000
        });
      }
    } catch (err) {
      console.error('Resend verification error:', err);
      
      let errorMessage = 'Error resending verification email. Please try again.';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
      setNotification({
        show: true,
        message: errorMessage,
        type: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-5" style={{ maxWidth: '500px' }}>
      <h2 className="text-center mb-4">Resend Verification Email</h2>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Email Address</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </Form.Group>

        <div className="d-grid gap-2">
          <Button
            variant="primary"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Resend Verification Email'}
          </Button>
        </div>
      </Form>

      <div className="text-center mt-3">
        <Button
          variant="link"
          onClick={() => navigate('/auth/login')}
        >
          Back to Login
        </Button>
      </div>

      <NotificationToast
        show={notification.show}
        message={notification.message}
        type={notification.type}
        duration={notification.duration}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </Container>
  );
};

export default ResendVerification;