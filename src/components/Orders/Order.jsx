import React, { useState, useEffect, useCallback } from "react";
import FixedHeader from "../FixedHeader";
import {
  db,
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
} from "../../firebase";

import {
  RiShoppingBag3Line,
  RiTimeLine,
  RiTruckLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiAlertLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiCheckLine,
} from "react-icons/ri";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import ViewOrderModal from "./ViewOrderPage";
import "bootstrap/dist/css/bootstrap.min.css";


/* -------------------------- CONSTANTS -------------------------- */
const CUSTOMER_COLLECTION_NAME = "customers";
const ORDER_SUBCOLLECTION_NAME = "orders";
const PRODUCT_COLLECTION_NAME = "products";

/* -------------------------- BADGE COLORS -------------------------- */
const statusClass = (status) => {
  switch (status) {
    case "Pending":
      return "bg-warning text-dark";
    case "Shipped":
      return "bg-info text-dark";
    case "Delivered":
      return "bg-success text-white";
    case "Canceled":
      return "bg-danger text-white";
    default:
      return "bg-secondary text-white";
  }
};

/* -------------------------- DELETE MODAL -------------------------- */
const ConfirmDeleteModal = ({ order, onClose, onConfirm }) => {
  if (!order) return null;

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered modal-sm">
        <div className="modal-content rounded-4 shadow-lg">
          <div className="modal-header">
            <h5 className="modal-title fw-bold text-danger">Delete Order</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body text-center">
            Are you sure you want to delete:
            <br />
            <span className="fw-bold">{order.id}</span>?
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={onConfirm}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =============================================================
   ORDER PAGE
============================================================= */
const OrderPage = ({ onNavigate }) => {

  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [viewOrder, setViewOrder] = useState(null);
  const [deleteOrder, setDeleteOrder] = useState(null);
  
  const [fromDate, setFromDate] = useState("");
const [toDate, setToDate] = useState("");



  const handleFilterOrders = (status) => {
  setSearchTerm(status);
};

  /* -------------------------- FETCH ORDERS -------------------------- */
  const getOrders = useCallback(async () => {
    setLoading(true);

    try {
      console.log("Fetching orders...");
      const customersSnapshot = await getDocs(
        collection(db, CUSTOMER_COLLECTION_NAME)
      );

      console.log("Customers found:", customersSnapshot.docs.length);

      const orderLists = customersSnapshot.docs.map(async (customerDoc) => {
        const customerId = customerDoc.id;
        const customer = customerDoc.data();

        const ordersRef = collection(
          db,
          CUSTOMER_COLLECTION_NAME,
          customerId,
          ORDER_SUBCOLLECTION_NAME
        );

        const orderSnap = await getDocs(ordersRef);

        return orderSnap.docs.map((o) => {
          const data = o.data();

 return {
  ...data,
  id: data.orderId || o.id,
  docId: o.id,
  customerId,

  // 👤 CUSTOMER INFO
  customer: customer.name || "N/A",
  phone: data.phoneNumber ? String(data.phoneNumber) : "N/A",

  // 🔗 REFERRED BY ID (THIS WAS MISSING)
  referredBy: customer.referredBy || "Direct",

  // 💳 UTR
  utr:
    data.transactionId ||
    data.transactionData?.transactionId ||
    "N/A",

 date: data.createdAt?.toDate().toISOString() || data.date || null,

  total: (data.totalAmount || data.total || 0).toFixed(2),
  items: data.products?.length || 0,
  status: data.status || "Pending",
};


        });
      });

      const all = await Promise.all(orderLists);
      const flattenedOrders = all.flat();
      console.log("All orders fetched:", flattenedOrders.length);
      setOrders(flattenedOrders);
    } catch (e) {
      console.error("Fetch Orders Error:", e);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    getOrders();
  }, [getOrders]);

  /* -------------------------- DEBUG ORDER DATA -------------------------- */
  const debugOrderData = (order) => {
    console.log("🔍 Order Debug Info:", {
      orderId: order.id,
      docId: order.docId,
      customerId: order.customerId,
      hasProducts: !!order.products,
      productsLength: order.products?.length,
      products: order.products,
      fullOrder: order
    });
  };

const downloadOrdersExcel = () => {
  if (filteredOrders.length === 0) {
    alert("No orders to export");
    return;
  }

  // Convert date strings to Date objects
  const from = fromDate ? new Date(fromDate) : null;
  const to = toDate ? new Date(toDate) : null;

  // Filter by date range
  const ordersToExport = filteredOrders.filter((o) => {
    if (!o.date) return false;

    const orderDate = new Date(o.date); // assuming o.date is in a format like "YYYY-MM-DD"
    
    if (from && orderDate < from) return false;
    if (to && orderDate > to) return false;

    return true;
  });

  if (ordersToExport.length === 0) {
    alert("No orders found in the selected date range");
    return;
  }

  const excelData = ordersToExport.map((o) => ({
    "Order ID": o.id,
    "Customer Name": o.customer,
    "Customer ID": o.customerId,
    "Referred By": o.referredBy,
    "Phone": o.phone,
    "UTR": o.utr,
    "Items": o.items,
    "Total Amount": o.total,
    "Status": o.status,
    "Order Date": o.date,
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders Report");

  XLSX.writeFile(
    workbook,
    `Orders_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};


  /* -------------------------- EXTRACT PRODUCT DATA -------------------------- */
  const extractProductData = (item) => {
    // Handle nested product structure: {product: {…}, quantity: 6}
    if (item.product && typeof item.product === 'object') {
      const product = item.product;
      
      const productId = product.id || product.productId || product.docId;
      const productName = product.name || product.productName || product.title || "Unknown Product";
      const quantity = item.quantity || item.qty || 1;
      
      return {
        productId: productId,
        quantity: quantity,
        productName: productName
      };
    }
    // Handle standard structure: {productId: "123", quantity: 2}
    else if (item.productId) {
      return {
        productId: item.productId,
        quantity: item.quantity || item.qty || 1,
        productName: item.productName || item.name || "Unknown Product"
      };
    }
    // Handle alternative ID field: {id: "123", quantity: 2}
    else if (item.id) {
      return {
        productId: item.id,
        quantity: item.quantity || item.qty || 1,
        productName: item.productName || item.name || "Unknown Product"
      };
    }
    
    console.warn("❌ Unknown product structure:", item);
    return null;
  };

  /* -------------------------- RESTOCK PRODUCT -------------------------- */
  const handleRestockProduct = async (productId, productName, additionalStock = 10) => {
    try {
      console.log(`🔄 Restocking product: ${productName}`);
      const productRef = doc(db, PRODUCT_COLLECTION_NAME, productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        alert("Product not found in database");
        return false;
      }

      const productData = productSnap.data();
      const currentStock = Number(productData.stockCount) || 0;
      const newStock = currentStock + additionalStock;

      await updateDoc(productRef, {
        stockCount: newStock
      });

      console.log(`✅ Restocked: ${productName} - ${currentStock} -> ${newStock}`);
      alert(`✅ Successfully restocked ${productName}\nNew stock: ${newStock} units`);
      return true;
    } catch (error) {
      console.error("Restock error:", error);
      alert(`❌ Failed to restock: ${error.message}`);
      return false;
    }
  };

  /* -------------------------- ACCEPT ORDER (Pending → Shipped) -------------------------- */
  const handleAcceptOrder = async (order) => {
    try {
      console.log("🚀 Starting order acceptance for:", order.id);
      debugOrderData(order);

      // Validate order data
      if (!order || !order.customerId || !order.docId) {
        alert("❌ Invalid order data");
        return;
      }

      const outOfStockItems = [];
      const successfullyUpdatedItems = [];

      // Check if products array exists and has items
      if (order.products && order.products.length > 0) {
        console.log("📦 Processing stock deduction for", order.products.length, "products");
        
        // First, validate all products and extract product data
        const productItems = [];
        
        for (const item of order.products) {
          console.log("🛒 Processing order item:", item);
          const productData = extractProductData(item);
          
          if (!productData) {
            console.error("❌ Could not extract product data from:", item);
            alert(`Invalid product data in order. Please check product structure.`);
            return;
          }

          if (!productData.productId) {
            console.error("❌ Missing productId in:", productData);
            alert(`Missing product ID in order items.`);
            return;
          }

          productData.quantity = Number(productData.quantity) || 1;
          productItems.push(productData);
        }

        console.log("✅ Extracted product data:", productItems);

        // Check stock and collect out-of-stock items
        for (const productItem of productItems) {
          console.log(`🔍 Checking product: ${productItem.productId}, Quantity: ${productItem.quantity}`);
          const productRef = doc(db, PRODUCT_COLLECTION_NAME, productItem.productId);
          const productSnap = await getDoc(productRef);

          if (!productSnap.exists()) {
            console.error(`❌ Product ${productItem.productId} not found in database`);
            outOfStockItems.push({
              name: productItem.productName,
              required: productItem.quantity,
              available: 0,
              reason: "Product not found"
            });
            continue;
          }

          const productData = productSnap.data();
          const stock = Number(productData.stockCount) || 0;
          const quantity = productItem.quantity;

          console.log(`📊 Product ${productItem.productId} - Stock: ${stock}, Required: ${quantity}`);

          if (stock < quantity) {
            outOfStockItems.push({
              name: productItem.productName,
              required: quantity,
              available: stock,
              reason: "Insufficient stock"
            });
          } else {
            successfullyUpdatedItems.push(productItem);
          }
        }

        // If there are out-of-stock items, show warning but continue
        if (outOfStockItems.length > 0) {
          const outOfStockMessage = outOfStockItems.map(item => 
            `• ${item.name}: Required ${item.required}, Available ${item.available}`
          ).join('\n');
          
          const userChoice = window.confirm(
            `⚠️ Some items have insufficient stock:\n\n${outOfStockMessage}\n\nDo you want to proceed with accepting the order anyway? Stock will not be deducted for out-of-stock items.`
          );
          
          if (!userChoice) {
            alert("Order acceptance cancelled.");
            return;
          }
        }

        // Deduct stock only for items with sufficient stock
        console.log("✅ Proceeding with stock deduction for items with sufficient stock");
        for (const productItem of successfullyUpdatedItems) {
          const productRef = doc(db, PRODUCT_COLLECTION_NAME, productItem.productId);
          const productSnap = await getDoc(productRef);
          const productData = productSnap.data();
          const stock = Number(productData.stockCount) || 0;
          const quantity = productItem.quantity;

          console.log(`➖ Deducting stock: ${productItem.productId} - ${stock} -> ${stock - quantity}`);
          
          await updateDoc(productRef, {
            stockCount: stock - quantity,
          });
          
          console.log(`✅ Stock deducted: ${productItem.productName} - ${quantity} units`);
        }

        if (outOfStockItems.length > 0) {
          console.log("⚠️ Skipped stock deduction for out-of-stock items:", outOfStockItems);
        }
      } else {
        console.log("ℹ️ No products found in order, skipping stock deduction");
      }

      // Update order status
      console.log("📝 Updating order status to Shipped...");
      const orderRef = doc(
        db,
        CUSTOMER_COLLECTION_NAME,
        order.customerId,
        ORDER_SUBCOLLECTION_NAME,
        order.docId
      );

      await updateDoc(orderRef, {
        status: "Shipped",
        orderStatus: "Shipped",
        shippedAt: new Date()
      });

      console.log("✅ Order status updated successfully");

      // Update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.docId === order.docId ? { ...o, status: "Shipped" } : o
        )
      );

      // Show success message immediately
      if (outOfStockItems.length > 0) {
        alert(`✅ Order accepted and marked as Shipped!\n\n⚠️ Note: ${outOfStockItems.length} item(s) had insufficient stock and were not deducted from inventory.`);
      } else {
        alert("✅ Order accepted and marked as Shipped!");
      }

      console.log("🎉 Order accepted successfully!");

    } catch (error) {
      console.error("❌ Order acceptance error:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // More specific error messages
      if (error.code === 'permission-denied') {
        alert("❌ Permission denied. Check your Firebase rules.");
      } else if (error.code === 'not-found') {
        alert("❌ Order or product not found in database.");
      } else if (error.code === 'unavailable') {
        alert("❌ Network error. Please check your internet connection.");
      } else {
        alert(`❌ Failed to accept order: ${error.message}`);
      }
    }
  };

  /* -------------------------- ACCEPT ORDER WITH RESTOCK OPTION -------------------------- */
  const handleAcceptOrderWithRestock = async (order) => {
    try {
      console.log("🚀 Starting order acceptance with restock option for:", order.id);

      // Validate order data
      if (!order || !order.customerId || !order.docId) {
        alert("❌ Invalid order data");
        return;
      }

      let outOfStockItems = [];

      // Check stock first
      if (order.products && order.products.length > 0) {
        const productItems = [];
        
        for (const item of order.products) {
          const productData = extractProductData(item);
          if (productData && productData.productId) {
            productData.quantity = Number(productData.quantity) || 1;
            productItems.push(productData);
          }
        }

        // Check for out-of-stock items
        for (const productItem of productItems) {
          const productRef = doc(db, PRODUCT_COLLECTION_NAME, productItem.productId);
          const productSnap = await getDoc(productRef);

          if (productSnap.exists()) {
            const productData = productSnap.data();
            const stock = Number(productData.stockCount) || 0;
            const quantity = productItem.quantity;

            if (stock < quantity) {
              outOfStockItems.push({
                ...productItem,
                available: stock
              });
            }
          }
        }

        // If out-of-stock items found, offer to restock
        if (outOfStockItems.length > 0) {
          const outOfStockMessage = outOfStockItems.map(item => 
            `• ${item.productName}: Required ${item.quantity}, Available ${item.available}`
          ).join('\n');
          
          const userChoice = window.confirm(
            `⚠️ Insufficient stock for ${outOfStockItems.length} item(s):\n\n${outOfStockMessage}\n\nDo you want to automatically restock these items and then accept the order?`
          );
          
          if (userChoice) {
            // Restock all out-of-stock items
            for (const item of outOfStockItems) {
              const neededStock = item.quantity - item.available;
              const restockAmount = Math.max(neededStock + 5, 10); // Restock needed amount + buffer
              await handleRestockProduct(item.productId, item.productName, restockAmount);
            }
            
            // Clear out-of-stock items after restocking
            outOfStockItems = [];
          } else {
            alert("Order acceptance cancelled. Please restock manually or use partial acceptance.");
            return;
          }
        }
      }

      // Now proceed with normal order acceptance
      await handleAcceptOrder(order);
      
    } catch (error) {
      console.error("Order acceptance with restock error:", error);
      alert(`❌ Failed to accept order: ${error.message}`);
    }
  };

  /* -------------------------- CHANGE STATUS -------------------------- */
  const handleStatusChange = async (docId, customerId, newStatus) => {
    try {
      console.log(`🔄 Changing status for order ${docId} to ${newStatus}`);
      
      const orderRef = doc(
        db,
        CUSTOMER_COLLECTION_NAME,
        customerId,
        ORDER_SUBCOLLECTION_NAME,
        docId
      );

      await updateDoc(orderRef, {
        status: newStatus,
        orderStatus: newStatus,
      });

      console.log("✅ Status updated successfully");

      setOrders((prev) =>
        prev.map((o) => {
          if (o.docId === docId) {
            return { ...o, status: newStatus };
          }
          return o;
        })
      );

      // Show success message
      alert(`✅ Order status updated to ${newStatus}`);

    } catch (error) {
      console.error("❌ Status update error:", error);
      alert(`❌ Status update failed: ${error.message}`);
    }
  };

  /* -------------------------- DELETE ORDER -------------------------- */
  const handleDeleteOrder = async () => {
    if (!deleteOrder) return;

    try {
      console.log("🗑️ Deleting order:", deleteOrder.id);
      
      await deleteDoc(  
        doc(
          db,
          CUSTOMER_COLLECTION_NAME,
          deleteOrder.customerId,
          ORDER_SUBCOLLECTION_NAME,
          deleteOrder.docId
        )
      );

      setOrders((prev) =>
        prev.filter((o) => o.docId !== deleteOrder.docId)
      );

      setDeleteOrder(null);
      alert("✅ Order deleted successfully.");
    } catch (e) {
      console.error("❌ Delete error:", e);
      alert(`❌ Delete failed: ${e.message}`);
    }
  };

  /* -------------------------- SEARCH FILTER -------------------------- */
  const filteredOrders = orders.filter((o) =>
    (o.id + o.customer + o.status)
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  /* -------------------------- LOADING -------------------------- */
  if (loading) {
    return (
      <div className="text-center p-5 fw-bold fs-4 text-primary">
        <div className="spinner-border text-primary me-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        Loading Orders...
      </div>
    );
  }


  /* =============================================================
     RENDER UI
  ============================================================= */
  return (
    <div style={{ minHeight: "100vh", background: "#f1f3f6" }}>
      <FixedHeader onSearchChange={setSearchTerm} />

      <div className="container-fluid p-4" style={{ paddingTop: 90 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold text-primary mb-0">Order Management</h2>

<div className="d-flex align-items-center gap-2 mb-3">
  <input
    type="date"
    className="form-control form-control-sm"
    value={fromDate}
    onChange={(e) => setFromDate(e.target.value)}
    placeholder="From Date"
  />
  <input
    type="date"
    className="form-control form-control-sm"
    value={toDate}
    onChange={(e) => setToDate(e.target.value)}
    placeholder="To Date"
  />
  <button
    className="btn btn-outline-success btn-sm"
    onClick={downloadOrdersExcel}
  >
    📊 Export Orders
  </button>
</div>


        </div>

      {/* Order Stats */}
<div className="row g-4 mb-4">


  {/* Pending Orders */}
  <div className="col-xl-3 col-lg-4 col-md-6">
    <div 
      className="card border-0 shadow-sm cursor-pointer hover-lift"
      onClick={() => handleFilterOrders('Pending')}
      style={{
        background: 'linear-gradient(135deg, #f59e0b15 0%, transparent 100%)',
        borderLeft: '4px solid #f59e0b',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="p-3 rounded-circle" style={{ background: '#f59e0b20' }}>
            <RiTimeLine size={24} color="#f59e0b" />
          </div>
          <span className="text-muted small">
            <RiAlertLine className="me-1" />
            Needs attention
          </span>
        </div>
        <h2 className="fw-bold display-6 mb-1" style={{ color: '#f59e0b' }}>
          {orders.filter(o => o.status === "Pending").length}
        </h2>
        <p className="text-muted mb-0">Pending Orders</p>
        <div className="mt-3">
          <div className="progress" style={{ height: '4px' }}>
            <div 
              className="progress-bar" 
              style={{ 
                width: `${orders.length > 0 ? (orders.filter(o => o.status === "Pending").length / orders.length * 100) : 0}%`,
                backgroundColor: '#f59e0b'
              }}
            ></div>
          </div>
          <small className="text-muted mt-1 d-block">
            {orders.length > 0 ? Math.round((orders.filter(o => o.status === "Pending").length / orders.length * 100)) : 0}% of total
          </small>
        </div>
      </div>
    </div>
  </div>

  {/* Shipped Orders */}
  <div className="col-xl-3 col-lg-4 col-md-6">
    <div 
      className="card border-0 shadow-sm cursor-pointer hover-lift"
      onClick={() => handleFilterOrders('Shipped')}
      style={{
        background: 'linear-gradient(135deg, #0ea5e915 0%, transparent 100%)',
        borderLeft: '4px solid #0ea5e9',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="p-3 rounded-circle" style={{ background: '#0ea5e920' }}>
            <RiTruckLine size={24} color="#0ea5e9" />
          </div>
          <span className="text-success small fw-semibold">
            <RiArrowUpLine className="me-1" />
            In transit
          </span>
        </div>
        <h2 className="fw-bold display-6 mb-1" style={{ color: '#0ea5e9' }}>
          {orders.filter(o => o.status === "Shipped").length}
        </h2>
        <p className="text-muted mb-0">Shipped Orders</p>
        <div className="mt-3">
          <div className="progress" style={{ height: '4px' }}>
            <div 
              className="progress-bar" 
              style={{ 
                width: `${orders.length > 0 ? (orders.filter(o => o.status === "Shipped").length / orders.length * 100) : 0}%`,
                backgroundColor: '#0ea5e9'
              }}
            ></div>
          </div>
          <small className="text-muted mt-1 d-block">
            {orders.length > 0 ? Math.round((orders.filter(o => o.status === "Shipped").length / orders.length * 100)) : 0}% of total
          </small>
        </div>
      </div>
    </div>
  </div>

  {/* Delivered Orders */}
  <div className="col-xl-3 col-lg-4 col-md-6">
    <div 
      className="card border-0 shadow-sm cursor-pointer hover-lift"
      onClick={() => handleFilterOrders('Delivered')}
      style={{
        background: 'linear-gradient(135deg, #10b98115 0%, transparent 100%)',
        borderLeft: '4px solid #10b981',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="p-3 rounded-circle" style={{ background: '#10b98120' }}>
            <RiCheckboxCircleLine size={24} color="#10b981" />
          </div>
          <span className="text-success small fw-semibold">
            <RiCheckLine className="me-1" />
            Completed
          </span>
        </div>
        <h2 className="fw-bold display-6 mb-1" style={{ color: '#10b981' }}>
          {orders.filter(o => o.status === "Delivered").length}
        </h2>
        <p className="text-muted mb-0">Delivered Orders</p>
        <div className="mt-3">
          <div className="progress" style={{ height: '4px' }}>
            <div 
              className="progress-bar" 
              style={{ 
                width: `${orders.length > 0 ? (orders.filter(o => o.status === "Delivered").length / orders.length * 100) : 0}%`,
                backgroundColor: '#10b981'
              }}
            ></div>
          </div>
          <small className="text-muted mt-1 d-block">
            {orders.length > 0 ? Math.round((orders.filter(o => o.status === "Delivered").length / orders.length * 100)) : 0}% of total
          </small>
        </div>
      </div>
    </div>
  </div>

  {/* Cancelled Orders */}
  <div className="col-xl-3 col-lg-4 col-md-6">
    <div 
      className="card border-0 shadow-sm cursor-pointer hover-lift"
      onClick={() => handleFilterOrders('Canceled')}
      style={{
        background: 'linear-gradient(135deg, #ef444415 0%, transparent 100%)',
        borderLeft: '4px solid #ef4444',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="p-3 rounded-circle" style={{ background: '#ef444420' }}>
            <RiCloseCircleLine size={24} color="#ef4444" />
          </div>
          <span className="text-danger small fw-semibold">
            <RiArrowDownLine className="me-1" />
            Lost orders
          </span>
        </div>
        <h2 className="fw-bold display-6 mb-1" style={{ color: '#ef4444' }}>
          {orders.filter(o => o.status === "Canceled").length}
        </h2>
        <p className="text-muted mb-0">Canceled Orders</p>
        <div className="mt-3">
          <div className="progress" style={{ height: '4px' }}>
            <div 
              className="progress-bar" 
              style={{ 
                width: `${orders.length > 0 ? (orders.filter(o => o.status === "Canceled").length / orders.length * 100) : 0}%`,
                backgroundColor: '#ef4444'
              }}
            ></div>
          </div>
          <small className="text-muted mt-1 d-block">
            {orders.length > 0 ? Math.round((orders.filter(o => o.status === "Canceled").length / orders.length * 100)) : 0}% of total
          </small>
        </div>
      </div>
    </div>
  </div>
</div>



{/* Add this CSS to your existing style tag */}
<style jsx>{`
  .cursor-pointer {
    cursor: pointer;
  }
  .hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1) !important;
  }
  .progress {
    overflow: hidden;
  }
  .progress-bar {
    border-radius: 2px;
  }
`}</style>
{/* TOTAL ORDERS SUMMARY */}
<div className="row mb-4">
  <div className="col-12">
    <div
      className="card border-0 shadow-sm hover-lift"
      style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0.08) 100%)",

        borderLeft: "5px solid #6366f1",
      }}
    >
      <div className="card-body d-flex align-items-center justify-content-between p-4">
        <div className="d-flex align-items-center">
          <div
            className="p-3 rounded-circle me-3"
            style={{ background: "#6366f120" }}
          >
            <RiShoppingBag3Line size={28} color="#6366f1" />
          </div>
          <div>
            <h5 className="mb-1 fw-semibold text-muted">Total Orders</h5>
            <h2 className="fw-bold mb-0">{orders.length}</h2>
          </div>
        </div>

        <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2">
          All statuses included
        </span>
      </div>
    </div>
  </div>
</div>


        <div className="card shadow-lg rounded-4">
          <div className="card-header bg-dark text-white">
            <h5 className="mb-0">Orders List ({filteredOrders.length} orders)</h5>
          </div>
          <div className="table-responsive">
            <table className="table table-striped align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Phone</th>
<th>UTR</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.docId}>
                    <td className="fw-bold text-primary">{order.id}</td>
                    <td>{order.customer}</td>
                  
<td className="fw-bold text-secondary">{order.phone}</td>
<td>
  <code className="bg-light px-2 py-1">
    {order.utr}
  </code>
</td>

                    <td>{order.date ? new Date(order.date).toLocaleDateString() : "N/A"}</td>
                    <td>
                      <span className="badge bg-secondary">{order.items} items</span>
                    </td>
                    <td className="fw-bold">₹{order.total}</td>

                    <td>
                      <span
                        className={`badge ${statusClass(order.status)} px-3 py-2`}
                      >
                        {order.status}
                      </span>
                    </td>

                   <td className="text-center">
  <div className="d-flex justify-content-center align-items-center gap-2 flex-wrap">

    {/* ACCEPT BUTTON (Pending only) */}
    {order.status === "Pending" && (
      <button
        className="btn btn-success btn-sm d-flex align-items-center gap-1 shadow-sm"
        onClick={() => handleAcceptOrderWithRestock(order)}
        title="Accept Order"
      >
        <RiCheckLine />
        <span className="d-none d-md-inline">Accept</span>
      </button>
    )}

    {/* STATUS DROPDOWN */}
    <select
      className="form-select form-select-sm shadow-sm"
      style={{ width: "130px" }}
      value={order.status}
      onChange={(e) =>
        handleStatusChange(
          order.docId,
          order.customerId,
          e.target.value
        )
      }
    >
      <option value="Pending">Pending</option>
      <option value="Shipped">Shipped</option>
      <option value="Delivered">Delivered</option>
      <option value="Canceled">Canceled</option>
    </select>

    {/* VIEW BUTTON */}
    <button
      className="btn btn-outline-primary btn-sm shadow-sm"
      onClick={() =>
        setViewOrder({
          customerId: order.customerId,
          docId: order.docId,
        })
      }
      title="View Order"
    >
      <RiShoppingBag3Line />
    </button>

    {/* DELETE BUTTON */}
    <button
      className="btn btn-outline-danger btn-sm shadow-sm"
      onClick={() => setDeleteOrder(order)}
      title="Delete Order"
    >
      <RiCloseCircleLine />
    </button>
  </div>
</td>

                  </tr>
                ))}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      <div className="py-5">
                        <span className="fs-1">📦</span>
                        <p className="mt-2">No orders found</p>
                        {searchTerm && (
                          <small>Try adjusting your search term</small>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ✅ VIEW ORDER MODAL */}
        {viewOrder && (
          <ViewOrderModal
            order={viewOrder}
            onClose={() => setViewOrder(null)}
            onStatusChange={handleStatusChange}
            onAcceptOrder={handleAcceptOrder}
          />
        )}

        {/* ✅ DELETE MODAL */}
        {deleteOrder && (
          <ConfirmDeleteModal
            order={deleteOrder}
            onClose={() => setDeleteOrder(null)}
            onConfirm={handleDeleteOrder}
          />
        )}
      </div>
    </div>
  );
};

export default OrderPage;