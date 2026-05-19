// File: src/components/doctor/public/PremiumHeroSection.tsx
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Star,
  MapPin,
  Award,
  Users,
  Globe,
  BadgeCheck,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface DoctorProfileData {
  id: string;
  specialty: string;
  bio: string;
  consultation_fee: number | null;
  verified: boolean;
  user_id: string;
  languages: string[] | null;
  years_experience: number | null;
  average_rating: number | null;
  num_reviews: number | null;
  consultation_types: string[] | null;
  accepts_new_patients: boolean | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    city?: string;
    country?: string;
  };
  practices: {
    id: string;
    name: string;
  } | null;
}

interface PremiumHeroSectionProps {
  doctor: DoctorProfileData;
  localizedSpecialty: string;
  location: string;
  onBookClick: () => void;
  onMessageClick: () => void;
  onShare: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
}

export default function PremiumHeroSection({
  doctor,
  localizedSpecialty,
  location,
  onBookClick,
  onMessageClick,
  onShare,
  isSaved,
  onToggleSave,
}: PremiumHeroSectionProps) {
  const { t, i18n } = useTranslation(["doctors", "common"]);
  const navigate = useNavigate();
  const isRTL = i18n.language === "ar";

  const doctorName = doctor.profiles.full_name;
  const initials = doctorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <section className={cn("pt-2 pb-6 lg:py-8", isRTL && "rtl")}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left: Doctor Identity */}
          <div className="lg:col-span-7 space-y-6">
            {/* Avatar + Basic Info */}
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="relative flex-shrink-0">
                <Avatar className="w-28 h-28 sm:w-36 sm:h-36 ring-4 ring-primary/10 shadow-lg">
                  <AvatarImage
                    src={doctor.profiles.avatar_url || undefined}
                    alt={doctorName}
                  />
                  <AvatarFallback className="text-2xl sm:text-3xl bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {doctor.verified && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-background rounded-full flex items-center justify-center shadow-md">
                    <BadgeCheck className="w-5 h-5 text-blue-500" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                {/* Name + Title */}
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                    {doctorName}
                  </h1>
                  <p className="text-lg text-primary font-medium mt-1">
                    {localizedSpecialty}
                  </p>
                </div>

                {/* Quick Meta */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {location}
                    </span>
                  )}
                  {doctor.years_experience && (
                    <span className="flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      {doctor.years_experience} {t("profile.yearsExp")}
                    </span>
                  )}
                  {doctor.languages && doctor.languages.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      {doctor.languages.slice(0, 3).join(", ")}
                    </span>
                  )}
                </div>

                {/* Rating */}
                {doctor.average_rating && doctor.average_rating > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-4 h-4",
                            i < Math.floor(doctor.average_rating || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-foreground">
                      {doctor.average_rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({doctor.num_reviews || 0} {t("profile.reviews")})
                    </span>
                  </div>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {doctor.verified && (
                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
                      <BadgeCheck className="w-3 h-3 mr-1" />
                      {t("profile.verified")}
                    </Badge>
                  )}
                  {doctor.accepts_new_patients && (
                    <Badge
                      variant="outline"
                      className="border-blue-500/30 text-blue-600"
                    >
                      <Users className="w-3 h-3 mr-1" />
                      {t("profile.acceptingPatients")}
                    </Badge>
                  )}
                  {doctor.consultation_types?.includes("video") && (
                    <Badge
                      variant="outline"
                      className="border-purple-500/30 text-purple-600"
                    >
                      <Video className="w-3 h-3 mr-1" />
                      {t("profile.videoConsult")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Sticky Booking Widget */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 bg-card rounded-2xl border border-border p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {t("profile.bookAppointment")}
              </h3>

              {/* Consultation Fee */}
              {doctor.consultation_fee && (
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
                  <span className="text-muted-foreground">
                    {t("profile.consultationFee")}
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    ${doctor.consultation_fee}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button className="w-full" onClick={onBookClick}>
                  {t("profile.bookNow")}
                </Button>

                <Button variant="outline" className="w-full" onClick={onMessageClick}>
                  {t("profile.messageDoctor")}
                </Button>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="secondary" onClick={onToggleSave}>
                    {isSaved ? t("profile.saved") : t("profile.save")}
                  </Button>
                  <Button variant="secondary" onClick={onShare}>
                    {t("profile.share")}
                  </Button>
                </div>
              </div>

              <Separator className="my-5" />

              <div className="text-sm text-muted-foreground">
                {t("profile.secureBookingNote")}
              </div>

              <div className="pt-4">
                <Button
                  variant="link"
                  className="px-0"
                  onClick={() => navigate("/find-doctors")}
                >
                  {t("common:actions.browse")} →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
