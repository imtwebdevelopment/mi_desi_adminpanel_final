import React, { useEffect, useState } from "react";
import FixedHeader from "./FixedHeader";
import "bootstrap/dist/css/bootstrap.min.css";

import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

const SubCategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newSub, setNewSub] = useState("");
  const [editSub, setEditSub] = useState(null);

  /* ---------------- TOAST STATE ---------------- */
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success", // success | danger | warning
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  /* ---------------- FETCH CATEGORIES ---------------- */
  const fetchCategories = async () => {
    const snap = await getDocs(collection(db, "category"));
    setCategories(snap.docs.map(d => ({ ...d.data(), docId: d.id })));
  };

  /* ---------------- FETCH SUBCATEGORIES ---------------- */
  const fetchSubCategories = async () => {
  setLoading(true);

  const snap = await getDocs(collection(db, "subcategories"));

  const result = snap.docs.map(d => ({
    docId: d.id,
    ...d.data(),
  }));

  setSubCategories(result);
  setLoading(false);
};
  /* ---------------- ADD ---------------- */
  const handleAdd = async (e) => {
    e.preventDefault();
    await addDoc(
      collection(db, "subcategories"),
      {
        subCategoryName: newSub.trim(),
         categoryId: selectedCategory,
        createdAt: serverTimestamp(),
      }
    );

    setNewSub("");
    fetchSubCategories(selectedCategory);
    showToast("Subcategory added successfully");
  };

  /* ---------------- EDIT ---------------- */
  const handleEdit = async (e) => {
    e.preventDefault();

    await updateDoc(
      doc(
        db,
        "category",
        editSub.categoryId,
        "subcategories",
        editSub.docId
      ),
      {
        subCategoryName: editSub.subCategoryName.trim(),
        updatedAt: serverTimestamp(),
      }
    );

    setEditSub(null);
    fetchSubCategories(selectedCategory);
    showToast("Subcategory updated successfully");
  };

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (sub) => {
    await deleteDoc(
     doc(db, "subcategories", sub.docId)
    );

    fetchSubCategories(selectedCategory);
    showToast("Subcategory deleted", "danger");
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categories.length) fetchSubCategories(selectedCategory);
  }, [selectedCategory, categories]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <FixedHeader />

      <div className="container-fluid p-4" style={{ paddingTop: 90 }}>
        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="fw-bold text-primary mb-3">
              Subcategory Management
            </h2>

            {/* FILTER */}
          </div>
        </div>

        {/* ADD */}
       
          <div className="card border-0 shadow-sm rounded-4 px-3 py-3 mb-3">
            <form onSubmit={handleAdd} className="d-flex gap-2">
              <input
                id="subcat-input"
                className="form-control rounded-pill"
                placeholder="Enter subcategory name"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                required
              />
              <button className="btn btn-gradient-primary rounded-pill px-4">
                Add
              </button>
            </form>
          </div>
        

        {/* TABLE */}
        <div className="card border-0 shadow-lg rounded-4">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Subcategory</th>
                  <th>ID</th>
                  <th>Category</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="text-center p-4">Loading...</td>
                  </tr>
                ) : subCategories.length ? (
                  subCategories.map(sub => (
                    <tr key={sub.docId}>
                      <td className="fw-semibold">{sub.subCategoryName}</td>
                      <td className="text-muted small">{sub.docId.slice(0, 8)}...</td>
                      <td>{sub.categoryName}</td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => setEditSub(sub)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(sub)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center p-4 text-muted">
                      No subcategories found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editSub && (
        <ModalWrapper title="Edit Subcategory" onClose={() => setEditSub(null)}>
          <form onSubmit={handleEdit}>
            <input
              className="form-control rounded-pill mb-3"
              value={editSub.subCategoryName}
              onChange={(e) =>
                setEditSub({ ...editSub, subCategoryName: e.target.value })
              }
              required
            />
            <div className="text-end">
              <button
                type="button"
                className="btn btn-secondary me-2"
                onClick={() => setEditSub(null)}
              >
                Cancel
              </button>
              <button className="btn btn-success">Save</button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* TOAST */}
      {toast.show && (
        <div className="toast-container position-fixed top-0 end-0 p-3">
          <div className={`toast show text-bg-${toast.type}`}>
            <div className="toast-body">{toast.message}</div>
          </div>
        </div>
      )}

      <style>{`
        .btn-gradient-primary {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: #fff;
        }
        .btn-gradient-primary:hover {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
        }
      `}</style>
    </div>
  );
};

/* MODAL */
const ModalWrapper = ({ title, onClose, children }) => (
  <div className="modal show d-block" style={{ background: "rgba(0,0,0,.6)" }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content rounded-4 shadow">
        <div className="modal-header">
          <h5 className="fw-bold">{title}</h5>
          <button className="btn-close" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  </div>
);

export default SubCategoryList;
