import React, { useEffect, useState } from "react";
import { db, doc, getDoc } from "../../firebase";
import "bootstrap/dist/css/bootstrap.min.css";
import html2pdf from "html2pdf.js";



/* ---------------- CONSTANTS ---------------- */
const CUSTOMER_COLLECTION_NAME = "customers";
const ORDER_SUBCOLLECTION_NAME = "orders";

const ViewOrderModal = ({ order, onClose }) => {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  /* ---------------- FETCH ORDER ---------------- */
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const orderRef = doc(
          db,
          CUSTOMER_COLLECTION_NAME,
          order.customerId,
          ORDER_SUBCOLLECTION_NAME,
          order.docId
        );

        const snap = await getDoc(orderRef);
        if (snap.exists()) {
          setOrderData(snap.data());
        }
      } catch (err) {
        console.error("❌ Fetch order error:", err);
      }
      setLoading(false);
    };

    fetchOrder();
  }, [order]);

  /* ---------------- UTILITY FUNCTIONS ---------------- */
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error("Copy failed:", err));
  };

  const formatDate = (date) => {
    if (!date?.toDate) return "N/A";
    const d = date.toDate();
    return d.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

 const downloadInvoicePDF = () => {
  const element = document.getElementById("print-area");

  if (!element) {
    alert("Invoice content not found");
    return;
  }

  const options = {
    margin: [0.5, 0.4, 0.5, 0.4], // top, left, bottom, right
    filename: `Invoice_${orderData?.orderId}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollY: 0
    },
    jsPDF: {
      unit: "in",
      format: "a4",
      orientation: "portrait"
    },
    pagebreak: {
      mode: ["css", "legacy"]
    }
  };

  html2pdf().set(options).from(element).save();
};



  const getStatusColor = (status) => {
    const statusLower = (status || "").toLowerCase();
    const colors = {
      'pending': 'warning',
      'processing': 'info',
      'shipped': 'primary',
      'delivered': 'success',
      'cancelled': 'danger',
      'completed': 'success'
    };
    return colors[statusLower] || 'secondary';
  };

  /* ---------------- PRICE CALCULATIONS ---------------- */
  const taxAmount =
    orderData?.products?.reduce(
      (sum, item) => sum + Number(item.product?.taxAmount || 0),
      0
    ) || 0;

  const deliveryCharges =
    orderData?.products?.reduce(
      (sum, item) => sum + Number(item.product?.deliveryCharges || 0),
      0
    ) || 0;

  const totalAmount = Number(orderData?.totalAmount || 0);
  const totalQuantity =
    orderData?.products?.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    ) || 0;

  const subtotal = totalAmount - taxAmount - deliveryCharges;

  if (!order) return null;


  return (
    <div className="modal show d-block" style={{ 
      background: "linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.8) 100%)",
      backdropFilter: "blur(5px)"
    }}>
      
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content rounded-4 shadow-lg border-0 overflow-hidden">
          
          {/* ENHANCED HEADER */}
          <div className="modal-header bg-gradient-primary text-white py-4 border-0" 
               style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <div className="d-flex align-items-center w-100">
              <div className="rounded-circle bg-white bg-opacity-25 p-3 me-3">
                <i className="bi bi-receipt fs-4"></i>
              </div>
              <div className="flex-grow-1">
                <h4 className="fw-bold mb-1">Order Details</h4>
                <p className="mb-0 opacity-75">Order ID: {orderData?.orderId || 'Loading...'}</p>
              </div>
              <button
                className="btn-close btn-close-white bg-white bg-opacity-25 p-2 rounded"
                onClick={onClose}
                aria-label="Close"
              />
            </div>
          </div>

          {/* BODY */}
          <div className="modal-body p-0" id="print-area">

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" style={{ width: "3rem", height: "3rem" }} role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3 text-muted fw-medium">Loading order details...</p>
              </div>
            ) : (
              <div className="p-4">
                {/* ORDER SUMMARY CARDS */}
                <div className="row g-4 mb-4">
                  {/* ORDER INFO CARD */}
                  <div className="col-lg-6">
                    <div
  className="card border-0 shadow-sm h-100"
  style={{ pageBreakInside: "avoid" }}
>

                      <div className="card-header bg-transparent border-0 pb-0">
                        <h5 className="fw-bold text-primary mb-0">
                          <i className="bi bi-info-circle me-2"></i>
                          Order Information
                        </h5>
                      </div>
                      <div className="card-body pt-3">
                        <div className="row">
                          <div className="col-6">
                            <p className="text-muted small mb-1">Order ID</p>
                           <p className="fw-bold" style={{ wordBreak: "break-all" }}>
  {orderData.orderId}
</p>

                          </div>
                          <div className="col-6">
                            <p className="text-muted small mb-1">Status</p>
                            <span className={`badge bg-${getStatusColor(orderData.orderStatus || orderData.status)} px-3 py-2 rounded-pill fw-medium`}>
                              {orderData.orderStatus || orderData.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="row mt-3">
                          <div className="col-6">
                            <p className="text-muted small mb-1">Order Date</p>
                            <p className="fw-medium">{formatDate(orderData.orderDate)}</p>
                          </div>
                          <div className="col-6">
                            <p className="text-muted small mb-1">Created At</p>
                            <p className="fw-medium">{formatDate(orderData.createdAt)}</p>
                          </div>
                        </div>

                        <div className="row mt-3">
                          <div className="col-6">
                            <p className="text-muted small mb-1">Payment Mode</p>
                           <p className="fw-medium">
  {orderData.products?.[0]?.product?.cashOnDelivery === "Yes" ? (
    <span className="badge bg-warning text-dark px-3 py-2 rounded-pill">
      <i className="bi bi-cash-coin me-1"></i>
      Cash on Delivery
    </span>
  ) : (
    <span className="badge bg-success px-3 py-2 rounded-pill">
      <i className="bi bi-credit-card me-1"></i>
      Prepaid
    </span>
  )}
</p>

                          </div>
                          <div className="col-6">
                            <p className="text-muted small mb-1">Total Quantity</p>
                            <p className="fw-bold h5 text-primary">{totalQuantity} items</p>
                          </div>
                        </div>

                        {orderData.transactionId && (
                          <div className="mt-3">
                            <p className="text-muted small mb-1">Transaction ID</p>
                            <div className="d-flex align-items-center gap-2">
                              <code className="bg-light px-3 py-2 rounded flex-grow-1">
                                {orderData.transactionId}
                              </code>
                              <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => copyToClipboard(orderData.transactionId)}
                                title="Copy Transaction ID"
                              >
                                <i className={`bi ${copied ? 'bi-check' : 'bi-copy'}`}></i>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CUSTOMER INFO CARD */}
                  <div className="col-lg-6">
                   <div
  className="card border-0 shadow-sm h-100"
  style={{ pageBreakInside: "avoid" }}
>
                        
                      <div className="card-header bg-transparent border-0 pb-0">
                        <h5 className="fw-bold text-primary mb-0">
                          <i className="bi bi-person-circle me-2"></i>
                          Customer Information
                        </h5>
                      </div>
                      <div className="card-body pt-3">
                        <div className="row">
                          <div className="col-6">
                            <p className="text-muted small mb-1">Phone Number</p>
                            <p className="fw-bold">{orderData.phoneNumber}</p>
                          </div>
                          <div className="col-6">
                            <p className="text-muted small mb-1">User ID</p>
                            <p className="fw-medium" style={{ wordBreak: "break-all" }}>
  {orderData.userId}
</p>

                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="d-flex justify-content-between align-items-start mb-1">
                            <p className="text-muted small mb-0">Delivery Address</p>
                            <button 
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => copyToClipboard(orderData.address)}
                              title="Copy Address"
                            >
                              <i className={`bi ${copied ? 'bi-check' : 'bi-copy'} me-1`}></i>
                              {copied ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <div className="bg-light p-3 rounded">
                            <p className="mb-0 fw-medium">{orderData.address}</p>
                          </div>
                        </div>

                        {orderData.latitude && orderData.longitude && (
                          <div className="mt-3">
                            <p className="text-muted small mb-1">Location Coordinates</p>
                            <div className="d-flex align-items-center gap-2">
                              <code className="bg-light px-3 py-2 rounded flex-grow-1">
                                {orderData.latitude.toFixed(6)}, {orderData.longitude.toFixed(6)}
                              </code>
                              <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => copyToClipboard(`${orderData.latitude}, ${orderData.longitude}`)}
                                title="Copy Coordinates"
                              >
                                <i className="bi bi-geo-alt"></i>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* PRODUCTS SECTION */}
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-transparent border-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="fw-bold text-primary mb-0">
                        <i className="bi bi-box-seam me-2"></i>
                        Products ({orderData.products?.length || 0})
                      </h5>
                      <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill">
                        Total Items: {totalQuantity}
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="row g-4">
                      {orderData.products?.map((item, index) => {
                        const p = item.product;
                        const itemTotal = (p.offerPrice * item.quantity).toFixed(2);

                        return (
                          <div key={index} className="col-12">
                            <div
  className="card border shadow-sm hover-shadow transition-all duration-300"
  style={{ pageBreakInside: "avoid" }}
>

                              <div className="card-body">
                                <div className="row align-items-center">
                                  {/* Product Image */}
                                  <div className="col-md-2 col-4">
                                    <div className="position-relative">
                                      <img
                                        src={p.imageUrl?.[0]}
                                        alt={p.title}
                                        className="img-fluid rounded-3"
                                        style={{
                                          height: "120px",
                                          width: "100%",
                                          objectFit: "cover",
                                          border: "2px solid #f0f0f0"
                                        }}
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.src = `https://via.placeholder.com/150x120/6c757d/ffffff?text=${encodeURIComponent(p.title?.charAt(0) || 'P')}`;
                                        }}
                                      />
                                      <span className="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-danger">
                                        {item.quantity}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Product Details */}
                                  <div className="col-md-6 col-8">
                                    <h6 className="fw-bold mb-2">{p.title}</h6>
                                    <div className="d-flex flex-wrap gap-2 mb-2">
                                      <span className="badge bg-primary bg-opacity-10 text-primary">
                                        {p.brandName}
                                      </span>
                                      <span className="badge bg-secondary bg-opacity-10 text-secondary">
                                        {p.categoryName}
                                      </span>
                                      <span className="badge bg-info bg-opacity-10 text-info">
                                        Stock: {p.stock}
                                      </span>
                                    </div>
                                    <div className="row small">
                                      <div className="col-6">
                                        <p className="mb-1">
                                          <span className="text-muted">Tax:</span>{" "}
                                          <span className="fw-medium">₹{p.taxAmount}</span>
                                        </p>
                                      </div>
                                      <div className="col-6">
                                        <p className="mb-1">
                                          <span className="text-muted">Delivery:</span>{" "}
                                          <span className="fw-medium">₹{p.deliveryCharges}</span>
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Price Details */}
                                  <div className="col-md-4">
                                    <div className="text-end">
                                      <div className="d-flex align-items-center justify-content-end mb-1">
                                        <span className="h5 fw-bold text-success mb-0">
                                          ₹{p.offerPrice}
                                        </span>
                                        {p.price > p.offerPrice && (
                                          <small className="text-muted ms-2">
                                            <s>₹{p.price}</s>
                                          </small>
                                        )}
                                      </div>
                                      <div className="text-muted small">
                                        Per item
                                      </div>
                                      <div className="mt-2">
                                        <p className="mb-0">
                                          <span className="text-muted">Item Total:</span>{" "}
                                          <span className="fw-bold h6 text-dark">₹{itemTotal}</span>
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* PRICE SUMMARY CARD */}
              <div
  className="card border-0 shadow-sm"
  style={{
    background: "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
    pageBreakInside: "avoid"
  }}
