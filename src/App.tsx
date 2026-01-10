import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { BookingProvider } from "@/contexts/BookingContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import AppointmentBooking from "@/pages/AppointmentBooking";
import BookingConfirmation from "@/pages/BookingConfirmation";
import DoctorProfile from "@/pages/DoctorProfile";

import PublicLayout from "@/components/PublicLayout";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Doctors from "@/pages/Doctors";
import Services from "@/pages/Services";
import Practices from "@/pages/Practices";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    document.title = "Medical Booking App";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoleProvider>
          <BookingProvider>
            <BrowserRouter>
              <Toaster />
              <Routes>
                {/* ✅ PUBLIC ROUTES */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />

                {/* ✅ PUBLIC LAYOUT ROUTES */}
                <Route path="/" element={<PublicLayout />}>
                  <Route path="about" element={<About />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="doctor" element={<Doctors />} />
                  <Route path="services" element={<Services />} />
                  <Route path="practice" element={<Practices />} />
                </Route>

                {/* ✅ APP ROUTES */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />

                {/* ✅ PATIENT BOOKING FLOW */}
                <Route path="/book-appointment/:doctorId" element={<AppointmentBooking />} />
                <Route path="/booking-confirmation/:appointmentId" element={<BookingConfirmation />} />

                {/* ✅ DOCTOR PROFILE */}
                <Route path="/doctor-profile/:id" element={<DoctorProfile />} />

                {/* ✅ 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </BookingProvider>
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
