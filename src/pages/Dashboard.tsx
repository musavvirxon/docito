import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getDashboardRoute } from "@/lib/rbac";

const Dashboard = () => {
  const { user, loading, activeRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Universal entrypoint: always send user to the dashboard for their currently active role
  return <Navigate to={getDashboardRoute([activeRole])} replace />;
};

export default Dashboard;
