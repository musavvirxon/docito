import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import SearchBar from "@/components/patient/SearchBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  MapPin, 
  Star, 
  Calendar, 
  CreditCard, 
  Users, 
  Clock,
  Map,
  List,
  Filter,
  Languages,
  GraduationCap,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'distance' | 'experience'>(
    (searchParams.get('sort') as any) || 'relevance'
  );
  const [filters, setFilters] = useState({
    doctorsOnly: false,
    practicesOnly: false,
    availableToday: false,
    acceptsInsurance: searchParams.get('insurance_accepted') === 'true',
    acceptsNewPatients: searchParams.get('new_patients') === 'true',
    videoConsultation: false,
    minExperience: 0,
    languages: [] as string[]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>(location.state?.results || []);
  const [isSearchPanelFixed, setIsSearchPanelFixed] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showMobileSearchPanel, setShowMobileSearchPanel] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const backButtonRef = useRef<HTMLDivElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Desktop scroll handler for search panel fixing and results scrolling
  const handleDesktopScroll = useCallback(() => {
    if (isMobile) return;
    
    const searchPanel = searchPanelRef.current;
    const backButton = backButtonRef.current;
    
    if (!searchPanel || !backButton) return;
    
    const searchPanelRect = searchPanel.getBoundingClientRect();
    const backButtonRect = backButton.getBoundingClientRect();
    const currentScrollY = window.scrollY;
    
    // Check if search panel has reached just above back button
    const shouldFix = searchPanelRect.bottom <= backButtonRect.top + 10;
    
    if (shouldFix !== isSearchPanelFixed) {
      setIsSearchPanelFixed(shouldFix);
    }
    
    // Show scroll-to-top when scrolling up
    const scrollDirection = currentScrollY > lastScrollYRef.current ? 'down' : 'up';
    if (scrollDirection === 'up' && currentScrollY > 200) {
      setShowScrollToTop(true);
    } else if (scrollDirection === 'down') {
      setShowScrollToTop(false);
    }
    
    lastScrollYRef.current = currentScrollY;
  }, [isMobile, isSearchPanelFixed]);

  // Mobile scroll handler for panel visibility
  const handleMobileScroll = useCallback(() => {
    if (!isMobile) return;
    
    const currentScrollY = window.scrollY;
    const scrollDirection = currentScrollY > lastScrollYRef.current ? 'down' : 'up';
    
    // Hide search panel when scrolling down, show when scrolling up
    if (scrollDirection === 'down' && currentScrollY > 100) {
      setShowMobileSearchPanel(false);
    } else if (scrollDirection === 'up') {
      setShowMobileSearchPanel(true);
    }
    
    // Show scroll-to-top when scrolling up
    if (scrollDirection === 'up' && currentScrollY > 200) {
      setShowScrollToTop(true);
    } else if (scrollDirection === 'down') {
      setShowScrollToTop(false);
    }
    
    lastScrollYRef.current = currentScrollY;
  }, [isMobile]);

  // Add scroll listeners
  useEffect(() => {
    let ticking = false;
    
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (isMobile) {
            handleMobileScroll();
          } else {
            handleDesktopScroll();
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', throttledScroll);
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [isMobile, handleMobileScroll, handleDesktopScroll]);

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

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Desktop: Search Panel (natural scroll until fixed) */}
        {!isMobile && (
          <div 
            ref={searchPanelRef}
            className={cn(
              "bg-primary/5 py-4 border-b border-border transition-all duration-400 ease-out",
              isSearchPanelFixed ? "fixed top-16 left-0 right-0 z-40 shadow-lg" : "relative"
            )}
          >
            <div className="container mx-auto px-4">
              <SearchBar 
                onSearch={handleSearchResults}
                className="max-w-6xl mx-auto"
                showResultsInline={true}
              />
            </div>
          </div>
        )}

        {/* Mobile: Search Panel (slide up/down) */}
        {isMobile && (
          <>
            {/* Mobile Search Panel */}
            <div 
              className={cn(
                "bg-primary/5 py-4 border-b border-border transition-all duration-400 ease-out",
                showMobileSearchPanel ? "relative" : "fixed -top-96 left-0 right-0 z-40"
              )}
            >
              <div className="container mx-auto px-4">
                <SearchBar 
                  onSearch={handleSearchResults}
                  className="max-w-6xl mx-auto"
                  showResultsInline={true}
                />
                {/* Hide button for mobile */}
                {showMobileSearchPanel && (
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMobileSearchPanel(false)}
                      className="text-muted-foreground"
                    >
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Hide Search
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Show Search Button */}
            {!showMobileSearchPanel && (
              <div className="fixed top-16 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
                <div className="container mx-auto px-4 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMobileSearchPanel(true)}
                    className="w-full text-muted-foreground"
                  >
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Show Search Panel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <div className={cn(
          "container mx-auto px-4 py-8",
          isSearchPanelFixed && !isMobile ? "pt-32" : ""
        )}>
          <div ref={backButtonRef}>
            <BackButton />
          </div>
          
          {/* Mobile Filters Button */}
          {isMobile && !showMobileSearchPanel && (
            <div className="mb-4">
              <Button
                variant="outline"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="w-full lg:hidden"
              >
                <Filter className="w-4 h-4 mr-2" />
                Show Filters
                {showMobileFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          )}
          
          {/* Results Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Search Results for "{searchQuery}"
              </h1>
              <p className="text-muted-foreground">
                {results.length} {results.length === 1 ? 'result' : 'results'} found
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Sort by:</Label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="relevance">Relevance</option>
                  <option value="rating">Rating</option>
                  <option value="distance">Distance</option>
                  <option value="experience">Experience</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4 mr-2" />
                  List
                </Button>
                <Button
                  variant={viewMode === 'map' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                >
                  <Map className="w-4 h-4 mr-2" />
                  Map
                </Button>
              </div>
            </div>
          </div>

          <div className={cn(
            "flex gap-8",
            isSearchPanelFixed && !isMobile ? "lg:flex-row lg:h-[calc(100vh-280px)]" : "flex-col lg:flex-row"
          )}>
            {/* Filter Sidebar */}
            <aside className={cn(
              "lg:w-80",
              isMobile && showMobileFilters ? "block" : isMobile ? "hidden" : "block"
            )}>
              <div ref={filtersRef} className={cn(
                isSearchPanelFixed && !isMobile ? "sticky top-4 max-h-[calc(100vh-120px)] overflow-y-auto" : "sticky top-32"
              )}>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Filter className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">Filters</h3>
                    </div>

                    {/* Result Type Filters */}
                    <div className="space-y-3 mb-6">
                      <Label className="text-sm font-medium">Show Results</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="doctors-only" className="text-sm">
                            Doctors only
                          </Label>
                          <Switch
                            id="doctors-only"
                            checked={filters.doctorsOnly}
                            onCheckedChange={(checked) => 
                              setFilters(prev => ({
                                ...prev, 
                                doctorsOnly: checked,
                                practicesOnly: checked ? false : prev.practicesOnly
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="practices-only" className="text-sm">
                            Practices only
                          </Label>
                          <Switch
                            id="practices-only"
                            checked={filters.practicesOnly}
                            onCheckedChange={(checked) => 
                              setFilters(prev => ({
                                ...prev, 
                                practicesOnly: checked,
                                doctorsOnly: checked ? false : prev.doctorsOnly
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Availability Filters */}
                    <div className="space-y-3 mb-6">
                      <Label className="text-sm font-medium">Availability</Label>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="available-today" className="text-sm">
                          Available today
                        </Label>
                        <Switch
                          id="available-today"
                          checked={filters.availableToday}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({...prev, availableToday: checked}))
                          }
                        />
                      </div>
                    </div>

                    {/* Insurance & New Patients */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="accepts-insurance" className="text-sm">
                          Accepts insurance
                        </Label>
                        <Switch
                          id="accepts-insurance"
                          checked={filters.acceptsInsurance}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({...prev, acceptsInsurance: checked}))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="new-patients" className="text-sm">
                          Accepts new patients
                        </Label>
                        <Switch
                          id="new-patients"
                          checked={filters.acceptsNewPatients}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({...prev, acceptsNewPatients: checked}))
                          }
                        />
                      </div>
                    </div>

                    {/* Video Consultation */}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="video-consultation" className="text-sm">
                        Video consultation available
                      </Label>
                      <Switch
                        id="video-consultation"
                        checked={filters.videoConsultation}
                        onCheckedChange={(checked) => 
                          setFilters(prev => ({...prev, videoConsultation: checked}))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* Main Results */}
            <div className={cn(
              "flex-1",
              isSearchPanelFixed && !isMobile ? "overflow-y-auto" : ""
            )} ref={resultsContainerRef}>
              {viewMode === 'map' ? (
                /* Map View */
                <Card className="h-96 mb-6">
                  <CardContent className="p-6 h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Map className="w-12 h-12 mx-auto mb-4" />
                      <p>Map integration coming soon</p>
                      <p className="text-sm">Interactive map with doctor pins will be displayed here</p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Loading State */}
              {isLoading && (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* No Results */}
              {!isLoading && results.length === 0 && searchResults.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="mb-4">
                      <Users className="w-16 h-16 mx-auto text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search terms or filters to find what you're looking for.
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = '/'}>
                      Start New Search
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Results List */}
              {!isLoading && (
                <div className="space-y-6">
                  {results.map((result) => (
                    <Card 
                      key={result.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => {
                        if (result.type === 'doctor') {
                          // Store doctor info for redirect after signup if not logged in
                          localStorage.setItem('pendingDoctorVisit', JSON.stringify(result));
                          window.location.href = '/signup';
                        } else {
                          navigate(`/practice/${result.id}`);
                        }
                      }}
                    >
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          {/* Image */}
                          <div className="flex-shrink-0">
                            <img
                              src={result.image || "/placeholder.svg"}
                              alt={result.name}
                              className="w-24 h-24 rounded-lg object-cover"
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-semibold text-foreground">
                                    {result.name}
                                  </h3>
                                  <Badge 
                                    variant={result.type === 'doctor' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {result.type === 'doctor' ? 'Doctor' : 'Practice'}
                                  </Badge>
                                </div>
                                {result.specialty && (
                                  <p className="text-primary font-medium">{result.specialty}</p>
                                )}
                                {result.practiceName && (
                                  <p className="text-sm text-muted-foreground">{result.practiceName}</p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-medium">{result.rating}</span>
                                {result.reviewCount && (
                                  <span className="text-muted-foreground text-sm">
                                    ({result.reviewCount})
                                  </span>
                                )}
                              </div>
                            </div>

                            {result.bio && (
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {result.bio}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-2 mb-4">
                              <Badge variant="secondary" className="text-xs">
                                <MapPin className="w-3 h-3 mr-1" />
                                {result.distance}
                              </Badge>
                              {result.experience && (
                                <Badge variant="secondary" className="text-xs">
                                  <GraduationCap className="w-3 h-3 mr-1" />
                                  {result.experience}
                                </Badge>
                              )}
                              {result.languages && result.languages.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  <Languages className="w-3 h-3 mr-1" />
                                  {result.languages.join(', ')}
                                </Badge>
                              )}
                              {result.availability && (
                                <Badge 
                                  variant={result.availability.includes('today') ? 'default' : 'outline'}
                                  className={cn(
                                    "text-xs",
                                    result.availability.includes('today') && "bg-green-100 text-green-700"
                                  )}
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  {result.availability}
                                </Badge>
                              )}
                              {result.acceptsInsurance && (
                                <Badge variant="outline" className="text-xs">
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  Insurance accepted
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button 
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (result.type === 'doctor') {
                                    navigate('/signup');
                                  } else {
                                    navigate(`/practice/${result.id}`);
                                  }
                                }}
                              >
                                <Calendar className="w-4 h-4 mr-2" />
                                {result.type === 'doctor' ? 'Book Appointment' : 'View Doctors'}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (result.type === 'doctor') {
                                    navigate(`/doctor/${result.id}`);
                                  } else {
                                    navigate(`/practice/${result.id}`);
                                  }
                                }}
                              >
                                View Profile
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scroll to Top Button */}
        {showScrollToTop && (
          <Button
            onClick={scrollToTop}
            className={cn(
              "fixed bottom-6 right-6 z-50 w-12 h-12 p-0",
              "bg-transparent hover:bg-transparent border-0 shadow-none",
              "text-foreground hover:text-primary transition-all duration-300",
              "animate-fade-in"
            )}
            aria-label="Scroll to top"
            title="Back to top"
          >
            <ChevronUp className="w-6 h-6" />
          </Button>
        )}
      </main>
    </div>
  );
};

export default SearchResults;