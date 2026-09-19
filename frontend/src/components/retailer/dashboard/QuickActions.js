// import React from 'react';
// import { useNavigate } from 'react-router-dom';
// import './QuickActions.css';

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
//       bgClass: "qa-icon--cash"
//     },
//     { 
//       label: "Create Party", 
//       action: "/retailer/accounts", 
//       icon: "bi-people",
//       color: "#2563eb",
//       bgClass: "qa-icon--party"
//     },
//     { 
//       label: "Create Items", 
//       action: "/retailer/items", 
//       icon: "bi-box-seam",
//       color: "#d97706",
//       bgClass: "qa-icon--items"
//     },
//     { 
//       label: "Purchase", 
//       action: "/retailer/purchase", 
//       icon: "bi-cart-plus",
//       color: "#7c3aed",
//       bgClass: "qa-icon--purchase"
//     },
//     { 
//       label: "Sales", 
//       action: "/retailer/sales", 
//       icon: "bi-cash-coin",
//       color: "#0891b2",
//       bgClass: "qa-icon--cash-sales"
//     },
//     { 
//       label: "Sales Open", 
//       action: "/retailer/sales-open", 
//       icon: "bi-cash",
//       color: "#0d9488",
//       bgClass: "qa-icon--cash-open"
//     },
//     { 
//       label: "Payment", 
//       action: "/retailer/payments", 
//       icon: "bi-arrow-up-circle",
//       color: "#dc2626",
//       bgClass: "qa-icon--payment"
//     },
//     { 
//       label: "Receipt", 
//       action: "/retailer/receipts", 
//       icon: "bi-arrow-down-circle",
//       color: "#059669",
//       bgClass: "qa-icon--receipt"
//     }
//   ];

//   return (
//     <div className="qa-container">
//       <div className="qa-header">
//         <div className="qa-header-left">
//           <div className="qa-header-icon">
//             <i className="bi bi-grid-3x3-gap-fill"></i>
//           </div>
//           <div>
//             <h6 className="qa-title">Quick Actions</h6>
//             <small className="qa-subtitle">Frequently used operations</small>
//           </div>
//         </div>
//       </div>
//       <div className="qa-body">
//         <div className="qa-grid">
//           {actions.map((btn, index) => (
//             <button
//               key={index}
//               className="qa-btn"
//               onClick={btn.action === "pos" ? onPosSaleClick : () => handleActionClick(btn.action)}
//               title={btn.label}
//             >
//               <div className={`qa-icon-wrapper ${btn.bgClass}`}>
//                 <i className={`bi ${btn.icon}`}></i>
//               </div>
//               <span className="qa-btn-label">{btn.label}</span>
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default QuickActions;

//------------------------------------------end1
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
      bgClass: "qa-icon--cash"
    },
    {
      label: "Create Party",
      action: "/retailer/accounts",
      icon: "bi-people",
      bgClass: "qa-icon--party"
    },
    {
      label: "Create Items",
      action: "/retailer/items",
      icon: "bi-box-seam",
      bgClass: "qa-icon--items"
    },
    {
      label: "Purchase",
      action: "/retailer/purchase",
      icon: "bi-cart-plus",
      bgClass: "qa-icon--purchase"
    },
    {
      label: "Sales",
      action: "/retailer/sales",
      icon: "bi-cash-coin",
      bgClass: "qa-icon--cash-sales"
    },
    {
      label: "Sales Open",
      action: "/retailer/sales-open",
      icon: "bi-cash",
      bgClass: "qa-icon--cash-open"
    },
    {
      label: "Payment",
      action: "/retailer/payments",
      icon: "bi-arrow-up-circle",
      bgClass: "qa-icon--payment"
    },
    {
      label: "Receipt",
      action: "/retailer/receipts",
      icon: "bi-arrow-down-circle",
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
              onClick={
                btn.action === "pos"
                  ? onPosSaleClick
                  : () => handleActionClick(btn.action)
              }
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