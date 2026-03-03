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
      // 1. Fetch customers
      const customersSnap = await getDocs(collection(db, "customers"));

      // 2. Customer lookup
      const customerLookup = {};
      customersSnap.docs.forEach((d) => {
        const data = d.data();
        customerLookup[d.id] = {
          name: data.name || data.fullName || "Unnamed",
          referredBy: data.referredBy || "Direct",
        };
      });

      // 3. Fetch recharge requests for each customer
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
            rechargeProvider: data.plan?.rechargeProvider || "N/A", // ✅ explicit
            ...data,
          };
        });
      });

      const nested = await Promise.all(allReqPromises);
      const allRequests = nested.flat();

      // Sort by date (latest first)
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


  const filteredRequests = requests.filter((r) => {
    const term = searchTerm.toLowerCase();

    const searchMatch =
      r.userName?.toLowerCase().includes(term) ||
      r.userId?.toLowerCase().includes(term) ||
      r.partnerName?.toLowerCase().includes(term) ||
      r.displayUtr?.toLowerCase().includes(term) ||
      r.plan?.rechargeProvider?.toLowerCase().includes(term)// ✅ add this

    if (!searchMatch) return false;

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
    // If rejected → open modal
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
        rejectedReason: "", // clear if previously rejected
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
    PARTNER UPDATE
  ========================= */
  /* =========================
PARTNER UPDATE
========================= */
  const handlePartnerChange = async (r, partnerId) => {
    try {
      const partner = partners.find((p) => p.id === partnerId);
      const requestRef = doc(
        db,
        `customers/${r.userId}/rechargeRequest`,
        r.id
      );

      await updateDoc(requestRef, {
        partnerId,
        partnerName: partner?.name || "",
      });

      setRequests((prev) =>
        prev.map((req) =>
          req.id === r.id && req.userId === r.userId
            ? {
              ...req,
              partnerId,
              partnerName: partner?.name || "",
            }
            : req
        )
      );
    } catch (err) {
      console.error("Error updating partner:", err);
      alert("Failed to update partner");
    }
  };

  /* =========================
    EXCEL EXPORT
  ========================= */
  const handleDownloadExcel = () => {
    const excelData = filteredRequests.map((r) => ({
      "User Name": r.userName,
      "User ID": r.userId,
      "Referred By": r.referredBy,

      // ✅ FIXED Partner Name
      "Partner Name":
        r.partnerName && r.partnerName.trim() !== ""
          ? r.partnerName
          : "N/A",

      "UTR ID": r.displayUtr,
      "Mobile": r.number || "N/A",
      "Plan Price": r.plan?.price || "N/A",
      "Status": r.rechargeStatus || "Pending",
      "Rejected Reason": r.rejectedReason || "",
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

  /* =========================
    UI
  ========================= */
  return (
    <div style={{ backgroundColor: "#f4f7f6", minHeight: "100vh", }}>
      <div className="mt-1">
        <FixedHeader onSearchChange={handleSearchChange} />

        <div className="bg-white border rounded-3 shadow-sm p-3 mb-4">
          <div className="row g-3 align-items-end">

            {/* TITLE */}
            <div className="col-12 col-md-4">
              <h4 className="fw-bold text-primary mb-0">
                Recharge Management
              </h4>
            </div>

            {/* DATE FILTERS */}
            <div className="col-12 col-md-5">
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

            {/* EXPORT */}
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


        {/* Table */}
        <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
          <div className="table-responsive" style={{ maxHeight: "70vh" }}>

            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr className="small text-uppercase text-muted">
                  <th className="ps-4">User & Referrer</th>
                  <th>UTR</th>
                  <th>Mobile</th>
                  <th>Plan</th>
                  <th>Partner</th>
                  <th>Company</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      Loading...
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (

                    <tr key={`${r.userId}-${r.id}`}>
                      <td className="ps-4">
                        <div className="fw-bold">{r.userName}</div>

                        <div className="text-muted small d-md-block d-none">
                          ID: {r.userId} | Ref: {r.referredBy}
                        </div>

                        {/* MOBILE EXTRA INFO */}
                        <div className="d-md-none small text-muted">
                          <div>ID: {r.userId}</div>
                          <div>Ref: {r.referredBy}</div>
                        </div>
                      </td>


                      <td>
                        <code className="small bg-light px-2 py-1">
                          {r.displayUtr}
                        </code>
                      </td>

                      <td>{r.number || "N/A"}</td>
                      <td>₹{r.plan?.price || "—"}</td>

                      {/* Partner Dropdown */}
                      <td>
                        {r.rechargeStatus?.toLowerCase() === "pending"
                          ? "NA"
                          : r.triggeredByName || "NA"}
                      </td>
                      {r.plan?.rechargeProvider || "—"}


                      {/* Status */}
                      <td>
                        <select
                          className={`form-select form-select-sm fw-bold mt-1 ${r.rechargeStatus === "Success"
                            ? "text-success"
                            : r.rechargeStatus === "Rejected"
                              ? "text-danger"
                              : "text-warning"
                            }`}
                          value={r.rechargeStatus || "Pending"}
                          onChange={(e) =>
                            handleStatusChange(r.userId, r.id, e.target.value)
                          }
                          disabled={updatingId === r.id}
                        >

                          <option value="Pending">Pending</option>
                          <option value="Success">Success</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        {r.rechargeStatus === "Rejected" && r.rejectedReason && (
                          <div className="alert alert-danger py-1 px-2 mt-2 small">
                            ❌ {r.rejectedReason}
                          </div>
                        )}


                        {updatingId === r.id && (
                          <div className="text-muted small mt-1">
                            <span className="spinner-border spinner-border-sm me-1" />
                            Updating...
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
                {rejectModal && (
                  <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered modal-sm">

                      <div className="modal-content rounded-4">
                        <div className="modal-header">
                          <h5 className="modal-title text-danger fw-bold">
                            Reject Recharge
                          </h5>
                          <button
                            className="btn-close"
                            onClick={() => setRejectModal(null)}
                          />
                        </div>

                        <div className="modal-body">
                          <label className="fw-semibold mb-2">Rejection Reason</label>
                          <textarea
                            className="form-control"
                            rows="3"
                            placeholder="Enter reason..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                        </div>

                        <div className="modal-footer">
                          <button
                            className="btn btn-secondary"
                            onClick={() => setRejectModal(null)}
                          >
                            Cancel
                          </button>
                          <button className="btn btn-danger" onClick={confirmReject}>
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RechargeRequestList;