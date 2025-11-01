import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import PatientDashboard from "./PatientDashboard";
import DoctorDashboard from "./DoctorDashboard";
import AdminDashboard from "./AdminDashboard";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const { user, profile, loading } = useAuth();

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

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role from user_roles table
  // Check for super_admin role first (highest priority)
  if (profile.roles?.includes('super_admin')) {
    return <Navigate to="/super-admin-dashboard" replace />;
  }
  
  // Then check other roles
  switch (profile.role) {
    case 'doctor':
      return <Navigate to="/doctor-dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin-dashboard" replace />;
    case 'patient':
    default:
      return <Navigate to="/patient-dashboard" replace />;
  }
};

export default Dashboard;