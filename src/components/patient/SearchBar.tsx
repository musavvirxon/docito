import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  MapPin, 
  Building2, 
  CreditCard, 
  Star, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Mic,
  Filter,
  Heart,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDoctors } from "@/hooks/useDoctors";
import { usePractices } from "@/hooks/usePractices";

interface SearchResult {
  id: string;
  type: 'doctor' | 'practice';
  name: string;
  specialty?: string;
  location: string;
  rating: number;
  availability?: string;
  acceptsInsurance?: boolean;
  acceptsNewPatients?: boolean;
  distance?: string;
}

interface SearchBarProps {
  onSearch?: (results: SearchResult[]) => void;
  className?: string;
  initialQuery?: string;
  showResultsInline?: boolean;
}

const SearchBar = ({ onSearch, className, initialQuery, showResultsInline = false }: SearchBarProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { searchDoctors } = useDoctors();
  const { searchPractices } = usePractices();
  
  const [doctorQuery, setDoctorQuery] = useState(initialQuery || searchParams.get('specialty') || "");
  const [locationQuery, setLocationQuery] = useState(searchParams.get('location') || "");
  const [practiceQuery, setPracticeQuery] = useState(searchParams.get('practice') || "");
  const [insuranceQuery, setInsuranceQuery] = useState(searchParams.get('insurance') || "");
  const [showPracticeField, setShowPracticeField] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter states
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'availability'>('rating');
  const [acceptsInsurance, setAcceptsInsurance] = useState(searchParams.get('insurance_accepted') === 'true');
  const [acceptsNewPatients, setAcceptsNewPatients] = useState(searchParams.get('new_patients') === 'true');

  const doctorInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Mock data for autocomplete
  const mockSuggestions = {
    doctors: [
      "Dr. Sarah Johnson - Cardiologist",
      "Dr. Michael Chen - Dermatologist", 
      "Dr. Amina Hassan - Pediatrician",
      "Teeth cleaning",
      "Orthodontist",
      "Physical therapy",
      "Mental health",
      "Annual checkup"
    ],
    practices: [
      "Manchester Medical Center",
      "Tashkent General Hospital",
      "Downtown Dental Clinic",
      "City Eye Care Center",
      "Family Health Associates"
    ],
    locations: [
      "Manchester, NH",
      "Tashkent, Uzbekistan",
      "Boston, MA",
      "New York, NY",
      "Ohio",
      "California"
    ]
  };

  // Debounced search suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (doctorQuery.length > 1) {
        const filtered = mockSuggestions.doctors.filter(item =>
          item.toLowerCase().includes(doctorQuery.toLowerCase())
        );
        setActiveSuggestions(filtered.slice(0, 5));
        setShowSuggestions(filtered.length > 0);
      } else {
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [doctorQuery]);

  // Handle search function
  const handleSearch = async () => {
    if (showResultsInline && onSearch) {
      // For inline results - use real Supabase search
      setIsLoading(true);
      
      try {
        const [doctorsResults, practicesResults] = await Promise.all([
          searchDoctors(doctorQuery, locationQuery),
          searchPractices(practiceQuery, locationQuery)
        ]);

        // Transform results to match interface
        const transformedResults: SearchResult[] = [
          ...doctorsResults.map(doctor => ({
            id: doctor.id,
            type: "doctor" as const,
            name: doctor.profiles ? (doctor.profiles as any).full_name || "Doctor" : "Doctor",
            specialty: doctor.specialty,
            location: doctor.practices ? `${(doctor.practices as any).city || "City"}, ${(doctor.practices as any).country || "Country"}` : "Location",
            rating: 4.8,
            availability: "Available today",
            acceptsInsurance: true,
            acceptsNewPatients: doctor.accepts_new_patients,
            distance: "0.8 miles"
          })),
          ...practicesResults.map(practice => ({
            id: practice.id,
            type: "practice" as const,
            name: practice.name,
            location: `${practice.city || "City"}, ${practice.country || "Country"}`,
            rating: 4.7,
            acceptsInsurance: true,
            acceptsNewPatients: true,
            distance: "1.2 miles"
          }))
        ];

        onSearch(transformedResults);
      } catch (error) {
        console.error('Search error:', error);
        // Fallback to mock results
        const mockResults: SearchResult[] = [
          {
            id: "1",
            type: "doctor",
            name: "Dr. Sarah Johnson",
            specialty: "Cardiologist",
            location: "Manchester Medical Center, NH",
            rating: 4.9,
            availability: "Available today",
            acceptsInsurance: true,
            acceptsNewPatients: true,
            distance: "0.8 miles"
          }
        ];
        onSearch(mockResults);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Navigate to search results page with query parameters
      const params = new URLSearchParams();
      
      if (doctorQuery.trim()) params.set('specialty', doctorQuery.trim());
      if (locationQuery.trim()) params.set('location', locationQuery.trim());
      if (practiceQuery.trim()) params.set('practice', practiceQuery.trim());
      if (insuranceQuery.trim()) params.set('insurance', insuranceQuery.trim());
      if (acceptsInsurance) params.set('insurance_accepted', 'true');
      if (acceptsNewPatients) params.set('new_patients', 'true');
      if (sortBy !== 'rating') params.set('sort', sortBy);
      
      navigate(`/search-results?${params.toString()}`);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setDoctorQuery(suggestion);
    setShowSuggestions(false);
  };

  const popularSearches = [
    "Teeth cleaning near me",
    "Dr. Amina, pediatrician",
    "Dental Clinic, Ohio",
    "Annual physical exam",
    "Eye doctor nearby"
  ];

  return (
    <Card className={cn("w-full border-2 border-primary/10 shadow-lg", className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Find the right care for you
          </h2>
          <p className="text-muted-foreground">
            Search for doctors, specialists, or practices in your area
          </p>
        </div>

        {/* Main Search Inputs */}
        <div className="space-y-4" ref={searchContainerRef}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Doctor/Specialty Input */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={doctorInputRef}
                placeholder="Doctor name, procedure, or specialty"
                value={doctorQuery}
                onChange={(e) => setDoctorQuery(e.target.value)}
                className="pl-10 h-12 text-base"
                onFocus={() => {
                  if (doctorQuery.length > 1) setShowSuggestions(true);
                }}
              />
              
              {/* Autocomplete Suggestions */}
              {showSuggestions && (
                <Card className="absolute top-full left-0 right-0 mt-2 z-50 border shadow-lg">
                  <CardContent className="p-2">
                    {activeSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-3 py-2 hover:bg-accent rounded-md text-sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Location Input */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="City, state, or region"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            {/* Search Button */}
            <Button 
              onClick={handleSearch}
              disabled={isLoading}
              className="h-12 bg-yellow-500 hover:bg-yellow-600 text-foreground font-semibold"
            >
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* Practice Input (Collapsible) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowPracticeField(!showPracticeField)}
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Building2 className="w-4 h-4" />
              <span>Search by practice or clinic name (optional)</span>
              {showPracticeField ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showPracticeField && (
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Practice or clinic name"
                  value={practiceQuery}
                  onChange={(e) => setPracticeQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </div>

          {/* Insurance Input */}
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Insurance carrier and plan (optional)"
              value={insuranceQuery}
              onChange={(e) => setInsuranceQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters Toggle */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filter results</span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFilters && (
            <div className="mt-4 p-4 bg-accent/10 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Sort By */}
                <div>
                  <Label className="text-sm font-medium">Sort by</Label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="mt-1 w-full p-2 border rounded-md text-sm"
                  >
                    <option value="rating">Rating</option>
                    <option value="distance">Distance</option>
                    <option value="availability">Availability</option>
                  </select>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="accepts-insurance"
                      checked={acceptsInsurance}
                      onCheckedChange={setAcceptsInsurance}
                    />
                    <Label htmlFor="accepts-insurance" className="text-sm">
                      Accepts my insurance
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="accepts-new-patients"
                      checked={acceptsNewPatients}
                      onCheckedChange={setAcceptsNewPatients}
                    />
                    <Label htmlFor="accepts-new-patients" className="text-sm">
                      Accepts new patients
                    </Label>
                  </div>
                </div>

                {/* Voice Search */}
                <div className="flex items-center justify-center">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2">
                    <Mic className="w-4 h-4" />
                    <span>Voice Search</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Popular Searches */}
        <Separator className="my-4" />
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Popular searches:</h4>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((search, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setDoctorQuery(search)}
              >
                {search}
              </Badge>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 text-blue-800">
            <Heart className="w-4 h-4" />
            <span className="text-sm font-medium">Need help finding someone?</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Our care concierge can help you find the right provider.{" "}
            <button className="underline hover:no-underline">
              Start live chat
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchBar;