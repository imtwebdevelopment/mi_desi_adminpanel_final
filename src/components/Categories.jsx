import React, { useEffect, useState } from "react";
import FixedHeader from "./FixedHeader";
import "bootstrap/dist/css/bootstrap.min.css";
import imageCompression from "browser-image-compression";

// ✅ Import initialized instances from your firebase.js
import { db, storage } from "../firebase";
// ✅ Import SDK functions directly from Firebase packages
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCategories, setFilteredCategories] = useState([]);

  const [editCategory, setEditCategory] = useState(null);
  const [deleteCategory, setDeleteCategory] = useState(null);
  const [viewCategory, setViewCategory] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");


  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [newCategory, setNewCategory] = useState({
    categoryName: "",
    categoryImage: "", // optional URL
    backGroundImage: "", // optional URL
    categoryImageFile: null, // file for add mode
    backGroundImageFile: null, // file for add mode
  });

  const categoriesCollectionRef = collection(db, "category");

  // ✅ Initial fetch
  const fetchCategories = async () => {
    try {
      const snapshot = await getDocs(categoriesCollectionRef);
      const list = snapshot.docs.map((d) => ({ ...d.data(), docId: d.id }));
      setCategories(list);
      setFilteredCategories(list);
    } catch (err) {
      console.error("❌ Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔍 Search
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return setFilteredCategories(categories);
    setFilteredCategories(
      categories.filter(
        (c) =>
          (c.categoryName && c.categoryName.toLowerCase().includes(term)) ||
          (c.docId && c.docId.toLowerCase().includes(term))
      )
    );
  }, [searchTerm, categories]);

  // 📤 Upload helper with compression + progress callback
  const uploadImage = async (file, onProgress) => {
    if (!file) return null;
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.6,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    });

    const fileRef = ref(storage, `categories/${Date.now()}_${compressed.name}`);
    const task = uploadBytesResumable(fileRef, compressed);

    return new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          onProgress?.(pct);
        },
        (err) => {
          console.error("❌ Upload error:", err);
          reject(err);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

  // ➕ Add
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newCategory.categoryName.trim()) return alert("Category name required");

    try {
      setUploading(true);
      setProgress(1);

      let catURL = newCategory.categoryImage || "";
      let bgURL = newCategory.backGroundImage || "";
      const imageProgress = {};
      const uploads = [];

      const updateOverall = (key, pct) => {
        imageProgress[key] = pct;
        const filesCount = (newCategory.categoryImageFile ? 1 : 0) + (newCategory.backGroundImageFile ? 1 : 0);
        if (!filesCount) return setProgress(100);
        const total = Object.values(imageProgress).reduce((a, b) => a + b, 0);
        setProgress(Math.round(total / filesCount));
      };

      if (newCategory.categoryImageFile) {
        uploads.push(
          uploadImage(newCategory.categoryImageFile, (p) => updateOverall("cat", p)).then((u) => (catURL = u))
        );
      }
      if (newCategory.backGroundImageFile) {
        uploads.push(
          uploadImage(newCategory.backGroundImageFile, (p) => updateOverall("bg", p)).then((u) => (bgURL = u))
        );
      }

      if (uploads.length) await Promise.all(uploads);
      setProgress(100);

      const docRef = await addDoc(categoriesCollectionRef, {
        categoryName: newCategory.categoryName.trim(),
        categoryImage: catURL,
        backGroundImage: bgURL,
        createdAt: serverTimestamp(),
      });

      // optional: store self id
      await updateDoc(docRef, { categoryId: docRef.id });

      const created = {
        categoryName: newCategory.categoryName.trim(),
        categoryImage: catURL,
        backGroundImage: bgURL,
        docId: docRef.id,
      };
      setCategories((prev) => [...prev, created]);
      setFilteredCategories((prev) => [...prev, created]);

      setShowAddModal(false);
      setNewCategory({
        categoryName: "",
        categoryImage: "",
        backGroundImage: "",
        categoryImageFile: null,
        backGroundImageFile: null,
      });
      alert("Category added successfully!");
    } catch (err) {
      console.error("❌ Error adding category:", err);
      alert(err?.message || "Failed to add category. See console for details.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // ✏️ Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editCategory) return;

    try {
      setUploading(true);
      setProgress(1);

      const docRef = doc(db, "category", editCategory.docId);
      let catURL = editCategory.categoryImage || "";
      let bgURL = editCategory.backGroundImage || "";

      const imageProgress = {};
      const uploads = [];
      const updateOverall = (key, pct) => {
        imageProgress[key] = pct;
        const filesCount = (editCategory.newCategoryImageFile ? 1 : 0) + (editCategory.newBackgroundFile ? 1 : 0);
        if (!filesCount) return setProgress(100);
        const total = Object.values(imageProgress).reduce((a, b) => a + b, 0);
        setProgress(Math.round(total / filesCount));
      };

      if (editCategory.newCategoryImageFile) {
        uploads.push(
          uploadImage(editCategory.newCategoryImageFile, (p) => updateOverall("cat", p)).then((u) => (catURL = u))
        );
      }
      if (editCategory.newBackgroundFile) {
        uploads.push(
          uploadImage(editCategory.newBackgroundFile, (p) => updateOverall("bg", p)).then((u) => (bgURL = u))
        );
      }

      if (uploads.length) await Promise.all(uploads);
      setProgress(100);

      const data = {
        categoryName: (editCategory.categoryName || "").trim(),
        categoryImage: catURL,
        backGroundImage: bgURL,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(docRef, data);

      setCategories((prev) => prev.map((c) => (c.docId === editCategory.docId ? { ...c, ...data } : c)));
      setFilteredCategories((prev) => prev.map((c) => (c.docId === editCategory.docId ? { ...c, ...data } : c)));

      setEditCategory(null);
      alert("Category updated successfully!");
    } catch (err) {
      console.error("❌ Error updating category:", err);
      alert(err?.message || "Failed to update category. See console for details.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // 🗑️ Delete
  const handleDelete = async () => {
    try {
      const dRef = doc(db, "category", deleteCategory.docId);
      await deleteDoc(dRef);
      setCategories((prev) => prev.filter((c) => c.docId !== deleteCategory.docId));
      setFilteredCategories((prev) => prev.filter((c) => c.docId !== deleteCategory.docId));
      setDeleteCategory(null);
    } catch (err) {
      console.error("❌ Error deleting category:", err);
      alert(err?.message || "Delete failed. See console for details.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <FixedHeader onSearchChange={setSearchTerm} />


      <div className="container-fluid p-4" style={{ paddingTop: "90px" }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold text-primary">Category Management</h2>
         
        </div>
<div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">

  {/* 🔍 Filter */}
  <div className="dropdown">
    <button
      className="btn btn-outline-primary rounded-pill px-4 py-2 d-flex align-items-center gap-2 shadow-sm"
      type="button"
      data-bs-toggle="dropdown"
      aria-expanded="false"
    >
      <i className="bi bi-funnel-fill fs-6"></i>

      <span className="fw-semibold">
        {selectedCategory === "ALL"
          ? "All Categories"
          : categories.find((c) => c.docId === selectedCategory)
              ?.categoryName || "Category"}
      </span>

      <i className="bi bi-chevron-down small opacity-75"></i>
    </button>

    <ul className="dropdown-menu shadow-lg rounded-4 dropdown-menu-start mt-2">
      <li>
        <button
          className={`dropdown-item d-flex justify-content-between align-items-center ${
            selectedCategory === "ALL" ? "active fw-semibold" : ""
          }`}
          onClick={() => setSelectedCategory("ALL")}
        >
          All Categories
          {selectedCategory === "ALL" && <i className="bi bi-check2"></i>}
        </button>
      </li>

      <li><hr className="dropdown-divider" /></li>

      {categories.map((cat) => (
        <li key={cat.docId}>
          <button
            className={`dropdown-item d-flex justify-content-between align-items-center ${
              selectedCategory === cat.docId ? "active fw-semibold" : ""
            }`}
            onClick={() => setSelectedCategory(cat.docId)}
          >
            {cat.categoryName}
            {selectedCategory === cat.docId && <i className="bi bi-check2"></i>}
          </button>
        </li>
      ))}
    </ul>
  </div>

  {/* ➕ Add Category */}
  <button
    className="btn btn-gradient-primary rounded-pill px-4 py-2 shadow d-flex align-items-center gap-2"
    onClick={() => setShowAddModal(true)}
  >
    <i className="bi bi-plus-lg"></i>
    <span className="fw-semibold">Add Category</span>
  </button>

</div>


        <div className="card border-0 shadow-lg rounded-4 mt-4">
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Image</th>
                  <th>Background</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center p-4">Loading...</td>
                  </tr>
                ) : filteredCategories.length ? (
                  (filteredCategories.filter((cat) =>
  selectedCategory === "ALL" ? true : cat.docId === selectedCategory
)).map((cat) => (

                    <tr key={cat.docId}>
                      <td className="text-muted small">{cat.docId?.substring(0, 8)}...</td>
                      <td className="fw-bold">{cat.categoryName}</td>
                      <td>
                        {cat.categoryImage ? (
                          <img
                            src={cat.categoryImage}
                            alt="Category"
                            className="rounded shadow-sm"
                            style={{ width: 60, height: 60, objectFit: "cover" }}
                          />
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td>
                        {cat.backGroundImage ? (
                          <img
                            src={cat.backGroundImage}
                            alt="Background"
                            className="rounded shadow-sm"
                            style={{ width: 60, height: 60, objectFit: "cover" }}
                          />
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => setViewCategory(cat)}
                        >
                          👁️
                        </button>
                        <button
                          className="btn btn-sm btn-outline-info me-1"
                          onClick={() =>
                            setEditCategory({
                              ...cat,
                              newCategoryImageFile: null,
                              newBackgroundFile: null,
                            })
                          }
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteCategory(cat)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center p-4 text-muted">
                      No categories found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 🔄 Progress Bar */}
      {uploading && progress > 0 && progress < 100 && (
        <div className="fixed-bottom mb-3 w-50 mx-auto bg-light p-2 rounded shadow text-center">
          <div className="progress" style={{ height: 8 }}>
            <div
              className="progress-bar progress-bar-striped progress-bar-animated bg-success"
              style={{ width: `${progress}%` }}
            />
          </div>
          <small>{progress}% Uploading...</small>
        </div>
      )}

      {/* ➕ Add Modal */}
      {showAddModal && (
        <ModalWrapper title="Add New Category" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddSubmit}>
            <CategoryForm
              category={newCategory}
              setCategory={setNewCategory}
              uploading={uploading}
              isAddMode
            />
            <div className="text-end mt-3">
              <button
                type="button"
                className="btn btn-secondary me-2"
                onClick={() => setShowAddModal(false)}
                disabled={uploading}
              >
                Cancel
              </button>
              <button className="btn btn-primary" type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Add Category"}
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* ✏️ Edit Modal */}
      {editCategory && (
        <ModalWrapper title="Edit Category" onClose={() => setEditCategory(null)}>
          <form onSubmit={handleEditSubmit}>
            <CategoryForm
              category={editCategory}
              setCategory={setEditCategory}
              uploading={uploading}
              isAddMode={false}
            />
            <div className="text-end mt-3">
              <button
                type="button"
                className="btn btn-secondary me-2"
                onClick={() => setEditCategory(null)}
                disabled={uploading}
              >
                Cancel
              </button>
              <button className="btn btn-success" type="submit" disabled={uploading}>
                {uploading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* 👁️ View Modal */}
      {viewCategory && (
        <ModalWrapper title="Category Details" onClose={() => setViewCategory(null)}>
          <div className="text-center">
            <h4 className="fw-bold mb-3 text-primary">{viewCategory.categoryName}</h4>
            <div className="p-3 border rounded-3 bg-light mb-3">
              <small className="text-muted">ID:</small>
              <div className="fw-semibold text-primary">{viewCategory.docId}</div>
            </div>
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              {viewCategory.categoryImage && (
                <img
                  src={viewCategory.categoryImage}
                  alt="Category"
                  className="rounded shadow-sm"
                  style={{ maxHeight: 150, cursor: "pointer" }}
                  onClick={() => window.open(viewCategory.categoryImage, "_blank")}
                />
              )}
              {viewCategory.backGroundImage && (
                <img
                  src={viewCategory.backGroundImage}
                  alt="Background"
                  className="rounded shadow-sm"
                  style={{ maxHeight: 150, cursor: "pointer" }}
                  onClick={() => window.open(viewCategory.backGroundImage, "_blank")}
                />
              )}
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* 🗑️ Delete Modal */}
      {deleteCategory && (
        <ModalWrapper title="Confirm Delete" onClose={() => setDeleteCategory(null)}>
          <div className="text-center">
            Are you sure you want to delete <strong>{deleteCategory.categoryName}</strong>?
          </div>
          <div className="text-center mt-3">
            <button className="btn btn-secondary me-2" onClick={() => setDeleteCategory(null)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </ModalWrapper>
      )}

      <style>{`
        .btn-gradient-primary { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; }
        .btn-gradient-primary:hover { background: linear-gradient(135deg, #6366f1, #4f46e5); }
      `}</style>
    </div>
  );
};

// 🧩 Modal Wrapper
const ModalWrapper = ({ title, onClose, children }) => (
  <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content rounded-4 shadow-lg">
        <div className="modal-header">
          <h5 className="modal-title fw-bold">{title}</h5>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  </div>
);

// 🧩 Category Form
const CategoryForm = ({ category, setCategory, uploading, isAddMode }) => (
  <>
    <div className="mb-3">
      <label className="form-label">Category Name</label>
      <input
        type="text"
        className="form-control"
        value={category.categoryName || ""}
        onChange={(e) => setCategory({ ...category, categoryName: e.target.value })}
        required
      />
    </div>

    {/* Category Image */}
    <div className="mb-3">
      <label className="form-label">
        Category Image {category.categoryImage ? "(Current Image Set)" : ""}
      </label>
      <input
        type="file"
        className="form-control mb-2"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          const fileKey = isAddMode ? "categoryImageFile" : "newCategoryImageFile";
          setCategory({ ...category, [fileKey]: file });
        }}
        disabled={uploading}
      />
      <input
        type="url"
        placeholder="Or enter image URL"
        className="form-control"
        value={category.categoryImage || ""}
        onChange={(e) => setCategory({ ...category, categoryImage: e.target.value })}
        disabled={!!category.newCategoryImageFile || uploading}
      />
    </div>

    {/* Background Image */}
    <div className="mb-3">
      <label className="form-label">
        Background Image {category.backGroundImage ? "(Current Image Set)" : ""}
      </label>
      <input
        type="file"
        className="form-control mb-2"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          const fileKey = isAddMode ? "backGroundImageFile" : "newBackgroundFile";
          setCategory({ ...category, [fileKey]: file });
        }}
        disabled={uploading}
      />
      <input
        type="url"
        placeholder="Or enter background image URL"
        className="form-control"
        value={category.backGroundImage || ""}
        onChange={(e) => setCategory({ ...category, backGroundImage: e.target.value })}
        disabled={!!category.newBackgroundFile || uploading}
      />
    </div>

    {uploading && <div className="text-info small">Uploading...</div>}
  </>
);

export default CategoryList;
