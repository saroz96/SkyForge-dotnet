
// import React from 'react';
// import { useNavigate } from 'react-router-dom';

// const QuickActions = ({ onPosSaleClick }) => {
//   const navigate = useNavigate();

//   const handleActionClick = (path) => {
//     navigate(path);
//   };

//   const actions = [
//     { 
//       label: "Cash Counter", 
//       action: "/retailer/user-cash-counter", 
//       icon: "bi-cash-stack",
//       color: "#059669",
//       bgColor: "#ecfdf5"
//     },
//     { 
//       label: "Create Party", 
//       action: "/retailer/accounts", 
//       icon: "bi-people",
//       color: "#2563eb",
//       bgColor: "#eff6ff"
//     },
//     { 
//       label: "Create Items", 
//       action: "/retailer/items", 
//       icon: "bi-box-seam",
//       color: "#d97706",
//       bgColor: "#fffbeb"
//     },
//     { 
//       label: "Purchase", 
//       action: "/retailer/purchase", 
//       icon: "bi-cart-plus",
//       color: "#7c3aed",
//       bgColor: "#f5f3ff"
//     },
//     { 
//       label: "Cash Sales", 
//       action: "/retailer/cash-sales", 
//       icon: "bi-cash-coin",
//       color: "#0891b2",
//       bgColor: "#ecfeff"
//     },
//     { 
//       label: "Cash Sales Open", 
//       action: "/retailer/cash-sales/open", 
//       icon: "bi-cash",
//       color: "#0d9488",
//       bgColor: "#f0fdfa"
//     },
//     { 
//       label: "Credit Sales", 
//       action: "/retailer/credit-sales", 
//       icon: "bi-credit-card",
//       color: "#4f46e5",
//       bgColor: "#eef2ff"
//     },
//     { 
//       label: "Credit Sales Open", 
//       action: "/retailer/credit-sales/open", 
//       icon: "bi-credit-card-2-front",
//       color: "#6d28d9",
//       bgColor: "#f5f3ff"
//     },
//     { 
//       label: "Payment", 
//       action: "/retailer/payments", 
//       icon: "bi-arrow-up-circle",
//       color: "#dc2626",
//       bgColor: "#fef2f2"
//     },
//     { 
//       label: "Receipt", 
//       action: "/retailer/receipts", 
//       icon: "bi-arrow-down-circle",
//       color: "#059669",
//       bgColor: "#ecfdf5"
//     }
//   ];

//   // Professional styles
//   const styles = {
//     container: {
//       backgroundColor: '#ffffff',
//       borderRadius: '12px',
//       boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
//       border: '1px solid #e8ecf1',
//       height: '100%',
//     },
//     header: {
//       padding: '16px 20px',
//       borderBottom: '1px solid #e8ecf1',
//     },
//     title: {
//       fontSize: '16px',
//       fontWeight: '600',
//       color: '#1a202c',
//       margin: 0,
//     },
//     body: {
//       padding: '16px',
//     },
//     grid: {
//       display: 'grid',
//       gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
//       gap: '12px',
//     },
//     button: {
//       display: 'flex',
//       flexDirection: 'column',
//       alignItems: 'center',
//       justifyContent: 'center',
//       width: '100%',
//       padding: '12px 8px',
//       border: '1px solid #e8ecf1',
//       borderRadius: '10px',
//       backgroundColor: '#ffffff',
//       cursor: 'pointer',
//       transition: 'all 0.2s ease',
//       boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
//       minHeight: '80px',
//     },
//     buttonHover: {
//       transform: 'translateY(-2px)',
//       boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
//       borderColor: '#2563eb',
//     },
//     iconWrapper: {
//       width: '40px',
//       height: '40px',
//       borderRadius: '10px',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: '6px',
//       transition: 'all 0.2s ease',
//     },
//     icon: {
//       fontSize: '18px',
//     },
//     label: {
//       fontSize: '11px',
//       fontWeight: '500',
//       color: '#4a5568',
//       textAlign: 'center',
//       lineHeight: '1.2',
//     },
//     '@media (max-width: 768px)': {
//       grid: {
//         gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
//         gap: '8px',
//       },
//       button: {
//         padding: '10px 6px',
//         minHeight: '70px',
//       },
//       iconWrapper: {
//         width: '34px',
//         height: '34px',
//       },
//       icon: {
//         fontSize: '16px',
//       },
//       label: {
//         fontSize: '10px',
//       },
//     },
//     '@media (max-width: 576px)': {
//       grid: {
//         gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
//         gap: '6px',
//       },
//       button: {
//         padding: '8px 4px',
//         minHeight: '60px',
//         borderRadius: '8px',
//       },
//       iconWrapper: {
//         width: '30px',
//         height: '30px',
//       },
//       icon: {
//         fontSize: '14px',
//       },
//       label: {
//         fontSize: '9px',
//       },
//     },
//   };

