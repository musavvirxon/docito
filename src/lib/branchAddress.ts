// Resolves which clinic branch (practice_locations row) a document or email
// should print. Priority: the doctor's assigned branch -> the clinic's primary
// branch -> the first branch -> the clinic record's own address.

import { supabase } from "@/integrations/supabase/client";

export interface BranchLike {
  id?: string | null;
  name?: string | null;
  name_en?: string | null;
  name_ru?: string | null;
  name_uz?: string | null;
  name_ar?: string | null;
  address?: string | null;
  address_en?: string | null;
  address_ru?: string | null;
  address_uz?: string | null;
  address_ar?: string | null;
  phone?: string | null;
  email?: string | null;
  is_primary?: boolean | null;
}

export interface ResolvedBranch {
  id: string | null;
  name: string;
  address: string;
  phone: string;
  email: string;
}

const localized = (row: BranchLike, base: "name" | "address", lang?: string): string => {
  const code = (lang || "").slice(0, 2).toLowerCase();
  const key = `${base}_${code}` as keyof BranchLike;
  const value = code ? (row[key] as string | null | undefined) : undefined;
  return (value || (row[base] as string | null | undefined) || "").trim();
};

export function resolveBranch(params: {
  locations?: BranchLike[] | null;
  practice?: { name?: string | null; address?: string | null; phone?: string | null; email?: string | null } | null;
  doctorLocationId?: string | null;
  lang?: string;
}): ResolvedBranch {
  const { locations, practice, doctorLocationId, lang } = params;
  const list = (locations || []).filter(Boolean);

  const branch =
    (doctorLocationId ? list.find((l) => l.id === doctorLocationId) : undefined) ||
    list.find((l) => l.is_primary) ||
    list[0] ||
    null;

  if (branch) {
    return {
      id: branch.id || null,
      name: localized(branch, "name", lang) || practice?.name || "",
      address: localized(branch, "address", lang) || practice?.address || "",
      phone: branch.phone || practice?.phone || "",
      email: branch.email || practice?.email || "",
    };
  }

  return {
    id: null,
    name: practice?.name || "",
    address: practice?.address || "",
    phone: practice?.phone || "",
    email: practice?.email || "",
  };
}

/**
 * Fetches the branch that should appear on documents for a given doctor.
 * Safe to call with missing IDs — falls back to the practice's own details.
 */
export async function fetchBranchForDoctor(params: {
  doctorId?: string | null;
  practiceId?: string | null;
  lang?: string;
}): Promise<ResolvedBranch> {
  const { doctorId, practiceId, lang } = params;
  if (!practiceId && !doctorId) return { id: null, name: "", address: "", phone: "", email: "" };

  let resolvedPracticeId = practiceId || null;
  let doctorLocationId: string | null = null;

  if (doctorId) {
    const { data: doctorRow } = await supabase
      .from("doctors")
      .select("practice_id, practice_location_id")
      .eq("id", doctorId)
      .maybeSingle();
    if (doctorRow) {
      doctorLocationId = (doctorRow as any).practice_location_id || null;
      resolvedPracticeId = resolvedPracticeId || (doctorRow as any).practice_id || null;
    }
  }

  if (!resolvedPracticeId) return { id: null, name: "", address: "", phone: "", email: "" };

  const [{ data: practice }, { data: locations }] = await Promise.all([
    supabase.from("practices").select("name, address, phone, email").eq("id", resolvedPracticeId).maybeSingle(),
    supabase
      .from("practice_locations")
      .select("id,name,name_en,name_ru,name_uz,address,address_en,address_ru,address_uz,phone,email,is_primary")
      .eq("practice_id", resolvedPracticeId)
      .order("is_primary", { ascending: false }),
  ]);

  return resolveBranch({
    locations: (locations as BranchLike[]) || [],
    practice: (practice as any) || null,
    doctorLocationId,
    lang,
  });
}

/**
 * Builds the email footer line for a clinic, replacing the {address} / {phone}
 * placeholders in a custom footer, or falling back to branch address + phone.
 */
export function buildEmailFooter(footerTemplate: string | null | undefined, branch: ResolvedBranch): string {
  const template = (footerTemplate || "").trim();
  if (!template) {
    return [branch.name, branch.address, branch.phone].filter(Boolean).join(" · ");
  }
  return template
    .replace(/\{address\}/gi, branch.address)
    .replace(/\{phone\}/gi, branch.phone)
    .replace(/\{clinic\}/gi, branch.name)
    .replace(/\{email\}/gi, branch.email);
}
