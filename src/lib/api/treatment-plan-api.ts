// File: src/lib/api/treatment-plan-api.ts
import { supabase } from "@/integrations/supabase/client";

type Params = {
  treatmentPlanId: string;
  locale?: string;
  fileName?: string;
};

const sanitizeFileName = (name: string): string => {
  return String(name || "document")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
};

export async function downloadTreatmentPlanPdf(params: Params) {
  const { treatmentPlanId, locale, fileName } = params;

  const { data, error } = await supabase.functions.invoke("treatment-plan-generate-pdf", {
    body: { treatment_plan_id: treatmentPlanId, locale },
    method: "POST",
    headers: { Accept: "application/pdf" },
    // @ts-expect-error - supported by supabase-js v2; keeps TS happy for older typings
    responseType: "blob",
  });

  if (error) throw error;

  const blob = data as Blob;
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
