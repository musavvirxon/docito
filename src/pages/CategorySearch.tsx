import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import SearchBar from "@/components/patient/SearchBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  MapPin, 
  Star, 
  Calendar, 
  CreditCard, 
  Users, 
  Clock,
  Filter,
  Grid3X3,
  List
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  image: string;
  rating: number;
  reviewCount: number;
  location: string;
  bio: string;
  experience: string;
  gender: string;
  availableToday: boolean;
  acceptsInsurance: boolean;
  distance: string;
}

const CategorySearch = () => {
  const { t } = useTranslation('common');
  const { category } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState({
    location: "",
    rating: [4],
    gender: "all",
    availability: "all",
    insurance: false,
    consultationType: "all",
    priceRange: [0, 500]
  });

  // Mock data - replace with real API call
  const mockDoctors: Doctor[] = [
    {
      id: "1",
      name: "Dr. Sarah Johnson",
      specialty: category || "Dentist",
      image: "/placeholder.svg",
      rating: 4.9,
      reviewCount: 127,
      location: "Downtown Medical Center",
      bio: "Experienced in cosmetic and general dentistry with 15+ years of practice.",
      experience: "15 years",
      gender: "Female",
      availableToday: true,
      acceptsInsurance: true,
      distance: "1.2 miles"
    },
    {
      id: "2", 
      name: "Dr. Michael Chen",
      specialty: category || "Dentist",
      image: "/placeholder.svg",
      rating: 4.8,
      reviewCount: 89,
      location: "City Dental Care",
      bio: "Specializes in orthodontics and pediatric dentistry.",
      experience: "12 years",
      gender: "Male",
      availableToday: false,
      acceptsInsurance: true,
      distance: "2.1 miles"
    }
  ];

  const handleSearchResults = (results: any[]) => {
    navigate('/search-results', { state: { results, searchQuery: category } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Search Bar Section */}
        <div className="bg-primary/5 py-8">
          <div className="container mx-auto px-4">
            <SearchBar 
              onSearch={handleSearchResults}
              className="max-w-6xl mx-auto"
              initialQuery={category}
            />
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filter Sidebar */}
            <aside className="lg:w-80 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Filter className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Filters</h3>
                  </div>

                  {/* Location Filter */}
                  <div className="space-y-3 mb-6">
                    <Label className="text-sm font-medium">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="City or ZIP code"
                        className="w-full pl-10 pr-4 py-2 border rounded-md text-sm"
                        value={filters.location}
                        onChange={(e) => setFilters(prev => ({...prev, location: e.target.value}))}
                      />
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Rating Filter */}
                  <div className="space-y-3 mb-6">
                    <Label className="text-sm font-medium">Minimum Rating</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.rating}
                        onValueChange={(value) => setFilters(prev => ({...prev, rating: value}))}
                        max={5}
                        min={1}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>1★</span>
                        <span className="font-medium">{filters.rating[0]}★+</span>
                        <span>5★</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Gender Preference */}
                  <div className="space-y-3 mb-6">
                    <Label className="text-sm font-medium">Gender Preference</Label>
                    <div className="space-y-2">
                      {['all', 'male', 'female'].map((option) => (
                        <label key={option} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            value={option}
                            checked={filters.gender === option}
                            onChange={(e) => setFilters(prev => ({...prev, gender: e.target.value}))}
                            className="w-4 h-4"
                          />
                          <span className="text-sm capitalize">{option === 'all' ? 'No preference' : option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Availability */}
                  <div className="space-y-3 mb-6">
                    <Label className="text-sm font-medium">Availability</Label>
                    <div className="space-y-2">
                      {[
                        { value: 'all', label: 'Any time' },
                        { value: 'today', label: 'Available today' },
                        { value: 'tomorrow', label: 'Available tomorrow' },
                        { value: 'weekend', label: 'Weekend availability' }
                      ].map((option) => (
                        <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="availability"
                            value={option.value}
                            checked={filters.availability === option.value}
                            onChange={(e) => setFilters(prev => ({...prev, availability: e.target.value}))}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Insurance Toggle */}
                  <div className="flex items-center justify-between mb-6">
                    <Label htmlFor="insurance-filter" className="text-sm font-medium">
                      Accepts my insurance
                    </Label>
                    <Switch
                      id="insurance-filter"
                      checked={filters.insurance}
                      onCheckedChange={(checked) => setFilters(prev => ({...prev, insurance: checked}))}
                    />
                  </div>

                  <Separator className="my-4" />

                  {/* Consultation Type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Consultation Type</Label>
                    <div className="space-y-2">
                      {[
                        { value: 'all', label: 'In-person & Video' },
                        { value: 'in-person', label: 'In-person only' },
                        { value: 'video', label: 'Video consultation' }
                      ].map((option) => (
                        <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="consultationType"
                            value={option.value}
                            checked={filters.consultationType === option.value}
                            onChange={(e) => setFilters(prev => ({...prev, consultationType: e.target.value}))}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>

            {/* Main Results Section */}
            <div className="flex-1">
              {/* Results Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    {category} in Your Area
                  </h1>
                  <p className="text-muted-foreground">
                    {mockDoctors.length} providers found
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Doctor Cards */}
              <div className={cn(
                "space-y-6",
                viewMode === 'grid' && "grid grid-cols-1 md:grid-cols-2 gap-6 space-y-0"
              )}>
                {mockDoctors.map((doctor) => (
                  <Card 
                    key={doctor.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/doctor/${doctor.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className={cn(
                        "flex gap-4",
                        viewMode === 'grid' && "flex-col"
                      )}>
                        {/* Doctor Image */}
                        <div className={cn(
                          "flex-shrink-0",
                          viewMode === 'grid' ? "w-full" : "w-24 h-24"
                        )}>
                          <img
                            src={doctor.image}
                            alt={doctor.name}
                            className={cn(
                              "rounded-lg object-cover",
                              viewMode === 'grid' ? "w-full h-48" : "w-24 h-24"
                            )}
                          />
                        </div>

                        {/* Doctor Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">
                                {doctor.name}
                              </h3>
                              <p className="text-primary font-medium">{doctor.specialty}</p>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{doctor.rating}</span>
                              <span className="text-muted-foreground text-sm">
                                ({doctor.reviewCount})
                              </span>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {doctor.bio}
                          </p>

                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant="secondary" className="text-xs">
                              <MapPin className="w-3 h-3 mr-1" />
                              {doctor.distance}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {doctor.experience}
                            </Badge>
                            {doctor.availableToday && (
                              <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                                <Clock className="w-3 h-3 mr-1" />
                                Available today
                              </Badge>
                            )}
                            {doctor.acceptsInsurance && (
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
                                // Handle booking - check auth first
                                navigate('/signup');
                              }}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Book Appointment
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/doctor/${doctor.id}`);
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

              {/* No Results */}
              {mockDoctors.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="mb-4">
                      <Users className="w-16 h-16 mx-auto text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No doctors found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your filters or search in a different area.
                    </p>
                    <Button variant="outline" onClick={() => window.location.reload()}>
                      Reset Filters
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CategorySearch;