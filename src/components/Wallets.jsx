import React, { useState, useEffect } from "react";
import FixedHeader from "./FixedHeader";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  db,
  collection,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
} from "../firebase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const WalletList = () => {
  const [wallets, setWallets] = useState([]);
  const [filteredWallets, setFilteredWallets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editWallet, setEditWallet] = useState(null);
  const [viewWallet, setViewWallet] = useState(null);

  // ✅ Fetch all wallets and corresponding customer names
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "wallets"),
      async (snapshot) => {
        setLoading(true);

        // Step 1️⃣: Extract all wallet docs
        const walletData = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          balance: Number(d.data().balance) || 0,
        }));

        // Step 2️⃣: Fetch customer names in parallel
        const walletDataWithNames = await Promise.all(
          walletData.map(async (wallet) => {
            if (wallet.uid) {
              try {
                const customerRef = doc(db, "customers", wallet.uid);
                const customerSnap = await getDoc(customerRef);

                if (customerSnap.exists()) {
                  wallet.customerName = customerSnap.data().name || "N/A";
                } else {
                  wallet.customerName = "Unknown";
                }
              } catch (err) {
                console.error("Error fetching customer:", err);
                wallet.customerName = "Error";
              }
            } else {
              wallet.customerName = "No UID";
            }
            return wallet;
          })
        );

        // Step 3️⃣: Update state
        setWallets(walletDataWithNames);
        setFilteredWallets(walletDataWithNames);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching wallets:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ✅ Search Functionality
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredWallets(wallets);
      return;
    }
    const term = searchTerm.toLowerCase();
    const filtered = wallets.filter(
      (w) =>
        (w.uid && w.uid.toLowerCase().includes(term)) ||
        (w.id && w.id.toLowerCase().includes(term)) ||
        (w.customerName && w.customerName.toLowerCase().includes(term))
    );
    setFilteredWallets(filtered);
  }, [searchTerm, wallets]);

  // ✅ Edit Wallet Balance
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editWallet || isNaN(editWallet.balance)) return;

    try {
      setLoading(true);
      const walletRef = doc(db, "wallets", editWallet.id);
      await updateDoc(walletRef, {
        balance: Number(editWallet.balance),
      });
      setEditWallet(null);
    } catch (err) {
      console.error("Error updating wallet:", err);
      alert("Failed to update wallet balance. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Export Wallet Data to Excel
  const exportToExcel = () => {
    if (filteredWallets.length === 0) {
      alert("No data available to export!");
      return;
    }

    const exportData = filteredWallets.map((wallet) => ({
      "Document ID": wallet.id,
      UID: wallet.uid || "N/A",
      "Customer Name": wallet.customerName || "N/A",
      "Balance (₹)": wallet.balance.toFixed(2),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Wallets");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    saveAs(
      blob,
      `Wallet_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      <FixedHeader onSearchChange={setSearchTerm} />

      <div className="container-fluid p-4" style={{ paddingTop: "90px" }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold text-primary">Wallet Management</h2>
          <button className="btn btn-success" onClick={exportToExcel}>
            📊 Export to Excel
          </button>
        </div>

        {loading && (
          <div className="alert alert-info text-center">Loading wallets...</div>
        )}

        {/* ✅ Wallets Table */}
        <div className="card shadow-sm border-0 rounded-4">
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Document ID</th>
                  <th>UID</th>
                  <th>Customer Name</th>
                  <th>Balance (₹)</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWallets.length > 0 ? (
                  filteredWallets.map((wallet) => (
                    <tr key={wallet.id} className="align-middle hover-shadow">
                      <td>{wallet.id.slice(0, 8)}...</td>
                      <td>{wallet.uid || "N/A"}</td>
                      <td>{wallet.customerName || "N/A"}</td>
                      <td className="fw-semibold text-success">
                        ₹{wallet.balance.toFixed(2)}
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => setViewWallet(wallet)}
                        >
                          👁️
                        </button>
                        <button
                          className="btn btn-sm btn-outline-info"
                          onClick={() => setEditWallet(wallet)}
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-muted">
                      {searchTerm
                        ? `No wallets found matching "${searchTerm}"`
                        : "No wallets found in Firestore."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ✅ Edit Wallet Modal */}
      {editWallet && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content shadow rounded-4">
              <form onSubmit={handleEditSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">Edit Wallet Balance</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setEditWallet(null)}
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="text-muted small mb-3">
                    Updating balance for wallet ID:{" "}
                    <code>{editWallet.id.slice(0, 8)}...</code>
                  </p>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editWallet.customerName || "N/A"}
                      disabled
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Balance (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editWallet.balance}
                      onChange={(e) =>
                        setEditWallet({
                          ...editWallet,
                          balance: parseFloat(e.target.value),
                        })
                      }
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditWallet(null)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ✅ View Wallet Modal */}
      {viewWallet && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content shadow rounded-4">
              <div className="modal-header">
                <h5 className="modal-title">Wallet Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewWallet(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  <strong>Document ID:</strong> {viewWallet.id}
                </p>
                <p>
                  <strong>UID:</strong> {viewWallet.uid || "N/A"}
                </p>
                <p>
                  <strong>Customer Name:</strong>{" "}
                  {viewWallet.customerName || "N/A"}
                </p>
                <p>
                  <strong>Balance:</strong> ₹{viewWallet.balance.toFixed(2)}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setViewWallet(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-shadow:hover {
          box-shadow: 0 6px 16px rgba(0,0,0,0.12);
          transition: all 0.25s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default WalletList;
