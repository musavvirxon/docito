// File: src/App.tsx

import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import PublicLayout from "@/layouts/PublicLayout";
import { Button } from "@/components/ui/button";

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Lazy load pages (keep for most routes)
const PremiumHome = lazy(() => import("@/pages/PremiumHome"));
const Auth = lazy(() => import("@/pages/Auth"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Features = lazy(() => import("@/pages/Features"));
const Pricing = lazy(() => import("@/pages/Pricing"));

const DoctorLandingPage = lazy(() => import("@/pages/doctor/DoctorLandingPage"));
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
const LabRegistration = lazy(() => import("@/pages/lab/LabRegistration"));
const LabVerification = lazy(() => import("@/pages/lab/LabVerification"));

const PharmacyLandingPage = lazy(() => import("@/pages/pharmacy/PharmacyLandingPage"));
const PharmacyDashboard = lazy(() => import("@/pages/pharmacy/PharmacyDashboard"));
const PharmacyRegistration = lazy(() => import("@/pages/pharmacy/PharmacyRegistration"));
const PharmacyVerification = lazy(() => import("@/pages/pharmacy/PharmacyVerification"));

const ImagingLandingPage = lazy(() => import("@/pages/imaging/ImagingLandingPage"));
const ImagingDashboard = lazy(() => import("@/pages/imaging/ImagingDashboard"));
const ImagingRegistration = lazy(() => import("@/pages/imaging/ImagingRegistration"));
const ImagingVerification = lazy(() => import("@/pages/imaging/ImagingVerification"));

const PracticeVerification = lazy(() => import("@/pages/PracticeVerification"));

const AppointmentBooking = lazy(() => import("@/pages/AppointmentBooking"));
const BookingConfirmation = lazy(() => import("@/pages/BookingConfirmation"));
const DoctorProfile = lazy(() => import("@/pages/DoctorProfile"));
const DoctorPublicProfile = lazy(() => import("@/pages/doctor/DoctorPublicProfile"));
const VideoCall = lazy(() => import("@/pages/VideoCall"));
const Messages = lazy(() => import("@/pages/Messages"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const FeedbackCenter = lazy(() => import("@/pages/FeedbackCenter"));

/**
 * IMPORTANT:
 * Do NOT lazy-load NotFound. A stale browser cache can try to fetch an old chunk name
 * (e.g., NotFound-xxxx.js) and cause a blank screen in Lovable previews.
 * Keeping NotFound inline avoids that entire failure mode.
 */
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

      <Suspense fallback={<PageLoader />}>
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

          {/* Practice verification (topbar badge target for clinic roles) */}
          <Route path="/dashboard/verify" element={<PracticeVerification />} />

          {/* Entity dashboards */}
          <Route path="/lab/dashboard" element={<LabDashboard />} />
          <Route path="/pharmacy/dashboard" element={<PharmacyDashboard />} />
          <Route path="/imaging/dashboard" element={<ImagingDashboard />} />

          {/* Verification pages (topbar badge targets for lab/imaging/pharmacy) */}
          <Route path="/lab/verification" element={<LabVerification />} />
          <Route path="/pharmacy/verification" element={<PharmacyVerification />} />
          <Route path="/imaging/verification" element={<ImagingVerification />} />

          {/* Registration pages (used by verification pages + empty states) */}
          <Route path="/lab/register" element={<LabRegistration />} />
          <Route path="/pharmacy/register" element={<PharmacyRegistration />} />
          <Route path="/imaging/register" element={<ImagingRegistration />} />

          {/* Keep old settings route, but route into dashboard (no separate settings page/chunk) */}
          <Route path="/imaging/settings" element={<Navigate to="/imaging/dashboard" replace />} />

          {/* Video Calls */}
          <Route path="/video-call" element={<VideoCall />} />
          <Route path="/video/:roomId" element={<VideoCall />} />

          {/* Messaging */}
          <Route path="/messages" element={<Messages />} />

          {/* Notifications (used by dashboard top bar bell) */}
          <Route path="/notifications" element={<Notifications />} />

          {/* 404 (NOT lazy-loaded) */}
          <Route path="*" element={<NotFoundInline />} />
        </Routes>
      </Suspense>
    </>
  );
}
