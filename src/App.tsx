// src/App.tsx
import { Suspense, useEffect } from "react";
import { Routes, Route, useParams, Outlet, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { HelmetProvider } from "react-helmet-async";
import { languages } from "@/i18n/config";
import i18n from "@/i18n/config";

// Layouts
import PublicLayout from "@/layouts/PublicLayout";

// Public pages
import PremiumHome from "@/pages/PremiumHome";
import Auth from "@/pages/Auth";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Features from "@/pages/Features";
import Pricing from "@/pages/Pricing";
import HowItWorks from "@/pages/HowItWorks";
import FAQs from "@/pages/FAQs";
import HelpCenter from "@/pages/HelpCenter";
import Support from "@/pages/Support";
import Legal from "@/pages/Legal";
import LegalDetail from "@/pages/LegalDetail";
import FeedbackCenter from "@/pages/FeedbackCenter";
import NotFound from "@/pages/NotFound";

// Provider landing pages
import DoctorLandingPage from "@/pages/doctor/DoctorLandingPage";
import DoctorPublicProfile from "@/pages/doctor/DoctorPublicProfile";
import PharmacyLandingPage from "@/pages/pharmacy/PharmacyLandingPage";
import LabLandingPage from "@/pages/lab/LabLandingPage";
import ImagingLandingPage from "@/pages/imaging/ImagingLandingPage";
import Practices from "@/pages/Practices";
import FindPractices from "@/pages/FindPractices";

// Search pages
import SearchDoctors from "@/pages/SearchDoctors";
import BrowseSpecialties from "@/pages/BrowseSpecialties";
import CategorySearch from "@/pages/CategorySearch";

// Booking
import AppointmentBooking from "@/pages/AppointmentBooking";
import BookingConfirmation from "@/pages/BookingConfirmation";

// Dashboards
import PatientDashboard from "@/pages/PatientDashboard";
import DoctorDashboard from "@/pages/DoctorDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import StaffDashboard from "@/pages/StaffDashboard";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";

// Facility dashboards
import LabDashboardPage from "@/pages/lab/LabDashboardPage";
import PharmacyDashboardPage from "@/pages/pharmacy/PharmacyDashboardPage";
import ImagingDashboardPage from "@/pages/imaging/ImagingDashboardPage";

// Common authenticated pages
import ProfilePage from "@/pages/ProfilePage";
import Settings from "@/pages/Settings";
import Notifications from "@/pages/Notifications";
import Messages from "@/pages/Messages";
import VideoCall from "@/pages/VideoCall";
import AppointmentSession from "@/pages/AppointmentSession";
import BillingPage from "@/pages/BillingPage";

// Doctor pages
import DoctorScheduleSettings from "@/pages/DoctorScheduleSettings";
import TreatmentPlanning from "@/pages/TreatmentPlanning";
import ProcedureLibrary from "@/pages/ProcedureLibrary";
import DoctorPatientProfile from "@/pages/doctor/DoctorPatientProfile";

// Practice/Admin pages
import RegisterPractice from "@/pages/RegisterPractice";
import PracticeSettings from "@/pages/PracticeSettings";
import PracticeVerification from "@/pages/PracticeVerification";

// Verification pages
import DoctorVerification from "@/pages/doctor/DoctorVerification";
import LabVerification from "@/pages/lab/LabVerification";
import PharmacyVerification from "@/pages/pharmacy/PharmacyVerification";
import ImagingVerification from "@/pages/imaging/ImagingVerification";

// Registration pages
import LabRegistration from "@/pages/lab/LabRegistration";
import PharmacyRegistration from "@/pages/pharmacy/PharmacyRegistration";
import ImagingRegistration from "@/pages/imaging/ImagingRegistration";

// Staff invitation
import AcceptInvite from "@/pages/AcceptInvite";

const supportedLangCodes = languages.map((l) => l.code);

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-primary/20" />
      <div className="h-2 w-24 rounded bg-muted" />
    </div>
  </div>
);

