import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { MapPin, Building2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { practiceApi } from "@/lib/api/supabase-api";
import { Skeleton } from "@/components/ui/skeleton";

const TopMedicalPracticesSection = () => {
  const navigate = useNavigate();
  const [practices, setPractices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopPractices = async () => {
      setLoading(true);
      const result = await practiceApi.fetchTopPracticesByCountry(6);
      if ('success' in result && result.success) {
        setPractices(result.data);
      }
      setLoading(false);
    };
    
    fetchTopPractices();
  }, []);

  // Fallback practices if no real data available
  const fallbackPractices = [
    {
      id: 1,
      photo: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=250&fit=crop",
      name: "Mount Sinai Hospital",
      type: "Hospital",
      city: "New York",
      country: "United States",
      specialties: ["Cardiology", "Neurology", "Oncology"],
      rating: 4.8,
      reviewCount: 142,
      description: "Leading academic medical center providing comprehensive care with state-of-the-art facilities."
    },
    {
      id: 2,
      photo: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=250&fit=crop",
      name: "Beverly Hills Medical",
      type: "Private Practice",
      city: "Los Angeles",
      country: "United States",
      specialties: ["Plastic Surgery", "Dermatology"],
      rating: 4.9,
      reviewCount: 98,
      description: "Exclusive private medical practice offering personalized healthcare services with luxury amenities."
    },
    {
      id: 3,
      photo: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=250&fit=crop",
      name: "Toronto General",
      type: "Hospital",
      city: "Toronto",
      country: "Canada",
      specialties: ["Transplant", "Cardiac Care", "ICU"],
      rating: 4.7,
      reviewCount: 156,
      description: "Canada's premier teaching hospital and research institute known for breakthrough innovations."
    },
    {
      id: 4,
      photo: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=250&fit=crop",
      name: "Royal London Hospital",
      type: "Hospital",
      city: "London",
      country: "United Kingdom",
      specialties: ["Emergency", "Surgery", "Pediatrics"],
      rating: 4.6,
      reviewCount: 189,
      description: "Historic hospital providing comprehensive emergency and specialized medical services."
    },
    {
      id: 5,
      photo: "https://images.unsplash.com/photo-1512678080530-7760d81faba6?w=400&h=250&fit=crop",
      name: "Sydney Medical Center",
      type: "Medical Center",
      city: "Sydney",
      country: "Australia",
      specialties: ["General Medicine", "Diagnostics"],
      rating: 4.8,
      reviewCount: 124,
      description: "Modern medical facility with advanced diagnostic equipment and experienced specialists."
    },
    {
      id: 6,
      photo: "https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?w=400&h=250&fit=crop",
      name: "Tokyo Health Clinic",
      type: "Clinic",
      city: "Tokyo",
      country: "Japan",
      specialties: ["Family Medicine", "Preventive Care"],
      rating: 4.9,
      reviewCount: 167,
      description: "Comprehensive health clinic focused on preventive care and family wellness."
    }
  ];

  // Transform real data to match component interface
  const displayPractices = practices.length > 0 
    ? practices.map((practice) => ({
        id: practice.id,
        photo: practice.logo_url || "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=250&fit=crop",
        name: practice.name,
        type: "Medical Practice",
        city: practice.city || "City",
        country: practice.country || "Country",
        specialties: ["General Medicine"],
        rating: practice.weighted_rating || practice.average_rating || 4.7,
        reviewCount: practice.num_reviews || 0,
        description: practice.description || "Professional healthcare facility providing comprehensive medical services."
      }))
    : fallbackPractices;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-foreground mb-12 text-center">Top Medical Practices</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            displayPractices.map((practice) => (
            <Card 
              key={practice.id} 
              className="overflow-hidden transition-all duration-200 hover:shadow-xl hover:scale-[1.02] cursor-pointer group"
            >
              <div className="aspect-video overflow-hidden relative">
                <img
                  src={practice.photo}
                  alt={practice.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div>
                    <h3 
                      className="text-lg font-semibold text-foreground mb-1 cursor-pointer group-hover:text-primary transition-colors line-clamp-1"
                      onClick={() => navigate(`/practices/${practice.id}`)}
                    >
                      {practice.name}
                    </h3>
                    <p className="text-sm font-medium text-primary/80">{practice.type}</p>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{practice.city}, {practice.country}</span>
                    </div>
                  </div>
                  
                  <StarRating 
                    rating={practice.rating} 
                    reviewCount={practice.reviewCount}
                    size="sm"
                  />
                  
                  <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                    {practice.specialties.slice(0, 2).map((specialty, index) => (
                      <span 
                        key={index}
                        className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium"
                      >
                        {specialty}
                      </span>
                    ))}
                    {practice.specialties.length > 2 && (
                      <span className="text-xs text-muted-foreground px-2 py-1 font-medium">
                        +{practice.specialties.length - 2}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {practice.description}
                  </p>
                  
                  <Button 
                    onClick={() => navigate(`/practices/${practice.id}`)}
                    variant="outline"
                    size="sm" 
                    className="w-full transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-md group/btn"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    View Practice
                    <ArrowRight className="w-4 h-4 ml-auto opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default TopMedicalPracticesSection;