import React, { useState, useEffect } from "react";
import "../styles/sidebar.css";
import { Offcanvas } from "bootstrap";
import Logo from "../assets/logo.jpg";

import { useAuth } from "./Auth/authContext";
import "../firebase"


// import LogoSmall from "../assets/logo-small.png";  // Optional if you have small icon

const Sidebar = ({ activeItem, onSelect }) => {
 

  const { role } = useAuth();   // ✅ THIS LINE FIXES IT
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth >= 992 && collapsed) setCollapsed(false);
      else if (window.innerWidth < 992 && !collapsed) setCollapsed(true);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, [collapsed]);

  const navGroups = [
    {
      title: "MAIN MENU",
      items: [
        { name: "Dashboard", icon: "⌂" ,roles: ["admin", "employee"]},
        { name: "Products", icon: "📦",roles: ["admin"] },
        { name: "Orders", icon: "📋",roles: ["admin"] },
        { name: "Category", icon: "🏷️",roles: ["admin"] },
        { name: "Sub Category", icon: "🏷️",roles: ["admin"] },
        { name: "Brands", icon: "💎" ,roles: ["admin"]},
        { name: "Banners", icon: "🖼️" ,roles: ["admin"]},
        { name: "Youtube Videos", icon: "⏯️" ,roles: ["admin"]},
        { name: "Stock Notifier", icon: "📈",roles: ["admin"] },
      ],
    },
    {
      title: "MANAGEMENT",
      items: [
        { name: "Wallet", icon: "💳" ,roles: ["admin"]},
        { name: "Referral", icon: "🤝" ,roles: ["admin"]},
        { name: "Recharge Request", icon: "💸" ,roles: ["admin", "employee"]},
        { name: "Recharge Provider", icon: "📶",roles: ["admin", "employee"] },
        { name: "Recharge Plan", icon: "📱",roles: ["admin", "employee"] },
        { name: "Partner Management", icon: "🧑‍💼",roles: ["admin"] },
         { name: "QR Adder", icon: "🧑‍💼",roles: ["admin"] },
        { name: "Customer Details", icon: "👤",roles: ["admin"] },
      ],
    },
  ];
const renderNav = (isMobileView) => (
  <nav className="flex-grow-1 pt-3">
    {navGroups.map((group) => {

      // ✅ FILTER ITEMS BASED ON ROLE
      const allowedItems = group.items.filter(item =>
        item.roles.includes(role)
      );

      if (allowedItems.length === 0) return null;

      return (
        <div key={group.title} className="mb-4">
          {!(collapsed && !isMobileView) && (
            <p className="text-uppercase text-muted small fw-bold mb-2 ps-3">
              {group.title}
            </p>
          )}

          <ul className="nav nav-pills flex-column mb-3">
            {allowedItems.map((item) => (
              <li className="nav-item" key={item.name}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelect(item.name);
                  }}
                  className={`nav-link ${
                    activeItem === item.name
                      ? "active"
                      : "text-dark hover-bg-light"
                  } p-2 mb-1 mx-2 d-flex align-items-center`}
                >
                  <span className="me-2 fs-6 sidebar-icon">{item.icon}</span>
                  {!(collapsed && !isMobileView) && item.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      );
    })}
  </nav>
);

  return (
    <>
      {/* ✅ Mobile Offcanvas Sidebar */}
      <div
        className="offcanvas offcanvas-start d-lg-none"
        tabIndex="-1"
        id="mobileSidebarOffcanvas"
      >
        <div className="offcanvas-header border-bottom">
          
          {/* ✅ Full Logo in Mobile */}
          <img
            src={Logo}
            alt="MiDesi Logo"
            style={{ width: "140px", height: "auto" }}
          />

          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" />
        </div>

        <div className="offcanvas-body d-flex flex-column p-0">
          {renderNav(true)}
          <div className="mt-auto pt-3 text-center">© 2025 MiDesi</div>
        </div>
      </div>

      {/* ✅ Desktop Sidebar */}
      <div
        className={`sidebar-container d-none d-lg-flex flex-column ${
          collapsed ? "collapsed" : ""
        }`}
      >
        {/* ✅ Logo Area */}
        <div className="d-flex align-items-center justify-content-center p-3">
          {collapsed ? (
            // ✅ Small Icon logo (or scaled version)
            <img
              src={Logo}
              alt="MiDesi Small Logo"
              style={{ width: "45px", height: "45px", borderRadius: "8px" }}
            />
          ) : (
            // ✅ Full Logo
            <img
              src={Logo}
              alt="MiDesi Full Logo"
              style={{ width: "150px", height: "auto", marginTop:"50px" }}
            />
          )}
        </div>

        {renderNav(false)}

        {!collapsed && <div className="mt-auto pt-3 text-center">© 2025 MiDesi</div>}
      </div>
    </>
  );
};

export default Sidebar;
