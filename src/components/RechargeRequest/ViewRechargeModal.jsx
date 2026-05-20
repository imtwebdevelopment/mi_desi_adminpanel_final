import React from "react";

const ViewRechargeModal = ({ request, setShowView }) => (
  <div className="modal show fade d-block" tabIndex="-1" style={{ background: "#00000080" }}>
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h5>Recharge Details</h5>
          <button className="btn-close" onClick={() => setShowView(false)}></button>
        </div>
        <div className="modal-body">
          <p><strong>User ID:</strong> {request.userId}</p>
          <p><strong>Number:</strong> {request.number}</p>
          <p><strong>Plan:</strong> ₹{request.plan?.price}</p>
          <p><strong>Status:</strong> {request.rechargeStatus}</p>
          <p><strong>Requested:</strong> {request.createdAt?.toDate?.().toLocaleString() || "N/A"}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowView(false)}>Close</button>
        </div>
      </div>
    </div>
  </div>
);

export default ViewRechargeModal;
