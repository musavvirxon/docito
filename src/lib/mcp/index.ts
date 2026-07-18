import { auth, defineMcp } from "@lovable.dev/mcp-js";

import whoamiTool from "./tools/whoami";
import listMyAppointmentsTool from "./tools/list-my-appointments";
import listMyPrescriptionsTool from "./tools/list-my-prescriptions";
import listMyTreatmentPlansTool from "./tools/list-my-treatment-plans";

// The OAuth issuer MUST be the direct Supabase host. mcp-js fetches the
// issuer's discovery document and rejects tokens whose configured issuer
// doesn't match the one the document publishes (RFC 8414 §3.3). Build it from
// the project ref, which Vite inlines as a literal at build time so the entry
// stays import-safe (no runtime env read at module top level).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "docito-mcp",
  title: "Docito",
  version: "0.1.0",
  instructions:
    "Docito MCP tools act as the signed-in user. Use `whoami` to verify " +
    "connectivity, then `list_my_appointments`, `list_my_prescriptions`, or " +
    "`list_my_treatment_plans` to read the caller's own healthcare data. " +
    "All tools respect Docito's row-level security — a user only ever sees " +
    "records they are authorized to see in the app.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoamiTool,
    listMyAppointmentsTool,
    listMyPrescriptionsTool,
    listMyTreatmentPlansTool,
  ],
});
