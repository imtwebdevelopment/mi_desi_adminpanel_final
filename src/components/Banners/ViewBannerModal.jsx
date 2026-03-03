import React from "react";

const ViewBannerModal = ({ viewBanner, setViewBanner }) => (
  <div className="modal show fade d-block" tabIndex="-1" style={{ background: "#00000080" }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content border-0 shadow-lg rounded-4">
        <div className="modal-header">
          <h5 className="modal-title">Banner Details</h5>
          <button type="button" className="btn-close" onClick={() => setViewBanner(null)}></button>
        </div>
        <div className="modal-body text-center">
          <img
            src={viewBanner.imageUrl}
            alt="banner"
            className="img-fluid rounded mb-3"
            style={{ maxHeight: "250px", objectFit: "cover" }}
          />
          <p><strong>ID:</strong> {viewBanner.id}</p>
          <p><strong>Product ID:</strong> {viewBanner.productId}</p>
        </div>
      </div>
    </div>
  </div>
);

export default ViewBannerModal;
