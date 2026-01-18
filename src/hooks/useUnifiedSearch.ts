// File: src/hooks/useUnifiedSearch.ts
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SearchFilters {
  doctors: boolean;
  clinics: boolean;
  pharmacies: boolean;
  labs: boolean;
  imaging: boolean;
}

export interface DoctorResult {
  id: string;
  type: "doctor";
  name: string;
  specialty: string;
  specialties?: string[];
  degrees?: string[];
  rating: number | null;
  reviewCount: number;
  image: string | null;
  clinicAffiliation: string | null;
  location: string | null;
  consultationFee: number | null;
  acceptsNewPatients: boolean;
  languages: string[] | null;
}

export interface ClinicResult {
  id: string;
  type: "clinic";
  name: string;
  image: string | null;
  location: string | null;
  rating: number | null;
  reviewCount: number;
  specialties: string[] | null;
  doctorCount?: number;
  services?: string[];
}

export interface PharmacyResult {
  id: string;
  type: "pharmacy";
  name: string;
  image: string | null;
  location: string | null;
  deliveryAvailable: boolean;
  acceptsInsurance: boolean;
  isOpen?: boolean;
  rating: number | null;
  reviewCount: number;
}

export interface LabResult {
  id: string;
  type: "lab";
  name: string;
  image?: string | null;
  location: string | null;
  rating?: number | null;
  servicesOffered: string[] | null;
  turnaroundHours?: number | null;
  acceptsInsurance: boolean;
}

export interface ImagingResult {
  id: string;
  type: "imaging";
  name: string;
  image?: string | null;
  location: string | null;
  rating?: number | null;
  procedures: string[];
  accreditations: string[] | null;
  acceptsInsurance: boolean;
}

export type SearchResult =
  | DoctorResult
  | ClinicResult
  | PharmacyResult
  | LabResult
  | ImagingResult;

export interface UnifiedSearchResults {
  doctors: DoctorResult[];
  clinics: ClinicResult[];
  pharmacies: PharmacyResult[];
  labs: LabResult[];
  imaging: ImagingResult[];
}

const DEFAULT_FILTERS: SearchFilters = {
  doctors: true,
  clinics: true,
  pharmacies: true,
  labs: true,
  imaging: true,
};

