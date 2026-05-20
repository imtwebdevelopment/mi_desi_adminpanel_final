import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ProductList from './components/Products/Products';
import Header from './components/Header';

import Dashboard from './components/Dashboard';
import OrderPage from './components/Orders/Order.jsx';
import CategoryList from './components/Categories';
import BrandList from './components/Brands';
import BannerList from "./components/Banners/BannerList"
import VideoList from './components/Youtubevideo';
import WalletList from './components/Wallets';
import ReferralList from './components/Referal';

import RechargeRequestRouter from './components/RechargeRequest/RechargeRequestRouter.jsx';
import RechargeProviders from './components/RechargeProvider';
import RechargePlans from './components/RechargePlan';
import PartnerManagement from './components/PartnerManagement';
import CustomerDetails from './components/Customer/Customer';
import StockNotifier from './components/StockNotifier.jsx';
import SubCategoryList from './components/SubCategoryList.jsx';

import DashboardRouter from './components/DashboardRouter.jsx';
import LoginPage from './components/Auth/LoginPage';
import LogoutConfirmation from './components/Auth/LogoutConfirmation.jsx';

import ForgotPasswordPage from './components/Auth/ForgotPasswordPage'; // ✅ NEW IMPORT

import ExportOrders from './components/Orders/ExportOrders.jsx';
import { auth, onAuthStateChanged, signOut, db } from "./firebase";
import QRAdder from './components/QrAdder.jsx';
import UnifiedRechargeRequestList from './components/RechargeRequest/EmployeeRechargeRequestList.jsx';
import NotificationToastContainer from './components/NotificationToastContainer';
import NotificationHistory from './components/NotificationHistory.jsx';
import { collectionGroup, query, onSnapshot, collection, setDoc, doc, where } from "firebase/firestore";

