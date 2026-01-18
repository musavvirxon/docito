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

function cleanTerm(term: string) {
  return (term || "").replace(/[,()]/g, " ").trim();
}

function firstWord(term: string) {
  const clean = cleanTerm(term);
  if (!clean) return "";
  const words = clean.split(/\s+/).filter((w) => w.length > 0);
  return words[0] || "";
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

  const searchDoctors = async (query: string, location?: string): Promise<DoctorResult[]> => {
    try {
      let dbQuery = supabase
        .from("doctor_public_search_view")
        .select(
          "id, full_name, avatar_url, specialty, bio, languages, consultation_fee, accepts_new_patients, rating, num_reviews, appointment_count, practice_name, practice_city, practice_country"
        );

      const q = firstWord(query);
      if (q) {
        dbQuery = dbQuery.or(`full_name.ilike.%${q}%,specialty.ilike.%${q}%,bio.ilike.%${q}%`);
      }

      const loc = firstWord(location || "");
      if (loc) {
        dbQuery = dbQuery.or(`practice_city.ilike.%${loc}%,practice_country.ilike.%${loc}%`);
      }

      const { data, error } = await dbQuery
        .order("rating", { ascending: false })
        .order("appointment_count", { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((d: any) => ({
        id: String(d.id),
        type: "doctor" as const,
        name: d.full_name || "Unknown",
        specialty: d.specialty || "",
        specialties: d.specialty ? [d.specialty] : [],
        rating: d.rating ?? null,
        reviewCount: Number(d.num_reviews ?? 0),
        image: d.avatar_url ?? null,
        clinicAffiliation: d.practice_name ?? null,
        location:
          d.practice_city && d.practice_country ? `${d.practice_city}, ${d.practice_country}` : null,
        consultationFee: d.consultation_fee ?? null,
        acceptsNewPatients: Boolean(d.accepts_new_patients ?? true),
        languages: Array.isArray(d.languages) ? d.languages : null,
      }));
    } catch (err) {
      console.error("Error searching doctors:", err);
      return [];
    }
  };

  const searchClinics = async (query: string, location?: string): Promise<ClinicResult[]> => {
    try {
      let dbQuery = supabase
        .from("practice_public_search_view")
        .select("id, name, logo_url, specialties, city, country, rating, num_reviews, appointment_count, description");

      const q = firstWord(query);
      if (q) {
        dbQuery = dbQuery.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const loc = firstWord(location || "");
      if (loc) {
        dbQuery = dbQuery.or(`city.ilike.%${loc}%,country.ilike.%${loc}%`);
      }

      const { data, error } = await dbQuery
        .order("rating", { ascending: false })
        .order("appointment_count", { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: String(p.id),
        type: "clinic" as const,
        name: p.name || "Unknown",
        image: p.logo_url ?? null,
        location: p.city && p.country ? `${p.city}, ${p.country}` : null,
        rating: p.rating ?? null,
        reviewCount: Number(p.num_reviews ?? 0),
        specialties: Array.isArray(p.specialties) ? p.specialties : null,
      }));
    } catch (err) {
      console.error("Error searching clinics:", err);
      return [];
    }
  };

  const searchPharmacies = async (query: string, location?: string): Promise<PharmacyResult[]> => {
    try {
      let dbQuery = supabase
        .from("pharmacy_public_search_view")
        .select("id, name, logo_url, city, country, delivery_available, accepts_insurance, rating, num_reviews");

      const q = firstWord(query);
      if (q) {
        dbQuery = dbQuery.ilike("name", `%${q}%`);
      }

      const loc = firstWord(location || "");
      if (loc) {
        dbQuery = dbQuery.or(`city.ilike.%${loc}%,country.ilike.%${loc}%`);
      }

      const { data, error } = await dbQuery
        .order("rating", { ascending: false })
        .order("num_reviews", { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((ph: any) => ({
        id: String(ph.id),
        type: "pharmacy" as const,
        name: ph.name || "Unknown",
        image: ph.logo_url ?? null,
        location: ph.city && ph.country ? `${ph.city}, ${ph.country}` : null,
        deliveryAvailable: Boolean(ph.delivery_available ?? false),
        acceptsInsurance: Boolean(ph.accepts_insurance ?? false),
        rating: ph.rating ?? null,
        reviewCount: Number(ph.num_reviews ?? 0),
      }));
    } catch (err) {
      console.error("Error searching pharmacies:", err);
      return [];
    }
  };

  const searchLabsAndImaging = async (
    query: string,
    location?: string
  ): Promise<{ labs: LabResult[]; imaging: ImagingResult[] }> => {
    try {
      let dbQuery = supabase
        .from("lab_center_public_search_view")
        .select(
          "id, name, city, country, accepts_insurance, services_offered, accreditations, average_turnaround_hours, type"
        );

      const q = firstWord(query);
      if (q) {
        dbQuery = dbQuery.ilike("name", `%${q}%`);
      }

      const loc = firstWord(location || "");
      if (loc) {
        dbQuery = dbQuery.or(`city.ilike.%${loc}%,country.ilike.%${loc}%`);
      }

      const { data, error } = await dbQuery.limit(50);
      if (error) throw error;

      const labs: LabResult[] = [];
      const imaging: ImagingResult[] = [];

      (data || []).forEach((c: any) => {
        const services: string[] = Array.isArray(c.services_offered) ? c.services_offered : [];
        const type = String(c.type || "").toLowerCase();

        const isImaging =
          type.includes("imaging") ||
          type.includes("radiology") ||
          services.some((s) =>
            ["mri", "ct", "x-ray", "xray", "ultrasound", "mammography"].some((k) =>
              String(s || "").toLowerCase().includes(k)
            )
          );

        const base = {
          id: String(c.id),
          name: c.name || "Unknown",
          location: c.city && c.country ? `${c.city}, ${c.country}` : null,
          acceptsInsurance: Boolean(c.accepts_insurance ?? false),
        };

        if (isImaging) {
          imaging.push({
            ...base,
            type: "imaging",
            procedures: services,
            accreditations: Array.isArray(c.accreditations) ? c.accreditations : null,
          });
        } else {
          labs.push({
            ...base,
            type: "lab",
            servicesOffered: services.length ? services : null,
            turnaroundHours: c.average_turnaround_hours ?? null,
          });
        }
      });

      return { labs, imaging };
    } catch (err) {
      console.error("Error searching labs/imaging:", err);
      return { labs: [], imaging: [] };
    }
  };

  const search = useCallback(
    async (query: string, location?: string, activeFilters: SearchFilters = filters) => {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const tasks: Promise<any>[] = [
          activeFilters.doctors ? searchDoctors(query, location) : Promise.resolve([]),
          activeFilters.clinics ? searchClinics(query, location) : Promise.resolve([]),
          activeFilters.pharmacies ? searchPharmacies(query, location) : Promise.resolve([]),
          activeFilters.labs || activeFilters.imaging
            ? searchLabsAndImaging(query, location)
            : Promise.resolve({ labs: [], imaging: [] }),
        ];

        const [doctors, clinics, pharmacies, labsImaging] = await Promise.all(tasks);

        const newResults: UnifiedSearchResults = {
          doctors: activeFilters.doctors ? doctors : [],
          clinics: activeFilters.clinics ? clinics : [],
          pharmacies: activeFilters.pharmacies ? pharmacies : [],
          labs: activeFilters.labs ? labsImaging.labs : [],
          imaging: activeFilters.imaging ? labsImaging.imaging : [],
        };

        setResults(newResults);
        setFilters(activeFilters);

        const total =
          newResults.doctors.length +
          newResults.clinics.length +
          newResults.pharmacies.length +
          newResults.labs.length +
          newResults.imaging.length;

        if (total === 0 && (query || location)) {
          toast.info("No results found. Try adjusting your search.");
        }

        return newResults;
      } catch (err: any) {
        console.error("Search error:", err);
        setError(err?.message || "Search failed");
        toast.error("Search failed. Please try again.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [filters]
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
