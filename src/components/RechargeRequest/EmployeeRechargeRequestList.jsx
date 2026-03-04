import React, { useEffect, useState, useCallback, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import * as XLSX from "xlsx";
import { db } from "../../firebase";
import FixedHeader from "../FixedHeader";
import { useAuth } from "../Auth/authContext";
import { collection, getDocs, getDoc, doc, updateDoc } from "firebase/firestore";

const UnifiedRechargeRequestList = ({ role = "admin" }) => {
  const { user } = useAuth();
  const partnerId = role === "employee" ? user?.uid : null;

  const [requests, setRequests] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pending"); // Changed from "All" to "Pending"
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  /* ================= FETCH PARTNERS ================= */
  useEffect(() => {
    if (role !== "admin") return;

    const fetchPartners = async () => {
      const snap = await getDocs(collection(db, "partners"));
      const list = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name || "Unnamed Partner",
      }));
      setPartners(list);
    };

    fetchPartners();
  }, [role]);

  /* ================= FETCH REQUESTS ================= */
  const fetchRechargeRequests = useCallback(async () => {
    setLoading(true);
    try {
      const customersSnap = await getDocs(collection(db, "customers"));

      const customerLookup = {};
      customersSnap.docs.forEach((d) => {
        const data = d.data();
        customerLookup[d.id] = {
          name: data.name || "Unnamed",
          referredBy: data.referredBy || "Direct",
        };
      });

      const allReqPromises = customersSnap.docs.map(async (customerDoc) => {
        const userId = customerDoc.id;

        const reqSnap = await getDocs(
          collection(db, `customers/${userId}/rechargeRequest`)
        );

        return reqSnap.docs
          .map((reqDoc) => {
            const data = reqDoc.data();

            if (role === "employee") {
              const isPending =
                (data.rechargeStatus || "").toLowerCase() === "pending";

              const isMine = data.triggeredByUid === user?.uid;

              if (!isPending && !isMine) return null;
            }

            return {
              id: reqDoc.id,
              userId,
              userName: customerLookup[userId]?.name || "Unknown",
              referredBy: customerLookup[userId]?.referredBy || "Direct",
              displayUtr: data.transactionId || data.utrId || "N/A",
              rechargeProvider: data.plan?.rechargeProvider || "N/A",
              ...data,
            };
          })
          .filter(Boolean);
      });

      const nested = await Promise.all(allReqPromises);
      const allRequests = nested.flat();

      const sorted = allRequests.sort((a, b) => {
        const d1 = a.requestedDate?.toDate?.() || 0;
        const d2 = b.requestedDate?.toDate?.() || 0;
        return d2 - d1;
      });

      setRequests(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    fetchRechargeRequests();
  }, [fetchRechargeRequests]);

  /* ================= FILTER ================= */
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // 1. Search Filter
      const searchMatch =
        r.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.displayUtr?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      // 2. Status Filter - Now defaults to "Pending"
      if (statusFilter !== "All") {
        const currentStatus = r.rechargeStatus || "Pending";
        if (currentStatus !== statusFilter) return false;
      }

      // 3. Date Filter
      if (!r.requestedDate?.toDate) return true;

      const date = r.requestedDate.toDate();
      if (fromDate && date < new Date(fromDate)) return false;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (date > end) return false;
      }

      return true;
    });
  }, [requests, searchTerm, fromDate, toDate, statusFilter]);

  /* ================= STATUS UPDATE ================= */
  const handleStatusChange = async (userId, requestId, newStatus) => {
    if (newStatus === "Rejected") {
      setRejectModal({ userId, requestId });
      return;
    }

    try {
      setUpdatingId(requestId);

      const partnerSnap = await getDoc(doc(db, "partners", user.uid));
      const employeeName = partnerSnap.exists()
        ? partnerSnap.data().name
        : "Unknown";

      await updateDoc(
        doc(db, `customers/${userId}/rechargeRequest`, requestId),
        {
          rechargeStatus: newStatus,
          rejectedReason: "",
          triggeredByUid: user.uid,
          triggeredByName: employeeName,
          triggeredAt: new Date(),
        }
      );

      fetchRechargeRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  /* ================= REJECT CONFIRM ================= */
  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please enter rejection reason");
      return;
    }

    try {
      setUpdatingId(rejectModal.requestId);

      const partnerSnap = await getDoc(doc(db, "partners", user.uid));
      const employeeName = partnerSnap.exists()
        ? partnerSnap.data().name
        : "Unknown";

      await updateDoc(
        doc(
          db,
          `customers/${rejectModal.userId}/rechargeRequest`,
          rejectModal.requestId
        ),
        {
          rechargeStatus: "Rejected",
          rejectedReason: rejectReason,
          triggeredByUid: user.uid,
          triggeredByName: employeeName,
          triggeredAt: new Date(),
        }
      );

      setRejectModal(null);
      setRejectReason("");
      fetchRechargeRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  /* ================= EXPORT ================= */
  const handleExportExcel = () => {
    const excelData = filteredRequests.map((r) => ({
      "User Name": r.userName,
      "User ID": r.userId,
      "Triggered By":
        r.rechargeStatus?.toLowerCase() === "pending"
          ? "NA"
          : r.triggeredByName || "NA",
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Recharge Requests");
    XLSX.writeFile(workbook, `Recharge_Requests_${role}.xlsx`);
  };

  /* ================= UI ================= */
  return (
    <div style={{ background: "#f4f7f6", minHeight: "100vh" }}>
      <FixedHeader onSearchChange={setSearchTerm} />

      <div className="container mt-4">
        <div className="card shadow-sm rounded-4 p-3 mb-4">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <h4 className="fw-bold text-primary mb-0">
                {role === "admin"
                  ? "Recharge Management"
                  : "My Recharge Requests"}
              </h4>
            </div>

            {/* STATUS FILTER - DEFAULT TO PENDING WITH YELLOW BORDER */}
            <div className="col-md-2">
              <label className="small text-muted fw-bold">Status Filter</label>
              <select
                className={`form-select form-select-sm fw-bold border-2 ${
                  statusFilter === "Pending" ? "border-warning text-warning" :
                  statusFilter === "Success" ? "border-success text-success" :
                  statusFilter === "Rejected" ? "border-danger text-danger" : 
                  "border-primary text-primary"
                }`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  backgroundColor: statusFilter === "Pending" ? "#fff3cd" : 
                                 statusFilter === "Success" ? "#d1e7dd" :
                                 statusFilter === "Rejected" ? "#f8d7da" : "white"
                }}
              >
                <option value="All" className="text-dark">All Status</option>
                <option value="Pending" className="text-warning fw-bold" style={{backgroundColor: "#fff3cd"}}>Pending</option>
                <option value="Success" className="text-success fw-bold" style={{backgroundColor: "#d1e7dd"}}>Success</option>
                <option value="Rejected" className="text-danger fw-bold" style={{backgroundColor: "#f8d7da"}}>Rejected</option>
              </select>
         
            </div>

            <div className="col-md-3">
              <label className="small text-muted">From Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="small text-muted">To Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="col-md-1 text-end">
              <button
                className="btn btn-success btn-sm rounded-pill w-100"
                onClick={handleExportExcel}
              >
                📥 Export
              </button>
            </div>
          </div>
        </div>

        <div className="card shadow-sm rounded-4">
          <div className="table-responsive" style={{ maxHeight: "70vh" }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light d-none d-md-table-header-group">
                <tr className="text-muted small">
                  <th>User & Referrer</th>
                  <th>UTR</th>
                  <th>Mobile</th>
                  <th>Amount</th>
                  <th>Partner</th>
                  <th>Company</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                      <span className="ms-2">Loading...</span>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      No {statusFilter !== "All" ? statusFilter : ""} records found
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={`${r.userId}-${r.id}`} className="position-relative">
                      {/* Desktop View */}
                      <td className="d-none d-md-table-cell">
                        <div className="fw-bold">{r.userName}</div>
                        <div className="text-muted small">
                          ID: {r.userId} | Ref: {r.referredBy}
                        </div>
                      </td>
                      <td className="d-none d-md-table-cell">
                        <code className="small bg-light px-2 py-1">
                          {r.displayUtr}
                        </code>
                      </td>
                      <td className="d-none d-md-table-cell">{r.number || "N/A"}</td>
                      <td className="d-none d-md-table-cell">₹{r.plan?.price || "—"}</td>
                      <td className="d-none d-md-table-cell">
                        {r.rechargeStatus?.toLowerCase() === "pending"
                          ? "NA"
                          : r.triggeredByName || "NA"}
                      </td>
                      <td className="d-none d-md-table-cell">{r.plan?.rechargeProvider || "—"}</td>
                      <td className="d-none d-md-table-cell">
                        <select
                          className={`form-select form-select-sm fw-bold ${
                            r.rechargeStatus === "Success" ? "text-success" : 
                            r.rechargeStatus === "Rejected" ? "text-danger" : "text-warning"
                          }`}
                          value={r.rechargeStatus || "Pending"}
                          onChange={(e) =>
                            handleStatusChange(
                              r.userId,
                              r.id,
                              e.target.value
                            )
                          }
                          disabled={updatingId === r.id}
                          style={{
                            backgroundColor: r.rechargeStatus === "Pending" ? "#fff3cd" :
                                           r.rechargeStatus === "Success" ? "#d1e7dd" :
                                           r.rechargeStatus === "Rejected" ? "#f8d7da" : "white"
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Success">Success</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        {r.rechargeStatus === "Rejected" && r.rejectedReason && (
                          <div className="text-danger small mt-1" style={{fontSize: '10px'}}>⚠ {r.rejectedReason}</div>
                        )}
                      </td>

                      {/* Mobile View - Card Layout */}
                      <td colSpan="7" className="d-md-none p-3">
                        <div className="border-bottom pb-2 mb-2">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <div className="fw-bold">{r.userName}</div>
                              <div className="text-muted small">
                                ID: {r.userId} | Ref: {r.referredBy}
                              </div>
                            </div>
                            <div>
                              <select
                                className={`form-select form-select-sm fw-bold ${
                                  r.rechargeStatus === "Success" ? "text-success" : 
                                  r.rechargeStatus === "Rejected" ? "text-danger" : "text-warning"
                                }`}
                                style={{ 
                                  minWidth: "110px",
                                  backgroundColor: r.rechargeStatus === "Pending" ? "#fff3cd" :
                                                 r.rechargeStatus === "Success" ? "#d1e7dd" :
                                                 r.rechargeStatus === "Rejected" ? "#f8d7da" : "white"
                                }}
                                value={r.rechargeStatus || "Pending"}
                                onChange={(e) =>
                                  handleStatusChange(
                                    r.userId,
                                    r.id,
                                    e.target.value
                                  )
                                }
                                disabled={updatingId === r.id}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Success">Success</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="row g-2 mt-2">
                            <div className="col-6">
                              <div className="small text-muted">UTR</div>
                              <div>
                                <code className="small bg-light px-2 py-1">
                                  {r.displayUtr}
                                </code>
                              </div>
                            </div>
                            <div className="col-6">
                              <div className="small text-muted">Mobile</div>
                              <div>{r.number || "N/A"}</div>
                            </div>
                            <div className="col-6">
                              <div className="small text-muted">Amount</div>
                              <div>₹{r.plan?.price || "—"}</div>
                            </div>
                            <div className="col-6">
                              <div className="small text-muted">Partner</div>
                              <div className="small">
                                {r.rechargeStatus?.toLowerCase() === "pending"
                                  ? "NA"
                                  : r.triggeredByName || "NA"}
                              </div>
                            </div>
                            <div className="col-6">
                              <div className="small text-muted">Company</div>
                              <div className="small">{r.plan?.rechargeProvider || "—"}</div>
                            </div>
                            {r.rechargeStatus === "Rejected" && r.rejectedReason && (
                              <div className="col-12 text-danger small">
                                <strong>Reason:</strong> {r.rejectedReason}
                              </div>
                            )}
                          </div>
                        </div>
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
        <div
          className="modal show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
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
                <label className="fw-semibold mb-2">
                  Rejection Reason
                </label>
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
                <button
                  className="btn btn-danger"
                  onClick={confirmReject}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedRechargeRequestList;