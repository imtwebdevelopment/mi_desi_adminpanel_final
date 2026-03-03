import React, { useEffect, useState } from "react";
import FixedHeader from "../FixedHeader";
import "bootstrap/dist/css/bootstrap.min.css";
import { db, collection, getDocs, doc, getDoc } from "../../firebase";
import ViewCustomerModal from "./ViewCustomerModal";

const CustomerDetails = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const customersSnap = await getDocs(collection(db, "customers"));

        const customersList = await Promise.all(
          customersSnap.docs.map(async (customerDoc) => {
            const data = customerDoc.data();
            const uid = customerDoc.id;

            /* ---------------- PRODUCT ORDERS ---------------- */
            let productSpend = 0;
            let orderCount = 0;

            try {
              const ordersSnap = await getDocs(
                collection(db, "customers", uid, "orders")
              );

              ordersSnap.forEach((doc) => {
                const order = doc.data();
                const status = (order.status || "").toLowerCase();

                if (
                  status === "canceled" ||
                  status === "cancelled" ||
                  status === "pending"
                ) return;

                orderCount += 1;
                productSpend += Number(order.totalAmount || 0);
              });
            } catch (_) {}

            /* ---------------- RECHARGE REQUEST ---------------- */
            let rechargeSpend = 0;
            try {
              const rechargeSnap = await getDocs(
                collection(db, "customers", uid, "rechargeRequest")
              );

              rechargeSnap.forEach((doc) => {
                const recharge = doc.data();
                const status = (recharge.rechargeStatus || "").toLowerCase();

                if (status !== "success" && status !== "active") return;

                rechargeSpend += Number(recharge.plan?.price || 0);
              });
            } catch (_) {}

            /* ---------------- WALLET (TOP LEVEL) ---------------- */
            let walletAmount = 0;
            try {
              const walletDoc = await getDoc(doc(db, "wallets", uid));
              if (walletDoc.exists()) {
                walletAmount = Number(walletDoc.data().balance || 0);
              }
            } catch (_) {}

            /* ---------------- TOTAL ---------------- */
            const totalSpend = productSpend + rechargeSpend + walletAmount;

            return {
              id: uid,
              name: data.name || "N/A",
              email: data.email || "N/A",
              phone: data.mobileNumber || data.phone || "N/A",

              orderCount,
              productSpend: productSpend.toFixed(2),
              rechargeSpend: rechargeSpend.toFixed(2),
              walletAmount: walletAmount.toFixed(2),
              totalSpend: totalSpend.toFixed(2),
            };
          })
        );

        setCustomers(customersList);
      } catch (err) {
        console.error("Error fetching customer data:", err);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const t = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(t) ||
      c.email.toLowerCase().includes(t) ||
      c.id.toLowerCase().includes(t)
    );
  });

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" />
        <p className="mt-2">Loading Customers...</p>
      </div>
    );
  }

  return (
    <div className="customer-page-container">
      <FixedHeader searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <div className="container-fluid p-4" style={{ paddingTop: "90px" }}>
        <h2 className="fw-bold text-primary mb-4">
          Customer Spend Report (**{customers.length} total**)
        </h2>

        <div className="card shadow-lg border-0 rounded-4">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Orders</th>
                  <th>Product</th>
                  <th>Recharge</th>
                  <th>Wallet</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id.substring(0, 8)}...</td>
                    <td>{c.name}</td>
                    <td>{c.email}</td>
                    <td className="fw-semibold">{c.orderCount}</td>
                    <td>₹{c.productSpend}</td>
                    <td>₹{c.rechargeSpend}</td>
                    <td>₹{c.walletAmount}</td>
                    <td className="fw-bold text-success">
                      ₹{c.totalSpend}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setViewCustomer(c)}
                      >
                        View 👁️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewCustomer && (
        <ViewCustomerModal
          customer={viewCustomer}
          onClose={() => setViewCustomer(null)}
        />
      )}
    </div>
  );
};

export default CustomerDetails;
