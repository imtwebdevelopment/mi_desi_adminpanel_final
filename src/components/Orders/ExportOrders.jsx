import React, { useState } from "react";
import { db, collection, getDocs } from "../../firebase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const CUSTOMER_COLLECTION_NAME = "customers";
const ORDER_SUBCOLLECTION_NAME = "orders";

const ExportOrdersButton = () => {
  const [loading, setLoading] = useState(false);

  const downloadExcel = async () => {
    setLoading(true);

    try {
      const allOrders = [];

      const customersSnap = await getDocs(
        collection(db, CUSTOMER_COLLECTION_NAME)
      );

      for (const customerDoc of customersSnap.docs) {
        const customerId = customerDoc.id;
        const customer = customerDoc.data();

        const ordersSnap = await getDocs(
          collection(
            db,
            CUSTOMER_COLLECTION_NAME,
            customerId,
            ORDER_SUBCOLLECTION_NAME
          )
        );

        ordersSnap.forEach((orderDoc) => {
          const data = orderDoc.data();

          allOrders.push({
            OrderID: data.orderId || orderDoc.id,
            Customer: customer?.name || "N/A",
            Phone: data.phoneNumber ? String(data.phoneNumber) : "N/A",

            Status: String(
              data.status || data.orderStatus || "pending"
            )
              .trim()
              .toLowerCase(),

            Total: Number(data.totalAmount || data.total || 0),
            Items: data.products?.length || 0,
            Date: data.createdAt?.toDate
              ? data.createdAt.toDate().toLocaleDateString()
              : "N/A",
            UTR:
              data.transactionId ||
              data.transactionData?.transactionId ||
              "N/A",
          });
        });
      }

      if (allOrders.length === 0) {
        alert("No orders found");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(allOrders);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const blob = new Blob([excelBuffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(
        blob,
        `Orders_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export orders");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={downloadExcel}
      disabled={loading}
      className="btn btn-success"
    >
      {loading ? "Downloading..." : "📥 Download Orders Excel"}
    </button>
  );
};

export default ExportOrdersButton;
