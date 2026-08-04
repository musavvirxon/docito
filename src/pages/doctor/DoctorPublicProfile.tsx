// File: src/pages/doctor/DoctorPublicProfile.tsx
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import PremiumHeroSection from "@/components/doctor/public/PremiumHeroSection";
import { SEOHead } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";

const AboutSection = lazy(() => import("@/components/doctor/public/AboutSection"));
const AvailabilityPreview = lazy(() => import("@/components/doctor/public/AvailabilityPreview"));
const ClinicAffiliationsSection = lazy(() => import("@/components/doctor/public/ClinicAffiliationsSection"));
const ReviewsSection = lazy(() => import("@/components/doctor/public/ReviewsSection"));
const TrustSection = lazy(() => import("@/components/doctor/public/TrustSection"));
const ProceduresSection = lazy(() => import("@/components/doctor/public/ProceduresSection"));

interface PublicDoctorProfile {
  id: string;
  user_id: string;
  username: string | null;
  custom_profile_link: string | null;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  email: string;
  specialty: string;
  bio: string | null;
  languages: string[] | null;
  consultation_fee: number | null;
  verified: boolean;
  years_experience: number | null;
  average_rating: number | null;
  num_reviews: number | null;
  consultation_types: string[] | null;
  accepts_new_patients: boolean | null;
  practice_id: string | null;
  practice_name: string | null;
  practice_address: string | null;
  practice_phone: string | null;
  practice_city: string | null;
  practice_country: string | null;
  practice_verified: boolean | null;
}




interface Procedure {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  duration_minutes: number;
  category: string | null;
}

