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
//       color: "#4CAF50",
//       bgColor: "#E8F5E9"
//     },
//     { 
//       label: "Create Party", 
//       action: "/retailer/accounts", 
//       icon: "bi-people",
//       color: "#2196F3",
//       bgColor: "#E3F2FD"
//     },
//     { 
//       label: "Create Items", 
//       action: "/retailer/items", 
//       icon: "bi-box-seam",
//       color: "#FF9800",
//       bgColor: "#FFF3E0"
//     },
//     { 
//       label: "Purchase", 
//       action: "/retailer/purchase", 
//       icon: "bi-cart-plus",
//       color: "#9C27B0",
//       bgColor: "#F3E5F5"
//     },
//     { 
//       label: "Cash Sales", 
//       action: "/retailer/cash-sales", 
//       icon: "bi-cash-coin",
//       color: "#00BCD4",
//       bgColor: "#E0F7FA"
//     },
//     { 
//       label: "Cash Sales Open", 
//       action: "/retailer/cash-sales/open", 
//       icon: "bi-cash",
//       color: "#009688",
//       bgColor: "#E0F2F1"
//     },
//     { 
//       label: "Credit Sales", 
//       action: "/retailer/credit-sales", 
//       icon: "bi-credit-card",
//       color: "#3F51B5",
//       bgColor: "#E8EAF6"
//     },
//     { 
//       label: "Credit Sales Open", 
//       action: "/retailer/credit-sales/open", 
//       icon: "bi-credit-card-2-front",
//       color: "#673AB7",
//       bgColor: "#EDE7F6"
//     },
//     { 
//       label: "Payment", 
//       action: "/retailer/payments", 
//       icon: "bi-arrow-up-circle",
//       color: "#F44336",
//       bgColor: "#FFEBEE"
//     },
//     { 
//       label: "Receipt", 
//       action: "/retailer/receipts", 
//       icon: "bi-arrow-down-circle",
//       color: "#4CAF50",
//       bgColor: "#E8F5E9"
//     }
//   ];

//   return (
//     <div className="col-12 mb-0">
//       <div className="card border-0 shadow-sm" style={{ backgroundColor: '#f8f9fa' }}>
//         <div className="card-header border-0 bg-transparent py-2 px-3">
//           <h6 className="card-title mb-0" style={{ 
//             fontSize: '0.85rem', 
//             fontWeight: '600',
//             color: '#f9fafb'
//           }}>
//             <i className="bi bi-grid-3x3-gap-fill me-2" style={{ color: '#f7f8fb' }}></i>
//             Quick Actions
//           </h6>
//         </div>
//         <div className="card-body pt-0 pb-2 px-2">
//           <div className="d-flex flex-wrap justify-content-start gap-2">
//             {actions.map((btn, index) => (
//               <button
//                 key={index}
//                 className="action-btn-karobar"
//                 onClick={btn.action === "pos" ? onPosSaleClick : () => handleActionClick(btn.action)}
//                 title={btn.label}
//                 style={{
//                   display: 'flex',
//                   flexDirection: 'column',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   width: '72px',
//                   height: '72px',
//                   border: 'none',
//                   borderRadius: '12px',
//                   backgroundColor: '#ffffff',
//                   color: btn.color,
//                   cursor: 'pointer',
//                   transition: 'all 0.2s ease',
//                   boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
//                   padding: '4px',
//                   position: 'relative'
//                 }}
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.transform = 'translateY(-3px)';
//                   e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.transform = 'translateY(0)';
//                   e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
//                 }}
//               >
//                 <div 
//                   className="icon-wrapper"
//                   style={{
//                     width: '36px',
//                     height: '36px',
//                     borderRadius: '10px',
//                     backgroundColor: btn.bgColor,
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     marginBottom: '4px',
//                     transition: 'all 0.2s ease'
//                   }}
//                 >
//                   <i className={`bi ${btn.icon}`} style={{ fontSize: '1.1rem', color: btn.color }}></i>
//                 </div>
//                 <span className="small fw-medium text-center" style={{ 
//                   fontSize: '0.55rem', 
//                   lineHeight: '1.1',
//                   color: '#495057',
//                   maxWidth: '64px',
//                   overflow: 'hidden',
//                   textOverflow: 'ellipsis',
//                   whiteSpace: 'nowrap'
//                 }}>
//                   {btn.label}
//                 </span>
//               </button>
//             ))}
//           </div>
//         </div>
//       </div>

//       <style>{`
//         .action-btn-karobar {
//           transition: all 0.2s ease-in-out !important;
//           position: relative;
//         }
        
//         .action-btn-karobar:hover .icon-wrapper {
//           transform: scale(1.05);
//         }
        
//         .action-btn-karobar::after {
//           content: '';
//           position: absolute;
//           bottom: 0;
//           left: 50%;
//           transform: translateX(-50%);
//           width: 0;
//           height: 2px;
//           background: #0d6efd;
//           transition: width 0.3s ease;
//           border-radius: 2px;
//         }
        
//         .action-btn-karobar:hover::after {
//           width: 40%;
//         }
        
