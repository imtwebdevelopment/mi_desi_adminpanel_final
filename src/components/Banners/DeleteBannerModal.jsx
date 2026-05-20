import React from "react";

const DeleteBannerModal = ({ deleteBanner, setDeleteBanner, handleDelete, loading }) => (
  <div className="modal show fade d-block" tabIndex="-1" style={{ background: "#00000080" }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content border-0 shadow-lg rounded-4">
        <div className="modal-header">
          <h5 className="modal-title text-danger">Confirm Delete</h5>
          <button type="button" className="btn-close" onClick={() => setDeleteBanner(null)}></button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to delete this banner?</p>
          <p className="text-muted small">Product ID: {deleteBanner.productId}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setDeleteBanner(null)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default DeleteBannerModal;
