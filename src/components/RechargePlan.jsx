import React, { useState, useEffect } from "react";
import FixedHeader from "./FixedHeader";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  db,
  collection,
  onSnapshot,
  updateDoc,
  addDoc,
  doc,
  serverTimestamp,
  setDoc,
   deleteDoc, 
} from "../firebase";

const RechargePlans = () => {
  const [recharges, setRecharges] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [filteredRecharges, setFilteredRecharges] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalData, setModalData] = useState(null);
  const [viewRecharge, setViewRecharge] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [selectedCompany, setSelectedCompany] = useState("All");
const [providers, setProviders] = useState([]);
const companies = [
  "All",
  ...providers.map((p) => p.providerName),
];





  const [addRecharge, setAddRecharge] = useState({
  rechargeProvider: "",
  dataInfo: "",
  price: "",
  validity: "",
  status: "Active",
});


const handleDeleteRecharge = async () => {
  if (!deleteId) return;

  try {
    await deleteDoc(doc(db, "recharge", deleteId));
    setShowDeleteModal(false);
    setDeleteId(null);
  } catch (error) {
    console.error("Delete failed:", error);
  }
};

useEffect(() => {
  const unsubscribe = onSnapshot(
    collection(db, "rechargeProvider"),
    (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setProviders(data);
    }
  );

  return () => unsubscribe();
}, []);


  // 🔥 Fetch recharge data from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "recharge"), (snapshot) => {
    const data = snapshot.docs.map((docSnap) => ({
  ...docSnap.data(),
  id: docSnap.id, // 👈 ALWAYS LAST
}));

      setRecharges(data);
      setFilteredRecharges(data);
    });

    return () => unsubscribe();
  }, []);

  // 🔍 Universal search
 useEffect(() => {
  let data = [...recharges];

  // 🔹 Filter by company
  if (selectedCompany !== "All") {
    data = data.filter(
      (r) => r.rechargeProvider === selectedCompany
    );
  }

  // 🔹 Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    data = data.filter((r) =>
      Object.values(r).some((val) =>
        String(val).toLowerCase().includes(q)
      )
    );
  }

  setFilteredRecharges(data);
}, [searchQuery, selectedCompany, recharges]);

  // ✏️ Save edited recharge
  const handleSaveRecharge = async (e) => {
    e.preventDefault();
    const { id, rechargeProvider, dataInfo, price, validity, status } =
      modalData;

    const payload = {
      rechargeProvider,
      dataInfo,
      price: Number(price),
      validity,
      status,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, "recharge", id), payload);
    setModalData(null);
  };