//         @media (max-width: 768px) {
//           .action-btn-karobar {
//             width: 62px !important;
//             height: 62px !important;
//           }
//           .action-btn-karobar .icon-wrapper {
//             width: 30px !important;
//             height: 30px !important;
//           }
//           .action-btn-karobar .icon-wrapper i {
//             font-size: 0.9rem !important;
//           }
//           .action-btn-karobar span {
//             font-size: 0.5rem !important;
//           }
//         }
        
//         @media (max-width: 576px) {
//           .action-btn-karobar {
//             width: 54px !important;
//             height: 54px !important;
//             border-radius: 10px !important;
//           }
//           .action-btn-karobar .icon-wrapper {
//             width: 26px !important;
//             height: 26px !important;
//             border-radius: 8px !important;
//           }
//           .action-btn-karobar .icon-wrapper i {
//             font-size: 0.75rem !important;
//           }
//           .action-btn-karobar span {
//             font-size: 0.45rem !important;
//           }
//           .gap-2 {
//             gap: 0.5rem !important;
//           }
//         }
//       `}</style>
//     </div>
//   );
// };

// export default QuickActions;

//-----------------------------------------------------------end

import React from 'react';
import { useNavigate } from 'react-router-dom';

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
      bgColor: "#ecfdf5"
    },
    { 
      label: "Create Party", 
      action: "/retailer/accounts", 
      icon: "bi-people",
      color: "#2563eb",
      bgColor: "#eff6ff"
    },
    { 
      label: "Create Items", 
      action: "/retailer/items", 
      icon: "bi-box-seam",
      color: "#d97706",
      bgColor: "#fffbeb"
    },
    { 
      label: "Purchase", 
      action: "/retailer/purchase", 
      icon: "bi-cart-plus",
      color: "#7c3aed",
      bgColor: "#f5f3ff"
    },
    { 
      label: "Cash Sales", 
      action: "/retailer/cash-sales", 
      icon: "bi-cash-coin",
      color: "#0891b2",
      bgColor: "#ecfeff"
    },
    { 
      label: "Cash Sales Open", 
      action: "/retailer/cash-sales/open", 
      icon: "bi-cash",
      color: "#0d9488",
      bgColor: "#f0fdfa"
    },
    { 
      label: "Credit Sales", 
      action: "/retailer/credit-sales", 
      icon: "bi-credit-card",
      color: "#4f46e5",
      bgColor: "#eef2ff"
    },
    { 
      label: "Credit Sales Open", 
      action: "/retailer/credit-sales/open", 
      icon: "bi-credit-card-2-front",
      color: "#6d28d9",
      bgColor: "#f5f3ff"
    },
    { 
      label: "Payment", 
      action: "/retailer/payments", 
      icon: "bi-arrow-up-circle",
      color: "#dc2626",
      bgColor: "#fef2f2"
    },
    { 
      label: "Receipt", 
      action: "/retailer/receipts", 
      icon: "bi-arrow-down-circle",
      color: "#059669",
      bgColor: "#ecfdf5"
    }
  ];

  // Professional styles
  const styles = {
    container: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #e8ecf1',
      height: '100%',
    },
    header: {
      padding: '16px 20px',
      borderBottom: '1px solid #e8ecf1',
    },
    title: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1a202c',
      margin: 0,
    },
    body: {
      padding: '16px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
      gap: '12px',
    },
    button: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      padding: '12px 8px',
      border: '1px solid #e8ecf1',
      borderRadius: '10px',
      backgroundColor: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      minHeight: '80px',
    },
    buttonHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      borderColor: '#2563eb',
    },
    iconWrapper: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '6px',
      transition: 'all 0.2s ease',
    },
    icon: {
      fontSize: '18px',
    },
    label: {
      fontSize: '11px',
      fontWeight: '500',
      color: '#4a5568',
      textAlign: 'center',
      lineHeight: '1.2',
    },
    '@media (max-width: 768px)': {
      grid: {
        gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
        gap: '8px',
      },
      button: {
        padding: '10px 6px',
        minHeight: '70px',
      },
      iconWrapper: {
        width: '34px',
        height: '34px',
      },
      icon: {
        fontSize: '16px',
      },
      label: {
        fontSize: '10px',
      },
    },
    '@media (max-width: 576px)': {
      grid: {
        gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
        gap: '6px',
      },
      button: {
        padding: '8px 4px',
        minHeight: '60px',
        borderRadius: '8px',
      },
      iconWrapper: {
        width: '30px',
        height: '30px',
      },
      icon: {
        fontSize: '14px',
      },
      label: {
        fontSize: '9px',
      },
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h6 style={styles.title}>
          <i className="bi bi-grid-3x3-gap-fill me-2" style={{ color: '#2563eb' }}></i>
          Quick Actions
        </h6>
      </div>
      <div style={styles.body}>
        <div style={styles.grid}>
          {actions.map((btn, index) => (
            <button
              key={index}
              style={styles.button}
              onClick={btn.action === "pos" ? onPosSaleClick : () => handleActionClick(btn.action)}
              title={btn.label}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, styles.buttonHover);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = '#e8ecf1';
              }}
            >
              <div 
                style={{
                  ...styles.iconWrapper,
                  backgroundColor: btn.bgColor,
                }}
              >
                <i className={`bi ${btn.icon}`} style={{ ...styles.icon, color: btn.color }}></i>
              </div>
              <span style={styles.label}>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;