import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealTimeProvider } from "@/contexts/RealTimeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <RealTimeProvider>
          <Toaster />
          <Sonner />
          <CookieConsentBanner />
          <BrowserRouter>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
              <Routes>
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
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </RealTimeProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
