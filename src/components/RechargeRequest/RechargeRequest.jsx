import React, { useEffect, useState, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import * as XLSX from "xlsx";
import { db } from "../../firebase";
import FixedHeader from "../FixedHeader";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

const RechargeRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pending"); 
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  /* =========================
    FETCH PARTNERS
  ========================= */
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const snap = await getDocs(collection(db, "partners"));
        const list = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.data().partnerName || "Unnamed Partner",
        }));
        setPartners(list);
      } catch (err) {
        console.error("Error fetching partners:", err);
      }
    };

    fetchPartners();
  }, []);

  /* =========================
    FETCH RECHARGE REQUESTS
  ========================= */
  const fetchRechargeRequests = useCallback(async () => {
    setLoading(true);
    try {
      const customersSnap = await getDocs(collection(db, "customers"));

      const customerLookup = {};
      customersSnap.docs.forEach((d) => {
        const data = d.data();
        customerLookup[d.id] = {
          name: data.name || data.fullName || "Unnamed",
          referredBy: data.referredBy || "Direct",
        };
      });

      const allReqPromises = customersSnap.docs.map(async (customerDoc) => {
        const userId = customerDoc.id;
        const reqSnap = await getDocs(
          collection(db, `customers/${userId}/rechargeRequest`)
        );

        return reqSnap.docs.map((reqDoc) => {
          const data = reqDoc.data();
          return {
            id: reqDoc.id,
            userId,
            userName: customerLookup[userId]?.name || "Unknown",
            referredBy: customerLookup[userId]?.referredBy || "Direct",
            partnerId: data.partnerId || "",
            partnerName: data.partnerName || "",
            displayUtr: data.transactionId || data.utrId || "N/A",
            rechargeProvider: data.plan?.rechargeProvider || "N/A",
            ...data,
          };
        });
      });

      const nested = await Promise.all(allReqPromises);
      const allRequests = nested.flat();

      const sorted = allRequests.sort((a, b) => {
        const d1 = a.requestedDate?.toDate?.() || 0;
        const d2 = b.requestedDate?.toDate?.() || 0;
        return d2 - d1;
      });

      setRequests(sorted);
    } catch (error) {
      console.error("🔥 Error fetching recharge requests:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRechargeRequests();
  }, [fetchRechargeRequests]);

  /* =========================
    FILTER LOGIC
  ========================= */
  const filteredRequests = requests.filter((r) => {
    const term = searchTerm.toLowerCase();
    const searchMatch =
      r.userName?.toLowerCase().includes(term) ||
      r.userId?.toLowerCase().includes(term) ||
      r.partnerName?.toLowerCase().includes(term) ||
      r.displayUtr?.toLowerCase().includes(term) ||
      r.plan?.rechargeProvider?.toLowerCase().includes(term);

    if (!searchMatch) return false;

    if (statusFilter !== "All") {
      const currentStatus = r.rechargeStatus || "Pending";
      if (currentStatus !== statusFilter) return false;
    }

    if (!r.requestedDate?.toDate) return true;
    const reqDate = r.requestedDate.toDate();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    if (from && reqDate < from) return false;
    if (to) {
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      if (reqDate > endOfDay) return false;
    }

    return true;
  });

  /* =========================
    STATUS UPDATE
  ========================= */
  const handleStatusChange = async (userId, requestId, newStatus) => {
    if (newStatus === "Rejected") {
      setRejectModal({ userId, requestId });
      return;
    }

    try {
      setUpdatingId(requestId);
      const requestRef = doc(
        db,
        `customers/${userId}/rechargeRequest`,
        requestId
      );

      await updateDoc(requestRef, {
        rechargeStatus: newStatus,
        rejectedReason: "",
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId && r.userId === userId
            ? { ...r, rechargeStatus: newStatus, rejectedReason: "" }
            : r
        )
      );
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  /* =========================
    EXCEL EXPORT
  ========================= */
  const handleDownloadExcel = () => {
    const excelData = filteredRequests.map((r) => ({
      "User Name": r.userName,
      "User ID": r.userId,
      "Referred By": r.referredBy,
      "UTR ID": r.displayUtr,
      "Mobile": r.number || "N/A",
      "Plan Price": r.plan?.price || "N/A",
      "Status": r.rechargeStatus || "Pending",
      "Rejected Reason": r.rejectedReason || "N/A",
      "Date": r.requestedDate?.toDate
        ? r.requestedDate.toDate().toLocaleString()
        : "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Recharge Report");
    XLSX.writeFile(workbook, "Recharge_Requests.xlsx");
  };

  const confirmReject = async () => {
  if (!rejectReason.trim()) {
    alert("Please enter rejection reason");
    return;
  }

  try {
    setUpdatingId(rejectModal.requestId);

    const requestRef = doc(
      db,
      `customers/${rejectModal.userId}/rechargeRequest`,
      rejectModal.requestId
    );

    await updateDoc(requestRef, {
      rechargeStatus: "Rejected",
      rejectedReason: rejectReason,
    });

    setRequests((prev) =>
      prev.map((r) =>
        r.id === rejectModal.requestId && r.userId === rejectModal.userId
          ? {
              ...r,
              rechargeStatus: "Rejected",
              rejectedReason: rejectReason,
            }
          : r
      )
    );

    setRejectModal(null);
    setRejectReason("");

  } catch (err) {
    console.error(err);
    alert("Failed to reject request");
  } finally {
    setUpdatingId(null);
  }
};

  // Status color mapping
  const getStatusColor = (status) => {
    switch(status) {
      case "Pending": return "#ffc107"; // Yellow
      case "Success": return "#198754"; // Green
      case "Rejected": return "#dc3545"; // Red
      default: return "#6c757d"; // Gray
    }
  };

  const getStatusBackgroundColor = (status) => {
    switch(status) {
      case "Pending": return "#fff3cd"; // Light Yellow
      case "Success": return "#d1e7dd"; // Light Green
      case "Rejected": return "#f8d7da"; // Light Red
      default: return "white";
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case "Success": return "bg-success";
      case "Rejected": return "bg-danger";
      case "Pending": return "bg-warning";
      default: return "bg-secondary";
    }
  };

  const getStatusTextClass = (status) => {
    switch(status) {
      case "Success": return "text-success";
      case "Rejected": return "text-danger";
      case "Pending": return "text-warning";
      default: return "text-muted";
    }
  };

  return (
    <div style={{ backgroundColor: "#f4f7f6", minHeight: "100vh" }}>
      <div className="mt-1">
        <FixedHeader onSearchChange={handleSearchChange} />

        <div className="bg-white border rounded-3 shadow-sm p-3 mb-4">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-3">
              <h4 className="fw-bold text-primary mb-0">Recharge Management</h4>
            </div>

            {/* STATUS FILTER DROPDOWN - NO ICONS */}
            <div className="col-12 col-md-2">
              <label className="small text-muted fw-bold">Filter Status</label>
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  borderLeft: `4px solid ${
                    statusFilter === "All" ? "#6c757d" : 
                    statusFilter === "Pending" ? "#ffc107" :
                    statusFilter === "Success" ? "#198754" : "#dc3545"
                  }`,
                  backgroundColor: getStatusBackgroundColor(statusFilter),
                  fontWeight: "bold"
                }}
              >
                <option value="All">All Requests</option>
                <option value="Pending" style={{color: "#ffc107", fontWeight: "bold", backgroundColor: "#fff3cd"}}>Pending</option>
                <option value="Success" style={{color: "#198754", fontWeight: "bold", backgroundColor: "#d1e7dd"}}>Success</option>
                <option value="Rejected" style={{color: "#dc3545", fontWeight: "bold", backgroundColor: "#f8d7da"}}>Rejected</option>
              </select>
            </div>

            <div className="col-12 col-md-4">
              <div className="row g-2">
                <div className="col-6">
                  <label className="small text-muted">From</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="small text-muted">To</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="col-12 col-md-3 text-md-end">
              <button
                onClick={handleDownloadExcel}
                className="btn btn-success w-100 w-md-auto rounded-pill"
              >
                📥 Export Excel
              </button>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
          <div className="table-responsive" style={{ maxHeight: "70vh" }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light d-none d-md-table-header-group">
                <tr className="small text-uppercase text-muted">
                  <th className="ps-4">User Details</th>
                  <th>UTR / Trans ID</th>
                  <th>Mobile</th>
                  <th>Amount</th>
                  <th>Company</th>
                  <th>Status Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status" />
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      No {statusFilter !== "All" ? statusFilter : ""} records found.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={`${r.userId}-${r.id}`}>
                      {/* Desktop */}
                      <td className="ps-4 d-none d-md-table-cell">
                        <div className="fw-bold">{r.userName}</div>
                        <div className="text-muted small">ID: {r.userId}</div>
                      </td>
                      <td className="d-none d-md-table-cell">
                        <code className="small bg-light px-2 py-1">{r.displayUtr}</code>
                      </td>
                      <td className="d-none d-md-table-cell">{r.number || "N/A"}</td>
                      <td className="d-none d-md-table-cell">₹{r.plan?.price || "—"}</td>
                      <td className="d-none d-md-table-cell">{r.plan?.rechargeProvider || "—"}</td>
                      <td className="d-none d-md-table-cell">
                        <select
                          className={`form-select form-select-sm fw-bold ${getStatusTextClass(r.rechargeStatus || "Pending")}`}
                          value={r.rechargeStatus || "Pending"}
                          onChange={(e) => handleStatusChange(r.userId, r.id, e.target.value)}
                          disabled={updatingId === r.id}
                          style={{
                            borderLeft: `4px solid ${getStatusColor(r.rechargeStatus || "Pending")}`,
                            backgroundColor: getStatusBackgroundColor(r.rechargeStatus || "Pending")
                          }}
                        >
                          <option value="Pending" style={{color: "#ffc107", backgroundColor: "#fff3cd"}}>Pending</option>
                          <option value="Success" style={{color: "#198754", backgroundColor: "#d1e7dd"}}>Success</option>
                          <option value="Rejected" style={{color: "#dc3545", backgroundColor: "#f8d7da"}}>Rejected</option>
                        </select>
                        {r.rechargeStatus === "Rejected" && r.rejectedReason && (
                          <div className="text-danger small mt-1">⚠ {r.rejectedReason}</div>
                        )}
                      </td>

                      {/* Mobile View */}
                      <td colSpan="6" className="d-md-none p-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="fw-bold">{r.userName}</div>
                          <span className={`badge ${getStatusBadgeClass(r.rechargeStatus || "Pending")} px-3 py-2`}>
                            {r.rechargeStatus || "Pending"}
                          </span>
                        </div>
                        <div className="small mt-2">
                          <div className="row">
                            <div className="col-6"><strong>Mobile:</strong> {r.number}</div>
                            <div className="col-6"><strong>Amount:</strong> ₹{r.plan?.price}</div>
                            <div className="col-12 mt-1"><strong>UTR:</strong> {r.displayUtr}</div>
                          </div>
                        </div>
                        <select
                          className="form-select form-select-sm mt-2"
                          value={r.rechargeStatus || "Pending"}
                          onChange={(e) => handleStatusChange(r.userId, r.id, e.target.value)}
                          style={{
                            borderLeft: `4px solid ${getStatusColor(r.rechargeStatus || "Pending")}`,
                            backgroundColor: getStatusBackgroundColor(r.rechargeStatus || "Pending")
                          }}
                        >
                          <option value="Pending" style={{color: "#ffc107", backgroundColor: "#fff3cd"}}>Pending</option>
                          <option value="Success" style={{color: "#198754", backgroundColor: "#d1e7dd"}}>Success</option>
                          <option value="Rejected" style={{color: "#dc3545", backgroundColor: "#f8d7da"}}>Rejected</option>
                        </select>
                        {r.rechargeStatus === "Rejected" && r.rejectedReason && (
                          <div className="text-danger small mt-2 p-2 bg-light rounded">
                            <strong>Reason:</strong> {r.rejectedReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Reject Recharge Request</h5>
                <button className="btn-close btn-close-white" onClick={() => setRejectModal(null)}></button>
              </div>
              <div className="modal-body">
                <label className="fw-bold mb-2">Reason for Rejection</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Invalid UTR, Payment not received, Duplicate request..."
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmReject}>Confirm Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RechargeRequestList;