>

                  <div className="card-header bg-transparent border-0">
                    <h5 className="fw-bold text-primary mb-0">
                      <i className="bi bi-receipt-cutoff me-2"></i>
                      Price Summary
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row justify-content-center">
                      <div className="col-md-8 col-lg-6">
                        <div className="border rounded-3 p-4 bg-white shadow-sm">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="text-muted">Subtotal</span>
                            <span className="fw-bold">₹{subtotal.toFixed(2)}</span>
                          </div>
                          
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="text-muted">
                              <i className="bi bi-percent me-1"></i>
                              Tax Amount
                            </span>
                            <span className="fw-bold text-warning">₹{taxAmount.toFixed(2)}</span>
                          </div>
                          
                          <div className="d-flex justify-content-between align-items-center mb-4">
                            <span className="text-muted">
                              <i className="bi bi-truck me-1"></i>
                              Delivery Charges
                            </span>
                            <span className="fw-bold text-info">₹{deliveryCharges.toFixed(2)}</span>
                          </div>
                          
                          <hr className="my-3" />
                          
                          <div className="d-flex justify-content-between align-items-center pt-2">
                            <div>
                              <h5 className="fw-bold mb-0">Total Amount</h5>
                              <small className="text-muted">Including all charges</small>
                            </div>
                            <div className="text-end">
                              <h2 className="fw-bold text-primary mb-0">₹{totalAmount.toFixed(2)}</h2>
                              <small className="text-success">
                                <i className="bi bi-check-circle me-1"></i>
                                Amount paid successfully
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ENHANCED FOOTER */}
          <div className="modal-footer border-0 bg-light py-3">
            <div className="d-flex gap-3 w-100">
              <button 
                className="btn btn-outline-secondary rounded-pill px-4 py-2 flex-grow-1"
                onClick={onClose}
              >
                <i className="bi bi-x-circle me-2"></i>
                Close
              </button>
          <button 
  className="btn btn-primary rounded-pill px-4 py-2 flex-grow-1"
  onClick={downloadInvoicePDF}
>
  <i className="bi bi-file-earmark-pdf me-2"></i>
  Download Invoice PDF
</button>


              
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ViewOrderModal;