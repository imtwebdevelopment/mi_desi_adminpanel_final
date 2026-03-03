import React, { useState, useEffect } from "react";
import { db, storage, collection, doc, setDoc, onSnapshot, deleteDoc } from "../firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const QRAdder = () => {
  const [qrData, setQrData] = useState(null); // Current QR from Firestore
  const [loading, setLoading] = useState(true);
  const [upiId, setUpiId] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState("");

  // 🔹 Fetch existing QR
  useEffect(() => {
    const qrCollection = collection(db, "qr");
    const unsubscribe = onSnapshot(qrCollection, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setQrData({ id: snapshot.docs[0].id, ...data });
      } else {
        setQrData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔹 Handle QR submit
  const handleAddQr = async (e) => {
    e.preventDefault();
    if (!upiId || !imageFile) {
      alert("Please provide UPI ID and QR image.");
      return;
    }

    try {
      // 1️⃣ Delete existing QR if exists
      if (qrData) {
        await deleteDoc(doc(db, "qr", qrData.id));
        if (qrData.imageUrl) {
          const oldRef = ref(storage, qrData.imageUrl);
          await deleteObject(oldRef).catch(() => {}); // ignore error if file not found
        }
        setMessage("Previous QR deleted. Adding new one...");
      }

      // 2️⃣ Upload new image to Firebase Storage
      const imageRef = ref(storage, `qr/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);

      // 3️⃣ Save QR info in Firestore
      const qrDocRef = doc(collection(db, "qr"));
      await setDoc(qrDocRef, {
        upiId,
        imageUrl,
        createdAt: new Date(),
      });

      // 4️⃣ Reset form
      setUpiId("");
      setImageFile(null);
      setShowAddModal(false);
      setMessage("New QR added successfully!");
    } catch (err) {
      console.error("Error adding QR:", err);
      alert(err.message || "Failed to add QR.");
    }
  };

  return (
    <div className="container p-4" style={{ paddingTop: "50px" }}>
      <h2 className="mb-4 fw-bold text-primary">QR Management</h2>

      {message && (
        <div className="alert alert-info">
          {message}
          <button className="btn-close float-end" onClick={() => setMessage("")}></button>
        </div>
      )}

      <div className="mb-3 d-flex justify-content-end">
        <button
          className="btn btn-gradient-primary rounded-pill px-4"
          onClick={() => setShowAddModal(true)}
        >
          + Add / Replace QR
        </button>
      </div>

      <div className="card shadow-lg rounded-4 p-3 text-center">
        {loading ? (
          <p>Loading...</p>
        ) : qrData ? (
          <>
            <p><strong>UPI ID:</strong> {qrData.upiId}</p>
            <img src={qrData.imageUrl} alt="QR Code" style={{ maxWidth: "200px" }} />
          </>
        ) : (
          <p className="text-muted">No QR uploaded yet.</p>
        )}
      </div>

      {/* Add QR Modal */}
      {showAddModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 shadow-lg border-0">
              <div className="modal-header bg-gradient-primary text-white rounded-top-4">
                <h5 className="modal-title fw-bold">➕ Add / Replace QR</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)} />
              </div>

              <form onSubmit={handleAddQr}>
                <div className="modal-body px-4 py-4">
                  {/* UPI ID */}
                  <div className="form-floating mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="UPI ID"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      required
                    />
                    <label>UPI ID</label>
                  </div>

                  {/* QR Image */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Upload QR Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control"
                      onChange={(e) => setImageFile(e.target.files[0])}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer border-0 px-4 pb-4">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-gradient-primary rounded-pill px-4">
                    Save QR
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .btn-gradient-primary {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: white;
        }
        .btn-gradient-primary:hover {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
        }
      `}</style>
    </div>
  );
};

export default QRAdder;