function asString(v: unknown) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function asNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function asBool(v: unknown) {
  if (typeof v === "boolean") return v;
  const s = String(v || "").toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function asStringArray(v: unknown): string[] | null {
  if (Array.isArray(v)) return v.map((x) => asString(x)).filter(Boolean);
  return null;
}

function normalizeRpcResults(payload: any): UnifiedSearchResults {
  const doctorsRaw = Array.isArray(payload?.doctors) ? payload.doctors : [];
  const clinicsRaw = Array.isArray(payload?.clinics) ? payload.clinics : [];
  const pharmaciesRaw = Array.isArray(payload?.pharmacies) ? payload.pharmacies : [];
  const labsRaw = Array.isArray(payload?.labs) ? payload.labs : [];
  const imagingRaw = Array.isArray(payload?.imaging) ? payload.imaging : [];

  const doctors: DoctorResult[] = doctorsRaw.map((d: any) => ({
    id: asString(d?.id),
    type: "doctor" as const,
    name: asString(d?.name) || "Unknown",
    specialty: asString(d?.specialty),
    specialties: asStringArray(d?.specialties) ?? (d?.specialty ? [asString(d.specialty)] : []),
    rating: asNumber(d?.rating),
    reviewCount: Number(asNumber(d?.reviewCount) ?? 0),
    image: d?.image ? asString(d.image) : null,
    clinicAffiliation: d?.clinicAffiliation ? asString(d.clinicAffiliation) : null,
    location: d?.location ? asString(d.location) : null,
    consultationFee: asNumber(d?.consultationFee),
    acceptsNewPatients: asBool(d?.acceptsNewPatients ?? true),
    languages: asStringArray(d?.languages),
  }));

  const clinics: ClinicResult[] = clinicsRaw.map((c: any) => ({
    id: asString(c?.id),
    type: "clinic" as const,
    name: asString(c?.name) || "Unknown",
    image: c?.image ? asString(c.image) : null,
    location: c?.location ? asString(c.location) : null,
    rating: asNumber(c?.rating),
    reviewCount: Number(asNumber(c?.reviewCount) ?? 0),
    specialties: asStringArray(c?.specialties),
  }));

  const pharmacies: PharmacyResult[] = pharmaciesRaw.map((p: any) => ({
    id: asString(p?.id),
    type: "pharmacy" as const,
    name: asString(p?.name) || "Unknown",
    image: p?.image ? asString(p.image) : null,
    location: p?.location ? asString(p.location) : null,
    deliveryAvailable: asBool(p?.deliveryAvailable),
    acceptsInsurance: asBool(p?.acceptsInsurance),
    rating: asNumber(p?.rating),
    reviewCount: Number(asNumber(p?.reviewCount) ?? 0),
  }));

  const labs: LabResult[] = labsRaw.map((l: any) => ({
    id: asString(l?.id),
    type: "lab" as const,
    name: asString(l?.name) || "Unknown",
    image: l?.image ? asString(l.image) : null,
    location: l?.location ? asString(l.location) : null,
    servicesOffered: asStringArray(l?.servicesOffered),
    turnaroundHours: asNumber(l?.turnaroundHours),
    acceptsInsurance: asBool(l?.acceptsInsurance),
  }));

  const imaging: ImagingResult[] = imagingRaw.map((i: any) => ({
    id: asString(i?.id),
    type: "imaging" as const,
    name: asString(i?.name) || "Unknown",
    image: i?.image ? asString(i.image) : null,
    location: i?.location ? asString(i.location) : null,
    procedures: asStringArray(i?.procedures) ?? [],
    accreditations: asStringArray(i?.accreditations),
    acceptsInsurance: asBool(i?.acceptsInsurance),
  }));

  return { doctors, clinics, pharmacies, labs, imaging };
}

export function useUnifiedSearch() {
  const [results, setResults] = useState<UnifiedSearchResults>({
    doctors: [],
    clinics: [],
    pharmacies: [],
    labs: [],
    imaging: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(
    async (query: string, location?: string, activeFilters: SearchFilters = filters) => {
      const q = String(query || "").trim();
      const loc = String(location || "").trim();

      setLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const { data, error: rpcErr } = await (supabase as any).rpc("homepage_unified_search", {
          search_query: q,
          search_location: loc,
        });
        if (rpcErr) throw rpcErr;

        const normalized = normalizeRpcResults(data);
        const newResults: UnifiedSearchResults = {
          doctors: activeFilters.doctors ? normalized.doctors : [],
          clinics: activeFilters.clinics ? normalized.clinics : [],
          pharmacies: activeFilters.pharmacies ? normalized.pharmacies : [],
          labs: activeFilters.labs ? normalized.labs : [],
          imaging: activeFilters.imaging ? normalized.imaging : [],
        };

        setResults(newResults);
        setFilters(activeFilters);

        const total =
          newResults.doctors.length +
          newResults.clinics.length +
          newResults.pharmacies.length +
          newResults.labs.length +
          newResults.imaging.length;

        if (total === 0 && (q || loc)) {
          toast.info("No results found. Try adjusting your search.");
        }

        return newResults;
      } catch (err: any) {
        console.error("Unified search error:", err);
        setError(err?.message || "Search failed");
        toast.error("Search failed. Please try again.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetSearch = useCallback(() => {
    setResults({ doctors: [], clinics: [], pharmacies: [], labs: [], imaging: [] });
    setHasSearched(false);
    setError(null);
    setFilters(DEFAULT_FILTERS);
  }, []);

  const totalResultCount =
    results.doctors.length +
    results.clinics.length +
    results.pharmacies.length +
    results.labs.length +
    results.imaging.length;

  return {
    results,
    loading,
    error,
    filters,
    hasSearched,
    totalResultCount,
    search,
    updateFilters,
    resetSearch,
  };
}
