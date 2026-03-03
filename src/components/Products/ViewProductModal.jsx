import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const ViewProductModal = ({ product, onClose }) => {

  const formatAdditionalInfo = (infoText) => {
    if (!infoText || !infoText.trim())
      return [{ type: "text", content: "No additional information." }];

    const lines = infoText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const out = [];
    let q = 0;

    for (const line of lines) {
      const up = line.substring(0, 2).toUpperCase();

      if (up === "Q:" || up === "Q.") {
        q++;
        out.push({ type: "q", content: line.substring(2).trim(), index: q });
      } else if (up === "A:" || up === "A.") {
        out.push({ type: "a", content: line.substring(2).trim() });
      } else {
        out.push({ type: "text", content: line });
      }
    }
    return out;
  };

  const toINR = (val) => {
    if (val == null || isNaN(val)) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(val));
  };

  const parsePrice = (v) => {
    if (typeof v === "number") return v;
    const n = parseFloat(String(v).replace(/[₹,]/g, ""));
    return isNaN(n) ? 0 : n;
  };

  const mrp = parsePrice(product.price);
  const offerPrice = Number(product.offerPriceRaw ?? mrp);
  const savings = Math.max(0, mrp - offerPrice);
  const discountPct = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;

  const codYes = String(product.cashOnDelivery).toLowerCase() === "yes";

  const images = Array.isArray(product.imageUrl) ? product.imageUrl : [];
  const videos = Array.isArray(product.videoUrl) ? product.videoUrl : [];

  const primaryImage = images[0] || null;

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ background: "rgba(0,0,0,0.55)" }}
    >
      <div className="modal-dialog modal-xl">
        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">

          {/* HEADER */}
          <div className="modal-header border-0 text-white p-4"
            style={{
              background: "linear-gradient(135deg, #6d28d9, #0ea5e9)",
            }}
          >
            <h4 className="fw-bold mb-0">Product Overview</h4>
            <button
              className="btn-close btn-close-white"
              onClick={onClose}
            ></button>
          </div>

          {/* BODY */}
          <div className="modal-body p-0">

            {/* HERO SECTION */}
            <div
              className="p-4 d-flex justify-content-between align-items-center flex-wrap"
              style={{
                background: "linear-gradient(135deg, #7c3aed22, #0ea5e922)",
              }}
            >
              <div className="d-flex align-items-center gap-3">
                {primaryImage ? (
                  <img
                    src={primaryImage}
                    alt=""
                    className="rounded-circle shadow"
                    style={{
                      width: 90,
                      height: 90,
                      objectFit: "cover",
                      border: "3px solid #fff",
                    }}
                  />
                ) : (
                  <div
                    className="rounded-circle bg-white d-flex align-items-center justify-content-center shadow"
                    style={{ width: 90, height: 90, fontSize: "2rem" }}
                  >
                    📦
                  </div>
                )}

                <div>
                  <p className="small text-muted mb-1">
                    Product ID: {product.productId || product.id}
                  </p>

                  <h3 className="fw-bold mb-1">{product.name}</h3>

                  {product.isBestSelling && (
                    <span className="badge bg-danger px-3 py-2">
                      ❤️ Best Seller
                    </span>
                  )}
                </div>
              </div>

              {/* Price box */}
              <div
                className="p-3 rounded-4 text-end shadow-sm"
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  minWidth: 240,
                }}
              >
                <h3 className="fw-bold text-dark mb-1">
                  {toINR(offerPrice)}
                </h3>
                <p className="text-muted text-decoration-line-through mb-1">
                  {toINR(mrp)}
                </p>
                <span className="badge bg-success px-3 py-2 fw-bold">
                  Save {discountPct}% ({toINR(savings)})
                </span>
              </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="p-4">

              {/* --- GRID LAYOUT OF SECTION CARDS --- */}
              <div className="row g-4">

                {/* 1. PRICING & LOGISTICS */}
                <div className="col-md-6">
                  <div className="section-card">
                    <h6 className="section-title">Pricing & Logistics</h6>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between">
                        MRP <strong>{toINR(mrp)}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        Offer Price <strong>{toINR(offerPrice)}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        Savings <strong>{toINR(savings)}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        Tax Amount <strong>{product.taxAmount}%</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        Delivery Charges{" "}
                        <strong>{product.deliveryCharges || 0}</strong>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 2. INVENTORY */}
                <div className="col-md-6">
                  <div className="section-card">
                    <h6 className="section-title">Inventory & Status</h6>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between">
                        Stock Count <strong>{product.stockCount}</strong>
                      </li>

                      <li className="list-group-item d-flex justify-content-between">
                        Stock Status{" "}
                        <span
                          className={`badge px-3 py-2 ${
                            product.stockCount > 0
                              ? "bg-success"
                              : "bg-danger"
                          }`}
                        >
                          {product.stock}
                        </span>
                      </li>

                      <li className="list-group-item d-flex justify-content-between">
                        Cash on Delivery{" "}
                        <span
                          className={`badge px-3 py-2 ${
                            codYes ? "bg-success" : "bg-secondary"
                          }`}
                        >
                          {codYes ? "Yes" : "No"}
                        </span>
                      </li>

                      <li className="list-group-item d-flex justify-content-between">
                        Rating <strong>{product.rating} ⭐</strong>
                      </li>

                      <li className="list-group-item d-flex justify-content-between">
                        Seller ID <strong>{product.sellerId}</strong>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 3. CATEGORIZATION */}
                <div className="col-md-6">
                  <div className="section-card">
                    <h6 className="section-title">Categorization</h6>
                    <ul className="list-group list-group-flush">
                     <li className="list-group-item d-flex justify-content-between">
  Category <strong>{product.categoryName || "—"}</strong>
