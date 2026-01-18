// File: src/hooks/useUnifiedSearch.ts
import { useState, useCallback } from "react";
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

type RpcPayload = Partial<UnifiedSearchResults> & {
  doctors?: any[];
  clinics?: any[];
  pharmacies?: any[];
  labs?: any[];
  imaging?: any[];
};

function asArray<T = any>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function normalizeDoctor(row: any): DoctorResult {
  return {
    id: String(row?.id ?? ""),
    type: "doctor",
    name: String(row?.name ?? "Unknown"),
    specialty: String(row?.specialty ?? ""),
    specialties: Array.isArray(row?.specialties)
      ? row.specialties
      : row?.specialty
        ? [String(row.specialty)]
        : [],
    rating: row?.rating ?? null,
    reviewCount: Number(row?.reviewCount ?? 0),
    image: row?.image ?? null,
    clinicAffiliation: row?.clinicAffiliation ?? null,
    location: row?.location ?? null,
    consultationFee: row?.consultationFee ?? null,
    acceptsNewPatients: Boolean(row?.acceptsNewPatients ?? true),
    languages: Array.isArray(row?.languages) ? row.languages : null,
  };
}

function normalizeClinic(row: any): ClinicResult {
  return {
    id: String(row?.id ?? ""),
    type: "clinic",
    name: String(row?.name ?? "Unknown"),
    image: row?.image ?? null,
    location: row?.location ?? null,
    rating: row?.rating ?? null,
    reviewCount: Number(row?.reviewCount ?? 0),
    specialties: Array.isArray(row?.specialties) ? row.specialties : null,
  };
}

function normalizePharmacy(row: any): PharmacyResult {
  return {
    id: String(row?.id ?? ""),
    type: "pharmacy",
    name: String(row?.name ?? "Unknown"),
    image: row?.image ?? null,
    location: row?.location ?? null,
    deliveryAvailable: Boolean(row?.deliveryAvailable ?? false),
    acceptsInsurance: Boolean(row?.acceptsInsurance ?? false),
    rating: row?.rating ?? null,
    reviewCount: Number(row?.reviewCount ?? 0),
  };
}

function normalizeLab(row: any): LabResult {
  return {
    id: String(row?.id ?? ""),
    type: "lab",
    name: String(row?.name ?? "Unknown"),
    image: row?.image ?? null,
    location: row?.location ?? null,
    servicesOffered: Array.isArray(row?.servicesOffered) ? row.servicesOffered : null,
    turnaroundHours: row?.turnaroundHours ?? null,
    acceptsInsurance: Boolean(row?.acceptsInsurance ?? false),
  };
}

function normalizeImaging(row: any): ImagingResult {
  return {
    id: String(row?.id ?? ""),
    type: "imaging",
    name: String(row?.name ?? "Unknown"),
    image: row?.image ?? null,
    location: row?.location ?? null,
    procedures: Array.isArray(row?.procedures) ? row.procedures : [],
    accreditations: Array.isArray(row?.accreditations) ? row.accreditations : null,
    acceptsInsurance: Boolean(row?.acceptsInsurance ?? false),
  };
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
      setLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        // IMPORTANT: match function signature order: (search_location, search_query)
        const { data, error: rpcError } = await supabase.rpc("homepage_unified_search", {
          search_location: location ?? "",
          search_query: query ?? "",
        });

        if (rpcError) throw rpcError;

        const payload = (data ?? {}) as RpcPayload;

        const doctorsRaw = asArray(payload.doctors).map(normalizeDoctor);
        const clinicsRaw = asArray(payload.clinics).map(normalizeClinic);
        const pharmaciesRaw = asArray(payload.pharmacies).map(normalizePharmacy);
        const labsRaw = asArray(payload.labs).map(normalizeLab);
        const imagingRaw = asArray(payload.imaging).map(normalizeImaging);

        const newResults: UnifiedSearchResults = {
          doctors: activeFilters.doctors ? doctorsRaw : [],
          clinics: activeFilters.clinics ? clinicsRaw : [],
          pharmacies: activeFilters.pharmacies ? pharmaciesRaw : [],
          labs: activeFilters.labs ? labsRaw : [],
          imaging: activeFilters.imaging ? imagingRaw : [],
        };

        setResults(newResults);
        setFilters(activeFilters);

        const totalCount =
          newResults.doctors.length +
          newResults.clinics.length +
          newResults.pharmacies.length +
          newResults.labs.length +
          newResults.imaging.length;

        if (totalCount === 0 && query) toast.info("No results found. Try adjusting your search.");

        return newResults;
      } catch (err: any) {
        const msg =
          err?.message || err?.details || err?.hint || "Search failed (homepage_unified_search RPC)";
        console.error("Unified search error:", err);
        setError(msg);
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
    setResults({
      doctors: [],
      clinics: [],
      pharmacies: [],
      labs: [],
      imaging: [],
    });
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
