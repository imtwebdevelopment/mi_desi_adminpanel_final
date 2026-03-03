import React, { useEffect, useState } from "react";
import FixedHeader from "../FixedHeader";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  db,
} from "../../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import AddProductModal from "./AddProductModal";
import EditProductModal from "./EditProductModal";
import ViewProductModal from "./ViewProductModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

/* Keyword generator */
const generateKeywords = (text) => {
  if (!text) return [];
  const words = text.toLowerCase().trim().split(" ");
  const keywords = new Set();
  words.forEach((word) => {
    let prefix = "";
    for (let i = 0; i < word.length; i++) {
      prefix += word[i];
      keywords.add(prefix);
    }
  });
  keywords.add(text.toLowerCase());
  return Array.from(keywords);
};

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editProduct, setEditProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [subCategories, setSubCategories] = useState([]);

const fetchAllProducts = async () => {
  try {
    setLoading(true);

    const snap = await getDocs(collection(db, "products"));

    const list = snap.docs.map((d) => {
      const data = d.data();

      const priceVal = Number(data.price || 0);
      const offerVal = Number(data.offerPrice ?? priceVal);

      const images = Array.isArray(data.imageUrl) ? data.imageUrl : [];

      const stockNum = Number(data.stock ?? data.productsCount ?? 0);

      return {
        id: d.id,
        productId: data.productId || d.id,

        image: images[0] || "📦",
        imageUrl: images,
        videoUrl: Array.isArray(data.videoUrl) ? data.videoUrl : [],

        name: data.title || "Unknown Product",
        price: `₹${priceVal.toFixed(2)}`,
        offerPriceRaw: offerVal,
        sale:
          priceVal > 0
            ? Math.round(((priceVal - offerVal) / priceVal) * 100)
            : 0,

        quantity: data.netVolume || "N/A",
        stockCount: stockNum,
        stock: stockNum > 0 ? "In stock" : "Out of stock",

        description: data.description || "",

        categoryId: data.categoryId || "",
        categoryName: data.categoryName || "N/A",

        subCategoryId: data.subCategoryId || "",
        subCategoryName: data.subCategoryName || "N/A",

        brandId: data.brandId || "",
        brandName: data.brandName || "N/A",

        sellerId: data.sellerId || "",
        taxAmount: Number(data.taxAmount || 0),

        keywords: data.keywords || [],
      };
    });

    setProducts(list);
  } catch (e) {
    console.error("Fetch products error:", e);
  } finally {
    setLoading(false);
  }
};


  /* Auth listener + fetch products */
  useEffect(() => {
    let unsubAuth;
    try {
      const auth = getAuth();
      unsubAuth = onAuthStateChanged(auth, (user) => setCurrentAdminUser(user));
    } catch (e) {
      console.error("Auth listener error:", e);
    }

    const fetchAll = async () => {
      try {
        const snap = await getDocs(collection(db, "products"));

        const list = snap.docs.map((d) => {
          const data = d.data();

          const priceVal = Number(data.price || 0);
          const offerVal = Number(data.offerPrice ?? priceVal);

          const images = Array.isArray(data.imageUrl) ? data.imageUrl : [];
          const primaryImage =
            images[0] ||
            (data.image?.startsWith("http") ? data.image : "📦");

          const stockNum = Number(data.stock ?? data.productsCount ?? 0);

          return {
            id: d.id,
            productId: data.productId || d.id,

            image: primaryImage,
            imageUrl: images,
            videoUrl: Array.isArray(data.videoUrl) ? data.videoUrl : [],

            name: data.title || "Unknown Product",
            price: `₹${priceVal.toFixed(2)}`,
            offerPriceRaw: offerVal,
            sale:
              priceVal > 0
                ? Math.round(((priceVal - offerVal) / priceVal) * 100)
                : 0,

            quantity: data.netVolume || "N/A",

            stockCount: stockNum,
            stock: stockNum > 0 ? "In stock" : "Out of stock",

            description: data.description || "",
            dosage: data.dosage || "",
            ingredients: data.ingredients || "",
            manufacturedBy: data.manufacturedBy || "",
            marketedBy: data.marketedBy || "",
            cashOnDelivery: data.cashOnDelivery || "No",
            composition: data.composition || "",
            additionalInformation: data.additionalInformation || "",
            shelfLife: data.shelfLife || "",

          categoryId: data.categoryId || "",
  categoryName: data.categoryName || "N/A",

  // ✅ SUBCATEGORY (FIX)
  subCategoryId: data.subCategoryId || "",
  subCategoryName: data.subCategoryName || "N/A",

  brandId: data.brandId || "",
  brandName: data.brandName || "N/A",

            sellerId: data.sellerId || "",

            taxAmount: Number(data.taxAmount || 0),
            storage: data.storage || "",
            isBestSelling: Boolean(data.isBestSelling),
            rating: Number(data.rating || 0),

            keywords: data.keywords || [],

            /* New fields */
            deliveryCharges: Number(data.deliveryCharges || 0),
            productCode: data.productCode || "",
            hsnCode: data.hsnCode || "",
          };
        });

        setProducts(list);
      } catch (e) {
        console.error("Fetch products error:", e);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    return () => unsubAuth && unsubAuth();
  }, []);

  /* Add product */
  const handleAddProduct = async (newProductData) => {
    try {
     const firestoreData = {
  ...newProductData,

  // ✅ CATEGORY
  categoryId: newProductData.categoryId,
  categoryName: newProductData.categoryName,

  // ✅ SUBCATEGORY (FIX)
  subCategoryId: newProductData.subCategoryId,
  subCategoryName: newProductData.subCategoryName,

  // ✅ BRAND
  brandId: newProductData.brandId,
  brandName: newProductData.brandName,

  price: Number(newProductData.price),
  offerPrice: Number(newProductData.offerPrice || 0),
  stock: Number(newProductData.stock),
  rating: Number(newProductData.rating || 0),
  taxAmount: Number(newProductData.taxAmount || 0),

  keywords: generateKeywords(newProductData.title),
};


      const docRef = await addDoc(collection(db, "products"), firestoreData);
      await updateDoc(docRef, { productId: docRef.id });

      const priceVal = firestoreData.price;
      const offerVal = firestoreData.offerPrice;

      const uiProduct = {
        id: docRef.id,
        productId: docRef.id,

        image: firestoreData.imageUrl?.[0] || "📦",
        imageUrl: firestoreData.imageUrl || [],
        videoUrl: firestoreData.videoUrl || [],

        name: firestoreData.title,
        price: `₹${priceVal.toFixed(2)}`,
        offerPriceRaw: offerVal,
        sale:
          priceVal > 0
            ? Math.round(((priceVal - offerVal) / priceVal) * 100)
            : 0,

        quantity: firestoreData.netVolume,
        stockCount: firestoreData.stock,
        stock: firestoreData.stock > 0 ? "In stock" : "Out of stock",

        description: firestoreData.description,
        dosage: firestoreData.dosage,
        ingredients: firestoreData.ingredients,
        manufacturedBy: firestoreData.manufacturedBy,
        marketedBy: firestoreData.marketedBy,
        cashOnDelivery: firestoreData.cashOnDelivery,
        composition: firestoreData.composition,
        additionalInformation: firestoreData.additionalInformation,
        shelfLife: firestoreData.shelfLife,

        categoryId: firestoreData.categoryId,
        brandId: firestoreData.brandId,
        categoryName: firestoreData.categoryName,
        brandName: firestoreData.brandName,

        sellerId: firestoreData.sellerId,
        taxAmount: firestoreData.taxAmount,
        storage: firestoreData.storage,
        isBestSelling: firestoreData.isBestSelling,
        rating: firestoreData.rating,

        keywords: firestoreData.keywords,

        /* New fields */
        deliveryCharges: firestoreData.deliveryCharges || 0,
        productCode: firestoreData.productCode || "",
        hsnCode: firestoreData.hsnCode || "",
      };

      setProducts((prev) => [...prev, uiProduct]);
      setShowAddModal(false);
    } catch (err) {
      console.error("Error adding product:", err);
      alert("Failed to add product.");
    }
  };

  /* Edit product */
  const handleEditProduct = async (updatedProductData) => {
    try {
      const productRef = doc(db, "products", updatedProductData.id);

    const firestoreData = {
  title: updatedProductData.title,

  // ✅ CATEGORY
  categoryId: updatedProductData.categoryId,
  categoryName: updatedProductData.categoryName,

  // ✅ SUBCATEGORY (FIX)
  subCategoryId: updatedProductData.subCategoryId,
  subCategoryName: updatedProductData.subCategoryName,

  // ✅ BRAND
  brandId: updatedProductData.brandId,
  brandName: updatedProductData.brandName,

  description: updatedProductData.description,
  price: Number(updatedProductData.price),
  offerPrice: Number(updatedProductData.offerPrice || 0),

  netVolume: updatedProductData.netVolume || "",
  dosage: updatedProductData.dosage || "",
  ingredients: updatedProductData.ingredients || "",

  stock: Number(updatedProductData.stock || 0),
  taxAmount: Number(updatedProductData.taxAmount || 0),

  imageUrl: updatedProductData.imageUrl || [],
  videoUrl: updatedProductData.videoUrl || [],

  keywords: generateKeywords(updatedProductData.title),
};

      await updateDoc(productRef, firestoreData);

      setProducts((prev) =>
        prev.map((p) =>
          p.id === updatedProductData.id
            ? {
                ...p,

                name: firestoreData.title,
                description: firestoreData.description,

                price: `₹${firestoreData.price.toFixed(2)}`,
                offerPriceRaw: firestoreData.offerPrice,

                sale:
                  firestoreData.price > 0
                    ? Math.round(
                        ((firestoreData.price -
                          firestoreData.offerPrice) /
                          firestoreData.price) *
                          100
                      )
                    : 0,

                quantity: firestoreData.netVolume,
                stockCount: firestoreData.stock,
                stock:
                  firestoreData.stock > 0 ? "In stock" : "Out of stock",

                imageUrl: firestoreData.imageUrl,
                videoUrl: firestoreData.videoUrl,
                image: firestoreData.imageUrl?.[0] || "📦",

                categoryId: firestoreData.categoryId,
                brandId: firestoreData.brandId,
                categoryName: firestoreData.categoryName,
                brandName: firestoreData.brandName,

                sellerId: firestoreData.sellerId,
                taxAmount: firestoreData.taxAmount,

                storage: firestoreData.storage,
                dosage: firestoreData.dosage,
                ingredients: firestoreData.ingredients,
                composition: firestoreData.composition,
                manufacturedBy: firestoreData.manufacturedBy,
                marketedBy: firestoreData.marketedBy,

                additionalInformation:
                  firestoreData.additionalInformation,

                rating: firestoreData.rating,
                isBestSelling: firestoreData.isBestSelling,

                deliveryCharges: firestoreData.deliveryCharges,
                productCode: firestoreData.productCode,
                hsnCode: firestoreData.hsnCode,

                keywords: firestoreData.keywords,
              }
            : p
        )
      );

      setEditProduct(null);
    } catch (e) {
      console.error("Update error:", e);
      alert("Failed to update product.");
    }
  };

  /* Delete */
  const handleDelete = async (productId) => {
    try {
      await deleteDoc(doc(db, "products", productId));
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setDeleteProduct(null);
    } catch (e) {
      console.error("Delete error:", e);
      alert("Failed to delete.");
    }
  };
const categories = [
  "All",
  ...Array.from(
    new Set(products.map((p) => p.categoryName).filter(Boolean))
  ),
];

 const displayedProducts = products.filter((p) => {
  const t = searchTerm.toLowerCase();

  const matchesSearch =
    p.name.toLowerCase().includes(t) ||
    p.id.toLowerCase().includes(t) ||
    (p.keywords && p.keywords.some((k) => k.includes(t)));

  const matchesCategory =
    selectedCategory === "All" ||
    p.categoryName === selectedCategory;

  return matchesSearch && matchesCategory;
});

  if (loading) {
    return (
      <div
        style={{ minHeight: "100vh", background: "#f1f3f6" }}
        className="d-flex justify-content-center align-items-center"
      >
        <h2 className="fw-bold text-primary">Loading Products...</h2>
      </div>
    );
  }

  const sellerId = currentAdminUser?.uid || "";

  return (
    <div style={{ minHeight: "100vh", background: "#f1f3f6" }}>
      <FixedHeader onSearchChange={setSearchTerm} />

      <div className="container-fluid p-4" style={{ paddingTop: "90px" }}>
        <h2 className="mb-4 fw-bold text-primary">Product Management</h2>

        

 <div className="d-flex justify-content-end align-items-center gap-3 mb-4 flex-wrap">

  <button
    className="btn btn-outline-secondary rounded-pill px-4 py-2 shadow-sm d-flex align-items-center gap-2"
    onClick={fetchAllProducts}
    disabled={loading}
  >
    <i className="bi bi-arrow-clockwise"></i>
    <span className="fw-semibold">
      {loading ? "Refreshing..." : "Refresh"}
    </span>
  </button>

  {/* Filter Dropdown */}
  <div className="dropdown">
    <button
      className="btn btn-outline-primary rounded-pill px-4 py-2 d-flex align-items-center gap-2 shadow-sm"
      type="button"
      data-bs-toggle="dropdown"
      aria-expanded="false"
    >
      <i className="bi bi-funnel-fill"></i>
      <span className="fw-semibold">{selectedCategory}</span>
      <i className="bi bi-chevron-down small"></i>
    </button>

    <ul className="dropdown-menu dropdown-menu-end shadow-lg rounded-3">
      {categories.map((cat) => (
        <li key={cat}>
          <button
            className={`dropdown-item d-flex align-items-center justify-content-between ${
              selectedCategory === cat ? "active fw-semibold" : ""
            }`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
            {selectedCategory === cat && (
              <i className="bi bi-check2 text-white"></i>
            )}
          </button>
        </li>
      ))}
    </ul>
  </div>

  {/* Add Product Button */}
  <button
    className="btn btn-primary rounded-pill px-4 py-2 shadow d-flex align-items-center gap-2"
    onClick={() => setShowAddModal(true)}
  >
    <i className="bi bi-plus-lg"></i>
    <span className="fw-semibold">Add New Product</span>
  </button>

</div>


    

        <div className="card shadow-lg border-0 rounded-4">
          <div className="table-responsive">
            <table className="table align-middle mb-0 table-hover">
              <thead className="table-light">
                <tr>
                  <th>Product</th>
                  <th>ID</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Sale</th>
                  <th>Stock</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {displayedProducts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-muted p-4">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  displayedProducts.map((product) => (
                    <tr key={product.id} className="hover-shadow">
                      <td>
                        <div className="d-flex align-items-center">
                          {product.image?.startsWith("http") ? (
                            <img
                              src={product.image}
                              alt=""
                              style={{
                                width: 40,
                                height: 40,
                                objectFit: "cover",
                              }}
                              className="me-3 rounded-circle shadow-sm"
                            />
                          ) : (
                            <div className="me-3 p-3 bg-light rounded-circle shadow-sm">
                              📦
                            </div>
                          )}

                          <span className="fw-semibold">{product.name}</span>
                        </div>
                      </td>

                      <td>{product.id}</td>
                      <td>{product.price}</td>
                      <td>{product.quantity}</td>

                      <td>
                        <span className="badge bg-success">
                          {product.sale}%
                        </span>
                      </td>

                      <td>
                        {product.stockCount > 0 ? (
                          <span className="badge bg-success">
                            In stock ({product.stockCount})
                          </span>
                        ) : (
                          <span className="badge bg-danger">Out of stock</span>
                        )}
                      </td>

                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => setViewProduct(product)}
                        >
                          👁️
                        </button>

                        <button
                          className="btn btn-sm btn-outline-info me-1"
                          onClick={() => setEditProduct(product)}
                        >
                          ✏️
                        </button>

                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteProduct(product)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showAddModal && (
          <AddProductModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddProduct}
            sellerId={sellerId}
          />
        )}

        {editProduct && (
          <EditProductModal
            product={editProduct}
            onClose={() => setEditProduct(null)}
            onSave={handleEditProduct}
          />
        )}

        {viewProduct && (
          <ViewProductModal
            product={viewProduct}
            onClose={() => setViewProduct(null)}
          />
        )}

        {deleteProduct && (
          <DeleteConfirmationModal
            product={deleteProduct}
            onClose={() => setDeleteProduct(null)}
            onConfirm={() => handleDelete(deleteProduct.id)}
          />
        )}
      </div>

      <style>{`
        .hover-shadow:hover {
          box-shadow: 0 10px 20px rgba(0,0,0,0.12);
          transition: all 0.3s ease-in-out;
        }
        .modal.show {
          overflow-x: hidden;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};

export default ProductList;
