import React, { useState } from "react";
import { db, collection, getDocs, doc, getDoc } from "../../firebase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const CUSTOMER_COLLECTION_NAME = "customers";
const ORDER_SUBCOLLECTION_NAME = "orders";
const ADDRESS_SUBCOLLECTION_NAME = "address";

const ExportOrdersButton = () => {
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const statusOptions = [
    { value: "All", label: "All Orders" },
    { value: "Pending", label: "Pending Orders" },
    { value: "Shipped", label: "Shipped Orders" },
    { value: "Delivered", label: "Delivered Orders" },
    { value: "Canceled", label: "Canceled/Rejected Orders" },
  ];

  // Helper function to fetch customer address
  const fetchCustomerAddress = async (customerId, addressId) => {
    try {
      if (!addressId) return null;
      
      const addressRef = doc(
        db,
        CUSTOMER_COLLECTION_NAME,
        customerId,
        ADDRESS_SUBCOLLECTION_NAME,
        addressId
      );
      
      const addressSnap = await getDoc(addressRef);
      if (addressSnap.exists()) {
        return addressSnap.data();
      }
    } catch (error) {
      console.error("Error fetching address:", error);
    }
    return null;
  };

  // Format address from address object
  const formatAddress = (addressData) => {
    if (!addressData) return "N/A";
    
    const parts = [];
    if (addressData.streetName) parts.push(addressData.streetName);
    if (addressData.city) parts.push(addressData.city);
    if (addressData.state) parts.push(addressData.state);
    if (addressData.pinCode) parts.push(addressData.pinCode);
    
    return parts.length > 0 ? parts.join(", ") : "N/A";
  };

  const downloadExcel = async () => {
    setLoading(true);

    try {
      const allOrders = [];
      const customersSnap = await getDocs(
        collection(db, CUSTOMER_COLLECTION_NAME)
      );

      console.log(`📊 Found ${customersSnap.docs.length} customers`);

      for (const customerDoc of customersSnap.docs) {
        const customerId = customerDoc.id;
        const customerData = customerDoc.data();

        // Fetch customer's address
        let customerAddress = null;
        if (customerData.addresses && customerData.addresses.length > 0) {
          // Get the first address or default address
          const addressId = customerData.addresses[0];
          customerAddress = await fetchCustomerAddress(customerId, addressId);
        }

        const ordersRef = collection(
          db,
          CUSTOMER_COLLECTION_NAME,
          customerId,
          ORDER_SUBCOLLECTION_NAME
        );
        
        const ordersSnap = await getDocs(ordersRef);

        console.log(`   Customer ${customerId}: ${ordersSnap.docs.length} orders`);

        for (const orderDoc of ordersSnap.docs) {
          const orderData = orderDoc.data();
          
          // Parse order date for filtering
          let orderDate = null;
          let orderDateObj = null;
          
          if (orderData.createdAt?.toDate) {
            orderDateObj = orderData.createdAt.toDate();
            orderDate = orderDateObj;
          } else if (orderData.orderDate?.toDate) {
            orderDateObj = orderData.orderDate.toDate();
            orderDate = orderDateObj;
          } else if (orderData.date) {
            orderDateObj = new Date(orderData.date);
            orderDate = orderDateObj;
          }

          // Apply date filter
          if (fromDate || toDate) {
            if (!orderDateObj) continue;
            
            if (fromDate) {
              const from = new Date(fromDate);
              from.setHours(0, 0, 0, 0);
              if (orderDateObj < from) continue;
            }
            
            if (toDate) {
              const to = new Date(toDate);
              to.setHours(23, 59, 59, 999);
              if (orderDateObj > to) continue;
            }
          }

          // Get order status and apply filter
          const orderStatus = orderData.status || orderData.orderStatus || "Pending";
          if (statusFilter !== "All" && orderStatus !== statusFilter) continue;

          // Get customer email
          const customerEmail = customerData.email || "N/A";

          // Get referral information
          const referredBy = customerData.referredBy || "Direct";
          const usedReferralCode = customerData.usedReferralCode || "None";

          // Get delivery address from order or customer
          let deliveryAddress = orderData.address || "N/A";
          if (deliveryAddress === "N/A" && customerAddress) {
            deliveryAddress = formatAddress(customerAddress);
          }

          // Process each product in the order
          if (orderData.products && Array.isArray(orderData.products)) {
            for (const item of orderData.products) {
              // Extract product details
              let productDetails = {};
              
              if (item.product && typeof item.product === 'object') {
                // Nested product structure
                const product = item.product;
                productDetails = {
                  productId: product.id || product.productId || product.docId || "N/A",
                  productName: product.title || product.name || product.productName || "Unknown Product",
                  productPrice: Number(product.offerPrice || product.price || 0),
                  quantity: Number(item.quantity || 1),
                  totalAmount: (Number(product.offerPrice || product.price || 0) * Number(item.quantity || 1))
                };
              } else {
                // Flat product structure
                productDetails = {
                  productId: item.productId || item.id || "N/A",
                  productName: item.productName || item.name || item.title || "Unknown Product",
                  productPrice: Number(item.offerPrice || item.price || 0),
                  quantity: Number(item.quantity || 1),
                  totalAmount: (Number(item.offerPrice || item.price || 0) * Number(item.quantity || 1))
                };
              }

              // Prepare the row data with all required fields
              allOrders.push({
                // Order Information
                "Order ID": orderData.orderId || orderDoc.id,
                "Order Status": orderStatus,
                "Order Date": orderDate ? orderDate.toLocaleDateString('en-IN') : "N/A",
                "Order Time": orderDate ? orderDate.toLocaleTimeString('en-IN') : "N/A",
                
                // Customer Information
                "Customer Name": customerData.name || "N/A",
                "Customer ID": customerId,
                "Mobile Number": orderData.phoneNumber || customerData.phoneNumber || "N/A",
                "Email": customerEmail,
                
                // Address Information
                "Delivery Address": deliveryAddress,
                "City": customerAddress?.city || "N/A",
                "State": customerAddress?.state || "N/A",
                "Pin Code": customerAddress?.pinCode || "N/A",
                "Street Name": customerAddress?.streetName || "N/A",
                "Address Title": customerAddress?.title || "N/A",
                "Latitude": customerAddress?.latitude || "N/A",
                "Longitude": customerAddress?.longitude || "N/A",
                
                // Referral Information
                "Referred By": referredBy,
                "Referral Person ID": referredBy,
                "Used Referral Code": usedReferralCode,
                
                // Product Information
                "Product ID": productDetails.productId,
                "Product Name": productDetails.productName,
                "Quantity": productDetails.quantity,
                "Unit Price (₹)": productDetails.productPrice.toFixed(2),
                "Product Total (₹)": productDetails.totalAmount.toFixed(2),
                
                // Payment Information
                "Payment Mode": orderData.paymentMode || 
                               (item.product?.cashOnDelivery === "Yes" ? "Cash on Delivery" : "Prepaid"),
                "Transaction ID": orderData.transactionId || orderData.transactionData?.transactionId || "N/A",
                "UTR Number": orderData.transactionId || orderData.transactionData?.transactionId || "N/A",
                
                // Order Totals
                "Order Subtotal (₹)": (Number(orderData.totalAmount || 0) - 
                                       Number(orderData.taxAmount || 0) - 
                                       Number(orderData.deliveryCharges || 0)).toFixed(2),
                "Tax Amount (₹)": Number(orderData.taxAmount || 0).toFixed(2),
                "Delivery Charges (₹)": Number(orderData.deliveryCharges || 0).toFixed(2),
                "Order Total Amount (₹)": Number(orderData.totalAmount || 0).toFixed(2),
              });
            }
          } else {
            // Handle orders without products array
            allOrders.push({
              "Order ID": orderData.orderId || orderDoc.id,
              "Order Status": orderStatus,
              "Order Date": orderDate ? orderDate.toLocaleDateString('en-IN') : "N/A",
              "Order Time": orderDate ? orderDate.toLocaleTimeString('en-IN') : "N/A",
              
              "Customer Name": customerData.name || "N/A",
              "Customer ID": customerId,
              "Mobile Number": orderData.phoneNumber || customerData.phoneNumber || "N/A",
              "Email": customerEmail,
              
              "Delivery Address": deliveryAddress,
              "City": customerAddress?.city || "N/A",
              "State": customerAddress?.state || "N/A",
              "Pin Code": customerAddress?.pinCode || "N/A",
              
              "Referred By": referredBy,
              "Referral Person ID": referredBy,
              "Used Referral Code": usedReferralCode,
              
              "Product Name": "Multiple Products",
              "Quantity": orderData.items || 1,
              "Order Total Amount (₹)": Number(orderData.totalAmount || 0).toFixed(2),
              
              "Transaction ID": orderData.transactionId || "N/A",
              "UTR Number": orderData.transactionId || "N/A",
            });
          }
        }
      }

      if (allOrders.length === 0) {
        alert("No orders found for the selected criteria");
        return;
      }

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(allOrders);
      
      // Auto-size columns
      const wscols = [];
      const headers = Object.keys(allOrders[0] || {});
      headers.forEach(() => {
        wscols.push({ wch: 20 }); // Set default width
      });
      worksheet['!cols'] = wscols;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Generate filename with filters
      let filename = `Orders_Detailed_Report`;
      if (statusFilter !== "All") {
        filename += `_${statusFilter}`;
      }
      if (fromDate && toDate) {
        filename += `_${fromDate}_to_${toDate}`;
      } else if (fromDate) {
        filename += `_from_${fromDate}`;
      } else if (toDate) {
        filename += `_until_${toDate}`;
      }
      filename += `_${new Date().toISOString().slice(0, 10)}.xlsx`;

      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders Details");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, filename);
      
      // Show summary
      const statusCounts = {};
      allOrders.forEach(order => {
        const status = order["Order Status"];
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      let summaryMessage = `✅ Export Complete!\n\n`;
      summaryMessage += `Total Order Items: ${allOrders.length}\n\n`;
      summaryMessage += `Breakdown by Status:\n`;
      Object.entries(statusCounts).forEach(([status, count]) => {
        summaryMessage += `• ${status}: ${count} items\n`;
      });
      
      alert(summaryMessage);
      
    } catch (error) {
      console.error("❌ Export failed:", error);
      alert(`Failed to export orders: ${error.message}`);
    } finally {
      setLoading(false);
      setShowFilters(false);
    }
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setStatusFilter("All");
  };

  return (
    <div className="export-orders-container">
      {showFilters ? (
        <div className="card shadow-lg mb-3" style={{ 
          position: 'absolute', 
          top: '60px', 
          right: '20px', 
          zIndex: 1000,
          width: '400px',
          background: 'white',
          borderRadius: '16px',
          border: 'none'
        }}>
          <div className="card-header bg-primary text-white py-3 rounded-top-4" 
               style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-funnel me-2"></i>
              Filter Orders for Export
            </h5>
          </div>
          <div className="card-body p-4">
            <div className="mb-4">
              <label className="form-label fw-semibold text-muted mb-2">
                <i className="bi bi-tag me-2"></i>
                Order Status
              </label>
              <select
                className="form-select form-select-lg rounded-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  border: '2px solid #e9ecef',
                  padding: '12px'
                }}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="row mb-4">
              <div className="col-md-6 mb-3 mb-md-0">
                <label className="form-label fw-semibold text-muted mb-2">
                  <i className="bi bi-calendar me-2"></i>
                  From Date
                </label>
                <input
                  type="date"
                  className="form-control form-control-lg rounded-3"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ border: '2px solid #e9ecef', padding: '12px' }}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold text-muted mb-2">
                  <i className="bi bi-calendar me-2"></i>
                  To Date
                </label>
                <input
                  type="date"
                  className="form-control form-control-lg rounded-3"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ border: '2px solid #e9ecef', padding: '12px' }}
                />
              </div>
            </div>

            <div className="d-flex gap-3">
              <button
                type="button"
                onClick={downloadExcel}
                disabled={loading}
                className="btn btn-success btn-lg flex-grow-1 rounded-3"
                style={{ padding: '12px', fontWeight: '600' }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-file-earmark-excel me-2"></i>
                    Export Report
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="btn btn-outline-secondary btn-lg rounded-3"
                style={{ padding: '12px 20px' }}
                title="Clear Filters"
              >
                <i className="bi bi-arrow-repeat"></i>
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="btn btn-outline-danger btn-lg rounded-3"
                style={{ padding: '12px 20px' }}
                title="Cancel"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {(fromDate || toDate || statusFilter !== "All") && (
              <div className="mt-4 p-3 bg-light rounded-3">
                <small className="text-muted d-block mb-2">
                  <i className="bi bi-info-circle me-2"></i>
                  Active Filters:
                </small>
                {statusFilter !== "All" && (
                  <small className="d-block text-primary">
                    • Status: {statusFilter}
                  </small>
                )}
                {fromDate && (
                  <small className="d-block text-primary">
                    • From: {new Date(fromDate).toLocaleDateString()}
                  </small>
                )}
                {toDate && (
                  <small className="d-block text-primary">
                    • To: {new Date(toDate).toLocaleDateString()}
                  </small>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          disabled={loading}
          className="btn btn-success btn-lg shadow-sm rounded-3"
          style={{
            background: 'linear-gradient(135deg, #198754 0%, #146c43 100%)',
            border: 'none',
            padding: '14px 28px',
            fontWeight: '600',
            fontSize: '1.1rem'
          }}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Processing...
            </>
          ) : (
            <>
              <i className="bi bi-file-earmark-excel me-2 fs-5"></i>
              📊 Export Detailed Orders Report
            </>
          )}
        </button>
      )}

      {/* Quick Export Buttons */}
      {!showFilters && (
        <div className="mt-3 d-flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("Pending");
              setShowFilters(true);
            }}
            className="btn btn-outline-warning btn-sm rounded-pill px-3"
          >
            <i className="bi bi-clock-history me-1"></i>
            Pending
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("Shipped");
              setShowFilters(true);
            }}
            className="btn btn-outline-info btn-sm rounded-pill px-3"
          >
            <i className="bi bi-truck me-1"></i>
            Shipped
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("Delivered");
              setShowFilters(true);
            }}
            className="btn btn-outline-success btn-sm rounded-pill px-3"
          >
            <i className="bi bi-check-circle me-1"></i>
            Delivered
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("Canceled");
              setShowFilters(true);
            }}
            className="btn btn-outline-danger btn-sm rounded-pill px-3"
          >
            <i className="bi bi-x-circle me-1"></i>
            Rejected
          </button>
        </div>
      )}

      <style jsx>{`
        .export-orders-container {
          position: relative;
          display: inline-block;
        }
        .card {
          animation: slideDown 0.3s ease;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .form-control-lg:focus, .form-select-lg:focus {
          border-color: #667eea !important;
          box-shadow: 0 0 0 0.25rem rgba(102,126,234,0.25) !important;
        }
        .btn-outline-warning:hover {
          background: #ffc107;
          color: white;
        }
        .btn-outline-info:hover {
          background: #0dcaf0;
          color: white;
        }
        .btn-outline-success:hover {
          background: #198754;
          color: white;
        }
        .btn-outline-danger:hover {
          background: #dc3545;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default ExportOrdersButton;