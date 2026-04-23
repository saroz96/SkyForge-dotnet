// import React from 'react';
// import { useNavigate } from 'react-router-dom';
// import '../../../stylesheet/retailer/helper/QuickActions.css'

// const QuickActions = ({ onPosSaleClick }) => {
//   const navigate = useNavigate();

//   const handleActionClick = (path) => {
//     navigate(path);
//   };

//   return (

//     <div className="col connectedSortable">
//       <div className="card text-white bg-primary bg-gradient border-primary mb-3">
//         <div className="card-header border-0 d-flex justify-content-between align-items-center py-1">
//           <h3 className="card-title mb-0 fs-5">
//             <i className="bi bi-lightning-charge-fill me-1"></i>Quick Actions
//           </h3>
//         </div>
//         <div className="card-body p-1">
//           <div className="row g-1">
//             {[
//               {
//                 label: "POS Sale",
//                 icon: "bi-terminal-fill",
//                 color: "btn-warning",
//                 action: onPosSaleClick,
//                 colClass: "col-4 col-md-3 col-lg-2"
//               },
//               {
//                 label: "Create Party",
//                 icon: "bi-people-fill",
//                 color: "btn-light",
//                 action: "/retailer/accounts"
//               },
//               {
//                 label: "Create Items",
//                 icon: "bi-box-seam-fill",
//                 color: "btn-light",
//                 action: "/retailer/items"
//               },
//               {
//                 label: "Purchase",
//                 icon: "bi-cart-plus-fill",
//                 color: "btn-light",
//                 action: "/retailer/purchase"
//               },
//               {
//                 label: "Cash Sales",
//                 icon: "bi-cash-coin",
//                 color: "btn-light",
//                 action: "/retailer/cash-sales"
//               },
//               {
//                 label: "Cash Sales Open",
//                 icon: "bi-cash-stack",
//                 color: "btn-light",
//                 action: "/retailer/cash-sales/open"
//               },
//               {
//                 label: "Credit Sales",
//                 icon: "bi-credit-card",
//                 color: "btn-light",
//                 action: "/retailer/credit-sales"
//               },
//               {
//                 label: "Credit Sales Open",
//                 icon: "bi-credit-card-2-front",
//                 color: "btn-light",
//                 action: "/retailer/credit-sales/open"
//               },
//               {
//                 label: "Payment",
//                 icon: "bi-arrow-up-circle",
//                 color: "btn-light",
//                 action: "/retailer/payments"
//               },
//               {
//                 label: "Receipt",
//                 icon: "bi-arrow-down-circle",
//                 color: "btn-light",
//                 action: "/retailer/receipts"
//               }
//             ].map((btn, index) => (
//               <div key={index} className={`${btn.colClass || "col-4 col-md-3 col-lg-2"} d-flex`}>
//                 <button
//                   className={`btn ${btn.color} w-100 d-flex flex-column align-items-center justify-content-center p-1`}
//                   onClick={btn.action === onPosSaleClick ? btn.action : () => handleActionClick(btn.action)}
//                   title={btn.label}
//                 >
//                   <i className={`bi ${btn.icon} fs-4 mb-1`}></i>
//                   <span className="text-wrap fw-normal" style={{ fontSize: "0.75rem" }}>
//                     {btn.label}
//                   </span>
//                 </button>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default QuickActions;

//---------------------------------------------------------end

import React from 'react';
import { useNavigate } from 'react-router-dom';

