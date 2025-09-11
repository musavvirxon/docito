import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, CreditCard } from "lucide-react";
import { useState } from "react";
import SearchResults from "@/components/patient/SearchResults";

const HeroSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationTerm, setLocationTerm] = useState("");
  const [insuranceTerm, setInsuranceTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = () => {
    // Mock search results
    const mockResults = [
      {
        id: "1",
        type: "doctor" as const,
        name: "Dr. Sarah Johnson",
        specialty: "Cardiologist",
        location: "Downtown Medical Center",
        rating: 4.9,
        availability: "Available Today",
        acceptsInsurance: true,
        acceptsNewPatients: true,
        distance: "0.5 mi"
      },
      {
        id: "2", 
        type: "doctor" as const,
        name: "Dr. Michael Chen",
        specialty: "Dentist",
        location: "Smile Dental Clinic",
        rating: 4.8,
        availability: "Available Tomorrow",
        acceptsInsurance: true,
        acceptsNewPatients: true,
        distance: "1.2 mi"
      }
    ];
    setSearchResults(mockResults);
    setShowResults(true);
  };

  const handleDoctorClick = (doctor: any) => {
    // Store doctor info for redirect after signup
    localStorage.setItem('pendingDoctorVisit', JSON.stringify(doctor));
    // Redirect to signup
    window.location.href = '/signup';
  };

  const specialties = [
    { name: "Primary Care", icon: "💝" },
    { name: "Dentist", icon: "🦷" },
    { name: "OB-GYN", icon: "👥" },
    { name: "Dermatologist", icon: "🧴" },
    { name: "Psychiatrist", icon: "🧠" },
    { name: "Eye Doctor", icon: "👁️" },
    { name: "Cardiologist", icon: "❤️" },
    { name: "Neurologist", icon: "🧠" },
    { name: "Orthopedist", icon: "🦴" }
  ];

  return (
    <section className="bg-background py-16 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Need a doc? They are here.
            </h1>
            <p className="text-xl text-muted-foreground">Just a search away!</p>
          </div>
          
          {/* Search Form */}
          <div className="bg-card border border-border rounded-lg shadow-lg mb-8 overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 relative group">
                <Input 
                  placeholder="Specialty or doctor name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-14 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent hover:bg-muted/30 transition-colors"
                />
              </div>
              
              <div className="hidden md:block w-px bg-border"></div>
              
              <div className="flex-1 relative group">
                <Input 
                  placeholder="Location"
                  value={locationTerm}
                  onChange={(e) => setLocationTerm(e.target.value)}
                  className="h-14 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent hover:bg-muted/30 transition-colors"
                />
              </div>
              
              <div className="hidden md:block w-px bg-border"></div>
              
              <div className="flex-1 relative group">
                <Input 
                  placeholder="Insurance"
                  value={insuranceTerm}
                  onChange={(e) => setInsuranceTerm(e.target.value)}
                  className="h-14 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent hover:bg-muted/30 transition-colors"
                />
              </div>
              
              <div className="w-full md:w-auto">
                <Button onClick={handleSearch} className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-none">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>

          {/* Search Results */}
          {showResults && (
            <div className="mb-8">
              <SearchResults
                results={searchResults}
                onBookAppointment={handleDoctorClick}
                onViewPractice={handleDoctorClick}
                onFavorite={() => {}}
              />
            </div>
          )}

          {/* Specialty Squares */}
          {!showResults && (
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4 mb-8">
              {specialties.map((specialty) => (
                <div 
                  key={specialty.name} 
                  className="bg-muted rounded-lg p-4 text-center cursor-pointer hover:bg-accent hover:scale-105 transition-all duration-200 aspect-square flex flex-col items-center justify-center group"
                >
                  <span className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">{specialty.icon}</span>
                  <span className="text-xs font-medium text-foreground group-hover:text-accent-foreground text-center transition-colors duration-200">{specialty.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;