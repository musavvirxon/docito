import { useState, useEffect } from "react";
import { Phone, Mail, MapPin, Calendar, User, MessageSquare, Loader2, Heart, AlertTriangle, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import type { CalendarAppointment } from "./types";

interface PatientInfoTabProps {
  appointment: CalendarAppointment;
  onMessage: () => void;
}

interface PatientDetails {
  full_name?: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  medical_history?: string;
  allergies?: string;
  current_medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function PatientInfoTab({ appointment, onMessage }: PatientInfoTabProps) {
  const { t } = useTranslation("dashboard");
  const [details, setDetails] = useState<PatientDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        // Try registered patient first
        if (appointment.patient_id) {
          const { data } = await supabase
            .from("profiles")
            .select("full_name, phone, email, date_of_birth, gender, address")
            .eq("user_id", appointment.patient_id)
            .maybeSingle();

          if (data) {
            setDetails({
              full_name: data.full_name,
              phone: data.phone,
              email: data.email,
              date_of_birth: data.date_of_birth,
              gender: data.gender,
              address: data.address,
            });
            setLoading(false);
            return;
          }
        }

        // Try doctor_patient (manually added)
        const dpId = appointment.doctor_patient_id;
        if (dpId) {
          const { data } = await supabase
            .from("doctor_patients")
            .select("full_name, phone, email, date_of_birth, gender, address, medical_history, allergies, current_medications, emergency_contact_name, emergency_contact_phone")
            .eq("id", dpId)
            .maybeSingle();

          if (data) {
            setDetails(data);
            setLoading(false);
            return;
          }
        }

        // Fallback to appointment data
        setDetails({
          full_name: appointment.patient_name || undefined,
          phone: appointment.patient_phone || undefined,
          email: appointment.patient_email || undefined,
        });
      } catch (err) {
        console.error("Error fetching patient details:", err);
        setDetails({
          full_name: appointment.patient_name || undefined,
          phone: appointment.patient_phone || undefined,
          email: appointment.patient_email || undefined,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [appointment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const age = details?.date_of_birth
    ? Math.floor((Date.now() - new Date(details.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <>
      <div className="space-y-3">
        <InfoRow icon={User} label="Full Name" value={details?.full_name} />
        <InfoRow icon={Phone} label="Phone" value={details?.phone} />
        <InfoRow icon={Mail} label="Email" value={details?.email} />
        <InfoRow
          icon={Calendar}
          label="Date of Birth"
          value={details?.date_of_birth ? `${details.date_of_birth}${age != null ? ` (${age} yrs)` : ""}` : undefined}
        />
        <InfoRow icon={User} label="Gender" value={details?.gender} />
        <InfoRow icon={MapPin} label="Address" value={details?.address} />
        <InfoRow icon={Heart} label="Medical History" value={details?.medical_history} />
        <InfoRow icon={AlertTriangle} label="Allergies" value={details?.allergies} />
        <InfoRow icon={Pill} label="Current Medications" value={details?.current_medications} />
        <InfoRow icon={Phone} label="Emergency Contact" value={
          details?.emergency_contact_name
            ? `${details.emergency_contact_name}${details.emergency_contact_phone ? ` — ${details.emergency_contact_phone}` : ""}`
            : undefined
        } />
      </div>

      {!details?.phone && !details?.email && !details?.date_of_birth && (
        <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground text-center">
          No additional patient information available
        </div>
      )}

      <Button variant="outline" onClick={onMessage} className="w-full gap-2">
        <MessageSquare className="h-4 w-4" />
        {t("doctor.calendar.sendMessage", "Send Message")}
      </Button>
    </>
  );
}
