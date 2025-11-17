import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealTimeProvider } from "@/contexts/RealTimeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageRouter } from "@/components/LanguageRouter";
import { useTranslation } from "react-i18next";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import Index from "./pages/Index";

// Lazy load non-critical pages to reduce initial bundle size
const SignUp = lazy(() => import("./pages/SignUp"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Practices = lazy(() => import("./pages/Practices"));
const Doctors = lazy(() => import("./pages/Doctors"));
const RegisterPractice = lazy(() => import("./pages/RegisterPractice"));
const ProcessingPractice = lazy(() => import("./pages/ProcessingPractice"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const DoctorSignUp = lazy(() => import("./pages/DoctorSignUp"));
const DoctorDashboard = lazy(() => import("./pages/DoctorDashboard"));
const PatientDashboard = lazy(() => import("./pages/PatientDashboard"));
const CategorySearch = lazy(() => import("./pages/CategorySearch"));
const DoctorProfile = lazy(() => import("./pages/DoctorProfile"));
const ProcedureLibrary = lazy(() => import("./pages/ProcedureLibrary"));
const TreatmentPlanning = lazy(() => import("./pages/TreatmentPlanning"));
const AppointmentBooking = lazy(() => import("./pages/AppointmentBooking"));
const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));
const DoctorScheduleSettings = lazy(() => import("./pages/DoctorScheduleSettings"));
const VerifyPatient = lazy(() => import("./pages/VerifyPatient"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PracticeVerification = lazy(() => import("./pages/PracticeVerification"));
const AdminProfileSettings = lazy(() => import("./pages/AdminProfileSettings"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const TranslationManagement = lazy(() => import("./pages/TranslationManagement"));
const Legal = lazy(() => import("./pages/Legal"));
const LegalDetail = lazy(() => import("./pages/LegalDetail"));
const About = lazy(() => import("./pages/About"));
const LegalCMS = lazy(() => import("./pages/LegalCMS"));
const SearchDoctors = lazy(() => import("./pages/SearchDoctors"));
const BrowseSpecialties = lazy(() => import("./pages/BrowseSpecialties"));
const FindPractices = lazy(() => import("./pages/FindPractices"));
const Features = lazy(() => import("./pages/Features"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQs = lazy(() => import("./pages/FAQs"));
const Support = lazy(() => import("./pages/Support"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));

const queryClient = new QueryClient();

// Language wrapper component to handle language routing
const LanguageRoutes = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Set RTL for Arabic-based languages
    const htmlEl = document.documentElement;
    if (i18n.language === 'ar' || i18n.language === 'ur' || i18n.language === 'fa') {
      htmlEl.setAttribute('dir', 'rtl');
    } else {
      htmlEl.setAttribute('dir', 'ltr');
    }
  }, [i18n.language]);

  return (
    <LanguageRouter>
      <Routes>
      {/* Default routes (no language prefix) */}
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/practices" element={<Practices />} />
      <Route path="/doctors" element={<Doctors />} />
      <Route path="/register-practice" element={<RegisterPractice />} />
      <Route path="/processing-practice" element={<ProcessingPractice />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/doctor-signup" element={<DoctorSignUp />} />
      <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
      <Route path="/doctor-schedule-settings" element={<DoctorScheduleSettings />} />
      <Route path="/doctor-procedures" element={<ProcedureLibrary />} />
      <Route path="/procedure-library" element={<ProcedureLibrary />} />
      <Route path="/patient-dashboard" element={<PatientDashboard />} />
      <Route path="/search/:category" element={<CategorySearch />} />
      <Route path="/doctor/:id" element={<DoctorProfile />} />
      <Route path="/treatment-planning" element={<TreatmentPlanning />} />
      <Route path="/book-appointment/:doctorId" element={<AppointmentBooking />} />
      <Route path="/booking-confirmation/:appointmentId" element={<BookingConfirmation />} />
      <Route path="/verify/:token" element={<VerifyPatient />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/dashboard/verify" element={<PracticeVerification />} />
      <Route path="/admin/profile-settings" element={<AdminProfileSettings />} />
      <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/legal/:slug" element={<LegalDetail />} />
      <Route path="/about" element={<About />} />
      <Route path="/legal-cms" element={<LegalCMS />} />
      <Route path="/search-doctors" element={<SearchDoctors />} />
      <Route path="/browse-specialties" element={<BrowseSpecialties />} />
      <Route path="/find-practices" element={<FindPractices />} />
      <Route path="/features" element={<Features />} />
      <Route path="/help-center" element={<HelpCenter />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/faqs" element={<FAQs />} />
      <Route path="/support" element={<Support />} />
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      
      {/* Language-prefixed routes */}
      <Route path="/:lang/" element={<Index />} />
      <Route path="/:lang/auth" element={<Auth />} />
      <Route path="/:lang/signup" element={<SignUp />} />
      <Route path="/:lang/dashboard" element={<Dashboard />} />
      <Route path="/:lang/practices" element={<Practices />} />
      <Route path="/:lang/doctors" element={<Doctors />} />
      <Route path="/:lang/register-practice" element={<RegisterPractice />} />
      <Route path="/:lang/processing-practice" element={<ProcessingPractice />} />
      <Route path="/:lang/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/:lang/doctor-signup" element={<DoctorSignUp />} />
      <Route path="/:lang/doctor-dashboard" element={<DoctorDashboard />} />
      <Route path="/:lang/doctor-schedule-settings" element={<DoctorScheduleSettings />} />
      <Route path="/:lang/doctor-procedures" element={<ProcedureLibrary />} />
      <Route path="/:lang/procedure-library" element={<ProcedureLibrary />} />
      <Route path="/:lang/patient-dashboard" element={<PatientDashboard />} />
      <Route path="/:lang/search/:category" element={<CategorySearch />} />
      <Route path="/:lang/doctor/:id" element={<DoctorProfile />} />
      <Route path="/:lang/treatment-planning" element={<TreatmentPlanning />} />
      <Route path="/:lang/book-appointment/:doctorId" element={<AppointmentBooking />} />
      <Route path="/:lang/booking-confirmation/:appointmentId" element={<BookingConfirmation />} />
      <Route path="/:lang/verify/:token" element={<VerifyPatient />} />
      <Route path="/:lang/notifications" element={<Notifications />} />
      <Route path="/:lang/dashboard/verify" element={<PracticeVerification />} />
      <Route path="/:lang/admin/profile-settings" element={<AdminProfileSettings />} />
      <Route path="/:lang/super-admin-dashboard" element={<SuperAdminDashboard />} />
      <Route path="/:lang/legal" element={<Legal />} />
      <Route path="/:lang/legal/:slug" element={<LegalDetail />} />
      <Route path="/:lang/about" element={<About />} />
      <Route path="/:lang/legal-cms" element={<LegalCMS />} />
      <Route path="/:lang/search-doctors" element={<SearchDoctors />} />
      <Route path="/:lang/browse-specialties" element={<BrowseSpecialties />} />
      <Route path="/:lang/find-practices" element={<FindPractices />} />
      <Route path="/:lang/features" element={<Features />} />
      <Route path="/:lang/help-center" element={<HelpCenter />} />
      <Route path="/:lang/contact" element={<Contact />} />
      <Route path="/:lang/faqs" element={<FAQs />} />
      <Route path="/:lang/support" element={<Support />} />
      <Route path="/:lang/accept-invite/:token" element={<AcceptInvite />} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
    </LanguageRouter>
  );
};

const App = () => {
  useEffect(() => {
    // Initialize i18n on app load
    import('./i18n/config');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RealTimeProvider>
            <Toaster />
            <Sonner />
            <CookieConsentBanner />
            <BrowserRouter>
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                <LanguageRoutes />
              </Suspense>
            </BrowserRouter>
          </RealTimeProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
