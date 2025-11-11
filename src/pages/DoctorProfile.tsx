import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  ChevronRight,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useBookingAuth } from "@/hooks/useBookingAuth";

interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  image: string;
  rating: number;
  reviewCount: number;
  bio: string;
  education: string[];
  certifications: string[];
  yearsOfPractice: number;
  languages: string[];
  gender: string;
  practices: {
    name: string;
    address: string;
    phone: string;
    hours: string;
  }[];
  services: {
    name: string;
    price?: string;
    insuranceAccepted: boolean;
  }[];
  reviews: {
    id: string;
    patientName: string;
    rating: number;
    date: string;
    comment: string;
  }[];
  availability: {
    date: string;
    slots: string[];
  }[];
}

const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleBookingClick } = useBookingAuth();
  const { t } = useTranslation(['common', 'doctors']);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  // Mock doctor data - replace with real API call
  const doctor: Doctor = {
    id: id || "1",
    name: "Dr. Sarah Johnson",
    title: "MD, FACC",
    specialty: "Cardiologist",
    image: "/placeholder.svg",
    rating: 4.9,
    reviewCount: 127,
    bio: "Dr. Sarah Johnson is a board-certified cardiologist with over 15 years of experience in cardiovascular medicine. She specializes in preventive cardiology, cardiac imaging, and the treatment of heart disease. Dr. Johnson is committed to providing personalized, compassionate care to each of her patients.",
    education: [
      "MD - Harvard Medical School",
      "Residency - Massachusetts General Hospital",
      "Fellowship - Brigham and Women's Hospital"
    ],
    certifications: [
      "Board Certified in Cardiovascular Disease",
      "Board Certified in Internal Medicine",
      "Fellow of the American College of Cardiology"
    ],
    yearsOfPractice: 15,
    languages: ["English", "Spanish", "French"],
    gender: "Female",
    practices: [
      {
        name: "Manchester Medical Center",
        address: "123 Medical Drive, Manchester, NH 03101",
        phone: "(603) 555-0123",
        hours: "Mon-Fri: 8:00 AM - 5:00 PM"
      },
      {
        name: "Downtown Heart Clinic",
        address: "456 Heart Street, Boston, MA 02101",
        phone: "(617) 555-0456",
        hours: "Mon-Thu: 9:00 AM - 6:00 PM"
      }
    ],
    services: [
      {
        name: "Consultation",
        price: "$250",
        insuranceAccepted: true
      },
      {
        name: "Echocardiogram",
        price: "$450",
        insuranceAccepted: true
      },
      {
        name: "Stress Test",
        price: "$350",
        insuranceAccepted: true
      },
      {
        name: "Cardiac Catheterization",
        insuranceAccepted: true
      }
    ],
    reviews: [
      {
        id: "1",
        patientName: "Anonymous Patient",
        rating: 5,
        date: "2024-01-15",
        comment: "Dr. Johnson is an exceptional cardiologist. She took the time to explain my condition thoroughly and made me feel comfortable throughout the entire process."
      },
      {
        id: "2",
        patientName: "Anonymous Patient",
        rating: 5,
        date: "2024-01-08",
        comment: "Highly professional and knowledgeable. The office staff is also very friendly and efficient."
      },
      {
        id: "3",
        patientName: "Anonymous Patient",
        rating: 4,
        date: "2023-12-20",
        comment: "Good experience overall. Wait time was a bit long but Dr. Johnson was thorough in her examination."
      }
    ],
    availability: [
      {
        date: "2024-01-25",
        slots: ["9:00 AM", "10:30 AM", "2:00 PM", "3:30 PM"]
      },
      {
        date: "2024-01-26",
        slots: ["8:30 AM", "11:00 AM", "1:00 PM"]
      },
      {
        date: "2024-01-27",
        slots: ["9:30 AM", "2:30 PM", "4:00 PM"]
      }
    ]
  };

  const handleBookAppointment = async () => {
    setIsBookingLoading(true);
    
    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    handleBookingClick(id!, doctor.name);
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
                    src={doctor.image}
                    alt={doctor.name}
                    className="w-48 h-48 rounded-lg object-cover mx-auto lg:mx-0"
                  />
                </div>

                {/* Doctor Info */}
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">
                        {doctor.name}
                      </h1>
                      <p className="text-xl text-primary font-medium mb-1">
                        {doctor.specialty}
                      </p>
                      <p className="text-muted-foreground">{doctor.title}</p>
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
                      <Button variant="outline" size="sm">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      {renderStars(doctor.rating)}
                      <span className="font-medium ml-2">{doctor.rating}</span>
                      <span className="text-muted-foreground text-sm">
                        ({doctor.reviewCount} {t('doctors:profile.reviews')})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <Badge variant="secondary">
                      <GraduationCap className="w-3 h-3 mr-1" />
                      {doctor.yearsOfPractice} {t('doctors:profile.yearsExperience')}
                    </Badge>
                    <Badge variant="secondary">
                      <Languages className="w-3 h-3 mr-1" />
                      {doctor.languages.join(', ')}
                    </Badge>
                    <Badge variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      {doctor.gender}
                    </Badge>
                    <Badge variant="default" className="bg-green-100 text-green-700">
                      <Video className="w-3 h-3 mr-1" />
                      {t('doctors:profile.videoConsultations')}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {doctor.bio}
                  </p>

                  {/* Book Appointment Button - Enhanced */}
                  <div className="flex gap-3">
                    <Button 
                      size="lg" 
                      className="flex-1 lg:flex-none bg-primary hover:bg-primary/90 hover:shadow-lg active:scale-95 transition-all duration-200 min-h-[48px]"
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
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="hover:bg-muted active:scale-95 transition-all duration-200 min-h-[48px]"
                    >
                      <Video className="w-5 h-5 mr-2" />
                      {t('doctors:profile.videoCall')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Section */}
          <Tabs defaultValue="about" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="about">{t('doctors:profile.tabs.about')}</TabsTrigger>
              <TabsTrigger value="practice">{t('doctors:profile.tabs.practiceInfo')}</TabsTrigger>
              <TabsTrigger value="services">{t('doctors:profile.tabs.services')}</TabsTrigger>
              <TabsTrigger value="reviews">{t('doctors:profile.tabs.reviews')}</TabsTrigger>
              <TabsTrigger value="availability" id="availability-tab">{t('doctors:profile.tabs.availability')}</TabsTrigger>
            </TabsList>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('doctors:profile.aboutDoctor', { name: doctor.name.split(' ').pop() })}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {doctor.bio}
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <GraduationCap className="w-5 h-5 mr-2" />
                        {t('doctors:profile.education')}
                      </h4>
                      <ul className="space-y-2">
                        {doctor.education.map((edu, index) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            {edu}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Award className="w-5 h-5 mr-2" />
                        {t('doctors:profile.certifications')}
                      </h4>
                      <ul className="space-y-2">
                        {doctor.certifications.map((cert, index) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            {cert}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Practice Info Tab */}
            <TabsContent value="practice" className="space-y-6">
              {doctor.practices.map((practice, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center">
                        <Building2 className="w-5 h-5 mr-2" />
                        {practice.name}
                      </h3>
                      <Button variant="outline" size="sm">
                        <MapPin className="w-4 h-4 mr-2" />
                        {t('doctors:profile.directions')}
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2" />
                        {practice.address}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Phone className="w-4 h-4 mr-2" />
                        {practice.phone}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        {practice.hours}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-6">{t('doctors:profile.servicesPricing')}</h3>
                  
                  <div className="space-y-4">
                    {doctor.services.map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{service.name}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            {service.insuranceAccepted && (
                              <Badge variant="outline" className="text-xs">
                                <CreditCard className="w-3 h-3 mr-1" />
                                {t('doctors:profile.insuranceAccepted')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {service.price && (
                            <div className="font-semibold">{service.price}</div>
                          )}
                          <Button variant="outline" size="sm" className="mt-2">
                            {t('doctors:profile.bookService')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">{t('doctors:profile.patientReviews')}</h3>
                    <div className="flex items-center gap-2">
                      {renderStars(doctor.rating)}
                      <span className="font-medium">{doctor.rating}</span>
                      <span className="text-muted-foreground">
                        ({doctor.reviewCount} {t('doctors:profile.reviews')})
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {doctor.reviews.map((review) => (
                      <div key={review.id}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{review.patientName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {renderStars(review.rating)}
                              <span className="text-sm text-muted-foreground">
                                {new Date(review.date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-muted-foreground">{review.comment}</p>
                        {review.id !== doctor.reviews[doctor.reviews.length - 1].id && (
                          <Separator className="mt-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-6">{t('doctors:profile.bookYourAppointment')}</h3>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Date Selection */}
                    <div>
                      <h4 className="font-medium mb-4">{t('doctors:profile.selectDate')}</h4>
                      <div className="space-y-2">
                        {doctor.availability.map((day) => (
                          <button
                            key={day.date}
                            onClick={() => {
                              setSelectedDate(day.date);
                              setSelectedTime("");
                            }}
                            className={cn(
                              "w-full p-3 border rounded-lg text-left hover:bg-accent transition-colors",
                              selectedDate === day.date && "border-primary bg-primary/10"
                            )}
                          >
                            <div className="font-medium">
                              {new Date(day.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {day.slots.length} {t('doctors:profile.slotsAvailable')}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time Selection */}
                    <div>
                      <h4 className="font-medium mb-4">
                        {selectedDate ? t('doctors:profile.selectTime') : t('doctors:profile.selectDateFirst')}
                      </h4>
                      {selectedDate && (
                        <div className="grid grid-cols-2 gap-2">
                          {doctor.availability
                            .find(day => day.date === selectedDate)
                            ?.slots.map((slot) => (
                              <button
                                key={slot}
                                onClick={() => setSelectedTime(slot)}
                                className={cn(
                                  "p-3 border rounded-lg text-sm hover:bg-accent transition-colors",
                                  selectedTime === slot && "border-primary bg-primary/10"
                                )}
                              >
                                {slot}
                              </button>
                            ))}
                        </div>
                      )}
                      
                      {selectedDate && selectedTime && (
                        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                          <h5 className="font-medium mb-2">{t('doctors:profile.appointmentSummary')}</h5>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric'
                            })} {t('doctors:profile.at')} {selectedTime}
                          </p>
                          <Button 
                            className="w-full mt-4"
                            onClick={handleBookAppointment}
                          >
                            {t('doctors:profile.confirmAppointment')}
                          </Button>
                        </div>
                      )}
                    </div>
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