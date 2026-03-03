import { useAuth } from "../Auth/authContext";
import EmployeeRechargeRequestList from "./EmployeeRechargeRequestList";
import RechargeRequestList from "./RechargeRequest"

const RechargeRequestRouter = (props) => {
  const { role, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (role === "employee") {
    return <EmployeeRechargeRequestList {...props} />;
  }

  return <RechargeRequestList {...props} />;
};

export default RechargeRequestRouter;