import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealTimeProvider } from "@/contexts/RealTimeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
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
const DoctorProcedures = lazy(() => import("./pages/DoctorProcedures"));
const VerifyPatient = lazy(() => import("./pages/VerifyPatient"));
const FindDoctors = lazy(() => import("./pages/FindDoctors"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PracticeVerification = lazy(() => import("./pages/PracticeVerification"));
const AdminProfileSettings = lazy(() => import("./pages/AdminProfileSettings"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <RealTimeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
              <Routes>
                <Route path="/" element={<Index />} />
...
                <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
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
