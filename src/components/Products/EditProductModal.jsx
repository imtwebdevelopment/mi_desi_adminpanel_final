import React, { useEffect, useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { db, collection, getDocs, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ---------------------- FETCH CATEGORY -------------------------
const useCategoryFetcher = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(collection(db, "category"));
        setCategories(
          snap.docs.map((d) => ({
            id: d.id,
            name: d.data().categoryName || "Unnamed Category",
          }))
        );
      } catch (err) {
        console.error("Category fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return { categories, loading };
};

// ------------------------ FETCH BRANDS -------------------------
const useBrandFetcher = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);



 useEffect(() => {
  const run = async () => {
    try {
      const snap = await getDocs(collection(db, "brands"));
      setBrands(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().brandName,
          categoryId: d.data().categoryId || "",
          subCategoryId: d.data().subCategoryId || "",
        }))
      );
    } catch (e) {
      console.error("Brand fetch error:", e);
    }
  };
  run();
}, []);

  return { brands,loading };
};

// ---------------------- MAIN EDIT MODAL ------------------------
const EditProductModal = ({ product, onClose, onSave }) => {
  const { categories, loading: loadingCategories } = useCategoryFetcher();
  const { brands, loading: loadingBrands } = useBrandFetcher();
  const [subCategories, setSubCategories] = useState([]);
const [filteredBrands, setFilteredBrands] = useState([]);


  const isMounted = useRef(true);
  useEffect(() => () => (isMounted.current = false), []);

  const extractPrice = (price) => {
    if (!price) return 0;
    if (typeof price === "number") return price;
    return Number(price.toString().replace(/₹|,/g, "")) || 0;
  };

  
const [form, setForm] = useState({
  id: product.id,

  title: product.name || "",
  description: product.description || "",

  price: extractPrice(product.price),
  offerPrice: Number(product.offerPriceRaw || product.offerPrice || 0),

  netVolume: product.netVolume || product.quantity || "",
  dosage: product.dosage || "",
  ingredients: product.ingredients || "",
  composition: product.composition || "",
  storage: product.storage || "",
  manufacturedBy: product.manufacturedBy || "",
  marketedBy: product.marketedBy || "",
  shelfLife: product.shelfLife || "",
  additionalInformation: product.additionalInformation || "",

  stock: Number(product.stockCount ?? 0),
  taxAmount: Number(product.taxAmount || 0),
  cashOnDelivery: product.cashOnDelivery || "Yes",
  isBestSelling: Boolean(product.isBestSelling),
  rating: Number(product.rating || 0),

  // ✅ CATEGORY
  categoryId: product.categoryId || "",
  categoryName: product.categoryName || "",

  // ✅ SUBCATEGORY (THIS WAS MISSING)
  subCategoryId: product.subCategoryId || "",
  subCategoryName: product.subCategoryName || "",

  // ✅ BRAND
  brandId: product.brandId || "",
  brandName: product.brandName || "",

  sellerid: product.sellerId || "",

  deliveryCharges: product.deliveryCharges || 0,
  productCode: product.productCode || "",
  hsnCode: product.hsnCode || "",

  imageUrl: Array.isArray(product.imageUrl) ? product.imageUrl : [],
  videoUrl: Array.isArray(product.videoUrl) ? product.videoUrl : [],
});


  const [imageFiles, setImageFiles] = useState([]);
  const [imageUrlsText, setImageUrlsText] = useState("");
  const [videoFiles, setVideoFiles] = useState([]);
  const [videoUrlsText, setVideoUrlsText] = useState("");

  const [isUploading, setIsUploading] = useState(false);

  
useEffect(() => {
  const fetchSubCategories = async () => {
    try {
      const snap = await getDocs(collection(db, "subcategories"));
      setSubCategories(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().subCategoryName,
          categoryId: d.data().categoryId || "", // optional
        }))
      );
    } catch (e) {
      console.error("Subcategory fetch error:", e);
    }
  };

  fetchSubCategories();
}, []);

