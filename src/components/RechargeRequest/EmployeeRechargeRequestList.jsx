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
      const searchMatch =
        r.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.displayUtr?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

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
  }, [requests, searchTerm, fromDate, toDate]);

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
            <div className="col-md-4">
              <h4 className="fw-bold text-primary mb-0">
                {role === "admin"
                  ? "Recharge Management"
                  : "My Recharge Requests"}
              </h4>
            </div>

            <div className="col-md-4">
              <label className="small text-muted">From</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label className="small text-muted">To</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="col-md-12 text-end">
              <button
                className="btn btn-success rounded-pill px-4"
                onClick={handleExportExcel}
              >
                📥 Export Excel
              </button>
            </div>
          </div>
        </div>

        <div className="card shadow-sm rounded-4">
          <div className="table-responsive" style={{ maxHeight: "70vh" }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
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
                    <td colSpan={6} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No records found
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={`${r.userId}-${r.id}`}>
                      <td>
                        <div className="fw-bold">{r.userName}</div>
                        <div className="text-muted small">
                          ID: {r.userId} | Ref: {r.referredBy}
                        </div>
                      </td>
                      <td>
                        <code className="small bg-light px-2 py-1">
                          {r.displayUtr}
                        </code>
                      </td>
                      <td>{r.number || "N/A"}</td>
                      <td>₹{r.plan?.price || "—"}</td>
                      <td>
                        {r.rechargeStatus?.toLowerCase() === "pending"
                          ? "NA"
                          : r.triggeredByName || "NA"}
                      </td>
                      <td>{r.plan?.rechargeProvider || "—"}</td>
                      <td>
                        <select
                          className="form-select form-select-sm fw-bold mt-1"
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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