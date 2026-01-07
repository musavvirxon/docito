import { Routes, Route } from "react-router-dom";
import PublicLayout from "@/layouts/PublicLayout";

// pages
import Index from "@/pages/Index";
import PremiumHome from "@/pages/PremiumHome"; // ✅ new homepage (premium layout)
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

// dashboards
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import StaffDashboard from "@/pages/StaffDashboard";
import LabDashboard from "@/pages/lab/LabDashboard";
import PharmacyDashboard from "@/pages/pharmacy/PharmacyDashboard";
import ImagingDashboard from "@/pages/imaging/ImagingDashboard";

export default function AppRoutes() {
  return (
    <Routes>
      {/* ✅ PUBLIC WEBSITE: navbar + footer come from PublicLayout */}
      <Route element={<PublicLayout />}>
        {/* ✅ Use NEW homepage design */}
        <Route path="/" element={<PremiumHome />} />

        {/* If you want the old homepage instead, use this line:
            <Route path="/" element={<Index />} />
        */}

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

      {/* ❌ DASHBOARDS: no public navbar/footer */}
      <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
      <Route path="/staff-dashboard" element={<StaffDashboard />} />
      <Route path="/lab/dashboard" element={<LabDashboard />} />
      <Route path="/pharmacy/dashboard" element={<PharmacyDashboard />} />
      <Route path="/imaging/dashboard" element={<ImagingDashboard />} />
    </Routes>
  );
}
