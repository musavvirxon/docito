import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  AlertTriangle,
  Pill,
  Shield,
  Edit,
  Activity,
  Droplets,
  Cigarette,
  Wine,
} from "lucide-react";
import { motion } from "framer-motion";

interface PatientProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  nationality?: string;
  phone?: string;
  email?: string;
  address?: string;
  profession?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  blood_group?: string;
  allergies?: string;
  chronic_conditions?: string;
  current_medications?: string;
  important_alerts?: string[];
  smoking?: string;
  alcohol?: string;
  activity_level?: string;
  insurance_provider?: string;
  insurance_policy?: string;
  insurance_expiry?: string;
}

interface ProfileTabProps {
  profile: PatientProfile;
  onEdit: () => void;
}

const ProfileTab = ({ profile, onEdit }: ProfileTabProps) => {
  const Section = ({
    title,
    icon: Icon,
    children,
    action,
  }: {
    title: string;
    icon: any;
    children: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            {title}
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  const InfoRow = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value?: string | null;
    icon?: any;
  }) => (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />}
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Demographics Section */}
      <Section
        title="Demographics"
        icon={User}
        action={
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        }
      >
        <div className="flex flex-col md:flex-row gap-6">
          <Avatar className="h-24 w-24 mx-auto md:mx-0 ring-4 ring-primary/10">
            <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {profile.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("") || "P"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoRow label="Full Name" value={profile.full_name} />
            <InfoRow
              label="Date of Birth"
              value={
                profile.date_of_birth
                  ? `${new Date(profile.date_of_birth).toLocaleDateString()} (${profile.age} years)`
                  : undefined
              }
              icon={Calendar}
            />
            <InfoRow label="Gender" value={profile.gender} />
            <InfoRow label="Nationality" value={profile.nationality} />
            <InfoRow label="Profession" value={profile.profession} />
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Section title="Contact Information" icon={Phone}>
          <div className="space-y-1">
            <InfoRow label="Phone" value={profile.phone} icon={Phone} />
            <Separator />
            <InfoRow label="Email" value={profile.email} icon={Mail} />
            <Separator />
            <InfoRow label="Address" value={profile.address} icon={MapPin} />
            <Separator />
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2 font-medium">
                Emergency Contact
              </p>
              <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/10">
                <p className="font-medium text-sm">
                  {profile.emergency_contact_name || "Not provided"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profile.emergency_contact_phone || "—"}
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Medical Information */}
        <Section title="Medical Information" icon={Heart}>
          <div className="space-y-3">
            <InfoRow
              label="Blood Group"
              value={profile.blood_group}
              icon={Droplets}
            />
            <Separator />

            {/* Allergies */}
            <div className="py-2">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-muted-foreground font-medium">
                  Allergies
                </p>
              </div>
              {profile.allergies ? (
                <div className="flex flex-wrap gap-2">
                  {profile.allergies.split(",").map((allergy, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                    >
                      {allergy.trim()}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No allergies recorded
                </p>
              )}
            </div>
            <Separator />

            {/* Chronic Conditions */}
            <div className="py-2">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground font-medium">
                  Chronic Conditions
                </p>
              </div>
              <p className="text-sm whitespace-pre-wrap">
                {profile.chronic_conditions || "None recorded"}
              </p>
            </div>
            <Separator />

            {/* Current Medications */}
            <div className="py-2">
              <div className="flex items-center gap-2 mb-2">
                <Pill className="w-4 h-4 text-accent" />
                <p className="text-xs text-muted-foreground font-medium">
                  Current Medications
                </p>
              </div>
              <p className="text-sm whitespace-pre-wrap">
                {profile.current_medications || "None recorded"}
              </p>
            </div>

            {/* Important Alerts */}
            {profile.important_alerts && profile.important_alerts.length > 0 && (
              <>
                <Separator />
                <div className="py-2">
                  <p className="text-xs text-muted-foreground font-medium mb-2">
                    Important Alerts
                  </p>
                  <div className="space-y-2">
                    {profile.important_alerts.map((alert, i) => (
                      <Badge
                        key={i}
                        variant="destructive"
                        className="mr-2"
                      >
                        {alert}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Section>

        {/* Lifestyle Info */}
        <Section title="Lifestyle Information" icon={Activity}>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Cigarette className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Smoking</p>
              <p className="text-sm font-medium capitalize">
                {profile.smoking || "Unknown"}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Wine className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Alcohol</p>
              <p className="text-sm font-medium capitalize">
                {profile.alcohol || "Unknown"}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Activity className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Activity</p>
              <p className="text-sm font-medium capitalize">
                {profile.activity_level || "Unknown"}
              </p>
            </div>
          </div>
        </Section>

        {/* Insurance Information */}
        <Section title="Insurance Information" icon={Shield}>
          <div className="space-y-1">
            <InfoRow label="Provider" value={profile.insurance_provider} />
            <Separator />
            <InfoRow label="Policy Number" value={profile.insurance_policy} />
            <Separator />
            <InfoRow
              label="Expiry Date"
              value={
                profile.insurance_expiry
                  ? new Date(profile.insurance_expiry).toLocaleDateString()
                  : undefined
              }
            />
          </div>
        </Section>
      </div>
    </motion.div>
  );
};

export default ProfileTab;
