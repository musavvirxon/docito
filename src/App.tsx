import { lazy, Suspense, type ComponentType } from "react";
import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { HelmetProvider } from "react-helmet-async";

// Layouts
import PublicLayout from "@/layouts/PublicLayout";

// Core pages loaded eagerly
import PremiumHome from "@/pages/PremiumHome";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-primary/20" />
      <div className="h-2 w-24 rounded bg-muted" />
    </div>
  </div>
);

// React.lazy wrapper that auto-reloads once on chunk load failure (stale deploy / CDN mismatch)
const __CHUNK_RELOAD_KEY__ = "__lazy_chunk_reload_ts__";
const __CHUNK_RELOAD_WINDOW_MS__ = 60_000; // 1 minute

function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await importer();
    } catch (err) {
      const now = Date.now();
      const prev = Number(sessionStorage.getItem(__CHUNK_RELOAD_KEY__) || "0");

      // Reload at most once per minute to avoid infinite reload loops
      if (!prev || now - prev > __CHUNK_RELOAD_WINDOW_MS__) {
        sessionStorage.setItem(__CHUNK_RELOAD_KEY__, String(now));
        window.location.reload();
      }

      throw err;
    }
  });
}

// Lazy load all other pages
const About = lazyWithRetry(() => import("@/pages/About"));
const Contact = lazyWithRetry(() => import("@/pages/Contact"));
const Features = lazyWithRetry(() => import("@/pages/Features"));
const Pricing = lazyWithRetry(() => import("@/pages/Pricing"));
const HowItWorks = lazyWithRetry(() => import("@/pages/HowItWorks"));
const FAQs = lazyWithRetry(() => import("@/pages/FAQs"));
const HelpCenter = lazyWithRetry(() => import("@/pages/HelpCenter"));
const Support = lazyWithRetry(() => import("@/pages/Support"));
const Legal = lazyWithRetry(() => import("@/pages/Legal"));
const LegalDetail = lazyWithRetry(() => import("@/pages/LegalDetail"));

// Provider landing pages
const DoctorLandingPage = lazyWithRetry(() => import("@/pages/doctor/DoctorLandingPage"));
const DoctorPublicProfile = lazyWithRetry(() => import("@/pages/doctor/DoctorPublicProfile"));
const PharmacyLandingPage = lazyWithRetry(() => import("@/pages/pharmacy/PharmacyLandingPage"));
const LabLandingPage = lazyWithRetry(() => import("@/pages/lab/LabLandingPage"));
const ImagingLandingPage = lazyWithRetry(() => import("@/pages/imaging/ImagingLandingPage"));
const Practices = lazyWithRetry(() => import("@/pages/Practices"));
const FindPractices = lazyWithRetry(() => import("@/pages/FindPractices"));

// Search pages
const SearchDoctors = lazyWithRetry(() => import("@/pages/SearchDoctors"));
const BrowseSpecialties = lazyWithRetry(() => import("@/pages/BrowseSpecialties"));
const CategorySearch = lazyWithRetry(() => import("@/pages/CategorySearch"));

// Booking
const AppointmentBooking = lazyWithRetry(() => import("@/pages/AppointmentBooking"));
const BookingConfirmation = lazyWithRetry(() => import("@/pages/BookingConfirmation"));

// Dashboard pages
const PatientDashboard = lazyWithRetry(() => import("@/pages/PatientDashboard"));
const DoctorDashboard = lazyWithRetry(() => import("@/pages/DoctorDashboard"));
const AdminDashboard = lazyWithRetry(() => import("@/pages/AdminDashboard"));
const StaffDashboard = lazyWithRetry(() => import("@/pages/StaffDashboard"));
const SuperAdminDashboard = lazyWithRetry(() => import("@/pages/SuperAdminDashboard"));

// Facility dashboards
const LabDashboardPage = lazyWithRetry(() => import("@/pages/lab/LabDashboardPage"));
const PharmacyDashboardPage = lazyWithRetry(() => import("@/pages/pharmacy/PharmacyDashboardPage"));
const ImagingDashboardPage = lazyWithRetry(() => import("@/pages/imaging/ImagingDashboardPage"));

// Common authenticated pages
const ProfilePage = lazyWithRetry(() => import("@/pages/ProfilePage"));
const Settings = lazyWithRetry(() => import("@/pages/Settings"));
const Notifications = lazyWithRetry(() => import("@/pages/Notifications"));
const Messages = lazyWithRetry(() => import("@/pages/Messages"));
const FeedbackCenter = lazyWithRetry(() => import("@/pages/FeedbackCenter"));
const VideoCall = lazyWithRetry(() => import("@/pages/VideoCall"));

// Doctor pages
const DoctorScheduleSettings = lazyWithRetry(() => import("@/pages/DoctorScheduleSettings"));
const TreatmentPlanning = lazyWithRetry(() => import("@/pages/TreatmentPlanning"));
const ProcedureLibrary = lazyWithRetry(() => import("@/pages/ProcedureLibrary"));
const AppointmentSession = lazyWithRetry(() => import("@/pages/AppointmentSession"));
const DoctorPatientProfile = lazyWithRetry(() => import("@/pages/doctor/DoctorPatientProfile"));

// Practice/Admin pages
const RegisterPractice = lazyWithRetry(() => import("@/pages/RegisterPractice"));
const PracticeSettings = lazyWithRetry(() => import("@/pages/PracticeSettings"));
const PracticeVerification = lazyWithRetry(() => import("@/pages/PracticeVerification"));

