// import React, { useEffect, useState, useRef } from "react";
// import "../stylesheet/NetworkStatus.css";

// export default function NetworkStatus({
//   pingUrl = "/api/ping",
//   pingInterval = 10000,
// }) {
//   const [navigatorOnline, setNavigatorOnline] = useState(navigator.onLine);
//   const [serverReachable, setServerReachable] = useState(true);
//   const [status, setStatus] = useState("online"); // "online" | "offline" | "poor" | "degraded"
//   const [latency, setLatency] = useState(0);
//   const [showStatus, setShowStatus] = useState(false); // New state to control visibility
//   const backoffRef = useRef({ attempts: 0, timeoutId: null });
//   const mounted = useRef(true);

//   const POOR_THRESHOLD = 1000; // ms (set threshold for "poor network")
//   const DEGRADED_THRESHOLD = 2000; // ms (set threshold for "degraded network")

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
//       setShowStatus(true); // Show status when offline
//     };

//     window.addEventListener("online", onOnline);
//     window.addEventListener("offline", onOffline);

//     // initial ping
//     immediatePing();
//     const intervalId = setInterval(immediatePing, pingInterval);

//     return () => {
//       mounted.current = false;
//       window.removeEventListener("online", onOnline);
//       window.removeEventListener("offline", onOffline);
//       clearInterval(intervalId);
//       if (backoffRef.current.timeoutId) clearTimeout(backoffRef.current.timeoutId);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   async function pingServer() {
//     const controller = new AbortController();
//     const timer = setTimeout(() => controller.abort(), 5000);
//     const start = performance.now();

//     try {
//       const res = await fetch(pingUrl, {
//         method: "GET",
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
//         const latency = end - start;
//         return { ok: true, latency };
//       }
//       return { ok: false };
//     } catch (err) {
//       clearTimeout(timer);
//       return { ok: false };
//     }
//   }

//   function immediatePing() {
//     if (!navigator.onLine) {
//       setServerReachable(false);
//       setStatus("offline");
//       setShowStatus(true); // Show status when offline
//       return;
//     }

//     pingServer().then((result) => {
//       if (!mounted.current) return;

//       if (result.ok) {
//         backoffRef.current.attempts = 0;
//         setServerReachable(true);
//         setLatency(result.latency);

//         if (result.latency > DEGRADED_THRESHOLD) {
//           setStatus("degraded");
//           setShowStatus(true); // Show status when degraded
//         } else if (result.latency > POOR_THRESHOLD) {
//           setStatus("poor");
//           setShowStatus(true); // Show status when poor
//         } else {
//           setStatus("online");
//           // Hide status after a brief delay when returning to online
//           setTimeout(() => {
//             if (mounted.current) {
//               setShowStatus(false);
//             }
//           }, 2000); // Show "online" status for 2 seconds before hiding
//         }
//       } else {
//         backoffRef.current.attempts += 1;
//         const attempts = backoffRef.current.attempts;
//         setServerReachable(false);
//         setStatus("degraded");
//         setShowStatus(true); // Show status when server unreachable

//         const delay = Math.min(30000, 1000 * 2 ** Math.min(6, attempts));
//         if (backoffRef.current.timeoutId) clearTimeout(backoffRef.current.timeoutId);
//         backoffRef.current.timeoutId = setTimeout(() => {
//           if (!mounted.current) return;
//           immediatePing();
//         }, delay);
//       }
//     });
//   }

//   // Color & label based on status
//   const statusConfig = {
//     online: {
//       label: "Online",
//       color: "#10B981",
//     },
//     poor: {
//       label: "Poor Connection",
//       color: "#F59E0B",
//     },
//     degraded: {
//       label: "Unstable",
//       color: "#F59E0B",
//     },
//     offline: {
//       label: "Offline",
//       color: "#EF4444",
//     },
//   };

//   const cfg = statusConfig[status];

