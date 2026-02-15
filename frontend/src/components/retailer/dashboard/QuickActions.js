import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../stylesheet/retailer/helper/QuickActions.css'

const QuickActions = ({ onPosSaleClick }) => {
  const navigate = useNavigate();

  const handleActionClick = (path) => {
    navigate(path);
  };

  return (
    // <div className="col connectedSortable">
    //   <div className="card text-white bg-primary bg-gradient border-primary mb-4">
    //     <div className="card-header border-0 d-flex justify-content-between align-items-center">
    //       <h3 className="card-title mb-0">
    //         <i className="bi bi-lightning-charge-fill me-2"></i> Quick Actions
    //       </h3>
    //       <div className="card-tools">
    //         <button type="button" className="btn btn-primary btn-sm" data-lte-toggle="card-collapse">
    //           <i data-lte-icon="expand" className="bi bi-plus-lg"></i>
    //           <i data-lte-icon="collapse" className="bi bi-dash-lg"></i>
    //         </button>
    //       </div>
    //     </div>
    //     <div className="card-body p-2">
    //       <div className="row g-2">
    //         {/* POS Sale Button - Added as first item */}
    //         <div className="col-md-4 d-flex">
    //           <button
    //             className="btn btn-warning w-100 d-flex flex-column align-items-center justify-content-center p-2 action-btn"
    //             onClick={onPosSaleClick}  // Changed to use prop
    //           >
    //             <i className="bi bi-terminal-fill fs-3 mb-2"></i>
    //             <span className="text-wrap fw-bold">POS Sale</span>
    //           </button>
    //         </div>

    //         {/* First Row - Adjusted remaining buttons */}
    //         <div className="col-md-4 d-flex">
    //           <button
    //             className="btn btn-light w-100 d-flex flex-column align-items-center justify-content-center p-2 action-btn"
    //             onClick={() => handleActionClick('/retailer/accounts')}>
    //             <i className="bi bi-people-fill fs-3 mb-2"></i>
    //             <span className="text-wrap">Create Party</span>
    //           </button>
    //         </div>
    //         <div className="col-md-4 d-flex">
    //           <button
    //             className="btn btn-light w-100 d-flex flex-column align-items-center justify-content-center p-2 action-btn"
    //             onClick={() => handleActionClick('/retailer/items')}>
    //             <i className="bi bi-box-seam-fill fs-3 mb-2"></i>
    //             <span className="text-wrap">Create Items</span>
    //           </button>
    //         </div>

    //         {/* Second Row */}
    //         <div className="col-md-4 d-flex">
    //           <button
    //             className="btn btn-light w-100 d-flex flex-column align-items-center justify-content-center p-2 action-btn"
    //             onClick={() => handleActionClick('/retailer/purchase')}>
    //             <i className="bi bi-cart-plus-fill fs-3 mb-2"></i>
    //             <span className="text-wrap">Purchase</span>
    //           </button>
    //         </div>
    //         <div className="col-md-4 d-flex">
    //           <button
    //             className="btn btn-light w-100 d-flex flex-column align-items-center justify-content-center p-2 action-btn"
    //             onClick={() => handleActionClick('/retailer/cash-sales')}>
    //             <i className="bi bi-cash-coin fs-3 mb-2"></i>
    //             <span className="text-wrap">Cash Sales</span>
    //           </button>
    //         </div>
    //         <div className="col-md-4 d-flex">
    //           <button
    //             className="btn btn-light w-100 d-flex flex-column align-items-center justify-content-center p-2 action-btn"
    //             onClick={() => handleActionClick('/retailer/cash-sales/open')}>
    //             <i className="bi bi-cash-stack fs-3 mb-2"></i>
    //             <span className="text-wrap">Cash Sales Open</span>
    //           </button>
    //         </div>

    //         {/* Third Row */}
    //         <div className="col-md-4 d-flex">
    //           <button
    //             className="btn btn-light w-100 d-flex flex-column align-items-center justify-content-center p-2 action-btn"
    //             onClick={() => handleActionClick('/retailer/credit-sales')}>
    //             <i className="bi bi-credit-card fs-3 mb-2"></i>
    //             <span className="text-wrap">Credit Sales</span>
    //           </button>
    //         </div>
    //         <div className="col-md-4 d-flex">
    //           <button
    //             className="btn btn-light w-100 d-flex flex-column align-items-center justify-content-center p-2 action-btn"
    //             onClick={() => handleActionClick('/retailer/credit-sales/open')}>
    //             <i className="bi bi-credit-card-2-front fs-3 mb-2"></i>
    //             <span className="text-wrap">Credit Sales Open</span>
    //           </button>
    //         </div>
    //         <div className="col-md-4 d-flex">
    //           <button
    //             className="btn btn-light w-100 d-flex flex-column align-items-center justify-content-center p-2 action-btn"
    //             onClick={() => handleActionClick('/retailer/payments')}>
    //             <i className="bi bi-arrow-up-circle fs-3 mb-2"></i>
    //             <span className="text-wrap">Payment</span>
    //           </button>
    //         </div>

    //         {/* Fourth Row - Moved Receipt button here */}
    //         <div className="col-md-4 d-flex">
    //           <button
    //             className="btn btn-light w-100 d-flex flex-column align-items-center justify-content-center p-2 action-btn"
    //             onClick={() => handleActionClick('/retailer/receipts')}>
    //             <i className="bi bi-arrow-down-circle fs-3 mb-2"></i>
    //             <span className="text-wrap">Receipt</span>
    //           </button>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // </div>

    <div className="col connectedSortable">
      <div className="card text-white bg-primary bg-gradient border-primary mb-3">
        <div className="card-header border-0 d-flex justify-content-between align-items-center py-1">
          <h3 className="card-title mb-0 fs-5">
            <i className="bi bi-lightning-charge-fill me-1"></i>Quick Actions
          </h3>
        </div>
        <div className="card-body p-1">
          <div className="row g-1">
            {[
              {
                label: "POS Sale",
                icon: "bi-terminal-fill",
                color: "btn-warning",
                action: onPosSaleClick,
                colClass: "col-4 col-md-3 col-lg-2"
              },
              {
                label: "Create Party",
                icon: "bi-people-fill",
                color: "btn-light",
                action: "/retailer/accounts"
              },
              {
                label: "Create Items",
                icon: "bi-box-seam-fill",
                color: "btn-light",
                action: "/retailer/items"
              },
              {
                label: "Purchase",
                icon: "bi-cart-plus-fill",
                color: "btn-light",
                action: "/retailer/purchase"
              },
              {
                label: "Cash Sales",
                icon: "bi-cash-coin",
                color: "btn-light",
                action: "/retailer/cash-sales"
              },
              {
                label: "Cash Sales Open",
                icon: "bi-cash-stack",
                color: "btn-light",
                action: "/retailer/cash-sales/open"
              },
              {
                label: "Credit Sales",
                icon: "bi-credit-card",
                color: "btn-light",
                action: "/retailer/credit-sales"
              },
              {
                label: "Credit Sales Open",
                icon: "bi-credit-card-2-front",
                color: "btn-light",
                action: "/retailer/credit-sales/open"
              },
              {
                label: "Payment",
                icon: "bi-arrow-up-circle",
                color: "btn-light",
                action: "/retailer/payments"
              },
              {
                label: "Receipt",
                icon: "bi-arrow-down-circle",
                color: "btn-light",
                action: "/retailer/receipts"
              }
            ].map((btn, index) => (
              <div key={index} className={`${btn.colClass || "col-4 col-md-3 col-lg-2"} d-flex`}>
                <button
                  className={`btn ${btn.color} w-100 d-flex flex-column align-items-center justify-content-center p-1`}
                  onClick={btn.action === onPosSaleClick ? btn.action : () => handleActionClick(btn.action)}
                  title={btn.label}
                >
                  <i className={`bi ${btn.icon} fs-4 mb-1`}></i>
                  <span className="text-wrap fw-normal" style={{ fontSize: "0.75rem" }}>
                    {btn.label}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;