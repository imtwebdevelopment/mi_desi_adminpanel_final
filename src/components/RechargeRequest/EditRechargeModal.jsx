import React, { useState } from "react";
import { db, doc, updateDoc } from "../../firebase";

const EditRechargeModal = ({ request, setShowEdit, refresh }) => {
  const [status, setStatus] = useState(request.rechargeStatus || "Pending");

  const handleUpdate = async () => {
    try {
      const docRef = doc(db, `customers/${request.userId}/rechargeRequest/${request.id}`);
      await updateDoc(docRef, { rechargeStatus: status });
      setShowEdit(false);
      refresh();
    } catch (e) {
      alert("Failed to update.");
    }
  };

  return (
    <div className="modal show fade d-block" tabIndex="-1" style={{ background: "#00000080" }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5>Edit Recharge Status</h5>
            <button className="btn-close" onClick={() => setShowEdit(false)}></button>
          </div>
          <div className="modal-body">
            <p><strong>Number:</strong> {request.number}</p>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Pending</option>
              <option>Success</option>
              <option>Failed</option>
            </select>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            <button className="btn btn-success" onClick={handleUpdate}>Update</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditRechargeModal;
