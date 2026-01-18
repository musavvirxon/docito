// File: src/hooks/useSearchDiscovery.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SearchFilters {
  specialty?: string;
  location?: string;
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
  acceptsInsurance?: boolean;
  acceptsNewPatients?: boolean;
  availableToday?: boolean;
  videoConsultation?: boolean;
  gender?: string;
  language?: string;
  distance?: number;
  lat?: number;
  lng?: number;
}

export interface SearchSuggestion {
  type: "recent" | "popular" | "specialty" | "location" | "doctor";
  text: string;
  count?: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  search_term: string | null;
  filters: SearchFilters;
  created_at: string;
}

export const useSearchDiscovery = () => {
  const { user } = useAuth();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const fetchRecentSearches = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("search_history")
        .select("search_term")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) {
        const uniqueTerms = [...new Set(data.map((d) => d.search_term))];
        setRecentSearches(uniqueTerms.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching recent searches:", error);
    }
  }, [user]);

  const fetchPopularSearches = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("popular_searches")
        .select("search_term")
        .order("search_count", { ascending: false })
        .limit(10);

      if (data) {
        setPopularSearches(data.map((d) => d.search_term));
      }
    } catch (error) {
      console.error("Error fetching popular searches:", error);
    }
  }, []);

  const fetchSavedSearches = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setSavedSearches(data as SavedSearch[]);
      }
    } catch (error) {
      console.error("Error fetching saved searches:", error);
    }
  }, [user]);

  const recordSearch = useCallback(
    async (term: string, type: string = "general", filters: SearchFilters = {}, resultCount: number = 0) => {
      if (!term.trim()) return;

      try {
        if (user) {
          await supabase.from("search_history").insert([
            {
              user_id: user.id,
              search_term: term.toLowerCase().trim(),
              search_type: type,
              filters: filters as any,
              result_count: resultCount,
            },
          ]);
        }

        await supabase.rpc("update_popular_search", { term: term.toLowerCase().trim() });
        fetchRecentSearches();
      } catch (error) {
        console.error("Error recording search:", error);
      }
    },
    [user, fetchRecentSearches]
  );

  const saveSearch = useCallback(
    async (name: string, term: string, filters: SearchFilters) => {
      if (!user) return null;

      try {
        const { data, error } = await supabase
          .from("saved_searches")
          .insert([
            {
              user_id: user.id,
              name,
              search_term: term,
              filters: filters as any,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        fetchSavedSearches();
        return data;
      } catch (error) {
        console.error("Error saving search:", error);
        return null;
      }
    },
    [user, fetchSavedSearches]
  );

  const deleteSavedSearch = useCallback(
    async (id: string) => {
      try {
        await supabase.from("saved_searches").delete().eq("id", id);
        fetchSavedSearches();
      } catch (error) {
        console.error("Error deleting saved search:", error);
      }
    },
    [fetchSavedSearches]
  );

  const clearSearchHistory = useCallback(async () => {
    if (!user) return;

    try {
      await supabase.from("search_history").delete().eq("user_id", user.id);
      setRecentSearches([]);
    } catch (error) {
      console.error("Error clearing search history:", error);
    }
  }, [user]);

  const getSuggestions = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        const base: SearchSuggestion[] = [
          ...recentSearches.map((text) => ({ type: "recent" as const, text })),
          ...popularSearches.slice(0, 5).map((text) => ({ type: "popular" as const, text })),
        ];
        setSuggestions(base);
        return;
      }

      setIsLoadingSuggestions(true);
      const lowerQuery = query.toLowerCase();

      try {
        const next: SearchSuggestion[] = [];

        recentSearches
          .filter((s) => s.toLowerCase().includes(lowerQuery))
          .forEach((text) => next.push({ type: "recent", text }));

        popularSearches
          .filter((s) => s.toLowerCase().includes(lowerQuery))
          .slice(0, 3)
          .forEach((text) => {
            if (!next.find((s) => s.text === text)) next.push({ type: "popular", text });
          });

        // Use public views so anon users get suggestions too
        const { data: doctors } = await supabase
          .from("doctor_public_search_view")
          .select("full_name, specialty, practice_city")
          .or(`full_name.ilike.%${query}%,specialty.ilike.%${query}%`)
          .limit(5);

        if (doctors) {
          doctors.forEach((doc: any) => {
            if (doc.full_name?.toLowerCase().includes(lowerQuery)) {
              next.push({ type: "doctor", text: doc.full_name });
            }
            if (doc.specialty?.toLowerCase().includes(lowerQuery)) {
              if (!next.find((s) => s.text === doc.specialty)) {
                next.push({ type: "specialty", text: doc.specialty });
              }
            }
            if (doc.practice_city?.toLowerCase().includes(lowerQuery)) {
              if (!next.find((s) => s.text === doc.practice_city && s.type === "location")) {
                next.push({ type: "location", text: doc.practice_city });
              }
            }
          });
        }

        const { data: practices } = await supabase
          .from("practice_public_search_view")
          .select("name, city, country")
          .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
          .limit(5);

        if (practices) {
          practices.forEach((p: any) => {
            if (p.city?.toLowerCase().includes(lowerQuery)) {
              if (!next.find((s) => s.text === p.city && s.type === "location")) {
                next.push({ type: "location", text: p.city });
              }
            }
          });
        }

        setSuggestions(next.slice(0, 10));
      } catch (error) {
        console.error("Error getting suggestions:", error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [recentSearches, popularSearches]
  );

  useEffect(() => {
    fetchPopularSearches();
    if (user) {
      fetchRecentSearches();
      fetchSavedSearches();
    }
  }, [user, fetchPopularSearches, fetchRecentSearches, fetchSavedSearches]);

  return {
    recentSearches,
    popularSearches,
    savedSearches,
    suggestions,
    isLoadingSuggestions,
    recordSearch,
    saveSearch,
    deleteSavedSearch,
    clearSearchHistory,
    getSuggestions,
    fetchRecentSearches,
    fetchPopularSearches,
    fetchSavedSearches,
  };
};
