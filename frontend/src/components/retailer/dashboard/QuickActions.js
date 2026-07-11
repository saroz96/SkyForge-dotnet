
// import React from 'react';
// import { useNavigate } from 'react-router-dom';

// const QuickActions = ({ onPosSaleClick }) => {
//   const navigate = useNavigate();

//   const handleActionClick = (path) => {
//     navigate(path);
//   };

//   const getButtonColor = (label) => {
//     const colorMap = {
//       'POS Sale': 'warning',
//       'Create Party': 'outline-light',
//       'Create Items': 'outline-light',
//       'Purchase': 'outline-light',
//       'Cash Sales': 'outline-light',
//       'Cash Sales Open': 'outline-light',
//       'Credit Sales': 'outline-light',
//       'Credit Sales Open': 'outline-light',
//       'Payment': 'outline-light',
//       'Receipt': 'outline-light'
//     };
//     return colorMap[label] || 'outline-light';
//   };

//   const getIconStyle = (label) => {
//     const iconMap = {
//       'POS Sale': 'bi-terminal-fill',
//       'Create Party': 'bi-people-fill',
//       'Create Items': 'bi-box-seam-fill',
//       'Purchase': 'bi-cart-plus-fill',
//       'Cash Sales': 'bi-cash-coin',
//       'Cash Sales Open': 'bi-cash-stack',
//       'Credit Sales': 'bi-credit-card',
//       'Credit Sales Open': 'bi-credit-card-2-front',
//       'Payment': 'bi-arrow-up-circle',
//       'Receipt': 'bi-arrow-down-circle'
//     };
//     return iconMap[label] || 'bi-grid-3x3-gap-fill';
//   };

//   const actions = [
//     { label: "POS Sale", action: "pos" },
//     { label: "Create Party", action: "/retailer/accounts" },
//     { label: "Create Items", action: "/retailer/items" },
//     { label: "Purchase", action: "/retailer/purchase" },
//     { label: "Cash Sales", action: "/retailer/cash-sales" },
//     { label: "Cash Sales Open", action: "/retailer/cash-sales/open" },
//     { label: "Credit Sales", action: "/retailer/credit-sales" },
//     { label: "Credit Sales Open", action: "/retailer/credit-sales/open" },
//     { label: "Payment", action: "/retailer/payments" },
//     { label: "Receipt", action: "/retailer/receipts" }
//   ];

//   return (
//     <div className="col-12 mb-3">
//       <div className="card bg-primary bg-gradient border-0 shadow-sm">
//         <div className="card-header bg-transparent border-0 py-1">
//           <h6 className="card-title text-white mb-0">
//             <i className="bi bi-lightning-charge-fill me-1"></i>
//             Quick Actions
//           </h6>
//         </div>
//         <div className="card-body pt-0 pb-2">
//           <div className="d-flex flex-wrap justify-content-center gap-2">
//             {actions.map((btn, index) => (
//               <button
//                 key={index}
//                 className={`btn btn-${getButtonColor(btn.label)} rounded-circle p-2 d-flex flex-column align-items-center justify-content-center shadow-sm action-btn`}
//                 onClick={btn.action === "pos" ? onPosSaleClick : () => handleActionClick(btn.action)}
//                 title={btn.label}
//                 style={{ width: '70px', height: '70px', transition: 'all 0.2s ease' }}
//               >
//                 <i className={`bi ${getIconStyle(btn.label)} fs-4 mb-1`}></i>
//                 <span className="small fw-semibold text-center px-1" style={{ fontSize: '0.65rem', lineHeight: '1.2' }}>
//                   {btn.label}
//                 </span>
//               </button>
//             ))}
//           </div>
//         </div>
//       </div>

//       <style>{`
//         .action-btn {
//           transition: all 0.2s ease-in-out !important;
//         }
//         .action-btn:hover {
//           transform: translateY(-2px) scale(1.02) !important;
//           box-shadow: 0 6px 12px rgba(0,0,0,0.15) !important;
//         }
//         .btn-outline-light {
//           background-color: rgba(255,255,255,0.9);
//           border: 1px solid rgba(255,255,255,0.3);
//           color: #4e73df;
//         }
//         .btn-outline-light:hover {
//           background-color: white;
//           color: #224abe;
//           border-color: white;
//         }
//         .btn-warning {
//           background: linear-gradient(135deg, #ffc107, #ff9f00);
//           border: none;
//           color: #212529;
//         }
//         @media (max-width: 768px) {
//           .action-btn {
//             width: 60px !important;
//             height: 60px !important;
//           }
//           .action-btn i {
//             font-size: 1.25rem !important;
//           }
//           .action-btn span {
//             font-size: 0.6rem !important;
//           }
//         }
//         @media (max-width: 576px) {
//           .gap-2 {
//             gap: 0.5rem !important;
//           }
//           .action-btn {
//             width: 55px !important;
//             height: 55px !important;
//           }
//           .action-btn i {
//             font-size: 1rem !important;
//           }
//           .action-btn span {
//             font-size: 0.55rem !important;
//           }
//         }
//       `}</style>
//     </div>
//   );
// };

