// File: src/pages/doctor/DoctorPublicProfile.tsx
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import PremiumHeroSection from "@/components/doctor/public/PremiumHeroSection";

const AboutSection = lazy(() => import("@/components/doctor/public/AboutSection"));
const AvailabilityPreview = lazy(() => import("@/components/doctor/public/AvailabilityPreview"));
const ClinicAffiliationsSection = lazy(() => import("@/components/doctor/public/ClinicAffiliationsSection"));
const ReviewsSection = lazy(() => import("@/components/doctor/public/ReviewsSection"));
const TrustSection = lazy(() => import("@/components/doctor/public/TrustSection"));

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

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  patient_profile?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface Procedure {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string | null;
}

export default function DoctorPublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<PublicDoctorProfile | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const canonicalUrl = useMemo(() => {
    const safe = slug || "";
    return `https://docito.lovable.app/doctor/${safe}`;
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
        // Public view is anon-safe and already filters to verified + public profiles
        const { data: doc, error: docErr } = await (supabase as any)
          .from("doctor_public_profile_view")
          .select("*")
          .or(`id.eq.${slug},custom_profile_link.eq.${slug},username.eq.${slug}`)
          .maybeSingle();

        if (docErr) throw docErr;
        if (!doc) {
          setDoctor(null);
          return;
        }

        setDoctor(doc as PublicDoctorProfile);

        // Procedures (services)
        const { data: proc, error: procErr } = await (supabase as any)
          .from("procedures")
          .select("id, name, description, price, duration_minutes, category")
          .eq("dentist_id", doc.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(50);

        if (procErr) throw procErr;
        setProcedures((proc || []) as Procedure[]);

        // Reviews
        const { data: rev, error: revErr } = await (supabase as any)
          .from("reviews")
          .select(
            `
            id,
            rating,
            comment,
            created_at,
            patient_profile:patient_id(full_name, avatar_url)
          `,
          )
          .eq("doctor_id", doc.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (revErr) throw revErr;
        setReviews((rev || []) as Review[]);
      } catch (e: any) {
        console.error("Error loading doctor public profile:", e);
        toast({
          title: "Error",
          description: e?.message || "Failed to load doctor profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [slug, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-semibold mb-2">Doctor not found</h1>
            <p className="text-sm text-muted-foreground mb-6">
              This profile may be private/unlisted or does not exist.
            </p>
            <Button onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
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

  // Handlers for hero section
  const handleBookClick = () => navigate(`/book/${doctor.id}`);
  const handleMessageClick = () => navigate(`/messages?doctor=${doctor.id}`);
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: doctor.full_name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied to clipboard" });
    }
  };
  const [isSaved, setIsSaved] = useState(false);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-10">
        <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
          <AvailabilityPreview doctorId={doctor.id} onOpenBooking={handleBookClick} />
        </Suspense>

        <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
          <AboutSection 
            bio={doctor.bio || ''} 
            yearsExperience={doctor.years_experience}
            services={procedures.map(p => ({ id: p.id, name: p.name, category: p.category || undefined }))}
            consultationTypes={doctor.consultation_types}
          />
        </Suspense>

        <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
          <ClinicAffiliationsSection practice={practice} />
        </Suspense>

        <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
          <ReviewsSection averageRating={doctor.average_rating} numReviews={doctor.num_reviews} />
        </Suspense>

        <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
          <TrustSection />
        </Suspense>
      </div>
    </div>
  );
}
