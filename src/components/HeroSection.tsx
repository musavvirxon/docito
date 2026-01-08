import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, CreditCard } from "lucide-react";
import { useState } from "react";
import SearchResults from "@/components/patient/SearchResults";
import { useBookingAuth } from "@/hooks/useBookingAuth";
import { useDoctors } from "@/hooks/useDoctors";
import { usePractices } from "@/hooks/usePractices";

const HeroSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationTerm, setLocationTerm] = useState("");
  const [insuranceTerm, setInsuranceTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const { handleBookingClick } = useBookingAuth();
  const { searchDoctors } = useDoctors();
  const { searchPractices } = usePractices();

  const handleSearch = async () => {
    if (!searchTerm.trim() && !locationTerm.trim()) {
      return;
    }

    setSearching(true);
    try {
      // Search both doctors and practices
      const [doctorsResults, practicesResults] = await Promise.all([
        searchDoctors(searchTerm, locationTerm),
        searchPractices(searchTerm, locationTerm)
      ]);

      // Transform and combine results
      const transformedDoctors = doctorsResults.map(doctor => ({
        id: doctor.id,
        type: "doctor" as const,
        name: doctor.profiles ? (doctor.profiles as any).full_name || "Doctor" : "Doctor",
        image: doctor.profiles ? (doctor.profiles as any).avatar_url : undefined,
        specialty: doctor.specialty,
        degree: doctor.license_number ? `License: ${doctor.license_number}` : undefined,
        rating: doctor.weighted_rating || doctor.average_rating || 4.8,
        reviewCount: doctor.num_reviews || 0,
        affiliatedPractice: doctor.practices ? (doctor.practices as any).name : "Independent Doctor",
        location: doctor.practices ? `${(doctor.practices as any).city || "City"}, ${(doctor.practices as any).country || "Country"}` : "Location",
        consultationFee: doctor.consultation_fee,
        languages: ["English"], // Default language
        bio: doctor.bio,
        availability: "Available Today",
        acceptsInsurance: true,
        acceptsNewPatients: doctor.accepts_new_patients,
        distance: "0.5 mi"
      }));

      const transformedPractices = practicesResults.map(practice => ({
        id: practice.id,
        type: "practice" as const,
        name: practice.name,
        image: practice.logo_url,
        practiceType: "Medical Practice",
        description: practice.description,
        location: `${practice.city || "City"}, ${practice.country || "Country"}`,
        specialties: ["General Medicine", "Family Practice"], // Default specialties
        rating: practice.weighted_rating || practice.average_rating || 4.7,
        reviewCount: practice.num_reviews || 0,
        doctorCount: 5, // Default doctor count
        availability: "Open Today",
        acceptsInsurance: true,
        acceptsNewPatients: true,
        distance: "1.0 mi"
      }));

      const combinedResults = [...transformedDoctors, ...transformedPractices];
      setSearchResults(combinedResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      // Show empty results instead of mock data
      setSearchResults([]);
      setShowResults(true);
    } finally {
      setSearching(false);
    }
  };

  const handleDoctorClick = (doctor: any) => {
    // Use proper booking authentication flow
    handleBookingClick(doctor.id, doctor.name);
  };

  const specialties = [
    { name: "Primary Care", icon: "💝" },
    { name: "Dentist", icon: "🦷" },
    { name: "OB-GYN", icon: "👥" },
    { name: "Dermatologist", icon: "🧴" },
    { name: "Psychiatrist", icon: "🧠" },
    { name: "Ophthalmologist", icon: "👁️" },
    { name: "Cardiologist", icon: "❤️" },
    { name: "Neurologist", icon: "🧠" },
    { name: "Orthopedist", icon: "🦴" }
  ];

  const handleSpecialtyClick = async (specialtyName: string) => {
    setSearchTerm(specialtyName);
    
    // Auto-trigger search after setting the specialty
    setSearching(true);
    try {
      // Search both doctors and practices with the specialty
      const [doctorsResults, practicesResults] = await Promise.all([
        searchDoctors(specialtyName, locationTerm),
        searchPractices(specialtyName, locationTerm)
      ]);

      // Transform and combine results
      const transformedDoctors = doctorsResults.map(doctor => ({
        id: doctor.id,
        type: "doctor" as const,
        name: doctor.profiles ? (doctor.profiles as any).full_name || "Doctor" : "Doctor",
        image: doctor.profiles ? (doctor.profiles as any).avatar_url : undefined,
        specialty: doctor.specialty,
        degree: doctor.license_number ? `License: ${doctor.license_number}` : undefined,
        rating: doctor.weighted_rating || doctor.average_rating || 4.8,
        reviewCount: doctor.num_reviews || 0,
        affiliatedPractice: doctor.practices ? (doctor.practices as any).name : "Independent Doctor",
        location: doctor.practices ? `${(doctor.practices as any).city || "City"}, ${(doctor.practices as any).country || "Country"}` : "Location",
        consultationFee: doctor.consultation_fee,
        languages: ["English"], // Default language
        bio: doctor.bio,
        availability: "Available Today",
        acceptsInsurance: true,
        acceptsNewPatients: doctor.accepts_new_patients,
        distance: "0.5 mi"
      }));

      const transformedPractices = practicesResults.map(practice => ({
        id: practice.id,
        type: "practice" as const,
        name: practice.name,
        image: practice.logo_url,
        practiceType: "Medical Practice",
        description: practice.description,
        location: `${practice.city || "City"}, ${practice.country || "Country"}`,
        specialties: ["General Medicine", "Family Practice"], // Default specialties
        rating: practice.weighted_rating || practice.average_rating || 4.7,
        reviewCount: practice.num_reviews || 0,
        doctorCount: 5, // Default doctor count
        availability: "Open Today",
        acceptsInsurance: true,
        acceptsNewPatients: true,
        distance: "1.0 mi"
      }));

      const combinedResults = [...transformedDoctors, ...transformedPractices];
      setSearchResults(combinedResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      // Show empty results instead of mock data
      setSearchResults([]);
      setShowResults(true);
    } finally {
      setSearching(false);
    }
  };

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
              <Button onClick={handleSearch} className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-none" disabled={searching}>
                <Search className="w-4 h-4 mr-2" />
                {searching ? "Searching..." : "Search"}
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
                  onClick={() => handleSpecialtyClick(specialty.name)}
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