function LanguageWrapper() {
  const { lang } = useParams<{ lang: string }>();

  useEffect(() => {
    if (lang && supportedLangCodes.includes(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang]);

  return <Outlet />;
}

function LangRedirect({ to }: { to: string }) {
  const { lang } = useParams<{ lang: string }>();
  const normalized = to.startsWith("/") ? to : `/${to}`;
  return <Navigate to={lang ? `/${lang}${normalized}` : normalized} replace />;
}

export default function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path=":lang" element={<LanguageWrapper />}>
                <Route element={<PublicLayout />}>
                  <Route index element={<PremiumHome />} />
                  <Route path="auth" element={<Auth />} />
                  <Route path="accept-invite" element={<AcceptInvite />} />
                  <Route path="doctor" element={<DoctorLandingPage />} />
                  <Route path="doctors" element={<DoctorLandingPage />} />
                  <Route path="doctor/:slug" element={<DoctorPublicProfile />} />
                  <Route path="pharmacy" element={<PharmacyLandingPage />} />
                  <Route path="pharmacies" element={<PharmacyLandingPage />} />
                  <Route path="lab" element={<LabLandingPage />} />
                  <Route path="labs" element={<LabLandingPage />} />
                  <Route path="imaging" element={<ImagingLandingPage />} />
                  <Route path="imaging-center" element={<ImagingLandingPage />} />
                  <Route path="imaging-centers" element={<ImagingLandingPage />} />
                  <Route path="practice" element={<Practices />} />
                  <Route path="practices" element={<Practices />} />
                  <Route path="clinics" element={<Practices />} />
                  <Route path="find-doctors" element={<SearchDoctors />} />
                  <Route path="search-doctors" element={<SearchDoctors />} />
                  <Route path="find-practices" element={<FindPractices />} />
                  <Route path="specialties" element={<BrowseSpecialties />} />
                  <Route path="category/:category" element={<CategorySearch />} />
                  <Route path="book/:doctorId" element={<AppointmentBooking />} />
                  <Route path="book-appointment/:doctorId" element={<AppointmentBooking />} />
                  <Route path="booking-confirmation/:appointmentId" element={<BookingConfirmation />} />
                  <Route path="about" element={<About />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="features" element={<Features />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="how-it-works" element={<HowItWorks />} />
                  <Route path="faqs" element={<FAQs />} />
                  <Route path="help" element={<HelpCenter />} />
                  <Route path="help-center" element={<HelpCenter />} />
                  <Route path="support" element={<Support />} />
                  <Route path="legal" element={<Legal />} />
                  <Route path="legal/:slug" element={<LegalDetail />} />

                  {/* Legacy/alias legal routes */}
                  <Route path="privacy" element={<LangRedirect to="/legal/privacy-policy" />} />
                  <Route path="terms" element={<LangRedirect to="/legal/terms-of-service" />} />
                  <Route path="cookies" element={<LangRedirect to="/legal/cookies" />} />
                  <Route path="cookie-policy" element={<LangRedirect to="/legal/cookies" />} />
                  <Route path="legal/cookie-policy" element={<LangRedirect to="/legal/cookies" />} />
                  <Route path="hipaa" element={<LangRedirect to="/legal/hipaa" />} />

                  <Route path="feedback" element={<FeedbackCenter />} />
                </Route>

                <Route path="patient-dashboard" element={<PatientDashboard />} />
                <Route path="patient/dashboard" element={<PatientDashboard />} />
                <Route path="doctor-dashboard" element={<DoctorDashboard />} />
                <Route path="doctor/dashboard" element={<DoctorDashboard />} />
                <Route path="doctor/schedule" element={<DoctorScheduleSettings />} />
                <Route path="doctor/treatment-planning" element={<TreatmentPlanning />} />
                <Route path="doctor/procedures" element={<ProcedureLibrary />} />
                <Route path="doctor/patient/:patientId" element={<DoctorPatientProfile />} />
                <Route path="staff-dashboard" element={<StaffDashboard />} />
                <Route path="staff/dashboard" element={<StaffDashboard />} />
                <Route path="admin-dashboard" element={<AdminDashboard />} />
                <Route path="admin/dashboard" element={<AdminDashboard />} />
                <Route path="practices/dashboard" element={<AdminDashboard />} />
                <Route path="super-admin-dashboard" element={<SuperAdminDashboard />} />
                <Route path="super-admin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="dashboard/labs" element={<LabDashboardPage />} />
                <Route path="lab/dashboard" element={<LabDashboardPage />} />
                <Route path="dashboard/pharmacies" element={<PharmacyDashboardPage />} />
                <Route path="pharmacy/dashboard" element={<PharmacyDashboardPage />} />
                <Route path="dashboard/imaging" element={<ImagingDashboardPage />} />
                <Route path="imaging/dashboard" element={<ImagingDashboardPage />} />
                <Route path="register-practice" element={<RegisterPractice />} />
                <Route path="practice-settings" element={<PracticeSettings />} />
                <Route path="practice-verification" element={<PracticeVerification />} />
                <Route path="doctor/verification" element={<DoctorVerification />} />
                <Route path="lab/register" element={<LabRegistration />} />
                <Route path="lab/verification" element={<LabVerification />} />
                <Route path="pharmacy/register" element={<PharmacyRegistration />} />
                <Route path="pharmacy/verification" element={<ImagingVerification />} />
                <Route path="imaging/register" element={<ImagingRegistration />} />
                <Route path="imaging/verification" element={<ImagingVerification />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<Settings />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="messages" element={<Messages />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="video-call" element={<VideoCall />} />
                <Route path="video/:roomId" element={<VideoCall />} />
                <Route path="appointment-session/:appointmentId" element={<AppointmentSession />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route element={<PublicLayout />}>
                <Route index element={<PremiumHome />} />
                <Route path="auth" element={<Auth />} />
                <Route path="accept-invite" element={<AcceptInvite />} />
                <Route path="doctor" element={<DoctorLandingPage />} />
                <Route path="doctors" element={<DoctorLandingPage />} />
                <Route path="doctor/:slug" element={<DoctorPublicProfile />} />
                <Route path="pharmacy" element={<PharmacyLandingPage />} />
                <Route path="pharmacies" element={<PharmacyLandingPage />} />
                <Route path="lab" element={<LabLandingPage />} />
                <Route path="labs" element={<LabLandingPage />} />
                <Route path="imaging" element={<ImagingLandingPage />} />
                <Route path="imaging-center" element={<ImagingLandingPage />} />
                <Route path="imaging-centers" element={<ImagingLandingPage />} />
                <Route path="practice" element={<Practices />} />
                <Route path="practices" element={<Practices />} />
                <Route path="clinics" element={<Practices />} />
                <Route path="find-doctors" element={<SearchDoctors />} />
                <Route path="search-doctors" element={<SearchDoctors />} />
                <Route path="find-practices" element={<FindPractices />} />
                <Route path="specialties" element={<BrowseSpecialties />} />
                <Route path="category/:category" element={<CategorySearch />} />
                <Route path="book/:doctorId" element={<AppointmentBooking />} />
                <Route path="book-appointment/:doctorId" element={<AppointmentBooking />} />
                <Route path="booking-confirmation/:appointmentId" element={<BookingConfirmation />} />
                <Route path="about" element={<About />} />
                <Route path="contact" element={<Contact />} />
                <Route path="features" element={<Features />} />
                <Route path="pricing" element={<Pricing />} />
                <Route path="how-it-works" element={<HowItWorks />} />
                <Route path="faqs" element={<FAQs />} />
                <Route path="help" element={<HelpCenter />} />
                <Route path="help-center" element={<HelpCenter />} />
                <Route path="support" element={<Support />} />
                <Route path="legal" element={<Legal />} />
                <Route path="legal/:slug" element={<LegalDetail />} />

                {/* Legacy/alias legal routes */}
                <Route path="privacy" element={<Navigate to="/legal/privacy-policy" replace />} />
                <Route path="terms" element={<Navigate to="/legal/terms-of-service" replace />} />
                <Route path="cookies" element={<Navigate to="/legal/cookies" replace />} />
                <Route path="cookie-policy" element={<Navigate to="/legal/cookies" replace />} />
                <Route path="legal/cookie-policy" element={<Navigate to="/legal/cookies" replace />} />
                <Route path="hipaa" element={<Navigate to="/legal/hipaa" replace />} />

                <Route path="feedback" element={<FeedbackCenter />} />
              </Route>

              <Route path="patient-dashboard" element={<PatientDashboard />} />
              <Route path="patient/dashboard" element={<PatientDashboard />} />
              <Route path="doctor-dashboard" element={<DoctorDashboard />} />
              <Route path="doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="doctor/schedule" element={<DoctorScheduleSettings />} />
              <Route path="doctor/treatment-planning" element={<TreatmentPlanning />} />
              <Route path="doctor/procedures" element={<ProcedureLibrary />} />
              <Route path="doctor/patient/:patientId" element={<DoctorPatientProfile />} />
              <Route path="staff-dashboard" element={<StaffDashboard />} />
              <Route path="staff/dashboard" element={<StaffDashboard />} />
              <Route path="admin-dashboard" element={<AdminDashboard />} />
              <Route path="admin/dashboard" element={<AdminDashboard />} />
              <Route path="practices/dashboard" element={<AdminDashboard />} />
              <Route path="super-admin-dashboard" element={<SuperAdminDashboard />} />
              <Route path="super-admin/dashboard" element={<SuperAdminDashboard />} />
              <Route path="dashboard/labs" element={<LabDashboardPage />} />
              <Route path="lab/dashboard" element={<LabDashboardPage />} />
              <Route path="dashboard/pharmacies" element={<PharmacyDashboardPage />} />
              <Route path="pharmacy/dashboard" element={<PharmacyDashboardPage />} />
              <Route path="dashboard/imaging" element={<ImagingDashboardPage />} />
              <Route path="imaging/dashboard" element={<ImagingDashboardPage />} />
              <Route path="register-practice" element={<RegisterPractice />} />
              <Route path="practice-settings" element={<PracticeSettings />} />
              <Route path="practice-verification" element={<PracticeVerification />} />
              <Route path="doctor/verification" element={<DoctorVerification />} />
              <Route path="lab/register" element={<LabRegistration />} />
              <Route path="lab/verification" element={<LabVerification />} />
              <Route path="pharmacy/register" element={<PharmacyRegistration />} />
              <Route path="pharmacy/verification" element={<PharmacyVerification />} />
              <Route path="imaging/register" element={<ImagingRegistration />} />
              <Route path="imaging/verification" element={<ImagingVerification />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<Settings />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="messages" element={<Messages />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="video-call" element={<VideoCall />} />
              <Route path="video/:roomId" element={<VideoCall />} />
              <Route path="appointment-session/:appointmentId" element={<AppointmentSession />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>

          <Toaster position="top-right" richColors />
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}
