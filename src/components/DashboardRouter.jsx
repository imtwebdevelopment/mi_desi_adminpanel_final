import { useAuth } from "./Auth/authContext";
import Dashboard from "./Dashboard";
import DashboardEmployee from "./DashboardEmployee";

const DashboardRouter = ({ onNavigate, ...props }) => {
  const { role, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (role === "employee") {
    return <DashboardEmployee {...props} onNavigate={onNavigate} />;
  }

  return <Dashboard {...props} />;
};

export default DashboardRouter;