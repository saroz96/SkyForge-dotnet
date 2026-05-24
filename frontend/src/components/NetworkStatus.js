
// import React, { useEffect, useState, useRef } from "react";
// import "../stylesheet/NetworkStatus.css";

// export default function NetworkStatus({
//   pingUrl = "/api/health/ping",
//   apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5142"
// }) {
//   const [navigatorOnline, setNavigatorOnline] = useState(navigator.onLine);
//   const [serverReachable, setServerReachable] = useState(true);
//   const [status, setStatus] = useState("online");
//   const [latency, setLatency] = useState(0);
//   const [showStatus, setShowStatus] = useState(false);
//   const [lastPingTime, setLastPingTime] = useState(null);
//   const backoffRef = useRef({ attempts: 0, timeoutId: null });
//   const mounted = useRef(true);

//   const POOR_THRESHOLD = 1000;
//   const DEGRADED_THRESHOLD = 2000;

//   // Construct full URL for ping
//   const getFullPingUrl = () => {
//     // If pingUrl already starts with http, use it directly
//     if (pingUrl.startsWith('http')) {
//       return pingUrl;
//     }
//     // Otherwise, prepend API base URL
//     const baseUrl = apiBaseUrl.replace(/\/$/, ''); // Remove trailing slash
//     const pingPath = pingUrl.replace(/^\//, ''); // Remove leading slash
//     return `${baseUrl}/${pingPath}`;
//   };

//   useEffect(() => {
//     mounted.current = true;

//     const onOnline = () => {
//       setNavigatorOnline(true);
//       immediatePing();
//     };

//     const onOffline = () => {
//       setNavigatorOnline(false);
//       setServerReachable(false);
//       setStatus("offline");
//       setShowStatus(true);
//     };

//     window.addEventListener("online", onOnline);
//     window.addEventListener("offline", onOffline);

//     // Initial ping
//     immediatePing();
    
//     // Ping every 30 seconds instead of continuous backoff
//     const intervalId = setInterval(() => {
//       if (navigator.onLine) {
//         immediatePing();
//       }
//     }, 30000);

//     return () => {
//       mounted.current = false;
//       window.removeEventListener("online", onOnline);
//       window.removeEventListener("offline", onOffline);
//       clearInterval(intervalId);
//       if (backoffRef.current.timeoutId) clearTimeout(backoffRef.current.timeoutId);
//     };
//   }, []);

//   async function pingServer() {
//     const controller = new AbortController();
//     const timer = setTimeout(() => controller.abort(), 5000);
//     const start = performance.now();
//     const fullUrl = getFullPingUrl();

//     try {
//       console.log('Pinging server at:', fullUrl); // Debug log
      
//       const res = await fetch(fullUrl, {
//         method: "GET",
//         mode: "cors", // Explicitly set CORS mode
//         cache: "no-cache",
//         signal: controller.signal,
//         headers: {
//           'Cache-Control': 'no-cache, no-store, must-revalidate',
//           'Pragma': 'no-cache',
//           'Expires': '0'
//         }
//       });
//       const end = performance.now();
//       clearTimeout(timer);

//       if (res.ok) {
//         const data = await res.json();
//         const latency = end - start;
//         const serverTime = data.time;

//         return {
//           ok: true,
//           latency,
//           serverTime,
//           serverOk: data.ok
//         };
//       }
//       return { ok: false };
//     } catch (err) {
//       console.error('Ping failed:', err.message);
//       clearTimeout(timer);
//       return { ok: false };
//     }
//   }

//   function immediatePing() {
//     if (!navigator.onLine) {
//       setServerReachable(false);
//       setStatus("offline");
//       setShowStatus(true);
//       return;
//     }

//     pingServer().then((result) => {
//       if (!mounted.current) return;

//       if (result.ok) {
//         backoffRef.current.attempts = 0;
//         setServerReachable(true);
//         setLatency(result.latency);
//         setLastPingTime(result.serverTime);

//         if (result.latency > DEGRADED_THRESHOLD) {
//           setStatus("degraded");
//           setShowStatus(true);
//         } else if (result.latency > POOR_THRESHOLD) {
//           setStatus("poor");
//           setShowStatus(true);
//         } else {
//           setStatus("online");
//           setTimeout(() => {
//             if (mounted.current) {
//               setShowStatus(false);
//             }
//           }, 2000);
//         }
//       } else {
//         backoffRef.current.attempts += 1;
//         const attempts = backoffRef.current.attempts;
//         setServerReachable(false);
//         setStatus("degraded");
//         setShowStatus(true);

//         const delay = Math.min(30000, 1000 * 2 ** Math.min(6, attempts));
//         if (backoffRef.current.timeoutId) clearTimeout(backoffRef.current.timeoutId);
//         backoffRef.current.timeoutId = setTimeout(() => {
//           if (!mounted.current) return;
//           immediatePing();
//         }, delay);
//       }
//     });
//   }

