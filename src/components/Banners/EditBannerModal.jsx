import React, { useState } from "react";
import { db, doc, updateDoc } from "../../firebase";
import { storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const EditBannerModal = ({ editBanner, setEditBanner }) => {
  const [formData, setFormData] = useState({
    title: editBanner?.title || "",
    subtitle: editBanner?.subtitle || "",
    productId: editBanner?.productId || "",
    isActive: editBanner?.isActive ?? true,
  });

  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      let imageUrl = editBanner.imageUrl;

      // Upload new image if selected
      if (imageFile) {
        const imageRef = ref(
          storage,
          `banners/${editBanner.id}-${Date.now()}`
        );
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      await updateDoc(doc(db, "banners", editBanner.id), {
        ...formData,
        imageUrl,
        updatedAt: new Date(),
      });

      setEditBanner(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update banner");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal show fade d-block"
      tabIndex="-1"
      style={{ background: "#00000080" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-4">
          <div className="modal-header">
            <h5 className="modal-title">Edit Banner</h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => setEditBanner(null)}
            ></button>
          </div>

          <div className="modal-body">
            {/* Preview */}
            {editBanner.imageUrl && !imageFile && (
              <img
                src={editBanner.imageUrl}
                alt="banner"
                className="img-fluid rounded mb-3"
              />
            )}

            {imageFile && (
              <img
                src={URL.createObjectURL(imageFile)}
                alt="preview"
                className="img-fluid rounded mb-3"
              />
            )}

            <input
              type="file"
              className="form-control mb-3"
              accept="image/*"
              onChange={handleImageChange}
            />

            <input
              type="text"
              name="title"
              className="form-control mb-3"
              placeholder="Banner Title"
              value={formData.title}
              onChange={handleChange}
            />

            <input
              type="text"
              name="subtitle"
              className="form-control mb-3"
              placeholder="Banner Subtitle"
              value={formData.subtitle}
              onChange={handleChange}
            />

            <input
              type="text"
              name="productId"
              className="form-control mb-3"
              placeholder="Product ID"
              value={formData.productId}
              onChange={handleChange}
            />

            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
              <label className="form-check-label">Active</label>
            </div>
          </div>

          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setEditBanner(null)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn btn-info"
              onClick={handleUpdate}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Banner"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditBannerModal;
