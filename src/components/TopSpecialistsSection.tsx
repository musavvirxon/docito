import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { Calendar, MapPin, UserPlus } from "lucide-react";
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

  // Transform real data to match component interface
  const displaySpecialists = specialists.map((doctor) => {
    const avatarUrl = doctor.profiles?.avatar_url || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.specialty)}&background=random&size=150`;
    
    const fullName = doctor.profiles?.full_name || `${doctor.specialty} Specialist`;
    const nameParts = fullName.split(' ');
    
    return {
      id: doctor.id,
      photo: avatarUrl,
      firstName: nameParts[0] || doctor.specialty,
      lastName: nameParts.slice(1).join(' ') || "Specialist",
      specialty: doctor.specialty,
      degree: "MD",
      country: doctor.practices?.country || "Not specified",
      city: doctor.practices?.city || "Not specified",
      rating: doctor.weighted_rating || doctor.average_rating || 0,
      reviewCount: doctor.num_reviews || 0,
      biography: doctor.bio || "Experienced medical professional dedicated to providing quality healthcare."
    };
  });

  // Calculate empty slots (6 total spots)
  const emptySlots = Math.max(0, 6 - displaySpecialists.length);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-foreground mb-12 text-center">Featured Specialists</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
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
            <>
              {displaySpecialists.map((specialist) => (
                <Card 
                  key={specialist.id} 
                  className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.03] cursor-pointer group border-2 border-gray-200 dark:border-slate-700 hover:border-blue-800 dark:hover:border-blue-500"
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
                          title={`Dr. ${specialist.firstName} ${specialist.lastName}`}
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
                    
                    {specialist.rating > 0 ? (
                      <div className="mb-3">
                        <StarRating 
                          rating={specialist.rating} 
                          reviewCount={specialist.reviewCount}
                          size="sm"
                        />
                      </div>
                    ) : (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground">No reviews yet</p>
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">
                      {specialist.biography}
                    </p>
                    
                    <Button 
                      onClick={() => navigate(`/doctors/${specialist.id}`)}
                      size="sm" 
                      className="w-full transition-all duration-300 hover:shadow-lg group-hover:scale-105"
                    >
                      <Calendar className="w-4 h-4 mr-2 transition-transform group-hover:rotate-12" />
                      Book Appointment
                    </Button>
                  </CardContent>
                </Card>
              ))}
              
              {/* Empty Slots - Featured Doctor Opportunities */}
              {[...Array(emptySlots)].map((_, i) => (
                <Card
                  key={`empty-${i}`}
                  className="overflow-hidden border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700"
                >
                  <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center min-h-[380px]">
                    <UserPlus className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Featured Specialist Spot
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                      This could be your profile. Join our network of top medical professionals.
                    </p>
                    <Button
                      onClick={() => navigate('/doctor-signup')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Join as Doctor
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default TopSpecialistsSection;