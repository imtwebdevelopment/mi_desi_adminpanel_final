import React from "react";
import { db, doc, deleteDoc } from "../../firebase";

const DeleteRechargeModal = ({ request, setShowDelete, refresh }) => {
  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, `customers/${request.userId}/rechargeRequest/${request.id}`));
      setShowDelete(false);
      refresh();
    } catch (e) {
      alert("Failed to delete.");
    }
  };

  return (
    <div className="modal show fade d-block" tabIndex="-1" style={{ background: "#00000080" }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5>Delete Confirmation</h5>
            <button className="btn-close" onClick={() => setShowDelete(false)}></button>
          </div>
          <div className="modal-body">
            <p>Are you sure you want to delete this recharge request?</p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteRechargeModal;
