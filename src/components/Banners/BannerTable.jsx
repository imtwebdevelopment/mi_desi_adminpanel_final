import React from "react";

const BannerTable = ({ filteredBanners, openViewModal, openEditModal, openDeleteModal, loading }) => (
  <div className="card shadow-lg border-0 rounded-4">
    <div className="table-responsive">
      <table className="table align-middle mb-0 table-hover">
        <thead className="table-light">
          <tr>
            <th>ID</th>
            <th>Banner Image</th>
            <th>Product ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredBanners.length > 0 ? (
            filteredBanners.map((banner) => (
              <tr key={banner.id}>
                <td>{banner.id.substring(0, 8)}...</td>
                <td>
                  {banner.imageUrl && (
                    <img
                      src={banner.imageUrl}
                      alt="banner"
                      width="100"
                      height="60"
                      className="rounded shadow-sm"
                      style={{ objectFit: "cover" }}
                    />
                  )}
                </td>
                <td>{banner.productId}</td>
                <td>
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => openViewModal(banner)}
                    disabled={loading}
                  >
                    View
                  </button>
                  <button
                    className="btn btn-sm btn-outline-info me-2"
                    onClick={() => openEditModal(banner)}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => openDeleteModal(banner)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="text-center py-4 text-muted">
                No banners found...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default BannerTable;
