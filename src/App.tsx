import { useEffect, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import PublicLayout from "@/layouts/PublicLayout";

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Lazy load all pages for code splitting
const PremiumHome = lazy(() => import("@/pages/PremiumHome"));
const Auth = lazy(() => import("@/pages/Auth"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Features = lazy(() => import("@/pages/Features"));
const Pricing = lazy(() => import("@/pages/Pricing"));

const Doctors = lazy(() => import("@/pages/Doctors"));
const Practices = lazy(() => import("@/pages/Practices"));

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));

const PatientDashboard = lazy(() => import("@/pages/PatientDashboard"));
const DoctorDashboard = lazy(() => import("@/pages/DoctorDashboard"));
const StaffDashboard = lazy(() => import("@/pages/StaffDashboard"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const SuperAdminDashboard = lazy(() => import("@/pages/SuperAdminDashboard"));

const LabLandingPage = lazy(() => import("@/pages/lab/LabLandingPage"));
const LabDashboard = lazy(() => import("@/pages/lab/LabDashboard"));

const PharmacyLandingPage = lazy(() => import("@/pages/pharmacy/PharmacyLandingPage"));
const PharmacyDashboard = lazy(() => import("@/pages/pharmacy/PharmacyDashboard"));

const ImagingLandingPage = lazy(() => import("@/pages/imaging/ImagingLandingPage"));
const ImagingDashboard = lazy(() => import("@/pages/imaging/ImagingDashboard"));

const AppointmentBooking = lazy(() => import("@/pages/AppointmentBooking"));
const BookingConfirmation = lazy(() => import("@/pages/BookingConfirmation"));
const DoctorProfile = lazy(() => import("@/pages/DoctorProfile"));
const DoctorPublicProfile = lazy(() => import("@/pages/doctor/DoctorPublicProfile"));
const VideoCall = lazy(() => import("@/pages/VideoCall"));
const Messages = lazy(() => import("@/pages/Messages"));
const FeedbackCenter = lazy(() => import("@/pages/FeedbackCenter"));

const NotFound = lazy(() => import("@/pages/NotFound"));

export default function App() {
  useEffect(() => {
    document.title = "Medical Booking App";
  }, []);

  return (
    <>
      <Toaster />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public pages with layout */}
          <Route element={<PublicLayout />}>
            <Route index element={<PremiumHome />} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
