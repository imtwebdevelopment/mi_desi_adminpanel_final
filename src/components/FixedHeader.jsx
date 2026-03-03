import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/fixedheader.css";

import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "./Auth/authContext";

const FixedHeader = ({ onSearchChange }) => {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  /* --------------------------------------------------
     FETCH NAME BASED ON ROLE (ADMIN / EMPLOYEE)
  -------------------------------------------------- */
  useEffect(() => {
    if (!user?.uid) return;

    const fetchUserDetails = async () => {
      try {
        // 🔍 Admin
        const adminQuery = query(
          collection(db, "admins"),
          where("uid", "==", user.uid)
        );
        const adminSnap = await getDocs(adminQuery);

        if (!adminSnap.empty) {
          setUserData({ role: "admin", ...adminSnap.docs[0].data() });
          return;
        }

        // 🔍 Employee
        const partnerQuery = query(
          collection(db, "partners"),
          where("uid", "==", user.uid)
        );
        const partnerSnap = await getDocs(partnerQuery);

        if (!partnerSnap.empty) {
          setUserData({ role: "employee", ...partnerSnap.docs[0].data() });
        }
      } catch (error) {
        console.error("❌ Error fetching user data:", error);
      }
    };

    fetchUserDetails();
  }, [user]);

  /* --------------------------------------------------
     HELPERS
  -------------------------------------------------- */
  const toggleDetails = () => setShowDetails((prev) => !prev);

  const handleSearchInput = (e) => {
    if (onSearchChange) onSearchChange(e.target.value.toLowerCase());
  };

  const displayName = userData?.name || "User";
  const displayEmail = userData?.email || user?.email || "N/A";
  const displayRole = userData?.role || "user";
  const initial = displayName.charAt(0).toUpperCase();

  /* --------------------------------------------------
     UI
  -------------------------------------------------- */
  return (
    <header className="fixed-header shadow-sm bg-white">
      <div className="container-fluid d-flex justify-content-between align-items-center py-2 px-3">

        {/* 🔍 SEARCH WITH ICON */}
        <div className="flex-grow-1 mx-3 position-relative" style={{ maxWidth: 600 }}>
          <span
            className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
            style={{ pointerEvents: "none" }}
          >
            🔍
          </span>

          <input
            type="search"
            className="form-control rounded-pill ps-5"
            placeholder="Search anything..."
            onChange={handleSearchInput}
          />
        </div>

        {/* 👤 PROFILE */}
        <div className="position-relative">
          {/* INITIAL AVATAR */}
          <div
            onClick={toggleDetails}
            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
            style={{
              width: 42,
              height: 42,
              cursor: "pointer",
              fontSize: 18,
              background:
                displayRole === "admin"
                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                  : "linear-gradient(135deg, #6366f1, #4f46e5)",
              userSelect: "none",
            }}
          >
            {initial}
          </div>

          {/* DROPDOWN */}
          {showDetails && (
            <div
              className="position-absolute end-0 mt-2 bg-white border rounded-4 shadow p-3"
              style={{ width: 240, zIndex: 1050 }}
            >
              <p className="fw-bold mb-1 text-capitalize">{displayName}</p>
              <p className="text-muted small mb-2">{displayEmail}</p>

              <span
                className={`badge ${
                  displayRole === "admin" ? "bg-danger" : "bg-primary"
                }`}
              >
                {displayRole}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default FixedHeader;
