import { Routes, Route } from "react-router-dom";
import PublicLayout from "@/layouts/PublicLayout";

// pages
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
import AppointmentBooking from "@/pages/AppointmentBooking";
import Dashboard from "@/pages/Dashboard";

import BookingConfirmation from "@/pages/BookingConfirmation";
import ProfilePage from "@/pages/ProfilePage";
import Notifications from "@/pages/Notifications";
import SettingsPage from "@/pages/SettingsPage";
import FeedbackCenter from "@/pages/FeedbackCenter";

// dashboards
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import DoctorDashboard from "@/pages/DoctorDashboard";
import PatientDashboard from "@/pages/PatientDashboard";
import StaffDashboard from "@/pages/StaffDashboard";
import LabDashboard from "@/pages/lab/LabDashboard";
import PharmacyDashboard from "@/pages/pharmacy/PharmacyDashboard";
import ImagingDashboard from "@/pages/imaging/ImagingDashboard";

// verification
import PracticeVerification from "@/pages/verification/PracticeVerification";
import LabVerification from "@/pages/lab/LabVerification";
import PharmacyVerification from "@/pages/pharmacy/PharmacyVerification";
import ImagingVerification from "@/pages/imaging/ImagingVerification";

// practice & imaging center dashboards
import PracticeDashboard from "@/pages/practice/PracticeDashboard";
import ImagingCenterDashboard from "@/pages/imaging/ImagingCenterDashboard";

export default function App() {
  return (
    <Routes>
      {/* ✅ PUBLIC WEBSITE */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<PremiumHome />} />

        <Route path="doctor" element={<Doctors />} />
        <Route path="practice" element={<Practices />} />
        <Route path="lab" element={<LabLandingPage />} />
        <Route path="pharmacy" element={<PharmacyLandingPage />} />
        <Route path="imaging-center" element={<ImagingLandingPage />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="contact" element={<Contact />} />
        <Route path="about" element={<About />} />
      </Route>

      {/* ✅ AUTH */}
      <Route path="/auth" element={<Auth />} />

      {/* ✅ APP PAGES (no PublicLayout) */}
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/feedback" element={<FeedbackCenter />} />

      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<SettingsPage />} />

      {/* ✅ PATIENT BOOKING FLOW */}
      <Route path="/book-appointment/:doctorId" element={<AppointmentBooking />} />
      <Route path="/booking-confirmation/:appointmentId" element={<BookingConfirmation />} />

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

      {/* ✅ PRACTICE/IMAGING CENTER DASHBOARDS */}
      <Route path="/practice-dashboard" element={<PracticeDashboard />} />
      <Route path="/imaging-center/dashboard" element={<ImagingCenterDashboard />} />
    </Routes>
  );
}
