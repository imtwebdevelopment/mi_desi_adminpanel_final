import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  getDocs 
} from "firebase/firestore";
import { 
  ShoppingBag, 
  Smartphone, 
  UserPlus, 
  Trash2, 
  CheckCheck, 
  Search, 
  BellOff, 
  Clock, 
  ArrowRight,
  Filter
} from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import FixedHeader from "./FixedHeader";

const NotificationHistory = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'order' | 'recharge' | 'customer'

  // Fetch notifications in real-time
  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notification history:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper to format timestamps nicely
  const formatTimeAgo = (ts) => {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Helper to get matching type details
  const getTypeDetails = (type) => {
    switch (type) {
      case "order":
        return {
          icon: ShoppingBag,
          color: "#6366f1",
          bg: "rgba(99, 102, 241, 0.1)",
          label: "Order",
        };
      case "recharge":
        return {
          icon: Smartphone,
          color: "#10b981",
          bg: "rgba(16, 185, 129, 0.1)",
          label: "Recharge",
        };
      case "customer":
        return {
          icon: UserPlus,
          color: "#3b82f6",
          bg: "rgba(59, 130, 246, 0.1)",
          label: "New User",
        };
      default:
        return {
          icon: Clock,
          color: "#6b7280",
          bg: "rgba(107, 114, 128, 0.1)",
          label: "Notification",
        };
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Delete single notification
  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Avoid triggering details click/redirect
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Bulk Actions
  const handleMarkAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      const unreadDocs = notifications.filter((n) => !n.read);
      unreadDocs.forEach((n) => {
        const ref = doc(db, "notifications", n.id);
        batch.update(ref, { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all notification history?")) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        const ref = doc(db, "notifications", n.id);
        batch.delete(ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  // Handle clicking on notification card (Redirect + Mark as Read)
  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await handleMarkAsRead(notif.id);
    }
    if (notif.redirectView) {
      onNavigate(notif.redirectView);
    }
  };

  // Filtered List
  const filteredNotifications = notifications.filter((notif) => {
    const matchesTab = activeTab === "all" || notif.type === activeTab;
    const matchesSearch = 
      notif.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      notif.body?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="container-fluid p-0" style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <FixedHeader title="Notification History" />

      <div className="p-4" style={{ marginTop: "70px" }}>
        {/* Bulk Action Controls */}
        <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
          <div className="row g-3 align-items-center justify-content-between">
            {/* Stats */}
            <div className="col-12 col-md-auto d-flex align-items-center gap-2">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: "45px", height: "45px", background: "rgba(99, 102, 241, 0.1)", color: "#6366f1" }}
              >
                <Filter size={20} />
              </div>
              <div>
                <h5 className="mb-0 fw-bold text-dark">System Alerts</h5>
                <p className="text-muted mb-0 small">
                  {notifications.length} total • <span className="text-danger fw-semibold">{unreadCount} unread</span>
                </p>
              </div>
            </div>

            {/* Actions & Filters */}
            <div className="col-12 col-md-auto d-flex flex-wrap gap-2 justify-content-md-end">
              {unreadCount > 0 && (
                <button 
                  className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold d-flex align-items-center gap-1"
                  onClick={handleMarkAllAsRead}
                  style={{ fontSize: "12px" }}
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button 
                  className="btn btn-sm btn-outline-danger rounded-pill px-3 fw-semibold d-flex align-items-center gap-1"
                  onClick={handleClearAll}
                  style={{ fontSize: "12px" }}
                >
                  <Trash2 size={14} /> Clear History
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters and Search Panel */}
        <div className="row g-3 mb-4">
          {/* Tab Filters */}
          <div className="col-12 col-lg-8">
            <div className="d-flex overflow-auto pb-1 gap-2" style={{ whiteSpace: "nowrap" }}>
              {[
                { id: "all", label: "All Alerts" },
                { id: "order", label: "Orders" },
                { id: "recharge", label: "Recharges" },
                { id: "customer", label: "User Registrations" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`btn btn-sm px-4 py-2 rounded-pill fw-semibold border-0 transition-all ${
                    activeTab === tab.id 
                      ? "btn-primary shadow-sm text-white" 
                      : "btn-light text-muted hover-bg-light"
                  }`}
                  style={{ fontSize: "13px" }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="col-12 col-lg-4">
            <div className="position-relative">
              <span className="position-absolute top-50 translate-middle-y start-0 ps-3 text-muted">
                <Search size={16} />
              </span>
              <input
                type="text"
                className="form-control rounded-pill border-0 shadow-sm ps-5 py-2"
                placeholder="Search alert description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: "13px", height: "38px" }}
              />
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted small">Loading history...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
            <div className="d-flex justify-content-center mb-3">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center text-muted"
                style={{ width: "80px", height: "80px", background: "#f3f4f6" }}
              >
                <BellOff size={40} />
              </div>
            </div>
            <h5 className="fw-bold mb-1 text-dark">No Notifications Found</h5>
            <p className="text-muted small mb-0">
              {searchQuery || activeTab !== "all" 
                ? "No items match your filters or search query." 
                : "Your system has no pending or recorded notifications yet."}
            </p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {filteredNotifications.map((notif) => {
              const details = getTypeDetails(notif.type);
              const IconComponent = details.icon;

              return (
                <div
                  key={notif.id}
                  className={`card border-0 shadow-sm rounded-4 overflow-hidden transition-all position-relative`}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    cursor: "pointer",
                    background: notif.read ? "#ffffff" : "linear-gradient(90deg, #ffffff 0%, #f9fafb 100%)",
                    borderLeft: `5px solid ${notif.read ? "#e5e7eb" : details.color}`,
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 .125rem .25rem rgba(0,0,0,.075)";
                  }}
                >
                  {/* Unread indicator dot */}
                  {!notif.read && (
                    <div 
                      className="position-absolute rounded-circle"
                      style={{
                        top: "15px",
                        right: "15px",
                        width: "8px",
                        height: "8px",
                        backgroundColor: details.color,
                        boxShadow: `0 0 8px ${details.color}`
                      }}
                    />
                  )}

                  <div className="card-body p-3">
                    <div className="d-flex align-items-center gap-3">
                      {/* Icon */}
                      <div 
                        className="rounded-3 p-2.5 d-flex align-items-center justify-content-center"
                        style={{ backgroundColor: details.bg, color: details.color, minWidth: "42px", height: "42px" }}
                      >
                        <IconComponent size={20} />
                      </div>

                      {/* Content */}
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span 
                            className="badge rounded-pill text-uppercase tracking-wider fw-bold"
                            style={{ 
                              fontSize: "9px", 
                              backgroundColor: details.bg, 
                              color: details.color,
                              padding: "4px 8px"
                            }}
                          >
                            {details.label}
                          </span>
                          <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: "11px" }}>
                            <Clock size={11} /> {formatTimeAgo(notif.timestamp)}
                          </span>
                        </div>

                        <h6 className={`mb-1 ${notif.read ? "text-dark" : "fw-bold text-dark"}`} style={{ fontSize: "14px" }}>
                          {notif.title}
                        </h6>
                        <p className="text-muted mb-0 text-truncate" style={{ fontSize: "12px" }}>
                          {notif.body}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="d-flex gap-2">
                        {notif.redirectView && (
                          <div className="text-muted d-none d-sm-flex align-items-center gap-1 fs-7 px-2">
                            <span style={{ fontSize: "11px" }}>Go to view</span>
                            <ArrowRight size={12} />
                          </div>
                        )}
                        <button
                          className="btn btn-link text-muted hover-text-danger p-1 rounded-circle d-flex align-items-center justify-content-center"
                          onClick={(e) => handleDelete(notif.id, e)}
                          title="Delete Alert"
                          style={{ width: "30px", height: "30px" }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationHistory;
