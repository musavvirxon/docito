// File: src/pages/doctor/DoctorPublicProfile.tsx
import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Home, ChevronRight, Clock, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AppointmentBookingPopup from "@/components/booking/AppointmentBookingPopup";

import PremiumHeroSection from "@/components/doctor/public/PremiumHeroSection";

const AboutSection = lazy(() => import("@/components/doctor/public/AboutSection"));
const AvailabilityPreview = lazy(() => import("@/components/doctor/public/AvailabilityPreview"));
const ClinicAffiliationsSection = lazy(() => import("@/components/doctor/public/ClinicAffiliationsSection"));
const ReviewsSection = lazy(() => import("@/components/doctor/public/ReviewsSection"));
const TrustSection = lazy(() => import("@/components/doctor/public/TrustSection"));

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
    profile_visibility?: string | null;
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

const SectionFallback = () => (
  <div className="py-12 px-4">
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-32 w-full rounded-2xl bg-muted" />
    </div>
  </div>
);

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
        setLoading(true);

        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        // 1) Prefer username route for PUBLIC profiles only
        let data: any = null;

        const { data: byUsername, error: usernameErr } = await supabase
          .from("doctors")
          .select(
            `
            *,
            profiles:user_id (full_name, avatar_url, phone, email, username, profile_visibility),
            practices (id, name, address, phone, city, country, verified)
          `
          )
          .eq("profiles.username", slug)
          .eq("profiles.profile_visibility", "public")
          .maybeSingle();

        if (!usernameErr && byUsername) {
          data = byUsername;
        } else {
          // 2) Fallback: id or custom_profile_link (link-only/private allowed)
          const { data: byIdOrLink, error } = await supabase
            .from("doctors")
            .select(
              `
              *,
              profiles:user_id (full_name, avatar_url, phone, email, username, profile_visibility),
              practices (id, name, address, phone, city, country, verified)
            `
            )
            .or(`id.eq.${slug},custom_profile_link.eq.${slug}`)
            .maybeSingle();

          if (error) throw error;
          data = byIdOrLink;
        }

        if (!data) {
          throw new Error("Doctor not found");
        }

        const isOwnProfile = !!currentUser && data.user_id === currentUser.id;

        // Block private profiles unless link-only (custom_profile_link) or own profile
        if (
          data.profiles?.profile_visibility === "private" &&
          !data.custom_profile_link &&
          !isOwnProfile
        ) {
          toast({
            title: t("doctors:profile.notFound"),
            description: t("doctors:profile.notFoundDescription"),
            variant: "destructive",
          });
          navigate("/find-doctors");
          return;
        }

        setDoctor(data as DoctorProfileData);

        if (data?.id) {
          const { data: proceduresData } = await (supabase
            .from("procedures" as any)
            .select("*")
            .eq("doctor_id", data.id)
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
  }, [slug, navigate, toast, t]);

  const handleBookClick = () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setShowBookingPopup(true);
  };

  const handleMessageClick = () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    navigate(`/messages?recipient=${doctor?.user_id}`);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: t("common:actions.copied"),
        description: t("doctors:profile.linkCopied"),
      });
    } catch {
      toast({ title: t("common:errors.error"), variant: "destructive" });
    }
  };

  const getLocalizedBio = () => {
    const lang = i18n.language;
    if (lang === "ar" && doctor?.bio_ar) return doctor.bio_ar;
    if (lang === "ru" && doctor?.bio_ru) return doctor.bio_ru;
    if (lang === "uz" && doctor?.bio_uz) return doctor.bio_uz;
    return doctor?.bio_en || doctor?.bio || "";
  };

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
              <div className="h-64 w-full rounded-2xl bg-muted" />
              <div className="h-48 w-full rounded-2xl bg-muted" />
            </div>
            <div className="h-80 w-full rounded-2xl bg-muted" />
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
          <h1 className="text-2xl font-bold mb-4">
            {t("doctors:profile.notFound")}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t("doctors:profile.notFoundDescription")}
          </p>
          <Button onClick={() => navigate("/find-doctors")}>
            {t("doctors:actions.browseDoctors")}
          </Button>
        </div>
      </div>
    );
  }

  const doctorName = doctor.profiles.full_name;
  const specialty = getLocalizedSpecialty();
  const location = [doctor.practices?.city, doctor.practices?.country]
    .filter(Boolean)
    .join(", ");

  const canonicalSlug =
    doctor.profiles.username && doctor.profiles.profile_visibility === "public"
      ? doctor.profiles.username
      : slug;

  const canonicalUrl = `https://docito.lovable.app/doctor/${canonicalSlug}`;

  return (
    <>
      <Helmet>
        <title>{`Dr. ${doctorName} — ${specialty}${
          location ? ` in ${location}` : ""
        } | Docito`}</title>
        <meta
          name="description"
          content={`Book an appointment with Dr. ${doctorName}, verified ${specialty}${
            location ? ` in ${location}` : ""
          }. Instant booking, secure records, referrals, and follow-ups on Docito.`}
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta
          property="og:title"
          content={`Dr. ${doctorName} — ${specialty} | Docito`}
        />
        <meta
          property="og:description"
          content={`Book an appointment with Dr. ${doctorName}, ${specialty}.`}
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
            name: `Dr. ${doctorName}`,
            medicalSpecialty: specialty,
            address: {
              "@type": "PostalAddress",
              addressLocality: doctor.practices?.city,
              addressCountry: doctor.practices?.country,
            },
            aggregateRating: doctor.average_rating
              ? {
                  "@type": "AggregateRating",
                  ratingValue: doctor.average_rating,
                  reviewCount: doctor.num_reviews || 0,
                }
              : undefined,
            worksFor: doctor.practices
              ? { "@type": "MedicalOrganization", name: doctor.practices.name }
              : undefined,
          })}
        </script>
      </Helmet>

      <div className={cn("min-h-screen bg-background", isRTL && "rtl")}>
        {/* Breadcrumb */}
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">
              <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link
              to="/find-doctors"
              className="hover:text-primary transition-colors"
            >
              {t("common:nav.doctors")}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">{doctorName}</span>
          </nav>
        </div>

        {/* Unverified Banner (visible for doctors viewing own profile) */}
        {!doctor.verified && (
          <div className="max-w-6xl mx-auto px-4 mt-4">
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {t("doctors:profile.underReview")}
                  </p>
                  <p className="text-sm text-amber-600">
                    {t("doctors:profile.underReviewDescription")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section A: Hero (no animation / no illustration) */}
        <PremiumHeroSection
          doctor={doctor}
          localizedSpecialty={specialty}
          location={location}
          onBookClick={handleBookClick}
          onMessageClick={handleMessageClick}
          onShare={handleShare}
          isSaved={isSaved}
          onToggleSave={() => setIsSaved(!isSaved)}
        />

        {/* Lazy-loaded sections */}
        <Suspense fallback={<SectionFallback />}>
          <AboutSection
            bio={getLocalizedBio()}
            yearsExperience={doctor.years_experience}
            services={services}
            consultationTypes={doctor.consultation_types}
          />

          <div className="max-w-4xl mx-auto px-4 pb-12">
            <AvailabilityPreview
              doctorId={doctor.id}
              onOpenBooking={handleBookClick}
            />
          </div>

          <ClinicAffiliationsSection practice={doctor.practices} />
          <ReviewsSection
            averageRating={doctor.average_rating}
            numReviews={doctor.num_reviews}
          />
          <TrustSection />
        </Suspense>

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