const handleAddRecharge = async (e) => {
  e.preventDefault();

  const rechargeRef = doc(collection(db, "recharge"));

  await setDoc(rechargeRef, {
    id: rechargeRef.id,
    rechargeProvider: addRecharge.rechargeProvider,
    dataInfo: addRecharge.dataInfo,
    price: Number(addRecharge.price),
    validity: addRecharge.validity,
    status: addRecharge.status,
    createdAt: serverTimestamp(),
  });

  setShowAddModal(false); // ✅ CLOSE MODAL
};

  return (
    <div style={{ minHeight: "100vh", background: "#f1f3f6" }}>
      <FixedHeader onSearchChange={setSearchQuery} />
      

      <div className="container-fluid p-4" style={{ paddingTop: "90px" }}>
      
        <div className="d-flex justify-content-between align-items-center mb-4">
  <h2 className="fw-bold text-primary">Recharge Plans</h2>

  <button
  className="btn btn-primary fw-semibold"
  onClick={() => {
    setAddRecharge({
      rechargeProvider: selectedCompany !== "All" ? selectedCompany : "",
      dataInfo: "",
      price: "",
      validity: "",
      status: "Active",
    });
    setShowAddModal(true);
  }}
>
  ➕ Add Recharge
</button>


</div>

<ul className="nav nav-pills mb-4 gap-2 flex-nowrap overflow-auto">
  {companies.map((c) => (
    <li className="nav-item" key={c}>
      <button
        className={`nav-link px-4 py-2 fw-semibold rounded-pill ${
          selectedCompany === c
            ? "active shadow-sm"
            : "text-primary bg-light"
        }`}
        onClick={() => setSelectedCompany(c)}
      >
        {c}
      </button>
    </li>
  ))}
</ul>


        {/* Table */}
        <div className="card shadow-lg border-0 rounded-4">
          <div className="table-responsive">
            <table className="table align-middle mb-0 table-hover">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Provider</th>
                  <th>Info</th>
                  <th>Price (₹)</th>
                  <th>Validity</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecharges.length > 0 ? (
                  filteredRecharges.map((r) => (
                    <tr key={r.id} className="align-middle hover-shadow">
                      <td>{r.id}</td>
                      <td>{r.rechargeProvider}</td>
                      <td>{r.dataInfo}</td>
                      <td className="fw-bold">{r.price}</td>
                      <td>{r.validity}</td>
                      <td>
                        <span
                          className={`badge ${
                            r.status === "Active"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {r.createdAt
                          ? new Date(r.createdAt.seconds * 1000).toLocaleDateString()
                          : "—"}
                      </td>
                     <td className="text-center">
  <button
    className="btn btn-sm btn-outline-primary me-1"
    onClick={() => setViewRecharge(r)}
  >
    👁️
  </button>

  <button
    className="btn btn-sm btn-outline-warning me-1"
    onClick={() => setModalData(r)}
  >
    ✏️
  </button>
  <button
    className="btn btn-sm btn-outline-danger"
    onClick={() => {
      setDeleteId(r.id);
      setShowDeleteModal(true);
    }}
  >
    🗑️
  </button>

 {showDeleteModal && (
  <div className="modal show d-block" tabIndex="-1">
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content border-0 shadow-lg rounded-4">
        <div className="modal-header bg-danger text-white rounded-top-4">
          <h5 className="modal-title">Delete Recharge Plan</h5>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={() => setShowDeleteModal(false)}
          ></button>
        </div>

        <div className="modal-body">
          <p className="mb-0">
            Are you sure you want to delete this recharge plan?
            <br />
            <strong className="text-danger">
              This action cannot be undone.
            </strong>
          </p>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger fw-semibold"
            onClick={handleDeleteRecharge}
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  </div>
)}

</td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-3">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ✏️ Enhanced Edit Modal */}
        {modalData && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header bg-gradient text-white rounded-top-4" 
                     style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}>
                  <h5 className="modal-title">✏️ Edit Recharge Plan</h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setModalData(null)}
                  ></button>
                </div>

                <form onSubmit={handleSaveRecharge}>
                  <div className="modal-body p-4">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-muted">
                          Recharge ID
                        </label>
                        <input
                          type="text"
                          className="form-control bg-light"
                          value={modalData.id}
                          readOnly
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-muted">
                          Provider
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={modalData.rechargeProvider}
                          onChange={(e) =>
                            setModalData({
                              ...modalData,
                              rechargeProvider: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div className="col-md-12">
                        <label className="form-label fw-semibold text-muted">
                          Plan Information
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={modalData.dataInfo}
                          onChange={(e) =>
                            setModalData({
                              ...modalData,
                              dataInfo: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label fw-semibold text-muted">
                          Price (₹)
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={modalData.price}
                          onChange={(e) =>
                            setModalData({
                              ...modalData,
                              price: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label fw-semibold text-muted">
                          Validity
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={modalData.validity}
                          onChange={(e) =>
                            setModalData({
                              ...modalData,
                              validity: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label fw-semibold text-muted">
                          Status
                        </label>
                        <select
                          className="form-select"
                          value={modalData.status}
                          onChange={(e) =>
                            setModalData({
                              ...modalData,
                              status: e.target.value,
                            })
                          }
                        >
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setModalData(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary fw-semibold"
                    >
                      💾 Update
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
{showAddModal && (
  <div className="modal show d-block" tabIndex="-1">
    <div className="modal-dialog modal-dialog-centered modal-lg">
      <div className="modal-content border-0 shadow-lg rounded-4">
        <div
          className="modal-header text-white rounded-top-4"
          style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)" }}
        >
          <h5 className="modal-title">➕ Add Recharge Plan</h5>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={() => setAddRecharge(null)}
          ></button>
        </div>

        <form onSubmit={handleAddRecharge}>
          <div className="modal-body p-4">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Provider</label>
               <select
  className="form-select"
  value={addRecharge.rechargeProvider}
  onChange={(e) =>
    setAddRecharge({
      ...addRecharge,
      rechargeProvider: e.target.value,
    })
  }
  required
>
  <option value="" disabled hidden>
    Select Provider
  </option>

  {providers.map((p) => (
    <option key={p.id} value={p.providerName}>
      {p.providerName}
    </option>
  ))}
</select>


              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Validity</label>
                <input
                  type="text"
                  className="form-control"
                  value={addRecharge.validity}
                  onChange={(e) =>
                    setAddRecharge({
                      ...addRecharge,
                      validity: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="col-md-12">
                <label className="form-label fw-semibold">Plan Info</label>
                <input
                  type="text"
                  className="form-control"
                  value={addRecharge.dataInfo}
                  onChange={(e) =>
                    setAddRecharge({
                      ...addRecharge,
                      dataInfo: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold">Price (₹)</label>
                <input
                  type="number"
                  className="form-control"
                  value={addRecharge.price}
                  onChange={(e) =>
                    setAddRecharge({
                      ...addRecharge,
                      price: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold">Status</label>
                <select
                  className="form-select"
                  value={addRecharge.status}
                  onChange={(e) =>
                    setAddRecharge({
                      ...addRecharge,
                      status: e.target.value,
                    })
                  }
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
  type="button"
  className="btn btn-secondary"
  onClick={() => setShowAddModal(false)}
>
  Cancel
</button>

            <button type="submit" className="btn btn-success fw-semibold">
              💾 Save Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
)}

        {/* 👁️ Attractive View Modal */}
        {viewRecharge && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content shadow-lg rounded-4 border-0">
                <div
                  className="modal-header bg-primary text-white rounded-top-4"
                  style={{
                    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                  }}
                >
                  <h5 className="modal-title">📱 Recharge Plan Details</h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setViewRecharge(null)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="info-card p-3 bg-light rounded-3 shadow-sm">
                        <h6 className="text-muted mb-1">Provider</h6>
                        <h5>{viewRecharge.rechargeProvider}</h5>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="info-card p-3 bg-light rounded-3 shadow-sm">
                        <h6 className="text-muted mb-1">Plan Info</h6>
                        <h5>{viewRecharge.dataInfo}</h5>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="info-card p-3 bg-light rounded-3 shadow-sm">
                        <h6 className="text-muted mb-1">Price</h6>
                        <h5 className="text-success fw-bold">
                          ₹{viewRecharge.price}
                        </h5>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="info-card p-3 bg-light rounded-3 shadow-sm">
                        <h6 className="text-muted mb-1">Validity</h6>
                        <h5>{viewRecharge.validity}</h5>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="info-card p-3 bg-light rounded-3 shadow-sm">
                        <h6 className="text-muted mb-1">Status</h6>
                        <span
                          className={`badge px-3 py-2 fs-6 ${
                            viewRecharge.status === "Active"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {viewRecharge.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setViewRecharge(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 💅 Styles */}
      <style>{`
        .hover-shadow:hover {
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
          transition: all 0.3s ease-in-out;
        }
        .info-card h6 {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-card h5 {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default RechargePlans;