function App() {
  const [currentView, setCurrentView] = useState('Dashboard');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ✅ NEW STATE FOR FORGOT PASSWORD
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore Listeners for New Orders, Recharge Requests, Customer Registrations, and Notification History
  useEffect(() => {
    if (!user) {
      setToasts([]);
      setUnreadCount(0);
      return;
    }

    let isInitialOrdersLoad = true;
    let isInitialRechargeLoad = true;
    let isInitialCustomersLoad = true;

    // 1. Listen to new orders
    const ordersQuery = query(collectionGroup(db, "orders"));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      if (isInitialOrdersLoad) {
        isInitialOrdersLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const orderId = data.orderId || change.doc.id;
          const totalAmount = Number(data.totalAmount || data.total || 0);
          const customerName = data.customerName || data.name || "A customer";

          const newToast = {
            id: `order-${change.doc.id}-${Date.now()}`,
            type: "order",
            title: "New Order Placed",
            body: `${customerName} placed order #${orderId} for ₹${totalAmount.toFixed(2)}.`,
          };

          setToasts((prev) => [...prev, newToast]);

          // Save to history in Firestore
          setDoc(doc(db, "notifications", `order-${change.doc.id}`), {
            title: newToast.title,
            body: newToast.body,
            type: "order",
            redirectView: "Orders",
            timestamp: Date.now(),
            read: false
          }).catch((err) => console.error("Error storing order notification:", err));

          // Auto dismiss after 7 seconds
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
          }, 7000);
        }
      });
    });

    // 2. Listen to new recharge requests
    const rechargeQuery = query(collectionGroup(db, "rechargeRequest"));
    const unsubRecharges = onSnapshot(rechargeQuery, (snapshot) => {
      if (isInitialRechargeLoad) {
        isInitialRechargeLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const planPrice = data.plan?.price || data.amount || 0;
          const partnerName = data.partnerName || data.triggeredByName || "Super Admin";
          const userName = data.userName || "Customer";

          const newToast = {
            id: `recharge-${change.doc.id}-${Date.now()}`,
            type: "recharge",
            title: "New Recharge Request",
            body: `${userName} requested ₹${planPrice} recharge (via ${partnerName}).`,
          };

          setToasts((prev) => [...prev, newToast]);

          // Save to history in Firestore
          setDoc(doc(db, "notifications", `recharge-${change.doc.id}`), {
            title: newToast.title,
            body: newToast.body,
            type: "recharge",
            redirectView: "Recharge Request",
            timestamp: Date.now(),
            read: false
          }).catch((err) => console.error("Error storing recharge notification:", err));

          // Auto dismiss after 7 seconds
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
          }, 7000);
        }
      });
    });

    // 3. Listen to new customer signups (New Users Registered)
    const customersQuery = query(collection(db, "customers"));
    const unsubCustomers = onSnapshot(customersQuery, (snapshot) => {
      if (isInitialCustomersLoad) {
        isInitialCustomersLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const customerName = data.name || data.fullName || "A new user";
          const customerEmail = data.email || "N/A";

          const newToast = {
            id: `customer-${change.doc.id}-${Date.now()}`,
            type: "customer",
            title: "New User Registered",
            body: `${customerName} (${customerEmail}) has registered a new customer account.`,
          };

          setToasts((prev) => [...prev, newToast]);

          // Save to history in Firestore
          setDoc(doc(db, "notifications", `customer-${change.doc.id}`), {
            title: newToast.title,
            body: newToast.body,
            type: "customer",
            redirectView: "Customer Details",
            timestamp: Date.now(),
            read: false
          }).catch((err) => console.error("Error storing customer registration notification:", err));

          // Auto dismiss after 7 seconds
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
          }, 7000);
        }
      });
    });

    // 4. Listen to notification history to compute unread badge count
    const notificationsQuery = query(collection(db, "notifications"), where("read", "==", false));
    const unsubNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (err) => {
      console.error("Error listening to notifications for badge count:", err);
    });

    return () => {
      unsubOrders();
      unsubRecharges();
      unsubCustomers();
      unsubNotifications();
    };
  }, [user]);

  const confirmLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  const handleShowLogout = () => setShowLogoutConfirm(true);
  const handleCancelLogout = () => setShowLogoutConfirm(false);

  // ✅ FORGOT PASSWORD HANDLERS
  const handleShowForgotPassword = () => setShowForgotPassword(true);
  const handleCancelForgotPassword = () => setShowForgotPassword(false);

  const renderContent = () => {
    if (currentView === 'Products') return <ProductList />;
    if (currentView === 'Dashboard')
      return <DashboardRouter onNavigate={setCurrentView} />;
    if (currentView === 'Orders')
      return <OrderPage onNavigate={setCurrentView} />;
    if (currentView === 'Category') return <CategoryList />;
    if (currentView === 'Sub Category') return <SubCategoryList />;
    if (currentView === 'Brands') return <BrandList />;
    if (currentView === 'Banners') return <BannerList />;
    if (currentView === 'Youtube Videos') return <VideoList />;
    if (currentView === 'Stock Notifier') return <StockNotifier />;
    if (currentView === 'Wallet') return <WalletList />;
    if (currentView === 'Referral') return <ReferralList />;
    if (currentView === 'Recharge Request') return <RechargeRequestRouter />;
    if (currentView === 'Recharge Provider') return <RechargeProviders />;
    if (currentView === 'Recharge Plan') return <RechargePlans />;
    if (currentView === 'Partner Management') return <PartnerManagement />;
    if (currentView === 'QR Adder') return <QRAdder />;
    if (currentView === 'Customer Details') return <CustomerDetails />;
    if (currentView === 'Export Orders') return <ExportOrders />;
    if (currentView === 'Notification History') return <NotificationHistory onNavigate={setCurrentView} />;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#f1f3f6' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="ms-2">Checking session...</p>
      </div>
    );
  }

  // ✅ SHOW FORGOT PASSWORD PAGE
  if (showForgotPassword) {
    return (
      <ForgotPasswordPage
        onBack={handleCancelForgotPassword}
      />
    );
  }

  if (!user) {
    return (
      <LoginPage
        onForgotPassword={handleShowForgotPassword} // ✅ PASS FUNCTION
      />
    );
  }

  if (showLogoutConfirm) {
    return (
      <LogoutConfirmation
        onConfirmLogout={confirmLogout}
        onCancel={handleCancelLogout}
      />
    );
  }

  return (
    <div className="app-container">
      <Header onLogout={handleShowLogout} />
      <div className="d-flex flex-grow-1">
        <Sidebar
          activeItem={currentView}
          onSelect={setCurrentView}
          onLogout={handleShowLogout}
          unreadCount={unreadCount}
        />
        <div className="main-content-wrapper w-100">
          {renderContent()}
        </div>
      </div>
      <NotificationToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        onNavigate={setCurrentView}
      />
    </div>
  );
}

export default App;