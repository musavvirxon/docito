import { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import SearchResultsHeader from "@/components/search/SearchResultsHeader";
import FilterSidebar from "@/components/search/FilterSidebar";
import MobileFilterDrawer from "@/components/search/MobileFilterDrawer";
import ResultsList from "@/components/search/ResultsList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { doctorApi } from "@/lib/api/supabase-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  type: 'doctor' | 'practice';
  name: string;
  specialty?: string;
  location: string;
  rating: number;
  reviewCount?: number;
  availability?: string;
  acceptsInsurance?: boolean;
  acceptsNewPatients?: boolean;
  distance?: string;
  image?: string;
  bio?: string;
  experience?: string;
  languages?: string[];
  practiceName?: string;
  degree?: string;
  consultationFee?: number;
  practiceType?: string;
  description?: string;
  specialties?: string[];
  doctorCount?: number;
  logoUrl?: string;
  affiliatedPractice?: string;
}

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'distance' | 'experience'>(
    (searchParams.get('sort') as any) || 'relevance'
  );
  const [filters, setFilters] = useState({
    doctorsOnly: false,
    practicesOnly: false,
    acceptsNewPatients: searchParams.get('new_patients') === 'true',
    availableToday: false,
    acceptsInsurance: searchParams.get('insurance_accepted') === 'true',
    videoConsultation: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>(location.state?.results || []);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-trigger search based on URL parameters
  useEffect(() => {
    const specialty = searchParams.get('specialty');
    const location = searchParams.get('location');
    
    if (specialty || location) {
      performSearch();
    }
  }, [searchParams]);

  const performSearch = async () => {
    setIsLoading(true);
    
    try {
      const specialty = searchParams.get('specialty');
      const location = searchParams.get('location');
      const searchTerm = searchParams.get('q');
      
      const results: SearchResult[] = [];

      // Search doctors
      const doctorsResponse = specialty 
        ? await doctorApi.searchDoctors(specialty, location || undefined, specialty)
        : searchTerm 
        ? await doctorApi.searchDoctors(searchTerm, location || undefined)
        : await doctorApi.fetchDoctors();

      // Handle doctor API response
      if ('data' in doctorsResponse && doctorsResponse.data) {
        const doctorResults: SearchResult[] = doctorsResponse.data.map(doctor => ({
          id: doctor.id,
          type: 'doctor',
          name: doctor.profiles?.full_name || 'Doctor',
          specialty: doctor.specialty,
          location: doctor.practices ? `${doctor.practices.city}, ${doctor.practices.country}` : 'Location not specified',
          rating: doctor.average_rating || 0,
          reviewCount: doctor.num_reviews || 0,
          availability: doctor.accepts_new_patients ? "Accepting new patients" : "Not accepting new patients",
          acceptsInsurance: true, // Default for now
          acceptsNewPatients: doctor.accepts_new_patients,
          image: doctor.profiles?.avatar_url || "/placeholder.svg",
          bio: doctor.bio || "Experienced medical professional",
          consultationFee: doctor.consultation_fee || undefined,
          degree: "MD", // Default for now
          languages: ["English"], // Default for now
          affiliatedPractice: doctor.practices?.name || "Independent Doctor"
        }));
        results.push(...doctorResults);
      }

      // Search practices using existing hook pattern
      try {
        const { data: practicesData } = await supabase
          .from('practices')
          .select('*')
          .eq('verified', true)
          .order('weighted_rating', { ascending: false })
          .order('appointment_count', { ascending: false });

        if (practicesData) {
          const practiceResults: SearchResult[] = practicesData.map(practice => ({
            id: practice.id,
            type: 'practice',
            name: practice.name,
            location: `${practice.city}, ${practice.country}`,
            rating: practice.average_rating || 0,
            reviewCount: practice.num_reviews || 0,
            acceptsInsurance: true, // Default for now
            acceptsNewPatients: true, // Default for now
            logoUrl: practice.logo_url || "/placeholder.svg",
            description: practice.description || "Quality healthcare services",
            practiceType: "Medical Practice", // Default for now
            specialties: [], // Could be derived from practice description
            doctorCount: 5 // Default for now
          }));
          results.push(...practiceResults);
        }
      } catch (practiceError) {
        console.error('Failed to fetch practices:', practiceError);
        // Continue without practices if they fail to load
      }

      // Sort results by rating
      results.sort((a, b) => b.rating - a.rating);
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Failed to search. Please try again.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchQuery = location.state?.searchQuery || 
    searchParams.get('specialty') || 
    searchParams.get('location') || 
    "Healthcare providers";

  const handleSearchResults = (results: SearchResult[]) => {
    setSearchResults(results);
  };

  const handleFilterChange = (key: string, value: boolean) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      // Ensure mutual exclusivity for provider type filters
      if (key === 'doctorsOnly' && value) {
        newFilters.practicesOnly = false;
      } else if (key === 'practicesOnly' && value) {
        newFilters.doctorsOnly = false;
      }
      
      return newFilters;
    });
  };

  const handleResetFilters = () => {
    setFilters({
      doctorsOnly: false,
      practicesOnly: false,
      acceptsNewPatients: false,
      availableToday: false,
      acceptsInsurance: false,
      videoConsultation: false,
    });
  };

  const filteredAndSortedResults = () => {
    let filtered = [...searchResults];

    // Apply filters
    if (filters.doctorsOnly) {
      filtered = filtered.filter(r => r.type === 'doctor');
    }
    if (filters.practicesOnly) {
      filtered = filtered.filter(r => r.type === 'practice');
    }
    if (filters.availableToday) {
      filtered = filtered.filter(r => r.availability?.includes('today'));
    }
    if (filters.acceptsInsurance) {
      filtered = filtered.filter(r => r.acceptsInsurance);
    }
    if (filters.acceptsNewPatients) {
      filtered = filtered.filter(r => r.acceptsNewPatients);
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'distance':
          return parseFloat(a.distance || '0') - parseFloat(b.distance || '0');
        case 'experience':
          const aExp = parseInt(a.experience || '0');
          const bExp = parseInt(b.experience || '0');
          return bExp - aExp;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const results = filteredAndSortedResults();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Search Header - Part of Layout */}
      <SearchResultsHeader 
        searchQuery={searchQuery}
        onSearch={handleSearchResults}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-5 pb-0 min-h-screen">
        {/* Results Layout */}
        <div className="flex gap-8">
          {/* Desktop Filters Sidebar */}
          {!isMobile && (
            <FilterSidebar 
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          )}

          {/* Results Content */}
          <div className="flex-1">
            {/* Mobile Filter Button */}
            {isMobile && (
              <div className="flex justify-end mb-4">
                <MobileFilterDrawer 
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onReset={handleResetFilters}
                />
              </div>
            )}

            {/* Results List */}
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Searching...</p>
              </div>
            ) : (
              <ResultsList 
                results={results}
                searchQuery={searchQuery}
                sortBy={sortBy}
                onSortChange={(value) => setSortBy(value as any)}
                isMobile={isMobile}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SearchResults;