//   return (
//     <div style={styles.container}>
//       <div style={styles.header}>
//         <h6 style={styles.title}>
//           <i className="bi bi-grid-3x3-gap-fill me-2" style={{ color: '#2563eb' }}></i>
//           Quick Actions
//         </h6>
//       </div>
//       <div style={styles.body}>
//         <div style={styles.grid}>
//           {actions.map((btn, index) => (
//             <button
//               key={index}
//               style={styles.button}
//               onClick={btn.action === "pos" ? onPosSaleClick : () => handleActionClick(btn.action)}
//               title={btn.label}
//               onMouseEnter={(e) => {
//                 Object.assign(e.currentTarget.style, styles.buttonHover);
//               }}
//               onMouseLeave={(e) => {
//                 e.currentTarget.style.transform = 'translateY(0)';
//                 e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
//                 e.currentTarget.style.borderColor = '#e8ecf1';
//               }}
//             >
//               <div 
//                 style={{
//                   ...styles.iconWrapper,
//                   backgroundColor: btn.bgColor,
//                 }}
//               >
//                 <i className={`bi ${btn.icon}`} style={{ ...styles.icon, color: btn.color }}></i>
//               </div>
//               <span style={styles.label}>{btn.label}</span>
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default QuickActions;

//-----------------------------------------------------------------end1

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './QuickActions.css';

const QuickActions = ({ onPosSaleClick }) => {
  const navigate = useNavigate();

  const handleActionClick = (path) => {
    navigate(path);
  };

  const actions = [
    { 
      label: "Cash Counter", 
      action: "/retailer/user-cash-counter", 
      icon: "bi-cash-stack",
      color: "#059669",
      bgClass: "qa-icon--cash"
    },
    { 
      label: "Create Party", 
      action: "/retailer/accounts", 
      icon: "bi-people",
      color: "#2563eb",
      bgClass: "qa-icon--party"
    },
    { 
      label: "Create Items", 
      action: "/retailer/items", 
      icon: "bi-box-seam",
      color: "#d97706",
      bgClass: "qa-icon--items"
    },
    { 
      label: "Purchase", 
      action: "/retailer/purchase", 
      icon: "bi-cart-plus",
      color: "#7c3aed",
      bgClass: "qa-icon--purchase"
    },
    { 
      label: "Sales", 
      action: "/retailer/sales", 
      icon: "bi-cash-coin",
      color: "#0891b2",
      bgClass: "qa-icon--cash-sales"
    },
    { 
      label: "Sales Open", 
      action: "/retailer/sales-open", 
      icon: "bi-cash",
      color: "#0d9488",
      bgClass: "qa-icon--cash-open"
    },
    { 
      label: "Payment", 
      action: "/retailer/payments", 
      icon: "bi-arrow-up-circle",
      color: "#dc2626",
      bgClass: "qa-icon--payment"
    },
    { 
      label: "Receipt", 
      action: "/retailer/receipts", 
      icon: "bi-arrow-down-circle",
      color: "#059669",
      bgClass: "qa-icon--receipt"
    }
  ];

  return (
    <div className="qa-container">
      <div className="qa-header">
        <div className="qa-header-left">
          <div className="qa-header-icon">
            <i className="bi bi-grid-3x3-gap-fill"></i>
          </div>
          <div>
            <h6 className="qa-title">Quick Actions</h6>
            <small className="qa-subtitle">Frequently used operations</small>
          </div>
        </div>
      </div>
      <div className="qa-body">
        <div className="qa-grid">
          {actions.map((btn, index) => (
            <button
              key={index}
              className="qa-btn"
              onClick={btn.action === "pos" ? onPosSaleClick : () => handleActionClick(btn.action)}
              title={btn.label}
            >
              <div className={`qa-icon-wrapper ${btn.bgClass}`}>
                <i className={`bi ${btn.icon}`}></i>
              </div>
              <span className="qa-btn-label">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;