//   // Don't render anything if status is online and we're not showing the status
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
//         className="d-flex align-items-center shadow-sm p-2 rounded-pill"
//         style={{
//           background: '#FFFFFF',
//           minWidth: 140,
//           border: `1px solid ${cfg.color}30`,
//         }}
//       >
//         <span
//           className="me-2 rounded-circle status-dot"
//           style={{
//             width: 10,
//             height: 10,
//             display: "inline-block",
//             background: cfg.color,
//             boxShadow: `0 0 0 ${status === 'online' ? 4 : 0}px ${cfg.color}20`,
//             animation: status !== 'online' ? 'pulse 2s infinite' : 'none'
//           }}
//         />
//         <small className="m-0 fw-medium" style={{ fontSize: 13, color: "#374151" }}>
//           {cfg.label}
//         </small>
//       </div>
//     </div>
//   );
// }

//------------------------------------------------------------------------------end

// NetworkStatus.js
import React, { useEffect, useState, useRef } from "react";
import "../stylesheet/NetworkStatus.css";

export default function NetworkStatus({
  pingUrl = "/api/health/ping",
}) {
  const [navigatorOnline, setNavigatorOnline] = useState(navigator.onLine);
  const [serverReachable, setServerReachable] = useState(true);
  const [status, setStatus] = useState("online"); // "online" | "offline" | "poor" | "degraded"
  const [latency, setLatency] = useState(0);
  const [showStatus, setShowStatus] = useState(false);
  const [lastPingTime, setLastPingTime] = useState(null); // Track server time
  const backoffRef = useRef({ attempts: 0, timeoutId: null });
  const mounted = useRef(true);

  const POOR_THRESHOLD = 1000; // ms
  const DEGRADED_THRESHOLD = 2000; // ms

  useEffect(() => {
    mounted.current = true;

    const onOnline = () => {
      setNavigatorOnline(true);
      immediatePing();
    };

    const onOffline = () => {
      setNavigatorOnline(false);
      setServerReachable(false);
      setStatus("offline");
      setShowStatus(true);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // initial ping
    immediatePing();
    // const intervalId = setInterval(immediatePing, pingInterval);

    return () => {
      mounted.current = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      // clearInterval(intervalId);
      if (backoffRef.current.timeoutId) clearTimeout(backoffRef.current.timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pingServer() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const start = performance.now();

    try {
      const res = await fetch(pingUrl, {
        method: "GET",
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

        // Extract server time from response (matches ASP.NET response format)
        const serverTime = data.time;

        return {
          ok: true,
          latency,
          serverTime,
          serverOk: data.ok // This will be true from your backend
        };
      }
      return { ok: false };
    } catch (err) {
      clearTimeout(timer);
      return { ok: false };
    }
  }

  function immediatePing() {
    if (!navigator.onLine) {
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
          setStatus("degraded");
          setShowStatus(true);
        } else if (result.latency > POOR_THRESHOLD) {
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
        setServerReachable(false);
        setStatus("degraded");
        setShowStatus(true);

        const delay = Math.min(30000, 1000 * 2 ** Math.min(6, attempts));
        if (backoffRef.current.timeoutId) clearTimeout(backoffRef.current.timeoutId);
        backoffRef.current.timeoutId = setTimeout(() => {
          if (!mounted.current) return;
          immediatePing();
        }, delay);
      }
    });
  }

  // Calculate time difference between client and server (optional feature)
  const getTimeDifference = () => {
    if (lastPingTime) {
      const clientTime = Date.now();
      const diff = Math.abs(clientTime - lastPingTime);
      return diff > 1000 ? Math.round(diff / 1000) + 's' : diff + 'ms';
    }
    return null;
  };

  const statusConfig = {
    online: {
      label: "Online",
      color: "#10B981",
    },
    poor: {
      label: "Poor Connection",
      color: "#F59E0B",
    },
    degraded: {
      label: "Unstable",
      color: "#F59E0B",
    },
    offline: {
      label: "Offline",
      color: "#EF4444",
    },
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
        </div>

        {/* Optional: Show time sync info when online */}
        {status === 'online' && lastPingTime && (
          <small
            className="mt-1"
            style={{ fontSize: 10, color: '#9CA3AF' }}
          >
            Server time: {new Date(lastPingTime).toLocaleTimeString()}
          </small>
        )}
      </div>
    </div>
  );
}