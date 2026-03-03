import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import FixedHeader from "../FixedHeader";
import {
  db,
  collection,
  onSnapshot,
  deleteDoc,
  doc,
} from "../../firebase";
import AddBannerModal from "./AddBannerModal";
import EditBannerModal from "./EditBannerModal";
import ViewBannerModal from "./ViewBannerModal";
import DeleteBannerModal from "./DeleteBannerModal";
import BannerTable from "./BannerTable";

const BannerList = () => {
  const [banners, setBanners] = useState([]);
  const [filteredBanners, setFilteredBanners] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editBanner, setEditBanner] = useState(null);
  const [viewBanner, setViewBanner] = useState(null);
  const [deleteBanner, setDeleteBanner] = useState(null);

  // 🔹 Fetch all banners in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "banners"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBanners(data);
      setFilteredBanners(data);
    });
    return () => unsub();
  }, []);

  // 🔹 Search filter
  useEffect(() => {
    if (!searchTerm.trim()) setFilteredBanners(banners);
    else {
      const filtered = banners.filter(
        (b) =>
          b.productId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBanners(filtered);
    }
  }, [searchTerm, banners]);

  // 🔹 Delete banner
  const handleDelete = async () => {
    if (!deleteBanner) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, "banners", deleteBanner.id));
      setDeleteBanner(null);
    } catch (err) {
      console.error(err);
      alert("Error deleting banner!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6fa" }}>
      <FixedHeader onSearchChange={setSearchTerm} />

      <div className="container-fluid p-4" style={{ paddingTop: "90px" }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold text-primary">Banner Management</h2>
          <button
            className="btn btn-primary px-4 shadow-sm rounded-pill"
            onClick={() => setShowAddModal(true)}
            disabled={loading}
          >
            + Add Banner
          </button>
        </div>

        <BannerTable
          filteredBanners={filteredBanners}
          openViewModal={setViewBanner}
          openEditModal={setEditBanner}
          openDeleteModal={setDeleteBanner}
          loading={loading}
        />
      </div>

      {/* 🔹 Modals */}
      {showAddModal && (
        <AddBannerModal setShowAddModal={setShowAddModal} setLoading={setLoading} />
      )}
      {editBanner && (
        <EditBannerModal editBanner={editBanner} setEditBanner={setEditBanner} />
      )}
      {viewBanner && (
        <ViewBannerModal viewBanner={viewBanner} setViewBanner={setViewBanner} />
      )}
      {deleteBanner && (
        <DeleteBannerModal
          deleteBanner={deleteBanner}
          setDeleteBanner={setDeleteBanner}
          handleDelete={handleDelete}
          loading={loading}
        />
      )}
    </div>
  );
};

export default BannerList;
