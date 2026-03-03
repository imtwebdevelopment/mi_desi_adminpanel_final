// src/components/CustomerDetails/WalletTransactionDetailsFetcher.jsx

import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const WalletTransactionDetailsFetcher = ({ customerId, transactionId }) => {
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  // ----------------------------------------------------------
  // 🔹 Fetch transaction details
  // ----------------------------------------------------------
  useEffect(() => {
    const fetchTransactionDetails = async () => {
      setLoading(true);
      try {
        const docRef = doc(
          db,
          "customers",
          customerId,
          "walletTransactions",
          transactionId
        );
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setTransaction(data);
          setNewStatus(data.status || "Pending");
        } else {
          setError("Transaction not found.");
        }
      } catch (err) {
        console.error("Error fetching transaction:", err);
        setError("Failed to fetch transaction details.");
      } finally {
        setLoading(false);
      }
    };

    if (customerId && transactionId) fetchTransactionDetails();
  }, [customerId, transactionId]);

  // ----------------------------------------------------------
  // 💰 Update wallet when status changes to Success
  // ----------------------------------------------------------
  const updateWalletBalance = async (uid, amountChange) => {
    try {
      const walletRef = doc(db, "wallets", uid);
      const walletSnap = await getDoc(walletRef);

      if (walletSnap.exists()) {
        const currentBalance = Number(walletSnap.data().balance || 0);
        const updatedBalance = currentBalance + amountChange;

        await updateDoc(walletRef, {
          balance: updatedBalance,
        });

        console.log(`✅ Wallet updated: ₹${amountChange} added.`);
      } else {
        console.warn("⚠️ Wallet not found for user:", uid);
      }
    } catch (err) {
      console.error("Error updating wallet balance:", err);
    }
  };

  // ----------------------------------------------------------
  // ✏️ Handle status update and balance sync
  // ----------------------------------------------------------
  const handleUpdateStatus = async () => {
    if (!transaction) return;

    try {
      const transRef = doc(
        db,
        "customers",
        customerId,
        "walletTransactions",
        transactionId
      );

      // Fetch old data before updating
      const oldStatus = transaction.status;
      const amount = Number(transaction.amount || 0);
      const uid = transaction.userId || customerId;

      // 1️⃣ Update transaction status
      await updateDoc(transRef, { status: newStatus });
      console.log(`✅ Transaction updated: ${oldStatus} → ${newStatus}`);

      // 2️⃣ Adjust wallet balance only if status changes
      if (oldStatus !== newStatus) {
        if (newStatus === "Success" && oldStatus !== "Success") {
          await updateWalletBalance(uid, amount); // add money
        } else if (oldStatus === "Success" && newStatus !== "Success") {
          await updateWalletBalance(uid, -amount); // remove money
        }
      }

      // 3️⃣ Update local state
      setTransaction((prev) => ({ ...prev, status: newStatus }));
      setEditMode(false);
      alert("✅ Status updated and wallet synced!");
    } catch (error) {
      console.error("Error updating status:", error);
      alert("❌ Failed to update status.");
    }
  };

  // ----------------------------------------------------------
  // 🎨 Render data
  // ----------------------------------------------------------
  const renderData = (data) => (
    <div className="row small">
      <div className="col-md-6 mb-3">
        <strong>Transaction ID:</strong>
        <span className="text-primary ms-2">{data.transactionId || "N/A"}</span>
      </div>

      <div className="col-md-6 mb-3">
        <strong>User ID:</strong>
        <span className="text-secondary ms-2">{data.userId || "N/A"}</span>
      </div>

      <div className="col-md-6 mb-3">
        <strong>Amount:</strong>
        <span className="fw-bold text-success ms-2">
          ₹{data.amount?.toFixed(2) || "0.00"}
        </span>
      </div>

      <div className="col-md-6 mb-3">
        <strong>Status:</strong>
        {editMode ? (
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="form-select form-select-sm ms-2 d-inline w-auto"
          >
            <option value="Pending">Pending</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>
        ) : (
          <span
            className={`badge ms-2 ${
              data.status === "Success"
                ? "bg-success"
                : data.status === "Failed"
                ? "bg-danger"
                : "bg-warning text-dark"
            }`}
          >
            {data.status || "Pending"}
          </span>
        )}
      </div>

      <div className="col-md-6 mb-3">
        <strong>Transaction Date:</strong>
        <span className="text-secondary ms-2">
          {data.transactionDate?.toDate
            ? data.transactionDate.toDate().toLocaleString()
            : "N/A"}
        </span>
      </div>

      <div className="col-md-6 mb-3">
        <strong>Record ID:</strong>
        <span className="text-secondary ms-2">{data.id || "N/A"}</span>
      </div>
    </div>
  );

  if (loading)
    return (
      <div className="card shadow-sm p-4 text-center bg-light">
        <div className="spinner-border spinner-border-sm text-primary"></div>
        <small className="ms-2 text-primary">Loading transaction...</small>
      </div>
    );

  if (error) return <div className="alert alert-warning">{error}</div>;
  if (!transaction) return null;

  return (
    <div className="card shadow-sm border-0 rounded-3">
      <div
        className={`card-header d-flex justify-content-between align-items-center fw-bold text-white p-3 ${
          transaction.status === "Success"
            ? "bg-success"
            : transaction.status === "Failed"
            ? "bg-danger"
            : "bg-warning text-dark"
        }`}
      >
        <span>Transaction #{transaction.id.substring(0, 10)}...</span>
        {!editMode ? (
          <button
            className="btn btn-sm btn-light text-dark"
            onClick={() => setEditMode(true)}
          >
            ✏️ Edit
          </button>
        ) : (
          <div>
            <button
              className="btn btn-sm btn-success me-2"
              onClick={handleUpdateStatus}
            >
              💾 Save
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setNewStatus(transaction.status);
                setEditMode(false);
              }}
            >
              ❌ Cancel
            </button>
          </div>
        )}
      </div>

      <div className="card-body bg-light">{renderData(transaction)}</div>
    </div>
  );
};

export default WalletTransactionDetailsFetcher;