//   const statusConfig = {
//     online: { label: "Online", color: "#10B981" },
//     poor: { label: "Poor Connection", color: "#F59E0B" },
//     degraded: { label: "Unstable", color: "#F59E0B" },
//     offline: { label: "Offline", color: "#EF4444" },
//   };

//   const cfg = statusConfig[status];

//   if (!showStatus) {
//     return null;
//   }

//   return (
//     <div
//       className="position-fixed network-status-pill"
//       style={{
//         left: 16,
//         bottom: 16,
//         zIndex: 1050,
//         transition: 'opacity 0.3s ease-in-out'
//       }}
//     >
//       <div
//         className="d-flex flex-column shadow-sm rounded-3 p-2"
//         style={{
//           background: '#FFFFFF',
//           minWidth: 160,
//           border: `1px solid ${cfg.color}30`,
//         }}
//       >
//         <div className="d-flex align-items-center">
//           <span
//             className="me-2 rounded-circle status-dot"
//             style={{
//               width: 10,
//               height: 10,
//               display: "inline-block",
//               background: cfg.color,
//               boxShadow: `0 0 0 ${status === 'online' ? 4 : 0}px ${cfg.color}20`,
//               animation: status !== 'online' ? 'pulse 2s infinite' : 'none'
//             }}
//           />
//           <small className="m-0 fw-medium" style={{ fontSize: 13, color: "#374151" }}>
//             {cfg.label}
//           </small>
//           {status !== 'offline' && (
//             <small className="ms-2" style={{ fontSize: 10, color: "#9CA3AF" }}>
//               {Math.round(latency)}ms
//             </small>
//           )}
//         </div>

//         {status === 'online' && lastPingTime && (
//           <small className="mt-1" style={{ fontSize: 10, color: '#9CA3AF' }}>
//             Server: {new Date(lastPingTime).toLocaleTimeString()}
//           </small>
//         )}
//       </div>
//     </div>
//   );
// }

//-------------------------------------------------end

import React, { useEffect, useState, useRef } from "react";
import "../stylesheet/NetworkStatus.css";

