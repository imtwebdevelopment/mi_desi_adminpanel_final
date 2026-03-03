import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { db, collection, getDocs, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";



 
/* CATEGORY FETCH */
const useCategoryFetcher = () => {
  const [categories, setCategories] = useState([]);

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
      } catch (e) {
        console.error("Category fetch error:", e);
      }
    };
    run();
  }, []);

  return { categories };
};

const useBrandFetcher = () => {
  const [brands, setBrands] = useState([]);

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

  return { brands };
};

/* CREATE KEYWORDS */
const generateKeywords = (title) => {
  if (!title) return [];
  const words = title.toLowerCase().split(" ");
  const keys = [];
  words.forEach((w) => {
    for (let i = 1; i <= w.length; i++) {
      keys.push(w.substring(0, i));
    }
  });
  return keys;
};

const AddProductModal = ({ onClose, onAdd, sellerId }) => {
  const { categories } = useCategoryFetcher();
  const { brands } = useBrandFetcher();

   const [subCategories, setSubCategories] = useState([]);

  const [filteredBrands, setFilteredBrands] = useState([]);

  /* MEDIA STATE */
const [form, setForm] = useState({
  title: "",
  description: "",
  price: "",
  offerPrice: "",
  stock: "",
  taxAmount: "",

  categoryId: "",
  categoryName: "",

  subCategoryId: "",
  subCategoryName: "",

  brandId: "",
  brandName: "",

  cashOnDelivery: "Yes",
  isBestSelling: false,
  rating: "",

  deliveryCharges: "",
  productCode: "",
  hsnCode: "",
  sellerid: sellerId || "",
});


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



  /* ON CHANGE */
  const handleChange = (e) => {
    const { name, checked, value, type } = e.target;

    if (type === "checkbox") {
      setForm((p) => ({ ...p, [name]: checked }));
      return;
    }

if (name === "categoryId") {
  const c = categories.find((x) => x.id === value);

  setForm((p) => ({
    ...p,
    categoryId: value,
    categoryName: c?.name || "",
    subCategoryId: "",
    subCategoryName: "",
  }));
  return;
}


    if (name === "brandId") {
      const b = brands.find((x) => x.id === value);
      setForm((p) => ({
        ...p,
        brandId: value,
        brandName: b?.name || "",
      }));
      return;
    }

   const numeric = ["price", "offerPrice", "stock", "rating", "taxAmount", "deliveryCharges"];

setForm((p) => ({
  ...p,
  [name]: numeric.includes(name)
    ? value === ""
      ? ""
      : Number(value)
    : value,
}));
  };

  const [useImageUpload, setUseImageUpload] = useState(true);
  const [useVideoUpload, setUseVideoUpload] = useState(true);

  const [imageFiles, setImageFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);

  const [imageUrlsText, setImageUrlsText] = useState("");
  const [videoUrlsText, setVideoUrlsText] = useState("");

  const [isUploading, setIsUploading] = useState(false);
 

  const splitUrls = (txt) =>
    txt
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => s.startsWith("http"));

  const uploadFiles = async (files, folder, valid) => {
    const arr = [];
    for (const file of files) {
      if (!valid(file)) continue;

      const path = `${folder}/${Date.now()}_${file.name}`;
      const rf = ref(storage, path);

      await uploadBytes(rf, file);
      arr.push(await getDownloadURL(rf));
    }
    return arr;
  };

  /* SUBMIT */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const pastedImages = splitUrls(imageUrlsText);
      const uploadedImages = useImageUpload
        ? await uploadFiles(imageFiles, "products/images", (f) => f.type.startsWith("image/"))
        : [];

      const pastedVideos = splitUrls(videoUrlsText);
      const uploadedVideos = useVideoUpload
        ? await uploadFiles(videoFiles, "products/videos", (f) => f.type === "video/mp4")
        : [];

      const finalData = {
        ...form,
        imageUrl: [...uploadedImages, ...pastedImages],
        videoUrl: [...uploadedVideos, ...pastedVideos],
        keywords: generateKeywords(form.title),
      };

      await onAdd(finalData);
    } catch (err) {
      alert("Error adding product");
    } finally {
      setIsUploading(false);
    }
  };

  const imagePreviews = [
    ...imageFiles.map((f) => URL.createObjectURL(f)),
    ...splitUrls(imageUrlsText),
  ];

  return (
    <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "18px" }}>
          
          <div className="modal-header py-3 bg-light">
            <h5 className="modal-title text-primary fw-bold fs-4">Add Product</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">

              {/* BASIC DETAILS */}
              <div className="p-4 shadow-sm rounded-3 mb-4 bg-light">
                <h6 className="text-primary fw-bold mb-3">Basic Details</h6>
                <div className="row g-3">

                  <div className="col-md-6">
                    <label className="form-label">Title</label>
                    <input
                      className="form-control"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Price</label>
                    <input
                      type="number"
                      className="form-control"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Offer Price</label>
                    <input
                      type="number"
                      className="form-control"
                      name="offerPrice"
                      value={form.offerPrice}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Seller ID</label>
                    <input
                      className="form-control bg-light"
                      value={form.sellerid}
                      readOnly
                      disabled
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Description</label>
                    <textarea
                      rows="3"
                      className="form-control"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                    />
                  </div>

                </div>
              </div>

      <div className="p-4 shadow-sm rounded-3 mb-4 bg-light">
  <h6 className="text-primary fw-bold mb-3">
    Category, Subcategory & Brand
  </h6>

  <div className="row g-3">


 <div className="col-md-4">
  <label className="form-label">Brand</label>
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
      <label className="form-label">Category</label>
      <select
        className="form-select"
        name="categoryId"
        value={form.categoryId}
        onChange={handleChange}
      >
        <option value="">Select Category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>

    {/* SUBCATEGORY */}
    <div className="col-md-4">
  <label className="form-label">Subcategory</label>
  <select
    className="form-select"
    value={form.subCategoryId}
    onChange={(e) => {
      const sub = subCategories.find((s) => s.id === e.target.value);
      setForm((p) => ({
        ...p,
        subCategoryId: sub?.id || "",
        subCategoryName: sub?.name || "",
      }));
    }}
  >
    <option value="">Select Subcategory</option>
    {subCategories.map((s) => (
      <option key={s.id} value={s.id}>
        {s.name}
      </option>
    ))}
  </select>
