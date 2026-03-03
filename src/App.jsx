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
import { auth, onAuthStateChanged, signOut } from "./firebase"; 
import QRAdder from './components/QrAdder.jsx';
import UnifiedRechargeRequestList from './components/RechargeRequest/EmployeeRechargeRequestList.jsx';

function App() {
  const [currentView, setCurrentView] = useState('Dashboard');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ✅ NEW STATE FOR FORGOT PASSWORD
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        />
        <div className="main-content-wrapper w-100">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;