// export default QuickActions;

//---------------------------------------------------end

import React from 'react';
import { useNavigate } from 'react-router-dom';

const QuickActions = ({ onPosSaleClick }) => {
  const navigate = useNavigate();

  const handleActionClick = (path) => {
    navigate(path);
  };

  const actions = [
    { 
      label: "POS Sale", 
      action: "pos", 
      icon: "bi-cash-stack",
      color: "#4CAF50",
      bgColor: "#E8F5E9"
    },
    { 
      label: "Create Party", 
      action: "/retailer/accounts", 
      icon: "bi-people",
      color: "#2196F3",
      bgColor: "#E3F2FD"
    },
    { 
      label: "Create Items", 
      action: "/retailer/items", 
      icon: "bi-box-seam",
      color: "#FF9800",
      bgColor: "#FFF3E0"
    },
    { 
      label: "Purchase", 
      action: "/retailer/purchase", 
      icon: "bi-cart-plus",
      color: "#9C27B0",
      bgColor: "#F3E5F5"
    },
    { 
      label: "Cash Sales", 
      action: "/retailer/cash-sales", 
      icon: "bi-cash-coin",
      color: "#00BCD4",
      bgColor: "#E0F7FA"
    },
    { 
      label: "Cash Sales Open", 
      action: "/retailer/cash-sales/open", 
      icon: "bi-cash",
      color: "#009688",
      bgColor: "#E0F2F1"
    },
    { 
      label: "Credit Sales", 
      action: "/retailer/credit-sales", 
      icon: "bi-credit-card",
      color: "#3F51B5",
      bgColor: "#E8EAF6"
    },
    { 
      label: "Credit Sales Open", 
      action: "/retailer/credit-sales/open", 
      icon: "bi-credit-card-2-front",
      color: "#673AB7",
      bgColor: "#EDE7F6"
    },
    { 
      label: "Payment", 
      action: "/retailer/payments", 
      icon: "bi-arrow-up-circle",
      color: "#F44336",
      bgColor: "#FFEBEE"
    },
    { 
      label: "Receipt", 
      action: "/retailer/receipts", 
      icon: "bi-arrow-down-circle",
      color: "#4CAF50",
      bgColor: "#E8F5E9"
    }
  ];

  return (
    <div className="col-12 mb-0">
      <div className="card border-0 shadow-sm" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="card-header border-0 bg-transparent py-2 px-3">
          <h6 className="card-title mb-0" style={{ 
            fontSize: '0.85rem', 
            fontWeight: '600',
            color: '#495057'
          }}>
            <i className="bi bi-grid-3x3-gap-fill me-2" style={{ color: '#0d6efd' }}></i>
            Quick Actions
          </h6>
        </div>
        <div className="card-body pt-0 pb-2 px-2">
          <div className="d-flex flex-wrap justify-content-start gap-2">
            {actions.map((btn, index) => (
              <button
                key={index}
                className="action-btn-karobar"
                onClick={btn.action === "pos" ? onPosSaleClick : () => handleActionClick(btn.action)}
                title={btn.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '72px',
                  height: '72px',
                  border: 'none',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  color: btn.color,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  padding: '4px',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                }}
              >
                <div 
                  className="icon-wrapper"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: btn.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i className={`bi ${btn.icon}`} style={{ fontSize: '1.1rem', color: btn.color }}></i>
                </div>
                <span className="small fw-medium text-center" style={{ 
                  fontSize: '0.55rem', 
                  lineHeight: '1.1',
                  color: '#495057',
                  maxWidth: '64px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {btn.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .action-btn-karobar {
          transition: all 0.2s ease-in-out !important;
          position: relative;
        }
        
        .action-btn-karobar:hover .icon-wrapper {
          transform: scale(1.05);
        }
        
        .action-btn-karobar::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 2px;
          background: #0d6efd;
          transition: width 0.3s ease;
          border-radius: 2px;
        }
        
        .action-btn-karobar:hover::after {
          width: 40%;
        }
        
        @media (max-width: 768px) {
          .action-btn-karobar {
            width: 62px !important;
            height: 62px !important;
          }
          .action-btn-karobar .icon-wrapper {
            width: 30px !important;
            height: 30px !important;
          }
          .action-btn-karobar .icon-wrapper i {
            font-size: 0.9rem !important;
          }
          .action-btn-karobar span {
            font-size: 0.5rem !important;
          }
        }
        
        @media (max-width: 576px) {
          .action-btn-karobar {
            width: 54px !important;
            height: 54px !important;
            border-radius: 10px !important;
          }
          .action-btn-karobar .icon-wrapper {
            width: 26px !important;
            height: 26px !important;
            border-radius: 8px !important;
          }
          .action-btn-karobar .icon-wrapper i {
            font-size: 0.75rem !important;
          }
          .action-btn-karobar span {
            font-size: 0.45rem !important;
          }
          .gap-2 {
            gap: 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QuickActions;