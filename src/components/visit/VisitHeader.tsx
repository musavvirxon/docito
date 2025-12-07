import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Stethoscope, 
  Activity, 
  Brain, 
  Eye, 
  Heart, 
  Baby,
  Smile
} from "lucide-react";
import { format } from "date-fns";
import { VisitMode, PatientData, AppointmentData } from "./types";

interface VisitHeaderProps {
  patient: PatientData;
  appointment: AppointmentData;
  specialty: string;
  mode: VisitMode;
  onDownloadPDF: () => void;
  isDownloading?: boolean;
}

const getSpecialtyIcon = (specialty: string) => {
  const specialtyLower = specialty.toLowerCase();
  if (specialtyLower.includes("dentist") || specialtyLower.includes("dental")) {
    return <Smile className="h-5 w-5" />;
  }
  if (specialtyLower.includes("cardio")) {
    return <Heart className="h-5 w-5" />;
  }
  if (specialtyLower.includes("neuro")) {
    return <Brain className="h-5 w-5" />;
  }
  if (specialtyLower.includes("ophthalm") || specialtyLower.includes("eye")) {
    return <Eye className="h-5 w-5" />;
  }
  if (specialtyLower.includes("pediatr")) {
    return <Baby className="h-5 w-5" />;
  }
  return <Stethoscope className="h-5 w-5" />;
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const calculateAge = (dateOfBirth?: string): number | null => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const VisitHeader = ({
  patient,
  appointment,
  specialty,
  mode,
  onDownloadPDF,
  isDownloading,
}: VisitHeaderProps) => {
  const age = patient.age ?? calculateAge(patient.date_of_birth);

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border-2 border-primary/20">
            <AvatarImage src={patient.profile_photo_url} alt={patient.full_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {getInitials(patient.full_name)}
            </AvatarFallback>
          </Avatar>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{patient.full_name}</h1>
              <Badge
                variant={mode === "current" ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                {mode === "current" ? (
                  <>
                    <Activity className="h-3 w-3" />
                    Live Visit
                  </>
                ) : (
                  "Past Visit"
                )}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              {age && <span>{age} years</span>}
              {patient.gender && (
                <>
                  <span>•</span>
                  <span className="capitalize">{patient.gender}</span>
                </>
              )}
              <span>•</span>
              <span>{format(new Date(appointment.date), "PPP")}</span>
              <span>•</span>
              <span>{appointment.startTime}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            {getSpecialtyIcon(specialty)}
            <span className="text-sm font-medium">{specialty}</span>
          </div>

          <Button
            onClick={onDownloadPDF}
            disabled={isDownloading}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>
    </header>
  );
};
