// Clinic branding for client-generated documents (043/u form, printouts).
//
// Branding lives in `entity_settings.payload.branding` (logo_url + colorIndex),
// with the clinic profile logo as a fallback. Doctors who joined a clinic must
// get the clinic's branding too, so the practice can be resolved from the
// doctor when it isn't known directly.

import { supabase } from '@/integrations/supabase/client';

export type RGB = [number, number, number];

/** Index-aligned with the Settings > Branding colour picker. */
export const BRAND_PALETTE_RGB: RGB[] = [
  [38, 92, 217],  // blue
  [31, 174, 89],  // green
  [130, 38, 217], // purple
  [242, 132, 13], // orange
  [217, 38, 38],  // red
  [222, 74, 140], // pink
  [31, 174, 165], // teal
  [242, 186, 13], // yellow
];

export const DEFAULT_BRAND_RGB: RGB = [13, 92, 199];

export function brandRgbFromIndex(index: unknown): RGB {
  const i = Number(index);
  if (!Number.isFinite(i) || i < 0 || i >= BRAND_PALETTE_RGB.length) return DEFAULT_BRAND_RGB;
  return BRAND_PALETTE_RGB[Math.floor(i)];
}

export interface ClientDocumentBranding {
  practiceId: string | null;
  logoUrl: string | null;
  brandColor: RGB;
}

const emptyBranding: ClientDocumentBranding = {
  practiceId: null,
  logoUrl: null,
  brandColor: DEFAULT_BRAND_RGB,
};

/** Which clinic does this doctor belong to (assigned, staff, or accepted join request)? */
export async function resolvePracticeIdForDoctor(doctorId?: string | null): Promise<string | null> {
  if (!doctorId) return null;
  try {
    const { data } = await (supabase as any)
      .from('doctors')
      .select('practice_id, user_id')
      .eq('id', doctorId)
      .maybeSingle();
    if (data?.practice_id) return data.practice_id as string;

    if (data?.user_id) {
      const { data: staff } = await (supabase as any)
        .from('clinic_staff')
        .select('practice_id')
        .eq('user_id', data.user_id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (staff?.practice_id) return staff.practice_id as string;
    }

    const { data: join } = await (supabase as any)
      .from('practice_join_requests')
      .select('practice_id, reviewed_at')
      .eq('doctor_id', doctorId)
      .eq('status', 'accepted')
      .order('reviewed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (join?.practice_id) return join.practice_id as string;
  } catch {
    /* ignore */
  }
  return null;
}

export async function loadClinicDocumentBranding(
  practiceId?: string | null,
): Promise<ClientDocumentBranding> {
  if (!practiceId) return { ...emptyBranding };

  let logoUrl: string | null = null;
  let brandColor: RGB = DEFAULT_BRAND_RGB;

  try {
    const { data } = await (supabase as any)
      .from('entity_settings')
      .select('payload')
      .eq('entity_id', practiceId)
      .eq('entity_type', 'practice')
      .maybeSingle();
    const branding = data?.payload?.branding || null;
    if (typeof branding?.logo_url === 'string' && branding.logo_url.trim()) {
      logoUrl = branding.logo_url.trim();
    }
    if (branding?.colorIndex !== undefined) brandColor = brandRgbFromIndex(branding.colorIndex);
  } catch {
    /* ignore */
  }

  if (!logoUrl) {
    try {
      const { data } = await (supabase as any)
        .from('practices')
        .select('logo_url')
        .eq('id', practiceId)
        .maybeSingle();
      const fallback = typeof data?.logo_url === 'string' ? data.logo_url.trim() : '';
      if (fallback) logoUrl = fallback;
    } catch {
      /* ignore */
    }
  }

  return { practiceId, logoUrl, brandColor };
}

/** Branding for a document authored by a doctor — resolves their clinic first. */
export async function loadDoctorDocumentBranding(params: {
  doctorId?: string | null;
  practiceId?: string | null;
}): Promise<ClientDocumentBranding> {
  const pid = params.practiceId || (await resolvePracticeIdForDoctor(params.doctorId));
  return await loadClinicDocumentBranding(pid);
}