</div>

  {/* BRAND */}



  </div>
</div>



              {/* INVENTORY */}
              <div className="p-4 shadow-sm rounded-3 mb-4 bg-light">
                <h6 className="text-primary fw-bold mb-3">Inventory</h6>

                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Product Weight</label>
                    <input
                      className="form-control"
                      name="netVolume"
                      value={form.netVolume}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Stock</label>
                    <input
                      type="number"
                      className="form-control"
                      name="stock"
                      value={form.stock}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Tax (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="taxAmount"
                      value={form.taxAmount}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Rating (0-5)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="rating"
                      min="0"
                      max="5"
                      step="0.1"
                      value={form.rating}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* DETAILS */}
              <div className="p-4 shadow-sm rounded-3 mb-4 bg-light">
                <h6 className="text-primary fw-bold mb-3">Product Details</h6>

                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Dosage</label>
                    <input
                      className="form-control"
                      name="dosage"
                      value={form.dosage}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Ingredients</label>
                    <input
                      className="form-control"
                      name="ingredients"
                      value={form.ingredients}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Composition</label>
                    <input
                      className="form-control"
                      name="composition"
                      value={form.composition}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Storage</label>
                    <input
                      className="form-control"
                      name="storage"
                      value={form.storage}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Manufactured By</label>
                    <input
                      className="form-control"
                      name="manufacturedBy"
                      value={form.manufacturedBy}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Marketed By</label>
                    <input
                      className="form-control"
                      name="marketedBy"
                      value={form.marketedBy}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Shelf Life</label>
                    <input
                      className="form-control"
                      name="shelfLife"
                      value={form.shelfLife}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-8">
                    <label className="form-label">Additional Info</label>
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

              {/* ADDITIONAL SETTINGS */}
              <div className="p-4 shadow-sm rounded-3 mb-4 bg-light">
                <h6 className="text-primary fw-bold mb-3">Additional Product Settings</h6>

                <div className="row g-3">

                  <div className="col-md-4">
                    <label className="form-label">Delivery Charges</label>
                    <input
                      type="number"
                      className="form-control"
                      name="deliveryCharges"
                      value={form.deliveryCharges}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Product Code</label>
                    <input
                      className="form-control"
                      name="productCode"
                      value={form.productCode}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">HSN Code</label>
                    <input
                      className="form-control"
                      name="hsnCode"
                      value={form.hsnCode}
                      onChange={handleChange}
                    />
                  </div>

                  {/* ✅ BEST SELLING SWITCH */}
                  <div className="col-md-4 d-flex align-items-center">
                    <div className="form-check form-switch mt-4">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="isBestSelling"
                        checked={form.isBestSelling}
                        onChange={handleChange}
                      />
                      <label className="ms-2 fw-semibold">Best Selling</label>
                    </div>
                  </div>

                  {/* ✅ CASH ON DELIVERY SWITCH */}
                  <div className="col-md-4 d-flex align-items-center">
                    <div className="form-check form-switch mt-4">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={form.cashOnDelivery === "Yes"}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            cashOnDelivery: e.target.checked ? "Yes" : "No",
                          }))
                        }
                      />
                      <label className="ms-2 fw-semibold">Cash On Delivery</label>
                    </div>
                  </div>

                </div>
              </div>

              {/* IMAGES */}
              <div className="p-4 shadow-sm rounded-3 mb-4 bg-light">
                <h6 className="text-primary fw-bold mb-3">Product Images</h6>

                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="d-flex justify-content-between">
                      <label className="form-label">Upload Images</label>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={useImageUpload}
                        onChange={() => setUseImageUpload((p) => !p)}
                      />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control"
                      multiple
                      disabled={!useImageUpload}
                      onChange={(e) => setImageFiles([...e.target.files])}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Paste Image URLs</label>
                    <textarea
                      rows="3"
                      className="form-control"
                      value={imageUrlsText}
                      onChange={(e) => setImageUrlsText(e.target.value)}
                    />
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="col-md-12 mt-3 d-flex flex-wrap gap-3">
                      {imagePreviews.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt=""
                          className="border rounded shadow-sm"
                          style={{ width: 100, height: 100, objectFit: "cover" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* VIDEOS */}
              <div className="p-4 shadow-sm rounded-3 bg-light">
                <h6 className="text-primary fw-bold mb-3">Product Videos</h6>

                <div className="row g-3">

                  <div className="col-md-6">
                    <div className="d-flex justify-content-between">
                      <label className="form-label">Upload Videos</label>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={useVideoUpload}
                        onChange={() => setUseVideoUpload((p) => !p)}
                      />
                    </div>
                    <input
                      type="file"
                      accept="video/mp4"
                      className="form-control"
                      multiple
                      disabled={!useVideoUpload}
                      onChange={(e) => setVideoFiles([...e.target.files])}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Paste Video URLs</label>
                    <textarea
                      rows="3"
                      className="form-control"
                      value={videoUrlsText}
                      onChange={(e) => setVideoUrlsText(e.target.value)}
                    />
                  </div>

                </div>
              </div>

            </div>

            <div className="modal-footer bg-light">
              <button className="btn btn-outline-secondary px-4 rounded-pill" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary px-4 rounded-pill">
                {isUploading ? "Uploading..." : "Add Product"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;
