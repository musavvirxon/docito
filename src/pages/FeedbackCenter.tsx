import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bug, Lightbulb, Send, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getUserRoles, roleLabels, AppRole } from "@/lib/rbac";
import { supabase } from "@/integrations/supabase/client";

type FeedbackKind = "bug" | "feature";

const ALL_ROLES: AppRole[] = [
  "patient",
  "doctor",
  "admin",
  "clinic_admin",
  "lab_admin",
  "pharmacy_admin",
  "imaging_admin",
  "hospital_admin",
  "insurance_admin",
  "staff",
  "clinic_staff",
  "receptionist",
  "nurse",
  "billing_manager",
  "pharmacy_staff",
  "pharmacist",
  "lab_staff",
  "lab_technician",
  "internal_lab_tech",
  "imaging_staff",
  "internal_imaging_tech",
  "super_admin",
];

export default function FeedbackCenter() {
  const { t, i18n } = useTranslation(["common"]);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userRoles = useMemo(() => getUserRoles(profile), [profile]);

  // pick first owned role, else default "patient"
  const defaultRole = useMemo<AppRole>(() => {
    const firstOwned = ALL_ROLES.find((r) => userRoles.includes(r));
    return firstOwned ?? "patient";
  }, [userRoles]);

  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [selectedRole, setSelectedRole] = useState<AppRole>(defaultRole);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  // Bug-only
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");

  // Feature-only
  const [priority, setPriority] = useState<"nice_to_have" | "important" | "urgent">("important");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedRole(defaultRole);
  }, [defaultRole]);

  const canSubmitAsRole = (role: AppRole) => userRoles.includes(role);

  const header = useMemo(() => {
    if (kind === "bug") {
      return {
        icon: Bug,
        title: "Bug Report",
        subtitle: "Report an issue so we can reproduce and fix it quickly.",
      };
    }
    return {
      icon: Lightbulb,
      title: "Feature Request",
      subtitle: "Suggest improvements that make Docito better for your workflow.",
    };
  }, [kind]);

  const handleSubmit = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Sign in required", description: "Please sign in to submit." });
      return;
    }

    if (!canSubmitAsRole(selectedRole)) {
      toast({
        variant: "destructive",
        title: "Role not available",
        description: "You can only submit as roles you already have in your profile.",
      });
      return;
    }

    if (!subject.trim() || !description.trim()) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in both Subject and Details.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        kind,
        role: selectedRole,
        subject: subject.trim(),
        description: description.trim(),
        severity: kind === "bug" ? severity : null,
        priority: kind === "feature" ? priority : null,
        page_path: location.pathname,
        language: i18n.language,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      };

      const { error } = await supabase.from("feedback_requests").insert(payload as any);

      if (error) throw error;

      toast({
        title: "Submitted",
        description: kind === "bug" ? "Thanks — we’ll investigate this issue." : "Thanks — we’ll review your request.",
      });

      setSubject("");
      setDescription("");
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Could not submit",
        description:
          e?.message ??
          "Please ensure the feedback_requests table exists and RLS policies allow inserts for authenticated users.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = header.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Feedback Center</h1>
            <p className="text-muted-foreground mt-1">
              Submit a <span className="font-medium text-foreground">bug</span> or a{" "}
              <span className="font-medium text-foreground">feature request</span> from the role you’re using.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: role selector */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-lg">Submit as Role</CardTitle>
              <p className="text-sm text-muted-foreground">
                Roles you don’t have are visible but disabled.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {ALL_ROLES.map((role) => {
                const enabled = canSubmitAsRole(role);
                const isSelected = role === selectedRole;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => enabled && setSelectedRole(role)}
                    disabled={!enabled}
                    className={[
                      "w-full text-left rounded-xl px-4 py-3 border transition-all",
                      enabled ? "hover:bg-accent/40" : "opacity-50 cursor-not-allowed",
                      isSelected ? "border-primary bg-primary/10" : "border-border/60 bg-card",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {roleLabels[role] ?? role}
                      </span>
                      {!enabled ? (
                        <span className="text-xs text-muted-foreground">Not available</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Available</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {role}
                    </div>
                  </button>
                );
              })}

              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <span>
                  Submissions are tied to your account and the selected role for triage and routing.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Right: form */}
          <Card className="lg:col-span-8">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    {header.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{header.subtitle}</p>
                </div>

                {/* Toggle */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={kind === "bug" ? "default" : "outline"}
                    onClick={() => setKind("bug")}
                    className="rounded-full"
                  >
                    Bug Report
                  </Button>
                  <Button
                    type="button"
                    variant={kind === "feature" ? "default" : "outline"}
                    onClick={() => setKind("feature")}
                    className="rounded-full"
                  >
                    Feature Request
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Selected role</Label>
                <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                  <span className="font-medium text-foreground">{roleLabels[selectedRole] ?? selectedRole}</span>
                  <span className="text-muted-foreground"> — </span>
                  <span className="text-muted-foreground">{selectedRole}</span>
                </div>
              </div>

              {kind === "bug" ? (
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <div className="flex flex-wrap gap-2">
                    {(["low", "medium", "high", "critical"] as const).map((s) => (
                      <Button
                        key={s}
                        type="button"
                        variant={severity === s ? "default" : "outline"}
                        onClick={() => setSeverity(s)}
                        className="rounded-full capitalize"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: "nice_to_have", label: "Nice to have" },
                      { key: "important", label: "Important" },
                      { key: "urgent", label: "Urgent" },
                    ] as const).map((p) => (
                      <Button
                        key={p.key}
                        type="button"
                        variant={priority === p.key ? "default" : "outline"}
                        onClick={() => setPriority(p.key)}
                        className="rounded-full"
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={kind === "bug" ? "Example: Booking button does nothing on mobile" : "Example: Add lab result export to PDF"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Details</Label>
                <Textarea
                  id="details"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    kind === "bug"
                      ? "Steps to reproduce, expected result, actual result, screenshots/video links, device/browser…"
                      : "Who benefits, workflow, acceptance criteria, why it matters, examples…"
                  }
                  className="min-h-[180px]"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground">
                  Page: <span className="font-mono">{location.pathname}</span>
                </div>

                <Button onClick={handleSubmit} disabled={submitting} className="rounded-xl">
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-xs text-muted-foreground">
          Tip: If you want this to be routed to specific teams automatically later, add a{" "}
          <span className="font-mono">team</span> column and assign based on role/kind.
        </div>
      </div>
    </div>
  );
}
