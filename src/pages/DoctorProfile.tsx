import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, 
  MapPin, 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  GraduationCap,
  Award,
  Languages,
  Users,
  Heart,
  Share2,
  CreditCard,
  Video,
  Building2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useBookingAuth } from "@/hooks/useBookingAuth";
import { supabase } from "@/integrations/supabase/client";

interface DoctorData {
  id: string;
  specialty: string;
  bio: string;
  consultation_fee: number | null;
  verified: boolean;
  user_id: string;
  custom_profile_link: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
    email: string;
    username: string | null;
    profile_visibility: string;
  };
  practices: {
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
}

const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleBookingClick } = useBookingAuth();
  const { t } = useTranslation(['common', 'doctors']);
  const [isSaved, setIsSaved] = useState(false);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<DoctorData | null>(null);

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      if (!id) return;

      try {
        // Try to fetch by custom link first, then by ID
        const { data, error } = await supabase
          .from('doctors')
          .select(`
            *,
            profiles:user_id (
              full_name,
              avatar_url,
              phone,
              email,
              username,
              profile_visibility
            ),
            practices (
              name,
              address,
              phone
            )
          `)
          .or(`id.eq.${id},custom_profile_link.eq.${id}`)
          .eq('verified', true)
          .single();

        if (error) throw error;

        // Check if profile is private and accessed via direct link
        if (data.profiles?.profile_visibility === 'private' && !data.custom_profile_link) {
          toast({
            title: "Profile Not Found",
            description: "This profile is private or doesn't exist.",
            variant: "destructive"
          });
          navigate('/doctors');
          return;
        }

        setDoctor(data as DoctorData);
      } catch (error) {
        console.error('Error fetching doctor profile:', error);
        toast({
          title: "Error",
          description: "Could not load doctor profile.",
          variant: "destructive"
        });
        navigate('/doctors');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorProfile();
  }, [id, navigate, toast]);

  const handleBookAppointment = async () => {
    if (!doctor) return;
    
    setIsBookingLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    handleBookingClick(doctor.id, doctor.profiles.full_name);
    setIsBookingLoading(false);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "w-4 h-4",
          i < Math.floor(rating) 
            ? "fill-yellow-400 text-yellow-400" 
            : "text-gray-300"
        )}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh] pt-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-24">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Doctor Not Found</h1>
            <Button onClick={() => navigate('/doctors')}>
              Browse Doctors
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          <BackButton />
          
          {/* Top Section */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Doctor Image */}
                <div className="flex-shrink-0">
                  <img
                    src={doctor.profiles.avatar_url || "/placeholder.svg"}
                    alt={doctor.profiles.full_name}
                    className="w-48 h-48 rounded-lg object-cover mx-auto lg:mx-0"
                  />
                </div>

                {/* Doctor Info */}
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">
                        {doctor.profiles.full_name}
                      </h1>
                      <p className="text-xl text-primary font-medium mb-1">
                        {doctor.specialty}
                      </p>
                      {doctor.verified && (
                        <Badge variant="default" className="bg-green-100 text-green-700">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSaved(!isSaved)}
                      >
                        <Heart className={cn("w-4 h-4 mr-2", isSaved && "fill-red-500 text-red-500")} />
                        {isSaved ? t('doctors:profile.saved') : t('doctors:profile.save')}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const url = window.location.href;
                          navigator.clipboard.writeText(url);
                          toast({
                            title: "Link Copied",
                            description: "Profile link copied to clipboard!"
                          });
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {doctor.bio && (
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {doctor.bio}
                    </p>
                  )}

                  {/* Book Appointment Button */}
                  <div className="flex gap-3">
                    <Button 
                      size="lg" 
                      className="flex-1 lg:flex-none bg-primary hover:bg-primary/90"
                      onClick={handleBookAppointment}
                      disabled={isBookingLoading}
                    >
                      {isBookingLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          {t('doctors:profile.booking')}
                        </>
                      ) : (
                        <>
                          <Calendar className="w-5 h-5 mr-2" />
                          {t('doctors:profile.bookAppointment')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Section */}
          <Tabs defaultValue="about" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="practice">Practice Info</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">About Dr. {doctor.profiles.full_name.split(' ').pop()}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {doctor.bio}
                  </p>
                  
                  {doctor.consultation_fee && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Consultation Fee</h4>
                      <p className="text-lg text-primary font-medium">${doctor.consultation_fee}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Practice Info Tab */}
            <TabsContent value="practice" className="space-y-6">
              {doctor.practices ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center">
                        <Building2 className="w-5 h-5 mr-2" />
                        {doctor.practices.name}
                      </h3>
                    </div>
                    
                    <div className="space-y-3">
                      {doctor.practices.address && (
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-2" />
                          {doctor.practices.address}
                        </div>
                      )}
                      {doctor.practices.phone && (
                        <div className="flex items-center text-muted-foreground">
                          <Phone className="w-4 h-4 mr-2" />
                          {doctor.practices.phone}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground">Practice information not available.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="w-4 h-4 mr-2" />
                      {doctor.profiles.email}
                    </div>
                    {doctor.profiles.phone && (
                      <div className="flex items-center text-muted-foreground">
                        <Phone className="w-4 h-4 mr-2" />
                        {doctor.profiles.phone}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default DoctorProfile;
