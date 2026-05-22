import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, useParams, Outlet, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { HelmetProvider } from "react-helmet-async";
import { languages } from "@/i18n/config";
import i18n from "@/i18n/config";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import PublicLayout from "@/layouts/PublicLayout";
import { isLandingSubdomain } from "@/lib/subdomain";

const PremiumHome = lazy(() => import("@/pages/PremiumHome"));

const Auth = lazy(() => import("@/pages/Auth"));
const GuestVideoJoin = lazy(() => import("@/pages/GuestVideoJoin"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Features = lazy(() => import("@/pages/Features"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const HowItWorks = lazy(() => import("@/pages/HowItWorks"));
const FAQs = lazy(() => import("@/pages/FAQs"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));
const Support = lazy(() => import("@/pages/Support"));
const Legal = lazy(() => import("@/pages/Legal"));
const LegalDetail = lazy(() => import("@/pages/LegalDetail"));
const CookiePolicy = lazy(() => import("@/pages/CookiePolicy"));
const FeedbackCenter = lazy(() => import("@/pages/FeedbackCenter"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const BlogIndex = lazy(() => import("@/pages/blog/BlogIndex"));
const BlogPost = lazy(() => import("@/pages/blog/BlogPost"));

const DoctorLandingPage = lazy(() => import("@/pages/doctor/DoctorLandingPage"));
const DoctorPublicProfile = lazy(() => import("@/pages/doctor/DoctorPublicProfile"));
const PharmacyLandingPage = lazy(() => import("@/pages/pharmacy/PharmacyLandingPage"));
const LabLandingPage = lazy(() => import("@/pages/lab/LabLandingPage"));
const ImagingLandingPage = lazy(() => import("@/pages/imaging/ImagingLandingPage"));
const Practices = lazy(() => import("@/pages/Practices"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const FindPractices = lazy(() => import("@/pages/FindPractices"));

const SearchDoctors = lazy(() => import("@/pages/SearchDoctors"));
const BrowseSpecialties = lazy(() => import("@/pages/BrowseSpecialties"));
const CategorySearch = lazy(() => import("@/pages/CategorySearch"));

const AppointmentBooking = lazy(() => import("@/pages/AppointmentBooking"));
const BookingConfirmation = lazy(() => import("@/pages/BookingConfirmation"));

const PatientDashboard = lazy(() => import("@/pages/PatientDashboard"));
const DoctorDashboard = lazy(() => import("@/pages/DoctorDashboard"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const StaffDashboard = lazy(() => import("@/pages/StaffDashboard"));
const SuperAdminDashboard = lazy(() => import("@/pages/SuperAdminDashboard"));
const AdminVideoBookingStatus = lazy(() => import("@/pages/AdminVideoBookingStatus"));

const LabDashboardPage = lazy(() => import("@/pages/lab/LabDashboardPage"));
const PharmacyDashboardPage = lazy(() => import("@/pages/pharmacy/PharmacyDashboardPage"));
const ImagingDashboardPage = lazy(() => import("@/pages/imaging/ImagingDashboardPage"));

const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const Settings = lazy(() => import("@/pages/Settings"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Messages = lazy(() => import("@/pages/Messages"));
const VideoCall = lazy(() => import("@/pages/VideoCall"));
const AppointmentSession = lazy(() => import("@/pages/AppointmentSession"));
const BillingPage = lazy(() => import("@/pages/BillingPage"));

const FinanceDashboard = lazy(() => import("@/pages/FinanceDashboard"));

const DoctorScheduleSettings = lazy(() => import("@/pages/DoctorScheduleSettings"));
const TreatmentPlanning = lazy(() => import("@/pages/TreatmentPlanning"));
const ProcedureLibrary = lazy(() => import("@/pages/ProcedureLibrary"));
const DoctorPatientProfile = lazy(() => import("@/pages/doctor/DoctorPatientProfile"));

const RegisterPractice = lazy(() => import("@/pages/RegisterPractice"));
const PracticeSettings = lazy(() => import("@/pages/PracticeSettings"));
const PracticeVerification = lazy(() => import("@/pages/PracticeVerification"));

const DoctorVerification = lazy(() => import("@/pages/doctor/DoctorVerification"));
const LabVerification = lazy(() => import("@/pages/lab/LabVerification"));
const PharmacyVerification = lazy(() => import("@/pages/pharmacy/PharmacyVerification"));
const ImagingVerification = lazy(() => import("@/pages/imaging/ImagingVerification"));

const LabRegistration = lazy(() => import("@/pages/lab/LabRegistration"));
const PharmacyRegistration = lazy(() => import("@/pages/pharmacy/PharmacyRegistration"));
const ImagingRegistration = lazy(() => import("@/pages/imaging/ImagingRegistration"));

const AcceptInvite = lazy(() => import("@/pages/AcceptInvite"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));

const supportedLangCodes = languages.map((l) => l.code);

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex animate-pulse flex-col items-center gap-4">
      <div className="h-12 w-12 rounded-full bg-primary/20" />
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

function DefaultBlogIndexRedirect() {
  return <Navigate to="/en/blog" replace />;
}

function DefaultBlogPostRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={slug ? `/en/blog/${slug}` : "/en/blog"} replace />;
}

export default function App() {
  // If on landing subdomain, render only the landing page
  if (isLandingSubdomain()) {
    return (
      <HelmetProvider>
        <ThemeProvider>
          <AuthProvider>
            <CurrencyProvider>
              <Suspense fallback={<PageLoader />}>
                <RouteErrorBoundary>
                  <Routes>
                    <Route element={<PublicLayout />}>
                      <Route path="*" element={<LandingPage />} />
                    </Route>
                  </Routes>
                </RouteErrorBoundary>
              </Suspense>
              <Toaster position="top-right" richColors />
            </CurrencyProvider>
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    );
  }

  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <CurrencyProvider>
            <Suspense fallback={<PageLoader />}>
            <RouteErrorBoundary>
              <Routes>
                <Route path="v/:token" element={<GuestVideoJoin />} />
                {supportedLangCodes.map((code) => (
                <Route key={code} path={code} element={<LanguageWrapper />}>
                  <Route element={<PublicLayout />}>
                    <Route index element={<PremiumHome />} />
                    <Route path="auth" element={<Auth />} />
                    <Route path="accept-invite/:token" element={<AcceptInvite />} />
                    <Route path="accept-invite" element={<AcceptInvite />} />
                    <Route path="doctor" element={<DoctorLandingPage />} />
                    <Route path="doctors" element={<DoctorLandingPage />} />
                    <Route path="doctor/:slug" element={<DoctorPublicProfile />} />
                    <Route path="dr/:slug" element={<DoctorPublicProfile />} />
                    <Route path="landing" element={<LandingPage />} />
                    <Route path="start" element={<LandingPage />} />
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
                    <Route
                      path="booking-confirmation/:appointmentId"
                      element={<BookingConfirmation />}
                    />
                    <Route path="about" element={<About />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="features" element={<Features />} />
                    <Route path="pricing" element={<Pricing />} />
                    <Route path="how-it-works" element={<HowItWorks />} />
                    <Route path="faqs" element={<FAQs />} />
                    <Route path="help" element={<HelpCenter />} />
                    <Route path="help-center" element={<HelpCenter />} />
                    <Route path="support" element={<Support />} />
                    <Route path="admin-video-status/:token" element={<AdminVideoBookingStatus />} />
                    <Route path="legal" element={<Legal />} />
                    <Route path="legal/:slug" element={<LegalDetail />} />
                    <Route path="cookies" element={<CookiePolicy />} />
                    <Route path="cookie-policy" element={<CookiePolicy />} />
                    <Route path="legal/cookies" element={<CookiePolicy />} />
                    <Route path="legal/cookie-policy" element={<CookiePolicy />} />
                    <Route path="feedback" element={<FeedbackCenter />} />
                    <Route path="blog" element={<BlogIndex />} />
                    <Route path="blog/:slug" element={<BlogPost />} />
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
                  <Route path="finance" element={<FinanceDashboard />} />
                  <Route path="finance-dashboard" element={<FinanceDashboard />} />
                  <Route path="video-call" element={<VideoCall />} />
                  <Route path="video/:roomId" element={<VideoCall />} />
                  <Route
                    path="appointment-session/:appointmentId"
                    element={<AppointmentSession />}
                  />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                ))}

                <Route element={<PublicLayout />}>
                  <Route index element={<PremiumHome />} />
                  <Route path="auth" element={<Auth />} />
                  <Route path="accept-invite/:token" element={<AcceptInvite />} />
                  <Route path="accept-invite" element={<AcceptInvite />} />
                  <Route path="doctor" element={<DoctorLandingPage />} />
                  <Route path="doctors" element={<DoctorLandingPage />} />
                  <Route path="doctor/:slug" element={<DoctorPublicProfile />} />
                  <Route path="dr/:slug" element={<DoctorPublicProfile />} />
                  <Route path="landing" element={<LandingPage />} />
                  <Route path="start" element={<LandingPage />} />
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
                  <Route
                    path="booking-confirmation/:appointmentId"
                    element={<BookingConfirmation />}
                  />
                  <Route path="about" element={<About />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="features" element={<Features />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="how-it-works" element={<HowItWorks />} />
                  <Route path="faqs" element={<FAQs />} />
                  <Route path="help" element={<HelpCenter />} />
                  <Route path="help-center" element={<HelpCenter />} />
                  <Route path="support" element={<Support />} />
                  <Route path="admin-video-status/:token" element={<AdminVideoBookingStatus />} />
                  <Route path="legal" element={<Legal />} />
                  <Route path="legal/:slug" element={<LegalDetail />} />
                  <Route path="cookies" element={<CookiePolicy />} />
                  <Route path="cookie-policy" element={<CookiePolicy />} />
                  <Route path="legal/cookies" element={<CookiePolicy />} />
                  <Route path="legal/cookie-policy" element={<CookiePolicy />} />
                  <Route path="feedback" element={<FeedbackCenter />} />
                  <Route path="blog" element={<DefaultBlogIndexRedirect />} />
                  <Route path="blog/:slug" element={<DefaultBlogPostRedirect />} />
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
                <Route path="finance" element={<FinanceDashboard />} />
                <Route path="finance-dashboard" element={<FinanceDashboard />} />
                <Route path="video-call" element={<VideoCall />} />
                <Route path="video/:roomId" element={<VideoCall />} />
                <Route
                  path="appointment-session/:appointmentId"
                  element={<AppointmentSession />}
                />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </RouteErrorBoundary>
          </Suspense>

            <Toaster position="top-right" richColors />
          </CurrencyProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}
