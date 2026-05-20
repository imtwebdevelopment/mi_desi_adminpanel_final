import React, { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import FixedHeader from "./FixedHeader";

const StockNotifier = () => {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [editItem, setEditItem] = useState(null); // ✅ selected item for editing
  const [saving, setSaving] = useState(false);

  // ✅ Real-time fetch
  useEffect(() => {
    const colRef = collection(db, "stock_notifier");

    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(list);
        setFiltered(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching stock notifier:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ✅ Search Logic
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFiltered(data);
      return;
    }

    const term = searchTerm.toLowerCase();

    const filteredList = data.filter((item) =>
      Object.values(item).join(" ").toLowerCase().includes(term)
    );

    setFiltered(filteredList);
  }, [searchTerm, data]);

  if (loading)
    return (
      <div className="text-center p-4 fs-5 fw-semibold">
        Loading Stock Notifications...
      </div>
    );

 const headers = filtered.length
  ? Object.keys(filtered[0]).filter((h) => h !== "status")
  : [];


  // ✅ UPDATE STATUS
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editItem) return;

    try {
      setSaving(true);
      const ref = doc(db, "stock_notifier", editItem.id);
      await updateDoc(ref, {
        status: editItem.status,
      });

      setEditItem(null);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f3f6" }}>
      <FixedHeader onSearchChange={setSearchTerm} />

      <div className="container-fluid p-4" style={{ paddingTop: "90px" }}>
        <h2 className="mb-4 fw-bold text-primary">Stock Notifier</h2>

        <div className="card shadow-lg border-0 rounded-4">
          <div className="table-responsive">
            <table className="table align-middle mb-0 table-hover">
              <thead className="table-light">
                <tr>
                  {headers.map((key) => (
                    <th
                      key={key}
                      className="fw-semibold text-secondary"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {key.toUpperCase()}
                    </th>
                  ))}
                  <th className="fw-semibold text-secondary text-center">
                    STATUS
                  </th>
                  <th className="fw-semibold text-secondary text-center">
                    ACTIONS
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((item, idx) => (
                    <tr key={idx} className="align-middle hover-shadow">
                      {headers.map((key) => (
                        <td key={key}>{String(item[key])}</td>
                      ))}

                      {/* ✅ Status Badge */}
                      <td className="text-center">
                        {item.status === "pending" ? (
                          <span className="badge bg-warning text-dark px-3 py-2 rounded-pill">
                            Pending
                          </span>
                        ) : (
                          <span className="badge bg-success px-3 py-2 rounded-pill">
                            Completed
                          </span>
                        )}
                      </td>

                      {/* ✅ Edit Button */}
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-info shadow-sm"
                          onClick={() => setEditItem(item)}
                        >
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={headers.length + 2}
                      className="text-center py-4 text-muted"
                    >
                      {searchTerm
                        ? `No results found for "${searchTerm}".`
                        : "No stock notifications found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ✅ Hover effect */}
        <style>{`
          .hover-shadow:hover {
            box-shadow: 0 10px 20px rgba(0,0,0,0.12);
            transition: all 0.3s ease-in-out;
          }
        `}</style>
      </div>

      {/* ✅ EDIT MODAL */}
      {editItem && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content shadow-lg rounded-4">
              <form onSubmit={handleSaveEdit}>
                

                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={editItem.status}
                      onChange={(e) =>
                        setEditItem({ ...editItem, status: e.target.value })
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditItem(null)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StockNotifier;
