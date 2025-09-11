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
    
    // Simulate API search based on URL parameters
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const specialty = searchParams.get('specialty');
    const location = searchParams.get('location');
    
    // Generate relevant mock results based on search parameters
    const allMockResults: SearchResult[] = [
      {
        id: "1",
        type: "doctor",
        name: "Dr. Sarah Johnson",
        specialty: specialty || "Cardiologist",
        location: "Manchester Medical Center, NH",
        rating: 4.9,
        reviewCount: 127,
        availability: "Available today",
        acceptsInsurance: true,
        acceptsNewPatients: true,
        distance: "0.8 miles",
        image: "/placeholder.svg",
        bio: "Board-certified specialist with expertise in preventive care and advanced treatments.",
        experience: "15 years",
        languages: ["English", "Spanish"],
        practiceName: "Manchester Medical Center"
      },
      {
        id: "2",
        type: "practice",
        name: `${specialty ? specialty.replace('ist', '') : 'Medical'} Center`,
        location: location || "Manchester, NH",
        rating: 4.7,
        reviewCount: 89,
        acceptsInsurance: true,
        acceptsNewPatients: true,
        distance: "1.2 miles",
        image: "/placeholder.svg",
        bio: `Full-service ${specialty?.toLowerCase() || 'medical'} practice offering comprehensive care and specialized treatments.`
      },
      {
        id: "3",
        type: "doctor",
        name: "Dr. Michael Chen",
        specialty: specialty || "Dermatologist",
        location: "Boston Medical Center, MA",
        rating: 4.8,
        reviewCount: 156,
        availability: "Next available: Tomorrow",
        acceptsInsurance: false,
        acceptsNewPatients: true,
        distance: "2.1 miles",
        image: "/placeholder.svg",
        bio: "Specialized in modern treatments with a focus on patient-centered care.",
        experience: "12 years",
        languages: ["English", "Mandarin"],
        practiceName: "Boston Medical Center"
      },
      {
        id: "4",
        type: "doctor",
        name: "Dr. Emily Rodriguez",
        specialty: specialty || "Pediatrician",
        location: "Children's Health Center, NH",
        rating: 4.6,
        reviewCount: 203,
        availability: "Available today",
        acceptsInsurance: true,
        acceptsNewPatients: false,
        distance: "1.5 miles",
        image: "/placeholder.svg",
        bio: "Compassionate pediatric care with focus on family-centered medicine.",
        experience: "10 years",
        languages: ["English", "Spanish", "French"]
      }
    ];
    
    setSearchResults(allMockResults);
    setIsLoading(false);
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