import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  type: 'recent' | 'popular' | 'specialty' | 'location' | 'doctor';
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

  // Fetch recent searches for the user
  const fetchRecentSearches = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('search_history')
        .select('search_term')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) {
        const uniqueTerms = [...new Set(data.map(d => d.search_term))];
        setRecentSearches(uniqueTerms.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching recent searches:', error);
    }
  }, [user]);

  // Fetch popular searches
  const fetchPopularSearches = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('popular_searches')
        .select('search_term')
        .order('search_count', { ascending: false })
        .limit(10);
      
      if (data) {
        setPopularSearches(data.map(d => d.search_term));
      }
    } catch (error) {
      console.error('Error fetching popular searches:', error);
    }
  }, []);

  // Fetch saved searches
  const fetchSavedSearches = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) {
        setSavedSearches(data as SavedSearch[]);
      }
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    }
  }, [user]);

  // Record a search
  const recordSearch = useCallback(async (
    term: string, 
    type: string = 'general', 
    filters: SearchFilters = {},
    resultCount: number = 0
  ) => {
    if (!term.trim()) return;
    
    try {
      // Record in user history if logged in
      if (user) {
        await supabase.from('search_history').insert([{
          user_id: user.id,
          search_term: term.toLowerCase().trim(),
          search_type: type,
          filters: filters as any,
          result_count: resultCount
        }]);
      }
      
      // Update popular searches
      await supabase.rpc('update_popular_search', { term: term.toLowerCase().trim() });
      
      // Refresh recent searches
      fetchRecentSearches();
    } catch (error) {
      console.error('Error recording search:', error);
    }
  }, [user, fetchRecentSearches]);

  // Save a search
  const saveSearch = useCallback(async (name: string, term: string, filters: SearchFilters) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .insert([{
          user_id: user.id,
          name,
          search_term: term,
          filters: filters as any
        }])
        .select()
        .single();
      
      if (error) throw error;
      fetchSavedSearches();
      return data;
    } catch (error) {
      console.error('Error saving search:', error);
      return null;
    }
  }, [user, fetchSavedSearches]);

  // Delete saved search
  const deleteSavedSearch = useCallback(async (id: string) => {
    try {
      await supabase.from('saved_searches').delete().eq('id', id);
      fetchSavedSearches();
    } catch (error) {
      console.error('Error deleting saved search:', error);
    }
  }, [fetchSavedSearches]);

  // Clear search history
  const clearSearchHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      await supabase.from('search_history').delete().eq('user_id', user.id);
      setRecentSearches([]);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }, [user]);

  // Get suggestions based on input
  const getSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      // Return recent + popular when no query
      const suggestions: SearchSuggestion[] = [
        ...recentSearches.map(text => ({ type: 'recent' as const, text })),
        ...popularSearches.slice(0, 5).map(text => ({ type: 'popular' as const, text }))
      ];
      setSuggestions(suggestions);
      return;
    }

    setIsLoadingSuggestions(true);
    const lowerQuery = query.toLowerCase();
    
    try {
      const suggestions: SearchSuggestion[] = [];
      
      // Add matching recent searches
      recentSearches
        .filter(s => s.toLowerCase().includes(lowerQuery))
        .forEach(text => suggestions.push({ type: 'recent', text }));
      
      // Add matching popular searches
      popularSearches
        .filter(s => s.toLowerCase().includes(lowerQuery))
        .slice(0, 3)
        .forEach(text => {
          if (!suggestions.find(s => s.text === text)) {
            suggestions.push({ type: 'popular', text });
          }
        });

      // Search for matching doctors
      const { data: doctors } = await supabase
        .from('doctor_profiles_view')
        .select('full_name, specialty')
        .or(`full_name.ilike.%${query}%,specialty.ilike.%${query}%`)
        .eq('verified', true)
        .limit(5);
      
      if (doctors) {
        doctors.forEach(doc => {
          if (doc.full_name?.toLowerCase().includes(lowerQuery)) {
            suggestions.push({ type: 'doctor', text: doc.full_name });
          }
          if (doc.specialty?.toLowerCase().includes(lowerQuery)) {
            if (!suggestions.find(s => s.text === doc.specialty)) {
              suggestions.push({ type: 'specialty', text: doc.specialty });
            }
          }
        });
      }

      // Search for matching practices/locations
      const { data: practices } = await supabase
        .from('practices')
        .select('name, city, country')
        .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
        .eq('verified', true)
        .limit(5);
      
      if (practices) {
        practices.forEach(practice => {
          if (practice.city?.toLowerCase().includes(lowerQuery)) {
            if (!suggestions.find(s => s.text === practice.city && s.type === 'location')) {
              suggestions.push({ type: 'location', text: practice.city });
            }
          }
        });
      }

      setSuggestions(suggestions.slice(0, 10));
    } catch (error) {
      console.error('Error getting suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [recentSearches, popularSearches]);

  // Initial fetch
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
