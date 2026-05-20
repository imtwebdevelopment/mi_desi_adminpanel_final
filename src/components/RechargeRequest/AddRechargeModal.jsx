import React, { useState } from "react";
import { db, collection, addDoc, serverTimestamp } from "../../firebase";

const AddRechargeModal = ({ setShowAdd, refresh }) => {
  const [userId, setUserId] = useState("");
  const [number, setNumber] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("Pending");

  const handleSave = async () => {
    if (!userId || !number || !price) return alert("All fields required!");
    try {
      await addDoc(collection(db, `customers/${userId}/rechargeRequest`), {
        number,
        plan: { price },
        rechargeStatus: status,
        createdAt: serverTimestamp(),
      });
      setShowAdd(false);
      refresh();
    } catch (e) {
      alert("Failed to add request.");
    }
  };

  return (
    <div className="modal show fade d-block" tabIndex="-1" style={{ background: "#00000080" }}>
      <div className="modal-dialog">
        <div className="modal-content border-0 shadow">
          <div className="modal-header">
            <h5>Add Recharge Request</h5>
            <button className="btn-close" onClick={() => setShowAdd(false)}></button>
          </div>
          <div className="modal-body">
            <input className="form-control mb-2" placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
            <input className="form-control mb-2" placeholder="Number" value={number} onChange={(e) => setNumber(e.target.value)} />
            <input className="form-control mb-2" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Pending</option>
              <option>Success</option>
              <option>Failed</option>
            </select>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRechargeModal;
