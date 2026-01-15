// File: src/App.tsx

import { useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import PublicLayout from "@/layouts/PublicLayout";
import { Button } from "@/components/ui/button";

// IMPORTANT: Avoid React.lazy in Lovable previews to prevent stale chunk fetch errors.
import PremiumHome from "@/pages/PremiumHome";
import Auth from "@/pages/Auth";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Features from "@/pages/Features";
import Pricing from "@/pages/Pricing";

import DoctorLandingPage from "@/pages/doctor/DoctorLandingPage";
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
import DoctorPublicProfile from "@/pages/doctor/DoctorPublicProfile";
import VideoCall from "@/pages/VideoCall";
import Messages from "@/pages/Messages";
import FeedbackCenter from "@/pages/FeedbackCenter";

function NotFoundInline() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-lg w-full rounded-xl border bg-card p-8 text-center space-y-4">
        <div className="text-6xl font-bold tracking-tight">404</div>
        <div className="space-y-1">
          <div className="text-xl font-semibold">Page not found</div>
          <div className="text-sm text-muted-foreground">
            No route matches <span className="font-mono">{location.pathname}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    document.title = "Medical Booking App";
  }, []);

  return (
    <>
      <Toaster />

      <Routes>
        {/* Public pages with layout */}
        <Route element={<PublicLayout />}>
          <Route index element={<PremiumHome />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/doctor" element={<DoctorLandingPage />} />
          <Route path="/find-doctors" element={<Doctors />} />
          <Route path="/practice" element={<Practices />} />
          <Route path="/lab" element={<LabLandingPage />} />
          <Route path="/pharmacy" element={<PharmacyLandingPage />} />
          <Route path="/imaging-center" element={<ImagingLandingPage />} />
          <Route path="/doctor/:slug" element={<DoctorPublicProfile />} />
          <Route path="/doctor-profile/:id" element={<DoctorProfile />} />
          <Route path="/book-appointment/:doctorId" element={<AppointmentBooking />} />
          <Route path="/booking-confirmation/:appointmentId" element={<BookingConfirmation />} />
        </Route>

        {/* Auth */}
        <Route path="/auth" element={<Auth />} />

        {/* Dashboards */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/feedback" element={<FeedbackCenter />} />

        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/staff-dashboard" element={<StaffDashboard />} />
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />

        {/* Entity dashboards */}
        <Route path="/lab/dashboard" element={<LabDashboard />} />
        <Route path="/pharmacy/dashboard" element={<PharmacyDashboard />} />
        <Route path="/imaging/dashboard" element={<ImagingDashboard />} />

        {/* Video Calls */}
        <Route path="/video-call" element={<VideoCall />} />
        <Route path="/video/:roomId" element={<VideoCall />} />

        {/* Messaging */}
        <Route path="/messages" element={<Messages />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundInline />} />
      </Routes>
    </>
  );
}
