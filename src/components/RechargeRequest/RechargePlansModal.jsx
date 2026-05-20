import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

const RechargePlansModal = ({ provider, onClose }) => {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    planName: "",
    price: "",
    validity: "",
    data: "",
    talktime: "",
    status: "Active",
  });
  const [editId, setEditId] = useState(null);

  /* 🔥 FETCH PROVIDER-WISE PLANS */
  useEffect(() => {
    if (!provider) return;
    const unsub = onSnapshot(
      collection(db, "rechargeProvider", provider.docId, "plans"),
      (snap) =>
        setPlans(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        )
    );
    return () => unsub();
  }, [provider]);

  /* ➕ ADD / ✏️ UPDATE PLAN */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editId) {
      await updateDoc(
        doc(db, "rechargeProvider", provider.docId, "plans", editId),
        { ...form, updatedAt: serverTimestamp() }
      );
    } else {
      await addDoc(
        collection(db, "rechargeProvider", provider.docId, "plans"),
        { ...form, createdAt: serverTimestamp() }
      );
    }

    setForm({
      planName: "",
      price: "",
      validity: "",
      data: "",
      talktime: "",
      status: "Active",
    });
    setEditId(null);
  };

  /* 🗑️ DELETE */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this plan?")) return;
    await deleteDoc(
      doc(db, "rechargeProvider", provider.docId, "plans", id)
    );
  };

  return (
    <div className="modal show d-block" style={{ background: "rgba(0,0,0,.5)" }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content rounded-4 shadow">

          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              {provider.providerName} – Recharge Plans
            </h5>
            <button className="btn-close btn-close-white" onClick={onClose} />
          </div>

          <div className="modal-body">
            {/* ADD PLAN FORM */}
            <form className="row g-2 mb-4" onSubmit={handleSubmit}>
              <div className="col-md-4">
                <input
                  className="form-control"
                  placeholder="Plan Name"
                  value={form.planName}
                  onChange={(e) =>
                    setForm({ ...form, planName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-2">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Price"
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-2">
                <input
                  className="form-control"
                  placeholder="Validity"
                  value={form.validity}
                  onChange={(e) =>
                    setForm({ ...form, validity: e.target.value })
                  }
                />
              </div>

              <div className="col-md-2">
                <input
                  className="form-control"
                  placeholder="Data"
                  value={form.data}
                  onChange={(e) =>
                    setForm({ ...form, data: e.target.value })
                  }
                />
              </div>

              <div className="col-md-2">
                <input
                  className="form-control"
                  placeholder="Talktime"
                  value={form.talktime}
                  onChange={(e) =>
                    setForm({ ...form, talktime: e.target.value })
                  }
                />
              </div>

              <div className="col-md-2">
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>

              <div className="col-md-2">
                <button className="btn btn-success w-100">
                  {editId ? "Update" : "Add"}
                </button>
              </div>
            </form>

            {/* PLANS TABLE */}
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Price</th>
                    <th>Validity</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id}>
                      <td>{p.planName}</td>
                      <td>₹{p.price}</td>
                      <td>{p.validity}</td>
                      <td>{p.data}</td>
                      <td>
                        <span
                          className={`badge ${
                            p.status === "Active"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => {
                            setForm(p);
                            setEditId(p.id);
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(p.id)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default RechargePlansModal;
