// File: src/lib/api/treatment-plan-api.ts
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n/config";

type Params = {
  treatmentPlanId: string;
  locale?: string;
  fileName?: string;
};

const SUPPORTED_LOCALES = new Set([
  "en", "ru", "uz", "tr", "ar", "ja", "ko", "zh", "es", "pt", "de",
]);

function resolveLocale(explicit?: string): string {
  const raw = (explicit || i18n.language || (typeof navigator !== "undefined" ? navigator.language : "en") || "en")
    .toString()
    .toLowerCase()
    .trim();
  const code = raw.split(/[-_]/)[0];
  return SUPPORTED_LOCALES.has(code) ? code : "en";
}

const sanitizeFileName = (name: string): string => {
  return String(name || "document")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
};

export async function downloadTreatmentPlanPdf(params: Params) {
  const { treatmentPlanId, locale, fileName } = params;

  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "https://gswwpjdtgsxzcsnrxutu.supabase.co";
  const anonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzd3dwamR0Z3N4emNzbnJ4dXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTI4MTUsImV4cCI6MjA3MzM2ODgxNX0.YEjg25_0LlzWQoh-SIk-kq_mxcvUoyhODSQ__4DJfSw";

  const effectiveLocale = resolveLocale(locale);

  const res = await fetch(`${supabaseUrl}/functions/v1/treatment-plan-generate-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": anonKey,
      "Accept": "application/pdf",
    },
    body: JSON.stringify({ treatment_plan_id: treatmentPlanId, locale: effectiveLocale }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`PDF generation failed (${res.status}): ${errText}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;

  const fallback = `docito-treatment-plan-${treatmentPlanId}.pdf`;
  a.download = sanitizeFileName(fileName || fallback);

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
