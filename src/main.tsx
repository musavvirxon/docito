import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react';
import App from './App.tsx';
import './index.css';
import './i18n/config';

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
