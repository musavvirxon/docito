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

  // Empty state message when no data
  const emptyStateMessage = "No medical practices available at the moment. Please check back later.";

  // Transform real data to match component interface
  const displayPractices = practices.map((practice) => ({
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
  }));

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
          ) : displayPractices.length === 0 ? (
            // Empty state
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground text-lg">{emptyStateMessage}</p>
            </div>
          ) : (
            displayPractices.map((practice) => (
            <Card 
              key={practice.id} 
              className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.03] cursor-pointer group border-border/50"
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
                    className="w-full transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:shadow-lg group/btn border-primary/20"
                  >
                    <Building2 className="w-4 h-4 mr-2 transition-transform group-hover/btn:scale-110" />
                    View Practice
                    <ArrowRight className="w-4 h-4 ml-auto opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />
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