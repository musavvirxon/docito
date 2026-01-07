import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

import { AuthProvider } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
