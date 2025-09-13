import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Index from "./pages/Index";

// Lazy load non-critical pages to reduce initial bundle size
const SignUp = lazy(() => import("./pages/SignUp"));
const Practices = lazy(() => import("./pages/Practices"));
const Doctors = lazy(() => import("./pages/Doctors"));
const RegisterPractice = lazy(() => import("./pages/RegisterPractice"));
const ProcessingPractice = lazy(() => import("./pages/ProcessingPractice"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const DoctorSignUp = lazy(() => import("./pages/DoctorSignUp"));
const DoctorDashboard = lazy(() => import("./pages/DoctorDashboard"));
const PatientDashboard = lazy(() => import("./pages/PatientDashboard"));
const CategorySearch = lazy(() => import("./pages/CategorySearch"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const DoctorProfile = lazy(() => import("./pages/DoctorProfile"));
const ProcedureLibrary = lazy(() => import("./pages/ProcedureLibrary"));
const TreatmentPlanning = lazy(() => import("./pages/TreatmentPlanning"));
const AppointmentBooking = lazy(() => import("./pages/AppointmentBooking"));
const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/practices" element={<Practices />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/register-practice" element={<RegisterPractice />} />
            <Route path="/processing-practice" element={<ProcessingPractice />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/doctor-signup" element={<DoctorSignUp />} />
            <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
            <Route path="/patient-dashboard" element={<PatientDashboard />} />
            <Route path="/search/:category" element={<CategorySearch />} />
            <Route path="/search-results" element={<SearchResults />} />
            <Route path="/doctor/:id" element={<DoctorProfile />} />
            <Route path="/procedure-library" element={<ProcedureLibrary />} />
            <Route path="/treatment-planning" element={<TreatmentPlanning />} />
            <Route path="/book-appointment/:doctorId" element={<AppointmentBooking />} />
            <Route path="/booking-confirmation/:appointmentId" element={<BookingConfirmation />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
