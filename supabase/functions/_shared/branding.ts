// Shared clinic branding resolution for generated documents.
//
// Every document (treatment plan, referral, receipt/invoice, superbill,
// prescription, visit summary) must show the branding of the clinic that
// produced it — including when the author is a doctor who *joined* the clinic
// rather than being directly assigned to it.

export interface DocumentBranding {
  practiceId: string | null;
  name: string | null;
  logoUrl: string | null;
  brandColor: [number, number, number]; // r,g,b in 0..1
  colorIndex: number;
  address: string | null;
  phone: string | null;
  email: string | null;
  doctorId: string | null;
  doctorName: string | null;
  doctorSpecialty: string | null;
  doctorLicense: string | null;
  doctorPhotoUrl: string | null;
}

/** Same palette as the clinic Settings > Branding picker (index-aligned). */
export const BRAND_PALETTE: Array<[number, number, number]> = [
  [0.15, 0.35, 0.85], // blue
  [0.12, 0.68, 0.35], // green
  [0.51, 0.24, 0.85], // purple
  [0.95, 0.52, 0.08], // orange
  [0.85, 0.22, 0.22], // red
  [0.87, 0.29, 0.55], // pink
  [0.09, 0.66, 0.62], // teal
  [0.95, 0.75, 0.08], // yellow
];

export const DEFAULT_BRAND_COLOR: [number, number, number] = [0.05, 0.36, 0.78];

export function brandColorFromIndex(index: unknown): [number, number, number] {
  const i = Number(index);
  if (!Number.isFinite(i) || i < 0 || i >= BRAND_PALETTE.length) return DEFAULT_BRAND_COLOR;
  return BRAND_PALETTE[Math.floor(i)];
}

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
};

export const emptyBranding: DocumentBranding = {
  practiceId: null,
  name: null,
  logoUrl: null,
  brandColor: DEFAULT_BRAND_COLOR,
  colorIndex: -1,
  address: null,
  phone: null,
  email: null,
  doctorId: null,
  doctorName: null,
  doctorSpecialty: null,
  doctorLicense: null,
  doctorPhotoUrl: null,
};

/**
 * Which clinic does this doctor belong to, for document-branding purposes?
 * Priority: assigned clinic -> active clinic staff -> accepted join request -> practice staff.
 * Returns null for independent practitioners.
 */
