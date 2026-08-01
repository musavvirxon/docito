import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizePhone, validatePhone } from "@/lib/phone/phone";
import type { PatientProfileFields } from "@/hooks/useProfileCompleteness";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current profile values (used to prefill and to know what else is missing). */
  fields?: Partial<PatientProfileFields>;
  onSaved?: () => void;
};

export default function RequirePhoneDialog({ open, onOpenChange, fields, onSaved }: Props) {
  const { t } = useTranslation("booking");
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhone(fields?.phone || "");
    setDob(fields?.date_of_birth || "");
    setAddress(fields?.address || "");
    setTouched(false);
  }, [open, fields?.phone, fields?.date_of_birth, fields?.address]);

  const validation = validatePhone(phone);

  const handleSave = async () => {
    setTouched(true);
    if (!validation.ok) return;
    if (!user) return;

    setSaving(true);
    try {
      const payload: Record<string, string | null> = { phone: validation.normalized };
      if (dob.trim()) payload.date_of_birth = dob.trim();
      if (address.trim()) payload.address = address.trim();

      const { error } = await supabase.from("profiles").update(payload).eq("user_id", user.id);
      if (error) throw error;

      toast.success(t("requirePhone.saved", "Contact details saved"));
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t("requirePhone.saveFailed", "Failed to save your details"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            {t("requirePhone.title", "Add your phone number")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "requirePhone.description",
              "A phone number is required so the clinic can reach you about this appointment."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="require-phone">{t("requirePhone.phone", "Phone number")} *</Label>
            <Input
              id="require-phone"
              value={phone}
              inputMode="tel"
              placeholder="+998 88 370 66 22"
              onChange={(e) => setPhone(normalizePhone(e.target.value))}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && !validation.ok}
            />
            {touched && !validation.ok ? (
              <p className="text-xs text-destructive">
                {t("requirePhone.invalid", "Enter a valid number with country code, e.g. +998 88 370 66 22")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("requirePhone.hint", "Include your country code.")}
              </p>
            )}
          </div>

          {!fields?.date_of_birth && (
            <div className="space-y-1">
              <Label htmlFor="require-dob">{t("requirePhone.dob", "Date of birth")}</Label>
              <Input id="require-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
          )}

          {!fields?.address && (
            <div className="space-y-1">
              <Label htmlFor="require-address">{t("requirePhone.address", "Address")}</Label>
              <Input
                id="require-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("requirePhone.addressPlaceholder", "Street, city")}
              />
            </div>
          )}

          <button
            type="button"
            className="text-xs text-primary underline underline-offset-2"
            onClick={() => {
              onOpenChange(false);
              navigate("/patient/profile");
            }}
          >
            {t("requirePhone.openProfile", "Complete my full profile instead")}
          </button>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("popup.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("requirePhone.save", "Save and continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
