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

  const displayPractices = practices.map((practice) => {
    const imageUrl = practice.logo_url || 
      `https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=250&fit=crop&auto=format`;
    
    const specialties = practice.name?.includes('Cardiology') ? ['Cardiology'] :
                       practice.name?.includes('Vision') || practice.name?.includes('Eye') ? ['Ophthalmology'] :
                       practice.name?.includes('Dental') || practice.name?.includes('Dentist') ? ['Dentistry'] :
                       practice.name?.includes('Pediatric') ? ['Pediatrics'] :
                       ['General Medicine'];
    
    return {
      id: practice.id,
      photo: imageUrl,
      name: practice.name,
      type: practice.practice_type || "Medical Practice",
      city: practice.city || "Not specified",
      country: practice.country || "Not specified",
      specialties: specialties,
      rating: practice.weighted_rating || practice.average_rating || 0,
      reviewCount: practice.num_reviews || 0,
      description: practice.description || "Professional healthcare facility providing comprehensive medical services."
    };
  });

  const topThree = displayPractices.slice(0, 3);
  const nextThree = displayPractices.slice(3, 6);
  
  const emptyTopSlots = Math.max(0, 3 - topThree.length);
  const emptyBottomSlots = Math.max(0, 3 - nextThree.length);

  const PracticeCard = ({ practice, size }: { practice: any; size: 'large' | 'small' }) => {
    const isLarge = size === 'large';
    
    return (
      <Card 
        className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] cursor-pointer group border-2 border-gray-200 dark:border-slate-700 hover:border-blue-800 dark:hover:border-blue-500 dark:hover:shadow-glow-blue"
      >
        <div className={`${isLarge ? 'aspect-video' : 'h-48'} overflow-hidden relative`}>
          <img
            src={practice.photo}
            alt={practice.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <CardContent className={isLarge ? 'p-6' : 'p-4'}>
          <div className={`space-y-${isLarge ? '3' : '2'}`}>
            <div>
              <h3 
                className={`${isLarge ? 'text-lg' : 'text-base'} font-semibold text-foreground mb-1 cursor-pointer group-hover:text-primary transition-colors line-clamp-1`}
                onClick={() => navigate(`/practices/${practice.id}`)}
              >
                {practice.name}
              </h3>
              <span className={`inline-block ${isLarge ? 'mt-1' : 'mt-0.5'} px-${isLarge ? '3' : '2'} py-1 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-400 text-xs font-semibold rounded-full border border-blue-200 dark:border-blue-800`}>
                {practice.type}
              </span>
            </div>
            
            <div className={`flex items-center gap-1 text-muted-foreground ${isLarge ? 'text-sm' : 'text-xs'}`}>
              <MapPin className={`${isLarge ? 'w-4 h-4' : 'w-3 h-3'} flex-shrink-0`} />
              <span className="truncate">{practice.city}, {practice.country}</span>
            </div>
            
            {practice.rating > 0 ? (
              <StarRating 
                rating={practice.rating} 
                reviewCount={practice.reviewCount}
                size="sm"
              />
            ) : (
              <p className="text-xs text-muted-foreground">No reviews yet</p>
            )}
            
            {isLarge && practice.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {practice.specialties.slice(0, 3).map((specialty, index) => (
                  <span 
                    key={index}
                    className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}
            
            <p className={`text-sm text-muted-foreground ${isLarge ? 'line-clamp-2' : 'line-clamp-1'} ${isLarge ? 'min-h-[2.5rem]' : ''}`}>
              {practice.description}
            </p>
            
            <Button 
              onClick={() => navigate(`/practices/${practice.id}`)}
              variant="outline"
              size={isLarge ? 'sm' : 'sm'}
              className="w-full transition-all duration-300 group/btn"
            >
              <Building2 className="w-4 h-4 mr-2 transition-transform group-hover/btn:scale-110" />
              View Practice
              <ArrowRight className="w-4 h-4 ml-auto opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptySlot = ({ size }: { size: 'large' | 'small' }) => {
    const isLarge = size === 'large';
    
    return (
      <Card className="overflow-hidden border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700">
        <CardContent className={`h-full flex flex-col items-center justify-center text-center ${isLarge ? 'p-8 min-h-[500px]' : 'p-6 min-h-[300px]'}`}>
          <Building2 className={`${isLarge ? 'w-16 h-16' : 'w-12 h-12'} text-gray-400 dark:text-gray-500 mb-${isLarge ? '4' : '3'}`} />
          <h3 className={`${isLarge ? 'text-xl' : 'text-lg'} font-bold text-gray-700 dark:text-gray-300 mb-2`}>
            {isLarge ? 'Featured Practice Spot' : 'Your Practice Here'}
          </h3>
          <p className={`${isLarge ? 'text-base' : 'text-sm'} text-gray-600 dark:text-gray-400 mb-${isLarge ? '6' : '4'}`}>
            {isLarge ? 'This could be your practice' : 'Join our network'}
          </p>
          <Button
            onClick={() => navigate('/register-practice')}
            size={isLarge ? 'default' : 'sm'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLarge ? 'Register Practice' : 'Learn More'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <section className="py-24 bg-muted/30 dark:bg-muted/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Leading Medical Practices</h2>
          <p className="text-lg text-muted-foreground">Trusted healthcare institutions</p>
        </div>
        
        {loading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-video w-full" />
                  <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Top 3 - Large Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 max-w-7xl mx-auto">
              {topThree.map((practice) => (
                <PracticeCard key={practice.id} practice={practice} size="large" />
              ))}
              {[...Array(emptyTopSlots)].map((_, i) => (
                <EmptySlot key={`empty-top-${i}`} size="large" />
              ))}
            </div>
            
            {/* Next 3 (Rank 4-6) - Smaller Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {nextThree.map((practice) => (
                <PracticeCard key={practice.id} practice={practice} size="small" />
              ))}
              {[...Array(emptyBottomSlots)].map((_, i) => (
                <EmptySlot key={`empty-bottom-${i}`} size="small" />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default TopMedicalPracticesSection;
