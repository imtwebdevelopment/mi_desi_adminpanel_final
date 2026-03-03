import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../firebase";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Area
} from "recharts";

import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/dashboard.css";

/* ================= LOADING SKELETON ================= */
const SkeletonCard = () => (
  <div className="card shadow border-0 rounded-4 h-100">
    <div className="card-body">
      <div className="skeleton-icon"></div>
      <div className="skeleton-text mt-2 mb-1"></div>
      <div className="skeleton-title"></div>
    </div>
  </div>
);

/* ================= STAT CARD ================= */
const StatCard = ({ title, value, icon, onClick, loading = false }) => {
  if (loading) {
    return <SkeletonCard />;
  }

  return (
    <div
      className="card stat-card shadow border-0 rounded-4 h-100 position-relative overflow-hidden"
      style={{ cursor: "pointer", transition: "all 0.3s ease" }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="card-hover-overlay"></div>
      <div className="card-body position-relative z-1">
        <div className="d-flex align-items-center justify-content-between">
          <span className="fs-3 stat-icon">{icon}</span>
          <div className="p-2 rounded-circle bg-light">
            <i className="bi bi-arrow-up-right text-primary"></i>
          </div>
        </div>
        <p className="mt-3 mb-2 text-muted small fw-medium text-uppercase">{title}</p>
        <h2 className="fw-bold display-6 mb-0">{value}</h2>
      </div>
    </div>
  );
};

/* ================= ADMIN CARD ================= */
const AdminProfile = ({ adminData, loading }) => {
  if (loading) {
    return (
      <div className="card shadow border-0 rounded-4 p-3 mb-4">
        <div className="d-flex align-items-center">
          <div className="skeleton-avatar"></div>
          <div className="ms-3 flex-grow-1">
            <div className="skeleton-text-lg mb-2"></div>
            <div className="skeleton-text-md"></div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = adminData?.name || "Admin";
  const displayEmail = adminData?.email || "admin@example.com";
  const userPhoto =
    adminData?.photoURL && adminData.photoURL !== "null"
      ? adminData.photoURL
      : "https://avatar.iran.liara.run/username?username=MI Desi" + displayName;

  return (
    <div className="card shadow border-0 rounded-4 p-3 mb-4 admin-profile-card">
      <div className="d-flex align-items-center">
        <div className="position-relative">
          <div
  className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
  style={{
    width: 80,
    height: 80,
    fontSize: "28px",
    background: "linear-gradient(135deg, #2563eb, #4f46e5)",
    textTransform: "uppercase",
  }}
>
  {displayName?.charAt(0) || "A"}
</div>

          <span className="position-absolute bottom-0 end-0 bg-success border border-3 border-light rounded-circle p-1"></span>
        </div>
        <div className="ms-4">
          <h5 className="fw-bold mb-1 d-flex align-items-center">
            {displayName}
            <span className="badge bg-primary-subtle text-primary ms-2">Admin</span>
          </h5>
          <p className="text-muted mb-0">
            <i className="bi bi-envelope me-2"></i>
            {displayEmail}
          </p>
          <div className="mt-2">
            <small className="text-muted">
              <i className="bi bi-calendar me-1"></i>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ onNavigate }) => {
  /* 🔒 SAFE NAVIGATION */
  const navigate = useCallback(
    typeof onNavigate === "function" ? onNavigate : () => {},
    [onNavigate]
  );

  const [adminData, setAdminData] = useState(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [monthlyOrders, setMonthlyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProducts: 0,
    totalPartners: 0,
  });

  /* ================= OPTIMIZED DATA FETCHING ================= */
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const startTime = performance.now();
      
      try {
        // Fetch data in parallel where possible
        const [
          adminSnap,
          customersSnap,
          partnersSnap,
          productsSnap
        ] = await Promise.all([
          getDocs(query(collection(db, "admins"), limit(1))),
          getDocs(collection(db, "customers")),
          getDocs(collection(db, "partners")),
          getDocs(collection(db, "products"))
        ]);

        /* ================= ADMIN DATA ================= */
        if (!adminSnap.empty) {
          setAdminData({
            id: adminSnap.docs[0].id,
            ...adminSnap.docs[0].data(),
          });
        }

        /* ================= STATS ================= */
        const totalCustomers = customersSnap.size;
        const totalPartners = partnersSnap.size;
        const totalProducts = productsSnap.size;

        setStats({
          totalCustomers,
          totalPartners,
          totalProducts,
        });

        /* ================= ORDERS COUNTING ================= */
        let totalOrdersCount = 0;
        const monthMap = Array(12).fill(0).reduce((acc, _, index) => {
          const month = new Date(0, index).toLocaleString('default', { month: 'short' });
          acc[month] = 0;
          return acc;
        }, {});

        // Use Promise.all for concurrent order fetching
        const orderPromises = customersSnap.docs.map(async (customerDoc) => {
          const ordersSnap = await getDocs(
            collection(db, "customers", customerDoc.id, "orders")
          );
          return ordersSnap.docs;
        });

        const allOrders = await Promise.all(orderPromises);
        
        allOrders.flat().forEach((orderDoc) => {
          totalOrdersCount++;
          const data = orderDoc.data();
          const date = data.createdAt?.toDate?.() || data.orderDate?.toDate?.();
          
          if (date) {
            const month = date.toLocaleString("default", { month: "short" });
            if (monthMap[month] !== undefined) {
              monthMap[month] += 1;
            }
          }
        });

        setTotalOrders(totalOrdersCount);
        
        const monthlyData = Object.keys(monthMap).map((m) => ({
          month: m,
          orders: monthMap[m],
        }));
        
        setMonthlyOrders(monthlyData);

        // Simulate minimum loading time for better UX
        const elapsedTime = performance.now() - startTime;
        const minLoadTime = 500; // 500ms minimum for smooth UX
        
        if (elapsedTime < minLoadTime) {
          await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsedTime));
        }

      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  /* ================= MEMOIZED COMPONENTS ================= */
  const memoizedStats = useMemo(() => [
    {
      title: "Total Orders",
      value: totalOrders.toLocaleString(),
      icon: "📊",
      onClick: () => navigate("Orders"),
      loading
    },
    {
      title: "Total Products",
      value: stats.totalProducts.toLocaleString(),
      icon: "📦",
      onClick: () => navigate("Products"),
      loading
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers.toLocaleString(),
      icon: "👥",
      onClick: () => navigate("Customer Details"),
      loading
    },
    {
      title: "Total Partners",
      value: stats.totalPartners.toLocaleString(),
      icon: "🤝",
      onClick: () => navigate("Partner Management"),
      loading
    }
  ], [totalOrders, stats, loading, navigate]);

  const chartGradient = useMemo(() => (
    <defs>
      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
      </linearGradient>
    </defs>
  ), []);

  return (
    <div className="container-fluid bg-light p-3 p-md-4" style={{ minHeight: "100vh" }}>
      <div className="row mb-4 mt-5">
        <div className="col">
          <h1 className="fw-bold mb-2">Dashboard Overview</h1>
          <p className="text-muted">Welcome back! Here's what's happening with your store today.</p>
        </div>
      </div>

      {/* ================= ADMIN PROFILE ================= */}
      <AdminProfile adminData={adminData} loading={loading} />

      {/* ================= STATS GRID ================= */}
      <div className="row g-3 g-md-4 mb-4">
        {memoizedStats.map((stat, index) => (
          <div key={index} className="col-sm-6 col-md-3">
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      {/* ================= CHARTS SECTION ================= */}
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card shadow border-0 rounded-4 p-3 p-md-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h5 className="fw-bold mb-1">Monthly Orders Trend</h5>
                <p className="text-muted small mb-0">Track your order performance over time</p>
              </div>
              <div className="badge bg-primary bg-opacity-10 text-primary p-2">
                <i className="bi bi-graph-up me-1"></i>
                {loading ? "Loading..." : "Live Data"}
              </div>
            </div>
            
            {loading ? (
              <div className="skeleton-chart" style={{ height: '300px' }}></div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyOrders}>
                  {chartGradient}
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value) => [`${value} orders`, 'Count']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="orders" 
                    fill="url(#colorOrders)" 
                    strokeWidth={0}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7, fill: "#1d4ed8", strokeWidth: 2, stroke: "#fff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            
            {!loading && (
              <div className="mt-4 pt-3 border-top">
                <div className="row text-center">
                  <div className="col-4">
                    <p className="text-muted small mb-1">This Month</p>
                    <p className="fw-bold h5 mb-0">
                      {monthlyOrders[new Date().getMonth()]?.orders || 0}
                    </p>
                  </div>
                  <div className="col-4">
                    <p className="text-muted small mb-1">Peak Month</p>
                    <p className="fw-bold h5 mb-0">
                      {Math.max(...monthlyOrders.map(m => m.orders))}
                    </p>
                  </div>
                  <div className="col-4">
                    <p className="text-muted small mb-1">Average</p>
                    <p className="fw-bold h5 mb-0">
                      {Math.round(monthlyOrders.reduce((a, b) => a + b.orders, 0) / 12)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= QUICK ACTIONS ================= */}
        <div className="col-12 col-lg-4">
          <div className="card shadow border-0 rounded-4 p-3 p-md-4 h-10">
            <h5 className="fw-bold mb-4">Quick Actions</h5>
            <div className="d-grid gap-3">
              {[
                { icon: "bi-plus-circle", label: "Add New Product", target: "Products" },
                { icon: "bi-person-plus", label: "View Customer", target: "Customer Details" },
             
              ].map((action, index) => (
                <button
                  key={index}
                  className="btn btn-outline-light text-dark d-flex align-items-center justify-content-between p-3 rounded-3 border"
                  onClick={() => navigate(action.target)}
                  style={{ transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="d-flex align-items-center">
                    <i className={`${action.icon} me-3 fs-5 text-primary`}></i>
                    <span>{action.label}</span>
                  </div>
                  <i className="bi bi-chevron-right text-muted"></i>
                </button>
              ))}
            </div>
            
          
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;