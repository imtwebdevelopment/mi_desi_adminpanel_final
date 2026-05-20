import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import * as XLSX from "xlsx";
import FixedHeader from "./FixedHeader";
import { db, collection, onSnapshot, doc, getDoc, getDocs } from "../firebase";

const ReferralList = () => {
  const [referrals, setReferrals] = useState([]);
  const [filteredReferrals, setFilteredReferrals] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewReferral, setViewReferral] = useState(null);
  const [salesData, setSalesData] = useState({
    rechargeSales: 0,
    productSales: 0,
    totalSales: 0
  });

  // ✅ Format Firestore timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ Fetch customer's name
  const fetchCustomerDetails = async (customerId) => {
    if (!customerId) return "N/A";

    try {
      const customerRef = doc(db, "customers", customerId);
      const customerSnap = await getDoc(customerRef);

      if (customerSnap.exists()) {
        const data = customerSnap.data();

        const name = data.name || data.fullName || "Unnamed";
        const email = data.email || "No Email";
        const referralCode = data.customerReferalCode || "No Code";

        return `${name} (${email}) - ${referralCode}`;
      } else {
        return "Unknown User";
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
      return "Error";
    }
  };
  const fetchSalesData = async (customerId) => {
    if (!customerId) return;

    let rechargeTotal = 0;
    let productTotal = 0;

    try {

      /* -------- PRODUCT ORDERS -------- */

      const ordersSnap = await getDocs(
        collection(db, "customers", customerId, "orders")
      );

      ordersSnap.docs.forEach((doc) => {
        const data = doc.data();

        if (data.status === "Delivered") {
          productTotal += Number(data.totalAmount || data.total || 0);
        }

      });


      /* -------- RECHARGE SALES -------- */

      const rechargeSnap = await getDocs(
        collection(db, "customers", customerId, "recharges")
      );

      rechargeSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.status === "Success") {
          rechargeTotal += Number(data.amount || 0);
        }
      });

      setSalesData({
        rechargeSales: rechargeTotal,
        productSales: productTotal,
        totalSales: rechargeTotal + productTotal
      });

    } catch (error) {
      console.error("Error fetching sales:", error);
    }
  };
  const getSalesForCustomer = async (customerId) => {

    let rechargeTotal = 0;
    let productTotal = 0;

    try {

      const ordersSnap = await getDocs(
        collection(db, "customers", customerId, "orders")
      );

      ordersSnap.docs.forEach((doc) => {
        const data = doc.data();

        if (data.status === "Delivered") {
          productTotal += Number(data.totalAmount || data.total || 0);
        }
      });

      const rechargeSnap = await getDocs(
        collection(db, "customers", customerId, "recharges")
      );

      rechargeSnap.docs.forEach((doc) => {
        const data = doc.data();

        if (data.status === "Success") {
          rechargeTotal += Number(data.amount || 0);
        }

      });

      return rechargeTotal + productTotal;

    } catch (error) {
      console.error("Sales fetch error:", error);
      return 0;
    }
  };

  // ✅ Fetch referrals with resolved names
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "referrals"),
      async (snapshot) => {
        try {
          const rawData = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));

          const withNames = await Promise.all(
            rawData.map(async (ref) => ({
              ...ref,
              referredByName: await fetchCustomerDetails(ref.referredBy),
              referredToName: await fetchCustomerDetails(ref.referredTo),
            }))
          );

          setReferrals(withNames);
          setFilteredReferrals(withNames);
        } catch (error) {
          console.error("Error resolving names:", error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error fetching referrals:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ✅ Filter referrals by search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredReferrals(referrals);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredReferrals(
        referrals.filter(
          (ref) =>
            (ref.referredByName &&
              ref.referredByName.toLowerCase().includes(term)) ||
            (ref.referredToName &&
              ref.referredToName.toLowerCase().includes(term)) ||
            (ref.id && ref.id.toLowerCase().includes(term))
        )
      );
    }
  }, [searchTerm, referrals]);

  // ✅ Export to Excel
  const handleDownloadExcel = async () => {

    if (!filteredReferrals.length) {
      alert("No data to export!");
      return;
    }

    const excelData = await Promise.all(
      filteredReferrals.map(async (ref) => {

        const totalSales = await getSalesForCustomer(ref.referredTo);

        return {
          "Referred By": ref.referredByName,
          "Referred To": ref.referredToName,
          "Date & Time": formatDate(ref.referredAt),
          "Referral ID": ref.id,
          "Total Sales": totalSales
        };

      })
    );

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Referrals");

    XLSX.writeFile(workbook, "referrals.xlsx");

  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f3f6" }}>
      <FixedHeader onSearchChange={setSearchTerm} />

      <div className="container-fluid p-4" style={{ paddingTop: "90px" }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold text-primary">Referral Management</h2>
          <button
            className="btn btn-success shadow-sm rounded-pill px-4"
            onClick={handleDownloadExcel}
          >
            📥 Download Excel
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="alert alert-info text-center shadow-sm rounded-4">
            Fetching referrals...
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="card shadow-lg border-0 rounded-4">
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Referred By</th>
                    <th>Referred To</th>
                    <th>Date & Time</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.length > 0 ? (
                    filteredReferrals.map((ref) => (
                      <tr key={ref.id} className="align-middle hover-shadow">
                        <td>{ref.referredByName}</td>
                        <td>{ref.referredToName}</td>
                        <td>{formatDate(ref.referredAt)}</td>
                        <td className="text-center">
                          <button
                            className="btn btn-sm btn-outline-primary shadow-sm rounded-pill px-3"
                            onClick={() => {
                              setViewReferral(ref);
                              fetchSalesData(ref.referredTo);
                            }}
                          >
                            👁️ View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-muted">
                        {searchTerm
                          ? `No referrals found matching "${searchTerm}".`
                          : "No referrals found in Firestore."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {viewReferral && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow-lg rounded-4 border-0">
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold text-primary">
                    Referral Details
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setViewReferral(null);
                      setSalesData({
                        rechargeSales: 0,
                        productSales: 0,
                        totalSales: 0
                      });
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="p-3 rounded-4 bg-light-subtle">
                    <p>
                      <strong>Document ID:</strong> {viewReferral.id}
                    </p>
                    <p>
                      <strong>Referred By:</strong> {viewReferral.referredByName}
                    </p>
                    <p>
                      <strong>Referred To:</strong> {viewReferral.referredToName}
                    </p>
                    <p>
                      <strong>Date & Time:</strong>{" "}
                      {formatDate(viewReferral.referredAt)}
                    </p>
                    <hr />

                    <h6 className="fw-bold text-success">Sales Generated</h6>

                    <p>
                      <strong>Recharge Sales:</strong> ₹{salesData.rechargeSales}
                    </p>

                    <p>
                      <strong>Product Sales:</strong> ₹{salesData.productSales}
                    </p>

                    <p className="fw-bold text-primary">
                      <strong>Total Sales:</strong> ₹{salesData.totalSales}
                    </p>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary rounded-pill px-4"
                    onClick={() => {
                      setViewReferral(null);
                      setSalesData({
                        rechargeSales: 0,
                        productSales: 0,
                        totalSales: 0
                      });
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Styles */}
      <style>{`
        .hover-shadow:hover {
          box-shadow: 0 10px 20px rgba(0,0,0,0.12);
          transition: all 0.3s ease-in-out;
        }
        .table > :not(caption) > * > * {
          padding: 1rem 1.2rem;
        }
        .btn-outline-primary:hover {
          background-color: #4f46e5;
          color: #fff;
          border-color: #4f46e5;
        }
      `}</style>
    </div>
  );
};

export default ReferralList;
