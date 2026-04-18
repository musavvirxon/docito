// File: src/lib/api/referral-api.ts
import { supabase } from '@/integrations/supabase/client';
import i18n from '@/i18n';
import type { Referral, ReferralEntityType, ReferralType } from '@/hooks/useReferrals';

type DownloadReferralPdfArgs = {
  referralId: string;
  locale?: string;
  fileName?: string;
};

function inferDashboardLocale(): string {
  const fromI18n = (i18n.language || '').toString();
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  return sanitizeLocale(fromI18n || nav || 'en');
}

function sanitizeLocale(input: string): string {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return 'en';
  const code = raw.split(/[-_]/)[0];
  switch (code) {
    case 'en': case 'ru': case 'uz': case 'tr': case 'ar':
    case 'ja': case 'ko': case 'zh': case 'es': case 'pt': case 'de':
      return code;
    default:
      return 'en';
  }
}

export async function downloadReferralPdf({ referralId, locale, fileName }: DownloadReferralPdfArgs) {
  const effectiveLocale = sanitizeLocale(locale || inferDashboardLocale());

  const { data, error } = await supabase.functions.invoke('referral-generate-pdf', {
    body: {
      referral_id: referralId,
      locale: effectiveLocale,
    },
  });

  if (error) throw error;
  if (!data) throw new Error('No PDF data received');

  const blob = data instanceof Blob ? data : new Blob([JSON.stringify(data)], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${(fileName || `referral_${referralId.slice(0, 8)}`).replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 2000);
}

// --- Helper functions used by ReferralCard and other components ---

export function getReferralPriorityColor(priority: string): string {
  switch (priority) {
    case 'stat': return 'destructive';
    case 'urgent': return 'secondary';
    default: return 'outline';
  }
}

export function getReferralStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (['completed'].includes(s)) return 'default';
  if (['accepted', 'slots_available', 'booked', 'in_progress'].includes(s)) return 'secondary';
  if (['rejected', 'cancelled', 'expired'].includes(s)) return 'destructive';
  if (['sent'].includes(s)) return 'outline';
  return 'outline';
}

export function getReferralTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    consultation: 'Medical Consultation',
    lab_test: 'Laboratory Test',
    imaging_study: 'Imaging Study',
    prescription_fulfillment: 'Prescription Fulfillment',
    follow_up_care: 'Follow-up Care',
    specialist_referral: 'Specialist Referral',
  };
  return labels[type] || type.replace(/_/g, ' ');
}

export function getEntityTypeLabel(type: ReferralEntityType): string {
  const labels: Record<string, string> = {
    doctor: 'Doctor',
    clinic: 'Clinic',
    lab: 'Laboratory',
    imaging_center: 'Imaging Center',
    pharmacy: 'Pharmacy',
  };
  return labels[type] || type;
}

export function isReferralValid(referral: Referral): boolean {
  try {
    const now = new Date();
    const validUntil = new Date(referral.valid_until);
    return validUntil >= now;
  } catch {
    return false;
  }
}

export function getReferralTargetLabel(referral: Referral): string {
  const rAny = referral as any;
  const field = rAny.target_field || referral.receiver_type;
  return getEntityTypeLabel(field);
}

export function getReferralPatientDisplayName(referral: Referral): string {
  const patient = referral.patient;
  if (patient?.full_name) return patient.full_name;
  return 'Patient';
}

export async function getEntityName(entityType: ReferralEntityType, entityId: string): Promise<string> {
  try {
    if (entityType === 'doctor') {
      const { data } = await supabase
        .from('doctors')
        .select('profiles:user_id(full_name)')
        .eq('id', entityId)
        .maybeSingle();
      return (data as any)?.profiles?.full_name || 'Doctor';
    }
    if (entityType === 'clinic') {
      const { data } = await supabase.from('practices').select('name').eq('id', entityId).maybeSingle();
      return (data as any)?.name || 'Clinic';
    }
    if (entityType === 'lab') {
      const { data } = await supabase.from('practices' as any).select('name').eq('id', entityId).maybeSingle();
      return (data as any)?.name || 'Lab';
    }
    if (entityType === 'imaging_center') {
      const { data } = await supabase.from('imaging_centers').select('name').eq('id', entityId).maybeSingle();
      return (data as any)?.name || 'Imaging Center';
    }
    if (entityType === 'pharmacy') {
      const { data } = await supabase.from('pharmacies').select('name').eq('id', entityId).maybeSingle();
      return (data as any)?.name || 'Pharmacy';
    }
    return entityType;
  } catch {
    return entityType;
  }
}

export async function searchReceivers(receiverType: ReferralEntityType, searchTerm: string): Promise<any[]> {
  try {
    const term = (searchTerm || '').trim();

    if (receiverType === 'doctor') {
      let q = supabase
        .from('doctors')
        .select('id, specialty, profiles:user_id(full_name), practices:practice_id(name)')
        .eq('verified', true)
        .limit(20);
      if (term) {
        q = q.or(`specialty.ilike.%${term}%`);
      }
      const { data } = await q;
      return data || [];
    }

    const tableMap: Record<string, string> = {
      clinic: 'practices',
      lab: 'practices',
      imaging_center: 'imaging_centers',
      pharmacy: 'pharmacies',
    };
    const table = tableMap[receiverType];
    if (!table) return [];

    let q = (supabase.from as any)(table).select('id, name, city, country').limit(20);
    if (term) {
      q = q.ilike('name', `%${term}%`);
    }
    const { data } = await q;
    return data || [];
  } catch (e) {
    console.error('searchReceivers error:', e);
    return [];
  }
}

export function getEstimatedDuration(referralType: ReferralType, receiverType: ReferralEntityType): number {
  const durations: Record<string, number> = {
    consultation: 30,
    specialist_referral: 45,
    follow_up_care: 20,
    lab_test: 15,
    imaging_study: 30,
    prescription_fulfillment: 10,
  };
  return durations[referralType] || 30;
}
