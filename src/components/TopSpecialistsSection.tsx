import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { Calendar, MapPin } from "lucide-react";
import { useBookingAuth } from "@/hooks/useBookingAuth";
import { useEffect, useState } from "react";
import { doctorApi } from "@/lib/api/supabase-api";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const TopSpecialistsSection = () => {
  const { handleBookingClick } = useBookingAuth();
  const navigate = useNavigate();
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopDoctors = async () => {
      setLoading(true);
      const result = await doctorApi.fetchTopDoctorsBySpecialty(6);
      if ('success' in result && result.success) {
        setSpecialists(result.data);
      }
      setLoading(false);
    };
    
    fetchTopDoctors();
  }, []);

  // Fallback to sample data if no real data available
  const fallbackSpecialists = [
    {
      id: 1,
      photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
      firstName: "Sarah",
      lastName: "Johnson",
      specialty: "Cardiologist",
      degree: "MD, PhD",
      country: "United States",
      city: "New York",
      rating: 4.9,
      reviewCount: 87,
      biography: "Dr. Johnson is a board-certified cardiologist with over 15 years of experience in treating cardiovascular diseases."
    },
    {
      id: 2,
      photo: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face",
      firstName: "Michael",
      lastName: "Chen",
      specialty: "Neurologist",
      degree: "MD",
      country: "Canada",
      city: "Toronto",
      rating: 4.8,
      reviewCount: 65,
      biography: "Dr. Chen specializes in neurological disorders with extensive experience in treating epilepsy and Parkinson's disease."
    },
    {
      id: 3,
      photo: "https://images.unsplash.com/photo-1594824388597-250d30062d0d?w=150&h=150&fit=crop&crop=face",
      firstName: "Emily",
      lastName: "Rodriguez",
      specialty: "Dermatologist",
      degree: "MD, FAAD",
      country: "United States",
      city: "Los Angeles",
      rating: 4.9,
      reviewCount: 92,
      biography: "Dr. Rodriguez is a leading dermatologist specializing in cosmetic and medical dermatology."
    },
    {
      id: 4,
      photo: "https://images.unsplash.com/photo-1628260412297-a3377e45006f?w=150&h=150&fit=crop&crop=face",
      firstName: "David",
      lastName: "Thompson",
      specialty: "Orthopedist",
      degree: "MD, MS",
      country: "United Kingdom",
      city: "London",
      rating: 4.7,
      reviewCount: 58,
      biography: "Dr. Thompson is an orthopedic surgeon with expertise in joint replacement and sports medicine."
    },
    {
      id: 5,
      photo: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=150&h=150&fit=crop&crop=face",
      firstName: "Lisa",
      lastName: "Wang",
      specialty: "Pediatrician",
      degree: "MD, MPH",
      country: "Australia",
      city: "Sydney",
      rating: 4.8,
      reviewCount: 74,
      biography: "Dr. Wang is a dedicated pediatrician with a focus on child development and preventive care."
    },
    {
      id: 6,
      photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&h=150&fit=crop&crop=face",
      firstName: "James",
      lastName: "Mitchell",
      specialty: "Psychiatrist",
      degree: "MD, PhD",
      country: "United States",
      city: "Chicago",
      rating: 4.9,
      reviewCount: 81,
      biography: "Dr. Mitchell specializes in adult psychiatry with extensive experience in treating anxiety and depression."
    }
  ];

  // Transform real data to match component interface
  const displaySpecialists = specialists.length > 0 
    ? specialists.map((doctor) => ({
        id: doctor.id,
        photo: doctor.profiles?.avatar_url || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
        firstName: doctor.profiles?.full_name?.split(' ')[0] || "Doctor",
        lastName: doctor.profiles?.full_name?.split(' ').slice(1).join(' ') || "",
        specialty: doctor.specialty,
        degree: "MD",
        country: doctor.practices?.country || "United States",
        city: doctor.practices?.city || "City",
        rating: doctor.weighted_rating || doctor.average_rating || 4.8,
        reviewCount: doctor.num_reviews || 0,
        biography: doctor.bio || "Experienced medical professional dedicated to providing quality healthcare."
      }))
    : fallbackSpecialists;

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-foreground mb-12 text-center">Top Specialists</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4 mb-4">
                    <Skeleton className="w-20 h-20 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            displaySpecialists.map((specialist) => (
            <Card 
              key={specialist.id} 
              className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer group"
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4 mb-4">
                  <img
                    src={specialist.photo}
                    alt={`Dr. ${specialist.firstName} ${specialist.lastName}`}
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-primary/10 transition-all group-hover:ring-primary/30"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="text-lg font-semibold text-foreground mb-1 cursor-pointer hover:text-primary transition-colors truncate"
                      onClick={() => navigate(`/doctors/${specialist.id}`)}
                    >
                      Dr. {specialist.firstName} {specialist.lastName}
                    </h3>
                    <p 
                      className="text-primary font-medium cursor-pointer hover:underline truncate"
                      onClick={() => navigate(`/doctors/${specialist.id}`)}
                    >
                      {specialist.specialty}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{specialist.degree}</p>
                    <div className="flex items-center mt-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{specialist.city}, {specialist.country}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <StarRating 
                    rating={specialist.rating} 
                    reviewCount={specialist.reviewCount}
                    size="sm"
                  />
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">
                  {specialist.biography}
                </p>
                
                <Button 
                  onClick={() => handleBookingClick(specialist.id.toString(), `Dr. ${specialist.firstName} ${specialist.lastName}`)}
                  size="sm" 
                  className="w-full transition-all hover:shadow-md"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
              </CardContent>
            </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default TopSpecialistsSection;