export default function DoctorPublicProfile() {
  const { t } = useTranslation(['doctors', 'common']);
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<PublicDoctorProfile | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  
  const [isSaved, setIsSaved] = useState(false);

  const canonicalUrl = useMemo(() => {
    const safe = slug || "";
    return `https://docito.app/doctor/${safe}`;
  }, [slug]);

  useEffect(() => {
    // Basic canonical tag
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = canonicalUrl;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [canonicalUrl]);

  useEffect(() => {
    const run = async () => {
      if (!slug) return;

      setLoading(true);
      try {
        // Public view is anon-safe and already filters to verified + public profiles.
        // Use .ilike() for case-insensitive exact match so shared links work
        // regardless of slug casing (e.g. "dr.john.doe1" vs "dr.John.Doe1").
        const normalized = decodeURIComponent(slug).trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
        const lookups: Array<{ column: string; value: string; op: "eq" | "ilike" }> = [
          { column: "custom_profile_link", value: normalized, op: "ilike" },
          { column: "username", value: normalized, op: "ilike" },
        ];
        if (isUuid) lookups.push({ column: "id", value: normalized, op: "eq" });

        let doc: any = null;
        const sources = ["doctor_public_profile_view", "doctor_profiles_view"];
        for (const source of sources) {
          for (const { column, value, op } of lookups) {
            const query = (supabase as any).from(source).select("*");
            const { data, error } = await (op === "ilike" ? query.ilike(column, value) : query.eq(column, value))
              .limit(1)
              .maybeSingle();
            if (error) {
              // Don't fail the page if the fallback view is RLS-restricted —
              // just continue to the next lookup.
              console.warn(`[DoctorPublicProfile] ${source}.${column} lookup error`, error);
              continue;
            }
            if (data) {
              doc = data;
              break;
            }
          }
          if (doc) break;
        }

        if (!doc) {
          setDoctor(null);
          return;
        }


        setDoctor(doc as PublicDoctorProfile);

        // Procedures (services) — table uses dentist_id + default_cost/price
        const { data: proc, error: procErr } = await (supabase as any)
          .from("procedures")
          .select("id, name, description, default_cost, price, duration_minutes, category")
          .eq("dentist_id", doc.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(50);

        if (procErr) throw procErr;
        setProcedures(
          ((proc || []) as any[]).map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            cost: p.default_cost ?? p.price ?? 0,
            duration_minutes: p.duration_minutes,
            category: p.category,
          })) as Procedure[],
        );

        // Reviews are loaded by ReviewsSection via useAppointmentReviews.

      } catch (e: any) {
        console.error("Error loading doctor public profile:", e);
        toast({
          title: t("publicProfile.page.error", "Error"),
          description: e?.message || t("publicProfile.page.loadError", "Failed to load doctor profile"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t("publicProfile.page.loading", "Loading profile...")}</span>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-semibold mb-2">{t("publicProfile.page.notFoundTitle", "Doctor not found")}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t("publicProfile.page.notFoundDescription", "This profile may be private/unlisted or does not exist.")}
            </p>
            <Button onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("publicProfile.page.goBack", "Go Back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build location string
  const location = [doctor.practice_city, doctor.practice_country].filter(Boolean).join(", ");
  
  // Build practice object for ClinicAffiliationsSection
  const practice = doctor.practice_id ? {
    id: doctor.practice_id,
    name: doctor.practice_name || '',
    address: doctor.practice_address,
    phone: doctor.practice_phone,
    city: doctor.practice_city,
    country: doctor.practice_country,
    verified: doctor.practice_verified,
  } : null;

  const displayName =
    (doctor.full_name || "").trim() || t("publicProfile.page.unnamedDoctor", { defaultValue: "Doctor" });

  // Viewing is fully public. Only booking and messaging require an account.
  const requireAuth = async (cb: () => void) => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      toast({
        title: t("publicProfile.page.signInRequired", "Sign in required"),
        description: t("publicProfile.page.signInDescription", "Please sign in to continue."),
      });
      const returnTo = window.location.pathname + window.location.search;
      navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    cb();
  };

  const handleBookClick = () => requireAuth(() => navigate(`/book/${doctor.id}`));
  const handleMessageClick = () => requireAuth(() => navigate(`/messages?doctor=${doctor.id}`));
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: displayName, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: t("publicProfile.page.linkCopied", "Link copied to clipboard") });
    }
  };
  const handleToggleSave = () => setIsSaved(!isSaved);


  // Map doctor to the format PremiumHeroSection expects
  const doctorProfileData = {
    id: doctor.id,
    specialty: doctor.specialty,
    bio: doctor.bio || '',
    consultation_fee: doctor.consultation_fee,
    verified: doctor.verified,
    user_id: doctor.user_id,
    languages: doctor.languages,
    years_experience: doctor.years_experience,
    average_rating: doctor.average_rating,
    num_reviews: doctor.num_reviews,
    consultation_types: doctor.consultation_types,
    accepts_new_patients: doctor.accepts_new_patients,
    profiles: {
      full_name: doctor.full_name,
      avatar_url: doctor.avatar_url,
      city: doctor.practice_city || undefined,
      country: doctor.practice_country || undefined,
    },
    practices: practice ? { id: practice.id, name: practice.name } : null,
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${doctor.full_name} — ${doctor.specialty} | Docito`.slice(0, 60)}
        description={(doctor.bio || t("publicProfile.page.seoDescription", { name: doctor.full_name, specialty: doctor.specialty, defaultValue: "Book {{name}}, {{specialty}}, on Docito. View availability, reviews and consultation fees." })).slice(0, 160)}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("publicProfile.page.back", "Back")}
        </Button>
        {!doctor.verified && (
          <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            <strong className="font-semibold">{t("publicProfile.page.pendingTitle", "Pending verification.")}</strong>{' '}
            {t("publicProfile.page.pendingDescription", "This doctor's credentials are still being reviewed by Docito. You can view their profile, but booking may be limited until verification is complete.")}
          </div>
        )}
      </div>


      <PremiumHeroSection 
        doctor={doctorProfileData}
        localizedSpecialty={doctor.specialty}
        location={location}
        onBookClick={handleBookClick}
        onMessageClick={handleMessageClick}
        onShare={handleShare}
        isSaved={isSaved}
        onToggleSave={handleToggleSave}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 space-y-6">
        <Suspense fallback={<div className="text-muted-foreground">{t("publicProfile.page.sectionLoading", "Loading...")}</div>}>
          <AvailabilityPreview doctorId={doctor.id} onOpenBooking={handleBookClick} />
        </Suspense>

        <Suspense fallback={<div className="text-muted-foreground">{t("publicProfile.page.sectionLoading", "Loading...")}</div>}>
          <AboutSection 
            bio={doctor.bio || ''} 
            yearsExperience={doctor.years_experience}
            services={procedures.map(p => ({ id: p.id, name: p.name, category: p.category || undefined }))}
            consultationTypes={doctor.consultation_types}
          />
        </Suspense>

        <Suspense fallback={<div className="text-muted-foreground">{t("publicProfile.page.sectionLoading", "Loading...")}</div>}>
          <ProceduresSection procedures={procedures} />
        </Suspense>

        <Suspense fallback={<div className="text-muted-foreground">{t("publicProfile.page.sectionLoading", "Loading...")}</div>}>
          <ClinicAffiliationsSection practice={practice} />
        </Suspense>

        <Suspense fallback={<div className="text-muted-foreground">{t("publicProfile.page.sectionLoading", "Loading...")}</div>}>
          <ReviewsSection averageRating={doctor.average_rating} numReviews={doctor.num_reviews} doctorId={doctor.id} />
        </Suspense>

        <Suspense fallback={<div className="text-muted-foreground">{t("publicProfile.page.sectionLoading", "Loading...")}</div>}>
          <TrustSection />
        </Suspense>
      </div>
    </div>
  );
}