useEffect(() => {
  if (!form.subCategoryId) {
    setFilteredBrands([]);
    return;
  }

  const matched = brands.filter(
    (b) =>
      b.categoryId === form.categoryId &&
      b.subCategoryId === form.subCategoryId
  );

  setFilteredBrands(matched);

  // reset brand when subcategory changes
  setForm((p) => ({
    ...p,
    brandId: "",
    brandName: "",
  }));
}, [form.subCategoryId, form.categoryId, brands]);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      return setForm((p) => ({ ...p, [name]: checked }));
    }

    if (name === "categoryId") {
      const cat = categories.find((c) => c.id === value);
      return setForm((p) => ({
        ...p,
        categoryId: value,
        categoryName: cat ? cat.name : "",
      }));
    }

    if (name === "brandId") {
      const b = brands.find((c) => c.id === value);
      return setForm((p) => ({
        ...p,
        brandId: value,
        brandName: b ? b.name : "",
      }));
    }

    const numericFields = [
      "price",
      "offerPrice",
      "taxAmount",
      "stock",
      "rating",
      "deliveryCharges",
    ];

    const newValue = numericFields.includes(name)
      ? value === "" ? "" : Number(value)
      : value;

    setForm((p) => ({ ...p, [name]: newValue }));
  };

  const splitUrls = (txt) =>
    txt
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter((s) => s.startsWith("http"));

  const uploadFiles = async (files, folder, accept = () => true) => {
    const urls = [];
    for (const file of files) {
      if (!accept(file)) continue;

      const path = `${folder}/${Date.now()}-${file.name}`;
      const r = ref(storage, path);

      await uploadBytes(r, file);
      const url = await getDownloadURL(r);

      urls.push(url);
    }
    return urls;
  };

  const removeImageAt = (i) =>
    setForm((p) => ({
      ...p,
      imageUrl: p.imageUrl.filter((_, idx) => idx !== i),
    }));

  const removeVideoAt = (i) =>
    setForm((p) => ({
      ...p,
      videoUrl: p.videoUrl.filter((_, idx) => idx !== i),
    }));

  // ✅ SAVE
  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.categoryId) return alert("Select category");
    if (!form.brandId) return alert("Select brand");

    setIsUploading(true);

    try {
      const newImageUploads = await uploadFiles(
        imageFiles,
        "products/images",
        (f) => f.type.startsWith("image/")
      );

      const newVideoUploads = await uploadFiles(
        videoFiles,
        "products/videos",
        (f) => f.name.toLowerCase().endsWith(".mp4")
      );

      const pastedImageUrls = splitUrls(imageUrlsText);
      const pastedVideoUrls = splitUrls(videoUrlsText);

      const imageUrl = [...form.imageUrl, ...newImageUploads, ...pastedImageUrls];
      const videoUrl = [...form.videoUrl, ...newVideoUploads, ...pastedVideoUrls];

      const finalData = {
        ...form,
        price: Number(form.price),
        offerPrice: Number(form.offerPrice),
        stock: Number(form.stock),
        taxAmount: Number(form.taxAmount),
        rating: Number(form.rating),
        deliveryCharges: Number(form.deliveryCharges),
        imageUrl,
        videoUrl,
      };

      await onSave(finalData);
      if (isMounted.current) onClose();
    } catch (err) {
      console.error("Edit save error:", err);
      alert("Failed to update product.");
    } finally {
      if (isMounted.current) setIsUploading(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content border-0 shadow-lg rounded-5 overflow-hidden">

          {/* HEADER */}
          <div className="modal-header" style={{ background: "#0dcaf0", color: "white" }}>
            <h5 className="modal-title fw-bold">Edit Product</h5>
            <button className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          {/* BODY */}
          <form onSubmit={handleSave}>
            <div className="modal-body p-4" style={{ maxHeight: "80vh", overflowY: "auto" }}>

              {/* SECTION CARD */}
              <div className="p-3 mb-4 bg-light border rounded-4">
                <h6 className="text-info fw-bold mb-3">Core</h6>

                <div className="row g-3">
                  <div className="col-md-6 form-floating">
                    <input
                      name="title"
                      className="form-control"
                      placeholder="Title"
                      value={form.title}
                      onChange={handleChange}
                      required
                    />
                    <label>Title</label>
                  </div>

                  <div className="col-md-6 form-floating">
                    <input
                      name="sellerid"
                      className="form-control"
                      placeholder="Seller ID"
                      value={form.sellerid}
                      readOnly
                      disabled
                    />
                    <label>Seller ID</label>
                  </div>

                  <div className="col-md-3 form-floating">
                    <input
                      type="number"
                      name="price"
                      className="form-control"
                      placeholder="Price"
                      value={form.price}
                      onChange={handleChange}
                      required
                    />
                    <label>Price</label>
                  </div>

                  <div className="col-md-3 form-floating">
                    <input
                      type="number"
                      name="offerPrice"
                      className="form-control"
                      placeholder="Offer Price"
                      value={form.offerPrice}
                      onChange={handleChange}
                    />
                    <label>Offer Price</label>
                  </div>

                  <div className="col-md-12">
                    <label>Description</label>
                    <textarea
                      name="description"
                      rows="3"
                      className="form-control"
                      value={form.description}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* CATEGORY CARD */}
              <div className="p-3 mb-4 bg-light border rounded-4">
                <h6 className="text-info fw-bold mb-3">Categorization</h6>
                <div className="row g-3">
 <div className="col-md-4">
  <label >Brand</label>
  <select
    className="form-select"
    name="brandId"
    value={form.brandId}
    onChange={(e) => {
      const b = brands.find((x) => x.id === e.target.value);
      setForm((p) => ({
        ...p,
        brandId: b?.id || "",
        brandName: b?.name || "",
      }));
    }}
  >
    <option value="">Select Brand</option>
    {brands.map((b) => (
      <option key={b.id} value={b.id}>
        {b.name}
      </option>
    ))}
  </select>
</div>

  {/* CATEGORY */}
  <div className="col-md-4">
    <label>Category</label>
    <select
      className="form-select"
      name="categoryId"
      value={form.categoryId}
      onChange={handleChange}
      required
    >
      <option value="">Select Category</option>
      {categories.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  </div>

  {/* SUBCATEGORY */}
  <div className="col-md-4">
    <label>Subcategory</label>
    <select
      className="form-select"
      value={form.subCategoryId}
      onChange={(e) => {
        const sub = subCategories.find(s => s.id === e.target.value);
        setForm(p => ({
          ...p,
          subCategoryId: sub?.id || "",
          subCategoryName: sub?.name || "",
        }));
      }}
    >
      <option value="">
        {form.categoryId ? "Select Subcategory" : "Select Category First"}
      </option>
      {subCategories.map(s => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  </div>

  {/* BRAND */}

</div>

              </div>

              {/* INVENTORY CARD */}
              <div className="p-3 mb-4 bg-light border rounded-4">
                <h6 className="text-info fw-bold mb-3">Inventory</h6>

                <div className="row g-3">
                  <div className="col-md-3 form-floating">
                    <input name="netVolume" className="form-control" placeholder="Net Volume" value={form.netVolume} onChange={handleChange} />
                    <label>Net Volume</label>
                  </div>

                  <div className="col-md-3 form-floating">
                    <input type="number" name="stock" className="form-control" placeholder="Stock" value={form.stock} onChange={handleChange} />
                    <label>Stock</label>
                  </div>

                  <div className="col-md-3 form-floating">
                    <input type="number" name="taxAmount" className="form-control" placeholder="Tax Amount" value={form.taxAmount} onChange={handleChange} />
                    <label>Tax %</label>
                  </div>

                  <div className="col-md-3">
                    <label>Cash on Delivery</label>
                    <select name="cashOnDelivery" className="form-select" value={form.cashOnDelivery} onChange={handleChange}>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div className="col-md-3 form-floating">
                    <input type="number" min="0" max="5" step="0.1" name="rating" className="form-control" placeholder="Rating" value={form.rating} onChange={handleChange} />
                    <label>Rating</label>
                  </div>

                  <div className="col-md-3 d-flex align-items-center gap-2">
                    <label className="me-3">Best Selling</label>
                    <div className="form-check form-switch">
                      <input type="checkbox" className="form-check-input" name="isBestSelling" checked={form.isBestSelling} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="col-md-3 form-floating">
                    <input type="number" name="deliveryCharges" className="form-control" placeholder="Delivery Charges" value={form.deliveryCharges} onChange={handleChange} />
                    <label>Delivery Charges</label>
                  </div>

                  <div className="col-md-3 form-floating">
                    <input name="productCode" className="form-control" placeholder="Product Code" value={form.productCode} onChange={handleChange} />
                    <label>Product Code</label>
                  </div>

                  <div className="col-md-3 form-floating">
                    <input name="hsnCode" className="form-control" placeholder="HSN Code" value={form.hsnCode} onChange={handleChange} />
                    <label>HSN Code</label>
                  </div>
                </div>
              </div>

              {/* DETAILS CARD */}
              <div className="p-3 mb-4 bg-light border rounded-4">
                <h6 className="text-info fw-bold mb-3">Details</h6>

                <div className="row g-3">
                  <div className="col-md-4 form-floating">
                    <input name="dosage" className="form-control" placeholder="Dosage" value={form.dosage} onChange={handleChange} />
                    <label>Dosage</label>
                  </div>

                  <div className="col-md-4 form-floating">
                    <input name="ingredients" className="form-control" placeholder="Ingredients" value={form.ingredients} onChange={handleChange} />
                    <label>Ingredients</label>
                  </div>

                  <div className="col-md-4 form-floating">
                    <input name="composition" className="form-control" placeholder="Composition" value={form.composition} onChange={handleChange} />
                    <label>Composition</label>
                  </div>

                  <div className="col-md-4 form-floating">
                    <input name="storage" className="form-control" placeholder="Storage" value={form.storage} onChange={handleChange} />
                    <label>Storage</label>
                  </div>

                  <div className="col-md-4 form-floating">
                    <input name="manufacturedBy" className="form-control" placeholder="Manufactured By" value={form.manufacturedBy} onChange={handleChange} />
                    <label>Manufactured By</label>
                  </div>

                  <div className="col-md-4 form-floating">
                    <input name="marketedBy" className="form-control" placeholder="Marketed By" value={form.marketedBy} onChange={handleChange} />
                    <label>Marketed By</label>
                  </div>

                  <div className="col-md-4 form-floating">
                    <input name="shelfLife" className="form-control" placeholder="Shelf Life" value={form.shelfLife} onChange={handleChange} />
                    <label>Shelf Life</label>
                  </div>

                  <div className="col-md-8">
                    <label>Additional Information</label>
                    <textarea
                      rows="3"
                      className="form-control"
                      name="additionalInformation"
                      value={form.additionalInformation}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* MEDIA CARD */}
              <div className="p-3 mb-4 bg-light border rounded-4">
                <h6 className="text-info fw-bold mb-3">Product Media</h6>

                <label className="fw-semibold">Current Images</label>
                <div className="d-grid mb-3" style={{ gridTemplateColumns: "repeat(auto-fill, 90px)", gap: "12px" }}>
                  {form.imageUrl.map((src, i) => (
                    <div key={i} className="position-relative">
                      <img src={src} className="rounded-3 shadow-sm border" style={{ width: 90, height: 90, objectFit: "cover" }} />
                      <button
                        type="button"
                        className="btn btn-danger btn-sm rounded-circle position-absolute top-0 end-0"
                        style={{ transform: "translate(40%, -40%)" }}
                        onClick={() => removeImageAt(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <label>Add Images</label>
                <input type="file" className="form-control" accept="image/*" multiple onChange={(e) => setImageFiles([...e.target.files])} />
                <textarea
                  className="form-control mt-2"
                  rows="2"
                  placeholder="Paste image URLs"
                  value={imageUrlsText}
                  onChange={(e) => setImageUrlsText(e.target.value)}
                />

                <hr />

                <label className="fw-semibold">Current Videos</label>
                <ul className="list-group mb-3">
                  {form.videoUrl.map((v, i) => (
                    <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                      <span className="text-truncate" style={{ maxWidth: 400 }}>{v}</span>
                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeVideoAt(i)}>Remove</button>
                    </li>
                  ))}
                </ul>

                <label>Add Videos</label>
                <input type="file" className="form-control" accept="video/mp4" multiple onChange={(e) => setVideoFiles([...e.target.files])} />
                <textarea
                  className="form-control mt-2"
                  rows="2"
                  placeholder="Paste video URLs"
                  value={videoUrlsText}
                  onChange={(e) => setVideoUrlsText(e.target.value)}
                />
              </div>
            </div>

            {/* FOOTER */}
            <div className="modal-footer bg-light">
              <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-info text-white rounded-pill px-4" disabled={isUploading}>
                {isUploading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default EditProductModal;