export default function NetworkStatus({
  pingUrl = "/api/health/ping",
  apiBaseUrl
}) {
  const [navigatorOnline, setNavigatorOnline] = useState(navigator.onLine);
  const [serverReachable, setServerReachable] = useState(true);
  const [status, setStatus] = useState("online");
  const [latency, setLatency] = useState(0);
  const [showStatus, setShowStatus] = useState(false);
  const [lastPingTime, setLastPingTime] = useState(null);
  const backoffRef = useRef({ attempts: 0, timeoutId: null });
  const mounted = useRef(true);

  const POOR_THRESHOLD = 1000;
  const DEGRADED_THRESHOLD = 2000;

  // Get the actual API base URL with proper fallbacks
  const getActualApiBaseUrl = () => {
    // If apiBaseUrl is provided as prop, use it
    if (apiBaseUrl) {
      console.log('NetworkStatus - Using apiBaseUrl from prop:', apiBaseUrl);
      return apiBaseUrl;
    }
    
    // Otherwise, try environment variable
    if (process.env.REACT_APP_API_BASE_URL) {
      console.log('NetworkStatus - Using REACT_APP_API_BASE_URL from env:', process.env.REACT_APP_API_BASE_URL);
      return process.env.REACT_APP_API_BASE_URL;
    }
    
    // Fallback based on environment
    if (process.env.NODE_ENV === 'production') {
      console.log('NetworkStatus - Using production fallback: https://api.amsacc.com');
      return 'https://api.amsacc.com';
    }
    
    console.log('NetworkStatus - Using development fallback: http://localhost:5142');
    return 'http://localhost:5142';
  };

  // Construct full URL for ping
  const getFullPingUrl = () => {
    const baseUrl = getActualApiBaseUrl();
    
    // Validate baseUrl
    if (!baseUrl) {
      console.error('NetworkStatus - API Base URL is not defined');
      return null;
    }
    
    // Validate pingUrl
    if (!pingUrl) {
      console.error('NetworkStatus - Ping URL is not defined');
      return null;
    }
    
    // If pingUrl already starts with http, use it directly
    if (pingUrl.startsWith('http')) {
      console.log('NetworkStatus - Using absolute ping URL:', pingUrl);
      return pingUrl;
    }
    
    // Otherwise, prepend API base URL
    const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    const cleanPingPath = pingUrl.replace(/^\//, ''); // Remove leading slash
    const fullUrl = `${cleanBaseUrl}/${cleanPingPath}`;
    
    console.log('NetworkStatus - Constructed ping URL:', fullUrl);
    return fullUrl;
  };

  useEffect(() => {
    mounted.current = true;

    const onOnline = () => {
      console.log('NetworkStatus - Browser came online');
      setNavigatorOnline(true);
      immediatePing();
    };

    const onOffline = () => {
      console.log('NetworkStatus - Browser went offline');
      setNavigatorOnline(false);
      setServerReachable(false);
      setStatus("offline");
      setShowStatus(true);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Initial ping
    immediatePing();
    
    // Ping every 30 seconds
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        immediatePing();
      }
    }, 30000);

    return () => {
      mounted.current = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(intervalId);
      if (backoffRef.current.timeoutId) clearTimeout(backoffRef.current.timeoutId);
    };
  }, []);

  async function pingServer() {
    const fullUrl = getFullPingUrl();
    
    // Check if URL is valid before attempting to ping
    if (!fullUrl) {
      console.error('NetworkStatus - Cannot ping: Invalid URL');
      return { ok: false, error: 'Invalid URL' };
    }
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const start = performance.now();

    try {
      console.log('NetworkStatus - Pinging server at:', fullUrl);
      
      const res = await fetch(fullUrl, {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const end = performance.now();
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const latency = end - start;
        const serverTime = data.time;

        console.log('NetworkStatus - Ping successful! Latency:', Math.round(latency), 'ms');
        
        return {
          ok: true,
          latency,
          serverTime,
          serverOk: data.ok
        };
      }
      
      console.warn('NetworkStatus - Ping responded with non-OK status:', res.status);
      return { ok: false };
    } catch (err) {
      console.error('NetworkStatus - Ping failed:', err.message);
      clearTimeout(timer);
      return { ok: false };
    }
  }

  function immediatePing() {
    if (!navigator.onLine) {
      console.log('NetworkStatus - Skipping ping: Browser is offline');
      setServerReachable(false);
      setStatus("offline");
      setShowStatus(true);
      return;
    }

    pingServer().then((result) => {
      if (!mounted.current) return;

      if (result.ok) {
        backoffRef.current.attempts = 0;
        setServerReachable(true);
        setLatency(result.latency);
        setLastPingTime(result.serverTime);

        if (result.latency > DEGRADED_THRESHOLD) {
          console.log('NetworkStatus - Connection degraded:', result.latency, 'ms');
          setStatus("degraded");
          setShowStatus(true);
        } else if (result.latency > POOR_THRESHOLD) {
          console.log('NetworkStatus - Poor connection:', result.latency, 'ms');
          setStatus("poor");
          setShowStatus(true);
        } else {
          setStatus("online");
          // Hide status after a brief delay when returning to online
          setTimeout(() => {
            if (mounted.current) {
              setShowStatus(false);
            }
          }, 2000);
        }
      } else {
        backoffRef.current.attempts += 1;
        const attempts = backoffRef.current.attempts;
        console.log('NetworkStatus - Ping failed, attempt:', attempts);
        setServerReachable(false);
        setStatus("degraded");
        setShowStatus(true);

        const delay = Math.min(30000, 1000 * 2 ** Math.min(6, attempts));
        console.log('NetworkStatus - Retrying in', delay, 'ms');
        if (backoffRef.current.timeoutId) clearTimeout(backoffRef.current.timeoutId);
        backoffRef.current.timeoutId = setTimeout(() => {
          if (!mounted.current) return;
          immediatePing();
        }, delay);
      }
    });
  }

  const statusConfig = {
    online: { label: "Online", color: "#10B981" },
    poor: { label: "Poor Connection", color: "#F59E0B" },
    degraded: { label: "Unstable", color: "#F59E0B" },
    offline: { label: "Offline", color: "#EF4444" },
  };

  const cfg = statusConfig[status];

  if (!showStatus) {
    return null;
  }

  return (
    <div
      className="position-fixed network-status-pill"
      style={{
        left: 16,
        bottom: 16,
        zIndex: 1050,
        transition: 'opacity 0.3s ease-in-out'
      }}
    >
      <div
        className="d-flex flex-column shadow-sm rounded-3 p-2"
        style={{
          background: '#FFFFFF',
          minWidth: 160,
          border: `1px solid ${cfg.color}30`,
        }}
      >
        <div className="d-flex align-items-center">
          <span
            className="me-2 rounded-circle status-dot"
            style={{
              width: 10,
              height: 10,
              display: "inline-block",
              background: cfg.color,
              boxShadow: `0 0 0 ${status === 'online' ? 4 : 0}px ${cfg.color}20`,
              animation: status !== 'online' ? 'pulse 2s infinite' : 'none'
            }}
          />
          <small className="m-0 fw-medium" style={{ fontSize: 13, color: "#374151" }}>
            {cfg.label}
          </small>
          {status !== 'offline' && (
            <small className="ms-2" style={{ fontSize: 10, color: "#9CA3AF" }}>
              {Math.round(latency)}ms
            </small>
          )}
        </div>

        {status === 'online' && lastPingTime && (
          <small className="mt-1" style={{ fontSize: 10, color: '#9CA3AF' }}>
            Server: {new Date(lastPingTime).toLocaleTimeString()}
          </small>
        )}
      </div>
    </div>
  );
}