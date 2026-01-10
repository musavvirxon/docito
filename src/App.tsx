import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import PublicLayout from "@/layouts/PublicLayout";
import PremiumHome from "@/pages/PremiumHome";

import Auth from "@/pages/Auth";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Features from "@/pages/Features";
import Pricing from "@/pages/Pricing";

import Doctors from "@/pages/Doctors";
import Practices from "@/pages/Practices";

import Dashboard from "@/pages/Dashboard";
import ProfilePage from "@/pages/ProfilePage";

import PatientDashboard from "@/pages/PatientDashboard";
import DoctorDashboard from "@/pages/DoctorDashboard";
import StaffDashboard from "@/pages/StaffDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";

import LabLandingPage from "@/pages/lab/LabLandingPage";
import LabDashboard from "@/pages/lab/LabDashboard";

import PharmacyLandingPage from "@/pages/pharmacy/PharmacyLandingPage";
import PharmacyDashboard from "@/pages/pharmacy/PharmacyDashboard";

import ImagingLandingPage from "@/pages/imaging/ImagingLandingPage";
import ImagingDashboard from "@/pages/imaging/ImagingDashboard";

import AppointmentBooking from "@/pages/AppointmentBooking";
import BookingConfirmation from "@/pages/BookingConfirmation";
import DoctorProfile from "@/pages/DoctorProfile";

import NotFound from "@/pages/NotFound";

export default function App() {
  useEffect(() => {
    document.title = "Medical Booking App";
  }, []);

  return (
    <>
      <Toaster />

      <Routes>
        {/* ✅ NEW PREMIUM HOME */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<PremiumHome />} />
        </Route>

        {/* Auth */}
        <Route path="/auth" element={<Auth />} />

        {/* Public pages (these already contain their own nav/footer in your repo) */}
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />

        <Route path="/doctor" element={<Doctors />} />
        <Route path="/find-doctors" element={<Doctors />} />
        <Route path="/practice" element={<Practices />} />

        <Route path="/lab" element={<LabLandingPage />} />
        <Route path="/pharmacy" element={<PharmacyLandingPage />} />
        <Route path="/imaging-center" element={<ImagingLandingPage />} />

        {/* Dashboards */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<ProfilePage />} />

        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
        <Route path="/staff-dashboard" element={<StaffDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />

        {/* Entity dashboards */}
        <Route path="/lab/dashboard" element={<LabDashboard />} />
        <Route path="/pharmacy/dashboard" element={<PharmacyDashboard />} />
        <Route path="/imaging/dashboard" element={<ImagingDashboard />} />

        {/* Booking */}
        <Route path="/book-appointment/:doctorId" element={<AppointmentBooking />} />
        <Route path="/booking-confirmation/:appointmentId" element={<BookingConfirmation />} />
        <Route path="/doctor-profile/:id" element={<DoctorProfile />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
