import { Routes, Route } from "react-router-dom";
import PublicLayout from "@/layouts/PublicLayout";

// pages
import Index from "@/pages/Index";
import PremiumHome from "@/pages/PremiumHome";
import Doctors from "@/pages/Doctors";
import Practices from "@/pages/Practices";
import LabLandingPage from "@/pages/lab/LabLandingPage";
import PharmacyLandingPage from "@/pages/pharmacy/PharmacyLandingPage";
import ImagingLandingPage from "@/pages/imaging/ImagingLandingPage";
import Pricing from "@/pages/Pricing";
import HowItWorks from "@/pages/HowItWorks";
import Contact from "@/pages/Contact";
import About from "@/pages/About";
import Auth from "@/pages/Auth";

// ✅ missing pages that were causing white screen
import ProfilePage from "@/pages/ProfilePage";
import FeedbackCenter from "@/pages/FeedbackCenter";

// verification
import PracticeVerification from "@/pages/PracticeVerification";
import LabVerification from "@/pages/lab/LabVerification";
import PharmacyVerification from "@/pages/pharmacy/PharmacyVerification";
import ImagingVerification from "@/pages/imaging/ImagingVerification";

// dashboards
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import DoctorDashboard from "@/pages/DoctorDashboard";
import PatientDashboard from "@/pages/PatientDashboard";
import StaffDashboard from "@/pages/StaffDashboard";
import LabDashboard from "@/pages/lab/LabDashboard";
import PharmacyDashboard from "@/pages/pharmacy/PharmacyDashboard";
import ImagingDashboard from "@/pages/imaging/ImagingDashboard";

export default function AppRoutes() {
  return (
    <Routes>
      {/* ✅ PUBLIC WEBSITE */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<PremiumHome />} />
        {/* <Route path="/" element={<Index />} /> */}

        <Route path="/doctor" element={<Doctors />} />
        <Route path="/practice" element={<Practices />} />
        <Route path="/lab" element={<LabLandingPage />} />
        <Route path="/pharmacy" element={<PharmacyLandingPage />} />
        <Route path="/imaging-center" element={<ImagingLandingPage />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/auth" element={<Auth />} />
      </Route>

      {/* ✅ APP PAGES (no PublicLayout) */}
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/dashboard/feedback" element={<FeedbackCenter />} />

      {/* ✅ DASHBOARDS */}
      <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
      <Route path="/patient-dashboard" element={<PatientDashboard />} />
      <Route path="/staff-dashboard" element={<StaffDashboard />} />
      <Route path="/lab/dashboard" element={<LabDashboard />} />
      <Route path="/pharmacy/dashboard" element={<PharmacyDashboard />} />
      <Route path="/imaging/dashboard" element={<ImagingDashboard />} />

      {/* ✅ VERIFICATION ROUTES */}
      <Route path="/dashboard/verify" element={<PracticeVerification />} />
      <Route path="/lab/verification" element={<LabVerification />} />
      <Route path="/pharmacy/verification" element={<PharmacyVerification />} />
      <Route path="/imaging/verification" element={<ImagingVerification />} />

      {/* ✅ Aliases to match Auth.tsx redirects */}
      <Route path="/practice-dashboard" element={<AdminDashboard />} />
      <Route path="/imaging-center/dashboard" element={<ImagingDashboard />} />
    </Routes>
  );
}
