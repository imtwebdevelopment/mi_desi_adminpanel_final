// Header.jsx

import React from "react";
import { Offcanvas } from "bootstrap";
// REMOVE the unnecessary import of LogoutConfirmation since it's now handled in App.jsx
// import LogoutConfirmation from "./Auth/LogoutConfirmation"; 

// --- CHANGE: Accept 'onLogout' prop ---
const Header = ({ onLogout }) => { 
  // Open mobile sidebar
  const openSidebar = () => {
    const offcanvasEl = document.getElementById("mobileSidebarOffcanvas");
    const bsOffcanvas = new Offcanvas(offcanvasEl);
    bsOffcanvas.show();
  };

  return (
    <nav
      // ADDED 'fixed-top' CLASS HERE
      className="fixed-top d-flex justify-content-between align-items-center p-3 bg-dark text-white"
      style={{ height: "56px" }}
    >
      {/* Mobile Toggle Button */}
      <button
        className="btn btn-sm btn-outline-light d-lg-none me-3"
        onClick={openSidebar}
      >
        ☰
      </button>

      {/* Logo */}
      <div className="d-flex align-items-center flex-grow-1">
        <span className="fs-5 fw-bold me-2" style={{ color: "#5705efff" }}>
          Mi
        </span>
        <span className="fs-5 fw-bold" style={{ color: "#ffffff" }}>
          Desi 
        </span>
      
       
      </div>

      {/* Logout / Action Button */}
      <button
        className="btn btn-sm text-white fw-bold"
        style={{ backgroundColor: "#ff0404ff", padding: "0.375rem 1rem" }}
        // --- CHANGE: Call the 'onLogout' prop function ---
        onClick={onLogout}> 
        Logout
      </button>
    </nav>
  );
};

export default Header;