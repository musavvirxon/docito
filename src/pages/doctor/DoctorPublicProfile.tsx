import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
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
  Video,
  Building2,
  Loader2,
  MessageSquare,
  Shield,
  CheckCircle,
  ChevronRight,
  Home,
  Stethoscope,
  Globe,
  BadgeCheck,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import AppointmentBookingPopup from "@/components/booking/AppointmentBookingPopup";

interface DoctorProfileData {
  id: string;
  specialty: string;
  specialty_en?: string;
  specialty_ar?: string;
  specialty_ru?: string;
  specialty_uz?: string;
  bio: string;
  bio_en?: string;
  bio_ar?: string;
  bio_ru?: string;
  bio_uz?: string;
  consultation_fee: number | null;
  verified: boolean;
  user_id: string;
  custom_profile_link: string | null;
  languages: string[] | null;
  years_experience: number | null;
  average_rating: number | null;
  num_reviews: number | null;
  consultation_types: string[] | null;
  accepts_new_patients: boolean | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
    email: string;
    username: string | null;
    city?: string;
    country?: string;
  };
  practices: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
    verified: boolean | null;
  } | null;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function DoctorPublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, i18n } = useTranslation(["common", "doctors"]);
  const isRTL = i18n.language === "ar";

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<DoctorProfileData | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showBookingPopup, setShowBookingPopup] = useState(false);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      if (!slug) return;

      try {
        // Try to fetch by custom link first, then by ID
        const { data, error } = await supabase
          .from("doctors")
          .select(`
            *,
            profiles:user_id (
              full_name,
              avatar_url,
              phone,
              email,
              username
            ),
            practices (
              id,
              name,
              address,
              phone,
              city,
              country,
              verified
            )
          `)
          .or(`id.eq.${slug},custom_profile_link.eq.${slug}`)
          .single();

        if (error) throw error;

        const doctorData = data as any;

        // Check visibility
        const isOwnProfile = user && doctorData?.user_id === user.id;
        if (!doctorData && !isOwnProfile) {
          toast({
            title: t("common:errors.notFound"),
            description: t("doctors:profile.notFoundDescription"),
            variant: "destructive",
          });
          navigate("/find-doctors");
          return;
        }

        setDoctor(doctorData as DoctorProfileData);

        // Fetch services/procedures for this doctor
        if (doctorData?.id) {
          const { data: proceduresData } = await (supabase
            .from("procedures" as any)
            .select("*")
            .eq("doctor_id", doctorData.id)
            .eq("is_active", true)
            .limit(10) as any);

          setServices(proceduresData || []);
        }
      } catch (error) {
        console.error("Error fetching doctor profile:", error);
        toast({
          title: t("common:errors.error"),
          description: t("doctors:profile.loadError"),
          variant: "destructive",
        });
        navigate("/find-doctors");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorProfile();
  }, [slug, navigate, toast, t, user]);

  const handleBookClick = () => {
    if (!user) {
      // Redirect to auth with return path
      const returnPath = encodeURIComponent(window.location.pathname);
      navigate(`/auth?redirect=${returnPath}`);
      return;
    }
    setShowBookingPopup(true);
  };

  const handleMessageClick = () => {
    if (!user) {
      const returnPath = encodeURIComponent(window.location.pathname);
      navigate(`/auth?redirect=${returnPath}`);
      return;
    }
    navigate(`/messages?recipient=${doctor?.user_id}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: t("common:actions.copied"),
        description: t("doctors:profile.linkCopied"),
      });
    } catch {
      toast({
        title: t("common:errors.error"),
        description: t("common:errors.copyFailed"),
        variant: "destructive",
      });
    }
  };

  // Get localized bio
  const getLocalizedBio = () => {
    const lang = i18n.language;
    if (lang === "ar" && doctor?.bio_ar) return doctor.bio_ar;
    if (lang === "ru" && doctor?.bio_ru) return doctor.bio_ru;
    if (lang === "uz" && doctor?.bio_uz) return doctor.bio_uz;
    return doctor?.bio_en || doctor?.bio || "";
  };

  // Get localized specialty
  const getLocalizedSpecialty = () => {
    const lang = i18n.language;
    if (lang === "ar" && doctor?.specialty_ar) return doctor.specialty_ar;
    if (lang === "ru" && doctor?.specialty_ru) return doctor.specialty_ru;
    if (lang === "uz" && doctor?.specialty_uz) return doctor.specialty_uz;
    return doctor?.specialty_en || doctor?.specialty || "";
  };

  if (loading) {
    return (
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <div className="max-w-md mx-auto">
          <Stethoscope className="w-16 h-16 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-2xl font-bold mb-4">{t("doctors:profile.notFound")}</h1>
          <p className="text-muted-foreground mb-6">{t("doctors:profile.notFoundDescription")}</p>
          <Button onClick={() => navigate("/find-doctors")}>
            {t("doctors:actions.browseDoctors")}
          </Button>
        </div>
      </div>
    );
  }

  const canonicalUrl = `https://docito.lovable.app/doctor/${slug}`;
  const doctorName = doctor.profiles.full_name;
  const specialty = getLocalizedSpecialty();
  const location = [doctor.profiles.city, doctor.profiles.country].filter(Boolean).join(", ");

  return (
    <>
      <Helmet>
        <title>{`${doctorName} - ${specialty} | Docito`}</title>
        <meta
          name="description"
          content={`Book an appointment with ${doctorName}, ${specialty} in ${location}. ${doctor.verified ? "Verified provider." : ""} ${doctor.accepts_new_patients ? "Accepting new patients." : ""}`}
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={`${doctorName} - ${specialty} | Docito`} />
        <meta
          property="og:description"
          content={`Book an appointment with ${doctorName}, ${specialty}. ${getLocalizedBio().slice(0, 150)}...`}
        />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={canonicalUrl} />
        {doctor.profiles.avatar_url && (
          <meta property="og:image" content={doctor.profiles.avatar_url} />
        )}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Physician",
            name: doctorName,
            medicalSpecialty: specialty,
            address: {
              "@type": "PostalAddress",
              addressLocality: doctor.profiles.city,
              addressCountry: doctor.profiles.country,
            },
            aggregateRating: doctor.average_rating
              ? {
                  "@type": "AggregateRating",
                  ratingValue: doctor.average_rating,
                  reviewCount: doctor.num_reviews || 0,
                }
              : undefined,
          })}
        </script>
      </Helmet>

      <div className={cn("min-h-screen bg-background", isRTL && "rtl")}>
        <main className="pt-20 pb-16">
          {/* Breadcrumb */}
          <div className="max-w-6xl mx-auto px-4 py-4">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">
                <Home className="w-4 h-4" />
              </Link>
              <ChevronRight className="w-4 h-4" />
              <Link to="/find-doctors" className="hover:text-primary transition-colors">
                {t("common:nav.doctors")}
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground">{doctorName}</span>
            </nav>
          </div>

          {/* Unverified Banner */}
          {!doctor.verified && (
            <motion.div
              {...fadeInUp}
              className="max-w-6xl mx-auto px-4 mb-6"
            >
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      {t("doctors:profile.underReview")}
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-300">
                      {t("doctors:profile.underReviewDescription")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Hero Section */}
                <motion.div {...fadeInUp}>
                  <Card className="overflow-hidden">
                    <CardContent className="p-6 sm:p-8">
                      <div className="flex flex-col sm:flex-row gap-6">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <Avatar className="w-32 h-32 sm:w-40 sm:h-40 ring-4 ring-primary/10">
                            <AvatarImage
                              src={doctor.profiles.avatar_url || undefined}
                              alt={doctorName}
                            />
                            <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                              {doctorName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                                {doctorName}
                              </h1>
                              {doctor.verified && (
                                <BadgeCheck className="w-6 h-6 text-blue-500" />
                              )}
                            </div>
                            <p className="text-lg text-primary font-medium">{specialty}</p>
                          </div>

                          {/* Quick Info */}
                          <div className="flex flex-wrap gap-3">
                            {location && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">{location}</span>
                              </div>
                            )}
                            {doctor.years_experience && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Award className="w-4 h-4" />
                                <span className="text-sm">
                                  {doctor.years_experience} {t("doctors:profile.yearsExp")}
                                </span>
                              </div>
                            )}
                            {doctor.languages && doctor.languages.length > 0 && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Globe className="w-4 h-4" />
                                <span className="text-sm">{doctor.languages.join(", ")}</span>
                              </div>
                            )}
                          </div>

                          {/* Rating */}
                          {doctor.average_rating && doctor.average_rating > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      "w-4 h-4",
                                      i < Math.floor(doctor.average_rating || 0)
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                    )}
                                  />
                                ))}
                              </div>
                              <span className="font-medium">{doctor.average_rating.toFixed(1)}</span>
                              <span className="text-muted-foreground text-sm">
                                ({doctor.num_reviews || 0} {t("doctors:profile.reviews")})
                              </span>
                            </div>
                          )}

                          {/* Badges */}
                          <div className="flex flex-wrap gap-2">
                            {doctor.verified && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {t("doctors:profile.verified")}
                              </Badge>
                            )}
                            {doctor.accepts_new_patients && (
                              <Badge variant="outline" className="border-blue-200 text-blue-600">
                                <Users className="w-3 h-3 mr-1" />
                                {t("doctors:profile.acceptingPatients")}
                              </Badge>
                            )}
                            {doctor.consultation_types?.includes("video") && (
                              <Badge variant="outline" className="border-purple-200 text-purple-600">
                                <Video className="w-3 h-3 mr-1" />
                                {t("doctors:profile.videoConsult")}
                              </Badge>
                            )}
                          </div>

                          {/* Action Buttons - Mobile */}
                          <div className="flex gap-3 lg:hidden">
                            <Button
                              onClick={handleBookClick}
                              className="flex-1"
                              size="lg"
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              {t("doctors:actions.bookAppointment")}
                            </Button>
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={() => setIsSaved(!isSaved)}
                            >
                              <Heart
                                className={cn(
                                  "w-4 h-4",
                                  isSaved && "fill-red-500 text-red-500"
                                )}
                              />
                            </Button>
                            <Button variant="outline" size="lg" onClick={handleShare}>
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* About Section */}
                <motion.div {...fadeInUp} transition={{ delay: 0.1 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-primary" />
                        {t("doctors:profile.about")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {getLocalizedBio() || t("doctors:profile.noBio")}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Services Section */}
                {services.length > 0 && (
                  <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Stethoscope className="w-5 h-5 text-primary" />
                          {t("doctors:profile.services")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {services.map((service) => (
                            <Badge
                              key={service.id}
                              variant="secondary"
                              className="px-3 py-1"
                            >
                              {service.name}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Clinic Affiliation */}
                {doctor.practices && (
                  <motion.div {...fadeInUp} transition={{ delay: 0.3 }}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          {t("doctors:profile.clinicAffiliation")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              {doctor.practices.name}
                              {doctor.practices.verified && (
                                <BadgeCheck className="w-4 h-4 text-blue-500" />
                              )}
                            </h4>
                            {doctor.practices.address && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="w-4 h-4" />
                                {doctor.practices.address}
                              </p>
                            )}
                            {doctor.practices.phone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Phone className="w-4 h-4" />
                                {doctor.practices.phone}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/clinic/${doctor.practices?.id}`)}
                          >
                            {t("doctors:actions.viewClinic")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Trust & Verification Panel */}
                <motion.div {...fadeInUp} transition={{ delay: 0.4 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        {t("doctors:profile.trustSecurity")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {doctor.verified
                                ? t("doctors:profile.licenseVerified")
                                : t("doctors:profile.verificationPending")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("doctors:profile.credentialsChecked")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{t("doctors:profile.secureMessaging")}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("doctors:profile.encryptedComms")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{t("doctors:profile.hipaaGdpr")}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("doctors:profile.dataProtection")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{t("doctors:profile.realReviews")}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("doctors:profile.verifiedPatients")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Reviews Section */}
                <motion.div {...fadeInUp} transition={{ delay: 0.5 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-primary" />
                        {t("doctors:profile.patientReviews")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {doctor.num_reviews && doctor.num_reviews > 0 ? (
                        <div className="text-center py-8">
                          <div className="text-4xl font-bold text-primary mb-2">
                            {doctor.average_rating?.toFixed(1)}
                          </div>
                          <div className="flex justify-center gap-1 mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-5 h-5",
                                  i < Math.floor(doctor.average_rating || 0)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                )}
                              />
                            ))}
                          </div>
                          <p className="text-muted-foreground">
                            {t("doctors:profile.basedOn", { count: doctor.num_reviews })}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>{t("doctors:profile.noReviewsYet")}</p>
                          <p className="text-sm mt-1">{t("doctors:profile.beFirstReview")}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Sidebar - Booking Widget */}
              <div className="space-y-6">
                <motion.div
                  {...fadeInUp}
                  transition={{ delay: 0.2 }}
                  className="lg:sticky lg:top-24"
                >
                  <Card className="border-primary/20">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">{t("doctors:profile.bookAppointment")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Consultation Fee */}
                      {doctor.consultation_fee && (
                        <div className="flex justify-between items-center pb-4 border-b">
                          <span className="text-muted-foreground">
                            {t("doctors:profile.consultationFee")}
                          </span>
                          <span className="text-xl font-bold text-primary">
                            ${doctor.consultation_fee}
                          </span>
                        </div>
                      )}

                      {/* Consultation Types */}
                      {doctor.consultation_types && doctor.consultation_types.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            {t("doctors:profile.availableTypes")}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {doctor.consultation_types.map((type) => (
                              <Badge key={type} variant="outline" className="capitalize">
                                {type === "video" && <Video className="w-3 h-3 mr-1" />}
                                {type === "in_person" && <Building2 className="w-3 h-3 mr-1" />}
                                {type === "home_visit" && <Home className="w-3 h-3 mr-1" />}
                                {type.replace("_", " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Actions */}
                      <div className="space-y-3">
                        <Button
                          onClick={handleBookClick}
                          className="w-full"
                          size="lg"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          {t("doctors:actions.bookAppointment")}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          size="lg"
                          onClick={handleMessageClick}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          {t("doctors:actions.sendMessage")}
                        </Button>
                      </div>

                      <Separator />

                      {/* Quick Actions */}
                      <div className="flex justify-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsSaved(!isSaved)}
                          className="flex-col h-auto py-2"
                        >
                          <Heart
                            className={cn(
                              "w-5 h-5 mb-1",
                              isSaved && "fill-red-500 text-red-500"
                            )}
                          />
                          <span className="text-xs">{t("common:actions.save")}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleShare}
                          className="flex-col h-auto py-2"
                        >
                          <Share2 className="w-5 h-5 mb-1" />
                          <span className="text-xs">{t("common:actions.share")}</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contact Card */}
                  <Card className="mt-6">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {t("doctors:profile.contactInfo")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{doctor.profiles.email}</span>
                      </div>
                      {doctor.profiles.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{doctor.profiles.phone}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        </main>

        {/* Booking Popup */}
        {showBookingPopup && doctor && (
          <AppointmentBookingPopup
            open={showBookingPopup}
            onOpenChange={setShowBookingPopup}
            entityId={doctor.practices?.id || doctor.id}
            entityName={doctor.practices?.name || doctorName}
            providerId={doctor.id}
            providerName={doctorName}
          />
        )}
      </div>
    </>
  );
}
