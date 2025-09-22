import SearchBar from "@/components/patient/SearchBar";
import { useDoctors } from "@/hooks/useDoctors";
import { usePractices } from "@/hooks/usePractices";

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
  degree?: string;
  consultationFee?: number;
  affiliatedPractice?: string;
  practiceType?: string;
  description?: string;
  specialties?: string[];
  doctorCount?: number;
  languages?: string[];
}

interface SearchResultsHeaderProps {
  searchQuery: string;
  onSearch: (results: SearchResult[]) => void;
}

const SearchResultsHeader = ({ searchQuery, onSearch }: SearchResultsHeaderProps) => {
  const { searchDoctors } = useDoctors();
  const { searchPractices } = usePractices();

  const handleSearch = async (results: any[]) => {
    // If SearchBar already provides transformed results, use them
    if (results && results.length > 0) {
      onSearch(results);
      return;
    }

    // Otherwise, perform our own search
    try {
      const [doctorsResults, practicesResults] = await Promise.all([
        searchDoctors(searchQuery),
        searchPractices(searchQuery)
      ]);

      // Transform results to match SearchResult interface
      const transformedDoctors: SearchResult[] = doctorsResults.map(doctor => ({
        id: doctor.id,
        type: 'doctor',
        name: doctor.profiles ? (doctor.profiles as any).full_name || 'Dr. Professional' : `Dr. ${doctor.specialty} Specialist`,
        image: doctor.profiles ? (doctor.profiles as any).avatar_url : undefined,
        specialty: doctor.specialty,
        degree: doctor.license_number || 'MD',
        rating: doctor.weighted_rating || doctor.average_rating || 4.8,
        reviewCount: doctor.num_reviews || 0,
        affiliatedPractice: doctor.practices ? (doctor.practices as any).name : 'Independent Doctor',
        location: doctor.practices ? `${(doctor.practices as any).city || 'City'}, ${(doctor.practices as any).country || 'Country'}` : 'Location',
        consultationFee: doctor.consultation_fee,
        languages: ['English'],
        bio: doctor.bio,
        availability: doctor.accepts_new_patients ? "Available Today" : "Not Available",
        acceptsInsurance: true,
        acceptsNewPatients: doctor.accepts_new_patients,
        distance: "0.5 mi"
      }));

      const transformedPractices: SearchResult[] = practicesResults.map(practice => ({
        id: practice.id,
        type: 'practice',
        name: practice.name,
        image: practice.logo_url,
        practiceType: 'Medical Practice',
        description: practice.description,
        location: `${practice.city || 'City'}, ${practice.country || 'Country'}`,
        specialties: ['General Medicine', 'Family Practice'],
        rating: practice.weighted_rating || practice.average_rating || 4.7,
        reviewCount: practice.num_reviews || 0,
        doctorCount: 5,
        availability: "Open Today",
        acceptsInsurance: true,
        acceptsNewPatients: true,
        distance: "1.0 mi"
      }));

      const combinedResults = [...transformedDoctors, ...transformedPractices];
      onSearch(combinedResults);
    } catch (error) {
      console.error('Search error:', error);
      onSearch([]);
    }
  };

  return (
    <div className="bg-primary/5 border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-xl font-semibold text-foreground mb-3">
          Find the right care for you
        </h1>
        <SearchBar 
          onSearch={handleSearch}
          className="max-w-4xl"
          showResultsInline={true}
          initialQuery={searchQuery}
        />
      </div>
    </div>
  );
};

export default SearchResultsHeader;