const QuickActions = ({ onPosSaleClick }) => {
  const navigate = useNavigate();

  const handleActionClick = (path) => {
    navigate(path);
  };

  const getButtonColor = (label) => {
    const colorMap = {
      'POS Sale': 'warning',
      'Create Party': 'outline-light',
      'Create Items': 'outline-light',
      'Purchase': 'outline-light',
      'Cash Sales': 'outline-light',
      'Cash Sales Open': 'outline-light',
      'Credit Sales': 'outline-light',
      'Credit Sales Open': 'outline-light',
      'Payment': 'outline-light',
      'Receipt': 'outline-light'
    };
    return colorMap[label] || 'outline-light';
  };

  const getIconStyle = (label) => {
    const iconMap = {
      'POS Sale': 'bi-terminal-fill',
      'Create Party': 'bi-people-fill',
      'Create Items': 'bi-box-seam-fill',
      'Purchase': 'bi-cart-plus-fill',
      'Cash Sales': 'bi-cash-coin',
      'Cash Sales Open': 'bi-cash-stack',
      'Credit Sales': 'bi-credit-card',
      'Credit Sales Open': 'bi-credit-card-2-front',
      'Payment': 'bi-arrow-up-circle',
      'Receipt': 'bi-arrow-down-circle'
    };
    return iconMap[label] || 'bi-grid-3x3-gap-fill';
  };

  const actions = [
    { label: "POS Sale", action: "pos" },
    { label: "Create Party", action: "/retailer/accounts" },
    { label: "Create Items", action: "/retailer/items" },
    { label: "Purchase", action: "/retailer/purchase" },
    { label: "Cash Sales", action: "/retailer/cash-sales" },
    { label: "Cash Sales Open", action: "/retailer/cash-sales/open" },
    { label: "Credit Sales", action: "/retailer/credit-sales" },
    { label: "Credit Sales Open", action: "/retailer/credit-sales/open" },
    { label: "Payment", action: "/retailer/payments" },
    { label: "Receipt", action: "/retailer/receipts" }
  ];

  return (
    <div className="col-12 mb-3">
      <div className="card bg-primary bg-gradient border-0 shadow-sm">
        <div className="card-header bg-transparent border-0 py-1">
          <h6 className="card-title text-white mb-0">
            <i className="bi bi-lightning-charge-fill me-1"></i>
            Quick Actions
          </h6>
        </div>
        <div className="card-body pt-0 pb-2">
          <div className="d-flex flex-wrap justify-content-center gap-2">
            {actions.map((btn, index) => (
              <button
                key={index}
                className={`btn btn-${getButtonColor(btn.label)} rounded-circle p-2 d-flex flex-column align-items-center justify-content-center shadow-sm action-btn`}
                onClick={btn.action === "pos" ? onPosSaleClick : () => handleActionClick(btn.action)}
                title={btn.label}
                style={{ width: '70px', height: '70px', transition: 'all 0.2s ease' }}
              >
                <i className={`bi ${getIconStyle(btn.label)} fs-4 mb-1`}></i>
                <span className="small fw-semibold text-center px-1" style={{ fontSize: '0.65rem', lineHeight: '1.2' }}>
                  {btn.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .action-btn {
          transition: all 0.2s ease-in-out !important;
        }
        .action-btn:hover {
          transform: translateY(-2px) scale(1.02) !important;
          box-shadow: 0 6px 12px rgba(0,0,0,0.15) !important;
        }
        .btn-outline-light {
          background-color: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,255,255,0.3);
          color: #4e73df;
        }
        .btn-outline-light:hover {
          background-color: white;
          color: #224abe;
          border-color: white;
        }
        .btn-warning {
          background: linear-gradient(135deg, #ffc107, #ff9f00);
          border: none;
          color: #212529;
        }
        @media (max-width: 768px) {
          .action-btn {
            width: 60px !important;
            height: 60px !important;
          }
          .action-btn i {
            font-size: 1.25rem !important;
          }
          .action-btn span {
            font-size: 0.6rem !important;
          }
        }
        @media (max-width: 576px) {
          .gap-2 {
            gap: 0.5rem !important;
          }
          .action-btn {
            width: 55px !important;
            height: 55px !important;
          }
          .action-btn i {
            font-size: 1rem !important;
          }
          .action-btn span {
            font-size: 0.55rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QuickActions;