export async function resolvePracticeIdForDoctor(
  service: any,
  doctorId?: string | null,
  doctorUserId?: string | null,
): Promise<string | null> {
  if (!doctorId && !doctorUserId) return null;

  let userId = str(doctorUserId);

  if (doctorId) {
    try {
      const { data } = await service
        .from("doctors")
        .select("practice_id, user_id")
        .eq("id", doctorId)
        .maybeSingle();
      const pid = str((data as any)?.practice_id);
      if (pid) return pid;
      userId = userId || str((data as any)?.user_id);
    } catch { /* ignore */ }
  }

  if (userId) {
    try {
      const { data } = await service
        .from("clinic_staff")
        .select("practice_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      const pid = str((data as any)?.practice_id);
      if (pid) return pid;
    } catch { /* ignore */ }
  }

  if (doctorId) {
    try {
      const { data } = await service
        .from("practice_join_requests")
        .select("practice_id, reviewed_at")
        .eq("doctor_id", doctorId)
        .eq("status", "accepted")
        .order("reviewed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const pid = str((data as any)?.practice_id);
      if (pid) return pid;
    } catch { /* ignore */ }
  }

  if (userId) {
    try {
      const { data } = await service
        .from("practice_staff")
        .select("practice_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      const pid = str((data as any)?.practice_id);
      if (pid) return pid;
    } catch { /* ignore */ }
  }

  return null;
}

/**
 * Loads the clinic's branding: logo from Settings > Branding first, then the
 * clinic profile logo; name/address/phone from the doctor's branch when known.
 */
export async function loadBranding(
  service: any,
  practiceId?: string | null,
  opts: { branchId?: string | null; lang?: string } = {},
): Promise<DocumentBranding> {
  const pid = str(practiceId);
  if (!pid) return { ...emptyBranding };

  let row: any = null;
  try {
    const { data } = await service
      .from("practices")
      .select("id, name, address, phone, email, logo_url")
      .eq("id", pid)
      .maybeSingle();
    row = data || null;
  } catch { /* ignore */ }

  let settingsLogo: string | null = null;
  let colorIndex = -1;
  try {
    const { data } = await service
      .from("entity_settings")
      .select("payload")
      .eq("entity_id", pid)
      .eq("entity_type", "practice")
      .maybeSingle();
    const branding = (data as any)?.payload?.branding || null;
    settingsLogo = str(branding?.logo_url);
    const ci = Number(branding?.colorIndex);
    if (Number.isFinite(ci)) colorIndex = ci;
  } catch { /* ignore */ }

  // Branch (practice_locations) overrides for address/phone/email.
  let branchName: string | null = null;
  let branchAddress: string | null = null;
  let branchPhone: string | null = null;
  let branchEmail: string | null = null;
  try {
    const { data } = await service
      .from("practice_locations")
      .select("id, name, name_en, name_ru, name_uz, name_ar, address, address_en, address_ru, address_uz, address_ar, phone, email, is_primary, created_at")
      .eq("practice_id", pid)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    const list: any[] = Array.isArray(data) ? data : [];
    const branch =
      (opts.branchId ? list.find((l) => l?.id === opts.branchId) : undefined) ||
      list.find((l) => l?.is_primary) ||
      list[0] ||
      null;
    if (branch) {
      const lang = (opts.lang || "").slice(0, 2).toLowerCase();
      branchName = str(lang ? branch[`name_${lang}`] : null) || str(branch.name);
      branchAddress = str(lang ? branch[`address_${lang}`] : null) || str(branch.address);
      branchPhone = str(branch.phone);
      branchEmail = str(branch.email);
    }
  } catch { /* ignore */ }

  return {
    practiceId: pid,
    name: branchName || str(row?.name),
    logoUrl: settingsLogo || str(row?.logo_url),
    brandColor: colorIndex >= 0 ? brandColorFromIndex(colorIndex) : DEFAULT_BRAND_COLOR,
    colorIndex,
    address: branchAddress || str(row?.address),
    phone: branchPhone || str(row?.phone),
    email: branchEmail || str(row?.email),
  };
}

/**
 * Convenience: resolve the clinic of a doctor and load its branding in one go.
 */
export async function loadDoctorBranding(
  service: any,
  params: { doctorId?: string | null; doctorUserId?: string | null; practiceId?: string | null; branchId?: string | null; lang?: string },
): Promise<DocumentBranding> {
  const pid = str(params.practiceId) ||
    (await resolvePracticeIdForDoctor(service, params.doctorId, params.doctorUserId));
  const base = pid ? await loadBranding(service, pid, { branchId: params.branchId, lang: params.lang }) : { ...emptyBranding };
  if (!params.doctorId && !params.doctorUserId) return base;
  try {
    let doctor: any = null;
    if (params.doctorId) {
      const { data, error } = await service
        .from("doctors")
        .select("id, user_id, license_number, specialty, specialty_en, specialty_ru, specialty_uz, specialty_ar, logo_url, practice_location_id")
        .eq("id", params.doctorId)
        .maybeSingle();
      if (error) console.warn("[branding] doctor lookup failed", error.code);
      doctor = data || null;
    }
    const userId = str(params.doctorUserId) || str(doctor?.user_id);
    let profile: any = null;
    if (userId) {
      const { data, error } = await service.from("profiles").select("full_name, avatar_url").eq("user_id", userId).maybeSingle();
      if (error) console.warn("[branding] doctor profile lookup failed", error.code);
      profile = data || null;
    }
    const lang = (params.lang || "en").slice(0, 2).toLowerCase();
    return {
      ...base,
      doctorId: str(doctor?.id) || str(params.doctorId),
      doctorName: str(profile?.full_name),
      doctorSpecialty: str(doctor?.[`specialty_${lang}`]) || str(doctor?.specialty),
      doctorLicense: str(doctor?.license_number),
      doctorPhotoUrl: str(profile?.avatar_url) || str(doctor?.logo_url),
    };
  } catch (error) {
    console.warn("[branding] doctor identity lookup failed", error instanceof Error ? error.message : "unknown");
    return base;
  }
}
