import React, { useEffect, useState } from "react";
import {
  db,
  storage,
  addDoc,
  collection,
  getDocs,
} from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const AddBannerModal = ({ setShowAddModal, setLoading }) => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productId, setProductId] = useState("");
  const [image, setImage] = useState(null);
  const [fetching, setFetching] = useState(true);

  // ✅ Fetch all products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("Fetched products:", productList); // 👈 check console
        setProducts(productList);
      } catch (error) {
        console.error("Error fetching products:", error);
        alert("Failed to load products from Firestore.");
      } finally {
        setFetching(false);
      }
    };

    fetchProducts();
  }, []);

  // ✅ When product selected, auto-fill ID
  const handleProductChange = (e) => {
    const selectedName = e.target.value;
    setSelectedProduct(selectedName);
    const selected = products.find(
      (p) => p.name === selectedName || p.title === selectedName
    );
    if (selected) setProductId(selected.id);
  };

  // ✅ Submit banner
  const handleSubmit = async () => {
    if (!productId || !image)
      return alert("Please select a product and upload an image.");

    try {
      setLoading(true);
      const imgRef = ref(storage, `banners/${image.name}-${Date.now()}`);
      await uploadBytes(imgRef, image);
      const imageUrl = await getDownloadURL(imgRef);

      await addDoc(collection(db, "banners"), {
        productId,
        imageUrl,
        createdAt: new Date(),
      });

      alert("✅ Banner added successfully!");
      setShowAddModal(false);
    } catch (error) {
      console.error("Error adding banner:", error);
      alert("Failed to add banner.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal show fade d-block"
      tabIndex="-1"
      role="dialog"
      style={{ background: "#00000080" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-4">
          <div className="modal-header">
            <h5 className="modal-title">Add New Banner</h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowAddModal(false)}
            ></button>
          </div>

          <div className="modal-body">
            {/* Product Dropdown */}
            <label className="form-label fw-semibold">Select Product</label>
            {fetching ? (
              <p className="text-muted">Loading products...</p>
            ) : products.length === 0 ? (
              <p className="text-danger">No products found in Firestore.</p>
            ) : (
              <select
                className="form-select mb-3"
                value={selectedProduct}
                onChange={handleProductChange}
              >
                <option value="">-- Choose a product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.name || p.title || "Unnamed"}>
                    {p.name || p.title || "Unnamed Product"}
                  </option>
                ))}
              </select>
            )}

            {/* Auto-filled Product ID */}
            <input
              type="text"
              value={productId}
              readOnly
              className="form-control mb-3"
              placeholder="Product ID (auto-filled)"
            />

            {/* Image Upload */}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="form-control"
            />
          </div>

          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              Save Banner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBannerModal;
