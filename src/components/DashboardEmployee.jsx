import { useEffect, useState } from "react";
import { collection, collectionGroup, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { db } from "../firebase";
import { useAuth } from "./Auth/authContext";
import {
  RiRefreshLine,
  RiUserLine,
  RiDashboardLine,
  RiArrowUpLine,
  RiLoader4Line
} from "react-icons/ri";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";



const DashboardEmployee = ({ onNavigate, ...props }) => {
  const { user } = useAuth();
  const [recharges, setRecharges] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const [lastUpdated, setLastUpdated] = useState(null); 


const [dailyData, setDailyData] = useState([]);

const [pendingRecharges, setPendingRecharges] = useState(0);
const navigate = useNavigate();
 const fetchProfile = async () => {
  if (!user) return;

  try {
   const q = query(
  collection(db, "rechargeRequest"),
  where("partnerId", "==", user.uid)

    );

    const snap = await getDocs(q);


    if (!snap.empty) {
      setProfile({
        id: snap.docs[0].id,     // 🔥 THIS IS partnerId
        ...snap.docs[0].data()
      });
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
  }
};

useEffect(() => {
  if (!user) return;
  fetchProfile();
}, [user]);

useEffect(() => {
  if (!user) return;
  fetchRecharges();
}, [user]);


const fetchRecharges = async () => {
  if (!user) return;

  setLoading(true);
  try {
   const q = query(
   collection(db, "rechargeRequest"),
where("partnerId", "==", user.uid)
);

    const snap = await getDocs(q);
    console.log("User UID:", user.uid);
console.log("Total docs returned:", snap.size);

snap.forEach((doc) => {
  console.log("Doc partnerId:", doc.data().partnerId);
});


let successCount = 0;
let processingCount = 0;

snap.forEach((doc) => {
  const data = doc.data();
  const status = data.rechargeStatus?.toLowerCase();

  if (status === "success") {
    successCount++;
  }

  if (status === "processing") {
    processingCount++;
  }
});

setRecharges(successCount);
setPendingRecharges(processingCount);

    // 📊 GROUP BY DATE
    const dailyMap = {};

    snap.forEach((doc) => {
      const data = doc.data();
      if (!data.requestedDate) return;

      const date = data.requestedDate
        .toDate()
        .toISOString()
        .split("T")[0];

      dailyMap[date] = (dailyMap[date] || 0) + 1;
    });

    const graphData = Object.keys(dailyMap)
      .sort()
      .map((date) => ({
        date,
        count: dailyMap[date],
      }));

    setDailyData(graphData);
    setLastUpdated(new Date());
  } catch (error) {
    console.error("Error fetching recharges:", error);
  } finally {
    setLoading(false);
  }
};




  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <p className="text-muted small mb-1">{title}</p>
            <h2 className="fw-bold mb-0">{value}</h2>
          </div>
          <div className={`p-3 rounded-circle bg-${color}-subtle`}>
            {icon}
          </div>
        </div>
        {subtitle && (
          <div className="mt-auto">
            <small className="text-muted">{subtitle}</small>
          </div>
        )}
      </div>
    </div>
  );
  

  const WelcomeHeader = () => (
    <div className="d-flex  justify-content-between align-items-center mb-4 ">
      <div className="mt-5">
        <h1 className="fw-bold mb-2">Welcome back, {user?.displayName?.split(" ")[0] || "Employee"}!</h1>
        <p className="text-muted mb-0">
          <RiDashboardLine className="me-2" />
          Here's your performance overview
        </p>
      </div>
      <button 
        onClick={fetchRecharges}
        className="btn btn-outline-primary d-flex align-items-center"
        disabled={loading}
      >
        {loading ? (
          <RiLoader4Line className="me-2 spin" />
        ) : (
          <RiRefreshLine className="me-2" />
        )}
        Refresh
      </button>
    </div>
  );
  

 return (
  <div className="container-fluid p-4 bg-light min-vh-100">
    <WelcomeHeader />

    {/* PROFILE CARD */}
    {profile && (
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body d-flex align-items-center gap-3">
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
            style={{ width: 60, height: 60, fontSize: 22 }}
          >
            {profile.name?.charAt(0)}
          </div>

          <div className="flex-grow-1">
            <h5 className="mb-1 fw-bold">
              {profile.name}
              <span className="badge bg-primary ms-2 text-capitalize">
                {profile.role}
              </span>
            </h5>

            <div className="text-muted small">📧 {profile.email}</div>
            <div className="text-muted small">
              📅 {profile.joinedAt?.toDate().toDateString()}
            </div>
          </div>

          <span className="badge bg-success">{profile.status}</span>
        </div>
      </div>
    )}

    {/* STATS ROW */}
    <div className="row g-4 mb-4">
      <div className="col-lg-3 col-md-6">
        <StatCard
          title="Total Recharges"
          value={loading ? "Loading..." : recharges}
          icon={<RiRefreshLine size={24} className="text-primary" />}
          color="primary"
          subtitle={
            lastUpdated &&
            `Updated ${lastUpdated.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          }
        />
      </div>

      <div className="col-lg-3 col-md-6">
        <StatCard
          title="Performance Score"
          value={recharges > 0 ? `${Math.min(100, recharges * 10)}%` : "0%"}
          icon={<RiArrowUpLine size={24} className="text-success" />}
          color="success"
          subtitle={`${recharges} completed recharges`}
        />
      </div>

      <div className="col-lg-3 col-md-6">
        <StatCard
          title="Today's Goal"
          value="10"
          icon={<RiUserLine size={24} className="text-warning" />}
          color="warning"
          subtitle={`${Math.min(recharges, 10)}/10 completed`}
        />
      </div>
      
      <div className="col-lg-3 col-md-6">
  <div
    className="card border-0 shadow-sm h-100 cursor-pointer"
    style={{ cursor: "pointer" }}
    onClick={() => onNavigate("Recharge Request")}
  >
    <div className="card-body d-flex flex-column">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <p className="text-muted small mb-1">Pending Recharges</p>
          <h2 className="fw-bold mb-0">
            {loading ? "..." : pendingRecharges}
          </h2>
        </div>
        <div className="p-3 rounded-circle bg-warning-subtle">
          <RiRefreshLine size={24} className="text-warning" />
        </div>
      </div>

      <small className="text-muted mt-auto">
        Click to manage pending requests
      </small>
    </div>
  </div>
</div>
      <div className="col-lg-3 col-md-6">
        <div className="card border-0 shadow-sm h-100 bg-gradient-primary text-white">
          <div className="card-body text-center">
            <div className="display-4 fw-bold">{recharges}</div>
            <p>Total Recharges Processed</p>
          </div>
        </div>
      </div>
    </div>
    {/* DAILY RECHARGE GRAPH */}
<div className="card border-0 shadow-sm mt-4">
  <div className="card-body">
    <h5 className="fw-bold mb-3">Daily Recharge Trend</h5>

    {dailyData.length === 0 ? (
      <p className="text-muted">No recharge data available</p>
    ) : (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={dailyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#667eea"
            strokeWidth={3}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )}
  </div>
</div>


    {/* STYLES */}
    <style>{`
      .bg-gradient-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      .spin {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `}</style>
  </div>
);
}

export default DashboardEmployee;