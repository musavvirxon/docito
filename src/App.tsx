// File: src/App.tsx
import { Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import RoleRouteSync from "@/components/auth/RoleRouteSync";

import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

import PatientDashboard from "@/pages/PatientDashboard";
import DoctorDashboard from "@/pages/DoctorDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import StaffDashboard from "@/pages/StaffDashboard";

import ProfilePage from "@/pages/ProfilePage";
import Settings from "@/pages/Settings";
import Notifications from "@/pages/Notifications";

import DashboardFeedback from "@/pages/dashboard/Feedback";

export default function App() {
  return (
    <>
      <Header />
      <RoleRouteSync />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />

        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<Notifications />} />

        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/staff-dashboard" element={<StaffDashboard />} />

        <Route path="/dashboard/feedback" element={<DashboardFeedback />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
