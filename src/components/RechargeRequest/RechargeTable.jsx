import React from "react";

const RechargeTable = ({ requests, loading, onView, onEdit, onDelete }) => {
  if (loading) return <p>Loading...</p>;
  if (!requests.length) return <p>No recharge requests found.</p>;

  return (
    <div className="table-responsive">
      <table className="table table-bordered table-striped align-middle">
        <thead className="table-dark">
          <tr>
            <th>User ID</th>
            <th>Number</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Requested On</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>{r.userId}</td>
              <td>{r.number || "N/A"}</td>
              <td>{r.plan?.price ? `₹${r.plan.price}` : "N/A"}</td>
              <td>
                <span
                  className={`badge ${
                    r.rechargeStatus === "Success"
                      ? "bg-success"
                      : r.rechargeStatus === "Failed"
                      ? "bg-danger"
                      : "bg-warning text-dark"
                  }`}
                >
                  {r.rechargeStatus || "Pending"}
                </span>
              </td>
              <td>{r.createdAt?.toDate?.().toLocaleString() || "N/A"}</td>
              <td>
                <button className="btn btn-sm btn-outline-primary me-1" onClick={() => onView(r)}>👁️</button>
                <button className="btn btn-sm btn-outline-success me-1" onClick={() => onEdit(r)}>✏️</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(r)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RechargeTable;