// Verification pages
const DoctorVerification = lazyWithRetry(() => import("@/pages/doctor/DoctorVerification"));
const LabVerification = lazyWithRetry(() => import("@/pages/lab/LabVerification"));
const PharmacyVerification = lazyWithRetry(() => import("@/pages/pharmacy/PharmacyVerification"));
const ImagingVerification = lazyWithRetry(() => import("@/pages/imaging/ImagingVerification"));

// Registration pages
const LabRegistration = lazyWithRetry(() => import("@/pages/lab/LabRegistration"));
const PharmacyRegistration = lazyWithRetry(() => import("@/pages/pharmacy/PharmacyRegistration"));
const ImagingRegistration = lazyWithRetry(() => import("@/pages/imaging/ImagingRegistration"));

// Staff invitation
const AcceptInvite = lazyWithRetry(() => import("@/pages/AcceptInvite"));

// Billing
const BillingPage = lazyWithRetry(() => import("@/pages/BillingPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes wrapped in PublicLayout */}
                <Route element={<PublicLayout />}>
                  {/* Home */}
                  <Route path="/" element={<PremiumHome />} />

                  {/* Auth */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/accept-invite" element={<AcceptInvite />} />

                  {/* Provider landing pages */}
                  <Route path="/doctor" element={<DoctorLandingPage />} />
                  <Route path="/doctors" element={<DoctorLandingPage />} />
                  <Route path="/doctor/:slug" element={<DoctorPublicProfile />} />
                  <Route path="/pharmacy" element={<PharmacyLandingPage />} />
                  <Route path="/pharmacies" element={<PharmacyLandingPage />} />
                  <Route path="/lab" element={<LabLandingPage />} />
                  <Route path="/labs" element={<LabLandingPage />} />
                  <Route path="/imaging" element={<ImagingLandingPage />} />
                  <Route path="/imaging-center" element={<ImagingLandingPage />} />
                  <Route path="/imaging-centers" element={<ImagingLandingPage />} />
                  <Route path="/practice" element={<Practices />} />
                  <Route path="/practices" element={<Practices />} />
                  <Route path="/clinics" element={<Practices />} />

                  {/* Search & discovery */}
                  <Route path="/find-doctors" element={<SearchDoctors />} />
                  <Route path="/search-doctors" element={<SearchDoctors />} />
                  <Route path="/find-practices" element={<FindPractices />} />
                  <Route path="/specialties" element={<BrowseSpecialties />} />
                  <Route path="/category/:category" element={<CategorySearch />} />

                  {/* Booking */}
                  <Route path="/book/:doctorId" element={<AppointmentBooking />} />
                  <Route path="/book-appointment/:doctorId" element={<AppointmentBooking />} />
                  <Route path="/booking-confirmation/:appointmentId" element={<BookingConfirmation />} />

                  {/* Info pages */}
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/faqs" element={<FAQs />} />
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/help-center" element={<HelpCenter />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/legal" element={<Legal />} />
                  <Route path="/legal/:slug" element={<LegalDetail />} />
                  <Route path="/feedback" element={<FeedbackCenter />} />
                </Route>

                {/* Dashboards */}
                <Route path="/patient-dashboard" element={<PatientDashboard />} />
                <Route path="/patient/dashboard" element={<PatientDashboard />} />

                <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
                <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                <Route path="/doctor/schedule" element={<DoctorScheduleSettings />} />
                <Route path="/doctor/treatment-planning" element={<TreatmentPlanning />} />
                <Route path="/doctor/procedures" element={<ProcedureLibrary />} />
                <Route path="/doctor/patient/:patientId" element={<DoctorPatientProfile />} />

                <Route path="/staff-dashboard" element={<StaffDashboard />} />
                <Route path="/staff/dashboard" element={<StaffDashboard />} />
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/practices/dashboard" element={<AdminDashboard />} />
                <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
                <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />

                {/* Facility dashboards */}
                <Route path="/dashboard/labs" element={<LabDashboardPage />} />
                <Route path="/lab/dashboard" element={<LabDashboardPage />} />
                <Route path="/dashboard/pharmacies" element={<PharmacyDashboardPage />} />
                <Route path="/pharmacy/dashboard" element={<PharmacyDashboardPage />} />
                <Route path="/dashboard/imaging" element={<ImagingDashboardPage />} />
                <Route path="/imaging/dashboard" element={<ImagingDashboardPage />} />

                {/* Registration & Verification */}
                <Route path="/register-practice" element={<RegisterPractice />} />
                <Route path="/practice-settings" element={<PracticeSettings />} />
                <Route path="/practice-verification" element={<PracticeVerification />} />

                <Route path="/doctor/verification" element={<DoctorVerification />} />
                <Route path="/lab/register" element={<LabRegistration />} />
                <Route path="/lab/verification" element={<LabVerification />} />
                <Route path="/pharmacy/register" element={<PharmacyRegistration />} />
                <Route path="/pharmacy/verification" element={<PharmacyVerification />} />
                <Route path="/imaging/register" element={<ImagingRegistration />} />
                <Route path="/imaging/verification" element={<ImagingVerification />} />

                {/* Common authenticated pages */}
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/video-call" element={<VideoCall />} />
                <Route path="/video/:roomId" element={<VideoCall />} />
                <Route path="/appointment-session/:appointmentId" element={<AppointmentSession />} />

                {/* Fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
