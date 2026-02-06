// File: src/lib/api/referral-api.ts
import { supabase } from "@/integrations/supabase/client";
import type { Referral, ReferralEntityType, ReferralType } from "@/hooks/useReferrals";

export function getEstimatedDuration(referralType: ReferralType, receiverType: ReferralEntityType): number {
  // Conservative defaults, can be customized per entity later.
  const byType: Record<ReferralType, number> = {
    consultation: 30,
    specialist_referral: 30,
    follow_up_care: 20,
    lab_test: 15,
    imaging_study: 20,
    prescription_fulfillment: 10,
  };

  const base = byType[referralType] ?? 30;

  if (receiverType === "doctor" || receiverType === "clinic") return Math.max(base, 20);
  if (receiverType === "lab") return Math.max(base, 10);
  if (receiverType === "imaging_center") return Math.max(base, 15);
  if (receiverType === "pharmacy") return Math.max(base, 10);

  return base;
}

export function isReferralValid(referral: Referral): boolean {
  const status = String(referral.status || "").toLowerCase();
  if (["cancelled", "expired"].includes(status)) return false;

  const validUntil = (referral as any).valid_until ? new Date((referral as any).valid_until) : null;
  if (!validUntil || isNaN(validUntil.getTime())) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(validUntil);
  end.setHours(23, 59, 59, 999);

  return end.getTime() >= today.getTime();
}

export async function searchReceivers(type: ReferralEntityType, term: string) {
  const q = (term || "").trim();
  const like = q ? `%${q}%` : "%";

  try {
    if (type === "doctor") {
      // doctors: id, specialty + profile name + practice name (best-effort)
      const { data, error } = await supabase
        .from("doctors")
        .select(
          [
            "id",
            "specialty",
            "specialty_en",
            "specialty_ru",
            "specialty_uz",
            "practices(name)",
            "profiles:user_id(full_name)",
          ].join(","),
        )
        .or(`specialty.ilike.${like},specialty_en.ilike.${like},specialty_ru.ilike.${like},specialty_uz.ilike.${like}`)
        .limit(25);

      if (error) throw error;

      // If user searches by name, fall back to client-side filter against profile name.
      const filtered = (data || []).filter((d: any) => {
        if (!q) return true;
        const name = String(d?.profiles?.full_name || "").toLowerCase();
        const spec = String(d?.specialty || d?.specialty_en || "").toLowerCase();
        return name.includes(q.toLowerCase()) || spec.includes(q.toLowerCase());
      });

      return filtered;
    }

    if (type === "clinic") {
      const { data, error } = await supabase
        .from("practices")
        .select("id,name,name_en,name_ru,name_uz,city,country")
        .ilike("name", like)
        .limit(25);
      if (error) throw error;
      return data || [];
    }

    if (type === "lab") {
      const { data, error } = await supabase
        .from("lab_centers")
        .select("id,name,city,country")
        .ilike("name", like)
        .limit(25);
      if (error) throw error;
      return data || [];
    }

    if (type === "imaging_center") {
      const { data, error } = await supabase
        .from("imaging_centers")
        .select("id,name,city,country")
        .ilike("name", like)
        .limit(25);
      if (error) throw error;
      return data || [];
    }

    if (type === "pharmacy") {
      const { data, error } = await supabase
        .from("pharmacies")
        .select("id,name,city,country")
        .ilike("name", like)
        .limit(25);
      if (error) throw error;
      return data || [];
    }

    return [];
  } catch (e) {
    console.error("searchReceivers error:", e);
    return [];
  }
}

export async function downloadReferralPdf(params: { referralId: string; locale?: string }) {
  const { referralId, locale } = params;

  const { data, error } = await supabase.functions.invoke("referral-generate-pdf", {
    body: { referral_id: referralId, locale },
    method: "POST",
    headers: { Accept: "application/pdf" },
    // @ts-expect-error - supported by supabase-js v2; keeps TS happy for older typings
    responseType: "blob",
  });

  if (error) throw error;

  // data is a Blob when responseType is "blob"
  const blob = data as Blob;
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `docito-referral-${referralId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