</li>

<li className="list-group-item d-flex justify-content-between">
  Subcategory <strong>{product.subCategoryName || "—"}</strong>
</li>


<li className="list-group-item d-flex justify-content-between">
  Brand <strong>{product.brandName || "—"}</strong>
</li>

<li className="list-group-item d-flex justify-content-between">
  Category ID <strong>{product.categoryId}</strong>
</li>

<li className="list-group-item d-flex justify-content-between">
  Subcategory ID <strong>{product.subCategoryId}</strong>
</li>

<li className="list-group-item d-flex justify-content-between">
  Brand ID <strong>{product.brandId}</strong>
</li>

                    </ul>
                  </div>
                </div>

                {/* 4. TECHNICAL DETAILS */}
                <div className="col-md-6">
                  <div className="section-card">
                    <h6 className="section-title">Technical Details</h6>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between">
                        Net Volume <strong>{product.quantity}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        Product Code <strong>{product.productCode || "—"}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        HSN Code <strong>{product.hsnCode || "—"}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        Shelf Life <strong>{product.shelfLife || "—"}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        Storage <strong>{product.storage || "—"}</strong>
                      </li>
                    </ul>
                  </div>
                </div>

              </div>

              {/* MANUFACTURING & MARKETING */}
              <div className="section-card mt-4">
                <h6 className="section-title">Manufacturing & Marketing</h6>
                <p><strong>Manufactured By:</strong> {product.manufacturedBy}</p>
                <p><strong>Marketed By:</strong> {product.marketedBy}</p>
              </div>

              {/* INGREDIENTS / DOSAGE / COMPOSITION */}
              <div className="section-card mt-4">
                <h6 className="section-title">Ingredients / Composition / Dosage</h6>
                <p><strong>Ingredients:</strong> {product.ingredients}</p>
                <p><strong>Composition:</strong> {product.composition}</p>
                <p><strong>Dosage:</strong> {product.dosage}</p>
              </div>

              {/* DESCRIPTION */}
              <div className="section-card mt-4">
                <h6 className="section-title">Description</h6>
                <p>{product.description || "No description provided."}</p>
              </div>

              {/* ADDITIONAL INFO */}
              <div className="section-card mt-4">
                <h6 className="section-title">Additional Information</h6>

                {formatAdditionalInfo(product.additionalInformation).map((item, i) => {
                  if (item.type === "q") {
                    return (
                      <p key={i} className="fw-bold text-primary">
                        {item.index}. {item.content}
                      </p>
                    );
                  }
                  if (item.type === "a") {
                    return (
                      <p key={i} className="ms-3 text-success small">
                        → {item.content}
                      </p>
                    );
                  }
                  return (
                    <p key={i} className="text-muted small">
                      {item.content}
                    </p>
                  );
                })}
              </div>

              {/* IMAGES */}
              <div className="section-card mt-4">
                <h6 className="section-title">Images</h6>
                {images.length === 0 ? (
                  <p className="text-muted">No images available.</p>
                ) : (
                  <div className="d-flex flex-wrap gap-4">
                    {images.map((src, i) => (
                      <div key={i} className="image-box shadow-sm">
                        <img src={src} alt="" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* VIDEOS */}
              <div className="section-card mt-4">
                <h6 className="section-title">Videos</h6>
                {videos.length === 0 ? (
                  <p className="text-muted">No videos available.</p>
                ) : (
                  <>
                    <video controls className="video-player">
                      <source src={videos[0]} type="video/mp4" />
                    </video>
                    <ul className="list-group mt-3">
                      {videos.map((v, i) => (
                        <li key={i} className="list-group-item d-flex justify-content-between">
                          <span className="text-truncate" style={{ maxWidth: "70%" }}>
                            {v}
                          </span>
                          <a href={v} target="_blank" className="btn btn-outline-primary btn-sm">
                            Open
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* KEYWORDS */}
              <div className="section-card mt-4 mb-4">
                <h6 className="section-title">Search Keywords</h6>
                <div className="d-flex flex-wrap gap-2">
                  {product.keywords?.length ? (
                    product.keywords.map((kw, i) => (
                      <span key={i} className="badge bg-info text-dark px-3 py-2">
                        #{kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted">No keywords generated.</span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* FOOTER */}
          <div className="modal-footer border-0 bg-light py-3">
            <button
              className="btn btn-secondary rounded-pill px-4"
              onClick={onClose}
            >
              Close
            </button>
          </div>

        </div>
      </div>

      {/* STYLES */}
      <style>{`
        .section-card {
          background: white;
          border-radius: 16px;
          padding: 22px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 16px rgba(0,0,0,0.05);
        }
        .section-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #475569;
          margin-bottom: 12px;
        }
        .image-box {
          width: 140px;
          height: 140px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        .image-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .video-player {
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default ViewProductModal;
