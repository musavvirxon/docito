// ─────────────────────────────────────────────────────────────
// HOW TO WIRE LandingPage INTO YOUR ROUTER
// ─────────────────────────────────────────────────────────────
//
// In your src/App.tsx (or wherever react-router routes are defined),
// add the following import and route:
//
//   import LandingPage from "@/pages/LandingPage";
//
//   // Inside your <Routes> block:
//   <Route path="/start" element={<LandingPage />} />
//
//   // OR if you want it at the root path ("/"),
//   // replace or wrap your existing home route:
//   <Route path="/" element={<LandingPage />} />
//
// ─────────────────────────────────────────────────────────────
// SUPABASE INTEGRATION NOTES
// ─────────────────────────────────────────────────────────────
//
// QuizFunnel.tsx imports from "@/integrations/supabase/client"
// which is the standard Lovable.dev path. That file should export:
//
//   export const supabase = createClient(
//     import.meta.env.VITE_SUPABASE_URL,
//     import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
//   );
//
// If your file is at a different path, update the import in:
//   src/components/landing/QuizFunnel.tsx  (line 8)
//
// ─────────────────────────────────────────────────────────────
// DEPLOY EDGE FUNCTION
// ─────────────────────────────────────────────────────────────
//
//   supabase functions deploy submit-lead --no-verify-jwt
//
// ─────────────────────────────────────────────────────────────
// RUN MIGRATION
// ─────────────────────────────────────────────────────────────
//
//   supabase db push
//
// ─────────────────────────────────────────────────────────────
