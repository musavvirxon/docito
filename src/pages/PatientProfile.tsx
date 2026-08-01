import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, FileText, Loader2, UserIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizePhone, validatePhone } from "@/lib/phone/phone";
import { useProfileCompleteness, FORM_043_FIELDS } from "@/hooks/useProfileCompleteness";
import CurrencyPreferenceCard from "@/components/profile/CurrencyPreferenceCard";

export default function PatientProfile() {
  const navigate = useNavigate();
  const { t } = useTranslation("booking");
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const { fields, loading, refresh, filled043Count, total043, missing043 } = useProfileCompleteness();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [profession, setProfession] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(fields.full_name || "");
    setPhone(fields.phone || "");
    setDob(fields.date_of_birth || "");
    setGender(fields.gender || "");
    setAddress(fields.address || "");
    setProfession(fields.profession || "");
  }, [fields]);

  const phoneValidation = useMemo(() => validatePhone(phone), [phone]);

  const fieldLabels: Record<string, string> = {
    full_name: t("patientProfile.fullName", "Full name"),
    phone: t("patientProfile.phone", "Phone number"),
    date_of_birth: t("patientProfile.dob", "Date of birth"),
    gender: t("patientProfile.gender", "Gender"),
    address: t("patientProfile.address", "Address"),
    profession: t("patientProfile.profession", "Profession"),
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        {t("patientProfile.loading", "Loading…")}
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error(t("patientProfile.nameRequired", "Please enter your full name"));
      return;
    }
    if (phone.trim() && !phoneValidation.ok) {
      toast.error(t("requirePhone.invalid", "Enter a valid number with country code, e.g. +998 88 370 66 22"));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() ? phoneValidation.normalized : null,
          date_of_birth: dob.trim() || null,
          gender: (gender || null) as "male" | "female" | "other" | "prefer_not_to_say" | null,
          address: address.trim() || null,
          profession: profession.trim() || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      await refresh();
      await refreshProfile();
      toast.success(t("patientProfile.saved", "Profile saved"));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t("patientProfile.saveFailed", "Failed to save profile"));
    } finally {
      setSaving(false);
    }
  };

  const percent = Math.round((filled043Count / total043) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("patientProfile.title", "My patient profile")}
          </h1>
          <p className="text-sm text-muted-foreground truncate">{fields.email || user.email}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("patientProfile.back", "Back")}
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {t("patientProfile.completeness", "Profile completeness")}
          </CardTitle>
          <CardDescription>
            {t(
              "patientProfile.completenessHint",
              "These details are required to book appointments and to fill your 043/u medical card."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={percent} className="h-2" />
            <span className="text-sm font-medium tabular-nums">
              {filled043Count}/{total043}
            </span>
          </div>
          {missing043.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {t("patientProfile.allComplete", "All required details are on file.")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {missing043.map((k) => (
                <Badge key={k} variant="outline" className="rounded-lg">
                  {fieldLabels[k] || k}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            {t("patientProfile.personalTitle", "Personal details")}
          </CardTitle>
          <CardDescription>
            {t("patientProfile.personalDescription", "Only you and the providers you visit can see this information.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("patientProfile.loading", "Loading…")}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pp-name">{fieldLabels.full_name} *</Label>
                  <Input
                    id="pp-name"
                    className="rounded-xl"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pp-email">{t("patientProfile.email", "Email")}</Label>
                  <Input id="pp-email" className="rounded-xl" value={fields.email || user.email || ""} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pp-phone">{fieldLabels.phone} *</Label>
                  <Input
                    id="pp-phone"
                    className="rounded-xl"
                    inputMode="tel"
                    placeholder="+998 88 370 66 22"
                    value={phone}
                    onChange={(e) => setPhone(normalizePhone(e.target.value))}
                  />
                  {phone && !phoneValidation.ok && (
                    <p className="text-xs text-destructive">
                      {t("requirePhone.invalid", "Enter a valid number with country code, e.g. +998 88 370 66 22")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pp-dob">{fieldLabels.date_of_birth}</Label>
                  <Input
                    id="pp-dob"
                    type="date"
                    className="rounded-xl"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{fieldLabels.gender}</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={t("patientProfile.selectGender", "Select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t("patientProfile.genderMale", "Male")}</SelectItem>
                      <SelectItem value="female">{t("patientProfile.genderFemale", "Female")}</SelectItem>
                      <SelectItem value="other">{t("patientProfile.genderOther", "Other")}</SelectItem>
                      <SelectItem value="prefer_not_to_say">
                        {t("patientProfile.genderPreferNot", "Prefer not to say")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pp-profession">{fieldLabels.profession}</Label>
                  <Input
                    id="pp-profession"
                    className="rounded-xl"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder={t("patientProfile.professionPlaceholder", "e.g. Teacher")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pp-address">{fieldLabels.address}</Label>
                <Textarea
                  id="pp-address"
                  className="rounded-xl"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("patientProfile.addressPlaceholder", "Street, city, region")}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("patientProfile.save", "Save details")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <CurrencyPreferenceCard />

      <p className="text-xs text-muted-foreground">
        {t("patientProfile.formNote", "Fields used by the 043/u medical card:")}{" "}
        {FORM_043_FIELDS.map((f) => fieldLabels[f]).join(", ")}
      </p>
    </div>
  );
}
