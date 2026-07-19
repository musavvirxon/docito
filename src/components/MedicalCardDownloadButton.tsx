import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, ChevronDown } from 'lucide-react';
import {
  generateMedicalCard043uRussian,
  generateMedicalCard043uUzbek,
  type MedicalCardData,
} from '@/utils/generateMedicalCard043u';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  data: MedicalCardData;
  practice: any;
  locations: any[];
  /** When provided, diagnoses recorded in the session are merged into the 043/u form. */
  appointmentId?: string | null;
  /** When provided, patient-level diagnoses are also included. */
  patientId?: string | null;
}


const UZ_KEYWORDS = [
  'uzbekistan', 'uzbekiston', "o'zbekiston", 'ozbekiston', 'uz',
  'toshkent', 'tashkent', 'samarqand', 'samarkand', 'buxoro', 'bukhara',
  'namangan', 'andijon', 'andijan', "farg'ona", 'fergana',
  'nukus', 'qarshi', 'termiz',
];

function isUzbekistanClinic(practice: any, locations: any[]): boolean {
  const check = (s: any) => {
    if (!s || typeof s !== 'string') return false;
    const lower = s.toLowerCase();
    return UZ_KEYWORDS.some((k) => lower.includes(k));
  };
  if (check(practice?.country)) return true;
  if (check(practice?.address)) return true;
  if ((practice?.phone || '').replace(/\s/g, '').startsWith('+998')) return true;
  if (Array.isArray(locations) && locations.some((l) =>
    check(l?.address) || check(l?.country) || check(l?.city)
  )) return true;
  return false;
}

export function MedicalCardDownloadButton({ data, practice, locations, appointmentId, patientId }: Props) {
  const [loading, setLoading] = useState<'ru' | 'uz' | null>(null);
  const [open, setOpen] = useState(false);

  if (!isUzbekistanClinic(practice, locations)) return null;

  const enrichDiagnosis = async (): Promise<string> => {
    const pieces: string[] = [];
    if (data.diagnosis) pieces.push(data.diagnosis);
    try {
      const queries: Promise<any>[] = [];
      if (appointmentId) {
        queries.push(
          (supabase as any)
            .from('appointment_diagnoses')
            .select('diagnosis_title, icd10_code, notes')
            .eq('appointment_id', appointmentId),
        );
      }
      if (patientId) {
        queries.push(
          (supabase as any)
            .from('appointment_diagnoses')
            .select('diagnosis_title, icd10_code')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(10),
        );
        queries.push(
          (supabase as any)
            .from('tooth_procedure_history')
            .select('tooth_number, diagnosis, procedure_name')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(20),
        );
      }
      const results = await Promise.all(queries);
      const seen = new Set(pieces.map((p) => p.toLowerCase()));
      for (const r of results) {
        for (const row of (r?.data as any[]) || []) {
          const label = row.diagnosis_title
            ? `${row.diagnosis_title}${row.icd10_code ? ` (${row.icd10_code})` : ''}`
            : row.tooth_number
              ? `Tish ${row.tooth_number}: ${row.diagnosis || row.procedure_name || ''}`.trim()
              : '';
          const key = label.toLowerCase();
          if (label && !seen.has(key)) {
            seen.add(key);
            pieces.push(label);
          }
        }
      }
    } catch (e) {
      console.warn('[043u] diagnosis enrichment skipped', e);
    }
    return pieces.filter(Boolean).join('; ');
  };


  const download = async (lang: 'ru' | 'uz') => {
    setLoading(lang);
    setOpen(false);
    try {
      const enrichedDiagnosis = await enrichDiagnosis();
      const enriched: MedicalCardData = { ...data, diagnosis: enrichedDiagnosis || data.diagnosis };
      const blob = lang === 'ru'
        ? await generateMedicalCard043uRussian(enriched)
        : await generateMedicalCard043uUzbek(enriched);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (data.patientName || 'bemor').replace(/\s+/g, '_');
      a.download = `043u_${safeName}_${lang === 'ru' ? 'RU' : 'UZ'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(lang === 'ru' ? 'Медицинская карта скачана' : "Tibbiy karta yuklab olindi");
    } catch (err) {
      console.error('[MedicalCard043u] generation failed', err);
      toast.error('Xatolik yuz berdi / Ошибка генерации');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative inline-block">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((o) => !o)}
        disabled={!!loading}
        className="flex items-center gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {loading ? (loading === 'ru' ? 'Генерация...' : 'Yaratilmoqda...') : '043/u Tibbiy karta'}
        <ChevronDown className="h-3 w-3 opacity-70" />
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-56 rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          <button
            type="button"
            onClick={() => download('uz')}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <span className="text-lg">🇺🇿</span>
            <div className="flex flex-col">
              <span className="font-medium">O'zbek tilida</span>
              <span className="text-xs text-muted-foreground">Shakl 043/u — UZ</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => download('ru')}
            className="flex w-full items-center gap-3 border-t border-border px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <span className="text-lg">🇷🇺</span>
            <div className="flex flex-col">
              <span className="font-medium">На русском языке</span>
              <span className="text-xs text-muted-foreground">Форма 043/у — RU</span>
            </div>
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default MedicalCardDownloadButton;
