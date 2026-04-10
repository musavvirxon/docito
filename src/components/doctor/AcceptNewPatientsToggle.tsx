import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AcceptNewPatientsToggleProps {
  doctorId: string;
  initialValue?: boolean;
}

export function AcceptNewPatientsToggle({ doctorId, initialValue = true }: AcceptNewPatientsToggleProps) {
  const { t } = useTranslation("dashboard");
  const [acceptsNewPatients, setAcceptsNewPatients] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAcceptsNewPatients(initialValue);
  }, [initialValue]);

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("doctors")
        .update({ accepts_new_patients: checked })
        .eq("id", doctorId);

      if (error) throw error;

      setAcceptsNewPatients(checked);
      toast.success(
        checked 
          ? "Now accepting new patients" 
          : "No longer accepting new patients"
      );
      
      // Trigger refresh if available
      if ((window as any).refreshDoctorProfile) {
        (window as any).refreshDoctorProfile();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update setting");
      setAcceptsNewPatients(!checked); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${acceptsNewPatients ? "bg-green-100 dark:bg-green-950/30" : "bg-muted"}`}>
              {acceptsNewPatients ? (
                <UserPlus className="h-5 w-5 text-green-600" />
              ) : (
                <UserMinus className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">Accept New Patients</p>
                <Badge variant={acceptsNewPatients ? "default" : "secondary"} className="text-xs">
                  {acceptsNewPatients ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {acceptsNewPatients 
                  ? "New patients can book appointments with you" 
                  : "Only existing patients can book appointments"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              checked={acceptsNewPatients}
              onCheckedChange={handleToggle}
              disabled={saving}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AcceptNewPatientsToggle;
