// Path: src/App.tsx
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Existing imports in your app:
import BillingPage from "@/pages/BillingPage";
import NotificationsPage from "@/pages/NotificationsPage";
import VerificationPage from "@/pages/verification/VerificationPage";
import AdminVerificationQueuePage from "@/pages/admin/AdminVerificationQueuePage";
import ImagingOrdersPage from "@/pages/imaging/ImagingOrdersPage";

// TODO: add your existing pages/routes here as you already have them.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/verification/:entityType" element={<VerificationPage />} />
            <Route path="/admin/verification" element={<AdminVerificationQueuePage />} />
            <Route path="/imaging/orders" element={<ImagingOrdersPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
